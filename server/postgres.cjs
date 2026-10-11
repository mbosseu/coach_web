'use strict';
const {AsyncLocalStorage}=require('node:async_hooks');
const {Pool}=require('pg');
const fs=require('node:fs');
const path=require('node:path');
const tls=require('node:tls');
const BC=require('../model.js');
// Public CA downloaded from Supabase's Database Settings, not a private key.
const supabaseCa=fs.readFileSync(path.join(__dirname,'certs','supabase-root-2021.crt'),'utf8');
function sqlText(text){
  let index=0;
  return text.replace(/\b(FROM|JOIN|INTO|UPDATE|REFERENCES)\s+(state|users|sessions|resets|assignments|declarations|audit|outbox|limits)\b/gi,'$1 boxing_center.$2').replace(/\?/g,()=>'$'+(++index));
}
function poolOptions(cfg){
  const url=new URL(cfg.databaseUrl);
  // Never let connection-string SSL options override certificate verification.
  for(const name of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(name);
  return{connectionString:url.toString(),max:2,idleTimeoutMillis:10000,connectionTimeoutMillis:10000,
    allowExitOnIdle:true,ssl:{rejectUnauthorized:true,ca:[...tls.getCACertificates('default'),supabaseCa,...(cfg.databaseCa?[cfg.databaseCa.replace(/\\n/g,'\n')]:[])]}};
}
class PostgresStore{
  constructor(cfg,{pool}={}){
    this.kind='postgres';this.pool=pool||new Pool(poolOptions(cfg));this.context=new AsyncLocalStorage();
    this.pool.on?.('error',e=>console.error('Connexion PostgreSQL interrompue',e.code||e.name));
    this.sql={prepare:text=>({get:async(...values)=>(await this.query(sqlText(text),values)).rows[0],all:async(...values)=>(await this.query(sqlText(text),values)).rows,run:async(...values)=>({changes:(await this.query(sqlText(text),values)).rowCount})})};
  }
  request(fn){return fn()}
  async query(text,values=[]){const result=await(this.context.getStore()||this.pool).query(text,values);return{...result,rows:(result.rows||[]).map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,['expires','next_at','sending_at','rowid'].includes(key)&&value!==null?Number(value):value])))} }
  async ready(){const row=await this.sql.prepare('SELECT id FROM state WHERE id=1').get();if(!row)throw Object.assign(Error('Initialiser la base avec npm run db:migrate.'),{status:503})}
  async transaction(fn){
    if(this.context.getStore())return fn();
    const client=await this.pool.connect();
    try{await client.query('BEGIN');await client.query("SET LOCAL statement_timeout='25000ms'");await client.query("SET LOCAL lock_timeout='10000ms'");
      // A single aggregate is intentional for this internal application. The lock
      // is shared by ALL Vercel instances, not just by one Node process.
      await client.query('SELECT id FROM boxing_center.state WHERE id=1 FOR UPDATE');
      const result=await this.context.run(client,fn);await client.query('COMMIT');return result;
    }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e}finally{client.release()}
  }
  async profiles(){return(await this.sql.prepare('SELECT id,role,active,profile FROM users').all()).map(u=>({...JSON.parse(u.profile),id:u.id,role:u.role,active:Boolean(u.active)}))}
  async load(){const row=await this.sql.prepare('SELECT * FROM state WHERE id=1').get();if(!row)throw Object.assign(Error('Base non initialisée.'),{status:503});const db=JSON.parse(row.payload);db.users=await this.profiles();db.audit=(await this.sql.prepare('SELECT payload FROM audit ORDER BY rowid DESC').all()).map(r=>JSON.parse(r.payload));db.revision=row.revision;return db}
  async save(db){
    if(!this.context.getStore())throw Error('Écriture hors transaction interdite.');
    await this.query('INSERT INTO boxing_center.audit(id,payload) SELECT id,payload FROM jsonb_to_recordset($1::jsonb) AS item(id text,payload text) ON CONFLICT(id) DO NOTHING',[JSON.stringify(db.audit.map(entry=>({id:entry.id,payload:JSON.stringify(entry)})))]);
    await this.query('DELETE FROM boxing_center.assignments');await this.query('DELETE FROM boxing_center.declarations');
    await this.query('INSERT INTO boxing_center.assignments(course_id,coach_id,status) SELECT course_id,coach_id,status FROM jsonb_to_recordset($1::jsonb) AS item(course_id text,coach_id text,status text)',[JSON.stringify(Object.entries(db.assignments).map(([course_id,a])=>({course_id,coach_id:a.coachId,status:a.status})))]);
    await this.query('INSERT INTO boxing_center.declarations(id,coach_id,period) SELECT id,coach_id,period FROM jsonb_to_recordset($1::jsonb) AS item(id text,coach_id text,period text)',[JSON.stringify(db.declarations.map(d=>({id:d.id,coach_id:d.coachId,period:d.period})))]);
    const payload={...db,users:[],audit:[]};delete payload.revision;delete payload.credentials;
    await this.sql.prepare('UPDATE state SET payload=?,revision=revision+1 WHERE id=1').run(JSON.stringify(payload));
  }
  async queue(id,declId,ownerId,recipient,payload,expires=null){await this.sql.prepare('INSERT INTO outbox(id,decl_id,owner_id,recipient,payload,expires) VALUES(?,?,?,?,?,?)').run(id,declId,ownerId,recipient,JSON.stringify(payload),expires)}
  limit(key,max=10,window=900000){return this.transaction(async()=>{const now=Date.now();await this.sql.prepare('DELETE FROM limits WHERE expires<?').run(now);const old=await this.sql.prepare('SELECT count FROM limits WHERE key=?').get(key);if(old?.count>=max)return false;await this.query('INSERT INTO boxing_center.limits(key,count,expires) VALUES($1,1,$2) ON CONFLICT(key) DO UPDATE SET count=boxing_center.limits.count+1',[key,now+window]);return true})}
  close(){return this.pool.end()}
}
function initialState(){const db=BC.createDB();db.users=[];delete db.credentials;return JSON.stringify(db)}
module.exports={PostgresStore,sqlText,poolOptions,initialState};
