'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {config}=require('../server/config.cjs');
const {PostgresStore,initialState}=require('../server/postgres.cjs');
(async()=>{
  if(process.argv[2]!=='--confirmed-project')throw Error('Vérifier le projet Supabase cible puis utiliser --confirmed-project.');
  const cfg=config();if(cfg.provider!=='supabase')throw Error('DB_PROVIDER=supabase requis.');
  const store=new PostgresStore(cfg);
  store.pool.options.connectionTimeoutMillis=30000;
  try{
    await store.pool.query(fs.readFileSync(path.join(cfg.root,'supabase','migrations','001_coach_platform.sql'),'utf8'));
    await store.pool.query('INSERT INTO boxing_center.state(id,payload) VALUES(1,$1) ON CONFLICT(id) DO NOTHING',[initialState()]);
    await store.ready();console.log('Schéma privé boxing_center initialisé. Aucun compte ni donnée de démonstration importé.');
  }finally{await store.close()}
})().catch(e=>{console.error('Migration interrompue',e.code||e.name);process.exitCode=1});
