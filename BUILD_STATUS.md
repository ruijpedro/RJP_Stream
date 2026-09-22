# RJP Stream V1.2 — Build status

Validado neste pacote:
- `node --check src/app.js`: PASS
- `node scripts/smoke.mjs`: PASS
- `node scripts/build.mjs`: PASS
- `node scripts/build-tv.mjs`: PASS
- Web build (`dist/`) atualizado
- Samsung Tizen e LG webOS builds regenerados
- Android preparado para `versionName 1.2.0` / `versionCode 10200`

Novo na V1.2:
- Atalhos Web pessoais: adicionar manualmente nome + URL, abrir, editar e remover.
- Persistência local e inclusão no backup/restauro.
- Sem catálogo pré-carregado, descoberta automática, scraping, extração de streams, bypass de DRM ou autenticação.
