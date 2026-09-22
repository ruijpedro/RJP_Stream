# RJP Stream V1.2.1 — Test Plan

## Web / PWA
- Abrir em 360×800, 1024×768 e 1920×1080.
- Importar `data/demo.m3u` ou uma fonte válida e confirmar que a Home deixa de mostrar o onboarding.
- Abrir um item, reproduzir pelo menos 15 s, fechar e confirmar Recentemente reproduzidos.
- Num vídeo VOD, fechar a meio e confirmar retoma na próxima abertura.
- Confirmar Favoritos na Home e no separador Favoritos.
- Testar pesquisa, grupos, EPG/XMLTV, backup/restauro e Drive.

## Android / Android TV
- GitHub Actions: gerar APK/AAB.
- Confirmar ícone/banner.
- Navegar por D-pad e usar OK/Enter nos cartões.
- Testar WireGuard, split tunnel e HTTP nativo.

## Samsung / LG
- `npm run build && npm run build:tv`.
- Empacotar e testar comando remoto e HLS nativo.
