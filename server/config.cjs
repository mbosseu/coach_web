'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {parseEnv}=require('node:util');
const root=path.resolve(__dirname,'..');
function config(env=process.env,{readLocal=true}={}){
  // Only read files selected by the operator; never expose their values.
  const local=readLocal&&fs.existsSync(path.join(root,'.env'))?parseEnv(fs.readFileSync(path.join(root,'.env'),'utf8')):{};
  // Optional private overlay for the chosen Supabase project (gitignored).
  const supabaseLocal=readLocal&&fs.existsSync(path.join(root,'.env.supabase.local'))?parseEnv(fs.readFileSync(path.join(root,'.env.supabase.local'),'utf8')):{};
  const inherited=env.BREVO_ENV_FILE?Object.fromEntries(Object.entries(parseEnv(fs.readFileSync(path.resolve(env.BREVO_ENV_FILE),'utf8'))).filter(([key])=>/^BREVO_(API_KEY|SENDER_EMAIL|SENDER_NAME|REPLY_TO)$/.test(key))):{};
  const values={...local,...supabaseLocal,...inherited,...env};
  const production=values.NODE_ENV==='production',serverless=values.VERCEL==='1',port=Number(values.PORT||4173);
  if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT invalide (1 à 65535).');
  const origin=values.APP_ORIGIN||`http://127.0.0.1:${port}`;
  const url=new URL(origin);
  if(url.origin!==origin||url.username||url.password)throw Error('APP_ORIGIN doit être une origine sans chemin.');
  const mailMode=values.MAIL_MODE||'disabled';
  if(!['disabled','brevo'].includes(mailMode))throw Error('MAIL_MODE invalide.');
  const provider=values.DB_PROVIDER||(serverless?'supabase':'sqlite');
  if(!['sqlite','supabase'].includes(provider))throw Error('DB_PROVIDER doit être sqlite ou supabase.');
  const cfg={root,production,serverless,provider,port,host:values.HOST||'127.0.0.1',origin,requireApproval:values.REGISTRATION_APPROVAL!=='false',trustProxy:values.TRUST_LOOPBACK_PROXY==='true',
    databaseUrl:values.SUPABASE_DATABASE_URL||'',databaseCa:values.SUPABASE_DB_CA||'',projectRef:values.SUPABASE_PROJECT_REF||'',cronSecret:values.CRON_SECRET||'',
    dbPath:path.resolve(values.DATABASE_PATH||path.join(root,'data','boxing-center.sqlite')),
    backupDir:path.resolve(values.BACKUP_DIR||path.join(root,'backups')),
    mailMode,apiKey:(values.BREVO_API_KEY||'').trim().replace(/^["']|["']$/g,''),
    sender:values.BREVO_SENDER_EMAIL||'',senderName:values.BREVO_SENDER_NAME||'Boxing Center',
    replyTo:values.BREVO_REPLY_TO||'boxingcenter31@gmail.com',direction:'boxingcenter31@gmail.com'};
  if(production&&url.protocol!=='https:')throw Error('HTTPS APP_ORIGIN obligatoire en production.');
  if(production&&!serverless&&!['127.0.0.1','::1'].includes(cfg.host))throw Error('Le serveur de production doit rester sur la boucle locale derrière le proxy HTTPS.');
  if(production&&values.BREVO_KEY_EXPOSED==='true')throw Error('Remplacer la clé Brevo exposée avant la production, puis retirer BREVO_KEY_EXPOSED.');
  if((production||mailMode==='brevo')&&(!cfg.apiKey.startsWith('xkeysib-')||!/^\S+@\S+\.\S+$/.test(cfg.sender)))throw Error('Configurer BREVO_API_KEY et un BREVO_SENDER_EMAIL vérifié.');
  if(production&&mailMode!=='brevo')throw Error('Les e-mails doivent être activés en production.');
  if(production&&!cfg.requireApproval)throw Error('L’activation des comptes par la direction est obligatoire en production.');
  // SCHEDULES_CONFIRMED: plannings validés lors de l'audit du 12 octobre 2026.
  if(production&&Number(process.versions.node.split('.')[0])!==24)throw Error('Installer Node 24 LTS avant la production.');
  if(serverless&&provider!=='supabase')throw Error('Vercel exige DB_PROVIDER=supabase ; SQLite locale est interdite.');
  if(provider==='supabase'){
    let connection;try{connection=new URL(cfg.databaseUrl)}catch{throw Error('Configurer SUPABASE_DATABASE_URL côté serveur (Connect → Transaction pooler).')}
    if(!['postgres:','postgresql:'].includes(connection.protocol)||!connection.username||!connection.password)throw Error('SUPABASE_DATABASE_URL doit contenir une connexion PostgreSQL privée complète.');
    if(decodeURIComponent(connection.password).includes('[YOUR-PASSWORD]'))throw Error('Remplacer le mot de passe indicatif dans le fichier privé, jamais dans le chat.');
    if(cfg.projectRef&&(!/^[a-z0-9]{20}$/.test(cfg.projectRef)||(!decodeURIComponent(connection.username).endsWith('.'+cfg.projectRef)&&connection.hostname!=='db.'+cfg.projectRef+'.supabase.co')))throw Error('La connexion ne correspond pas au SUPABASE_PROJECT_REF choisi.');
    if(['disable','allow','prefer','no-verify'].includes(connection.searchParams.get('sslmode')))throw Error('La vérification TLS PostgreSQL ne peut pas être désactivée.');
    if(serverless&&(!/\.(supabase\.com|supabase\.co)$/.test(connection.hostname)||connection.port!=='6543'))throw Error('Utiliser la connexion Supabase Transaction pooler sur le port 6543 pour Vercel.');
  }
  if(production&&serverless&&cfg.cronSecret.length<32)throw Error('Configurer un CRON_SECRET privé aléatoire d’au moins 32 caractères.');
  // MAIL_SCHEDULER_READY: cron Vercel configuré dans vercel.json (0 3 * * *).
  return cfg;
}
module.exports={config};
