# RJP Stream V1.3

Evolução da V1.2.1 com foco na importação e gestão prática de listas. Um único código-base adapta-se a telemóvel, tablet, Android TV/Google TV, Samsung Tizen e LG webOS.

## Novidades V1.3

- **Análise de listas antes da importação** por URL M3U/M3U8 ou JSON/RJP Bundle.
- Mostra imediatamente **quantos itens** e **quantas categorias** foram encontrados.
- Pré-visualização pesquisável dos canais/streams encontrados.
- Seleção por **categoria** ou por **item individual** antes de guardar.
- Botões **Selecionar tudo** e **Limpar seleção**.
- Em listas grandes, mostra até 300 resultados de cada pesquisa para manter a interface rápida; a seleção por categoria atua sobre a categoria inteira.
- As fontes remotas M3U/JSON passam a ter botão **Gerir canais (☷)** para voltar a analisar a lista e alterar a seleção.
- A atualização automática/manual preserva a seleção feita pelo utilizador numa fonte remota.
- Importação de ficheiro M3U local também passa pelo ecrã de análise antes de guardar.
- A listagem de fontes mostra `importados de disponíveis` quando foi guardado apenas um subconjunto.
- Android `versionName 1.3.0` / `versionCode 10300`.

## Funcionalidades principais

- Gestor de fontes M3U/M3U8, HLS, DASH, URL e JSON/RJP Bundle.
- EPG/XMLTV com programa atual/próximo e progresso.
- Google Drive por OAuth Web ou Apps Script Bridge.
- Player HTML5 + HLS.js + dash.js.
- Favoritos, pesquisa, histórico e retoma.
- Guia Futebol / Onde ver importável por JSON/Drive.
- WireGuard nativo em Android/Android TV com configuração cifrada no Android Keystore.
- Split tunneling: apenas RJP Stream ou todo o dispositivo.
- Atalhos Web pessoais adicionados manualmente.
- PWA, Samsung Tizen e LG webOS.

A app não inclui fontes de conteúdo, bypass de DRM, credenciais de serviços ou descoberta automática de streams não autorizados.

## Importar uma lista por URL

1. Abrir **Fontes**.
2. Carregar em **Analisar URL**.
3. Dar um nome à fonte.
4. Escolher `M3U` ou `JSON`.
5. Colar a URL e carregar em **Analisar fonte**.
6. A V1.3 apresenta o total de itens, categorias e seleção atual.
7. Escolher categorias/canais e carregar em **Importar selecionados**.

Para HLS, DASH ou uma URL de vídeo direta, usa **URL / HLS / DASH** e guarda como stream direto.

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
- Versão: **1.3.0**
- Android appId: `pt.rjp.stream`
- Autor: RJP

## Correção herdada da V1.2.1

Mantém-se a correção do gerador Android para `RJPHttpPlugin.java`, que emite corretamente `text.append(line).append('\n');` no Java gerado.
