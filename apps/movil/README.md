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

## Reglas

- Nada de secretos aquí: la firma para tiendas usa llaves que guarda Carlos fuera del repositorio.
- `nativo/` lo genera `cap add`; se versiona, pero no se lintea.
- La app solo navega dentro del dominio de OPAI del entorno; lo demás se abre en el navegador.
- Fichas de las tiendas: `docs/2.0/apps/fichas-tiendas.md`.
