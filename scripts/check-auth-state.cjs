'use strict';
// Read-only diagnosis. Never print addresses, tokens, passwords or mail content.
const {config}=require('../server/config.cjs');
const {PostgresStore}=require('../server/postgres.cjs');
(async()=>{
  const cfg=config();
  if(cfg.provider!=='supabase'||cfg.projectRef!=='jnlmnsogppsdmquvzfzy')throw Error('Projet Supabase choisi requis.');
  const store=new PostgresStore(cfg);store.pool.options.connectionTimeoutMillis=30000;
  try{
    const accounts=await store.pool.query('SELECT role,active,count(*)::int AS count FROM boxing_center.users GROUP BY role,active ORDER BY role,active');
    const recovery=await store.pool.query('SELECT status,last_error,count(*)::int AS count FROM boxing_center.outbox WHERE decl_id IS NULL GROUP BY status,last_error ORDER BY status');
    const tokens=await store.pool.query('SELECT count(*)::int AS count FROM boxing_center.resets WHERE expires>$1',[Date.now()]);
    console.log(JSON.stringify({accounts:accounts.rows,recovery:recovery.rows,validRecoveryLinks:tokens.rows[0].count}));
  }finally{await store.close()}
})().catch(e=>{console.error('Diagnostic interrompu :',e.code||e.name);process.exitCode=1});
