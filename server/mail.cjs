'use strict';
const BC=require('../model.js');
const {randomUUID}=require('node:crypto');
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function recap(d,u){
  let text=`Coach : ${u.firstName} ${u.lastName}\nSociété / association : ${u.company}\nPériode : ${d.period}\nValidation : ${d.validatedAt}\n`;
  for(const target of BC.targets){const items=d.items.filter(c=>c.target===target.id);if(!items.length)continue;
    text+=`\n${target.club}${target.space?' · '+target.space:''}\n`+items.map(c=>`${c.date} · ${c.start}–${c.end} · ${c.name} · ${c.discipline} · ${BC.durationLabel(BC.duration(c))}`).join('\n');
    text+='\n'+BC.totals(items).map(x=>`${BC.durationLabel(x.minutes)} : ${x.count} cours`).join(' / ')+`\nTotal espace : ${items.length}\n`;
  }
  return text+'\nTOTAL GLOBAL\n'+BC.totals(d.items).map(x=>`${BC.durationLabel(x.minutes)} : ${x.count} cours`).join('\n')+`\nTotal : ${d.items.length} cours\nAucun montant ni facture n’est calculé.`;
}
function message(subject,text){return{subject,textContent:text,htmlContent:`<!doctype html><html lang="fr"><body><h1 style="font-size:22px;color:#101d35">Boxing Center</h1><pre style="white-space:pre-wrap;font:15px/1.7 Arial;color:#101d35">${escape(text)}</pre></body></html>`}}
async function queueDeclaration(store,d,u,cfg){for(const recipient of new Set([u.email,cfg.direction]))(await store.queue(randomUUID(),d.id,u.id,recipient,message(`Déclaration Boxing Center — ${d.period}`,recap(d,u))))}
async function dispatch(store,cfg,fetcher=fetch){
  if(cfg.mailMode!=='brevo')return;
  const row=(await store.transaction(async()=>{
    await store.sql.prepare("UPDATE outbox SET status='uncertain',last_error='Envoi interrompu : vérifier le journal d''envoi avant toute reprise.' WHERE status='sending' AND (sending_at IS NULL OR sending_at<?)").run(Date.now()-90000);
    await store.sql.prepare("UPDATE outbox SET status='expired',payload='{}' WHERE expires IS NOT NULL AND expires<? AND status IN ('pending','retry')").run(Date.now());
    const item=await store.sql.prepare("SELECT * FROM outbox WHERE status IN ('pending','retry') AND next_at<=? ORDER BY rowid LIMIT 1").get(Date.now());
    if(item)await store.sql.prepare("UPDATE outbox SET status='sending',attempts=attempts+1,sending_at=? WHERE id=?").run(Date.now(),item.id);return item;
  }));
  if(!row)return false;
  try{
    const response=await fetcher('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{'api-key':cfg.apiKey,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({...JSON.parse(row.payload),sender:{email:cfg.sender,name:cfg.senderName},to:[{email:row.recipient}],replyTo:{email:cfg.replyTo},headers:{'Idempotency-Key':row.id}}),signal:AbortSignal.timeout(15000)});
    if(!response.ok){const retry=response.status===429||response.status===503;const status=retry&&row.attempts<4?'retry':'failed';(await store.request(()=>store.sql.prepare('UPDATE outbox SET status=?,next_at=?,last_error=? WHERE id=?').run(status,Date.now()+60000*2**row.attempts,`Erreur serveur HTTP ${response.status}`,row.id)));return true}
    const data=await response.json();if(!data.messageId)throw Error('Réponse sans identifiant');
    await store.request(async()=>{await store.sql.prepare("UPDATE outbox SET status='accepted',message_id=?,last_error=NULL WHERE id=?").run(data.messageId,row.id);if(!row.decl_id)await store.sql.prepare("UPDATE outbox SET payload='{}' WHERE id=?").run(row.id)});
  }catch{await store.request(()=>store.sql.prepare("UPDATE outbox SET status='uncertain',last_error='Réponse inconnue : vérifier le journal d''envoi avant une nouvelle tentative.' WHERE id=?").run(row.id))}
  return true;
}
async function drain(store,cfg,fetcher=fetch,{limit=2}={}){let count=0;while(count<limit&&await dispatch(store,cfg,fetcher))count++;return count}
async function cleanup(store){await store.transaction(async()=>{const now=Date.now();await store.sql.prepare('DELETE FROM sessions WHERE expires<?').run(now);await store.sql.prepare('DELETE FROM resets WHERE expires<?').run(now);await store.sql.prepare('DELETE FROM limits WHERE expires<?').run(now);await store.sql.prepare("UPDATE outbox SET status='expired',payload='{}' WHERE expires IS NOT NULL AND expires<? AND status IN ('pending','retry')").run(now)})}
module.exports={recap,message,queueDeclaration,dispatch,drain,cleanup};
