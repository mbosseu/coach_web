'use strict';
/** 20 scénarios de recette isolés — comptes fictifs uniquement, jamais la prod. */
const origin='http://127.0.0.1:4180';
const PASS='Recette-Boxing-2026!';
const BC=require('../model.js');
const fs=require('node:fs');
const path=require('node:path');

async function client(){
  let cookie='',csrf='';
  function absorb(r){
    const jar=new Map(cookie?cookie.split('; ').map(p=>{const i=p.indexOf('=');return[p.slice(0,i),p]}):[]);
    for(const raw of(r.headers.getSetCookie?.()||[])){const part=raw.split(';')[0];jar.set(part.split('=')[0],part)}
    if(!r.headers.getSetCookie&&r.headers.get('set-cookie')){const part=r.headers.get('set-cookie').split(';')[0];jar.set(part.split('=')[0],part)}
    cookie=[...jar.values()].join('; ');
  }
  async function req(route,data,extra={}){
    const r=await fetch(origin+'/api/'+route,{
      method:data===undefined?'GET':'POST',
      headers:{Cookie:cookie,...(data!==undefined?{'Content-Type':'application/json',Origin:origin,'X-CSRF-Token':csrf}:{}),...extra},
      body:data!==undefined?JSON.stringify(data):undefined
    });
    absorb(r);
    let body=null;try{body=await r.json()}catch{body={}}
    if(body?.csrf)csrf=body.csrf;
    return{status:r.status,body};
  }
  return{get:r=>req(r),post:(r,d,h)=>req(r,d,h),action:(d,h)=>req('action',d,h)};
}

const results=[];
function ok(name,pass,detail=''){
  results.push({name,pass:!!pass,detail:String(detail||'')});
  console.log((pass?'OK ':'FAIL ')+name+(detail?' — '+detail:''));
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function login(email,role,{retries=6}={}){
  for(let i=0;i<retries;i++){
    const c=await client();
    await c.get('session');
    const r=await c.post('login',{email,password:PASS,role});
    if(r.status===200&&r.body.userId)return{c,r};
    if(r.status===429||/tente|limite|attente/i.test(r.body.error||'')){await sleep(1500*(i+1));continue}
    return{c,r};
  }
  const c=await client();await c.get('session');
  return{c,r:await c.post('login',{email,password:PASS,role})};
}

async function act(c,payload){
  await sleep(1100);
  return c.action(payload);
}

function freeCourse(db,target,period,taken={}){
  return BC.courses(db,target,period).find(x=>x.selectable&&!taken[x.id]);
}

(async()=>{
  const period='2026-09';
  const empty=BC.createDB();
  const stamp=Date.now();
  const emailA=`scenario.a.${stamp}@recette.example.test`;
  const emailB=`scenario.b.${stamp}@recette.example.test`;

  // S1 Health
  {
    const r=await fetch(origin+'/api/health');
    const body=await r.json();
    ok('S1 · Health check',r.status===200&&body.status==='ok',String(r.status));
  }

  // S2 Guest session
  {
    const g=await client();
    const s=await g.get('session');
    ok('S2 · Session invité + CSRF',s.status===200&&!s.body.userId&&!!s.body.csrf);
  }

  // S3 Register (admin role ignored)
  {
    const g=await client();await g.get('session');
    const reg=await g.post('register',{firstName:'Scen',lastName:'Alpha',company:'Recette',phone:'0611111111',email:emailA,password:PASS,confirmation:PASS,role:'admin'});
    ok('S3 · Inscription coach (élévation admin ignorée)',reg.status===201,reg.body.error||String(reg.status));
  }

  // S4 Login coach A
  let coachA,coachAId;
  {
    const{c,r}=await login(emailA,'coach');
    coachA=c;
    coachAId=r.body.userId;
    ok('S4 · Connexion coach nouvellement créé',r.status===200&&!!coachAId,r.body.error||coachAId||'');
  }

  // S5 Bad password
  {
    await sleep(1200);
    const g=await client();await g.get('session');
    const r=await g.post('login',{email:emailA,password:'Wrong-Pass-999!',role:'coach'});
    ok('S5 · Refus mauvais mot de passe',r.status===401,String(r.status));
  }

  // S6 Wrong role
  {
    await sleep(1200);
    const g=await client();await g.get('session');
    const r=await g.post('login',{email:emailA,password:PASS,role:'admin'});
    ok('S6 · Refus coach via onglet direction',r.status===401,String(r.status));
  }

  // S7 Admin login
  let admin;
  {
    await sleep(1200);
    const{c,r}=await login('direction@recette.example.test','admin');
    admin=c;
    ok('S7 · Connexion direction',r.status===200&&r.body.db?.users?.some(u=>u.role==='admin'),r.body.error||'');
  }

  // S8 Full declaration
  let courseId=null;
  {
    const st=await coachA.get('state');
    const taken=st.body.db?.assignments||{};
    const course=freeCourse(empty,'minimes',period,taken);
    if(!course){ok('S8 · Déclaration complète Minimes',false,'aucun créneau');}
    else{
      courseId=course.id;
      const t=await act(coachA,{action:'toggle',id:courseId,period});
      const add=await act(coachA,{action:'addClub',target:'minimes',period});
      const conf=await act(coachA,{action:'validate',period});
      ok('S8 · Déclaration complète Minimes',t.status===200&&add.status===200&&conf.status===200&&(conf.body.result?.items?.length||0)>=1,conf.body.error||courseId);
    }
  }

  // S9 Concurrent block
  {
    await sleep(1200);
    const{c:c2,r}=await login('coach@recette.example.test','coach');
    if(r.status!==200){ok('S9 · Second coach bloqué sur créneau validé',false,'login seed: '+ (r.body.error||r.status));}
    else{
      const t2=await act(c2,{action:'toggle',id:courseId,period});
      ok('S9 · Second coach bloqué sur créneau validé',t2.status!==200,String(t2.status)+' '+(t2.body?.error||''));
    }
  }

  // S10 Current month locked
  {
    const oct=BC.courses(empty,'minimes','2026-10').find(c=>c.selectable);
    const t=await act(coachA,{action:'toggle',id:oct.id,period:'2026-10'});
    ok('S10 · Mois courant (oct.) verrouillé',t.status!==200,String(t.status));
  }

  // S11 Empty basket validate
  let coachB;
  {
    await sleep(1200);
    const g=await client();await g.get('session');
    await g.post('register',{firstName:'Scen',lastName:'Beta',company:'Recette',phone:'0622222222',email:emailB,password:PASS,confirmation:PASS});
    await sleep(1200);
    const logged=await login(emailB,'coach');
    coachB=logged.c;
    const v=await act(coachB,{action:'validate',period});
    ok('S11 · Validation panier vide refusée',logged.r.status===200&&v.status!==200,v.body.error||String(v.status));
  }

  // S12 addClub without selection
  {
    const add=await act(coachB,{action:'addClub',target:'ramonville',period});
    ok('S12 · addClub sans sélection refusé',add.status!==200&&/Sélectionnez|cours/i.test(add.body.error||''),add.body.error||String(add.status));
  }

  // S13 Free slot blocked
  {
    const free=BC.courses(empty,'minimes',period).find(x=>!x.selectable||x.category==='free');
    const t=await act(coachB,{action:'toggle',id:free.id,period});
    ok('S13 · Accès libre non déclarable',t.status!==200,t.body.error||String(t.status));
  }

  // S14 Multi-club basket
  let basketIds=[];
  {
    const st=await coachB.get('state');
    const taken=st.body.db?.assignments||{};
    const m=freeCourse(empty,'minimes',period,taken);
    const r=freeCourse(empty,'ramonville',period,taken);
    if(!m||!r){ok('S14 · Panier multi-clubs (Minimes + Ramonville)',false,'créneaux manquants');}
    else{
      await act(coachB,{action:'toggle',id:m.id,period});
      const a1=await act(coachB,{action:'addClub',target:'minimes',period});
      await act(coachB,{action:'toggle',id:r.id,period});
      const a2=await act(coachB,{action:'addClub',target:'ramonville',period});
      const st2=await coachB.get('state');
      basketIds=(st2.body.db?.baskets||{})[`${st2.body.userId}:${period}`]||[];
      ok('S14 · Panier multi-clubs (Minimes + Ramonville)',a1.status===200&&a2.status===200&&basketIds.length>=2,`basket=${basketIds.length}`);
    }
  }

  // S15 Remove from basket then re-select (same session)
  {
    if(!basketIds.length){ok('S15 · Retrait panier puis re-sélection',false,'panier vide');}
    else{
      const id=basketIds[0];
      const rem=await act(coachB,{action:'removeBasket',id,period});
      const tog=await act(coachB,{action:'toggle',id,period});
      ok('S15 · Retrait panier puis re-sélection',rem.status===200&&tog.status===200,`rem=${rem.status} tog=${tog.status}`);
    }
  }

  // S16 Coach cannot edit schedule
  {
    const edit=await act(coachB,{action:'edit',values:{target:'minimes',date:'2026-09-08',name:'Pirate',discipline:'Boxe',start:'10:00',end:'11:00',category:'anglaise',color:'#3769ad',selectable:true,scope:'single'},reason:'Tentative'});
    ok('S16 · Coach interdit d’éditer un créneau',edit.status===403,String(edit.status));
  }

  // S17 Admin create + assign (refresh admin session)
  {
    await sleep(1500);
    const{c,r}=await login('direction@recette.example.test','admin');
    admin=c;
    if(r.status!==200){ok('S17 · Admin crée et attribue un créneau',false,r.body.error||String(r.status));}
    else{
      const edit=await act(admin,{action:'edit',values:{target:'saint-cyprien',date:'2026-09-09',name:'Cours scénario 17',discipline:'Boxe',start:'17:00',end:'18:00',category:'anglaise',color:'#3769ad',selectable:true,scope:'single'},reason:'Scénario S17'});
      const newId=edit.body.result?.id;
      const asg=newId?await act(admin,{action:'assign',id:newId,coachId:coachAId,reason:'Attribution S17'}):{status:0,body:{}};
      ok('S17 · Admin crée et attribue un créneau',edit.status===200&&asg.status===200,newId||edit.body.error||asg.body.error||'');
    }
  }

  // S18 Admin cannot toggle (same admin session)
  {
    const course=freeCourse(empty,'etats-boxe',period);
    const t=await act(admin,{action:'toggle',id:course.id,period});
    ok('S18 · Direction interdite de toggle coach',t.status===403,String(t.status)+' '+(t.body?.error||''));
  }

  // S19 CSRF + evil origin
  {
    const course=freeCourse(empty,'etats-mma',period);
    await sleep(1100);
    const csrfBad=await coachB.action({action:'toggle',id:course.id,period},{'X-CSRF-Token':'invalid-token'});
    await sleep(1100);
    const originFail=await coachB.action({action:'toggle',id:course.id,period},{Origin:'https://evil.test'});
    ok('S19 · CSRF + Origin étrangers refusés',csrfBad.status===403&&originFail.status===403,`csrf=${csrfBad.status} origin=${originFail.status}`);
  }

  // S20 Isolation + logout + .env
  {
    let session=coachB;
    let st=await session.get('state');
    if(st.status!==200||!st.body.userId){
      await sleep(1500);
      const logged=await login(emailB,'coach');
      session=logged.c;
      st=await session.get('state');
    }
    const mine=st.body.userId;
    const foreignDecl=(st.body.db?.declarations||[]).some(d=>d.coachId&&d.coachId!==mine);
    const noPassword=!(st.body.db?.users||[]).some(u=>u.password||u.passwordHash);
    const lo=await session.post('logout',{});
    const after=await session.get('state');
    const priv=await fetch(origin+'/.env');
    ok('S20 · Isolation déclarations / logout / .env',
      !!mine&&noPassword&&!foreignDecl&&lo.status===200&&after.status===401&&priv.status===404,
      `pwd=${noPassword} foreignDecl=${foreignDecl} lo=${lo.status} after=${after.status} env=${priv.status}`);
  }

  const passed=results.filter(r=>r.pass).length;
  const failed=results.filter(r=>!r.pass);
  console.log('\nSUMMARY',passed+'/'+results.length,'passed');
  if(failed.length)console.log('FAILED',failed);
  const out=path.join('output','tests','scenarios-20-results.json');
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,JSON.stringify({at:new Date().toISOString(),passed,total:results.length,results},null,2));
  process.exitCode=failed.length?1:0;
})().catch(e=>{console.error(e);process.exitCode=1});
