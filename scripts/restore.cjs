'use strict';
const fs=require('node:fs');
const path=require('node:path');
const Database=require('better-sqlite3');
function restore(source,destination){
  const from=path.resolve(source),to=path.resolve(destination);
  if(!fs.statSync(from).isFile())throw Error('Sauvegarde absente.');
  if([to,to+'-wal',to+'-shm'].some(file=>fs.existsSync(file)))throw Error('Destination déjà utilisée : aucun fichier écrasé. Arrêtez le serveur et choisissez un nouveau chemin.');
  const copy=new Database(from,{readonly:true});try{if(copy.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Sauvegarde invalide.');fs.mkdirSync(path.dirname(to),{recursive:true,mode:0o700});copy.prepare('VACUUM INTO ?').run(to);fs.chmodSync(to,0o600)}finally{copy.close()}return to;
}
if(require.main===module){try{if(process.argv.length!==4)throw Error('Usage : node scripts/restore.cjs sauvegarde.sqlite nouvelle-base.sqlite');console.log('Base restaurée sans écrasement :',restore(process.argv[2],process.argv[3]))}catch(e){console.error(e.message);process.exitCode=1}}
module.exports={restore};
