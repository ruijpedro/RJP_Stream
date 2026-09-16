# Google Drive — RJP Stream V0.2

## 1. Google Cloud
1. Cria/seleciona um projeto no Google Cloud Console.
2. Ativa **Google Drive API**.
3. Configura o OAuth consent screen.
4. Cria uma credencial **OAuth client ID > Web application**.
5. Adiciona como Authorized JavaScript origin o domínio onde a WebApp vai correr.
6. Copia o Client ID `...apps.googleusercontent.com`.

## 2. Na RJP Stream
1. Abre **Definições > Google Drive**.
2. Cola o Client ID.
3. Mantém a pasta `RJP Stream` ou escolhe outro nome.
4. Carrega em **Ligar e sincronizar**.
5. Autoriza apenas leitura do Drive.

## 3. Estrutura recomendada

```text
RJP Stream/
├── sources/
│   ├── tv.m3u
│   ├── desporto.m3u
│   └── catalogo.json
├── epg/
│   └── guia.xml
└── config/
    └── rjp-stream.json
```

`rjp-stream.json` pode conter, por exemplo:

```json
{
  "layout": "auto",
  "disabledSources": ["Lista de teste"]
}
```

A V0.2 usa `drive.readonly`: não altera nem elimina ficheiros do Drive.
