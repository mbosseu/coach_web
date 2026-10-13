/* Transcription des six visuels officiels 2026–2027. Aucune donnée de cours inventée.
 * Les bornes de saison et les exceptions restent à confirmer par la direction.
 */
(function (root) {
  const targets = [
    {id:'minimes',club:'Minimes / Barrière de Paris',space:'',photo:'minime.webp',source:'planning-minimes-officiel.jpeg'},
    {id:'ramonville',club:'Ramonville',space:'',photo:'ramonville.webp',source:'planning-ramonville.jpeg'},
    {id:'saint-cyprien',club:'Saint-Cyprien',space:'',photo:'saint-cyprien.webp',source:'planning-saint-cyprien.webp'},
    {id:'etats-mma',club:'États-Unis',space:'Salle MMA',photo:'etats-unis.webp',source:'planning-etats-mma.jpeg'},
    {id:'etats-fitness',club:'États-Unis',space:'Salle Boxing Fitness',photo:'etats-unis.webp',source:'planning-etats-fitness.webp'},
    {id:'etats-boxe',club:'États-Unis',space:'Salle Boxe',photo:'etats-unis.webp',source:'planning-etats-boxe-officiel.jpeg'}
  ];
  const categories = {
    anglaise:{name:'Boxe anglaise',color:'#2563EB'},competition:{name:'Compétition',color:'#DC2626'},
    camp:{name:'Boxing Camp',color:'#D97706'},lady:{name:'Boxing Lady',color:'#DB2777'},
    jeunes:{name:'École / jeunes',color:'#0891B2'},kick:{name:'Pieds-poings / kick',color:'#EA580C'},
    free:{name:'Accès libre',color:'#9CA3AF'},grappling:{name:'Grappling',color:'#059669'},
    mma:{name:'MMA',color:'#7C3AED'},jjb:{name:'Jiu-jitsu brésilien',color:'#CA8A04'},
    hyrox:{name:'Hyrox',color:'#C026D3'},cross:{name:'Cross-training',color:'#16A34A'},
    hiit:{name:'Boxing HIIT',color:'#0D9488'}
  };
  const templates=[];
  function add(target,days,name,start,end,category,discipline,area='') {
    days.forEach(weekday=>templates.push({id:'slot-'+templates.length,target,weekday,name,start,end,category,
      discipline:discipline||name,color:categories[category].color,selectable:category!=='free',area}));
  }
  const m='minimes';
  add(m,[1,2,3,4,5],'Accès libre','11:00','12:00','free');
  add(m,[6],'Accès libre','10:00','11:00','free');
  add(m,[6],'Boxing Camp','11:00','12:00','camp','Conditionnement physique');
  add(m,[1,5],'Boxing Camp','12:40','13:20','camp','Conditionnement physique');
  add(m,[2,3,4],'Boxe anglaise (loisirs)','12:40','13:20','anglaise','Boxe anglaise');
  add(m,[1,2,4,5],'Accès libre','13:20','18:00','free');
  add(m,[3],'Accès libre','13:20','15:00','free');
  add(m,[6],'Accès libre','12:40','13:20','free');
  add(m,[6],'Baby boxe (3–6 ans)','14:15','15:00','jeunes','Boxe éducative');
  add(m,[3,6],'Boxe éducative enfants (7–11 ans)','15:00','16:00','jeunes','Boxe éducative');
  add(m,[3,6],'Boxe éducative ados (12–16 ans)','16:00','17:00','jeunes','Boxe éducative');
  add(m,[3,6],'Boxe éducative compétiteurs','17:00','18:30','competition','Boxe anglaise');
  add(m,[1,2,4,5],'Boxe compétiteurs','18:00','19:30','competition','Boxe anglaise','Zone 1');
  add(m,[1,2,4],'Accès libre','18:00','18:30','free','Accès libre','Zone 2');
  add(m,[1],'Boxing Lady','18:30','19:30','lady','Boxe anglaise','Zone 2');
  add(m,[2,4],'Cross-training','18:30','19:30','cross','Cross-training','Zone 2');
  add(m,[3],'Boxing Lady','18:30','19:30','lady','Boxe anglaise');
  add(m,[6],'Open sparring','18:30','19:30','anglaise','Boxe anglaise');
  add(m,[1,2,4,5],'Boxe anglaise (loisirs)','19:40','21:00','anglaise','Boxe anglaise');
  add(m,[3],'Boxe pieds-poings','19:40','21:00','kick','Boxe pieds-poings');
  add(m,[6],'Accès libre','19:40','21:00','free');
  const e='etats-boxe';
  add(e,[1,2,3,4,5],'Accès libre','11:00','12:00','free');
  add(e,[6],'Boxe anglaise','11:00','12:00','anglaise','Boxe anglaise');
  add(e,[1,3],'Boxe pieds-poings','12:40','13:20','kick','Boxe pieds-poings');
  add(e,[2,4],'Boxe anglaise','12:40','13:20','anglaise','Boxe anglaise');
  add(e,[5,6],'Accès libre','12:40','13:20','free');
  add(e,[1,2,3,4,5],'Accès libre','14:15','15:00','free');
  add(e,[6],'Boxe pieds-poings (3–6 ans)','14:15','15:00','jeunes','Boxe pieds-poings');
  add(e,[1,2,4,5],'Accès libre','15:00','16:00','free');
  add(e,[3,6],'Boxe pieds-poings (7–11 ans)','15:00','16:00','jeunes','Boxe pieds-poings');
  add(e,[1,2,4,5],'Accès libre','16:00','17:00','free');
  add(e,[3,6],'Boxe pieds-poings (12–16 ans)','16:00','17:00','jeunes','Boxe pieds-poings');
  add(e,[1,3,4],'Boxe pieds-poings','18:30','19:40','kick','Boxe pieds-poings');
  add(e,[2,5],'Boxe anglaise','18:30','19:40','anglaise','Boxe anglaise');
  add(e,[6],'Accès libre','18:30','19:40','free');
  add(e,[1,3,4],'Boxe anglaise','19:50','21:15','anglaise','Boxe anglaise');
  add(e,[2,5],'Boxe pieds-poings','19:50','21:15','kick','Boxe pieds-poings');
  add(e,[6],'Accès libre','19:50','21:15','free');

  // Append-only: preserve the IDs already used by existing declarations.
  const r='ramonville';
  add(r,[1,2,3,4,5],'Accès libre','11:00','12:00','free');
  add(r,[6],'Boxing Camp','11:00','12:00','camp','Conditionnement physique');
  add(r,[1,3],'Boxing Camp','12:40','13:20','camp','Conditionnement physique');
  add(r,[2,5],'Boxe anglaise','12:40','13:20','anglaise','Boxe anglaise');
  add(r,[4],'Boxe pieds-poings','12:40','13:20','kick','Boxe pieds-poings');
  add(r,[6],'Accès libre','12:40','13:20','free');
  add(r,[1,2,3,4,5],'Accès libre','14:15','15:00','free');
  add(r,[6],'Baby boxe (3–6 ans)','14:15','15:00','jeunes','Boxe éducative');
  add(r,[1,2,4,5],'Accès libre','15:00','16:00','free');
  add(r,[3,6],'Boxe éducative enfants (7–11 ans)','15:00','16:00','jeunes','Boxe éducative');
  add(r,[1,2,4,5],'Accès libre','16:00','17:00','free');
  add(r,[3,6],'Boxe éducative ados (12–16 ans)','16:00','17:00','jeunes','Boxe éducative');
  add(r,[1,5],'Lady Punch','18:00','18:40','lady','Lady Punch');
  add(r,[2,3,4,6],'Accès libre','18:00','18:40','free');
  add(r,[1,5],'Boxe pieds-poings','18:40','19:40','kick','Boxe pieds-poings');
  add(r,[2],'Grappling','18:40','19:40','grappling','Grappling');
  add(r,[3],'Boxe anglaise','18:45','20:15','anglaise','Boxe anglaise');
  add(r,[4],'Boxing Camp','18:40','19:40','camp','Conditionnement physique');
  add(r,[6],'Accès libre','18:40','19:40','free');
  add(r,[1,5],'Boxe anglaise (loisirs)','19:45','21:15','anglaise','Boxe anglaise');
  add(r,[2,4],'Asso MMA','19:45','21:15','mma','MMA');
  add(r,[3,6],'Accès libre','19:45','21:15','free');

  const s='saint-cyprien';
  add(s,[1,2,3,4,5],'Accès libre','10:00','12:00','free');
  add(s,[6],'Accès libre','10:00','11:00','free');
  add(s,[6],'Boxing Camp','11:00','12:00','camp','Conditionnement physique');
  add(s,[1],'Boxing Camp','12:40','13:20','camp','Conditionnement physique');
  add(s,[2,4],'Boxe thaï / K1','12:40','13:20','kick','Boxe thaï / K1');
  add(s,[3,5],'Boxe anglaise','12:40','13:20','anglaise','Boxe anglaise');
  add(s,[6],'Accès libre','12:40','13:20','free');
  add(s,[1,2,3,4,5],'Accès libre','14:15','15:00','free');
  add(s,[6],'Baby boxe (3–6 ans)','14:15','15:00','jeunes','Boxe éducative');
  add(s,[1,2,4,5],'Accès libre','15:00','16:00','free');
  add(s,[3,6],'Boxe éducative enfants (7–11 ans)','15:00','16:00','jeunes','Boxe éducative');
  add(s,[1,2,4,5],'Accès libre','16:00','17:00','free');
  add(s,[3,6],'Boxe éducative ados (12–16 ans)','16:00','17:00','jeunes','Boxe éducative');
  add(s,[1,2,4,5],'Accès libre','17:00','18:15','free');
  add(s,[3,6],'Boxe éducative compétiteurs','17:00','18:15','competition','Boxe anglaise');
  add(s,[1,5],'Boxing Camp','18:20','19:00','camp','Conditionnement physique');
  add(s,[2,4],'Lady Punch','18:20','19:00','lady','Lady Punch');
  add(s,[3],'Hyrox','18:20','19:00','hyrox','Hyrox');
  add(s,[6],'Boxe thaï / K1','18:20','20:00','kick','Boxe thaï / K1');
  add(s,[1,3],'Cross-training','19:00','20:00','cross','Cross-training');
  add(s,[2,4],'Grappling','19:00','20:00','grappling','Grappling');
  add(s,[5],'Boxe thaï / K1','19:00','20:00','kick','Boxe thaï / K1');
  add(s,[1,3,5],'Boxe anglaise','20:00','21:15','anglaise','Boxe anglaise');
  add(s,[2,4],'Boxe thaï / K1','20:00','21:15','kick','Boxe thaï / K1');
  add(s,[6],'Accès libre','20:00','21:15','free');

  const f='etats-fitness';
  add(f,[1,2,3,4,5],'Accès libre','11:00','12:00','free');
  add(f,[6],'Cross-training','11:00','12:00','cross','Cross-training');
  add(f,[1],'Hyrox','12:40','13:20','hyrox','Hyrox');
  add(f,[2,5],'Boxing HIIT','12:40','13:20','hiit','Boxing HIIT');
  add(f,[3,6],'Accès libre','12:40','13:20','free');
  add(f,[4],'Cross-training','12:40','13:20','cross','Cross-training');
  add(f,[1,4],'Hyrox','18:40','19:20','hyrox','Hyrox');
  add(f,[2,3,5],'Lady Punch','18:40','19:20','lady','Lady Punch');
  add(f,[6],'Accès libre','18:40','19:20','free');
  add(f,[1,3],'Cross-training','19:30','20:30','cross','Cross-training');
  add(f,[2,4,5],'Boxing HIIT','19:30','20:30','hiit','Boxing HIIT');
  add(f,[6],'Accès libre','19:30','20:30','free');

  const a='etats-mma';
  add(a,[1,2,4,5],'Accès libre','18:00','19:00','free');
  add(a,[3,6],'Asso MMA enfants (10–16 ans)','18:00','19:00','jeunes','MMA');
  add(a,[1,5],'Jiu-jitsu brésilien','18:20','19:00','jjb','Jiu-jitsu brésilien');
  add(a,[2,4],'Grappling','18:20','19:00','grappling','Grappling');
  add(a,[3,6],'Accès libre','18:20','19:00','free');
  add(a,[1,2,4,5],'Asso MMA','19:40','21:00','mma','MMA');
  add(a,[3],'Grappling','19:40','21:00','grappling','Grappling');
  add(a,[6],'Accès libre','19:40','21:00','free');
  // The public September revision replaces three old free-time ranges only.
  // Keep numerical IDs stable; retired non-selectable slots are not expanded.
  const retired=templates.filter(c=>c.target===m&&!c.selectable&&(c.start==='13:20'||c.weekday===6&&c.start==='10:00')).map(c=>c.id);
  add(m,[1,2,3,4,5],'Accès libre','14:15','15:00','free');
  add(m,[1,2,4,5],'Accès libre','15:00','16:00','free');
  add(m,[1,2,4,5],'Accès libre','16:00','17:00','free');
  add(m,[1,2,4,5],'Accès libre','17:00','18:30','free');
  const data={targets,categories,templates:templates.filter(c=>!retired.includes(c.id))};
  if(typeof module!=='undefined'&&module.exports)module.exports=data;else root.BCPlannings=data;
})(typeof window==='undefined'?globalThis:window);
