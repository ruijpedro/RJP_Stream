# Plano de testes — RJP Stream V0.3.1

## Web

- `npm run smoke`
- `npm run build`
- confirmar navegação Início / TV / Filmes / Séries / Futebol / Fontes / Favoritos / Definições
- importar M3U local
- importar XMLTV e confirmar programa atual/próximo
- testar HLS e DASH numa fonte autorizada
- testar backup e restauro

## Android / Android TV

- Node 22+ e Java 21
- `npm install`
- `npm run build`
- `npx cap add android`
- `npx cap sync android`
- `node scripts/patch-android.mjs`
- `cd android && ./gradlew assembleDebug`
- instalar `app-debug.apk`
- importar `.conf` WireGuard
- aceitar a autorização VPN Android
- testar **Só RJP Stream** e **Todo o dispositivo**
- suspender/retomar a app e confirmar atualização do indicador VPN
- testar comando remoto: setas, OK e voltar

## Samsung / LG

A interface e fontes são partilhadas, mas a VPN WireGuard nativa não é empacotada nestes sistemas. Validar navegação por comando, player nativo, CORS das fontes e armazenamento local.
