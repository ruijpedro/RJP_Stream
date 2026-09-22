import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const dist=path.join(root,'dist');
if(!fs.existsSync(dist)) throw new Error('Executa primeiro npm run build.');
const out=path.join(root,'tv-builds');
fs.rmSync(out,{recursive:true,force:true});
for(const target of ['tizen','webos']){
  const dir=path.join(out,target);
  fs.cpSync(dist,dir,{recursive:true});
  if(target==='tizen') fs.copyFileSync(path.join(root,'platforms/tizen/config.xml'),path.join(dir,'config.xml'));
  else fs.copyFileSync(path.join(root,'platforms/webos/appinfo.json'),path.join(dir,'appinfo.json'));
}
console.log('TV builds criados em tv-builds/tizen e tv-builds/webos.');
