# RJP Stream V0.3.1

Terceira versão funcional do projeto **RJP Stream**, mantendo um único código-base responsivo para telemóvel, tablet e televisão e builds específicos para Android/Android TV, Samsung Tizen e LG webOS.

## Novidades da V0.3.1

- **Correção do build Android:** `typescript` foi adicionado às `devDependencies`, permitindo ao Capacitor carregar `capacitor.config.ts` durante `npx cap add android`.

- **VPN WireGuard nativa no Android/Android TV** através de um plugin Capacitor próprio (`RJPVpn`).
- Biblioteca embebível WireGuard Android `com.wireguard.android:tunnel:1.0.20260102`.
- Importação de `.conf` WireGuard e autorização através do `VpnService` do Android.
- Configuração WireGuard cifrada com **AES/GCM + Android Keystore**; a chave privada não é guardada no `localStorage`.
- Dois modos VPN: **Só RJP Stream** e **Todo o dispositivo**.
- O modo “Só RJP Stream” usa `IncludedApplications = pt.rjp.stream`.
- Estado VPN sincronizado quando a app volta ao primeiro plano.
- **EPG/XMLTV melhorado**: canais, logótipos, programa atual, próximo programa e barra de progresso.
- Correção da leitura de datas XMLTV com fuso horário.
- Workflow GitHub atualizado para gerar o APK Android V0.3.1.
- `minSdkVersion` Android ajustado para 24 para compatibilidade com a biblioteca WireGuard usada.

## Funcionalidades já existentes

- Interface automática para **telemóvel, tablet e TV**.
- Navegação por toque, rato e **setas do comando remoto**.
- Início, TV, Filmes, Séries, Futebol, Fontes, Favoritos e Definições.
- M3U/M3U8 local e remoto.
- HLS, DASH e URL direta.
- RJP Bundle / JSON.
- EPG/XMLTV.
- Pesquisa global, canais e grupos.
- Ativar, desativar, atualizar e remover fontes.
- Backup/restauro das definições e fontes (sem chaves privadas VPN).
- Player HTML5 + HLS.js + dash.js.
- Google Drive OAuth 2.0 em modo `drive.readonly`, com pasta `RJP Stream`.
- PWA/offline shell.
- Android TV com banner e launcher Leanback.
- Estrutura base Samsung Tizen e LG webOS.

## Google Drive

Estrutura recomendada:

```text
RJP Stream/
├── sources/
│   ├── tv.m3u
│   ├── futebol.m3u
│   └── filmes.json
├── epg/
│   └── guia.xml
└── config/
    └── rjp-stream.json
```

A app usa o scope `https://www.googleapis.com/auth/drive.readonly`.

## Build Web

```bash
npm run smoke
npm run build
```

O resultado é criado em `dist/`.

## Build Android / Android TV

Requer Node 22+ e Java 21.

```bash
npm install
npm run smoke
npm run build
npx cap add android
npx cap sync android
node scripts/patch-android.mjs
cd android
./gradlew assembleDebug
```

APK esperado:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

O script `patch-android.mjs` aplica os elementos Android TV e cria o plugin VPN nativo antes do build Gradle.

## GitHub Actions

O workflow `.github/workflows/build-android.yml` executa o build do APK automaticamente. O artefacto chama-se:

```text
RJP-Stream-V0.3.1-Android-debug
```

## Nota de utilização

O Gestor de Fontes é genérico e destina-se às fontes que o utilizador tenha direito a utilizar. A aplicação não incorpora diretórios de streams não autorizados, bypass de DRM ou mecanismos de extração de credenciais.
