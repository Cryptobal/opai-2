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
- Prueba de que cada perfil cae en su portal (guardia, cliente, supervisor, administrativo, equipo emparejado) y e2e `@preview` con el user agent de la app.

## Qué queda pendiente

- **Parte 2:** íconos y pantalla de carga con la marca; push nativo (APNs/FCM) por el adaptador del núcleo; GPS en segundo plano para rondas; botón atrás de Android con historial; ocultar «Instalar» y el aviso de iPhone dentro de la app (user agent `OPAIApp/`); ingreso con Google por el navegador del sistema (Google lo bloquea en vistas web embebidas).
- Compilar iOS en un Mac con Xcode.
- Probar en un teléfono real que «Reintentar» de la página sin conexión vuelve a cargar.
- Publicar en tiendas: firma, cuentas de desarrollador y fichas (Carlos; ver «Decide Carlos»).

## Qué se decidió

- **Dos variantes del mismo contenedor** en vez de elegir entre «una sola app» (ADR-044, decisión 13) y «dos apps» (proyecto de Linear): ambas abren la misma entrada, así que publicar una o las dos queda para Carlos sin rehacer nada. Adenda en ADR-044.
- **Servidor remoto** en vez de copiar la web al teléfono: cada versión llega sin pasar por la tienda y no hay dos builds que mantener.
- CAR-90 deja de estar en pausa (ROADMAP): Carlos abrió la Sesión Apps el 14-nov-2026 para trabajarlo.
