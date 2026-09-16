import fs from 'node:fs';
import path from 'node:path';

const manifest='android/app/src/main/AndroidManifest.xml';
if(!fs.existsSync(manifest)){
  console.log('Android ainda não foi criado. Executa npx cap add android && npx cap sync android.');
  process.exit(0);
}

const pkg='pt.rjp.stream';
const javaDir='android/app/src/main/java/pt/rjp/stream';
fs.mkdirSync(javaDir,{recursive:true});

// Android TV + banner
let s=fs.readFileSync(manifest,'utf8');
if(!s.includes('android.software.leanback')){
  s=s.replace('<application', '<uses-feature android:name="android.software.leanback" android:required="false" />\n    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />\n    <application');
}
if(!s.includes('android:banner="@drawable/rjp_stream_banner"')){
  s=s.replace('<application', '<application android:banner="@drawable/rjp_stream_banner"');
}
if(!s.includes('android.intent.category.LEANBACK_LAUNCHER')){
  s=s.replace('</activity>', `    <intent-filter>\n        <action android:name="android.intent.action.MAIN" />\n        <category android:name="android.intent.category.LEANBACK_LAUNCHER" />\n    </intent-filter>\n</activity>`);
}
fs.writeFileSync(manifest,s);

const drawable='android/app/src/main/res/drawable-nodpi';
fs.mkdirSync(drawable,{recursive:true});
fs.copyFileSync('assets/android-tv-banner.png',path.join(drawable,'rjp_stream_banner.png'));
const densities={mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192};
for(const [density,size] of Object.entries(densities)){
  const dir=`android/app/src/main/res/mipmap-${density}`;
  fs.mkdirSync(dir,{recursive:true});
  const src=`assets/icons/icon-${size}.png`;
  if(fs.existsSync(src)) fs.copyFileSync(src,path.join(dir,'ic_launcher.png'));
}

// WireGuard embeddable tunnel library. This version is available from Maven Central.
const appGradle='android/app/build.gradle';
let gradle=fs.readFileSync(appGradle,'utf8');
const wgDep=`implementation 'com.wireguard.android:tunnel:1.0.20260102'`;
if(!gradle.includes('com.wireguard.android:tunnel')){
  gradle=gradle.replace(/dependencies\s*\{/, m=>`${m}\n    ${wgDep}`);
  fs.writeFileSync(appGradle,gradle);
}

// WireGuard 1.0.20260102 requires API 24+.
const vars='android/variables.gradle';
if(fs.existsSync(vars)){
  let v=fs.readFileSync(vars,'utf8');
  v=v.replace(/minSdkVersion\s*=\s*\d+/, 'minSdkVersion = 24');
  fs.writeFileSync(vars,v);
}

const mainActivity=path.join(javaDir,'MainActivity.java');
let main=fs.existsSync(mainActivity)?fs.readFileSync(mainActivity,'utf8'):`package ${pkg};\n\nimport com.getcapacitor.BridgeActivity;\n\npublic class MainActivity extends BridgeActivity {}\n`;
if(!main.includes('registerPlugin(RJPVpnPlugin.class)')){
  if(!main.includes('import android.os.Bundle;')) main=main.replace(`package ${pkg};`, `package ${pkg};\n\nimport android.os.Bundle;`);
  if(main.includes('public class MainActivity extends BridgeActivity {}')){
    main=main.replace('public class MainActivity extends BridgeActivity {}', `public class MainActivity extends BridgeActivity {\n    @Override\n    public void onCreate(Bundle savedInstanceState) {\n        registerPlugin(RJPVpnPlugin.class);\n        super.onCreate(savedInstanceState);\n    }\n}`);
  } else if(main.includes('public class MainActivity extends BridgeActivity {') && !main.includes('void onCreate(')){
    main=main.replace('public class MainActivity extends BridgeActivity {', `public class MainActivity extends BridgeActivity {\n    @Override\n    public void onCreate(Bundle savedInstanceState) {\n        registerPlugin(RJPVpnPlugin.class);\n        super.onCreate(savedInstanceState);\n    }`);
  } else if(main.includes('void onCreate(')){
    main=main.replace(/(void\s+onCreate\s*\([^)]*\)\s*\{)/, '$1\n        registerPlugin(RJPVpnPlugin.class);');
  }
  fs.writeFileSync(mainActivity,main);
}

const plugin=`package ${pkg};

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.VpnService;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.wireguard.android.backend.GoBackend;
import com.wireguard.android.backend.Tunnel;
import com.wireguard.config.Config;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "RJPVpn")
public class RJPVpnPlugin extends Plugin {
    private static final String PREFS = "rjp_stream_vpn";
    private static final String KEY_CONFIG = "config_encrypted";
    private static final String KEY_NAME = "config_name";
    private static final String KEY_SPLIT = "split_only";
    private static final String KEY_ALIAS = "rjp_stream_wireguard_aes";

    private GoBackend backend;
    private final AppTunnel tunnel = new AppTunnel("RJPStream");

    @Override
    public void load() {
        backend = new GoBackend(getContext().getApplicationContext());
    }

    @PluginMethod
    public void importConfig(PluginCall call) {
        final String raw = call.getString("config");
        String name = call.getString("name", "RJPStream");
        final Boolean split = call.getBoolean("splitOnly", true);
        if (raw == null || raw.trim().isEmpty()) { call.reject("Configuração WireGuard vazia."); return; }
        name = sanitizeTunnelName(name);
        try {
            Config.parse(new ByteArrayInputStream(effectiveConfig(raw, split).getBytes(StandardCharsets.UTF_8)));
            prefs().edit()
                    .putString(KEY_CONFIG, encrypt(raw))
                    .putString(KEY_NAME, name)
                    .putBoolean(KEY_SPLIT, split)
                    .apply();
            tunnel.setName(name);
            JSObject out = statusObject();
            out.put("imported", true);
            call.resolve(out);
        } catch (Exception e) {
            call.reject("Configuração WireGuard inválida: " + safeMessage(e), e);
        }
    }

    @PluginMethod
    public void setSplitOnly(PluginCall call) {
        final Boolean split = call.getBoolean("splitOnly", true);
        prefs().edit().putBoolean(KEY_SPLIT, split).apply();
        JSObject out = new JSObject(); out.put("splitOnly", split); call.resolve(out);
    }

    @PluginMethod
    public void connect(PluginCall call) {
        try {
            if (!isConfigured()) { call.reject("Importa primeiro um ficheiro WireGuard .conf."); return; }
            final Intent permission = VpnService.prepare(getContext());
            if (permission != null) {
                startActivityForResult(call, permission, "vpnPermissionResult");
                return;
            }
            connectNow(call);
        } catch (Exception e) {
            call.reject("Não foi possível preparar a VPN: " + safeMessage(e), e);
        }
    }

    @ActivityCallback
    private void vpnPermissionResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() != Activity.RESULT_OK) { call.reject("Permissão VPN recusada."); return; }
        connectNow(call);
    }

    private void connectNow(PluginCall call) {
        try {
            final String raw = decrypt(prefs().getString(KEY_CONFIG, null));
            final boolean split = prefs().getBoolean(KEY_SPLIT, true);
            final String name = sanitizeTunnelName(prefs().getString(KEY_NAME, "RJPStream"));
            tunnel.setName(name);
            final Config config = Config.parse(new ByteArrayInputStream(effectiveConfig(raw, split).getBytes(StandardCharsets.UTF_8)));
            backend.setState(tunnel, Tunnel.State.UP, config);
            call.resolve(statusObject());
        } catch (Exception e) {
            call.reject("Falha ao ligar WireGuard: " + safeMessage(e), e);
        }
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        try {
            if (backend.getState(tunnel) == Tunnel.State.UP) backend.setState(tunnel, Tunnel.State.DOWN, null);
            call.resolve(statusObject());
        } catch (Exception e) {
            call.reject("Falha ao desligar WireGuard: " + safeMessage(e), e);
        }
    }

    @PluginMethod
    public void status(PluginCall call) {
        try { call.resolve(statusObject()); }
        catch (Exception e) { call.reject("Não foi possível obter o estado da VPN: " + safeMessage(e), e); }
    }

    @PluginMethod
    public void clearConfig(PluginCall call) {
        try {
            if (backend.getState(tunnel) == Tunnel.State.UP) backend.setState(tunnel, Tunnel.State.DOWN, null);
        } catch (Exception ignored) {}
        prefs().edit().clear().apply();
        call.resolve(statusObject());
    }

    private JSObject statusObject() {
        JSObject out = new JSObject();
        boolean connected = false;
        try { connected = backend != null && backend.getState(tunnel) == Tunnel.State.UP; } catch (Exception ignored) {}
        out.put("available", true);
        out.put("configured", isConfigured());
        out.put("connected", connected);
        out.put("splitOnly", prefs().getBoolean(KEY_SPLIT, true));
        out.put("name", prefs().getString(KEY_NAME, "RJPStream"));
        return out;
    }

    private SharedPreferences prefs() { return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE); }
    private boolean isConfigured() { return prefs().contains(KEY_CONFIG); }

    private String effectiveConfig(String raw, boolean splitOnly) {
        if (!splitOnly) return raw;
        String cleaned = raw.replaceAll("(?im)^\\\\s*(IncludedApplications|ExcludedApplications)\\\\s*=.*(?:\\\\r?\\\\n|$)", "");
        int section = cleaned.toLowerCase().indexOf("[interface]");
        if (section < 0) return cleaned;
        int eol = cleaned.indexOf('\\n', section);
        if (eol < 0) return cleaned + "\\nIncludedApplications = " + getContext().getPackageName() + "\\n";
        return cleaned.substring(0, eol + 1) + "IncludedApplications = " + getContext().getPackageName() + "\\n" + cleaned.substring(eol + 1);
    }

    private String sanitizeTunnelName(String name) {
        String n = name == null ? "RJPStream" : name.replaceAll("[^a-zA-Z0-9_=+.-]", "");
        if (n.isEmpty()) n = "RJPStream";
        if (n.length() > 15) n = n.substring(0, 15);
        return n;
    }

    private String encrypt(String plain) throws Exception {
        SecretKey key = getOrCreateKey();
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, key);
        String iv = Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP);
        String enc = Base64.encodeToString(cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP);
        return iv + "." + enc;
    }

    private String decrypt(String value) throws Exception {
        if (value == null || !value.contains(".")) throw new IllegalStateException("Configuração VPN não encontrada.");
        String[] parts = value.split("\\\\.", 2);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), new GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)));
        return new String(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), StandardCharsets.UTF_8);
    }

    private SecretKey getOrCreateKey() throws Exception {
        KeyStore ks = KeyStore.getInstance("AndroidKeyStore"); ks.load(null);
        if (!ks.containsAlias(KEY_ALIAS)) {
            KeyGenerator gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
            gen.init(new KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .build());
            gen.generateKey();
        }
        return (SecretKey) ks.getKey(KEY_ALIAS, null);
    }

    private String safeMessage(Throwable e) {
        String m = e.getMessage(); return (m == null || m.trim().isEmpty()) ? e.getClass().getSimpleName() : m;
    }

    private static final class AppTunnel implements Tunnel {
        private String name;
        AppTunnel(String name) { this.name = name; }
        void setName(String name) { this.name = name; }
        @Override public String getName() { return name; }
        @Override public void onStateChange(State newState) { }
    }
}
`;
fs.writeFileSync(path.join(javaDir,'RJPVpnPlugin.java'),plugin);

console.log('Android preparado: telemóvel/tablet/TV + ícones/banner + plugin WireGuard nativo RJPVpn.');
