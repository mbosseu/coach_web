'use strict';
// Real HTTP application and PostgreSQL engine, local disposable data only.
// No dotenv, Supabase URL, Brevo credential, cloud write or fake API response.
const path=require('node:path');
const fs=require('node:fs');
const {pgFixture}=require('../tests/pg-fixture.cjs');
const {createApp}=require('../server/app.cjs');
const {createUser}=require('../server/auth.cjs');
(async()=>{
  if(process.env.NODE_ENV==='production')throw Error('Recette interdite en production.');
  const root=path.resolve(__dirname,'..'),dataDir=path.join(root,'output','tests','browser-postgres-2026-10-12');
  fs.mkdirSync(path.dirname(dataDir),{recursive:true});
  const fixture=await pgFixture(dataDir),servers=[];
  try{
    if(!(await fixture.store.profiles()).some(u=>u.role==='admin'))await createUser(fixture.store,{firstName:'Direction',lastName:'Recette',company:'Fictif — recette locale',phone:'0600000000',email:'direction@recette.example.test',password:'Recette-Boxing-2026!'},'admin');
    // Separate loopback hosts keep cookies isolated while all users share data.
    for(const [host,label]of [['127.0.0.1','Coach Claire'],['127.0.0.2','Coach Malik'],['127.0.0.3','Direction']]){
      const cfg={root,origin:`http://${host}:4210`,production:false,provider:'supabase',serverless:false,mailMode:'disabled',requireApproval:true,direction:'direction@recette.example.test'};
      const {server}=createApp(cfg,{store:fixture.makeStore(),background:false});servers.push(server);
      await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(4210,host,resolve)});
      console.log(`${label} : ${cfg.origin} · PostgreSQL local · aucun e-mail réel`);
    }
    let stopping=false;
    async function stop(){if(stopping)return;stopping=true;await Promise.all(servers.map(server=>new Promise(resolve=>server.close(resolve))));await fixture.close();}
    process.on('SIGINT',()=>stop().then(()=>process.exit(0)));
    process.on('SIGTERM',()=>stop().then(()=>process.exit(0)));
  }catch(error){await Promise.all(servers.map(server=>new Promise(resolve=>server.close(resolve))));await fixture.close();throw error;}
})().catch(error=>{console.error('Recette interrompue :',error.code||error.message);process.exitCode=1});
