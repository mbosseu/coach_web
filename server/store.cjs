'use strict';
const Database=require('better-sqlite3');
const fs=require('node:fs');
const path=require('node:path');
const BC=require('../model.js');
const {serial}=require('./serial.cjs');
class Store{
  constructor(file){
    this.kind='sqlite';this.request=serial();
    if(file!==':memory:')fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
    this.sql=new Database(file);
    if(file!==':memory:')fs.chmodSync(file,0o600);
    this.sql.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS state(id INTEGER PRIMARY KEY CHECK(id=1),payload TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE COLLATE NOCASE,profile TEXT NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('coach','admin')),active INTEGER NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),csrf TEXT NOT NULL,expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS resets(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS assignments(course_id TEXT PRIMARY KEY,coach_id TEXT NOT NULL REFERENCES users(id),status TEXT NOT NULL CHECK(status IN ('reserved','validated')));
      CREATE TABLE IF NOT EXISTS declarations(id TEXT PRIMARY KEY,coach_id TEXT NOT NULL REFERENCES users(id),period TEXT NOT NULL,UNIQUE(coach_id,period));
      CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY,payload TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT,'Journal immuable'); END;
      CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT,'Journal immuable'); END;
      CREATE TABLE IF NOT EXISTS outbox(id TEXT PRIMARY KEY,decl_id TEXT,owner_id TEXT REFERENCES users(id),recipient TEXT NOT NULL,payload TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,next_at INTEGER NOT NULL DEFAULT 0,message_id TEXT,last_error TEXT);
      CREATE TABLE IF NOT EXISTS limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);
      INSERT OR IGNORE INTO migrations VALUES(1,strftime('%Y-%m-%dT%H:%M:%fZ','now'));`);
    if(!this.sql.prepare('PRAGMA table_info(outbox)').all().some(c=>c.name==='expires'))this.sql.exec("ALTER TABLE outbox ADD COLUMN expires INTEGER; INSERT OR IGNORE INTO migrations VALUES(2,strftime('%Y-%m-%dT%H:%M:%fZ','now'));");
    if(!this.sql.prepare('PRAGMA table_info(outbox)').all().some(c=>c.name==='sending_at'))this.sql.exec('ALTER TABLE outbox ADD COLUMN sending_at INTEGER');
    if(!this.sql.prepare('PRAGMA table_info(users)').all().some(c=>c.name==='guide_done'))this.sql.exec('ALTER TABLE users ADD COLUMN guide_done INTEGER NOT NULL DEFAULT 0');
    if(!this.sql.prepare('SELECT id FROM state').get()){
      const db=BC.createDB();db.users=[];delete db.credentials;
      this.sql.prepare('INSERT INTO state(id,payload) VALUES(1,?)').run(JSON.stringify(db));
    }
    // A crash after dispatch has an ambiguous outcome; never automatically duplicate it.
    this.sql.exec("UPDATE outbox SET status='uncertain',last_error='Envoi interrompu : vérifier le journal Brevo avant toute reprise.' WHERE status='sending'");
  }
  transaction(fn){return this.request(async()=>{this.sql.exec('BEGIN IMMEDIATE');try{const result=await fn();this.sql.exec('COMMIT');return result}catch(e){this.sql.exec('ROLLBACK');throw e}})}
  profiles(){return this.sql.prepare('SELECT id,role,active,guide_done,profile FROM users').all().map(u=>({...JSON.parse(u.profile),id:u.id,role:u.role,active:Boolean(u.active),guideDone:Boolean(u.guide_done)}))}
  load(){const row=this.sql.prepare('SELECT * FROM state WHERE id=1').get();const db=JSON.parse(row.payload);db.users=this.profiles();db.audit=this.sql.prepare('SELECT payload FROM audit ORDER BY rowid DESC').all().map(r=>JSON.parse(r.payload));db.revision=row.revision;return db}
  save(db){
    for(const entry of db.audit)this.sql.prepare('INSERT OR IGNORE INTO audit VALUES(?,?)').run(entry.id,JSON.stringify(entry));
    const payload={...db,users:[],audit:[]};delete payload.revision;delete payload.credentials;
    this.sql.exec('DELETE FROM assignments; DELETE FROM declarations;');
    for(const [id,a]of Object.entries(db.assignments))this.sql.prepare('INSERT INTO assignments VALUES(?,?,?)').run(id,a.coachId,a.status);
    for(const d of db.declarations)this.sql.prepare('INSERT INTO declarations VALUES(?,?,?)').run(d.id,d.coachId,d.period);
    this.sql.prepare('UPDATE state SET payload=?,revision=revision+1 WHERE id=1').run(JSON.stringify(payload));
  }
  queue(id,declId,ownerId,recipient,payload,expires=null){this.sql.prepare('INSERT INTO outbox(id,decl_id,owner_id,recipient,payload,expires) VALUES(?,?,?,?,?,?)').run(id,declId,ownerId,recipient,JSON.stringify(payload),expires)}
  limit(key,max=10,window=900000){const now=Date.now();return this.transaction(()=>{
    this.sql.prepare('DELETE FROM limits WHERE expires<?').run(now);
    const old=this.sql.prepare('SELECT count FROM limits WHERE key=?').get(key);
    if(old?.count>=max)return false;
    this.sql.prepare('INSERT INTO limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(key,now+window);return true;
  })}
  ready(){return Promise.resolve()}
  close(){this.sql.close()}
}
module.exports={Store};
