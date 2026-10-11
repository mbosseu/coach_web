'use strict';
// Optional build tool. The original photographs and logo are never overwritten.
const sharp=require(process.env.ASSET_SHARP_MODULE||'sharp');
const path=require('node:path');
const fs=require('node:fs');
const assets=path.resolve(__dirname,'../assets');
(async()=>{for(const [input,output,width]of [['hero.jpeg','hero.webp',1600],['logo-officiel.png','logo-officiel.webp',440],['minime.png','minime.webp',900],['ramonville.png','ramonville.webp',900],['saint_cyprient.png','saint-cyprien.webp',900],['etat_unis.png','etats-unis.webp',900]]){
  const from=path.join(assets,input),to=path.join(assets,output);await sharp(from).rotate().resize({width,withoutEnlargement:true}).webp({quality:90}).toFile(to);
  const metadata=await sharp(to).metadata();console.log(`${output}: ${metadata.width}×${metadata.height}, ${fs.statSync(to).size} octets`);
}})().catch(e=>{console.error(e.message);process.exitCode=1});
