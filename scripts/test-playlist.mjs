import fs from 'node:fs';
import assert from 'node:assert/strict';

const src=fs.readFileSync('src/app.js','utf8');
function section(from,to){
  const a=src.indexOf(from); if(a<0) throw new Error(`Falta ${from}`);
  const b=src.indexOf(to,a); if(b<0) throw new Error(`Falta ${to}`);
  return src.slice(a,b);
}
const code=[
  section('function normalizeText','function filteredItems'),
  section('function parseM3U','function playlistItemKey'),
  section('function playlistItemKey','function playlistPreviewModal'),
  section('function detectStreamType','function dedupeItems'),
  section('function dedupeItems','function upsertSource')
].join('\n');
const api=new Function(`${code}\nreturn {parseM3U,playlistItemKey,applySourceSelection,detectStreamType,dedupeItems};`)();
const demo=`#EXTM3U\n#EXTINF:-1 tvg-id="sport1" group-title="Desporto",Desporto 1\nhttps://example.test/sport1.m3u8\n#EXTINF:-1 group-title="Notícias",Notícias 24\nhttps://example.test/news.m3u8\n#EXTINF:-1 group-title="Desporto",Desporto 2\nhttps://example.test/sport2.mpd\n`;
const items=api.parseM3U(demo);
assert.equal(items.length,3);
assert.deepEqual([...new Set(items.map(x=>x.group))].sort(),['Desporto','Notícias']);
assert.equal(items[0].type,'HLS');
assert.equal(items[2].type,'DASH');
const selected=[api.playlistItemKey(items[0]),api.playlistItemKey(items[2])];
const subset=api.applySourceSelection(items,'subset',selected);
assert.equal(subset.length,2);
assert.equal(subset.every(x=>x.group==='Desporto'),true);
assert.equal(api.applySourceSelection(items,'all',[]).length,3);
console.log('Playlist analyzer tests RJP Stream V1.3 OK');
