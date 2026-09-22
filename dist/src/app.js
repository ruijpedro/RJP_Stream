const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const APP_VERSION = '1.2.1';
const STORAGE_KEY = 'rjpStreamStateV12';
const LEGACY_KEYS = ['rjpStreamStateV11','rjpStreamStateV10','rjpStreamStateV3','rjpStreamStateV2','rjpStreamState'];
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
const GIS_URL = 'https://accounts.google.com/gsi/client';
const HLS_JS_URL = 'https://cdn.jsdelivr.net/npm/hls.js@1.7.2/dist/hls.min.js';
const DASH_JS_URL = 'https://cdn.dashjs.org/v5.2.1/modern/umd/dash.all.min.js';

const NAV = [
  ['inicio','⌂','Início'], ['tv','▣','TV'], ['filmes','▶','Filmes'], ['series','▤','Séries'],
  ['futebol','⚽','Futebol'], ['fontes','⛓','Fontes'], ['favoritos','♡','Favoritos'], ['definicoes','⚙','Definições']
];

const demoCards = [
  ['Horizontes','T1 E3 · 42 min restantes',74], ['Cidade Sombria','Filme · 1h 12 min restantes',42],
  ['O Último Refúgio','T2 E5 · 18 min restantes',86], ['Planeta Azul','Documentário · 25 min restantes',31]
];
const featured = [
  ['Nova Era','Série'],['O Explorador','Filme'],['Vidas Reais','Documentário'],['Zona Neutra','Série'],['O Regresso','Filme'],['Mundos Distantes','Documentário']
];

const defaultState = {
  version: APP_VERSION,
  page: 'inicio',
  vpn: false,
  vpnSplitOnly: true,
  sources: [],
  webProviders: [],
  epg: null,
  wireguard: null,
  favorites: [],
  favoriteItems: [],
  history: [],
  footballGames: [],
  layout: 'auto',
  channelSearch: '',
  sourceSearch: '',
  autoRefreshMinutes: 60,
  lastAutoRefresh: null,
  drive: {
    clientId: '',
    folderName: 'RJP Stream',
    bridgeUrl: '',
    bridgeToken: '',
    connected: false,
    account: '',
    lastSync: null,
    lastError: ''
  }
};

function safeParse(raw, fallback = null){
  try { return JSON.parse(raw); } catch { return fallback; }
}

const persisted = safeParse(localStorage.getItem(STORAGE_KEY), null)
  || LEGACY_KEYS.map(k=>safeParse(localStorage.getItem(k), null)).find(Boolean)
  || null;
const state = deepMerge(structuredCloneSafe(defaultState), migrateLegacy(persisted) || {});
state.version = APP_VERSION;

let driveAccessToken = sessionStorage.getItem('rjpDriveToken') || '';
let activeHls = null;
let activeDash = null;
let playerCleanup = null;

function structuredCloneSafe(obj){ return JSON.parse(JSON.stringify(obj)); }
function deepMerge(base, extra){
  if(!extra || typeof extra !== 'object') return base;
  for(const [k,v] of Object.entries(extra)){
    if(v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) base[k] = deepMerge(base[k], v);
    else base[k] = v;
  }
  return base;
}
function migrateLegacy(old){
  if(!old) return null;
  return {
    ...old,
    vpnSplitOnly: old.vpnSplitOnly ?? true,
    autoRefreshMinutes: Number.isFinite(+old.autoRefreshMinutes) ? +old.autoRefreshMinutes : 60,
    history: Array.isArray(old.history) ? old.history.slice(0,100) : [],
    webProviders: Array.isArray(old.webProviders) ? old.webProviders : [],
    drive: {
      ...defaultState.drive,
      ...(old.drive || {}),
      connected: old.drive?.connected ?? !!old.driveConnected
    },
    version: APP_VERSION
  };
}
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function deviceProfile(){
  const w = window.innerWidth, h = window.innerHeight;
  const ua = navigator.userAgent.toLowerCase();
  const tvUA = /smart-tv|smarttv|hbbtv|tizen|web0s|webos|aftb|aftt|googletv|android tv/.test(ua);
  const coarse = globalThis.matchMedia?.('(pointer: coarse)')?.matches;
  const overridden = state.layout !== 'auto' ? state.layout : null;
  if(overridden === 'compact') return {mode:'mobile', label:'Compacto', columns:2};
  if(overridden === 'normal') return {mode:w >= 900 ? 'tablet' : 'mobile', label:'Normal', columns:w >= 900 ? 5 : 3};
  if(overridden === 'tv') return {mode:'tv', label:'TV à distância', columns:w >= 1900 ? 10 : 7};
  if(tvUA || (w >= 1280 && h >= 700 && coarse)) return {mode:'tv', label:'TV / ecrã grande', columns:w >= 1900 ? 10 : 7};
  if(w >= 760) return {mode:'tablet', label:'Tablet', columns:w >= 1200 ? 6 : 4};
  return {mode:'mobile', label:'Telemóvel', columns:2};
}

function layout(){
  const profile = deviceProfile();
  document.documentElement.dataset.layout = profile.mode;
  document.documentElement.dataset.layoutPreference = state.layout || 'auto';
  $('#app').innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand"><img src="assets/rjp-stream-icon.png" alt="RJP Stream"><div><strong>RJP Stream</strong><small>${profile.label}</small></div></div>
        <nav class="nav">${NAV.map(([id,ico,label])=>`<button data-nav="${id}" class="${state.page===id?'active':''}"><span class="ico">${ico}</span><span class="label">${label}</span></button>`).join('')}</nav>
        <div class="side-bottom">
          <div class="status-chip"><span><span class="status-dot ${state.vpn?'':'off'}"></span> <span>VPN</span></span><b>${state.vpn?'ON':'OFF'}</b></div>
          <div class="status-chip"><span>☁ <span>Drive</span></span><b>${state.drive.connected?'OK':'—'}</b></div>
          <small class="version">v${APP_VERSION}</small>
        </div>
      </aside>
      <main class="main">
        <header class="topbar">
          <div><div class="eyebrow">RJP STREAM</div><h1>${NAV.find(x=>x[0]===state.page)?.[2] || 'Início'}</h1></div>
          <div class="topbar-actions">
            <button class="pill ${state.vpn?'on':''}" id="vpnQuick">🔒 <span class="text">VPN ${state.vpn?'Ligada':'Desligada'}</span></button>
            <button class="pill ${state.drive.connected?'on':''}" id="driveQuick">☁ <span class="text">Drive ${state.drive.connected?'ligado':'não ligado'}</span></button>
            <button class="pill" id="globalSearchBtn" title="Pesquisar">⌕</button>
          </div>
        </header>
        <section class="page">${renderPage()}</section>
      </main>
      <nav class="mobile-nav">
        ${[['inicio','⌂','Início'],['tv','▣','TV'],['filmes','▶','Explorar'],['fontes','⛓','Fontes'],['definicoes','☰','Mais']].map(([id,ico,label])=>`<button data-nav="${id}" class="${state.page===id?'active':''}"><span class="mi">${ico}</span><span>${label}</span></button>`).join('')}
      </nav>
    </div>`;
  bindCommon();
}

function renderPage(){
  switch(state.page){
    case 'fontes': return sourcesPage();
    case 'futebol': return footballPage();
    case 'definicoes': return settingsPage();
    case 'tv': return libraryPage('TV ao vivo','📺',['Todos os canais','Notícias','Desporto','Entretenimento','Infantil','Documentários','Música']);
    case 'filmes': return libraryPage('Filmes','🎬',['Ação','Drama','Comédia','Documentários','Ficção Científica','Família']);
    case 'series': return libraryPage('Séries','📚',['Populares','Novas temporadas','Drama','Comédia','Crime','Documentário']);
    case 'favoritos': return favoritesPage();
    default: return homePage();
  }
}

function homePage(){
  const stats = sourceStats();
  const items = activeItems();
  const recent = recentHistoryItems(8);
  const favs = (state.favoriteItems||[]).slice(0,8);
  const hero = recent[0] || favs[0] || items[0] || null;
  const groups=[...new Set(items.map(x=>x.group).filter(Boolean))].slice(0,7);
  const heroHtml = hero ? `
      <div class="hero-copy"><div class="eyebrow">PRONTO A REPRODUZIR</div><h2>${escapeHtml(hero.name||'Stream')}</h2><p>${escapeHtml(hero.group||hero.type||'Da tua biblioteca')}</p><div class="hero-actions"><button class="btn primary" data-stream="${encodeURIComponent(hero.url||'')}" data-stream-type="${escapeHtml(hero.type||detectStreamType(hero.url||''))}" data-stream-name="${escapeHtml(hero.name||'Stream')}" data-stream-group="${escapeHtml(hero.group||'')}" data-stream-logo="${escapeHtml(hero.logo||'')}">▶ Ver agora</button><button class="btn" data-nav="fontes">＋ Gerir fontes</button></div></div>` : `
      <div class="hero-copy"><div class="eyebrow">RJP STREAM</div><h2>A tua biblioteca, num só lugar</h2><p>Adiciona uma fonte M3U/M3U8, HLS, DASH, JSON/RJP Bundle ou sincroniza o Google Drive para começar.</p><div class="hero-actions"><button class="btn primary" data-nav="fontes">＋ Adicionar fonte</button><button class="btn" data-nav="definicoes">⚙ Configurar</button></div></div>`;
  return `
    <div class="hero">
      <div class="hero-main">${heroHtml}</div>
      <div class="hero-side">
        <div class="panel"><h3>Futebol</h3><div class="live-score"><span class="live-badge">GUIA</span><div class="score">Onde ver</div><small>Broadcasters oficiais por região</small></div><button class="btn primary full" data-nav="futebol">Abrir futebol</button></div>
        <div class="panel"><h3>Minhas Fontes</h3><div class="kpi-grid two"><div class="kpi"><b>${stats.sources}</b><small>Fontes</small></div><div class="kpi"><b>${stats.items}</b><small>Itens</small></div></div><button class="btn full" data-nav="fontes">Gerir fontes</button></div>
      </div>
    </div>
    ${recent.length ? streamSection('Recentemente reproduzidos',recent,'O histórico é guardado apenas neste dispositivo.') : ''}
    ${favs.length ? streamSection('Favoritos',favs,'Acesso rápido aos teus canais e streams guardados.') : ''}
    ${items.length ? streamSection('Da tua biblioteca',items.slice(0,12),'Conteúdo das fontes ativas.') : onboardingSection()}
    <div class="section"><div class="section-head"><div><h2>TV ao vivo</h2><div class="sub">Categorias das tuas fontes</div></div></div><div class="category-grid">${(groups.length?groups:['Todos os canais']).map(label=>`<button class="cat" data-home-group="${escapeHtml(label==='Todos os canais'?'':label)}"><span>📺</span><span>${escapeHtml(label)}</span></button>`).join('')}</div></div>`;
}

function onboardingSection(){
  return `<div class="section panel onboarding"><div class="section-head"><div><h2>Começar</h2><div class="sub">Ainda não existem itens ativos.</div></div></div><div class="source-actions compact-actions"><button class="source-action" data-nav="fontes"><span class="bigicon">📄</span><b>Adicionar fontes</b><small>M3U, HLS, DASH, JSON ou URL</small></button><button class="source-action" id="homeDriveSetup"><span class="bigicon">☁</span><b>Google Drive</b><small>Sincronizar a pasta RJP Stream</small></button></div></div>`;
}

function streamSection(title, items, subtitle=''){
  const cards=items.slice(0,12).map(x=>streamCard(x)).join('');
  return `<div class="section"><div class="section-head"><div><h2>${escapeHtml(title)}</h2><div class="sub">${escapeHtml(subtitle)}</div></div></div><div class="cards">${cards}</div></div>`;
}

function streamCard(x){
  const url=x.url||''; const epg=epgForItem(x); const logo=x.logo||epg?.channel?.logo||'';
  const rec=(state.history||[]).find(h=>h.url===url);
  const pct=rec?.duration>0 && Number.isFinite(rec.duration) ? Math.max(0,Math.min(100,(rec.position/rec.duration)*100)) : 0;
  const isFav=url && state.favoriteItems.some(f=>f.url===url);
  return `<article class="media-card channel-card ${epg?.now?'has-epg':''}" tabindex="0" data-stream="${encodeURIComponent(url)}" data-stream-type="${escapeHtml(x.type||detectStreamType(url))}" data-stream-name="${escapeHtml(x.name||'Stream')}" data-stream-group="${escapeHtml(x.group||'')}" data-stream-logo="${escapeHtml(logo)}">${url?`<button class="fav-btn ${isFav?'on':''}" data-fav-url="${encodeURIComponent(url)}" data-fav-name="${escapeHtml(x.name||'Stream')}" data-fav-type="${escapeHtml(x.type||detectStreamType(url))}" data-fav-group="${escapeHtml(x.group||'')}" data-fav-logo="${escapeHtml(logo)}" title="Favorito">${isFav?'★':'☆'}</button>`:''}${logo?`<img class="channel-logo" src="${escapeHtml(logo)}" alt="" referrerpolicy="no-referrer">`:''}<strong>${escapeHtml(x.name||'Stream')}</strong><small>${escapeHtml(epg?.now?.title||x.group||x.type||'')}</small>${pct>1&&pct<99?`<div class="progress"><i style="width:${pct.toFixed(1)}%"></i></div>`:''}</article>`;
}

function recentHistoryItems(limit=12){
  return (state.history||[]).slice().sort((a,b)=>new Date(b.lastPlayed||0)-new Date(a.lastPlayed||0)).filter(x=>x.url).slice(0,limit);
}

function mediaSection(title, cards, progress, target='filmes'){
  return `<div class="section"><div class="section-head"><div><h2>${title}</h2><div class="sub">Conteúdo de demonstração</div></div><button class="btn" data-nav="${target}">Ver todos</button></div><div class="cards">${cards.map(([name,meta,p],i)=>`<article class="media-card" tabindex="0" data-demo-card="${escapeHtml(name)}" style="background:linear-gradient(${130+i*13}deg,#${['123258','1b2d43','143a43','26264d','2b2840','173653'][i%6]},#08131f)"><strong>${name}</strong><small>${meta}</small>${progress?`<div class="progress"><i style="width:${p}%"></i></div>`:''}</article>`).join('')}</div></div>`;
}

function activeItems(){ return state.sources.filter(s=>s.enabled!==false).flatMap(s=>s.items || []); }
function sourceStats(){
  const enabled = state.sources.filter(s=>s.enabled!==false);
  return {sources: state.sources.length, enabled: enabled.length, items: enabled.reduce((n,s)=>n+(s.items?.length||0),0)};
}
function normalizeText(s=''){ return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
function filteredItems(){
  const q = normalizeText(state.channelSearch || '');
  const items = activeItems();
  if(!q) return items;
  return items.filter(x=>normalizeText(`${x.name||''} ${x.group||''} ${x.tvgId||''}`).includes(q));
}

function libraryPage(title, icon, cats){
  const sourceChannels = filteredItems().slice(0,100);
  const groups = [...new Set(activeItems().map(x=>x.group).filter(Boolean))].slice(0,10);
  return `<div class="panel"><div class="section-head"><div><h2>${icon} ${title}</h2><div class="sub">${sourceChannels.length ? `${sourceChannels.length} item(ns) visíveis` : 'Importa uma fonte para preencher esta área'}</div></div><button class="btn primary" data-nav="fontes">＋ Fonte</button></div>
    <div class="searchbar"><input id="channelSearch" value="${escapeHtml(state.channelSearch)}" placeholder="Pesquisar canais, grupos ou títulos…"><button class="btn" id="clearChannelSearch">Limpar</button></div>
    <div class="category-grid">${(groups.length?groups:cats).map(c=>`<button class="cat" data-group-filter="${escapeHtml(c)}"><span>${icon}</span><span>${escapeHtml(c)}</span></button>`).join('')}</div></div>
  <div class="section"><div class="section-head"><div><h2>Da tua biblioteca</h2><div class="sub">Mostramos no máximo 100 itens de cada vez para manter a interface leve.</div></div></div><div class="cards">${(sourceChannels.length?sourceChannels:featured).map((x,i)=>{
      const sourceMode = sourceChannels.length>0;
      const n=sourceMode?x.name:x[0], epg=sourceMode?epgForItem(x):null, m=sourceMode?(x.group||x.type||'Canal'):x[1];
      const url=sourceMode?x.url||'':'';
      const logo=sourceMode?(x.logo||epg?.channel?.logo||''):'';
      const epgHtml=epg?.now?`<div class="epg-now">Agora: ${escapeHtml(epg.now.title)}${epg.next?.title?`<span>Depois: ${escapeHtml(epg.next.title)}</span>`:''}</div><div class="epg-progress"><i style="width:${epg.progress.toFixed(1)}%"></i></div>`:'';
      const isFav=url && state.favoriteItems.some(f=>f.url===url);
      return `<article class="media-card channel-card ${epg?.now?'has-epg':''}" tabindex="0" ${url?`data-stream="${encodeURIComponent(url)}" data-stream-type="${escapeHtml(x.type||detectStreamType(url))}" data-stream-name="${escapeHtml(n)}" data-stream-group="${escapeHtml(m)}" data-stream-logo="${escapeHtml(logo)}"`:''}>${url?`<button class="fav-btn ${isFav?'on':''}" data-fav-url="${encodeURIComponent(url)}" data-fav-name="${escapeHtml(n)}" data-fav-type="${escapeHtml(x.type||detectStreamType(url))}" data-fav-group="${escapeHtml(m)}" data-fav-logo="${escapeHtml(logo)}" title="Favorito">${isFav?'★':'☆'}</button>`:''}${logo?`<img class="channel-logo" src="${escapeHtml(logo)}" alt="" referrerpolicy="no-referrer">`:''}<strong>${escapeHtml(n)}</strong><small>${escapeHtml(m)}</small>${epgHtml}${x.tvgId?`<span class="micro tvg-id">${escapeHtml(x.tvgId)}</span>`:''}</article>`;
    }).join('')}</div></div>`;
}

function sourcesPage(){
  const stats = sourceStats();
  const q = normalizeText(state.sourceSearch || '');
  const visibleSources = q ? state.sources.filter(s=>normalizeText(`${s.name} ${s.type} ${s.origin}`).includes(q)) : state.sources;
  return `
  <div class="panel">
    <div class="section-head"><div><h2>Minhas Fontes</h2><div class="sub">M3U/M3U8, HLS, DASH, JSON/RJP Bundle, EPG, Google Drive e atalhos Web personalizados.</div></div><div class="button-row"><button class="btn" id="refreshAll">↻ Atualizar</button><button class="btn primary" id="addUrl">＋ Adicionar URL</button></div></div>
    <div class="source-actions">
      <button class="source-action" id="importM3U"><span class="bigicon">📄</span><b>Importar M3U</b><small>Ficheiro .m3u ou .m3u8</small></button>
      <button class="source-action" id="addDirect"><span class="bigicon">🔗</span><b>URL / HLS / DASH</b><small>Stream ou playlist remota</small></button>
      <button class="source-action" id="importBundle"><span class="bigicon">🧩</span><b>RJP Bundle / JSON</b><small>Catálogos e listas JSON</small></button>
      <button class="source-action" id="importEpg"><span class="bigicon">🗓</span><b>EPG / XMLTV</b><small>Guia de programação</small></button>
      <button class="source-action" id="addWebProvider"><span class="bigicon">🌐</span><b>Atalho Web</b><small>Adicionar manualmente um portal/serviço</small></button>
      <button class="source-action" id="driveSetup"><span class="bigicon">☁</span><b>Google Drive</b><small>${state.drive.connected?'Ligado · sincronizar':'Ler pasta RJP Stream'}</small></button>
      <button class="source-action" id="backupMenu"><span class="bigicon">💾</span><b>Backup</b><small>Exportar/importar configuração</small></button>
    </div>
    <div class="kpi-grid"><div class="kpi"><b>${stats.sources}</b><small>Fontes guardadas</small></div><div class="kpi"><b>${stats.enabled}</b><small>Fontes ativas</small></div><div class="kpi"><b>${stats.items}</b><small>Itens carregados</small></div><div class="kpi"><b>${state.epg?.channels||0}</b><small>Canais no EPG</small></div></div>
  </div>
  <div class="section"><div class="section-head"><div><h2>Fontes</h2><div class="sub">Ativar, atualizar, editar ou remover sem reinstalar a app.</div></div></div>
    <div class="searchbar"><input id="sourceSearch" value="${escapeHtml(state.sourceSearch)}" placeholder="Pesquisar fonte…"><button class="btn" id="clearSourceSearch">Limpar</button></div>
    <div class="list">${visibleSources.length?visibleSources.map(sourceRow).join(''):'<div class="panel empty"><p>Ainda não existem fontes. Usa uma das opções acima.</p></div>'}</div></div>
  <div class="section"><div class="section-head"><div><h2>Atalhos Web pessoais</h2><div class="sub">Links adicionados manualmente por ti. A RJP Stream não os descobre nem valida como fornecedores de conteúdo.</div></div><button class="btn" id="addWebProvider2">＋ Adicionar</button></div>
    <div class="list">${(state.webProviders||[]).length?(state.webProviders||[]).map(webProviderRow).join(''):'<div class="panel empty"><p>Sem atalhos Web. Podes adicionar um nome e uma URL manualmente.</p></div>'}</div></div>`;
}

function sourceRow(s){
  const last = s.lastSync ? new Date(s.lastSync).toLocaleString('pt-PT') : 'Nunca';
  return `<div class="list-row source-row"><div class="source-symbol">${s.type==='M3U'?'📺':s.type==='JSON'?'🧩':s.originType==='drive'?'☁':'🔗'}</div><div><b>${escapeHtml(s.name)}</b><div class="meta">${escapeHtml(s.type)} · ${s.items?.length||1} item(ns) · ${escapeHtml(shortOrigin(s.origin||'Local'))}</div><div class="micro">Última atualização: ${escapeHtml(last)} ${s.lastStatus?`· ${escapeHtml(s.lastStatus)}`:''}</div></div><div class="row-actions"><button class="icon-btn" data-edit-source="${s.id}" title="Editar">✎</button><button class="icon-btn" data-refresh-source="${s.id}" title="Atualizar">↻</button><button class="toggle ${s.enabled!==false?'on':''}" data-toggle-source="${s.id}" aria-label="Ativar/desativar"><i></i></button><button class="icon-btn" data-delete-source="${s.id}" title="Remover">✕</button></div></div>`;
}

function webProviderRow(p){
  const last=p.addedAt?new Date(p.addedAt).toLocaleDateString('pt-PT'):'—';
  return `<div class="list-row source-row"><div class="source-symbol">🌐</div><div><b>${escapeHtml(p.name||'Atalho Web')}</b><div class="meta">WEB · ${escapeHtml(shortOrigin(p.url||''))}</div><div class="micro">Adicionado: ${escapeHtml(last)}</div></div><div class="row-actions"><button class="icon-btn" data-open-web-provider="${p.id}" title="Abrir">↗</button><button class="icon-btn" data-edit-web-provider="${p.id}" title="Editar">✎</button><button class="icon-btn" data-delete-web-provider="${p.id}" title="Remover">✕</button></div></div>`;
}

function webProviderModal(id=''){
  const existing=(state.webProviders||[]).find(x=>x.id===id) || null;
  modal(`<div class="modal-head"><h3>${existing?'Editar':'Adicionar'} atalho Web</h3><button class="icon-btn" data-close>✕</button></div><div class="field"><label>Nome</label><input id="webProviderName" value="${escapeHtml(existing?.name||'')}" placeholder="Ex.: Portal pessoal"></div><div class="field top-gap"><label>URL</label><input id="webProviderUrl" value="${escapeHtml(existing?.url||'')}" placeholder="https://..."></div><div class="note top-gap">Este campo guarda apenas um atalho introduzido manualmente. Não existe descoberta automática, extração de streams, bypass de DRM ou autenticação.</div><button class="btn primary top-gap" id="saveWebProvider">Guardar</button>`);
  $('#saveWebProvider').addEventListener('click',()=>{
    const name=$('#webProviderName').value.trim()||'Atalho Web';
    const url=$('#webProviderUrl').value.trim();
    if(!/^https?:\/\//i.test(url)) return toast('Introduz uma URL http/https válida.');
    state.webProviders=state.webProviders||[];
    if(existing) Object.assign(existing,{name,url});
    else state.webProviders.push({id:randomId(),name,url,addedAt:new Date().toISOString()});
    save();closeModal();layout();toast('Atalho Web guardado.');
  });
}

function openWebProvider(id){
  const p=(state.webProviders||[]).find(x=>x.id===id); if(!p?.url) return;
  window.open(p.url,'_blank','noopener,noreferrer');
}

function deleteWebProvider(id){
  const p=(state.webProviders||[]).find(x=>x.id===id); if(!p) return;
  modal(`<div class="modal-head"><h3>Remover atalho</h3><button class="icon-btn" data-close>✕</button></div><p>Queres remover <b>${escapeHtml(p.name||'Atalho Web')}</b>?</p><div class="button-row"><button class="btn danger" id="confirmDeleteWebProvider">Remover</button><button class="btn" data-close>Cancelar</button></div>`);
  $('#confirmDeleteWebProvider').addEventListener('click',()=>{state.webProviders=(state.webProviders||[]).filter(x=>x.id!==id);save();closeModal();layout();});
}

function footballPage(){
  const games=(state.footballGames||[]).slice().sort((a,b)=>new Date(a.kickoff||0)-new Date(b.kickoff||0));
  const cards=games.length?games.map((g,i)=>{
    const when=g.kickoff?new Date(g.kickoff).toLocaleString('pt-PT',{dateStyle:'short',timeStyle:'short'}):'Hora por definir';
    const bc=(g.broadcasters||[]).map((b,j)=>`<button class="country broadcaster" data-broadcaster-url="${escapeHtml(b.url||'')}" ${b.url?'':'disabled'}><b>${escapeHtml((b.flag?b.flag+' ':'')+(b.country||'Região'))}</b><span class="channel">${escapeHtml(b.name||b.channel||'—')}</span><span class="pill">${escapeHtml(b.quality||'TV')}</span></button>`).join('');
    return `<div class="panel game-card"><div class="section-head"><div><div class="eyebrow">${escapeHtml(g.competition||'FUTEBOL')}</div><h2>${escapeHtml(g.home||'Casa')} × ${escapeHtml(g.away||'Fora')}</h2><div class="sub">${escapeHtml(when)}${g.venue?` · ${escapeHtml(g.venue)}`:''}</div></div><span class="pill ${g.status==='live'?'on':''}">${g.status==='live'?'AO VIVO':'AGENDADO'}</span></div><div class="country-list">${bc||'<div class="note">Sem broadcasters adicionados para este jogo.</div>'}</div></div>`;
  }).join(''):`<div class="panel empty"><h2>⚽ Guia de futebol</h2><p class="muted">Ainda não há jogos carregados. Importa um guia JSON local ou coloca <code>footballGames</code> em <code>config/rjp-stream.json</code> no Google Drive.</p></div>`;
  return `<div class="hero football-hero"><div class="hero-main short"><div class="hero-copy"><div class="eyebrow">FUTEBOL</div><h2>Onde ver</h2><p>Guia de jogos e broadcasters por país/região. Os dados podem vir do teu Drive ou de um ficheiro JSON.</p><div class="hero-actions"><button class="btn primary" id="importFootballGuide">⬆ Importar guia</button><button class="btn" id="footballExample">Ver formato JSON</button></div></div></div><div class="panel"><h3>Resumo</h3><div class="kpi-grid two"><div class="kpi"><b>${games.length}</b><small>Jogos</small></div><div class="kpi"><b>${games.reduce((n,g)=>n+(g.broadcasters?.length||0),0)}</b><small>Broadcasters</small></div></div></div></div><div class="section"><div class="section-head"><div><h2>Jogos</h2><div class="sub">Os direitos de transmissão variam por território; confirma sempre no broadcaster oficial.</div></div></div><div class="list football-list">${cards}</div></div>`;
}

function favoritesPage(){
  const favs=state.favoriteItems||[];
  return `<div class="section-head"><div><h2>♡ Favoritos</h2><div class="sub">Guardados neste dispositivo.</div></div></div>${favs.length?`<div class="cards">${favs.map(streamCard).join('')}</div>`:'<div class="panel empty"><p>Ainda não guardaste canais/streams favoritos.</p></div>'}`;
}

function settingsPage(){
  const p = deviceProfile();
  return `<div class="kpi-grid"><div class="kpi"><b>${p.label}</b><small>Layout detetado</small></div><div class="kpi"><b>${window.innerWidth}×${window.innerHeight}</b><small>Área útil CSS</small></div><div class="kpi"><b>${window.devicePixelRatio || 1}×</b><small>Densidade de píxeis</small></div><div class="kpi"><b>${APP_VERSION}</b><small>Versão</small></div></div>
  <div class="section panel"><h2 class="panel-title">Interface e atualização</h2><div class="form-grid"><div class="field"><label>Modo</label><select id="layoutMode"><option value="auto" ${state.layout==='auto'?'selected':''}>Automático</option><option value="compact" ${state.layout==='compact'?'selected':''}>Compacto</option><option value="normal" ${state.layout==='normal'?'selected':''}>Normal</option><option value="tv" ${state.layout==='tv'?'selected':''}>TV à distância</option></select></div><div class="field"><label>Pasta Google Drive</label><input id="driveFolder" value="${escapeHtml(state.drive.folderName||'RJP Stream')}" /></div><div class="field"><label>Atualização automática de fontes</label><select id="autoRefresh"><option value="0" ${+state.autoRefreshMinutes===0?'selected':''}>Desativada</option><option value="15" ${+state.autoRefreshMinutes===15?'selected':''}>15 minutos</option><option value="30" ${+state.autoRefreshMinutes===30?'selected':''}>30 minutos</option><option value="60" ${+state.autoRefreshMinutes===60?'selected':''}>1 hora</option><option value="180" ${+state.autoRefreshMinutes===180?'selected':''}>3 horas</option><option value="360" ${+state.autoRefreshMinutes===360?'selected':''}>6 horas</option></select></div><div class="field"><label>Última atualização automática</label><input value="${state.lastAutoRefresh?new Date(state.lastAutoRefresh).toLocaleString('pt-PT'):'—'}" disabled></div></div></div>
  <div class="section panel"><div class="section-head"><div><h2>Google Drive</h2><div class="sub">Liga a tua própria credencial OAuth e sincroniza M3U/JSON/EPG a partir da pasta escolhida.</div></div><button class="btn ${state.drive.connected?'primary':''}" id="driveSettingsBtn">${state.drive.connected?'Sincronizar':'Configurar Drive'}</button></div><div class="status-grid"><div><span>Estado</span><b>${state.drive.connected?'Ligado':'Desligado'}</b></div><div><span>Última sync</span><b>${state.drive.lastSync?new Date(state.drive.lastSync).toLocaleString('pt-PT'):'—'}</b></div></div></div>
  <div class="section panel"><div class="section-head"><div><h2>VPN WireGuard</h2><div class="sub">No APK Android/Android TV a V1.2.1 usa o túnel WireGuard nativo. No browser, Samsung e LG esta opção fica apenas informativa.</div></div><button class="btn ${state.vpn?'primary':''}" id="vpnToggle">${state.vpn?'Desligar':'Ligar'} VPN</button></div><div class="form-grid"><div class="field"><label>Encaminhamento</label><select id="vpnScope"><option value="app" ${state.vpnSplitOnly?'selected':''}>Só RJP Stream</option><option value="device" ${!state.vpnSplitOnly?'selected':''}>Todo o dispositivo</option></select></div><div class="field"><label>Motor</label><input value="${nativeVpnAvailable()?'WireGuard Android nativo':'Indisponível nesta plataforma'}" disabled></div></div><div class="source-actions compact-actions"><button class="source-action" id="importWG"><span class="bigicon">🛡</span><b>Importar WireGuard</b><small>${state.wireguard?escapeHtml(state.wireguard.name):'Ficheiro .conf'}</small></button><button class="source-action" id="backupMenu2"><span class="bigicon">💾</span><b>Backup</b><small>Guardar fontes e definições</small></button><button class="source-action" id="clearHistory"><span class="bigicon">🕘</span><b>Limpar histórico</b><small>${(state.history||[]).length} item(ns) reproduzidos</small></button></div><div class="note">A configuração WireGuard é guardada cifrada pelo Android Keystore no APK. O backup web não exporta a chave privada. Samsung Tizen e LG webOS não expõem às apps comuns uma VPN de sistema equivalente ao Android VpnService.</div></div>`;
}

function bindCommon(){
  $$('[data-nav]').forEach(el=>el.addEventListener('click',()=>{state.page=el.dataset.nav; save(); layout(); window.scrollTo({top:0,behavior:'smooth'});}));
  $('#vpnQuick')?.addEventListener('click',toggleVpn);
  $('#driveQuick')?.addEventListener('click',()=>{state.page='fontes'; save(); layout(); setTimeout(()=>$('#driveSetup')?.click(),60);});
  $('#globalSearchBtn')?.addEventListener('click', globalSearchModal);
  $$('[data-home-group]').forEach(el=>el.addEventListener('click',()=>{state.page='tv';state.channelSearch=el.dataset.homeGroup||'';save();layout();}));
  $$('[data-stream]').forEach(el=>el.addEventListener('click',()=>openStreamElement(el)));
  $('#homeDriveSetup')?.addEventListener('click',driveModal);
  $('#channelSearch')?.addEventListener('input',debounce(e=>{state.channelSearch=e.target.value; save(); layout();},220));
  $('#clearChannelSearch')?.addEventListener('click',()=>{state.channelSearch='';save();layout();});
  $$('[data-group-filter]').forEach(b=>b.addEventListener('click',()=>{state.channelSearch=b.dataset.groupFilter||'';save();layout();}));
  $$('[data-fav-url]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();toggleFavoriteItem(b);}));
  $('#importFootballGuide')?.addEventListener('click',()=>$('#footballFileInput').click());
  $('#footballExample')?.addEventListener('click',footballExampleModal);
  $$('[data-broadcaster-url]').forEach(b=>b.addEventListener('click',()=>{const u=b.dataset.broadcasterUrl;if(u) window.open(u,'_blank','noopener,noreferrer');}));
  bindSources();
  bindSettings();
}

function toggleFavoriteItem(button){
  const url=decodeURIComponent(button.dataset.favUrl||''); if(!url) return;
  const i=state.favoriteItems.findIndex(x=>x.url===url);
  if(i>=0){state.favoriteItems.splice(i,1);toast('Removido dos favoritos.');}
  else{state.favoriteItems.push({url,name:button.dataset.favName||button.closest('.media-card')?.querySelector('strong')?.textContent||'Favorito',type:button.dataset.favType||'URL',group:button.dataset.favGroup||'',logo:button.dataset.favLogo||''});toast('Adicionado aos favoritos.');}
  save();layout();
}
function footballExampleModal(){
  const sample={games:[{home:'Equipa A',away:'Equipa B',competition:'Liga',kickoff:new Date(Date.now()+86400000).toISOString(),status:'scheduled',broadcasters:[{country:'Portugal',flag:'🇵🇹',name:'Canal oficial',quality:'HD',url:'https://example.com'}]}]};
  modal(`<div class="modal-head"><h3>Formato do guia de futebol</h3><button class="icon-btn" data-close>✕</button></div><pre class="codebox">${escapeHtml(JSON.stringify(sample,null,2))}</pre><button class="btn" id="downloadFootballExample">Descarregar exemplo</button>`);
  $('#downloadFootballExample').addEventListener('click',()=>downloadText('RJPStream_Futebol_Exemplo.json',JSON.stringify(sample,null,2),'application/json'));
}

function bindSources(){
  $('#importM3U')?.addEventListener('click',()=>$('#m3uFileInput').click());
  $('#importEpg')?.addEventListener('click',epgModal);
  $('#importBundle')?.addEventListener('click',()=>$('#bundleFileInput').click());
  $('#addWebProvider')?.addEventListener('click',()=>webProviderModal());
  $('#addWebProvider2')?.addEventListener('click',()=>webProviderModal());
  $('#addUrl')?.addEventListener('click',()=>urlModal(false));
  $('#addDirect')?.addEventListener('click',()=>urlModal(true));
  $('#driveSetup')?.addEventListener('click', driveModal);
  $('#backupMenu')?.addEventListener('click', backupModal);
  $('#refreshAll')?.addEventListener('click',refreshAllSources);
  $('#sourceSearch')?.addEventListener('input',debounce(e=>{state.sourceSearch=e.target.value; save(); layout();},220));
  $('#clearSourceSearch')?.addEventListener('click',()=>{state.sourceSearch='';save();layout();});
  $$('[data-toggle-source]').forEach(b=>b.addEventListener('click',()=>{const s=state.sources.find(x=>x.id===b.dataset.toggleSource); if(s){s.enabled=s.enabled===false?true:false;save();layout();}}));
  $$('[data-delete-source]').forEach(b=>b.addEventListener('click',()=>confirmDeleteSource(b.dataset.deleteSource)));
  $$('[data-refresh-source]').forEach(b=>b.addEventListener('click',()=>refreshSourceById(b.dataset.refreshSource)));
  $$('[data-edit-source]').forEach(b=>b.addEventListener('click',()=>editSourceModal(b.dataset.editSource)));
  $$('[data-open-web-provider]').forEach(b=>b.addEventListener('click',()=>openWebProvider(b.dataset.openWebProvider)));
  $$('[data-edit-web-provider]').forEach(b=>b.addEventListener('click',()=>webProviderModal(b.dataset.editWebProvider)));
  $$('[data-delete-web-provider]').forEach(b=>b.addEventListener('click',()=>deleteWebProvider(b.dataset.deleteWebProvider)));
}

function bindSettings(){
  $('#layoutMode')?.addEventListener('change',e=>{state.layout=e.target.value;save();layout();toast('Preferência de interface guardada.');});
  $('#driveFolder')?.addEventListener('change',e=>{state.drive.folderName=e.target.value.trim()||'RJP Stream';save();});
  $('#autoRefresh')?.addEventListener('change',e=>{state.autoRefreshMinutes=Math.max(0,+e.target.value||0);save();scheduleAutoRefresh();toast('Atualização automática configurada.');});
  $('#vpnToggle')?.addEventListener('click',toggleVpn);
  $('#vpnScope')?.addEventListener('change',async e=>{state.vpnSplitOnly=e.target.value==='app';save();try{await getVpnPlugin()?.setSplitOnly?.({splitOnly:state.vpnSplitOnly});}catch{}toast('Modo VPN guardado; aplica-se na próxima ligação.');layout();});
  $('#importWG')?.addEventListener('click',()=>$('#wgFileInput').click());
  $('#driveSettingsBtn')?.addEventListener('click',driveModal);
  $('#backupMenu2')?.addEventListener('click',backupModal);
  $('#clearHistory')?.addEventListener('click',()=>{state.history=[];save();layout();toast('Histórico limpo.');});
}

$('#m3uFileInput').addEventListener('change', async e=>{
  const f=e.target.files?.[0]; if(!f) return;
  const text=await f.text(); const items=parseM3U(text);
  upsertSource({name:f.name.replace(/\.m3u8?$/i,''),type:'M3U',origin:'Ficheiro local',originType:'local',enabled:true,items,lastSync:new Date().toISOString(),lastStatus:`${items.length} itens`});
  save(); e.target.value=''; toast(`${items.length} item(ns) importados.`); layout();
});

$('#epgFileInput').addEventListener('change', async e=>{
  const f=e.target.files?.[0]; if(!f) return;
  const text=await f.text();
  applyEpg(text, f.name);
  save(); e.target.value=''; layout();
});

$('#bundleFileInput').addEventListener('change', async e=>{
  const f=e.target.files?.[0]; if(!f) return;
  const text=await f.text();
  try { importBundleObject(JSON.parse(text), f.name, 'Ficheiro local'); toast('Bundle importado.'); }
  catch(err){ toast(`JSON inválido: ${err.message}`); }
  e.target.value=''; save(); layout();
});

$('#backupFileInput').addEventListener('change', async e=>{
  const f=e.target.files?.[0]; if(!f) return;
  try {
    const obj=JSON.parse(await f.text());
    if(obj.app!=='RJP Stream' || !obj.state) throw new Error('Backup RJP Stream não reconhecido');
    const restored=deepMerge(structuredCloneSafe(defaultState), obj.state);
    Object.keys(state).forEach(k=>delete state[k]); Object.assign(state,restored,{version:APP_VERSION});
    save(); toast('Backup restaurado.'); closeModal(); layout();
  } catch(err){ toast(`Não foi possível importar: ${err.message}`); }
  e.target.value='';
});

$('#wgFileInput').addEventListener('change', async e=>{
  const f=e.target.files?.[0]; if(!f) return; const text=await f.text();
  if(!/\[Interface\]/i.test(text) || !/\[Peer\]/i.test(text) || !/^PrivateKey\s*=/mi.test(text)) return toast('O ficheiro não parece uma configuração WireGuard válida.');
  const endpoint=(text.match(/^Endpoint\s*=\s*(.+)$/mi)||[])[1] || '';
  const plugin=getVpnPlugin();
  try{
    if(plugin) await plugin.importConfig({config:text,name:f.name.replace(/\.conf$/i,'')||'RJPStream',splitOnly:state.vpnSplitOnly});
    state.wireguard={name:f.name,endpoint:redactEndpoint(endpoint),validated:true,nativeStored:!!plugin}; save(); e.target.value='';
    toast(plugin?'WireGuard importado e cifrado pelo Android Keystore.':'WireGuard validado. Instala o APK Android para ativar o túnel nativo.'); layout();
  }catch(err){ toast(`WireGuard: ${err?.message||err}`); }
});

$('#footballFileInput').addEventListener('change',async e=>{
  const f=e.target.files?.[0];if(!f)return;
  try{const obj=JSON.parse(await f.text());const games=Array.isArray(obj)?obj:obj.games;if(!Array.isArray(games))throw new Error('Falta o array games.');state.footballGames=games.slice(0,500);save();toast(`${state.footballGames.length} jogo(s) importados.`);state.page='futebol';layout();}
  catch(err){toast(`Guia de futebol inválido: ${err.message}`);}e.target.value='';
});

function parseM3U(text){
  const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const out=[]; let meta=null;
  for(const line of lines){
    if(line.startsWith('#EXTINF:')){
      const name=(line.split(',').slice(1).join(',') || 'Canal').trim();
      const group=(line.match(/group-title="([^"]*)"/i)||[])[1] || '';
      const logo=(line.match(/tvg-logo="([^"]*)"/i)||[])[1] || '';
      const tvgId=(line.match(/tvg-id="([^"]*)"/i)||[])[1] || '';
      const tvgName=(line.match(/tvg-name="([^"]*)"/i)||[])[1] || '';
      meta={name,tvgName,group,logo,tvgId};
    } else if(!line.startsWith('#') && /^(https?|rtsp):\/\//i.test(line)){
      const url=line;
      out.push({name:meta?.name||meta?.tvgName||`Stream ${out.length+1}`,group:meta?.group||'',logo:meta?.logo||'',tvgId:meta?.tvgId||'',url,type:detectStreamType(url)});
      meta=null;
    }
  }
  return dedupeItems(out);
}

function parseBundle(obj, fallbackName='RJP Bundle'){
  const bundleName = obj.name || fallbackName.replace(/\.json$/i,'');
  const items=[];
  const add=(x, group='')=>{
    if(!x) return;
    const url=x.url || x.stream || x.href;
    if(!url || !/^https?:\/\//i.test(url)) return;
    items.push({name:x.name||x.title||'Stream',group:x.group||x.category||group||'',logo:x.logo||x.poster||'',tvgId:x.tvgId||x.epgId||'',url,type:x.type||detectStreamType(url)});
  };
  if(Array.isArray(obj.items)) obj.items.forEach(x=>add(x));
  if(Array.isArray(obj.channels)) obj.channels.forEach(x=>add(x,'TV'));
  if(Array.isArray(obj.sections)) obj.sections.forEach(sec=>{
    if(Array.isArray(sec.items)) sec.items.forEach(x=>add(x,sec.title||sec.name||sec.type||''));
    else if(sec.url) add({name:sec.title||sec.name||'Secção',url:sec.url,type:sec.type},sec.title||sec.type||'');
  });
  return {name:bundleName,items:dedupeItems(items)};
}

function importBundleObject(obj, fileName='RJP Bundle', origin='Local', extra={}){
  if(obj && obj.app==='RJP Stream' && obj.state) throw new Error('Este ficheiro é um backup. Usa Importar backup.');
  const parsed=parseBundle(obj,fileName);
  if(!parsed.items.length) throw new Error('O JSON não contém itens com URL reconhecível.');
  upsertSource({name:parsed.name,type:'JSON',origin,originType:extra.originType||'local',enabled:true,items:parsed.items,lastSync:new Date().toISOString(),lastStatus:`${parsed.items.length} itens`,...extra});
}

function epgModal(){
  modal(`<div class="modal-head"><h3>EPG / XMLTV</h3><button class="icon-btn" data-close>✕</button></div><p class="muted">Importa um ficheiro XMLTV local ou liga um URL remoto para permitir atualização automática.</p><div class="source-actions compact-actions"><button class="source-action" id="epgLocal"><span class="bigicon">📄</span><b>Ficheiro local</b><small>.xml ou .xmltv</small></button><button class="source-action" id="epgRemote"><span class="bigicon">🔗</span><b>URL XMLTV</b><small>https://…/epg.xml</small></button></div><div class="micro">${state.epg?.remoteUrl?`EPG remoto atual: ${escapeHtml(shortOrigin(state.epg.remoteUrl))}`:state.epg?`EPG atual: ${escapeHtml(state.epg.name||'EPG')}`:'Sem EPG configurado'}</div>`);
  $('#epgLocal').addEventListener('click',()=>{$('#epgFileInput').click();closeModal();});
  $('#epgRemote').addEventListener('click',()=>{
    modal(`<div class="modal-head"><h3>EPG por URL</h3><button class="icon-btn" data-close>✕</button></div><div class="field"><label>URL XMLTV</label><input id="epgUrl" value="${escapeHtml(state.epg?.remoteUrl||'')}" placeholder="https://.../epg.xml"></div><button class="btn primary top-gap" id="saveEpgUrl">Guardar e atualizar</button>`);
    $('#saveEpgUrl').addEventListener('click',async()=>{const url=$('#epgUrl').value.trim();if(!/^https?:\/\//i.test(url))return toast('Introduz uma URL http/https válida.');const b=$('#saveEpgUrl');b.disabled=true;b.textContent='A carregar…';try{const text=await fetchText(url,20000);applyEpg(text,'EPG remoto',url);save();closeModal();layout();}catch(err){b.disabled=false;b.textContent='Guardar e atualizar';toast(`EPG: ${err.message}`);}});
  });
}

function applyEpg(text, name='EPG', remoteUrl=''){
  const channels=(text.match(/<channel\b/gi)||[]).length;
  const programmes=(text.match(/<programme\b/gi)||[]).length;
  const nowNext={}, channelMeta={}, byName={};
  try{
    const xml=new DOMParser().parseFromString(text,'text/xml');
    if(xml.querySelector('parsererror')) throw new Error('XML inválido');
    [...xml.querySelectorAll('channel')].forEach(ch=>{
      const id=ch.getAttribute('id')||''; if(!id) return;
      const display=[...ch.querySelectorAll('display-name')].map(x=>x.textContent?.trim()).find(Boolean)||id;
      const logo=ch.querySelector('icon')?.getAttribute('src')||'';
      channelMeta[id]={id,name:display,logo};
      byName[normalizeText(display)]=id;
    });
    const now=Date.now();
    [...xml.querySelectorAll('programme')].slice(0,50000).forEach(p=>{
      const ch=p.getAttribute('channel')||'';
      const start=parseXmltvDate(p.getAttribute('start'));
      const stop=parseXmltvDate(p.getAttribute('stop'));
      if(!ch || !Number.isFinite(start) || !Number.isFinite(stop)) return;
      const item={title:p.querySelector('title')?.textContent?.trim()||'',subTitle:p.querySelector('sub-title')?.textContent?.trim()||'',start,stop};
      const rec=nowNext[ch] || (nowNext[ch]={now:null,next:null});
      if(start<=now && stop>now) rec.now=item;
      else if(start>now && (!rec.next || start<rec.next.start)) rec.next=item;
    });
  } catch(err){ console.warn('EPG',err); }
  state.epg={name,channels,programmes,nowNext,channelMeta,byName,remoteUrl,lastSync:new Date().toISOString()};
  toast(`EPG importado: ${channels} canais, ${programmes} programas.`);
}

function parseXmltvDate(s=''){
  const m=String(s).trim().match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\s*([+-])(\d{2})(\d{2}))?/);
  if(!m) return NaN;
  let utc=Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5],+m[6]);
  if(m[7]){
    const offset=((+m[8])*60+(+m[9]))*60000;
    utc += m[7]==='+' ? -offset : offset;
  }
  return utc;
}

function epgForItem(item){
  const epg=state.epg; if(!epg) return null;
  let id=item.tvgId || '';
  if(!id && item.name) id=epg.byName?.[normalizeText(item.name)] || '';
  const rec=id ? epg.nowNext?.[id] : null;
  if(!rec) return null;
  const now=Date.now(), cur=rec.now;
  const progress=cur && cur.stop>cur.start ? Math.max(0,Math.min(100,((now-cur.start)/(cur.stop-cur.start))*100)) : 0;
  return {...rec,id,progress,channel:epg.channelMeta?.[id]||null};
}

function detectStreamType(url=''){
  const u=url.toLowerCase().split('?')[0];
  if(u.endsWith('.m3u8')) return 'HLS';
  if(u.endsWith('.mpd')) return 'DASH';
  if(u.endsWith('.m3u')) return 'M3U';
  if(u.endsWith('.mp4')||u.endsWith('.webm')||u.endsWith('.mov')||u.endsWith('.mkv')) return 'VIDEO';
  return 'URL';
}

function dedupeItems(items){
  const seen=new Set();
  return items.filter(x=>{const k=(x.url||'').trim(); if(!k||seen.has(k)) return false; seen.add(k); return true;});
}

function upsertSource(source){
  const key = source.driveFileId ? `drive:${source.driveFileId}` : source.remoteUrl ? `remote:${source.remoteUrl}` : null;
  let existing = key ? state.sources.find(s=>(s.driveFileId?`drive:${s.driveFileId}`:s.remoteUrl?`remote:${s.remoteUrl}`:null)===key) : null;
  if(existing) Object.assign(existing, source, {id:existing.id});
  else state.sources.push({id:randomId(), ...source});
}

function randomId(){ return globalThis.crypto?.randomUUID?.() || `rjp-${Date.now()}-${Math.random().toString(36).slice(2)}`; }

function urlModal(direct){
  modal(`<div class="modal-head"><h3>${direct?'Adicionar stream':'Adicionar fonte por URL'}</h3><button class="icon-btn" data-close>✕</button></div><div class="form-grid"><div class="field"><label>Nome</label><input id="urlName" placeholder="Ex.: TV Casa"></div><div class="field"><label>Tipo</label><select id="urlType">${direct?'<option>URL</option><option>HLS</option><option>DASH</option><option>M3U</option><option>JSON</option>':'<option>M3U</option><option>JSON</option><option>HLS</option><option>DASH</option><option>URL</option>'}</select></div></div><div class="field top-gap"><label>URL</label><input id="urlValue" placeholder="https://..."></div><div class="note top-gap">Fontes remotas podem ser bloqueadas por CORS no browser/TV. No APK Android a V1.0 tenta automaticamente a camada HTTP nativa quando necessário.</div><button class="btn primary top-gap" id="saveUrl">Guardar e testar</button>`);
  $('#saveUrl').addEventListener('click',async()=>{
    const name=$('#urlName').value.trim()||'Fonte remota', type=$('#urlType').value, url=$('#urlValue').value.trim();
    if(!/^https?:\/\//i.test(url)) return toast('Introduz uma URL http/https válida.');
    const btn=$('#saveUrl'); btn.disabled=true; btn.textContent='A testar…';
    try{
      const source=await buildRemoteSource({name,type,url});
      upsertSource(source); save(); closeModal(); toast(`${source.items.length} item(ns) preparados.`); layout();
    } catch(err){
      const items = ['M3U','JSON'].includes(type) ? [] : [{name,group:type,url,type:type==='URL'?detectStreamType(url):type}];
      upsertSource({name,type,origin:url,originType:'remote',remoteUrl:url,enabled:true,items,lastSync:new Date().toISOString(),lastStatus:`Guardada sem teste: ${err.message}`});
      save(); closeModal(); toast('Fonte guardada, mas não foi possível testá-la agora.'); layout();
    }
  });
}

async function buildRemoteSource({name,type,url}){
  let items=[];
  let status='Ligação verificada';
  if(type==='M3U'){
    const text=await fetchText(url,12000); items=parseM3U(text); status=`${items.length} itens`;
  } else if(type==='JSON'){
    const text=await fetchText(url,12000); const parsed=parseBundle(JSON.parse(text),name); items=parsed.items; status=`${items.length} itens`;
  } else {
    items=[{name,group:type,url,type:type==='URL'?detectStreamType(url):type}];
  }
  return {name,type,origin:url,originType:'remote',remoteUrl:url,enabled:true,items,lastSync:new Date().toISOString(),lastStatus:status};
}

function getHttpPlugin(){ return globalThis.Capacitor?.Plugins?.RJPHttp || null; }
async function nativeHttpText(url,{method='GET',body='',headers={}}={}){
  const plugin=getHttpPlugin(); if(!plugin) throw new Error('HTTP nativo indisponível');
  const out=await plugin.request({url,method,body,headers});
  if(!out || out.status<200 || out.status>=300) throw new Error(`HTTP ${out?.status||0}`);
  return out.body||'';
}
async function fetchText(url, timeoutMs=12000, headers={}){
  const c=new AbortController(); const timer=setTimeout(()=>c.abort(),timeoutMs);
  try{
    try{
      const r=await fetch(url,{signal:c.signal,headers,cache:'no-store'});
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    }catch(err){
      if(getHttpPlugin()) return await nativeHttpText(url,{headers});
      throw err;
    }
  } finally { clearTimeout(timer); }
}

async function refreshSourceById(id){
  const s=state.sources.find(x=>x.id===id); if(!s) return;
  if(s.originType==='drive'){ toast('Usa Sincronizar Drive para atualizar esta fonte.'); return driveSync(); }
  if(!s.remoteUrl){ toast('Esta fonte é local e não tem URL de atualização.'); return; }
  s.lastStatus='A atualizar…'; save(); layout();
  try{
    const fresh=await buildRemoteSource({name:s.name,type:s.type,url:s.remoteUrl});
    Object.assign(s,{items:fresh.items,lastSync:fresh.lastSync,lastStatus:fresh.lastStatus}); save(); toast(`${s.name}: atualizado.`);
  }catch(err){ s.lastStatus=`Erro: ${err.message}`; save(); toast(`${s.name}: não foi possível atualizar.`); }
  layout();
}

async function refreshAllSources({silent=false}={}){
  const remote=state.sources.filter(s=>s.remoteUrl && s.originType!=='drive');
  if(!remote.length && !state.drive.connected && !state.epg?.remoteUrl) return toast('Não existem fontes remotas para atualizar.');
  if(!silent) toast('A atualizar fontes…');
  for(const s of remote){
    try{ const fresh=await buildRemoteSource({name:s.name,type:s.type,url:s.remoteUrl}); Object.assign(s,{items:fresh.items,lastSync:fresh.lastSync,lastStatus:fresh.lastStatus}); }
    catch(err){ s.lastStatus=`Erro: ${err.message}`; }
  }
  if(state.drive.connected) await driveSync({silent:true});
  if(state.epg?.remoteUrl){
    try{applyEpg(await fetchText(state.epg.remoteUrl,20000),state.epg.name||'EPG remoto',state.epg.remoteUrl);}
    catch(err){console.warn('EPG remoto',err);}
  }
  save(); layout(); if(!silent) toast('Atualização concluída.');
}

function confirmDeleteSource(id){
  const s=state.sources.find(x=>x.id===id); if(!s) return;
  modal(`<div class="modal-head"><h3>Remover fonte</h3><button class="icon-btn" data-close>✕</button></div><p>Queres remover <b>${escapeHtml(s.name)}</b>?</p><div class="button-row"><button class="btn danger" id="confirmDelete">Remover</button><button class="btn" data-close>Cancelar</button></div>`);
  $('#confirmDelete').addEventListener('click',()=>{state.sources=state.sources.filter(x=>x.id!==id);save();closeModal();layout();});
}


function editSourceModal(id){
  const src=state.sources.find(x=>x.id===id); if(!src) return;
  const canEditUrl=!!src.remoteUrl;
  modal(`<div class="modal-head"><h3>Editar fonte</h3><button class="icon-btn" data-close>✕</button></div><div class="form-grid"><div class="field"><label>Nome</label><input id="editSourceName" value="${escapeHtml(src.name||'')}"></div><div class="field"><label>Tipo</label><select id="editSourceType" ${canEditUrl?'':'disabled'}>${['M3U','HLS','DASH','JSON','URL'].map(t=>`<option ${src.type===t?'selected':''}>${t}</option>`).join('')}</select></div></div><div class="field top-gap"><label>URL remota</label><input id="editSourceUrl" value="${escapeHtml(src.remoteUrl||'')}" ${canEditUrl?'':'disabled'}></div><div class="note top-gap">Fontes locais mantêm o conteúdo importado. Fontes remotas podem alterar nome, tipo e URL e serão testadas ao guardar.</div><div class="button-row top-gap"><button class="btn primary" id="saveSourceEdit">Guardar</button><button class="btn" data-close>Cancelar</button></div>`);
  $('#saveSourceEdit').addEventListener('click',async()=>{
    const name=$('#editSourceName').value.trim()||src.name||'Fonte';
    if(!canEditUrl){src.name=name;save();closeModal();layout();toast('Fonte atualizada.');return;}
    const type=$('#editSourceType').value, url=$('#editSourceUrl').value.trim();
    if(!/^https?:\/\//i.test(url)) return toast('Introduz uma URL http/https válida.');
    const btn=$('#saveSourceEdit');btn.disabled=true;btn.textContent='A testar…';
    try{const fresh=await buildRemoteSource({name,type,url});Object.assign(src,fresh,{id:src.id});save();closeModal();layout();toast('Fonte atualizada.');}
    catch(err){btn.disabled=false;btn.textContent='Guardar';toast(`Não foi possível validar: ${err.message}`);}
  });
}

function backupModal(){
  modal(`<div class="modal-head"><h3>Backup RJP Stream</h3><button class="icon-btn" data-close>✕</button></div><p class="muted">Exporta fontes, atalhos Web pessoais, EPG resumido, favoritos e definições. Credenciais temporárias do Google Drive e chaves privadas WireGuard não são exportadas.</p><div class="source-actions compact-actions"><button class="source-action" id="exportBackup"><span class="bigicon">⬇</span><b>Exportar backup</b><small>RJPStream_Backup.json</small></button><button class="source-action" id="importBackup"><span class="bigicon">⬆</span><b>Importar backup</b><small>Restaurar configuração</small></button></div>`);
  $('#exportBackup').addEventListener('click',exportBackup);
  $('#importBackup').addEventListener('click',()=>$('#backupFileInput').click());
}

function exportBackup(){
  const copy=structuredCloneSafe(state);
  if(copy.wireguard) copy.wireguard={name:copy.wireguard.name,endpoint:copy.wireguard.endpoint,validated:copy.wireguard.validated};
  if(copy.drive) copy.drive.bridgeToken='';
  const data={app:'RJP Stream',version:APP_VERSION,createdAt:new Date().toISOString(),state:copy};
  downloadText(`RJPStream_Backup_${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(data,null,2),'application/json');
  toast('Backup exportado.');
}

function globalSearchModal(){
  const items=activeItems();
  modal(`<div class="modal-head"><h3>Pesquisar</h3><button class="icon-btn" data-close>✕</button></div><div class="field"><label>Canal, grupo ou título</label><input id="globalSearch" placeholder="Escreve para pesquisar…" autofocus></div><div id="searchResults" class="search-results"><p class="muted">${items.length} item(ns) disponíveis nas fontes ativas.</p></div>`);
  const input=$('#globalSearch');
  const render=()=>{
    const q=normalizeText(input.value);
    if(!q){ $('#searchResults').innerHTML=`<p class="muted">${items.length} item(ns) disponíveis nas fontes ativas.</p>`; return; }
    const hits=items.filter(x=>normalizeText(`${x.name} ${x.group}`).includes(q)).slice(0,40);
    $('#searchResults').innerHTML=hits.length?hits.map(x=>`<button class="search-hit" data-hit-url="${encodeURIComponent(x.url||'')}" data-hit-type="${escapeHtml(x.type||detectStreamType(x.url||''))}" data-hit-name="${escapeHtml(x.name||'Stream')}" data-hit-group="${escapeHtml(x.group||'')}" data-hit-logo="${escapeHtml(x.logo||'')}"><span><b>${escapeHtml(x.name)}</b><small>${escapeHtml(x.group||x.type||'')}</small></span><span>▶</span></button>`).join(''):'<p class="muted">Sem resultados.</p>';
    $$('[data-hit-url]').forEach(b=>b.addEventListener('click',()=>openPlayer({name:b.dataset.hitName||b.querySelector('b')?.textContent||'Stream',url:decodeURIComponent(b.dataset.hitUrl||''),type:b.dataset.hitType||'',group:b.dataset.hitGroup||'',logo:b.dataset.hitLogo||''})));
  };
  input.addEventListener('input',debounce(render,120));
  setTimeout(()=>input.focus(),50);
}

function driveModal(){
  modal(`<div class="modal-head"><h3>Google Drive</h3><button class="icon-btn" data-close>✕</button></div><p class="muted">A RJP Stream pode ler uma pasta da tua conta Google Drive. Usa uma credencial OAuth 2.0 do tipo Web application.</p><div class="form-grid"><div class="field"><label>Google OAuth Client ID (Web)</label><input id="driveClientId" value="${escapeHtml(state.drive.clientId||'')}" placeholder="xxxxxxxx.apps.googleusercontent.com"></div><div class="field"><label>Pasta principal</label><input id="driveFolderName" value="${escapeHtml(state.drive.folderName||'RJP Stream')}"></div><div class="field"><label>Apps Script Bridge URL (Android/TV opcional)</label><input id="driveBridgeUrl" value="${escapeHtml(state.drive.bridgeUrl||'')}" placeholder="https://script.google.com/macros/s/.../exec"></div><div class="field"><label>Token do Bridge</label><input id="driveBridgeToken" type="password" value="${escapeHtml(state.drive.bridgeToken||'')}" placeholder="Token definido no Apps Script"></div></div><div class="note top-gap">Se definires o Apps Script Bridge, a app usa-o primeiro e funciona também em Android/Android TV/Samsung/LG. Sem Bridge, usa OAuth Web com scope <b>drive.readonly</b>.</div><div class="button-row top-gap"><button class="btn primary" id="driveConnect">${state.drive.connected?'Sincronizar agora':'Ligar e sincronizar'}</button>${state.drive.connected?'<button class="btn" id="driveDisconnect">Desligar</button>':''}<button class="btn" data-close>Cancelar</button></div><div id="driveStatus" class="muted top-gap">${state.drive.lastError?`Último erro: ${escapeHtml(state.drive.lastError)}`:state.drive.lastSync?`Última sincronização: ${new Date(state.drive.lastSync).toLocaleString('pt-PT')}`:''}</div>`);
  $('#driveConnect').addEventListener('click',async()=>{
    state.drive.clientId=$('#driveClientId').value.trim();
    state.drive.folderName=$('#driveFolderName').value.trim()||'RJP Stream';
    state.drive.bridgeUrl=$('#driveBridgeUrl')?.value.trim()||'';
    state.drive.bridgeToken=$('#driveBridgeToken')?.value.trim()||''; save();
    if(!state.drive.bridgeUrl && !state.drive.clientId) return toast('Configura o Apps Script Bridge ou o OAuth Client ID.');
    const status=$('#driveStatus'); status.textContent='A ligar ao Google…';
    try{ await driveAuthorize(); status.textContent='Autorizado. A sincronizar…'; await driveSync({silent:true}); closeModal(); layout(); toast('Google Drive sincronizado.'); }
    catch(err){ state.drive.lastError=err.message; state.drive.connected=false; save(); status.textContent=`Erro: ${err.message}`; }
  });
  $('#driveDisconnect')?.addEventListener('click',()=>{driveAccessToken='';sessionStorage.removeItem('rjpDriveToken');state.drive.connected=false;state.drive.account='';save();closeModal();layout();toast('Drive desligado nesta sessão.');});
}

async function loadScriptOnce(src, test){
  if(test?.()) return;
  const existing=[...document.scripts].find(s=>s.src===src);
  if(existing){ await new Promise((res,rej)=>{if(test?.()) return res(); existing.addEventListener('load',res,{once:true}); existing.addEventListener('error',rej,{once:true});}); return; }
  await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error(`Falha ao carregar ${src}`));document.head.appendChild(s);});
}

async function driveAuthorize(){
  if(driveAccessToken) return driveAccessToken;
  await loadScriptOnce(GIS_URL,()=>globalThis.google?.accounts?.oauth2);
  driveAccessToken=await new Promise((resolve,reject)=>{
    const client=google.accounts.oauth2.initTokenClient({client_id:state.drive.clientId,scope:DRIVE_SCOPE,callback:(r)=>{if(r.error) reject(new Error(r.error_description||r.error)); else resolve(r.access_token);},error_callback:(e)=>reject(new Error(e?.message||'Autorização Google cancelada'))});
    client.requestAccessToken({prompt:'consent'});
  });
  sessionStorage.setItem('rjpDriveToken',driveAccessToken);
  return driveAccessToken;
}

function qEsc(s){ return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }
async function driveApi(path){
  const token=await driveAuthorize();
  const r=await fetch(`https://www.googleapis.com/drive/v3/${path}`,{headers:{Authorization:`Bearer ${token}`}});
  if(r.status===401){driveAccessToken='';sessionStorage.removeItem('rjpDriveToken');throw new Error('Sessão Google expirada. Liga novamente.');}
  if(!r.ok) throw new Error(`Google Drive HTTP ${r.status}`);
  return r.json();
}
async function driveDownload(fileId){
  const token=await driveAuthorize();
  const r=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,{headers:{Authorization:`Bearer ${token}`}});
  if(!r.ok) throw new Error(`Não foi possível ler ficheiro do Drive (${r.status})`);
  return r.text();
}
async function findDriveFolder(name,parent='root'){
  const q=`mimeType='application/vnd.google-apps.folder' and name='${qEsc(name)}' and '${qEsc(parent)}' in parents and trashed=false`;
  const d=await driveApi(`files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=10`);
  return d.files?.[0]||null;
}
async function listDriveFiles(parent){
  const q=`'${qEsc(parent)}' in parents and trashed=false`;
  const d=await driveApi(`files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,modifiedTime,size)&orderBy=name&pageSize=1000`);
  return d.files||[];
}

async function driveSyncBridge({silent=false}={}){
  const url=state.drive.bridgeUrl?.trim(); if(!url) throw new Error('Bridge URL não configurado.');
  const body={action:'sync',token:state.drive.bridgeToken||'',folderName:state.drive.folderName||'RJP Stream'};
  let raw='';
  try{
    const r=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body),cache:'no-store'});
    if(!r.ok) throw new Error(`Drive Bridge HTTP ${r.status}`);
    raw=await r.text();
  }catch(err){
    if(getHttpPlugin()) raw=await nativeHttpText(url,{method:'POST',body:JSON.stringify(body),headers:{'Content-Type':'text/plain;charset=utf-8'}});
    else throw err;
  }
  const data=JSON.parse(raw); if(!data?.ok) throw new Error(data?.error||'Drive Bridge devolveu erro.');
  let imported=0;
  for(const f of (data.sources||[])){
    try{
      const low=String(f.name||'').toLowerCase();
      if(low.endsWith('.m3u')||low.endsWith('.m3u8')||String(f.type).toUpperCase()==='M3U'){
        const items=parseM3U(f.content||'');
        upsertSource({name:String(f.name||'Drive').replace(/\.m3u8?$/i,''),type:'M3U',origin:`Google Drive/${f.name||'fonte'}`,originType:'drive-bridge',driveFileId:f.id||f.name,enabled:true,items,lastSync:new Date().toISOString(),lastStatus:`${items.length} itens`}); imported++;
      } else if(low.endsWith('.json')||String(f.type).toUpperCase()==='JSON'){
        const obj=typeof f.content==='string'?JSON.parse(f.content):f.content; const parsed=parseBundle(obj,f.name||'Drive JSON');
        if(parsed.items.length){upsertSource({name:parsed.name,type:'JSON',origin:`Google Drive/${f.name||'fonte'}`,originType:'drive-bridge',driveFileId:f.id||f.name,enabled:true,items:parsed.items,lastSync:new Date().toISOString(),lastStatus:`${parsed.items.length} itens`});imported++;}
      }
    }catch(err){console.warn('Drive Bridge source',f?.name,err);}
  }
  if(data.epg?.content) applyEpg(data.epg.content,`Google Drive/${data.epg.name||'EPG'}`);
  if(data.config) applyRemoteConfig(data.config);
  state.drive.connected=true;state.drive.lastSync=new Date().toISOString();state.drive.lastError='';save();
  if(!silent) toast(`Drive Bridge sincronizado: ${imported} fonte(s).`);
  return imported;
}

async function driveSync({silent=false}={}){
  if(state.drive.bridgeUrl) return driveSyncBridge({silent});
  if(!state.drive.clientId) throw new Error('OAuth Client ID não configurado.');
  const root=await findDriveFolder(state.drive.folderName||'RJP Stream');
  if(!root) throw new Error(`Pasta “${state.drive.folderName||'RJP Stream'}” não encontrada no Meu Drive.`);
  const rootChildren=await listDriveFiles(root.id);
  const folders=Object.fromEntries(rootChildren.filter(x=>x.mimeType==='application/vnd.google-apps.folder').map(x=>[x.name.toLowerCase(),x]));
  const sourceFolder=folders.sources || folders.fontes;
  const epgFolder=folders.epg;
  const configFolder=folders.config;
  const sourceFiles=sourceFolder?await listDriveFiles(sourceFolder.id):rootChildren.filter(x=>x.mimeType!=='application/vnd.google-apps.folder');
  let imported=0;
  for(const f of sourceFiles){
    const low=f.name.toLowerCase();
    try{
      if(low.endsWith('.m3u')||low.endsWith('.m3u8')){
        const items=parseM3U(await driveDownload(f.id));
        upsertSource({name:f.name.replace(/\.m3u8?$/i,''),type:'M3U',origin:`Google Drive/${f.name}`,originType:'drive',driveFileId:f.id,enabled:true,items,lastSync:new Date().toISOString(),lastStatus:`${items.length} itens`}); imported++;
      } else if(low.endsWith('.json') && low!=='rjp-stream.json'){
        const obj=JSON.parse(await driveDownload(f.id)); const parsed=parseBundle(obj,f.name);
        if(parsed.items.length){upsertSource({name:parsed.name,type:'JSON',origin:`Google Drive/${f.name}`,originType:'drive',driveFileId:f.id,enabled:true,items:parsed.items,lastSync:new Date().toISOString(),lastStatus:`${parsed.items.length} itens`});imported++;}
      }
    }catch(err){ console.warn('Drive source',f.name,err); }
  }
  if(epgFolder){
    const files=await listDriveFiles(epgFolder.id); const epg=files.find(f=>/\.(xml|xmltv)$/i.test(f.name));
    if(epg) applyEpg(await driveDownload(epg.id),`Google Drive/${epg.name}`);
  }
  if(configFolder){
    const files=await listDriveFiles(configFolder.id); const cfg=files.find(f=>f.name.toLowerCase()==='rjp-stream.json');
    if(cfg){ try{ applyRemoteConfig(JSON.parse(await driveDownload(cfg.id))); }catch(err){console.warn('Drive config',err);} }
  }
  state.drive.connected=true; state.drive.lastSync=new Date().toISOString(); state.drive.lastError=''; save();
  if(!silent) toast(`Drive sincronizado: ${imported} fonte(s).`);
  return imported;
}

function applyRemoteConfig(cfg){
  if(!cfg || typeof cfg!=='object') return;
  if(Array.isArray(cfg.disabledSources)){
    const disabled=new Set(cfg.disabledSources.map(normalizeText));
    state.sources.forEach(s=>{if(disabled.has(normalizeText(s.name))) s.enabled=false;});
  }
  if(cfg.layout && ['auto','compact','normal','tv'].includes(cfg.layout)) state.layout=cfg.layout;
  if(Array.isArray(cfg.footballGames)) state.footballGames=cfg.footballGames.slice(0,500);
}

function getVpnPlugin(){ return globalThis.Capacitor?.Plugins?.RJPVpn || null; }
function nativeVpnAvailable(){ return !!getVpnPlugin(); }

async function syncNativeVpnStatus({rerender=false}={}){
  const plugin=getVpnPlugin();
  if(!plugin) return false;
  try{
    const info=await plugin.status();
    const changed=state.vpn!==!!info.connected;
    state.vpn=!!info.connected;
    state.vpnSplitOnly=info.splitOnly ?? state.vpnSplitOnly;
    if(info.configured && !state.wireguard) state.wireguard={name:info.name||'WireGuard',endpoint:'',validated:true,nativeStored:true};
    save();
    if(rerender && changed) layout();
    return true;
  }catch(err){ console.warn('VPN status',err); return false; }
}

async function toggleVpn(){
  const plugin=getVpnPlugin();
  if(!plugin){ toast('A VPN de sistema está disponível no APK Android/Android TV. No browser, Samsung e LG não há VpnService nativo.'); return; }
  if(!state.wireguard){ state.page='definicoes'; save(); layout(); toast('Importa primeiro uma configuração WireGuard .conf.'); return; }
  try{
    if(state.vpn) await plugin.disconnect();
    else await plugin.connect();
    await syncNativeVpnStatus();
    layout();
    toast(`VPN ${state.vpn?'ligada':'desligada'}.`);
  }catch(err){ toast(`VPN: ${err?.message||err}`); await syncNativeVpnStatus({rerender:true}); }
}

function openStreamElement(el){
  const u=decodeURIComponent(el.dataset.stream||''); if(!u) return;
  return openPlayer({name:el.dataset.streamName||el.querySelector('strong')?.textContent||'Stream',url:u,type:el.dataset.streamType||'',group:el.dataset.streamGroup||'',logo:el.dataset.streamLogo||''});
}

function historyUpsert(meta, patch={}){
  if(!meta?.url) return null;
  const list=state.history||(state.history=[]);
  let rec=list.find(x=>x.url===meta.url);
  if(!rec){rec={url:meta.url,name:meta.name||'Stream',type:meta.type||detectStreamType(meta.url),group:meta.group||'',logo:meta.logo||'',position:0,duration:0,lastPlayed:new Date().toISOString()};list.unshift(rec);}
  Object.assign(rec,{name:meta.name||rec.name,type:meta.type||rec.type,group:meta.group??rec.group,logo:meta.logo??rec.logo,...patch,lastPlayed:new Date().toISOString()});
  state.history=list.sort((a,b)=>new Date(b.lastPlayed||0)-new Date(a.lastPlayed||0)).slice(0,100);
  return rec;
}

async function openPlayer(titleOrMeta,url='',type=''){
  cleanupPlayer();
  const meta=typeof titleOrMeta==='object'&&titleOrMeta?{...titleOrMeta}:{name:titleOrMeta||'Stream',url,type};
  meta.url=meta.url||url||''; meta.type=meta.type||type||detectStreamType(meta.url);
  const rec=historyUpsert(meta); save();
  modal(`<div class="modal-head"><div><h3>${escapeHtml(meta.name||'Stream')}</h3><div class="micro" id="playerEngine">A preparar player…</div></div><button class="icon-btn" data-close>✕</button></div><div class="video-wrap"><video id="rjpVideo" controls autoplay playsinline></video><div class="player-overlay" id="playerOverlay">A carregar…</div></div><div class="note" id="playerNote">HLS e DASH são reproduzidos através de motores web quando o dispositivo os suporta. Não existe bypass de DRM.</div>`);
  const video=$('#rjpVideo'), overlay=$('#playerOverlay'), engine=$('#playerEngine');
  if(!meta.url){overlay.textContent='Sem URL de reprodução.';engine.textContent='Sem fonte';return;}
  const detected=(meta.type||detectStreamType(meta.url)).toUpperCase();
  let lastPersist=0;
  const persistPosition=()=>{
    if(!video || !meta.url) return;
    const duration=Number.isFinite(video.duration)&&video.duration>0?video.duration:0;
    const position=Number.isFinite(video.currentTime)&&video.currentTime>0?video.currentTime:0;
    historyUpsert(meta,{position,duration}); save(); lastPersist=Date.now();
  };
  playerCleanup=()=>{persistPosition();try{activeHls?.destroy?.();}catch{} try{activeDash?.reset?.();}catch{} activeHls=null;activeDash=null;};
  try{
    if(detected==='HLS' || meta.url.toLowerCase().includes('.m3u8')){
      const nativeHls = !!video.canPlayType('application/vnd.apple.mpegurl');
      const tvNativePreferred = /webos|web0s|tizen|smart-tv|smarttv|hbbtv/i.test(navigator.userAgent);
      if(nativeHls && (tvNativePreferred || 'ManagedMediaSource' in window)){ video.src=meta.url; engine.textContent='HLS nativo'; }
      else {
        await loadScriptOnce(HLS_JS_URL,()=>globalThis.Hls);
        if(!Hls.isSupported()) throw new Error('HLS.js não é suportado neste dispositivo.');
        activeHls=new Hls({enableWorker:true,lowLatencyMode:true}); activeHls.loadSource(meta.url); activeHls.attachMedia(video); engine.textContent='HLS.js 1.7.2';
        activeHls.on(Hls.Events.ERROR,(_,data)=>{if(data?.fatal) overlay.textContent=`Erro HLS: ${data.type||''} ${data.details||''}`;});
      }
    } else if(detected==='DASH' || meta.url.toLowerCase().includes('.mpd')){
      await loadScriptOnce(DASH_JS_URL,()=>globalThis.dashjs);
      activeDash=dashjs.MediaPlayer().create(); activeDash.initialize(video,meta.url,true); engine.textContent='dash.js 5.2.1';
    } else { video.src=meta.url; engine.textContent='HTML5 Video'; }
    video.addEventListener('loadedmetadata',()=>{
      if(rec?.position>10 && Number.isFinite(video.duration) && video.duration>0 && rec.position<video.duration-20){
        try{video.currentTime=rec.position;$('#playerNote').textContent=`Retomado em ${formatTime(rec.position)}. `+$('#playerNote').textContent;}catch{}
      }
    },{once:true});
    video.addEventListener('timeupdate',()=>{if(Date.now()-lastPersist>5000)persistPosition();});
    video.addEventListener('pause',persistPosition);
    video.addEventListener('ended',()=>{historyUpsert(meta,{position:0,duration:Number.isFinite(video.duration)?video.duration:0});save();});
    video.addEventListener('canplay',()=>overlay.classList.add('hidden'),{once:true});
    video.addEventListener('playing',()=>overlay.classList.add('hidden'),{once:true});
    video.addEventListener('error',()=>{overlay.textContent='O stream não pôde ser reproduzido neste dispositivo.';});
  } catch(err){ overlay.textContent=err.message; engine.textContent='Erro'; }
}

function cleanupPlayer(){ if(playerCleanup){try{playerCleanup();}catch{} playerCleanup=null;} }
function formatTime(seconds=0){const s=Math.max(0,Math.floor(seconds));const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`:`${m}:${String(sec).padStart(2,'0')}`;}

function modal(html){
  closeModal();
  const d=document.createElement('div'); d.className='modal-backdrop'; d.id='modal'; d.innerHTML=`<div class="modal">${html}</div>`; document.body.appendChild(d);
  d.addEventListener('click',e=>{if(e.target===d || e.target.closest('[data-close]')) closeModal();});
}
function closeModal(){ cleanupPlayer(); $('#modal')?.remove(); }
function toast(msg){ $('#toast')?.remove(); const t=document.createElement('div');t.className='toast';t.id='toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),3600); }
function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function shortOrigin(s=''){return String(s).length>70?`${String(s).slice(0,67)}…`:String(s);}
function redactEndpoint(s=''){return s?String(s).replace(/(^.{3}).*(:\d+)?$/,'$1••••$2'):'';}
function debounce(fn,ms){let t;return (...args)=>{clearTimeout(t);t=setTimeout(()=>fn(...args),ms);};}
function downloadText(name,text,type='text/plain'){const blob=new Blob([text],{type});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);}

let autoRefreshTimer=null;
function scheduleAutoRefresh(){
  clearInterval(autoRefreshTimer); autoRefreshTimer=null;
  const minutes=Math.max(0,+state.autoRefreshMinutes||0);
  if(!minutes) return;
  autoRefreshTimer=setInterval(()=>autoRefreshTick(),minutes*60*1000);
}
async function autoRefreshTick(){
  if(document.hidden || !navigator.onLine) return;
  const minutes=Math.max(0,+state.autoRefreshMinutes||0); if(!minutes) return;
  const last=state.lastAutoRefresh?new Date(state.lastAutoRefresh).getTime():0;
  if(last && Date.now()-last < minutes*60*1000*0.9) return;
  const hasRemote=state.sources.some(s=>s.remoteUrl)||state.drive.connected||!!state.epg?.remoteUrl; if(!hasRemote) return;
  try{await refreshAllSources({silent:true});state.lastAutoRefresh=new Date().toISOString();save();}
  catch(err){console.warn('Auto refresh',err);}
}

window.addEventListener('resize',()=>{clearTimeout(window.__rjpResize);window.__rjpResize=setTimeout(layout,160);});
window.addEventListener('keydown',e=>{
  if(e.key==='Escape' || e.key==='BrowserBack'){closeModal();return;}
  if((e.key==='Enter' || e.key===' ') && document.activeElement?.matches?.('[tabindex="0"]')){document.activeElement.click();e.preventDefault();return;}
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) return;
  const f=document.activeElement; if(f && ['INPUT','SELECT','TEXTAREA','VIDEO'].includes(f.tagName)) return;
  const candidates=$$('button,[tabindex="0"]:not([disabled])').filter(x=>x.offsetParent!==null);
  if(!candidates.length) return;
  if(!candidates.includes(f)){candidates[0].focus();e.preventDefault();return;}
  const next=findSpatialNeighbor(f,candidates,e.key); if(next){next.focus();e.preventDefault();}
});

function findSpatialNeighbor(current,candidates,key){
  const r=current.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
  const dir={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[key];
  let best=null,bestScore=Infinity;
  for(const el of candidates){ if(el===current) continue; const q=el.getBoundingClientRect(),x=q.left+q.width/2,y=q.top+q.height/2,dx=x-cx,dy=y-cy; const forward=dx*dir[0]+dy*dir[1]; if(forward<=1) continue; const cross=Math.abs(dx*dir[1]-dy*dir[0]); const score=forward+cross*2.6; if(score<bestScore){bestScore=score;best=el;} }
  return best;
}

if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{})); }
save();
layout();
setTimeout(()=>syncNativeVpnStatus({rerender:true}),120);
scheduleAutoRefresh();
setTimeout(()=>autoRefreshTick(),1800);
document.addEventListener('visibilitychange',()=>{if(!document.hidden) syncNativeVpnStatus({rerender:true});});
