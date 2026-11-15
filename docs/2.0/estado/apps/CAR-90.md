# CAR-90 · Empaquetado nativo (Brief 17), parte 1

- **Sesión:** Sesión Apps
- **PR:** pendiente · rama `brief/car-90-empaquetado-nativo`
- **Estado:** En PR
- **Migración:** No
- **Apilado sobre / espera:** —

## Qué entra

- `apps/movil`: contenedor Capacitor 8.6 en modo servidor remoto, con dos variantes: «OPAI» (`cl.opai.app`) y «OPAI Terreno» (`cl.opai.terreno`). Ambas abren `/entrar` en `test.opai.cl` por defecto; `app.opai.cl` solo al preparar tiendas. Navegación limitada al dominio del entorno, sin tráfico en claro, página propia «No pudimos abrir OPAI» sin conexión.
- Proyectos Android e iOS generados por variante. Las dos variantes compilan un APK de prueba en Android (verificado en la sesión con `assembleDebug`).
- `/entrar` atiende al equipo de terreno emparejado sin sesión: va a Terreno (o a emparejar si lo revocaron). El proxy deja pasar `/entrar` sin sesión solo con la cookie del equipo.
- Prueba de que cada perfil cae en su portal (guardia, cliente, supervisor, administrativo, equipo emparejado): función pura y página `/entrar` con sesión y equipo simulados, más e2e `@preview` con el user agent de la app.
- Android sin respaldo automático (`allowBackup=false`): el respaldo copiaría la cookie del equipo emparejado a otro teléfono (hallazgo de la autorrevisión).

## Parte 2a (PR apilado sobre la parte 1)

- Botón atrás de Android: `@capacitor/app` 8; sin código web, vuelve en el historial y cierra la app en la primera pantalla (comportamiento por defecto del plugin). APK compilado.
- **Una sola app (decisión de Carlos, CAR-495):** se quitó la variante «OPAI Terreno». Queda `src/configuracion.ts`, con el proyecto nativo en `nativo/android` y `nativo/ios`. El APK compila (`cl.opai.app`, «OPAI»).
- Fichas de Google Play y App Store en `docs/2.0/apps/fichas-tiendas.md`, sin publicar, con la lista de lo que falta para publicar.
- La web reconoce la app por el user agent (`lib/app-nativa.ts`). En Notificaciones del Portal Trabajador, dentro de la app ya no pide «agregar OPAI a la pantalla de inicio» (en la app no existe ese paso): avisa que los verá en la campana hasta que llegue el push nativo.

## Qué queda pendiente

- **Parte 2:** íconos y pantalla de carga con la marca; push nativo (APNs/FCM) por el adaptador del núcleo; GPS en segundo plano para rondas; ingreso con Google por el navegador del sistema (Google lo bloquea en vistas web embebidas).
- Compilar iOS en un Mac con Xcode.
- Probar en un teléfono real que «Reintentar» de la página sin conexión vuelve a cargar (usa `history.back()`; si al arrancar sin red no hay historial, cambiar a recargar la entrada).
- El e2e `@preview` acepta el portal del usuario `qa-e2e` o el selector; afirmar el portal exacto cuando haya usuarios de prueba por perfil.
- Publicar en tiendas: lo que falta está en la lista de `docs/2.0/apps/fichas-tiendas.md` (URL pública de privacidad y correo de soporte de Carlos, logo, usuario revisor, push nativo por la guía 4.2 de Apple, cuentas y llaves).

## Qué se decidió

- **Solo «OPAI» en las tiendas** (Carlos, 14-nov-2026, CAR-495; adenda 2 de ADR-044). Reemplaza la decisión de las dos variantes de abajo.

- **Dos variantes del mismo contenedor** en vez de elegir entre «una sola app» (ADR-044, decisión 13) y «dos apps» (proyecto de Linear): ambas abren la misma entrada, así que publicar una o las dos queda para Carlos sin rehacer nada. Adenda en ADR-044.
- **Servidor remoto** en vez de copiar la web al teléfono: cada versión llega sin pasar por la tienda y no hay dos builds que mantener.
- CAR-90 deja de estar en pausa (ROADMAP): Carlos abrió la Sesión Apps el 14-nov-2026 para trabajarlo.
