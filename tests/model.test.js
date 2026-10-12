const {test}=require('node:test');
const assert=require('node:assert/strict');
const B=require('../model.js');
// Fixtures are confined to the test suite, never shipped as application accounts.
const emptyDB=B.createDB;
B.createDB=()=>({...emptyDB(),users:[
 {id:'coach-sophie',role:'coach',firstName:'Sophie',lastName:'Martin',company:'Test',email:'sophie@example.test'},
 {id:'coach-valentin',role:'coach',firstName:'Valentin',lastName:'Tapia',company:'Test',email:'valentin@example.test'},
 {id:'direction',role:'admin',firstName:'Direction',lastName:'Boxing Center',company:'Test',email:'direction@example.test'}
]});
const today=new Date(2026,9,10,12),period='2026-09';
const pick=(db,target='minimes')=>B.courses(db,target,period).find(c=>c.selectable);
test('4 clubs, 6 espaces, Portet exclu et six sources officielles transcrites',()=>{
 assert.equal(B.targets.length,6);assert.equal(new Set(B.targets.map(t=>t.club)).size,4);
 assert.equal(B.targets.some(t=>/Portet/.test(t.club)),false);
 for(const t of B.targets){assert.ok(t.source);assert.ok(B.courses(B.createDB(),t.id,period).some(c=>c.selectable));}
 const weeklyCounts={minimes:27,ramonville:22,'saint-cyprien':29,'etats-mma':11,'etats-fitness':15,'etats-boxe':20};
 for(const [target,count]of Object.entries(weeklyCounts))assert.equal(B.templates.filter(c=>c.target===target&&c.selectable).length,count,target);
 const ramon=B.courses(B.createDB(),'ramonville',period).find(c=>c.date==='2026-09-02'&&c.name==='Boxe anglaise'&&c.start==='18:45');assert.equal(B.duration(ramon),90);
 const cyprien=B.courses(B.createDB(),'saint-cyprien',period).find(c=>c.date==='2026-09-05'&&c.start==='18:20');assert.equal(B.duration(cyprien),100);
});
test('calendrier : frontières de mois et six semaines si nécessaire',()=>{
 const weeks=B.weeks('2026-09');assert.equal(weeks.length,5);assert.equal(weeks[0][0],'2026-08-31');assert.equal(weeks.at(-1).at(-1),'2026-10-04');assert.equal(B.weeks('2026-03').length,6);
});
test('mois courant bloqué jusqu’au premier du mois suivant',()=>{
 const db=B.createDB(),c=B.courses(db,'minimes','2026-10').find(c=>c.selectable);
 assert.equal(B.opened('2026-10',today),false);assert.equal(B.opened('2026-09',today),true);assert.equal(B.opened('2026-10',new Date(2026,10,1,0)),true);
 assert.throws(()=>B.toggle(db,c.id,'coach-sophie','2026-10',today));assert.throws(()=>B.toggle(db,c.id,'coach-sophie',period,today));
});
test('accès libre bloqué et cumul des durées réelles',()=>{
 const db=B.createDB(),free=B.courses(db,'minimes',period).find(c=>!c.selectable);assert.throws(()=>B.toggle(db,free.id,'coach-sophie',period,today));
 const list=B.courses(db,'etats-boxe',period).filter(c=>c.selectable);assert.ok(list.some(c=>B.duration(c)===70));assert.ok(list.some(c=>B.duration(c)===85));assert.equal(B.totals(list).reduce((s,x)=>s+x.count,0),list.length);
});
test('panier multi-clubs conserve chaque espace et chaque date',()=>{
 const db=B.createDB(),a=pick(db),b=pick(db,'etats-boxe');
 B.toggle(db,a.id,'coach-sophie',period,today);B.addClub(db,'coach-sophie',period,a.target,today);B.toggle(db,b.id,'coach-sophie',period,today);B.addClub(db,'coach-sophie',period,b.target,today);
 const basket=B.basket(db,'coach-sophie',period);assert.equal(basket.length,2);assert.equal(basket[0].target,'minimes');assert.equal(basket[1].target,'etats-boxe');assert.equal(B.selected(db,'coach-sophie',period).length,0);
});
test('doublon bloqué dès le panier, disponibilité restaurée après retrait',()=>{
 const db=B.createDB(),c=pick(db);B.toggle(db,c.id,'coach-sophie',period,today);B.addClub(db,'coach-sophie',period,c.target,today);assert.throws(()=>B.toggle(db,c.id,'coach-valentin',period,today));B.removeBasket(db,'coach-sophie',period,c.id);assert.equal(B.available(db,c,'coach-valentin',period,today),true);
});
test('brouillon concurrent : désélection et validation restent possibles',()=>{
 const db=B.createDB(),list=B.courses(db,'minimes',period).filter(c=>c.selectable),a=list[0],b=list[1];
 B.toggle(db,a.id,'coach-sophie',period,today);B.toggle(db,a.id,'coach-valentin',period,today);B.toggle(db,b.id,'coach-sophie',period,today);
 B.addClub(db,'coach-valentin',period,a.target,today);
 assert.equal(B.selected(db,'coach-sophie',period).some(c=>c.id===a.id),false);
 // Stale draft after a race: clearing must still work, then validation of remaining basket.
 db.drafts['coach-sophie:'+period]=[a.id,b.id];
 B.toggle(db,a.id,'coach-sophie',period,today);
 assert.equal(B.selected(db,'coach-sophie',period).some(c=>c.id===a.id),false);
 B.addClub(db,'coach-sophie',period,b.target,today);
 const d=B.validate(db,'coach-sophie',period,today);
 assert.equal(d.items.length,1);assert.equal(d.items[0].id,b.id);
});
test('validation enregistrée, horodatée et immuable pour le coach',()=>{
 const db=B.createDB(),c=pick(db);B.toggle(db,c.id,'coach-sophie',period,today);B.addClub(db,'coach-sophie',period,c.target,today);const d=B.validate(db,'coach-sophie',period,today);
 assert.equal(d.items.length,1);assert.ok(d.validatedAt);assert.equal(d.delivery,'not-connected');assert.equal(db.assignments[c.id].status,'validated');assert.equal(B.finalized(db,'coach-sophie',period).id,d.id);assert.throws(()=>B.toggle(db,c.id,'coach-sophie',period,today));assert.throws(()=>B.removeBasket(db,'coach-sophie',period,c.id));assert.throws(()=>B.validate(db,'coach-sophie',period,today));
});
test('validation interdite : vide, brouillon restant ou conflit',()=>{
 const db=B.createDB(),c=pick(db);assert.throws(()=>B.validate(db,'coach-sophie',period,today));B.toggle(db,c.id,'coach-sophie',period,today);assert.throws(()=>B.validate(db,'coach-sophie',period,today));B.addClub(db,'coach-sophie',period,c.target,today);db.assignments[c.id].coachId='coach-valentin';assert.throws(()=>B.validate(db,'coach-sophie',period,today));
});
test('admin : droits, motif, attribution, retrait, modification et suppression',()=>{
 const db=B.createDB(),c=pick(db);assert.throws(()=>B.assign(db,'coach-sophie',c.id,'coach-valentin','Test'));assert.throws(()=>B.assign(db,'direction',c.id,'coach-valentin',''));
 B.assign(db,'direction',c.id,'coach-valentin','Correction');assert.equal(db.assignments[c.id].coachId,'coach-valentin');B.assign(db,'direction',c.id,'','Retrait');assert.equal(db.assignments[c.id],undefined);B.editCourse(db,'direction',c.id,{...c,start:'10:00',end:'11:00'},'Horaire');assert.equal(B.duration(B.getCourse(db,c.id)),60);B.deleteCourse(db,'direction',c.id,'Annulation');assert.equal(B.getCourse(db,c.id),null);assert.equal(db.audit.length,4);
});
test('correction admin après validation actualise le récapitulatif',()=>{
 const db=B.createDB(),c=pick(db);B.toggle(db,c.id,'coach-sophie',period,today);B.addClub(db,'coach-sophie',period,c.target,today);const d=B.validate(db,'coach-sophie',period,today);B.editCourse(db,'direction',c.id,{...c,start:'10:00',end:'11:00'},'Correction');assert.equal(B.duration(d.items[0]),60);assert.ok(d.updatedAt);B.assign(db,'direction',c.id,'coach-valentin','Réattribution');assert.equal(d.items.length,0);assert.equal(db.assignments[c.id].coachId,'coach-valentin');
});
test('ajout de créneau et conversion en accès libre',()=>{
 const db=B.createDB(),c=B.editCourse(db,'direction',null,{target:'ramonville',date:'2026-09-04',name:'Cours confirmé',start:'18:00',end:'19:00',discipline:'Boxe',category:'anglaise',color:'#3769ad',selectable:true},'Création');assert.ok(B.courses(db,'ramonville',period).some(x=>x.id===c.id));B.assign(db,'direction',c.id,'coach-sophie','Attribution');B.editCourse(db,'direction',c.id,{...c,selectable:false,category:'free'},'Accès libre');assert.equal(db.assignments[c.id],undefined);
});
test('modification et ajout hebdomadaires appliqués jusqu’à la date demandée',()=>{
 const db=B.createDB(),c=pick(db);B.editWeekly(db,'direction',c.id,{...c,start:'10:00',end:'11:00',repeatUntil:'2026-09-30'},'Changement saison');
 assert.equal(B.duration(B.getCourse(db,c.id)),60);assert.equal(B.duration(B.getCourse(db,c.id.split('@')[0]+'@2026-09-08')),60);
 B.editWeekly(db,'direction',null,{target:'ramonville',date:'2026-09-04',name:'Cours confirmé',start:'18:00',end:'19:00',discipline:'Boxe',category:'anglaise',color:'#3769ad',selectable:true,repeatUntil:'2026-09-25'},'Planning confirmé');assert.equal(B.courses(db,'ramonville',period).filter(c=>c.name==='Cours confirmé').length,4);
});
