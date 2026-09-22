# CHANGELOG

## 1.3.0 — 2026-09-22
- Adicionada análise de listas M3U/M3U8 e JSON antes da importação.
- Resumo com total de itens, categorias e número selecionado.
- Pesquisa dentro da lista antes de importar.
- Seleção por categoria e por canal/stream individual.
- Fontes remotas M3U/JSON ganham ação `Gerir canais` para rever a seleção.
- Atualizações de fontes remotas preservam a seleção guardada.
- Importação M3U local passa pela mesma pré-visualização.
- Fontes mostram `X de Y` itens quando existe seleção parcial.
- `versionName 1.3.0`, `versionCode 10300`.

## 1.2.1 — 2026-09-22
- Corrigido erro de compilação Java em `RJPHttpPlugin.java`: `illegal line end in character literal`.
- Corrigido escape de nova linha no gerador Android (`patch-android.mjs`).
- `versionName 1.2.1`, `versionCode 10201`.

## 1.2.0 — 2026-09-22
- Adicionado gestor de **Atalhos Web pessoais** na área Fontes.
- Permite adicionar manualmente nome + URL, editar, abrir e remover.
- Atalhos ficam persistidos e incluídos no backup.
- Mantém o core agnóstico: sem descoberta automática, scraping ou bypass de DRM/autenticação.
- `versionName 1.2.0`, `versionCode 10200`.

## 1.1.0 — 2026-09-19
- Home passa a usar fontes reais em vez de conteúdo fictício.
- Adicionado histórico local até 100 reproduções.
- Adicionada retoma automática de VOD e progresso de reprodução.
- Recentes e Favoritos surgem na Home.
- Navegação TV melhorada: Enter/OK abre cartões focados.
- Botão para limpar histórico.
- Workflow Android sem cache npm dependente de lockfile.
- `versionName 1.1.0`, `versionCode 10100`.
