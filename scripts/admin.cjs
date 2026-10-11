'use strict';
const {config}=require('../server/config.cjs');
const {Store}=require('../server/store.cjs');
const {createUser}=require('../server/auth.cjs');
(async()=>{const cfg=config(),store=new Store(cfg.dbPath);try{
  if(store.profiles().some(u=>u.role==='admin'))throw Error('Un administrateur existe déjà. Aucune modification effectuée.');
  await createUser(store,{firstName:process.env.ADMIN_FIRST_NAME||'Direction',lastName:process.env.ADMIN_LAST_NAME||'Boxing Center',company:'Boxing Center',phone:process.env.ADMIN_PHONE,email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD},'admin');
  console.log('Administrateur créé. Supprimez ADMIN_PASSWORD de l’environnement après utilisation.');
}finally{store.close()}})().catch(e=>{console.error(e.message);process.exitCode=1});
