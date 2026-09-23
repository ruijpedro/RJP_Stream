# Google Drive — RJP Stream V1.5

Há duas vias.

## Apps Script Bridge — recomendado em Android/TV

Usa os ficheiros em `backend/google-drive-bridge/`. O Web App deve executar como o proprietário do Drive. Define um token secreto longo no `Code.gs`, publica e coloca a URL `/exec` e o mesmo token na RJP Stream.

## OAuth Web

Cria um OAuth 2.0 Client ID do tipo Web Application no Google Cloud, ativa a Google Drive API e autoriza a origem onde a WebApp é servida. Coloca o Client ID em Definições. A app pede apenas `https://www.googleapis.com/auth/drive.readonly`.

O token OAuth é guardado apenas na sessão. A aplicação não modifica nem apaga ficheiros do Drive.
