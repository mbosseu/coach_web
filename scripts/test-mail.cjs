'use strict';
// Explicit, once-only technical test. Never called by the application runtime.
const path=require('node:path');
const {config}=require('../server/config.cjs');
const {Store}=require('../server/store.cjs');
const {message,dispatch}=require('../server/mail.cjs');
(async()=>{
  if(process.argv[2]!=='--confirmed-direction-test')throw Error('Autorisation explicite requise pour le test à la direction.');
  const cfg=config();if(cfg.production)throw Error('Ce test local ne doit pas être exécuté en production.');
  const store=new Store(path.join(cfg.root,'output','tests','brevo-test.sqlite'));
  const id='boxing-brevo-configuration-test-2026-10-11';
  try{
    if(!store.sql.prepare('SELECT id FROM outbox WHERE id=?').get(id)){
      store.queue(id,null,null,cfg.direction,message('[TEST TECHNIQUE] Boxing Center — configuration Brevo',
        'Ce message unique vérifie la configuration d’envoi de la plateforme de validation des heures Boxing Center.\nIl ne correspond à aucune déclaration réelle et ne contient aucune donnée personnelle de coach.\nTest autorisé le 11 octobre 2026. Merci de confirmer sa réception.'));
      await dispatch(store,{...cfg,mailMode:'brevo'});
    }
    console.log(JSON.stringify(store.sql.prepare('SELECT recipient,status,message_id,last_error FROM outbox WHERE id=?').get(id)));
  }finally{store.close()}
})().catch(()=>{console.error('Test interrompu : vérifier la configuration privée et le journal Brevo avant toute nouvelle tentative.');process.exitCode=1});
