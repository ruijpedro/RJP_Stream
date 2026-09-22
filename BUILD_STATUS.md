# RJP Stream V1.2.1 — Build status

Correção desta versão:
- Corrigido o Java gerado para `RJPHttpPlugin.java`: o `\n` do `BufferedReader` era convertido pelo template JavaScript numa quebra de linha literal dentro de um `char`, causando `illegal line end in character literal`.
- O gerador passa agora a emitir corretamente `.append('\\n')` no script, resultando em `.append('\n')` no Java gerado.
- Workflow e metadados atualizados para `1.2.1` / `versionCode 10201`.

Validado neste pacote:
- `node --check scripts/patch-android.mjs`: PASS
- `node --check src/app.js`: PASS
- `node scripts/smoke.mjs`: PASS
- `node scripts/build.mjs`: PASS
- `node scripts/build-tv.mjs`: PASS
- Simulação do patch Android: PASS
- `RJPHttpPlugin.java` gerado contém `text.append(line).append('\n');` válido em Java.

O build Gradle final continua a ser executado pelo GitHub Actions.
