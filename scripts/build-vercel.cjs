'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..'),destination=path.join(root,'public');
fs.mkdirSync(destination,{recursive:true});
// Explicit allowlist: never publish .env, server code, tests or local databases.
const allowed=new Set(['index.html','styles.css','login.css','theme-light.css','readability.css','final-audit.css','product-polish.css','compliance.css','schedule-data.js','model.js','frontend.js','export-utils.js']);
for(const name of fs.readdirSync(destination))if(!allowed.has(name)&&name!=='assets')throw Error('Fichier inattendu dans public : vérifier avant de publier.');
const existingAssets=path.join(destination,'assets');if(fs.existsSync(existingAssets))for(const name of fs.readdirSync(existingAssets))if(!/^[a-zA-Z0-9_.-]+\.(png|jpe?g|webp)$/.test(name))throw Error('Fichier inattendu dans public/assets : vérifier avant de publier.');
for(const name of allowed)fs.copyFileSync(path.join(root,name),path.join(destination,name));
fs.mkdirSync(path.join(destination,'assets'),{recursive:true});
for(const name of fs.readdirSync(path.join(root,'assets')).filter(n=>/^[a-zA-Z0-9_.-]+\.(png|jpe?g|webp)$/.test(n)))fs.copyFileSync(path.join(root,'assets',name),path.join(destination,'assets',name));
console.log('Frontend public préparé avec une liste de fichiers autorisés.');
