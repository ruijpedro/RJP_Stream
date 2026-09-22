import fs from 'node:fs';
const required=[
  'index.html','src/app.js','src/styles.css','manifest.webmanifest','capacitor.config.ts',
  'assets/rjp-stream-icon.png','assets/icon-kitchen/android/res/mipmap-anydpi-v26/ic_launcher.xml','scripts/patch-android.mjs','docs/VPN_WIREGUARD.md'
];
let ok=true;
for(const f of required){ if(!fs.existsSync(f)){console.error('Falta:',f);ok=false;} }
const app=fs.readFileSync('src/app.js','utf8');
for(const needle of ["APP_VERSION = '1.2.1'",'parseM3U','driveSync','openPlayer','epgForItem','toggleVpn','driveSyncBridge','historyUpsert','recentHistoryItems','epgModal','RJP Stream']){
  if(!app.includes(needle)){console.error('app.js sem',needle);ok=false;}
}
const patch=fs.readFileSync('scripts/patch-android.mjs','utf8');
for(const needle of ['RJPVpnPlugin','com.wireguard.android:tunnel:1.0.20260102','AndroidKeyStore','IncludedApplications','RJPHttpPlugin','IconKitchen']){
  if(!patch.includes(needle)){console.error('patch Android sem',needle);ok=false;}
}
if(!ok) process.exit(1);
console.log('Smoke test RJP Stream V1.2.1 OK');
