# Estado de validação — RJP Stream V0.3.1

Validado neste pacote:

- `node --check src/app.js`
- `node --check scripts/patch-android.mjs`
- `npm run smoke`
- `npm run build`
- geração de `dist/`
- simulação do `patch-android.mjs` sobre uma árvore Android de teste
- confirmação da injeção de:
  - banner/Leanback Android TV
  - `minSdkVersion = 24`
  - dependência WireGuard `1.0.20260102`
  - registo de `RJPVpnPlugin`
  - fonte Java do bridge VPN

O APK Android não foi compilado dentro deste ambiente porque a instalação online das dependências npm não concluiu. O workflow GitHub incluído executa `npm install`, Capacitor e Gradle num runner com acesso às dependências.

- Correção V0.3.1: `typescript` incluído nas devDependencies para eliminar o erro do `capacitor.config.ts` no GitHub Actions.
