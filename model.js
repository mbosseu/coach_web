(function(root){
  'use strict';
  const data=typeof module!=='undefined'&&module.exports?require('./schedule-data.js'):root.BCPlannings;
  const pad=n=>String(n).padStart(2,'0');
  const dateKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const parseDate=s=>new Date(Number(s.slice(0,4)),Number(s.slice(5,7))-1,Number(s.slice(8,10)),12);
  const periodKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}`;
  const now=()=>new Date().toISOString();
  const uid=p=>`${p}-${globalThis.crypto.randomUUID()}`;
  const duration=c=>{const minutes=s=>Number(s.slice(0,2))*60+Number(s.slice(3));return minutes(c.end)-minutes(c.start)};
  const durationLabel=n=>n<60?`${n} min`:`${Math.floor(n/60)} h${n%60?' '+pad(n%60):''}`;
  const opened=(period,today=new Date())=>parseDate(period+'-01')<new Date(today.getFullYear(),today.getMonth(),1,12);
  const key=(user,period)=>`${user}:${period}`;
  function weeks(period){
    const first=parseDate(period+'-01'),end=new Date(first.getFullYear(),first.getMonth()+1,0,12);
    const start=new Date(first);start.setDate(start.getDate()-(start.getDay()+6)%7);
    const result=[];while(start<=end){const days=[];for(let i=0;i<7;i++){const day=new Date(start);day.setDate(day.getDate()+i);days.push(dateKey(day))}result.push(days);start.setDate(start.getDate()+7)}return result;
  }
  function createDB(){return {version:2,users:[],drafts:{},baskets:{},assignments:{},declarations:[],overrides:{},extra:[],deleted:[],audit:[],exportLog:[],credentials:{}}}
  function courses(db,target,period){
    const dates=weeks(period).flat().filter(d=>d.startsWith(period));const result=[];
    // Les visuels indiquent uniquement « saison 2026–2027 » : hypothèse explicite dans le rapport.
    if(period>='2026-09'&&period<='2027-08')for(const date of dates)for(const t of data.templates.filter(x=>x.target===target&&x.weekday===parseDate(date).getDay())){
      const id=t.id+'@'+date;const c=db.overrides[id]||{...t,id,date};if(!db.deleted.includes(id)&&c.date.startsWith(period)&&c.target===target)result.push(c);
    }
    // Une modification de date peut déplacer une occurrence dans un autre mois ou espace.
    for(const c of Object.values(db.overrides))if(c.target===target&&c.date.startsWith(period)&&!db.deleted.includes(c.id)&&!result.some(x=>x.id===c.id))result.push(c);
    for(const c of db.extra)if(c.target===target&&c.date.startsWith(period)&&!db.deleted.includes(c.id))result.push(c);
    return result.sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start)||a.id.localeCompare(b.id));
  }
  function getCourse(db,id){
    const own=db.overrides[id]||db.extra.find(c=>c.id===id);if(own)return db.deleted.includes(id)?null:own;
    const [tid,date,...rest]=String(id).split('@'),t=data.templates.find(c=>c.id===tid);
    if(rest.length||!date||!/^\d{4}-\d{2}-\d{2}$/.test(date)||dateKey(parseDate(date))!==date||date<'2026-09-01'||date>'2027-08-31'||t?.weekday!==parseDate(date).getDay())return null;
    return t&&!db.deleted.includes(id)?{...t,id,date}:null;
  }
  const finalized=(db,user,period)=>db.declarations.find(d=>d.coachId===user&&d.period===period);
  function available(db,c,user,period,today=new Date()){
    if(!c||!c.selectable||c.category==='free'||!c.date.startsWith(period)||!opened(period,today)||finalized(db,user,period))return false;
    return !db.assignments[c.id];
  }
  function selected(db,user,period,target){return (db.drafts[key(user,period)]||[]).map(id=>getCourse(db,id)).filter(c=>c&&(!target||c.target===target))}
  function basket(db,user,period){return (db.baskets[key(user,period)]||[]).map(id=>getCourse(db,id)).filter(c=>c&&db.assignments[c.id]?.coachId===user&&db.assignments[c.id]?.status==='reserved')}
  function toggle(db,id,user,period,today=new Date()){
    const c=getCourse(db,id);if(!available(db,c,user,period,today))throw Error('Ce cours ne peut pas être sélectionné. Vérifiez sa période et son attribution.');
    const k=key(user,period),list=db.drafts[k]||[];db.drafts[k]=list.includes(id)?list.filter(x=>x!==id):[...list,id];
  }
  function addClub(db,user,period,target,today=new Date()){
    const list=selected(db,user,period,target);if(!list.length)throw Error('Sélectionnez au moins un cours pour cet espace.');
    if(list.some(c=>!available(db,c,user,period,today)))throw Error('Un cours n’est plus disponible. Actualisez votre sélection.');
    const k=key(user,period);for(const c of list)db.assignments[c.id]={coachId:user,status:'reserved',updatedAt:now()};
    db.baskets[k]=[...new Set([...(db.baskets[k]||[]),...list.map(c=>c.id)])];db.drafts[k]=(db.drafts[k]||[]).filter(id=>!list.some(c=>c.id===id));return list.length;
  }
  function removeBasket(db,user,period,id){
    if(finalized(db,user,period))throw Error('La déclaration est validée et ne peut plus être modifiée.');
    const k=key(user,period);db.baskets[k]=(db.baskets[k]||[]).filter(x=>x!==id);if(db.assignments[id]?.coachId===user&&db.assignments[id]?.status==='reserved')delete db.assignments[id];
  }
  function validate(db,user,period,today=new Date()){
    if(!opened(period,today)||finalized(db,user,period))throw Error('Cette période est verrouillée.');
    if(selected(db,user,period).length)throw Error('Validez d’abord les sélections de chaque club.');
    const ids=db.baskets[key(user,period)]||[],list=basket(db,user,period);if(!list.length||list.length!==ids.length)throw Error('Le panier est vide ou une attribution a changé. Vérifiez-le avant de valider.');
    const decl={id:uid('declaration'),coachId:user,period,items:list.map(c=>({...c})),validatedAt:now(),delivery:'not-connected'};
    db.declarations.push(decl);for(const c of list)db.assignments[c.id]={coachId:user,status:'validated',declId:decl.id,updatedAt:decl.validatedAt};db.baskets[key(user,period)]=[];db.drafts[key(user,period)]=[];return decl;
  }
  function totals(list){const values={40:0,60:0,80:0,90:0};for(const c of list){const d=duration(c);values[d]=(values[d]||0)+1}return Object.entries(values).sort((a,b)=>Number(a[0])-Number(b[0])).map(([minutes,count])=>({minutes:Number(minutes),count}));}
  function syncDeclaration(db,id,course,assignment){
    for(const d of db.declarations){const had=d.items.some(x=>x.id===id);d.items=d.items.filter(x=>x.id!==id);if(had)d.updatedAt=now();}
    if(course&&assignment&&assignment.status==='validated'){let d=db.declarations.find(x=>x.id===assignment.declId&&x.coachId===assignment.coachId&&x.period===course.date.slice(0,7));if(d){d.items.push({...course});d.updatedAt=now()}else assignment.declId=null;}
  }
  function log(db,admin,action,reason,before,after){if(!reason.trim())throw Error('Indiquez le motif de la correction.');db.audit.unshift({id:uid('audit'),adminId:admin,action,reason:reason.trim(),before,after,at:now()});}
  function assign(db,admin,id,coachId,reason){
    if(db.users.find(u=>u.id===admin)?.role!=='admin')throw Error('Action réservée à la direction.');
    const c=getCourse(db,id);if(!c||!c.selectable||c.category==='free')throw Error('Ce créneau ne peut pas être attribué.');
    if(coachId&&!db.users.some(u=>u.id===coachId&&u.role==='coach'))throw Error('Coach introuvable.');
    const before=db.assignments[id]||null;log(db,admin,'Attribution de cours',reason,{course:c,assignment:before},{coachId:coachId||null});
    for(const k of Object.keys(db.baskets))db.baskets[k]=db.baskets[k].filter(x=>x!==id);
    for(const k of Object.keys(db.drafts))db.drafts[k]=db.drafts[k].filter(x=>x!==id);
    const d=coachId?finalized(db,coachId,c.date.slice(0,7)):null;
    const next=coachId?{coachId,status:'validated',declId:d?.id||null,updatedAt:now()}:null;
    if(next)db.assignments[id]=next;else delete db.assignments[id];syncDeclaration(db,id,c,next);return next;
  }
  function editCourse(db,admin,id,values,reason){
    if(db.users.find(u=>u.id===admin)?.role!=='admin')throw Error('Action réservée à la direction.');
    const before=id?getCourse(db,id):null,c={...before,...values,id:id||uid('course')};
    if(id&&!before)throw Error('Créneau introuvable.');
    if(!data.targets.some(t=>t.id===c.target)||!/^\d{4}-\d{2}-\d{2}$/.test(c.date)||dateKey(parseDate(c.date))!==c.date||!/^([01]\d|2[0-3]):[0-5]\d$/.test(c.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(c.end)||duration(c)<=0||!c.name?.trim()||!c.discipline?.trim()||!data.categories[c.category]||!/^#[0-9a-f]{6}$/i.test(c.color)||typeof c.selectable!=='boolean')throw Error('Vérifiez le nom, la date, la catégorie, la couleur et les horaires.');
    if(c.category==='free')c.selectable=false;
    log(db,admin,before?'Modification de créneau':'Ajout de créneau',reason,before,c);
    if(before){const extra=db.extra.findIndex(x=>x.id===id);if(extra>=0)db.extra[extra]=c;else db.overrides[id]=c;}else db.extra.push(c);
    const assignment=db.assignments[c.id];
    // Une attribution ne doit pas survivre à un passage en accès libre.
    if(!c.selectable&&assignment){delete db.assignments[c.id];for(const k of Object.keys(db.baskets))db.baskets[k]=db.baskets[k].filter(x=>x!==c.id);}
    for(const k of Object.keys(db.drafts))db.drafts[k]=db.drafts[k].filter(x=>x!==c.id);
    if(before&&assignment?.status==='reserved'&&(before.target!==c.target||before.date!==c.date)){delete db.assignments[c.id];for(const k of Object.keys(db.baskets))db.baskets[k]=db.baskets[k].filter(x=>x!==c.id);}
    syncDeclaration(db,c.id,c,db.assignments[c.id]);return c;
  }
  function deleteCourse(db,admin,id,reason){
    if(db.users.find(u=>u.id===admin)?.role!=='admin')throw Error('Action réservée à la direction.');
    const before=getCourse(db,id);if(!before)throw Error('Créneau introuvable.');log(db,admin,'Suppression de créneau',reason,before,null);db.deleted.push(id);delete db.assignments[id];syncDeclaration(db,id,null,null);
    for(const k of Object.keys(db.baskets))db.baskets[k]=db.baskets[k].filter(x=>x!==id);for(const k of Object.keys(db.drafts))db.drafts[k]=db.drafts[k].filter(x=>x!==id);
  }
  function editWeekly(db,admin,id,values,reason){
    const start=parseDate(values.date),end=parseDate(values.repeatUntil||'');
    if(!values.repeatUntil||!Number.isFinite(end.getTime())||end<start||(end-start)>366*86400000)throw Error('Renseignez une fin de répétition, au plus un an après la date de début.');
    const original=id?getCourse(db,id):null;
    if(original&&original.date!==values.date)throw Error('Pour modifier une série, conservez la date du créneau de départ.');
    const baseId=id?.split('@')[0],template=data.templates.find(t=>t.id===baseId);let first=null;
    const seriesId=original?.seriesId||uid('series');
    for(let day=new Date(start);day<=end;day.setDate(day.getDate()+7)){
      const date=dateKey(day);let courseId=date===values.date?id:null;
      if(template&&getCourse(db,template.id+'@'+date))courseId=template.id+'@'+date;
      else if(original?.seriesId)courseId=db.extra.find(c=>c.seriesId===original.seriesId&&c.date===date)?.id||null;
      const {scope,repeatUntil,...fields}=values;
      const c=editCourse(db,admin,courseId,{...fields,date,seriesId},reason+' · répétition hebdomadaire');
      first=first||c;
    }
    return first;
  }
  const api={...data,pad,dateKey,parseDate,periodKey,uid,duration,durationLabel,opened,weeks,createDB,courses,getCourse,finalized,available,selected,basket,toggle,addClub,removeBasket,validate,totals,assign,editCourse,editWeekly,deleteCourse};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BC=api;
})(typeof window==='undefined'?globalThis:window);
