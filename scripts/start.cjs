'use strict';
const {config}=require('../server/config.cjs');
const {createApp}=require('../server/app.cjs');
const {backup}=require('./backup.cjs');
const BC=require('../model.js');
try{
  const cfg=config(),{server,store}=createApp(cfg);
  if(cfg.production&&!store.profiles().some(u=>u.role==='admin'))throw Error('Créer le premier administrateur avec npm run admin:create.');
  if(cfg.production){const db=store.load(),missing=BC.targets.filter(t=>!BC.templates.some(c=>c.target===t.id)&&!db.extra.some(c=>c.target===t.id&&!db.deleted.includes(c.id))&&!Object.values(db.overrides).some(c=>c.target===t.id&&!db.deleted.includes(c.id)));if(missing.length)throw Error('Plannings manquants : '+missing.map(t=>t.club+(t.space?' · '+t.space:'')).join(', '))}
  if(cfg.production)backup(cfg.dbPath,cfg.backupDir);
  const backupTimer=setInterval(()=>{try{backup(cfg.dbPath,cfg.backupDir);console.log('Sauvegarde quotidienne vérifiée.')}catch{console.error('ÉCHEC SAUVEGARDE : intervention nécessaire.')}},24*3600000);backupTimer.unref();
  server.on('error',e=>{console.error('Démarrage impossible :',e.code||e.message);process.exitCode=1;store.close()});
  server.listen(cfg.port,cfg.host,()=>console.log(`Boxing Center : ${cfg.origin} · mail ${cfg.mailMode}`));
  let stopping=false;
  function stop(){if(stopping)return;stopping=true;clearInterval(backupTimer);server.close(()=>{store.close();process.exit(0)});setTimeout(()=>process.exit(1),20000).unref()}
  process.on('SIGINT',stop);process.on('SIGTERM',stop);
}catch(e){console.error('Configuration invalide :',e.message);process.exitCode=1}
