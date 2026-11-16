# BRIEF 17 · Empaquetado nativo (parte 1: contenedores y entrada por perfil)

**Ticket:** CAR-90 (proyecto Linear «18 · Apps») · **Sesión:** Sesión Apps · **Fecha:** 14-nov-2026 · **Base:** ADR-044 (puntos 1 y 8, decisiones 12 y 13 de Carlos) y su adenda de CAR-90.

> **Actualización (14-nov-2026, CAR-495):** Carlos decidió publicar solo «OPAI». La variante «OPAI Terreno» se quitó en la parte 2a (PR #823): queda un solo contenedor, `apps/movil/src/configuracion.ts`, con su proyecto en `apps/movil/nativo/{android,ios}`. Donde este brief habla de dos variantes, vale una sola app. Fichas de tiendas: `docs/2.0/apps/fichas-tiendas.md`.

## 1. Objetivo

Empaquetar OPAI como app nativa para Android e iOS con Capacitor, sin copiar el código web al teléfono, y asegurar que al abrir la app cada perfil (guardia, cliente, supervisor, administrativo y equipo de terreno emparejado) llegue a su portal.

## 2. Estado actual (verificado en `main` `0b679cf`)

- La PWA existe (Brief 04): `app/manifest.ts` con `start_url: "/entrar"`, service worker, página sin conexión.
- `/entrar` ya lleva a la persona con sesión a su portal (cookie del dispositivo o único portal; si no, selector).
- Un equipo de terreno emparejado no tiene sesión: `/entrar` lo mandaba al login. Terreno solo lo atendía si se abría `/terreno` directo.
- No existe proyecto nativo. ROADMAP.md tenía CAR-90 en pausa hasta la migración de Gard; Carlos abrió la Sesión Apps el 14-nov-2026 para trabajarlo (se despausa).
- El proyecto de Linear pide **dos apps** («Terreno» y «ERP»); ADR-044 (24-oct) decía **una sola app**. Se resuelve en la adenda: dos variantes del mismo contenedor, publicables por separado o no (lo decide Carlos al publicar).

## 3. Alcance

**Entra:** `apps/movil` con Capacitor 8.6; variantes «OPAI» (`cl.opai.app`) y «OPAI Terreno» (`cl.opai.terreno`); proyectos Android e iOS generados; página sin conexión propia; `/entrar` atiende al equipo emparejado; pruebas unitarias de la configuración y de la entrada por perfil; e2e `@preview`; APK de prueba compilado en la sesión.

**No entra (parte 2 y siguientes):** íconos y pantalla de carga con la marca definitiva; plugins nativos (push APNs/FCM, GPS en segundo plano para rondas, biometría, almacenamiento seguro); botón atrás de Android con historial; ingreso con Google dentro de la app (Google bloquea su login en vistas web embebidas; requiere abrir el navegador del sistema y volver por enlace profundo); firma y publicación en tiendas (cuentas y llaves de Carlos).

## 4. Arquitectura

Capacitor en modo «servidor remoto»: la app nativa es un contenedor que abre `https://<entorno>/entrar`. Toda la lógica, permisos y datos siguen en la web; una versión nueva de OPAI llega al teléfono sin pasar por la tienda. El contenedor solo navega dentro del dominio de OPAI del entorno (`allowNavigation`); cualquier otro enlace se abre en el navegador del sistema. Sin tráfico en claro ni contenido mixto. El user agent lleva `OPAIApp/<variante>` para que la web sepa que está dentro de la app (sin uso todavía; se usará para ocultar «Instalar» y avisos de iPhone en la parte 2).

Variantes: un solo `capacitor.config.ts` elige con `OPAI_APP` (`opai` | `terreno`) y `OPAI_APP_ENTORNO` (`test` | `produccion`, por defecto `test`). Cada variante tiene su carpeta nativa (`apps/movil/nativo/<variante>/{android,ios}`), porque el identificador de tienda queda fijado en el proyecto nativo.

## 5. Archivos

- `apps/movil/`: `package.json`, `capacitor.config.ts`, `src/variantes.ts`, `test/variantes.test.ts`, `www/` (índice mínimo y `sin-conexion.html`), `scripts/carpeta.mjs`, `nativo/` (generado por `cap add`), `README.md`.
- `apps/web/app/(entrada)/entrar/destino.ts` (nuevo, puro) y `page.tsx`.
- `apps/web/lib/cookie-dispositivo.ts` (nuevo; la constante ya no arrastra la base al proxy), `lib/dispositivo.ts`, `proxy.ts`.
- `apps/web/test/entrar-destino.test.ts`, `apps/web/e2e/app-nativa-entrar-preview.spec.ts`.
- Docs: este brief, adenda en ADR-044, `docs/2.0/estado/apps/CAR-90.md`, ROADMAP.

## 6. Modelo de datos y migraciones

Sin cambios ni migraciones.

## 7. Capacidades

Sin capacidades nuevas: el contenedor no tiene lógica de negocio. La paridad UI↔MCP no cambia.

## 8. Interfaz y responsive

Sin pantallas nuevas en la web. La única pantalla propia del contenedor es «No pudimos abrir OPAI» (sin conexión al arrancar), con el botón «Reintentar» de 44 px y respeto de la zona segura. Usa los colores del sistema (claro y oscuro) porque se muestra antes de cargar el DS.

## 9. Seguridad y tenant

- `proxy.ts` deja pasar `/entrar` sin sesión **solo** si trae la cookie del equipo; la página valida el token contra la base (`dispositivoPorToken`) y, si no existe, manda al login. Un token falso no abre nada.
- Sin secretos en el repositorio: la app no lleva llaves; firmar para tiendas usa llaves que guarda Carlos fuera del repo.
- `allowNavigation` limitado al dominio del entorno; `cleartext: false`; `allowMixedContent: false`.

## 10. Casos límite

- Sin red al abrir: Capacitor muestra `sin-conexion.html` y «Reintentar» vuelve a intentar la carga.
- Equipo revocado: `/entrar` lo manda a `/terreno/emparejar`.
- Portal guardado al que la persona ya no tiene acceso: se ignora.
- Persona con sesión y cookie de equipo a la vez: manda la sesión.

## 11. Plan por bloques

1. `apps/movil`: contenedor, variantes, proyectos nativos y pruebas.
2. `/entrar` para el equipo emparejado y prueba de entrada por perfil.
3. Documentación (brief, adenda, estado, README).

## 12. Tests

- `apps/movil/test/variantes.test.ts`: variantes, entorno por defecto test, navegación restringida, user agent, página sin conexión.
- `apps/web/test/entrar-destino.test.ts`: guardia → `/trabajador`, cliente → `/cliente`, supervisor → `/supervisor`, administrativo → `/`, varios → selector, equipo emparejado → `/terreno`.
- `apps/web/e2e/app-nativa-entrar-preview.spec.ts` (`@preview`): con el user agent de la app, el usuario `qa-e2e` cae en su portal; un equipo desconocido va al login con `next=/entrar`.

## 13. Validación

Gate local (`typecheck`, `lint`, `test`); `cap sync` y `./gradlew assembleDebug` de las dos variantes (APK de prueba, `aapt2 dump badging` y `capacitor.config.json` embebido revisados); `preview-e2e` con la etiqueta `e2e`. iOS: proyecto generado; su compilación requiere Xcode (Mac) y queda para la parte 2.

## 14. Criterios de aceptación

- Las dos variantes compilan en Android y abren `https://test.opai.cl/entrar`.
- Las pruebas de entrada por perfil pasan.
- Un equipo emparejado que abre la app cae en Terreno.
- Ningún secreto en el repositorio; `secretos` en verde.

## 15. Riesgos y rollback

- Guía 4.2 de Apple (envoltorios sin valor propio): mitigación en la parte 2 con plugins nativos reales (push, GPS en segundo plano).
- Login con Google dentro de la app: bloqueado por Google en vistas web; por ahora correo y contraseña.
- Rollback: revertir el PR. `apps/movil` no participa del build de Vercel; el cambio de `/entrar` solo agrega el caso del equipo emparejado.

## 16. Reporte de ejecución

Ver `docs/2.0/estado/apps/CAR-90.md`.
