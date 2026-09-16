import fs from 'node:fs';
const required=[
  'index.html','src/app.js','src/styles.css','manifest.webmanifest','capacitor.config.ts',
  'assets/rjp-stream-icon.png','scripts/patch-android.mjs','docs/VPN_WIREGUARD.md'
];
let ok=true;
for(const f of required){ if(!fs.existsSync(f)){console.error('Falta:',f);ok=false;} }
const app=fs.readFileSync('src/app.js','utf8');
for(const needle of ["APP_VERSION = '0.3.1'",'parseM3U','driveSync','openPlayer','epgForItem','toggleVpn','RJP Stream']){
  if(!app.includes(needle)){console.error('app.js sem',needle);ok=false;}
}
const patch=fs.readFileSync('scripts/patch-android.mjs','utf8');
for(const needle of ['RJPVpnPlugin','com.wireguard.android:tunnel:1.0.20260102','AndroidKeyStore','IncludedApplications']){
  if(!patch.includes(needle)){console.error('patch Android sem',needle);ok=false;}
}
if(!ok) process.exit(1);
console.log('Smoke test RJP Stream V0.3.1 OK');
