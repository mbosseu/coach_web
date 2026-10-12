'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {startupDiagnostic}=require('../api/index.js');
test('Démarrage Vercel : diagnostic exploitable sans secret ni message fournisseur arbitraire',()=>{
  assert.equal(startupDiagnostic(Error('Installer Node 24.21 ou un correctif LTS 24 plus récent avant la production.')),'NODE_RUNTIME_TOO_OLD');
  assert.equal(startupDiagnostic(Error('Confirmer les six plannings officiels et leurs exceptions avant la production (SCHEDULES_CONFIRMED=true).')),'SCHEDULES_NOT_CONFIRMED');
  assert.equal(startupDiagnostic(Error('Configurer une reprise sécurisée de la file mail au moins chaque minute, puis MAIL_SCHEDULER_READY=true.')),'MAIL_SCHEDULER_NOT_READY');
  assert.equal(startupDiagnostic(Object.assign(Error('postgresql://private:password@host/db'),{code:'ECONNREFUSED'})),'ECONNREFUSED');
  assert.equal(startupDiagnostic(Object.assign(Error('private-token'),{code:'postgresql://private-token'})),'STARTUP_FAILED');
});
