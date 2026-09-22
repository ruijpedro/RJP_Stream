import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(), out=path.join(root,'dist');
fs.rmSync(out,{recursive:true,force:true}); fs.mkdirSync(out,{recursive:true});
for(const name of ['index.html','manifest.webmanifest','sw.js']) fs.copyFileSync(path.join(root,name),path.join(out,name));
for(const dir of ['src','assets']) fs.cpSync(path.join(root,dir),path.join(out,dir),{recursive:true});
console.log('RJP Stream V1.2.1 build concluído em dist/');
