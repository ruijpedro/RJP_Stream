# VPN WireGuard — RJP Stream V1.5

No Android/Android TV, a aplicação integra a biblioteca `com.wireguard.android:tunnel:1.0.20260102` e usa o Android `VpnService`.

- Importa um `.conf` WireGuard válido.
- A chave/configuração é cifrada com AES/GCM através do Android Keystore.
- `Só RJP Stream`: adiciona a aplicação ao túnel (split tunneling).
- `Todo o dispositivo`: usa a configuração normal do túnel.
- A primeira ligação mostra o diálogo de autorização VPN do Android.

A RJP Stream não fornece servidores VPN; é necessário usar um servidor WireGuard próprio ou um fornecedor que disponibilize configurações WireGuard.

Samsung Tizen e LG webOS não expõem às apps web uma VPN de sistema equivalente ao Android `VpnService`.
