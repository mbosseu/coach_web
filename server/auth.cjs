'use strict';
const {randomBytes,createHash,scrypt,timingSafeEqual,randomUUID}=require('node:crypto');
const {promisify}=require('node:util');
const derive=promisify(scrypt);
const digest=value=>createHash('sha256').update(value).digest('hex');
const token=()=>randomBytes(32).toString('base64url');
const fail=(message,status=400)=>Object.assign(Error(message),{status});
function password(value){if(typeof value!=='string'||value.length<12||value.length>128)throw fail('Utilisez un mot de passe de 12 à 128 caractères.');return value}
let running=0;
async function hash(value){password(value);if(running>=4)throw fail('Service occupé. Réessayez dans quelques instants.',503);running++;try{const salt=token(),key=await derive(value,salt,64,{N:65536,r:8,p:2,maxmem:96*1024*1024});return `scrypt:65536:8:2:${salt}:${key.toString('hex')}`}finally{running--}}
async function verify(value,encoded){
  if(typeof value!=='string'||value.length>128)return false;
  if(running>=4)throw fail('Service occupé. Réessayez dans quelques instants.',503);
  running++;try{const parts=encoded.split(':'),salt=parts.at(-2),key=parts.at(-1),p=parts.length===6?2:1,actual=await derive(value,salt,64,{N:65536,r:8,p,maxmem:96*1024*1024});return key?.length===128&&timingSafeEqual(actual,Buffer.from(key,'hex'))}finally{running--}
}
function profile(values){const out={};for(const key of ['firstName','lastName','company','phone','email']){
  const value=values[key];if(typeof value!=='string'||!value.trim()||value.length>200)throw fail('Renseignez toutes les coordonnées professionnelles.');out[key]=value.trim();
}out.email=out.email.toLowerCase();const digits=out.phone.replace(/\D/g,'');if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email)||!/^\+?[\d\s().-]{6,30}$/.test(out.phone)||digits.length<8||digits.length>15)throw fail('Vérifiez l’adresse e-mail et le téléphone.');return out}
async function createUser(store,values,role='coach',active=true){
  const p=profile(values),encoded=await hash(values.password),id=randomUUID();
  (await store.transaction(async()=>{if(role==='admin'&&(await store.profiles()).some(u=>u.role==='admin'))throw fail('Un administrateur existe déjà.');if((await store.sql.prepare('SELECT id FROM users WHERE email=?').get(p.email)))throw fail('Cette adresse est déjà utilisée.');(await store.sql.prepare('INSERT INTO users(id,email,profile,password,role,active) VALUES(?,?,?,?,?,?)').run(id,p.email,JSON.stringify(p),encoded,role,active?1:0))}));return id;
}
async function session(store,userId=null){const value=token(),csrf=token();(await store.sql.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(digest(value),userId,csrf,Date.now()+8*3600000));return{value,csrf,userId}}
async function getSession(store,cookie=''){
  const value=cookie.match(/(?:^|;\s*)bc_session=([A-Za-z0-9_-]{43})(?:;|$)/)?.[1];if(!value)return null;
  const row=(await store.sql.prepare('SELECT * FROM sessions WHERE token_hash=? AND expires>?').get(digest(value),Date.now()));
  if(row?.user_id&&!(await store.sql.prepare('SELECT id FROM users WHERE id=? AND active=1').get(row.user_id)))return null;
  return row;
}
module.exports={digest,token,fail,password,hash,verify,profile,createUser,session,getSession};
