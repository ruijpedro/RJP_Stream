/** RJP Stream V1.0 - Google Drive Bridge
 *  Deploy: Apps Script > Deploy > New deployment > Web app
 *  Execute as: Me. Access: Anyone (use a long secret token below).
 */
const RJP_STREAM_TOKEN = 'CHANGE-ME-LONG-RANDOM-TOKEN';
const MAX_FILE_BYTES = 5 * 1024 * 1024;

function doGet() {
  return json_({ok:true, service:'RJP Stream Drive Bridge', version:'1.0.0'});
}

function doPost(e) {
  try {
    const req = JSON.parse((e.postData && e.postData.contents) || '{}');
    if (!safeEq_(String(req.token || ''), RJP_STREAM_TOKEN)) throw new Error('Token inválido.');
    if (req.action !== 'sync') throw new Error('Ação desconhecida.');
    const folderName = String(req.folderName || 'RJP Stream');
    const roots = DriveApp.getFoldersByName(folderName);
    if (!roots.hasNext()) throw new Error('Pasta "' + folderName + '" não encontrada.');
    const root = roots.next();
    const sourcesFolder = childFolder_(root, ['sources','fontes']);
    const epgFolder = childFolder_(root, ['epg']);
    const configFolder = childFolder_(root, ['config']);
    const sourceBase = sourcesFolder || root;
    const sources = [];
    const files = sourceBase.getFiles();
    while (files.hasNext()) {
      const f = files.next();
      const n = f.getName();
      if (!/\.(m3u8?|json)$/i.test(n) || /^rjp-stream\.json$/i.test(n)) continue;
      if (f.getSize() > MAX_FILE_BYTES) continue;
      sources.push({id:f.getId(),name:n,type:/\.json$/i.test(n)?'JSON':'M3U',content:f.getBlob().getDataAsString('UTF-8'),modified:f.getLastUpdated().toISOString()});
    }
    let epg = null;
    if (epgFolder) {
      const ef = epgFolder.getFiles();
      while (ef.hasNext()) { const f=ef.next(); if (/\.(xml|xmltv)$/i.test(f.getName()) && f.getSize() <= MAX_FILE_BYTES) { epg={id:f.getId(),name:f.getName(),content:f.getBlob().getDataAsString('UTF-8')}; break; } }
    }
    let config = null;
    if (configFolder) {
      const cf=configFolder.getFilesByName('rjp-stream.json');
      if (cf.hasNext()) { const f=cf.next(); if(f.getSize()<=MAX_FILE_BYTES) config=JSON.parse(f.getBlob().getDataAsString('UTF-8')); }
    }
    return json_({ok:true,folder:root.getName(),sources:sources,epg:epg,config:config,generatedAt:new Date().toISOString()});
  } catch (err) { return json_({ok:false,error:String(err && err.message || err)}); }
}

function childFolder_(parent, names) {
  const it=parent.getFolders();
  while(it.hasNext()){ const f=it.next(); if(names.indexOf(f.getName().toLowerCase())>=0) return f; }
  return null;
}
function safeEq_(a,b){ if(a.length!==b.length)return false; let x=0; for(let i=0;i<a.length;i++) x|=a.charCodeAt(i)^b.charCodeAt(i); return x===0; }
function json_(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
