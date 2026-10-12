'use strict';
/** Isolated functional audit against qa-server on :4180 — fictional accounts only. */
const origin='http://127.0.0.1:4180';
const PASS='Recette-Boxing-2026!';
async function client(){
  let cookie='',csrf='';
  function absorb(r){
    const jar=new Map(cookie?cookie.split('; ').map(p=>{const i=p.indexOf('=');return[p.slice(0,i),p]}):[]);
    for(const raw of(r.headers.getSetCookie?.()||[])){const part=raw.split(';')[0];jar.set(part.split('=')[0],part)}
    if(!r.headers.getSetCookie&&r.headers.get('set-cookie')){const part=r.headers.get('set-cookie').split(';')[0];jar.set(part.split('=')[0],part)}
    cookie=[...jar.values()].join('; ');
  }
  async function req(route,data,extra={}){
    const r=await fetch(origin+'/api/'+route,{method:data?'POST':'GET',headers:{Cookie:cookie,...(data?{'Content-Type':'application/json',Origin:origin,'X-CSRF-Token':csrf}:{}),...extra},body:data?JSON.stringify(data):undefined});
    absorb(r);const body=await r.json();if(body.csrf)csrf=body.csrf;return{status:r.status,body,headers:r.headers};
  }
  return{get:r=>req(r),post:(r,d,h)=>req(r,d,h),cookie:()=>cookie,csrf:()=>csrf};
}
const results=[];
function ok(name,pass,detail=''){results.push({name,pass:!!pass,detail});console.log((pass?'OK ':'FAIL ')+name+(detail?' — '+detail:''))}
(async()=>{
  // 1. Session + CSRF
  const guest=await client();const s=await guest.get('session');
  ok('GET /api/session',s.status===200&&s.body.csrf&&s.body.userId===null);

  // 2. Register new coach (fictional)
  const email='audit.'+Date.now()+'@recette.example.test';
  const reg=await guest.post('register',{firstName:'Audit',lastName:'Coach',company:'Recette Audit',phone:'0612345678',email,password:PASS,confirmation:PASS,role:'admin'});
  ok('Inscription coach (rôle admin ignoré)',reg.status===201);

  // 3. Login before activation — qa-server creates active coaches by default for seed accounts; new register with requireApproval from createApp cfg?
  // qa cfg has no requireApproval — createApp uses cfg.requireApproval which defaults undefined → config not used; app uses cfg.requireApproval from createApp({requireApproval})
  // Looking at qa-server: cfg={...,mailMode:'disabled'} without requireApproval — createApp uses cfg.requireApproval which is undefined → falsy → active on register
  const loginCoach=await guest.post('login',{email,password:PASS,role:'coach'});
  ok('Connexion coach actif',loginCoach.status===200&&loginCoach.body.userId);

  // 4. Wrong role
  const g2=await client();await g2.get('session');
  const wrong=await g2.post('login',{email,password:PASS,role:'admin'});
  ok('Refus coach en mode direction',wrong.status===401);

  // 5. Bad password
  const g3=await client();await g3.get('session');
  const bad=await g3.post('login',{email,password:'Wrong-Password-999!',role:'coach'});
  ok('Refus mauvais mot de passe',bad.status===401);

  // 6. Admin login
  const admin=await client();await admin.get('session');
  const al=await admin.post('login',{email:'direction@recette.example.test',password:PASS,role:'admin'});
  ok('Connexion direction',al.status===200&&al.body.db?.users?.some(u=>u.role==='admin'));

  // 7. Coach private data isolation — seed coach
  // Use second coach: first seed coach may already have a finalized September declaration.
  const c1=await client();await c1.get('session');
  const c1login=await c1.post('login',{email:'second@recette.example.test',password:PASS,role:'coach'});
  ok('Login seed coach',c1login.status===200,c1login.body.error||c1login.body.userId||'');
  const st=await c1.get('state');
  ok('État coach chargé',st.status===200&&!!st.body.userId,st.body.error||'');
  const period='2026-09';
  const BC=require('../model.js');
  const taken=st.body.db?.assignments||{};
  let course=null,t1=null;
  for(const c of BC.courses(BC.createDB(),'minimes',period).filter(x=>x.selectable&&!taken[x.id])){
    t1=await c1.post('action',{action:'toggle',id:c.id,period});
    if(t1.status===200){course=c;break}
  }
  ok('Créneau libre trouvé',Boolean(course),course?.id||t1?.body?.error||'');
  ok('Sélection cours septembre',Boolean(course)&&t1.status===200,t1?.body?.error||'');
  const add=course?await c1.post('action',{action:'addClub',target:'minimes',period}):{status:0,body:{}};
  ok('Ajout panier club',add.status===200,add.body.error||'');

  // 8. Concurrent other coach
  const c2=await client();await c2.get('session');await c2.post('login',{email:'coach@recette.example.test',password:PASS,role:'coach'});
  const t2=course?await c2.post('action',{action:'toggle',id:course.id,period}):{status:0};
  ok('Second coach ne peut pas prendre le cours réservé',t2.status!==200,String(t2.status));

  // 9. Current month blocked
  const oct=BC.courses(BC.createDB(),'minimes','2026-10').find(c=>c.selectable);
  const tOct=await c1.post('action',{action:'toggle',id:oct.id,period:'2026-10'});
  ok('Mois courant non déclarable',tOct.status!==200,String(tOct.status));

  // 10. Validate definitive
  const conf=await c1.post('action',{action:'validate',period});
  ok('Validation définitive',conf.status===200&&conf.body.result?.items?.length>=1,conf.body.error||'');

  // 11. Coach cannot edit after validate
  const rem=course?await c1.post('action',{action:'removeBasket',id:course.id,period}):{status:0};
  ok('Coach ne peut plus retirer après validation',rem.status!==200);

  // 12. Admin assign / edit
  const course2=BC.courses(BC.createDB(),'ramonville',period).find(c=>c.selectable);
  const edit=await admin.post('action',{action:'edit',values:{target:'ramonville',date:'2026-09-07',name:'Cours audit',discipline:'Boxe',start:'18:00',end:'19:00',category:'anglaise',color:'#3769ad',selectable:true,scope:'single'},reason:'Audit CDC'});
  ok('Admin crée un créneau',edit.status===200&&edit.body.result?.id);
  const newId=edit.body.result?.id;
  const coachId=st.body.userId;
  const asg=await admin.post('action',{action:'assign',id:newId,coachId,reason:'Attribution audit'});
  ok('Admin attribue un cours',asg.status===200);

  // 13. CSRF / origin
  const csrfFail=await c1.post('action',{action:'toggle',id:course2.id,period},{'X-CSRF-Token':'invalid'});
  ok('CSRF invalide refusé',csrfFail.status===403);
  const originFail=await c1.post('action',{action:'toggle',id:course2.id,period},{Origin:'https://evil.test'});
  ok('Origine étrangère refusée',originFail.status===403);

  // 14. Private files
  const priv=await fetch(origin+'/.env');
  ok('Fichier .env non servi',priv.status===404);

  // 15. Logout
  const lo=await c1.post('logout',{});
  const after=await c1.get('state');
  ok('Déconnexion',lo.status===200&&after.status===401);

  // 16. Register elevation blocked — user role coach in DB
  const check=await admin.get('state');
  const created=check.body.db.users.find(u=>u.email===email);
  ok('Compte inscrit est coach',created&&created.role==='coach');

  const failed=results.filter(r=>!r.pass);
  console.log('\nSUMMARY',results.filter(r=>r.pass).length+'/'+results.length,'passed');
  if(failed.length){console.log('FAILED',failed);process.exitCode=1}
  require('fs').writeFileSync('output/tests/audit-flow-results.json',JSON.stringify({at:new Date().toISOString(),results},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
