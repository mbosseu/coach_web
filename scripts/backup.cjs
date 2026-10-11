'use strict';
const {config}=require('../server/config.cjs');
const Database=require('better-sqlite3');
const fs=require('node:fs');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
function backup(source,directory){
  if(!fs.existsSync(source))throw Error('Base source absente.');
  fs.mkdirSync(directory,{recursive:true,mode:0o700});
  const file=path.join(path.resolve(directory),`boxing-${new Date().toISOString().replace(/[:.]/g,'-')}-${randomUUID()}.sqlite`);
  const sql=new Database(source);try{if(sql.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Intégrité de la base incorrecte.');sql.prepare('VACUUM INTO ?').run(file)}finally{sql.close()}
  fs.chmodSync(file,0o600);const copy=new Database(file,{readonly:true});try{if(copy.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Sauvegarde invalide.')}finally{copy.close()}return file;
}
if(require.main===module){try{const cfg=config();console.log('Sauvegarde vérifiée :',backup(cfg.dbPath,cfg.backupDir))}catch(e){console.error(e.message);process.exitCode=1}}
module.exports={backup};
