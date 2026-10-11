'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const BC=require('../model.js');
const {config}=require('../server/config.cjs');
const {Store}=require('../server/store.cjs');
const {createApp}=require('../server/app.cjs');
const A=require('../server/auth.cjs');
const M=require('../server/mail.cjs');
const {backup}=require('../scripts/backup.cjs');
const {restore}=require('../scripts/restore.cjs');
const profile=(email)=>({firstName:'Recette',lastName:'Coach',company:'Test uniquement',phone:'0600000000',email,password:'Recette-Boxing-2026!',confirmation:'Recette-Boxing-2026!'});
async function fixture(t,mode='disabled'){
  const store=new Store(':memory:'),cfg={root:path.resolve(__dirname,'..'),origin:'http://127.0.0.1',production:false,mailMode:mode,direction:'boxingcenter31@gmail.com',apiKey:'test-private-key',sender:'sender@example.test',senderName:'Boxing Center',replyTo:'reply@example.test'};
  const app=createApp(cfg,{store,fetcher:async()=>new Response(JSON.stringify({messageId:'mock'}),{status:201})});
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));cfg.origin='http://127.0.0.1:'+app.server.address().port;
  t.after(async()=>{await new Promise(resolve=>app.server.close(resolve));store.close()});
  async function client(){let cookie='',csrf='';return{get:async route=>request(route),post:async(route,data,headers)=>request(route,data,headers),cookie:()=>cookie,csrf:()=>csrf};
    async function request(route,data,extra={}){const r=await fetch(cfg.origin+'/api/'+route,{method:data?'POST':'GET',headers:{Cookie:cookie,...(data?{'Content-Type':'application/json',Origin:cfg.origin,'X-CSRF-Token':csrf}:{}),...extra},body:data?JSON.stringify(data):undefined});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const body=await r.json();if(body.csrf)csrf=body.csrf;return{status:r.status,body,headers:r.headers}}
  }
  async function coach(email){const c=await client();await c.get('session');assert.equal((await c.post('register',profile(email))).status,201);assert.equal((await c.post('login',{email,password:profile(email).password,role:'coach'})).status,200);return c}
  async function admin(){await A.createUser(store,profile('admin@example.test'),'admin');const c=await client();await c.get('session');await c.post('login',{email:'admin@example.test',password:profile('').password,role:'admin'});return c}
  return{...app,cfg,client,coach,admin};
}
const selectable=db=>BC.courses(db,'minimes','2026-09').find(c=>c.selectable);
test('API : inscription complète, hachage serveur et aucune élévation de rôle',async t=>{
  const f=await fixture(t),c=await f.client();await c.get('session');assert.equal((await c.post('register',{...profile('new@example.test'),role:'admin'})).status,201);
  const u=f.store.sql.prepare('SELECT * FROM users').get();assert.equal(u.role,'coach');assert.match(u.password,/^scrypt:/);assert.ok(!u.password.includes('Recette-Boxing'));
  assert.equal((await c.post('register',profile('new@example.test'))).status,400);
  assert.equal((await c.post('login',{email:u.email,password:'incorrect',role:'coach'})).status,401);
  const login=await c.post('login',{email:u.email,password:profile('').password,role:'coach'});assert.equal(login.status,200);assert.match(login.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);assert.ok(!JSON.stringify(login.body).includes(u.password));
});
test('API : origine, CSRF, permissions et fichiers privés refusés',async t=>{
  const f=await fixture(t),c=await f.coach('secure@example.test');
  assert.equal((await c.post('action',{action:'delete',id:'x',reason:'x'},{Origin:'https://evil.test'})).status,403);
  assert.equal((await c.post('action',{action:'delete',id:'x',reason:'x'},{'X-CSRF-Token':'invalid'})).status,403);
  assert.equal((await c.post('action',{action:'edit',values:{}})).status,403);
  for(const file of ['.env','server/app.cjs','data/boxing-center.sqlite','app.js','package.json'])assert.equal((await fetch(f.cfg.origin+'/'+file)).status,404);
  const r=await fetch(f.cfg.origin+'/');assert.match(r.headers.get('content-security-policy'),/frame-ancestors 'none'/);
});
test('API : deux coachs concurrents, une seule réservation et données privées isolées',async t=>{
  const f=await fixture(t),a=await f.coach('a@example.test'),b=await f.coach('b@example.test'),id=selectable(f.store.load()).id;
  for(const c of [a,b])assert.equal((await c.post('action',{action:'toggle',id,period:'2026-09'})).status,200);
  const results=await Promise.all([a,b].map(c=>c.post('action',{action:'addClub',target:'minimes',period:'2026-09'})));assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  assert.equal(f.store.sql.prepare('SELECT count(*) AS n FROM assignments').get().n,1);
  const winner=results[0].status===200?a:b,other=winner===a?b:a;
  const final=await winner.post('action',{action:'validate',period:'2026-09'});assert.equal(final.status,200);assert.equal(final.body.result.items.length,1);
  const own=(await other.get('state')).body;assert.equal(own.db.declarations.length,0);assert.equal(own.db.baskets[final.body.userId+':2026-09'],undefined);assert.ok(!JSON.stringify(own).includes(winner===a?'a@example.test':'b@example.test'));
  assert.equal((await winner.post('action',{action:'removeBasket',id,period:'2026-09'})).status,409);
  assert.equal((await winner.post('action',{action:'validate',period:'2026-09'})).status,409);
});
test('API : date serveur, créneaux fabriqués, accès libre, panier vide',async t=>{
  const f=await fixture(t),c=await f.coach('rules@example.test'),db=f.store.load(),course=selectable(db),free=BC.courses(db,'minimes','2026-09').find(c=>!c.selectable);
  for(const [id,period] of [[course.id,'2099-01'],[course.id.split('@')[0]+'@2026-09-06','2026-09'],[free.id,'2026-09']])assert.equal((await c.post('action',{action:'toggle',id,period})).status,409);
  assert.equal((await c.post('action',{action:'validate',period:'2026-09'})).status,409);
});
test('API : CRUD direction, répétition, réattribution et journal immuable',async t=>{
  const f=await fixture(t),coach=await f.coach('coach@example.test'),coachId=(await coach.get('state')).body.userId,admin=await f.admin();
  const values={target:'ramonville',date:'2026-09-07',name:'Cours de recette',discipline:'Boxe',start:'18:00',end:'19:00',category:'anglaise',color:'#3769ad',selectable:true,scope:'weekly',repeatUntil:'2026-09-14'};
  const r=await admin.post('action',{action:'edit',values,reason:'Test de répétition'});assert.equal(r.status,200);const id=r.body.result.id;assert.equal(BC.courses(f.store.load(),'ramonville','2026-09').filter(c=>c.name==='Cours de recette').length,2);
  assert.equal((await admin.post('action',{action:'assign',id,coachId,reason:'Attribution vérifiée'})).status,200);
  assert.equal((await admin.post('action',{action:'edit',id,values:{...values,start:'99:00',scope:'single'},reason:'Test invalide'})).status,409);
  assert.equal((await admin.post('action',{action:'delete',id,reason:'Suppression de recette'})).status,200);
  assert.equal(BC.getCourse(f.store.load(),id),null);assert.equal(f.store.load().audit.length,4);
  assert.throws(()=>f.store.sql.exec("DELETE FROM audit"),/Journal immuable/);
});
test('API : profil, changement e-mail protégé et révocation de sessions',async t=>{
  const f=await fixture(t),a=await f.coach('password@example.test'),b=await f.client();await b.get('session');await b.post('login',{email:'password@example.test',password:profile('').password,role:'coach'});
  assert.equal((await a.post('profile',{...profile('changed@example.test')})).status,400);
  assert.equal((await a.post('profile',{...profile('changed@example.test'),currentPassword:profile('').password})).status,200);
  f.cfg.mailMode='brevo';await a.post('reset/request',{email:'changed@example.test'});
  assert.equal((await a.post('password',{currentPassword:profile('').password,newPassword:'Autre-Recette-2026!',confirmation:'Autre-Recette-2026!'})).status,200);
  const cancelled=f.store.sql.prepare('SELECT status,payload FROM outbox WHERE decl_id IS NULL').get();assert.equal(cancelled.status,'cancelled');assert.equal(cancelled.payload,'{}');
  assert.equal((await b.get('state')).status,401);assert.equal((await a.get('state')).status,200);
  await a.post('logout',{});assert.equal((await a.get('state')).status,401);
});
test('API : reset sans divulgation, lien expirant, usage unique',async t=>{
  const f=await fixture(t,'brevo'),c=await f.coach('reset@example.test');
  const known=await c.post('reset/request',{email:'reset@example.test'}),unknown=await c.post('reset/request',{email:'unknown@example.test'});assert.deepEqual(known.body,unknown.body);
  const out=f.store.sql.prepare('SELECT payload FROM outbox WHERE decl_id IS NULL').get();const token=JSON.parse(out.payload).textContent.match(/#reset\/([\w-]+)/)[1];
  await c.post('reset/request',{email:'reset@example.test'});
  assert.equal((await c.post('reset/confirm',{token,password:'Reset-Recette-2026!',confirmation:'Reset-Recette-2026!'})).status,400);
  const last=f.store.sql.prepare('SELECT payload FROM outbox WHERE decl_id IS NULL ORDER BY rowid DESC LIMIT 1').get();const fresh=JSON.parse(last.payload).textContent.match(/#reset\/([\w-]+)/)[1];
  f.store.sql.exec('UPDATE resets SET expires=0');
  assert.equal((await c.post('reset/confirm',{token:fresh,password:'Reset-Recette-2026!',confirmation:'Reset-Recette-2026!'})).status,400);
  await c.post('reset/request',{email:'reset@example.test'});
  const valid=f.store.sql.prepare('SELECT payload FROM outbox WHERE decl_id IS NULL ORDER BY rowid DESC LIMIT 1').get();
  const data={token:JSON.parse(valid.payload).textContent.match(/#reset\/([\w-]+)/)[1],password:'Reset-Recette-2026!',confirmation:'Reset-Recette-2026!'};
  assert.equal((await c.post('reset/confirm',data)).status,200);await c.get('session');assert.equal((await c.post('reset/confirm',data)).status,400);assert.equal((await c.get('state')).status,401);
});
test('Brevo : récapitulatif complet, double destinataire, clé serveur, acceptation',async t=>{
  const store=new Store(':memory:');t.after(()=>store.close());const id=await A.createUser(store,profile('mail@example.test'));
  const d={id:'d',period:'2026-09',items:[{...BC.templates.find(c=>c.selectable),date:'2026-09-07'}],validatedAt:new Date().toISOString()};
  const cfg={mailMode:'brevo',direction:'boxingcenter31@gmail.com',apiKey:'private',sender:'verified@example.test',senderName:'Boxing Center',replyTo:'boxingcenter31@gmail.com'};
  store.transaction(()=>M.queueDeclaration(store,d,{...profile('mail@example.test'),id},cfg));assert.equal(store.sql.prepare('SELECT count(*) AS n FROM outbox').get().n,2);
  await M.dispatch(store,cfg,async(url,options)=>{assert.equal(url,'https://api.brevo.com/v3/smtp/email');assert.equal(options.headers['api-key'],'private');const body=JSON.parse(options.body);assert.match(body.textContent,/Société \/ association/);assert.match(body.textContent,/TOTAL GLOBAL/);assert.match(body.textContent,/Total espace/);return new Response(JSON.stringify({messageId:'accepted-id'}),{status:201})});
  assert.equal(store.sql.prepare("SELECT count(*) AS n FROM outbox WHERE status='accepted'").get().n,1);
});
test('Brevo : erreurs explicites, délai et absence de duplication après timeout',async t=>{
  const f=await fixture(t,'brevo'),id=await A.createUser(f.store,profile('queue@example.test')),cfg=f.cfg;
  f.store.queue('timeout',null,id,'queue@example.test',M.message('Test','Test'));await M.dispatch(f.store,cfg,async()=>{throw Error('timeout')});assert.equal(f.store.sql.prepare('SELECT status FROM outbox').get().status,'uncertain');
  let calls=0;await M.dispatch(f.store,cfg,async()=>{calls++;});assert.equal(calls,0);
  f.store.queue('rate',null,id,'queue@example.test',M.message('Test','Test'));await M.dispatch(f.store,cfg,async()=>new Response('',{status:429}));assert.equal(f.store.sql.prepare("SELECT status FROM outbox WHERE id='rate'").get().status,'retry');
});
test('SQLite : persistance, sauvegarde cohérente et restauration vérifiée',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'boxing-qa-')),file=path.join(directory,'source.sqlite');let store=new Store(file);await A.createUser(store,profile('persist@example.test'));store.close();store=new Store(file);assert.equal(store.profiles().length,1);
  const copy=backup(file,path.join(directory,'backups')),destination=path.join(directory,'restored.sqlite');restore(copy,destination);assert.throws(()=>restore(copy,destination),/aucun fichier écrasé/);const restored=new Store(destination);assert.equal(restored.profiles()[0].email,'persist@example.test');restored.close();store.close();
});
test('Production : refus du HTTP et de la configuration e-mail absente',()=>{
  assert.throws(()=>config({NODE_ENV:'production',APP_ORIGIN:'http://localhost:4173'},{readLocal:false}),/HTTPS/);
  assert.throws(()=>config({NODE_ENV:'production',APP_ORIGIN:'https://coachs.example.test',MAIL_MODE:'disabled'},{readLocal:false}),/BREVO/);
  assert.throws(()=>config({NODE_ENV:'production',APP_ORIGIN:'https://coachs.example.test',BREVO_KEY_EXPOSED:'true'},{readLocal:false}),/clé Brevo exposée/);
});
test('Comptes : activation direction obligatoire, suspension révoque les sessions',async t=>{
  const f=await fixture(t);f.cfg.requireApproval=true;const c=await f.client();await c.get('session');const p=profile('pending@example.test');const r=await c.post('register',p);assert.match(r.body.message,/activer/);
  assert.equal((await c.post('login',{email:p.email,password:p.password,role:'coach'})).status,401);
  const admin=await f.admin(),id=f.store.sql.prepare('SELECT id FROM users WHERE email=?').get(p.email).id;
  assert.equal((await admin.post('action',{action:'accountStatus',id,active:true,reason:'Coach identifié'})).status,200);
  assert.equal((await c.post('login',{email:p.email,password:p.password,role:'coach'})).status,200);
  assert.equal((await admin.post('action',{action:'accountStatus',id,active:false,reason:'Accès suspendu'})).status,200);
  assert.equal((await c.get('state')).status,401);assert.equal(f.store.load().audit.length,2);
});
test('Sessions : expiration, limitation des tentatives et cookie Secure',async t=>{
  const f=await fixture(t),c=await f.coach('sessions@example.test');f.cfg.production=true;
  const login=await c.post('login',{email:'sessions@example.test',password:profile('').password,role:'coach'});assert.match(login.headers.get('set-cookie'),/; Secure/);
  f.store.sql.exec('UPDATE sessions SET expires=0');assert.equal((await c.get('state')).status,401);await c.get('session');
  f.store.sql.prepare('INSERT OR REPLACE INTO limits VALUES(?,10,?)').run('login:127.0.0.1',Date.now()+900000);
  assert.equal((await c.post('login',{email:'sessions@example.test',password:'wrong',role:'coach'})).status,429);
});
test('Notifications : reprise contrôlée direction, aucun secret ou lien reset exposé',async t=>{
  const f=await fixture(t,'brevo'),c=await f.coach('mail-status@example.test'),admin=await f.admin(),id=(await c.get('state')).body.userId;
  f.store.queue('mail-status',null,id,'mail-status@example.test',M.message('Test','Lien privé non exposé'));
  f.store.sql.exec("UPDATE outbox SET status='uncertain' WHERE id='mail-status'");
  assert.equal((await c.post('action',{action:'retryMail',id:'mail-status',verified:true,reason:'Test'})).status,403);
  assert.equal((await admin.post('action',{action:'retryMail',id:'mail-status',verified:false,reason:'Test'})).status,400);
  assert.equal((await admin.post('action',{action:'retryMail',id:'mail-status',verified:true,reason:'Absence contrôlée dans Brevo'})).status,200);
  const snapshot=(await admin.get('state')).body;assert.ok(snapshot.db.mailQueue.some(x=>x.id==='mail-status'));assert.ok(!JSON.stringify(snapshot).includes('Lien privé non exposé'));
  assert.equal((await c.get('state')).body.db.mailQueue,undefined);
});
