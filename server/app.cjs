'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {isIP}=require('node:net');
const {randomUUID,timingSafeEqual}=require('node:crypto');
const BC=require('../model.js');
const A=require('./auth.cjs');
const {queueDeclaration,message,dispatch,drain,cleanup}=require('./mail.cjs');
const files=new Set(['index.html','styles.css','login.css','theme-light.css','readability.css','final-audit.css','product-polish.css','compliance.css','schedule-data.js','model.js','frontend.js','export-utils.js']);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};
const period=p=>{if(typeof p!=='string'||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(p))throw A.fail('Période invalide.');return p};
const string=(value,name,max=200)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw A.fail(`${name} invalide.`);return value.trim()};
const today=()=>BC.parseDate(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
async function filtered(store,id,cfg,csrf){
  if(!id)return{userId:null,csrf,mailEnabled:cfg.mailMode==='brevo',serverDate:BC.dateKey(today())};
  const db=(await store.load()),u=db.users.find(x=>x.id===id);if(!u)throw A.fail('Session expirée.',401);
  const mail=(await store.sql.prepare('SELECT id,decl_id,owner_id,recipient,status,message_id,last_error FROM outbox WHERE decl_id IS NOT NULL').all());
  db.deliveries=mail.filter(x=>u.role==='admin'||x.owner_id===id).map(({owner_id,...rest})=>rest);
  if(u.role==='admin')db.mailQueue=(await store.sql.prepare('SELECT id,decl_id,recipient,status,attempts,next_at,message_id,last_error,expires FROM outbox ORDER BY rowid DESC LIMIT 200').all());
  if(u.role!=='admin'){
    const owners=new Set(Object.values(db.assignments).map(a=>a.coachId));
    db.users=db.users.filter(x=>x.id===id||owners.has(x.id)).map(x=>x.id===id?x:{id:x.id,role:x.role,firstName:x.firstName,lastName:x.lastName});
    db.declarations=db.declarations.filter(d=>d.coachId===id);
    for(const type of ['drafts','baskets'])db[type]=Object.fromEntries(Object.entries(db[type]).filter(([key])=>key.startsWith(id+':')));
    db.audit=[];db.exportLog=[];
  }
  return{db,userId:id,csrf,mailEnabled:cfg.mailMode==='brevo',serverDate:BC.dateKey(today())};
}
async function body(req){
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw A.fail('JSON requis.',415);
  if(req.body!==undefined){const value=req.body;if(Buffer.byteLength(JSON.stringify(value)||'')>65536)throw A.fail('Requête trop volumineuse.',413);if(!value||Array.isArray(value)||typeof value!=='object')throw A.fail('JSON invalide.');return value}
  let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>65536)throw A.fail('Requête trop volumineuse.',413);chunks.push(chunk)}
  try{const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!value||Array.isArray(value)||typeof value!=='object')throw Error();return value}catch{throw A.fail('JSON invalide.')}
}
function courseValues(input){
  if(!input||typeof input!=='object')throw A.fail('Créneau invalide.');
  const out={};for(const name of ['target','date','name','discipline','start','end','category','color'])out[name]=string(input[name],name);
  out.area=typeof input.area==='string'?input.area.trim().slice(0,200):'';
  if(typeof input.selectable!=='boolean')throw A.fail('Sélectionnabilité invalide.');out.selectable=input.selectable;
  if(input.scope==='weekly'){out.scope='weekly';out.repeatUntil=string(input.repeatUntil,'Fin de répétition')}
  return out;
}
function createApp(cfg,{store,fetcher=fetch,background=!cfg.serverless,defer}={}){
  store=store||new(require('./store.cjs').Store)(cfg.dbPath);
  const cookie=(res,value)=>res.setHeader('Set-Cookie',`bc_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${cfg.production?'; Secure':''}`);
  const json=(res,value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value))};
  const snapshot=(id,csrf)=>store.transaction(()=>filtered(store,id,cfg,csrf));
  const invalidateResets=async id=>{
    (await store.sql.prepare('DELETE FROM resets WHERE user_id=?').run(id));
    (await store.sql.prepare("UPDATE outbox SET payload='{}',status=CASE WHEN status IN ('pending','retry') THEN 'cancelled' ELSE status END WHERE decl_id IS NULL AND owner_id=?").run(id));
  };
  const handleRequest=async(req,res)=>{
    let needsMail=false;
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');res.setHeader('Cache-Control','no-store');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'");
    if(cfg.production)res.setHeader('Strict-Transport-Security','max-age=31536000');
    try{
      await store.ready();
      const url=new URL(req.url,cfg.origin),route=url.pathname;
      const remote=req.socket.remoteAddress,loopback=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(remote);
      const forwarded=cfg.serverless?String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||'').split(',')[0].trim():'';
      const ip=cfg.serverless&&isIP(forwarded)?forwarded:cfg.trustProxy&&loopback&&isIP(req.headers['x-real-ip']||'')?req.headers['x-real-ip']:remote;
      if(req.headers.host!==new URL(cfg.origin).host)throw A.fail('Hôte non autorisé.',403);
      if(route==='/api/health'&&req.method==='GET'){(await store.sql.prepare('SELECT 1').get());return json(res,{status:'ok'})}
      if(route==='/api/cron/mail'&&req.method==='GET'){
        const actual=req.headers.authorization||'',expected='Bearer '+cfg.cronSecret;
        if(!cfg.cronSecret||actual.length!==expected.length||!timingSafeEqual(Buffer.from(actual),Buffer.from(expected)))throw A.fail('Accès non autorisé.',401);
        await cleanup(store);const processed=await drain(store,cfg,fetcher,{limit:2});return json(res,{ok:true,processed});
      }
      if(route.startsWith('/api/')){
        let s=(await A.getSession(store,req.headers.cookie));
        if(route==='/api/session'&&req.method==='GET'){
          if(!s){if(!(await store.limit('session:'+ip,300)))throw A.fail('Trop de sessions. Réessayez plus tard.',429);const next=(await A.session(store));cookie(res,next.value);s={user_id:null,csrf:next.csrf}}
          return json(res,(await snapshot(s.user_id,s.csrf)));
        }
        if(route==='/api/state'&&req.method==='GET'){if(!s?.user_id)throw A.fail('Connectez-vous pour continuer.',401);return json(res,(await snapshot(s.user_id,s.csrf)))}
        if(req.method!=='POST')throw A.fail('Route introuvable.',404);
        if(req.headers.origin!==cfg.origin)throw A.fail('Origine non autorisée.',403);
        const csrf=req.headers['x-csrf-token'];
        if(!s||typeof csrf!=='string'||csrf.length!==s.csrf.length||!timingSafeEqual(Buffer.from(csrf),Buffer.from(s.csrf)))throw A.fail('Session expirée : actualisez la page.',403);
        const v=await body(req);
        const rate=async(key,max=10)=>{if(!(await store.limit(`${key}:${ip}`,max)))throw A.fail('Trop de tentatives. Réessayez dans 15 minutes.',429)};
        if(route==='/api/login'){
          (await rate('login'));const email=string(v.email,'Adresse e-mail').toLowerCase();
          const row=(await store.sql.prepare('SELECT * FROM users WHERE email=?').get(email));
          // Same expensive derivation for an unknown address; no account enumeration.
          const encoded=row?.password||'scrypt:65536:8:2:dummy-salt-for-timing:'+ '0'.repeat(128);
          const valid=await A.verify(v.password,encoded);
          if(!valid||!row||row.role!==v.role)throw A.fail('Adresse e-mail ou mot de passe incorrect.',401);
          if(!row.active)throw A.fail('Vos identifiants sont corrects, mais votre compte n’est pas actif. Après inscription, la direction doit activer votre accès. Si votre compte a été suspendu, contactez la direction.',401);
          const next=(await store.transaction(async()=>{const live=(await store.sql.prepare('SELECT password,active FROM users WHERE id=?').get(row.id));if(!live?.active||live.password!==row.password)throw A.fail('Compte modifié : reconnectez-vous.',401);(await store.sql.prepare('DELETE FROM sessions WHERE token_hash=?').run(s.token_hash));return (await A.session(store,row.id))}));cookie(res,next.value);return json(res,(await snapshot(row.id,next.csrf)));
        }
        if(route==='/api/register'){
          (await rate('register',5));if(v.password!==v.confirmation)throw A.fail('Les mots de passe ne correspondent pas.');
          // Registration cannot grant a direction role.
          await A.createUser(store,v,'coach',!cfg.requireApproval);return json(res,{message:cfg.requireApproval?'Compte créé. La direction doit activer votre accès avant votre première connexion.':'Compte créé. Vous pouvez vous connecter.'},201);
        }
        if(route==='/api/reset/request'){
          (await rate('reset',5));const email=string(v.email,'Adresse e-mail').toLowerCase();
          if(cfg.mailMode!=='brevo')throw A.fail('La récupération par e-mail est indisponible. Contactez la direction ; aucune demande d’envoi n’a été enregistrée.',503);
          // Recovering a password must not activate a pending or suspended user.
          // Those users still own their address and can legitimately forget it.
          const row=(await store.sql.prepare('SELECT * FROM users WHERE email=?').get(email));
          if(row)(await store.transaction(async()=>{
            const live=await store.sql.prepare('SELECT email FROM users WHERE id=?').get(row.id);if(!live||live.email!==email)return;
            const value=A.token();(await store.sql.prepare('DELETE FROM resets WHERE user_id=?').run(row.id));
            (await store.sql.prepare("UPDATE outbox SET status='cancelled',payload='{}' WHERE decl_id IS NULL AND owner_id=? AND status IN ('pending','retry')").run(row.id));
            (await store.sql.prepare('INSERT INTO resets VALUES(?,?,?)').run(A.digest(value),row.id,Date.now()+30*60000));
            (await store.queue(randomUUID(),null,row.id,row.email,message('Réinitialisation Boxing Center',`Seul le dernier lien demandé reste valable. Il expire dans 30 minutes et ne peut être utilisé qu’une fois.\n${cfg.origin}/#reset/${value}\nSi vous n’avez pas demandé cette opération, ignorez ce message.`),Date.now()+30*60000));
          }));
          needsMail=Boolean(row&&cfg.mailMode==='brevo');
          return json(res,{message:'Demande reçue. Si cette adresse correspond à un compte, un lien valable 30 minutes sera envoyé. Vérifiez aussi les indésirables. Changer le mot de passe n’active pas un compte en attente ou suspendu.'},202);
        }
        if(route==='/api/reset/confirm'){
          (await rate('reset-confirm'));if(v.password!==v.confirmation)throw A.fail('Les mots de passe ne correspondent pas.');
          const hash=A.digest(string(v.token,'Lien',100));if(!(await store.sql.prepare('SELECT * FROM resets WHERE token_hash=? AND expires>?').get(hash,Date.now())))throw A.fail('Lien invalide ou expiré.');
          const encoded=await A.hash(v.password);
          (await store.transaction(async()=>{const reset=(await store.sql.prepare('SELECT * FROM resets WHERE token_hash=? AND expires>?').get(hash,Date.now()));if(!reset)throw A.fail('Lien invalide ou expiré.');(await store.sql.prepare('UPDATE users SET password=? WHERE id=?').run(encoded,reset.user_id));(await store.sql.prepare('DELETE FROM sessions WHERE user_id=?').run(reset.user_id));(await invalidateResets(reset.user_id))}));
          return json(res,{message:'Mot de passe modifié. Connectez-vous à nouveau.'});
        }
        if(!s.user_id)throw A.fail('Connectez-vous pour continuer.',401);
        let me=(await store.sql.prepare('SELECT * FROM users WHERE id=? AND active=1').get(s.user_id));if(!me)throw A.fail('Compte indisponible.',401);
        if(route==='/api/logout'){
          (await store.sql.prepare('DELETE FROM sessions WHERE token_hash=?').run(s.token_hash));res.setHeader('Set-Cookie',`bc_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${cfg.production?'; Secure':''}`);return json(res,{ok:true});
        }
        if(route==='/api/profile'){
          const p=A.profile(v);if(p.email!==me.email&&!await A.verify(v.currentPassword,me.password))throw A.fail('Confirmez votre mot de passe pour modifier l’adresse e-mail.');
          (await store.transaction(async()=>{if(!(await A.getSession(store,req.headers.cookie)))throw A.fail('Session expirée.',401);const live=(await store.sql.prepare('SELECT password FROM users WHERE id=?').get(me.id));if(live.password!==me.password)throw A.fail('Compte modifié : reconnectez-vous.',401);const duplicate=(await store.sql.prepare('SELECT id FROM users WHERE email=? AND id<>?').get(p.email,me.id));if(duplicate)throw A.fail('Cette adresse est déjà utilisée.');(await store.sql.prepare('UPDATE users SET email=?,profile=? WHERE id=?').run(p.email,JSON.stringify(p),me.id))}));
          return json(res,(await snapshot(me.id,s.csrf)));
        }
        if(route==='/api/password'){
          (await rate('password'));if(!await A.verify(v.currentPassword,me.password))throw A.fail('Le mot de passe actuel est incorrect.');if(v.newPassword!==v.confirmation)throw A.fail('Les mots de passe ne correspondent pas.');const encoded=await A.hash(v.newPassword);
          const next=(await store.transaction(async()=>{if(!(await A.getSession(store,req.headers.cookie))||(await store.sql.prepare('SELECT password FROM users WHERE id=?').get(me.id)).password!==me.password)throw A.fail('Compte modifié : reconnectez-vous.',401);(await store.sql.prepare('UPDATE users SET password=? WHERE id=?').run(encoded,me.id));(await store.sql.prepare('DELETE FROM sessions WHERE user_id=?').run(me.id));(await invalidateResets(me.id));return (await A.session(store,me.id))}));cookie(res,next.value);return json(res,(await snapshot(me.id,next.csrf)));
        }
        if(route!=='/api/action')throw A.fail('Route introuvable.',404);
        (await rate('action',2000));
        let result;
        (await store.transaction(async()=>{
          if(!(await A.getSession(store,req.headers.cookie)))throw A.fail('Session expirée.',401);
          me=await store.sql.prepare('SELECT * FROM users WHERE id=? AND active=1').get(s.user_id);if(!me)throw A.fail('Compte indisponible.',401);
          const db=(await store.load()),id=me.id;
          if(['toggle','addClub','removeBasket','validate'].includes(v.action)){
            if(me.role!=='coach')throw A.fail('Action réservée aux coachs.',403);period(v.period);
            if(v.action==='toggle')BC.toggle(db,string(v.id,'Cours'),id,v.period,today());
            if(v.action==='addClub'){if(!BC.targets.some(t=>t.id===v.target))throw A.fail('Club inconnu.');result=BC.addClub(db,id,v.period,v.target,today())}
            if(v.action==='removeBasket')BC.removeBasket(db,id,v.period,string(v.id,'Cours'));
            if(v.action==='validate'){result=BC.validate(db,id,v.period,today());result.coachSnapshot={...JSON.parse(me.profile),id};result.delivery=cfg.mailMode==='brevo'?'queued':'disabled';(await queueDeclaration(store,result,result.coachSnapshot,cfg))}
          }else{
            if(me.role!=='admin')throw A.fail('Action réservée à la direction.',403);
            const reason=['edit','delete','assign'].includes(v.action)?string(v.reason,'Motif',1000):'';
            if(v.action==='edit'){const values=courseValues(v.values);result=(values.scope==='weekly'?BC.editWeekly:BC.editCourse)(db,id,v.id?string(v.id,'Cours'):null,values,reason)}
            else if(v.action==='delete')BC.deleteCourse(db,id,string(v.id,'Cours'),reason);
            else if(v.action==='assign'){if(v.coachId&&!db.users.some(u=>u.id===v.coachId&&u.active&&u.role==='coach'))throw A.fail('Coach actif introuvable.');BC.assign(db,id,string(v.id,'Cours'),v.coachId?string(v.coachId,'Coach'):null,reason)}
            else if(v.action==='accountStatus'){
              const coach=db.users.find(u=>u.id===v.id&&u.role==='coach');if(!coach||typeof v.active!=='boolean')throw A.fail('Compte coach invalide.');
              (await store.sql.prepare('UPDATE users SET active=? WHERE id=?').run(v.active?1:0,coach.id));
              if(!v.active){(await store.sql.prepare('DELETE FROM sessions WHERE user_id=?').run(coach.id));(await invalidateResets(coach.id));for(const [cid,a]of Object.entries(db.assignments))if(a.coachId===coach.id&&a.status==='reserved')delete db.assignments[cid];for(const type of ['baskets','drafts'])for(const key of Object.keys(db[type]))if(key.startsWith(coach.id+':'))delete db[type][key]}
              db.audit.unshift({id:randomUUID(),adminId:id,action:v.active?'Activation du compte':'Suspension du compte',reason:string(v.reason,'Motif',1000),before:{coachId:coach.id,active:coach.active},after:{active:v.active},at:new Date().toISOString()});
            }
            else if(v.action==='retryMail'){
              const row=(await store.sql.prepare('SELECT id,status,expires FROM outbox WHERE id=?').get(string(v.id,'Notification')));
              if(cfg.mailMode!=='brevo'||!row||!['failed','uncertain'].includes(row.status)||row.expires&&row.expires<Date.now()||v.verified!==true)throw A.fail('Vérifiez la configuration et l’absence d’envoi dans Brevo avant la reprise.');
              const reason=string(v.reason,'Motif de reprise',1000);(await store.sql.prepare("UPDATE outbox SET status='pending',attempts=0,next_at=0,last_error=NULL WHERE id=?").run(row.id));
              db.audit.unshift({id:randomUUID(),adminId:id,action:'Reprise manuelle de notification',reason,before:{mailId:row.id,status:row.status},after:{status:'pending'},at:new Date().toISOString()});
            }
            else if(v.action==='logExport'){period(v.period);if(!['CSV','Excel XLSX','Impression / PDF'].includes(v.format))throw A.fail('Format invalide.');const list=BC.targets.flatMap(t=>BC.courses(db,t.id,v.period)).filter(c=>db.assignments[c.id]?.status==='validated'&&(!v.target||v.target==='all'||c.target===v.target));db.exportLog.unshift({format:v.format,period:v.period,count:list.length,adminId:id,at:new Date().toISOString()})}
            else throw A.fail('Action inconnue.');
          }
          for(const declaration of db.declarations)if(!declaration.coachSnapshot){const owner=db.users.find(u=>u.id===declaration.coachId);if(owner)declaration.coachSnapshot={...owner};}
          (await store.save(db));
        }));
        needsMail=['validate','retryMail'].includes(v.action);
        return json(res,{...(await snapshot(me.id,s.csrf)),result});
      }
      if(!['GET','HEAD'].includes(req.method))throw A.fail('Introuvable.',404);
      let requested;try{requested=decodeURIComponent(route).slice(1)||'index.html'}catch{throw A.fail('URL invalide.',400)}
      if(!files.has(requested)&&!/^assets\/[a-zA-Z0-9_.-]+\.(png|jpe?g|webp)$/.test(requested))throw A.fail('Introuvable.',404);
      const file=path.join(cfg.root,requested),stat=await fs.promises.stat(file).catch(()=>null);if(!stat?.isFile())throw A.fail('Introuvable.',404);
      res.writeHead(200,{'Content-Type':mime[path.extname(file)],'Content-Length':stat.size});if(req.method==='HEAD')return res.end();fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);
    }catch(e){
      const expected=e.status||(!e.code&&e.constructor===Error&&!e.stack?.includes('JSON.parse'));
      if(!res.headersSent)json(res,{error:expected?e.message:'Une erreur interne est survenue. Réessayez.'},e.status|| (expected?409:500));else res.destroy();
      if(!expected)console.error('Erreur serveur',e.code||e.name); // No request bodies, passwords or provider keys in logs.
    }finally{
      if(needsMail&&defer&&cfg.mailMode==='brevo')defer(drain(store,cfg,fetcher,{limit:2}).catch(e=>console.error('File mail indisponible',e.code||e.name)));
    }
  };
  const handler=(req,res)=>store.request(()=>handleRequest(req,res));
  const server=http.createServer(handler);
  server.requestTimeout=30000;server.headersTimeout=10000;server.maxHeadersCount=50;
  let processing=false;
  const worker=background?setInterval(async()=>{if(processing)return;processing=true;try{await dispatch(store,cfg,fetcher)}catch(e){console.error('File mail indisponible',e.code||e.name)}finally{processing=false}},3000):null;worker?.unref();
  const cleanupTimer=background?setInterval(()=>cleanup(store).catch(e=>console.error('Nettoyage indisponible',e.code||e.name)),60000):null;cleanupTimer?.unref();
  server.on('close',()=>{clearInterval(worker);clearInterval(cleanupTimer)});
  return{server,handler,store,snapshot};
}
module.exports={createApp,today,filtered};
