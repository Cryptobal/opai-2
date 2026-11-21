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

## Ícono y pantalla de carga

Fuentes en `assets/`: el logo actual de OPAI, el monograma de `scripts/generar-iconos-pwa.ts` (decisión de Carlos, 14-nov-2026). Los archivos de `nativo/android/app/src/main/res` y de `nativo/ios/App/App/Assets.xcassets` salen de esas fuentes. Si cambia el logo, se reemplazan las fuentes y se regeneran esos archivos.

## Push nativo (FCM / APNs)

El cableado de Google está listo en Android; **no versiones** los archivos con claves del proyecto Firebase:

| Plataforma | Archivo (fuera del repo) | Ubicación |
| ---------- | ------------------------ | --------- |
| Android | `google-services.json` | `nativo/android/app/google-services.json` |
| iOS | `GoogleService-Info.plist` | `nativo/ios/App/App/GoogleService-Info.plist` (copia local o inyección en CI) |

Carlos los obtiene en la consola de Firebase para `cl.opai.app` (proyecto **opai-d194a**). En el servidor, `FIREBASE_SERVICE_ACCOUNT` (JSON de cuenta de servicio) en Vercel habilita el emisor FCM HTTP v1; sin esa variable el backend no envía push nativo y no falla.

**iOS y FCM:** el backend envía por FCM HTTP v1, no por APNs crudo. La app enlaza `FirebaseMessaging` por SPM; `AppDelegate` reenvía el token FCM a Capacitor (`@capacitor/push-notifications`). Sin `GoogleService-Info.plist` el proyecto **compila**; en runtime no crashea, pero no registra token. En CI (CAR-733, PR #1110) el script `ios-testflight.sh` decodifica el secreto y escribe el plist en disco antes del archive; la fase Xcode «Copy GoogleService-Info.plist» solo copia el archivo al bundle (sin leer secretos del entorno).

Tras colocar los archivos (o tras sync de CI): `pnpm --filter @opai/movil sincronizar`.

## Reglas

- Nada de secretos aquí: la firma para tiendas usa llaves que guarda Carlos fuera del repositorio.
- `nativo/` lo genera `cap add`; se versiona, pero no se lintea.
- La app solo navega dentro del dominio de OPAI del entorno; lo demás se abre en el navegador.
- Fichas de las tiendas: `docs/2.0/apps/fichas-tiendas.md`.
