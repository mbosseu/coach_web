'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {parseEnv}=require('node:util');
const {config}=require('../server/config.cjs');
const {createStore}=require('../server/create-store.cjs');
const {createUser}=require('../server/auth.cjs');
function loadAdminEnv(){
  const file=path.resolve(__dirname,'..','.env.admin.local');
  if(!fs.existsSync(file))return{};
  return parseEnv(fs.readFileSync(file,'utf8'));
}
(async()=>{
  const fileEnv=loadAdminEnv();
  const email=process.env.ADMIN_EMAIL||fileEnv.ADMIN_EMAIL;
  const phone=process.env.ADMIN_PHONE||fileEnv.ADMIN_PHONE;
  const password=process.env.ADMIN_PASSWORD||fileEnv.ADMIN_PASSWORD;
  const cfg=config(),store=createStore(cfg);
  try{
    if(store.pool)store.pool.options.connectionTimeoutMillis=30000;
    await store.ready();
    console.log(`Base : ${cfg.provider}${cfg.projectRef?' · '+cfg.projectRef:''}`);
    if((await store.profiles()).some(u=>u.role==='admin')){
      console.log('Un administrateur existe déjà. Aucune modification effectuée.');
      return;
    }
    if(!email||!phone||!password)throw Error('Renseignez ADMIN_EMAIL, ADMIN_PHONE et ADMIN_PASSWORD (ou .env.admin.local).');
    await createUser(store,{firstName:process.env.ADMIN_FIRST_NAME||fileEnv.ADMIN_FIRST_NAME||'Direction',lastName:process.env.ADMIN_LAST_NAME||fileEnv.ADMIN_LAST_NAME||'Boxing Center',company:'Boxing Center',phone,email,password},'admin');
    console.log('Administrateur créé pour',email+'.');
  }finally{await store.close()}
})().catch(e=>{console.error(e.code||e.message);process.exitCode=1});
