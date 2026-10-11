'use strict';
// Explicit, isolated fixtures. Never imported by the production entry point.
const path=require('node:path');
const {Store}=require('../server/store.cjs');
const {createUser}=require('../server/auth.cjs');
const {createApp}=require('../server/app.cjs');
(async()=>{
  if(process.env.NODE_ENV==='production')throw Error('Recette interdite en production.');
  const root=path.resolve(__dirname,'..'),store=new Store(path.join(root,'output','tests','recette-api.sqlite'));
  for(const [email,firstName,role]of [['coach@recette.example.test','Recette','coach'],['second@recette.example.test','Second','coach'],['direction@recette.example.test','Direction','admin']]){
    if(!store.sql.prepare('SELECT id FROM users WHERE email=?').get(email))await createUser(store,{email,firstName,lastName:'Boxing',company:'Données de recette uniquement',phone:'0600000000',password:'Recette-Boxing-2026!'},role);
  }
  const cfg={root,dbPath:':unused:',production:false,origin:'http://127.0.0.1:4180',mailMode:'disabled',direction:'boxingcenter31@gmail.com'};
  const {server}=createApp(cfg,{store});server.listen(4180,'127.0.0.1',()=>console.log('Recette isolée : http://127.0.0.1:4180'));
  process.on('SIGINT',()=>server.close(()=>{store.close();process.exit(0)}));
})().catch(e=>{console.error(e.message);process.exitCode=1});
