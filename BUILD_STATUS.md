# RJP Stream V1.5 — Build status

## Alterações principais
- Indexação de **jogos + catálogo Web** nos Atalhos Web.
- Catálogo classificado em **Filmes, Séries e Programas**.
- Visualização por site com pesquisa/filtros.
- Integração do catálogo nos separadores Filmes, Séries, TV e na pesquisa global.
- `versionName 1.5.0` / `versionCode 10500`.

## Validações executadas
- `node --check src/app.js`: **PASS**
- `node --check scripts/patch-android.mjs`: **PASS**
- `node scripts/smoke.mjs`: **PASS**
- `node scripts/test-playlist.mjs`: **PASS**
- `node scripts/build.mjs`: **PASS**
- `node scripts/build-tv.mjs`: **PASS**
- Patch Android simulado duas vezes: **PASS / idempotente**
- Android simulado: `versionCode 10500`, `versionName 1.5.0`: **PASS**
- `RJPHttpPlugin.java` gerado contém `text.append(line).append('\\n');`: **PASS**
- Registo dos plugins Android sem duplicação após dois patches: **PASS**

## Nota do indexador Web
O parser depende do HTML/JSON-LD que a página devolve. Sites com CORS ou renderização exclusivamente JavaScript podem não ser indexados no browser/TV. O APK Android dispõe de fallback HTTP nativo. A V1.5 indexa apenas metadados e links de página; não extrai URLs de vídeo, players, DRM, tokens ou autenticação.

O build Gradle final (APK/AAB) continua preparado no GitHub Actions.
