# TV Platforms

## Android / Android TV / Google TV
Um único APK/AAB pode usar o mesmo frontend. O script `patch-android.mjs` acrescenta suporte a dispositivos sem touchscreen e sinaliza compatibilidade Leanback.

## Samsung Tizen
Usa o conteúdo de `dist/` num projeto Tizen Web. O ficheiro `platforms/tizen/config.xml.example` serve de base.

## LG webOS
Usa o conteúdo de `dist/` num projeto webOS TV. O ficheiro `platforms/webos/appinfo.json.example` serve de base.

## Navegação por comando
A V0.1 inclui navegação básica por setas do teclado/comando entre elementos focáveis e tecla Escape/Back para fechar janelas.
