# VPN WireGuard — RJP Stream V0.3

A V0.3 acrescenta um **plugin Android nativo** (`RJPVpn`) ao projeto Capacitor. O plugin usa a biblioteca embebível oficial WireGuard para Android:

```gradle
implementation 'com.wireguard.android:tunnel:1.0.20260102'
```

O script `scripts/patch-android.mjs` injeta esta dependência, regista o plugin e sobe o `minSdkVersion` para 24.

## Utilização

1. Instalar/compilar o APK Android ou Android TV.
2. Abrir **Definições > VPN WireGuard**.
3. Escolher o encaminhamento:
   - **Só RJP Stream** — acrescenta `IncludedApplications = pt.rjp.stream` à configuração usada pelo túnel.
   - **Todo o dispositivo** — usa a configuração WireGuard como foi importada.
4. Importar um ficheiro `.conf` WireGuard válido.
5. Carregar em **Ligar VPN** e aceitar a autorização VPN do Android na primeira utilização.

## Segurança da configuração

A configuração `.conf` contém a chave privada. Na versão Android ela é guardada cifrada com **AES/GCM** usando uma chave criada no **Android Keystore**. O texto integral da configuração não é colocado no `localStorage` da WebView nem exportado no backup RJP Stream.

Na versão web/Tizen/webOS a app apenas valida os campos básicos do `.conf`; não existe VPN de sistema equivalente ao `VpnService` do Android.

## Servidores

O motor VPN não fornece servidores por si próprio. É necessário importar uma configuração de um servidor WireGuard próprio ou de um fornecedor que disponibilize ficheiros WireGuard compatíveis.
