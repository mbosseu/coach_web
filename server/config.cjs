'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {parseEnv}=require('node:util');
const root=path.resolve(__dirname,'..');
function config(env=process.env,{readLocal=true}={}){
  // Only read a file explicitly selected by the operator; never expose its values.
  const local=readLocal&&fs.existsSync(path.join(root,'.env'))?parseEnv(fs.readFileSync(path.join(root,'.env'),'utf8')):{};
  const inherited=env.BREVO_ENV_FILE?Object.fromEntries(Object.entries(parseEnv(fs.readFileSync(path.resolve(env.BREVO_ENV_FILE),'utf8'))).filter(([key])=>/^BREVO_(API_KEY|SENDER_EMAIL|SENDER_NAME|REPLY_TO)$/.test(key))):{};
  const values={...local,...inherited,...env};
  const production=values.NODE_ENV==='production',port=Number(values.PORT||4173);
  if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT invalide (1 à 65535).');
  const origin=values.APP_ORIGIN||`http://127.0.0.1:${port}`;
  const url=new URL(origin);
  if(url.origin!==origin||url.username||url.password)throw Error('APP_ORIGIN doit être une origine sans chemin.');
  const mailMode=values.MAIL_MODE||'disabled';
  if(!['disabled','brevo'].includes(mailMode))throw Error('MAIL_MODE invalide.');
  const cfg={root,production,port,host:values.HOST||'127.0.0.1',origin,requireApproval:values.REGISTRATION_APPROVAL!=='false',trustProxy:values.TRUST_LOOPBACK_PROXY==='true',
    dbPath:path.resolve(values.DATABASE_PATH||path.join(root,'data','boxing-center.sqlite')),
    backupDir:path.resolve(values.BACKUP_DIR||path.join(root,'backups')),
    mailMode,apiKey:(values.BREVO_API_KEY||'').trim().replace(/^["']|["']$/g,''),
    sender:values.BREVO_SENDER_EMAIL||'',senderName:values.BREVO_SENDER_NAME||'Boxing Center',
    replyTo:values.BREVO_REPLY_TO||'boxingcenter31@gmail.com',direction:'boxingcenter31@gmail.com'};
  if(production&&url.protocol!=='https:')throw Error('HTTPS APP_ORIGIN obligatoire en production.');
  if(production&&!['127.0.0.1','::1'].includes(cfg.host))throw Error('Le serveur de production doit rester sur la boucle locale derrière le proxy HTTPS.');
  if(production&&values.BREVO_KEY_EXPOSED==='true')throw Error('Remplacer la clé Brevo exposée avant la production, puis retirer BREVO_KEY_EXPOSED.');
  if((production||mailMode==='brevo')&&(!cfg.apiKey.startsWith('xkeysib-')||!/^\S+@\S+\.\S+$/.test(cfg.sender)))throw Error('Configurer BREVO_API_KEY et un BREVO_SENDER_EMAIL vérifié.');
  if(production&&mailMode!=='brevo')throw Error('Les e-mails doivent être activés en production.');
  if(production&&!cfg.requireApproval)throw Error('L’activation des comptes par la direction est obligatoire en production.');
  if(production&&values.SCHEDULES_CONFIRMED!=='true')throw Error('Confirmer les six plannings officiels et leurs exceptions avant la production (SCHEDULES_CONFIRMED=true).');
  if(production&&(Number(process.versions.node.split('.')[0])!==24||Number(process.versions.node.split('.')[1])<21))throw Error('Installer Node 24.21 ou un correctif LTS 24 plus récent avant la production.');
  return cfg;
}
module.exports={config};
