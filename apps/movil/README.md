# @opai/movil · app nativa «OPAI»

Contenedor de Capacitor que abre la web de OPAI en `/entrar` (Brief 17, ADR-044). No lleva una copia del
código web: lo que se integra a `main` llega al teléfono sin pasar por la tienda. Se publica una sola app,
«OPAI» (`cl.opai.app`), para todos los perfiles (decisión de Carlos, 14-nov-2026, CAR-495).

`OPAI_APP_ENTORNO` elige la web: `test` (por defecto, `test.opai.cl`) o `produccion` (`app.opai.cl`, solo
al preparar una versión para tiendas).

## APK de prueba (Android)

Requiere JDK 21 y el SDK de Android (`ANDROID_HOME`, plataforma 36).

```bash
pnpm --filter @opai/movil apk
```

El APK queda en `nativo/android/app/build/outputs/apk/debug/app-debug.apk`.

## iOS

`pnpm --filter @opai/movil sincronizar` y abrir `nativo/ios/App` en Xcode.

### TestFlight desde GitHub Actions (CAR-733)

Solo disparo **manual** (`workflow_dispatch` en el workflow **iOS · TestFlight**). No corre en push ni en PR: los minutos de macOS en Actions cuestan ~10× y Carlos no aprobó corridas automáticas.

**Antes de disparar**

1. Secretos en el repositorio (`Settings → Secrets and variables → Actions`): `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8` (contenido del `.p8` en base64, sin imprimirlo). Opcional: `GOOGLE_SERVICE_INFO_PLIST` (base64 del plist de Firebase; se escribe en el runner y **no** se versiona).
2. La corrida hace `pnpm install --frozen-lockfile` y `OPAI_APP_ENTORNO=produccion pnpm --filter @opai/movil sincronizar` (actualiza `Package.swift` de SPM y `www/` antes de compilar).
3. El build usa firma automática con la llave de API de App Store Connect (`PRG52N5SNA`, `cl.opai.app`), `-allowProvisioningUpdates` y sube **solo a TestFlight** (nunca envía el build a revisión de App Store).

**Número de build:** `github.run_number + 100` (sobrescribe `CURRENT_PROJECT_VERSION` en la línea de comandos).

**Riesgo · certificados de distribución:** con firma automática en la nube, Xcode puede crear o renovar certificados «Apple Distribution». Apple limita cuántos certificados de distribución activos puede tener un team; corridas repetidas en distintos runners (o builds locales con otra identidad) pueden agotar el cupo y fallar con errores de firma. Antes de disparar de nuevo, conviene revisar en [Apple Developer → Certificates](https://developer.apple.com/account/resources/certificates/list) y revocar certificados huérfanos si el workflow falla por provisioning.

## Ícono y pantalla de carga

Fuentes en `assets/`: el logo actual de OPAI, el monograma de `scripts/generar-iconos-pwa.ts` (decisión de Carlos, 14-nov-2026). Los archivos de `nativo/android/app/src/main/res` y de `nativo/ios/App/App/Assets.xcassets` salen de esas fuentes. Si cambia el logo, se reemplazan las fuentes y se regeneran esos archivos.

## Push nativo (FCM / APNs)

El cableado de Google está listo en Android; **no versiones** los archivos con claves del proyecto Firebase:

| Plataforma | Archivo (fuera del repo) | Ubicación |
| ---------- | ------------------------ | --------- |
| Android | `google-services.json` | `nativo/android/app/google-services.json` |
| iOS | `GoogleService-Info.plist` | `nativo/ios/App/App/GoogleService-Info.plist` (agrégalo al target en Xcode) |

Carlos los obtiene en la consola de Firebase para `cl.opai.app`. En el servidor, `FIREBASE_SERVICE_ACCOUNT` (JSON de cuenta de servicio) en Vercel habilita el emisor FCM HTTP v1; sin esa variable el backend no envía push nativo y no falla.

Tras colocar los archivos: `pnpm --filter @opai/movil sincronizar`.

## Reglas

- Nada de secretos aquí: la firma para tiendas usa llaves que guarda Carlos fuera del repositorio.
- `nativo/` lo genera `cap add`; se versiona, pero no se lintea.
- La app solo navega dentro del dominio de OPAI del entorno; lo demás se abre en el navegador.
- Fichas de las tiendas: `docs/2.0/apps/fichas-tiendas.md`.
