'use strict';
const {config}=require('../server/config.cjs');
const {PostgresStore}=require('../server/postgres.cjs');
(async()=>{
  const cfg=config();
  if(cfg.provider!=='supabase'||cfg.projectRef!=='jnlmnsogppsdmquvzfzy')throw Error('Projet Supabase attendu requis.');
  const store=new PostgresStore(cfg);
  // First Windows DNS resolution may be slower than the runtime's 10 s budget.
  store.pool.options.connectionTimeoutMillis=30000;
  try{
    const result=await store.pool.query("SELECT current_database() AS database, current_setting('server_version') AS version, EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='boxing_center') AS initialized");
    console.log('Connexion PostgreSQL avec vérification TLS réussie.',JSON.stringify(result.rows[0]));
    const extensions=await store.pool.query("SELECT name, installed_version FROM pg_available_extensions WHERE name IN ('pg_cron','pg_net','supabase_vault') ORDER BY name");
    console.log('Extensions disponibles :',JSON.stringify(extensions.rows));
    if(result.rows[0].initialized){
      await store.ready();
      const counts=await store.pool.query("SELECT (SELECT count(*)::int FROM boxing_center.users) AS users, (SELECT count(*)::int FROM boxing_center.users WHERE role='admin') AS administrators, (SELECT count(*)::int FROM pg_tables WHERE schemaname='boxing_center') AS tables");
      console.log('État métier :',JSON.stringify(counts.rows[0]));
    }
  }finally{await store.close()}
})().catch(e=>{
  const reason=e.code||(/timeout|timed out/i.test(e.message)?'Délai réseau dépassé':/certificate|self.signed|verify/i.test(e.message)?'Certificat TLS non vérifié':/password authentication/i.test(e.message)?'Authentification PostgreSQL refusée':e.name);
  console.error('Vérification Supabase interrompue :',reason);process.exitCode=1;
});
