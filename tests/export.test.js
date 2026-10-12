'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {xlsx,ownerForCourse}=require('../export-utils.js');
test('Excel XLSX : paquet ZIP OOXML, accents, durées numériques, sans formules',()=>{
  const bytes=xlsx([['Coach','Durée'],['Éloïse & Boxing',70],['=HYPERLINK("https://evil.test")',40]]),buffer=Buffer.from(bytes);
  assert.equal(buffer.readUInt32LE(0),0x04034b50);assert.equal(buffer.readUInt32LE(buffer.length-22),0x06054b50);assert.equal(buffer.readUInt16LE(buffer.length-12),6);
  const text=buffer.toString('utf8');assert.match(text,/Éloïse &amp; Boxing/);assert.match(text,/<v>70<\/v>/);assert.match(text,/t="inlineStr"/);assert.ok(!text.includes('<f>'));assert.match(text,/state="frozen"/);
});
test('Exports : identité historique commune au CSV, Excel et récapitulatif imprimable',()=>{
  const current={id:'coach',company:'Association actuelle',email:'actuel@example.test'};
  const snapshot={id:'coach',company:'Association lors de la validation',email:'ancien@example.test'};
  const db={users:[current],assignments:{course:{coachId:'coach',declId:'declaration'}},declarations:[{id:'declaration',coachId:'coach',coachSnapshot:snapshot}]};
  assert.equal(ownerForCourse(db,{id:'course'}),snapshot);
  db.assignments.course={coachId:'coach'};
  assert.equal(ownerForCourse(db,{id:'course'}),current);
  assert.equal(ownerForCourse(db,{id:'without-assignment'},'coach'),current);
  db.assignments.course={coachId:'coach',declId:'declaration'};delete db.declarations[0].coachSnapshot;
  assert.equal(ownerForCourse(db,{id:'course'}),current);
});
