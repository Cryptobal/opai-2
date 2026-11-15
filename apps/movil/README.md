# @opai/movil · apps nativas de OPAI

Contenedores de Capacitor que abren la web de OPAI en `/entrar` (Brief 17, ADR-044). No llevan una copia
del código web: lo que se integra a `main` llega al teléfono sin pasar por la tienda.

| Variante     | `OPAI_APP`           | Identificador     | Carpeta nativa   |
| ------------ | -------------------- | ----------------- | ---------------- |
| OPAI         | `opai` (por defecto) | `cl.opai.app`     | `nativo/opai`    |
| OPAI Terreno | `terreno`            | `cl.opai.terreno` | `nativo/terreno` |

`OPAI_APP_ENTORNO` elige la web: `test` (por defecto, `test.opai.cl`) o `produccion` (`app.opai.cl`, solo
al preparar una versión para tiendas).

## APK de prueba (Android)

Requiere JDK 21 y el SDK de Android (`ANDROID_HOME`, plataforma 36).

```bash
pnpm --filter @opai/movil apk                      # OPAI contra test.opai.cl
OPAI_APP=terreno pnpm --filter @opai/movil apk     # OPAI Terreno
```

El APK queda en `nativo/<variante>/android/app/build/outputs/apk/debug/app-debug.apk`.

## iOS

`OPAI_APP=<variante> pnpm --filter @opai/movil sincronizar` y abrir `nativo/<variante>/ios/App` en Xcode.

## Reglas

- Nada de secretos aquí: la firma para tiendas usa llaves que guarda Carlos fuera del repositorio.
- `nativo/` lo genera `cap add`; se versiona, pero no se lintea.
- La app solo navega dentro del dominio de OPAI del entorno; lo demás se abre en el navegador.
