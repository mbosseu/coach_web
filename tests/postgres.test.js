'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const BC=require('../model.js');
const A=require('../server/auth.cjs');
const M=require('../server/mail.cjs');
const {createApp}=require('../server/app.cjs');
const {pgFixture}=require('./pg-fixture.cjs');
const {poolOptions}=require('../server/postgres.cjs');
const {vercelHandler}=require('../api/index.js');
const profile=email=>({firstName:'Recette',lastName:'Postgres',company:'Tests uniquement',phone:'0600000000',email,password:'Recette-Postgres-2026!',confirmation:'Recette-Postgres-2026!'});
async function listen(t,handler,cfg){const server=http.createServer(handler);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));cfg.origin='http://127.0.0.1:'+server.address().port;t.after(()=>new Promise(resolve=>server.close(resolve)));return server}
function client(cfg){let cookie='',csrf='';return{async request(route,data,extra={}){const response=await fetch(cfg.origin+'/api/'+route,{method:data?'POST':'GET',headers:{Cookie:cookie,...(data?{'Content-Type':'application/json',Origin:cfg.origin,'X-CSRF-Token':csrf}:{}),...extra},body:data?JSON.stringify(data):undefined});if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];const body=await response.json();if(body.csrf)csrf=body.csrf;return{status:response.status,body}}}}
test('PostgreSQL : deux instances Vercel, réservation atomique, confidentialité, durabilité',async t=>{
  const fixture=await pgFixture();t.after(()=>fixture.close());const cfg={root:path.resolve(__dirname,'..'),origin:'http://127.0.0.1',serverless:true,production:false,mailMode:'disabled',direction:'boxingcenter31@gmail.com'};
  const first=createApp(cfg,{store:fixture.store,background:false}),second=createApp(cfg,{store:fixture.makeStore(),background:false});
  let turn=0;await listen(t,(req,res)=>(++turn%2?first:second).handler(req,res),cfg);
  const a=client(cfg),b=client(cfg);for(const [c,email]of [[a,'pg-a@example.test'],[b,'pg-b@example.test']]){await c.request('session');assert.equal((await c.request('register',profile(email))).status,201);assert.equal((await c.request('login',{email,password:profile(email).password,role:'coach'})).status,200)}
  const id=BC.courses(await fixture.store.load(),'minimes','2026-09').find(c=>c.selectable).id;
  for(const c of [a,b])assert.equal((await c.request('action',{action:'toggle',id,period:'2026-09'})).status,200);
  const results=await Promise.all([a,b].map(c=>c.request('action',{action:'addClub',target:'minimes',period:'2026-09'})));assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  const winner=results[0].status===200?a:b,other=winner===a?b:a;
  const final=await winner.request('action',{action:'validate',period:'2026-09'});assert.equal(final.status,200);assert.equal(final.body.result.items.length,1);
  assert.equal((await other.request('state')).body.db.declarations.length,0);assert.equal((await winner.request('action',{action:'validate',period:'2026-09'})).status,409);
  assert.equal((await fixture.makeStore().load()).declarations.length,1);
  await assert.rejects(fixture.store.query('DELETE FROM boxing_center.audit'),/Journal immuable/);
  await assert.rejects(fixture.store.query('TRUNCATE boxing_center.audit'),/Journal immuable/);
});
test('PostgreSQL : annulation atomique, rôles privés, aucune table exposée au navigateur',async t=>{
  const f=await pgFixture();t.after(()=>f.close());const id=await A.createUser(f.store,profile('rollback@example.test'));
  await assert.rejects(f.store.transaction(async()=>{await f.store.sql.prepare('UPDATE users SET active=0 WHERE id=?').run(id);throw Error('annulation')}),/annulation/);
  assert.equal((await f.store.profiles())[0].active,true);
  const tables=await f.database.query("SELECT relname,relrowsecurity FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid WHERE n.nspname='boxing_center' AND c.relkind='r'");assert.equal(tables.rows.length,10);assert.ok(tables.rows.every(r=>r.relrowsecurity));
  const acl=(await f.database.query("SELECT nspacl::text AS acl FROM pg_namespace WHERE nspname='boxing_center'")).rows[0].acl;assert.ok(!acl.includes('=U/'));
});
test('PostgreSQL : deux workers, une prise par notification et reprise ambiguë sans duplication',async t=>{
  const f=await pgFixture();t.after(()=>f.close());const id=await A.createUser(f.store,profile('pg-mail@example.test'));
  await f.store.queue('once',null,id,'pg-mail@example.test',M.message('Recette','Pas d’envoi réel'));
  const cfg={mailMode:'brevo',apiKey:'mock',sender:'sender@example.test',senderName:'Recette',replyTo:'reply@example.test'};let calls=0;
  const fetcher=async()=>{calls++;return new Response(JSON.stringify({messageId:'mock'}),{status:201})};await Promise.all([M.dispatch(f.store,cfg,fetcher),M.dispatch(f.makeStore(),cfg,fetcher)]);assert.equal(calls,1);
  await f.store.queue('interrupted',null,id,'pg-mail@example.test',M.message('Recette','Pas d’envoi réel'));await f.store.sql.prepare("UPDATE outbox SET status='sending',sending_at=? WHERE id=?").run(Date.now()-120000,'interrupted');await M.dispatch(f.makeStore(),cfg,fetcher);assert.equal(calls,1);assert.equal((await f.store.sql.prepare('SELECT status FROM outbox WHERE id=?').get('interrupted')).status,'uncertain');
});
test('Vercel : route API réécrite, corps JSON préparsé et cron protégé',async t=>{
  const f=await pgFixture();t.after(()=>f.close());const cfg={root:path.resolve(__dirname,'..'),origin:'http://127.0.0.1',serverless:true,production:false,mailMode:'disabled',cronSecret:'secret-de-recette-uniquement-32-caracteres',direction:'boxingcenter31@gmail.com'};
  const handler=vercelHandler({cfg,store:f.store,defer:()=>{throw Error('Pas de mail réel')}});
  await listen(t,async(req,res)=>{const url=new URL(req.url,cfg.origin);req.query=Object.fromEntries(url.searchParams);if(req.method==='POST'){const chunks=[];for await(const c of req)chunks.push(c);req.body=JSON.parse(Buffer.concat(chunks).toString('utf8'))}return handler(req,res)},cfg);
  const c=client(cfg);const session=await c.request('index?bc_route=session');assert.equal(session.status,200);assert.equal((await c.request('index?bc_route=register',profile('vercel@example.test'))).status,201);
  assert.equal((await c.request('index?bc_route=cron/mail')).status,401);assert.equal((await c.request('index?bc_route=cron/mail',undefined,{Authorization:'Bearer '+cfg.cronSecret})).status,200);
});
test('Vercel : pool limité, TLS vérifié et sortie statique en liste blanche',()=>{
  const options=poolOptions({databaseUrl:'postgresql://user:password@example.test:6543/postgres?sslmode=require'});assert.equal(options.max,2);assert.equal(options.ssl.rejectUnauthorized,true);assert.ok(!options.connectionString.includes('sslmode'));
  const config=JSON.parse(fs.readFileSync(path.join(__dirname,'..','vercel.json'),'utf8'));assert.equal(config.outputDirectory,'public');assert.equal(config.functions['api/index.js'].maxDuration,60);assert.equal(config.rewrites[0].source,'/api/:path*');
});

test('PostgreSQL : activation, profil, récupération, révocation et CRUD direction',async t=>{
  const f=await pgFixture();t.after(()=>f.close());
  const cfg={root:path.resolve(__dirname,'..'),origin:'http://127.0.0.1',production:false,serverless:true,mailMode:'disabled',requireApproval:true,direction:'boxingcenter31@gmail.com'};
  const app=createApp(cfg,{store:f.store,background:false});await listen(t,app.handler,cfg);
  await A.createUser(f.store,profile('pg-admin@example.test'),'admin');
  const admin=client(cfg);await admin.request('session');assert.equal((await admin.request('login',{email:'pg-admin@example.test',password:profile('').password,role:'admin'})).status,200);
  const coach=client(cfg),p=profile('pg-pending@example.test');await coach.request('session');assert.equal((await coach.request('register',p)).status,201);
  assert.equal((await coach.request('login',{email:p.email,password:p.password,role:'coach'})).status,401);
  const id=(await f.store.sql.prepare('SELECT id FROM users WHERE email=?').get(p.email)).id;
  assert.equal((await admin.request('action',{action:'accountStatus',id,active:true,reason:'Compte identifié'})).status,200);
  assert.equal((await coach.request('login',{email:p.email,password:p.password,role:'coach'})).status,200);
  assert.equal((await coach.request('action',{action:'delete',id:'invalid',reason:'Test permission'})).status,403);
  assert.equal((await coach.request('profile',{...p,email:'pg-updated@example.test'})).status,400);
  assert.equal((await coach.request('profile',{...p,email:'pg-updated@example.test',currentPassword:p.password})).status,200);
  cfg.mailMode='brevo';
  await coach.request('reset/request',{email:'pg-updated@example.test'});
  const queued=await f.store.sql.prepare('SELECT payload FROM outbox WHERE decl_id IS NULL ORDER BY rowid DESC LIMIT 1').get();
  const token=JSON.parse(queued.payload).textContent.match(/#reset\/([\w-]+)/)[1];
  const reset={token,password:'Postgres-Reset-2026!',confirmation:'Postgres-Reset-2026!'};
  assert.equal((await coach.request('reset/confirm',reset)).status,200);assert.equal((await coach.request('state')).status,401);
  await coach.request('session');assert.equal((await coach.request('reset/confirm',reset)).status,400);
  assert.equal((await coach.request('login',{email:'pg-updated@example.test',password:reset.password,role:'coach'})).status,200);
  cfg.mailMode='disabled';
  const values={target:'ramonville',date:'2026-09-07',name:'Cours de recette PostgreSQL',discipline:'Boxe',start:'18:00',end:'19:00',category:'anglaise',color:'#3769ad',selectable:true,scope:'weekly',repeatUntil:'2026-09-14'};
  const added=await admin.request('action',{action:'edit',values,reason:'Test hebdomadaire'});assert.equal(added.status,200);
  assert.equal(BC.courses(await f.store.load(),'ramonville','2026-09').filter(c=>c.name===values.name).length,2);
  assert.equal((await admin.request('action',{action:'assign',id:added.body.result.id,coachId:id,reason:'Attribution'})).status,200);
  assert.equal((await admin.request('action',{action:'delete',id:added.body.result.id,reason:'Suppression'})).status,200);
  assert.equal(BC.getCourse(await f.store.load(),added.body.result.id),null);
  assert.equal((await admin.request('action',{action:'accountStatus',id,active:false,reason:'Accès suspendu'})).status,200);
  assert.equal((await coach.request('state')).status,401);
  assert.ok((await f.store.load()).audit.length>=5);
});

test('Récupération : compte en attente, sans activation implicite ni fausse promesse d’envoi',async t=>{
  const f=await pgFixture();t.after(()=>f.close());
  const cfg={root:path.resolve(__dirname,'..'),origin:'http://127.0.0.1',production:false,serverless:true,mailMode:'brevo',requireApproval:true,direction:'direction@example.test'};
  const app=createApp(cfg,{store:f.store,background:false});await listen(t,app.handler,cfg);
  const c=client(cfg),p=profile('pending-reset@example.test');await c.request('session');
  assert.equal((await c.request('register',p)).status,201);
  const pending=await c.request('login',{email:p.email,password:p.password,role:'coach'});
  assert.equal(pending.status,401);assert.match(pending.body.error,/identifiants sont corrects.*direction/);
  const incorrect=await c.request('login',{email:p.email,password:'Mot-de-passe-incorrect',role:'coach'});
  assert.equal(incorrect.body.error,'Adresse e-mail ou mot de passe incorrect.');
  const known=await c.request('reset/request',{email:p.email});
  const unknown=await c.request('reset/request',{email:'unknown@example.test'});
  assert.equal(known.status,202);assert.deepEqual(known.body,unknown.body);
  const row=await f.store.sql.prepare('SELECT payload FROM outbox WHERE decl_id IS NULL').get();
  const token=JSON.parse(row.payload).textContent.match(/#reset\/([\w-]+)/)[1];
  const password='Recuperation-En-Attente-2026!';
  assert.equal((await c.request('reset/confirm',{token,password,confirmation:password})).status,200);
  assert.equal((await f.store.sql.prepare('SELECT active FROM users WHERE email=?').get(p.email)).active,0);
  await c.request('session');
  const afterReset=await c.request('login',{email:p.email,password,role:'coach'});
  assert.equal(afterReset.status,401);assert.match(afterReset.body.error,/compte n’est pas actif/);
  cfg.mailMode='disabled';
  const unavailable=await c.request('reset/request',{email:p.email});
  assert.equal(unavailable.status,503);assert.match(unavailable.body.error,/aucune demande d’envoi/);
});
