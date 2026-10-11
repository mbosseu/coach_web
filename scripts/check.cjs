'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const files=['frontend.js','model.js','schedule-data.js','export-utils.js',...['server','scripts','tests'].flatMap(dir=>fs.readdirSync(path.join(root,dir)).filter(f=>/\.(cjs|js)$/.test(f)).map(f=>path.join(dir,f)))];
for(const file of files){const r=spawnSync(process.execPath,['--check',path.join(root,file)],{stdio:'inherit'});if(r.status!==0)process.exit(1)}console.log(`${files.length} fichiers JavaScript : syntaxe valide.`);
