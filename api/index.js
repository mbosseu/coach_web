'use strict';
const {waitUntil}=require('@vercel/functions');
const {config}=require('../server/config.cjs');
const {PostgresStore}=require('../server/postgres.cjs');
const {createApp}=require('../server/app.cjs');
let application;
// Allowlisted startup diagnostics only: never log credentials or arbitrary
// provider messages. These identifiers make a ready-but-failing deploy visible.
function startupDiagnostic(error){
  const known={
    'Confirmer les six plannings officiels et leurs exceptions avant la production (SCHEDULES_CONFIRMED=true).':'SCHEDULES_NOT_CONFIRMED',
    'Installer Node 24.21 ou un correctif LTS 24 plus récent avant la production.':'NODE_RUNTIME_TOO_OLD',
    'Configurer une reprise sécurisée de la file mail au moins chaque minute, puis MAIL_SCHEDULER_READY=true.':'MAIL_SCHEDULER_NOT_READY'
  };
  return known[error?.message]||(/^[A-Z0-9_]{1,40}$/.test(error?.code||'')?error.code:'STARTUP_FAILED');
}
// Factory export is also exercised locally with two independent function instances.
function vercelHandler({cfg,store,defer=waitUntil,fetcher}={}){
  let app,initializing;
  return async(req,res)=>{
    try{
      if(!app){initializing||=(async()=>{const settings=cfg||config({...process.env,VERCEL:'1'},{readLocal:false});const database=store||new PostgresStore(settings);
        try{await database.ready();if(settings.production&&!(await database.profiles()).some(u=>u.role==='admin'))throw Object.assign(Error('Créer le premier administrateur avec npm run admin:create.'),{status:503});return createApp(settings,{store:database,background:false,defer,fetcher})}
        catch(e){if(!store)await database.close();throw e}
      })();try{app=await initializing}catch(e){initializing=null;throw e}}
      const url=new URL(req.url,'https://localhost');
      const route=req.query?.bc_route||url.searchParams.get('bc_route');
      if(route!==undefined&&route!==null){if(typeof route!=='string'||! /^[a-z]+(?:\/[a-z]+)*$/.test(route)){res.writeHead(404,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'Route introuvable.'}))}req.url='/api/'+route;}
      return await app.handler(req,res);
    }catch(e){
      console.error('Configuration de la fonction indisponible',startupDiagnostic(e));
      if(!res.headersSent){res.writeHead(503,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify({error:'Service indisponible : la configuration Supabase/Vercel doit être vérifiée par la direction.'}))}
    }
  };
}
module.exports=async(req,res)=>{application||=vercelHandler();return application(req,res)};
module.exports.vercelHandler=vercelHandler;
module.exports.startupDiagnostic=startupDiagnostic;
