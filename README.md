# RJP Stream V1.5

Evolução da V1.4 com foco em **listar o que está disponível nos sites adicionados**. Para além dos jogos, a aplicação passa a indexar metadados públicos de **filmes, séries e programas** visíveis na página adicionada e a apresentá-los nos respetivos separadores.

## Novidades V1.5

- **Catálogo Web por Atalho Web**.
- Ao adicionar/editar um site podes ativar separadamente:
  - procura de jogos;
  - listagem de filmes, séries e programas.
- Cada site mostra agora contadores de **Jogos** e **Catálogo**.
- Botão **☷ Ver catálogo** em cada Atalho Web.
- O catálogo por site tem pesquisa e filtros: **Filmes / Séries / Programas**.
- Os títulos indexados aparecem automaticamente em:
  - **Filmes** → filmes encontrados nos sites;
  - **Séries** → séries/episódios encontrados nos sites;
  - **TV** → programas/shows encontrados nos sites;
  - **Futebol** → jogos encontrados nos sites.
- A pesquisa global também pesquisa o catálogo Web.
- Deteção por JSON-LD (`Movie`, `TVSeries`, `TVEpisode`, `BroadcastEvent` e tipos relacionados) e por cartões/links visíveis no HTML.
- Guarda apenas metadados de catálogo: título, categoria, imagem quando disponível, descrição curta/metadados e **link da página pública**.
- Atualização global e atualização automática voltam a indexar os sites configurados.
- Android `versionName 1.5.0` / `versionCode 10500`.

## Como usar

1. Abrir **Fontes**.
2. Em **Atalhos Web pessoais**, escolher **Adicionar**.
3. Dar um nome e colar a URL da página que contém a lista pretendida.
4. Ativar **Procurar jogos** e/ou **Listar filmes, séries e programas**.
5. Guardar; a app faz a primeira indexação.
6. No site guardado, usar **☷** para ver todo o catálogo que foi detetado ou **↻** para atualizar.
7. Abrir **Filmes**, **Séries**, **TV** ou **Futebol** para ver as listas agregadas dos sites adicionados.

Se um site tiver páginas separadas para Filmes/Séries/Programas, podes adicionar cada página como um Atalho Web para obter uma listagem mais completa.

## Limites do indexador Web

A V1.5 indexa apenas **metadados públicos** devolvidos no HTML/JSON-LD da página adicionada. Não extrai URLs de vídeo, iframes/players, tokens, DRM, credenciais ou mecanismos de autenticação.

Sites que constroem o catálogo exclusivamente depois de executar JavaScript podem não ser detetados. No browser, Samsung e LG, uma origem também pode bloquear leitura por CORS. No APK Android/Android TV, a app dispõe do fallback HTTP nativo já existente.

## Restantes funcionalidades

- Gestor de fontes M3U/M3U8, HLS, DASH, URL e JSON/RJP Bundle.
- Pré-visualização e seleção de canais/categorias antes de importar.
- EPG/XMLTV com programa atual/próximo e progresso.
- Google Drive por OAuth Web ou Apps Script Bridge.
- Player HTML5 + HLS.js + dash.js.
- Favoritos, pesquisa, histórico e retoma.
- Guia Futebol / Onde ver importável por JSON/Drive.
- WireGuard nativo em Android/Android TV com configuração cifrada no Android Keystore.
- Split tunneling: apenas RJP Stream ou todo o dispositivo.
- Interface responsiva para telemóvel, tablet e TV.
- PWA, Samsung Tizen e LG webOS.

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

O workflow `.github/workflows/build-android.yml` publica APK + AAB debug.

## Samsung / LG

```bash
npm run build
npm run build:tv
```

Saídas: `tv-builds/tizen/` e `tv-builds/webos/`.

## Identificação

- Nome: **RJP Stream**
- Versão: **1.5.0**
- Android appId: `pt.rjp.stream`
- Autor: RJP
