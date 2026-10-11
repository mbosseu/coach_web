'use strict';
const {config}=require('../server/config.cjs');
(async()=>{
  const cfg=config();if(!cfg.apiKey||!cfg.sender)throw Error('Configuration Brevo absente.');
  const response=await fetch('https://api.brevo.com/v3/senders',{headers:{'api-key':cfg.apiKey,Accept:'application/json'},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Object.assign(Error('Vérification Brevo refusée.'),{code:'BREVO_HTTP_'+response.status});
  const data=await response.json(),sender=(data.senders||[]).find(s=>s.email.toLowerCase()===cfg.sender.toLowerCase());
  console.log('Contrôle Brevo sans envoi :',JSON.stringify({senderConfigured:Boolean(sender),senderActive:sender?.active===true}));
  if(!sender?.active)process.exitCode=1;
})().catch(e=>{console.error('Vérification Brevo interrompue :',e.code||e.name);process.exitCode=1});
