# RJP Stream V1.5 — Test Plan

## Fontes / análise de listas
- Abrir **Fontes → Analisar URL**.
- Introduzir uma lista M3U válida e confirmar total de itens e categorias.
- Pesquisar um canal no ecrã de análise.
- Desmarcar uma categoria inteira e confirmar que o contador de selecionados muda.
- Desmarcar/marcar um canal individual.
- Importar apenas parte da lista e confirmar que a fonte mostra `X de Y item(ns)`.
- Em fonte remota M3U/JSON, usar o botão `☷` e confirmar que a seleção anterior reaparece.
- Atualizar a fonte e confirmar que apenas a seleção guardada continua carregada.
- Importar `data/demo.m3u` por ficheiro e confirmar que aparece primeiro a pré-visualização.

## Web / PWA
- Abrir em 360×800, 1024×768 e 1920×1080.
- Abrir um item e confirmar reprodução/histórico.
- Confirmar Favoritos, pesquisa, grupos, EPG/XMLTV, backup/restauro e Drive.

## Android / Android TV
- GitHub Actions: gerar APK/AAB.
- Confirmar ícone/banner.
- Navegar por D-pad e usar OK/Enter nos cartões e no analisador de listas.
- Testar WireGuard, split tunnel e HTTP nativo.

## Samsung / LG
- `npm run build && npm run build:tv`.
- Empacotar e testar comando remoto e HLS nativo.
