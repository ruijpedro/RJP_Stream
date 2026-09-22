# RJP Stream V1.2

Evolução da V1.0 com foco no uso real diário. Um único código-base adapta-se a telemóvel, tablet, Android TV/Google TV, Samsung Tizen e LG webOS.

## Novidades V1.1

- Ecrã inicial passa a usar **conteúdo real das fontes ativas**; foram retirados os cartões fictícios da Home.
- **Histórico de reprodução** local até 100 itens.
- **Retomar reprodução** em vídeos com duração conhecida.
- Barra de progresso nos itens parcialmente vistos.
- "Recentemente reproduzidos" e "Favoritos" diretamente na Home.
- Tecla **OK/Enter** passa a abrir cartões focados no modo TV/Android TV.
- Ação para **limpar histórico** nas Definições.
- Workflow Android endurecido: não depende de `npm cache` sem lockfile e mostra versões de Node/npm/Java antes do build.
- Android `versionName 1.2.0` / `versionCode 10200`.

## Funcionalidades principais

- Gestor de fontes M3U/M3U8, HLS, DASH, URL e JSON/RJP Bundle.
- EPG/XMLTV com programa atual/próximo e progresso.
- Google Drive por OAuth Web ou Apps Script Bridge.
- Player HTML5 + HLS.js + dash.js.
- Favoritos, pesquisa, histórico e retoma.
- Guia Futebol / Onde ver importável por JSON/Drive.
- WireGuard nativo em Android/Android TV com configuração cifrada no Android Keystore.
- Split tunneling: apenas RJP Stream ou todo o dispositivo.
- PWA, Samsung Tizen e LG webOS.

A app não inclui fontes de conteúdo, bypass de DRM, credenciais de serviços ou descoberta automática de streams não autorizados.

## Build Android / Android TV

Requisitos: Node 22 e Java 21.

```bash
npm install --include=dev --no-audit --no-fund
npm run check
npx cap add android
npx cap sync android
node scripts/patch-android.mjs
cd android
./gradlew assembleDebug bundleDebug --stacktrace
```

O workflow `.github/workflows/build-android.yml` executa estes passos e publica APK + AAB debug.

## Samsung / LG

```bash
npm run build
npm run build:tv
```

Saídas: `tv-builds/tizen/` e `tv-builds/webos/`.

## Identificação

- Nome: **RJP Stream**
- Versão: **1.2.0**
- Android appId: `pt.rjp.stream`
- Autor: RJP


## V1.2 — Atalhos Web pessoais
- Novo gestor de atalhos Web adicionados manualmente pelo utilizador.
- Nome + URL, editar, abrir e remover.
- Os atalhos entram no backup/restauro.
- Não existe descoberta automática de sites, extração de streams, bypass de DRM ou autenticação.
