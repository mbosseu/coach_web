'use strict';
const {config}=require('../server/config.cjs');
const {createStore}=require('../server/create-store.cjs');
const {createUser}=require('../server/auth.cjs');
(async()=>{const cfg=config(),store=createStore(cfg);try{
  if(store.pool)store.pool.options.connectionTimeoutMillis=30000;
  await store.ready();
  if((await store.profiles()).some(u=>u.role==='admin'))throw Error('Un administrateur existe déjà. Aucune modification effectuée.');
  await createUser(store,{firstName:process.env.ADMIN_FIRST_NAME||'Direction',lastName:process.env.ADMIN_LAST_NAME||'Boxing Center',company:'Boxing Center',phone:process.env.ADMIN_PHONE,email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD},'admin');
  console.log('Administrateur créé. Supprimez ADMIN_PASSWORD de l’environnement après utilisation.');
}finally{await store.close()}})().catch(e=>{console.error(e.code||e.message);process.exitCode=1});
