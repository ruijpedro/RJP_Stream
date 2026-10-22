# Limpeza do pacote V1.6

Foram retirados `dist/` e `tv-builds/` (resultados gerados automaticamente), uma cópia redundante do manifesto e ficheiros de estado/testes desatualizados.

O projeto-fonte, playlists, ícones, scripts, documentação, funcionalidades e GitHub Actions foram preservados.

Para reconstruir: `npm install`, `npm run check`; para TV: `npm run build:tv`. O workflow Android executa a construção automaticamente no GitHub.
