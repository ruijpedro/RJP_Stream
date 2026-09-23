# CHANGELOG

## 1.5.0 — 2026-09-23
- Novo indexador de catálogo Web para os Atalhos Web adicionados pelo utilizador.
- Deteção de filmes, séries/episódios e programas por JSON-LD e elementos visíveis no HTML.
- Cada site mostra contadores de jogos e itens de catálogo.
- Novo botão `☷ Ver catálogo` por site, com pesquisa e filtro Filmes/Séries/Programas.
- Separadores Filmes, Séries e TV passam a mostrar os títulos indexados nos sites.
- Pesquisa global inclui catálogo Web.
- Atualização manual/automática reindexa jogos e catálogo.
- Mantida a regra de não extrair URLs de vídeo, players, DRM, tokens ou autenticação.
- `versionName 1.5.0`, `versionCode 10500`.

## 1.4.0 — 2026-09-22
- Adicionado indexador de jogos nos Atalhos Web adicionados pelo utilizador.
- Ação `⚽ Listar jogos` em cada site.
- Ação `Futebol → Atualizar sites` para atualizar todos os sites configurados.
- Leitura de JSON-LD `SportsEvent/Event` e deteção heurística de fixtures no HTML visível.
- Lista agregada de jogos por equipas/data/hora, com indicação dos sites onde cada jogo foi encontrado.
- Botão para abrir a página pública do evento em cada site.
- Guardados `games`, `lastScan`, `scanStatus` e `scanGames` por Atalho Web.
- Atualização global/automática inclui os sites marcados para análise.
- O indexador ignora links diretos de media (`m3u/m3u8/mpd/mp4/mkv/ts`) e não extrai players, DRM, tokens ou autenticação.
- Mantidas as funções de análise/seletor de M3U/M3U8/JSON da V1.3.
- `versionName 1.4.0`, `versionCode 10400`.

## 1.3.0 — 2026-09-22
- Análise de listas M3U/M3U8 e JSON antes da importação.
- Resumo com total de itens, categorias e número selecionado.
- Pesquisa e seleção por categoria/canal antes de importar.
- Fontes remotas M3U/JSON ganham `Gerir canais`.

## 1.2.1 — 2026-09-22
- Corrigido erro de compilação Java em `RJPHttpPlugin.java`: `illegal line end in character literal`.
- Corrigido escape de nova linha no gerador Android.

## 1.2.0 — 2026-09-22
- Gestor de Atalhos Web pessoais.

## 1.1.0 — 2026-09-19
- Home com fontes reais, histórico, retoma e melhorias de navegação TV.
