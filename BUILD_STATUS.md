# RJP Stream V1.3 — Build status

## Alterações principais
- Análise de fontes M3U/M3U8 e JSON antes da importação.
- Resumo de itens, categorias e seleção.
- Seleção por categoria e por canal/stream individual.
- Pesquisa no catálogo antes de importar.
- Gestão posterior da seleção em fontes remotas M3U/JSON (`☷`).
- Atualização manual/automática preserva a seleção guardada.
- Importação M3U local usa a mesma pré-visualização.
- `versionName 1.3.0` / `versionCode 10300`.

## Validações executadas
- `node --check src/app.js`: **PASS**
- `node --check scripts/patch-android.mjs`: **PASS**
- `npm run smoke`: **PASS**
- `npm run test:playlist`: **PASS**
- `npm run build`: **PASS**
- `npm run build:tv`: **PASS**
- Simulação do patch Android executada duas vezes: **PASS / idempotente**
- Android simulado: `versionCode 10300`, `versionName 1.3.0`: **PASS**
- `RJPHttpPlugin.java` gerado contém `text.append(line).append('\n');`: **PASS**
- Registo dos plugins Android sem duplicação após dois patches: **PASS**

O build Gradle final (APK/AAB) continua a ser executado pelo GitHub Actions, onde ficam disponíveis as dependências Android/Gradle completas.
