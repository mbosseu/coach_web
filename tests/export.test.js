'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {xlsx}=require('../export-utils.js');
test('Excel XLSX : paquet ZIP OOXML, accents, durées numériques, sans formules',()=>{
  const bytes=xlsx([['Coach','Durée'],['Éloïse & Boxing',70],['=HYPERLINK("https://evil.test")',40]]),buffer=Buffer.from(bytes);
  assert.equal(buffer.readUInt32LE(0),0x04034b50);assert.equal(buffer.readUInt32LE(buffer.length-22),0x06054b50);assert.equal(buffer.readUInt16LE(buffer.length-12),6);
  const text=buffer.toString('utf8');assert.match(text,/Éloïse &amp; Boxing/);assert.match(text,/<v>70<\/v>/);assert.match(text,/t="inlineStr"/);assert.ok(!text.includes('<f>'));assert.match(text,/state="frozen"/);
});
