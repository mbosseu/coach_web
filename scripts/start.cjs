'use strict';
const {config}=require('../server/config.cjs');
const {createApp}=require('../server/app.cjs');
const {backup}=require('./backup.cjs');
const BC=require('../model.js');
const {createStore}=require('../server/create-store.cjs');
(async()=>{try{
  const cfg=config(),store=createStore(cfg);await store.ready();const {server}=createApp(cfg,{store});
  if(cfg.production&&!(await store.profiles()).some(u=>u.role==='admin'))throw Error('Créer le premier administrateur avec npm run admin:create.');
  if(cfg.production){const db=await store.load(),missing=BC.targets.filter(t=>!BC.templates.some(c=>c.target===t.id)&&!db.extra.some(c=>c.target===t.id&&!db.deleted.includes(c.id))&&!Object.values(db.overrides).some(c=>c.target===t.id&&!db.deleted.includes(c.id)));if(missing.length)throw Error('Plannings manquants : '+missing.map(t=>t.club+(t.space?' · '+t.space:'')).join(', '))}
  if(cfg.production&&cfg.provider==='sqlite')backup(cfg.dbPath,cfg.backupDir);
  const backupTimer=cfg.provider==='sqlite'?setInterval(()=>{try{backup(cfg.dbPath,cfg.backupDir);console.log('Sauvegarde quotidienne vérifiée.')}catch{console.error('ÉCHEC SAUVEGARDE : intervention nécessaire.')}},24*3600000):null;backupTimer?.unref();
  server.on('error',e=>{console.error('Démarrage impossible :',e.code||e.message);process.exitCode=1;store.close()});
  server.listen(cfg.port,cfg.host,()=>console.log(`Boxing Center : ${cfg.origin} · mail ${cfg.mailMode}`));
  let stopping=false;
  function stop(){if(stopping)return;stopping=true;clearInterval(backupTimer);server.close(async()=>{await store.close();process.exit(0)});setTimeout(()=>process.exit(1),20000).unref()}
  process.on('SIGINT',stop);process.on('SIGTERM',stop);
}catch(e){console.error('Configuration invalide :',e.code||e.message);process.exitCode=1}})();
