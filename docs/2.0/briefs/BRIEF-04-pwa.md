# BRIEF DE IMPLEMENTACIÓN — 04 BASE PWA (Núcleo, paso 2)

**Repositorio:** `Cryptobal/opai-2` · **Rama de ejecución:** `brief/04-pwa` (desde `main` actualizado) · **Fecha:** 26-oct-2026 · **Estado:** **propuesto, pendiente de la aprobación de Carlos** · **Tarea:** CAR-? (este documento; el ID lo fija Carlos o el bot OPAI 2.0 al crear la tarea en Linear, y va en `Fixes CAR-?` del PR) · **Depende de:** Brief 02 (sesiones A–C integradas) y el shell de portales de hoy. **No depende** del PR 2 del Brief 03 ni del Brief 05: la base PWA no mueve el shell. **Pedido por Carlos:** «escribe el Brief 04» (26-oct-2026 13:06 CLT, t328u, chat con el bot OPAI 2.0). **Reglas:** ADR-044 (PWA), ADR-045 (rendimiento y presupuesto), ADR-037 (presupuesto de JS), ADR-028 (marca del tenant), ADR-033 (portales), `NAVEGACION.md` (§4 portales, §8 estado de hoy) y `CONTEXTO-agentes.md` · **Diseño:** **no necesita diseño propio** (decisión de Carlos, 25-oct-2026; `ROADMAP.md`, `PLAN-desarrollo.md` N2). Reutiliza el DS 2.0 aprobado (`packages/ds`, ADR-014): íconos, colores y pantalla de carga salen de los tokens; el shell sin conexión del teléfono de Terreno ya está dibujado en el export del DS (`design/export-ds-2.0/pantallas/ShellPhone.html`, `ShellPhoneDark.html`, `PLAN-desarrollo.md` M6).

> **Ejecución.** Claude ejecuta este brief cuando Carlos lo apruebe, en la rama `brief/04-pwa`, con un commit por bloque y el gate en verde, autorrevisión con un subagente, PR y revisión del «Revisor OPAI 2.0»; integra el bot «OPAI 2.0» con squash (ADR-043 v3). Es un brief **de código** (manifest, íconos, service worker, página sin conexión, aviso de actualización y prueba en CI); no toca base de datos ni agrega capacidades (§6 y §7). Antes de empezar, el bloque 0 confirma el estado del repo y resuelve las «Decisiones para Carlos» (§17): **la elección del service worker (D2) y de la ruta de entrada (D1) condiciona los bloques 1 y 2.**

---

## 1. Objetivo

Hacer **una sola app «OPAI» instalable** desde el celular y el escritorio (ADR-044), que al abrirse lleve a cada persona a su portal según su membresía, con íconos y pantalla de inicio de marca, un **service worker** con **actualización controlada** y una **página sin conexión**, y una **prueba en CI** que verifique el manifest, el registro del service worker y que el shell de los portales de terreno carga sin red. Es la **base** de ADR-044: deja lista la instalación, el cascarón offline y la actualización; **la cola sin conexión de hechos de terreno (marcación, rondas, novedades) y el push nacen con el primer módulo de terreno** (ADR-044, «Consecuencias»), no aquí.

Se nota que funciona cuando:

- Carlos instala OPAI en su celular desde el navegador y, al abrirla, entra a su portal sin barra del navegador (modo `standalone`), con el ícono y la pantalla de inicio de OPAI.
- Al perder la red, la app muestra una página sin conexión clara en vez del dinosaurio del navegador, y el cascarón del portal de terreno sigue cargando.
- Cuando hay una versión nueva, la app lo avisa y la actualiza solo cuando la persona acepta; nunca se recarga sola a mitad de una pantalla.
- El CI falla si el manifest es inválido, si el service worker no se registra o si el shell de terreno no carga sin red.

## 2. Estado actual del repo (verificado el 26-oct-2026 sobre `main` `f656324`)

1. **No hay nada de PWA todavía:** no existe `apps/web/public/`, ni `app/manifest.ts`, ni service worker, ni íconos, ni `apple-touch-icon`. Lo confirma ADR-044 («no hay manifest, service worker, íconos ni carpeta `public/`», verificado entonces en `fe362cc`; sigue igual en `f656324`).
2. **`apps/web/app/layout.tsx`** ya trae `metadata.applicationName = "OPAI"`, `title` con plantilla `%s · OPAI`, `viewport.viewportFit = "cover"` (habilita `env(safe-area-inset-*)` en iOS) y un `<script>` en `<head>` que aplica el tema (`opai_tema` de `localStorage`) antes de pintar. **Falta** `theme-color`, `apple-mobile-web-app-capable`, `apple-touch-icon` y el enlace al manifest (Next 16 agrega el `<link rel="manifest">` solo si existe `app/manifest.ts`).
3. **Portales y rutas (route groups):** `(erp)` (sin prefijo: `/` es el Inicio del ERP, `app/(erp)/page.tsx`), `(supervisor)` (`/supervisor`), `(trabajador)` (`/trabajador`), `(terreno)` (`/terreno`), `(cliente)` (`/cliente`) y `(platform)` (`/platform`). Cada uno tiene su `layout.tsx` con `CargaPortal`/`PaginaPortal`, su catch-all `[...ruta]` con «No encontrado» y estado 404 dentro de su shell (QA pasada 3 y 4). **Supervisor** tiene Hoy e Instalaciones; **Trabajador, Terreno y Cliente** son placeholders con solo Inicio y su 404 (login de Cliente dice «Próximamente»; `NAVEGACION.md` §8, `PLAN-desarrollo.md` M6).
4. **Entrada por portal:** hoy no hay una ruta única de entrada que elija portal por membresía. `proxy.ts` solo filtra sesión (sin cookie → `/login`) y reescribe fichas inexistentes a 404; `requerirIdentidad` resuelve la empresa actual. El `start_url` del manifest necesita una ruta de entrada (D1).
5. **Service worker en el stack:** **Serwist NO está en los `package.json`** (ni `serwist`, ni `next-pwa`, ni `workbox`), pese a que ADR-044 lo da «en el stack del arranque». Tampoco está `@lhci/cli` (Lighthouse CI). Hay que elegir (D2) y, si se usa una dependencia, agregarla y verificar su compatibilidad con **Next 16.4 + Turbopack + Cache Components** (React 19.3).
6. **Presupuesto de JS (ADR-037):** `apps/web/presupuesto-js.json` tiene `framework: 132`, `porDefecto: 165`, `maxSobreFramework: 35` y topes por ruta para `(auth)`, `configuracion*`, `instalaciones/nueva`, `personas/vencimientos`, `cargos/[id]`, `platform/tenants/[id]/*` y `/ds*`. **No hay topes para las rutas de terreno** (`/terreno`, `/trabajador`, `/supervisor`): ADR-044 pide ≤ 150 KB por ruta de terreno. El gate corre con `pnpm presupuesto` (`scripts/presupuesto-js.ts`) tras `pnpm --filter @opai/web build`.
7. **e2e:** Playwright con proyectos `telefono` (375, `isMobile`, `hasTouch`), `ipad` (1024) y `desktop` (1280) en `apps/web/playwright.config.ts`; corre en el job `e2e` de CI, que **no es check obligatorio** (ADR-043 v3). `pnpm --filter @opai/web e2e` lo ejecuta.
8. **Tokens de marca:** `packages/ds/src/tokens.css` es el único archivo con colores (ADR-014); de ahí salen `theme_color`/`background_color`, en claro y oscuro. El **logo definitivo de OPAI está pendiente** (`ESTADO.md`, «Pendientes de diseño del sistema»): los íconos de la base son provisionales (D4).

## 3. Alcance

### Incluido

- **Un solo manifest de OPAI** (`app/manifest.ts`): nombre «OPAI», `short_name`, `start_url` único, `display: standalone`, `theme_color`/`background_color` desde tokens, `id`, `scope`, `lang: es-CL`, íconos 192 y 512 normales y `maskable`, `apple-touch-icon` y orientación. Marca del tenant cuando exista (ADR-028); OPAI por defecto.
- **Ruta de entrada** a la que apunta `start_url`, que abre el portal de la persona según su membresía (el último usado o un selector si tiene varios), reutilizando lo que ya resuelve la identidad (D1).
- **Íconos y meta de instalación:** íconos en `public/` (o generados), `apple-touch-icon`, `theme-color` (claro y oscuro), `apple-mobile-web-app-capable`/`mobile-web-app-capable`, título de la app, safe-area.
- **Service worker** (D2): registro, precache del **cascarón de los portales de terreno** (Terreno, Trabajador, Supervisor) y de la página sin conexión; *network-first* para documentos, RSC y datos; *cache-first* para estáticos con hash; **nunca** cachea respuestas de `/api/v1`, `/api/mcp` ni datos de negocio (§9).
- **Página sin conexión** por portal, con el DS: dice que no hay red, qué se puede hacer y reintenta al volver la conexión.
- **Actualización controlada:** el service worker nuevo queda **en espera**; la app muestra «Hay una versión nueva · Actualizar» y solo al aceptar activa el nuevo y recarga. Nunca se activa solo.
- **Aviso de instalación en contexto:** en los portales de terreno, un aviso discreto y descartable para instalar; en iOS, instrucciones de «Agregar a pantalla de inicio» (iOS no expone `beforeinstallprompt`).
- **Presupuesto de las rutas de terreno** en `presupuesto-js.json` (≤ 150 KB gzip por ruta) y su medición.
- **Prueba en CI:** Playwright verifica manifest válido (campos, íconos que existen, `start_url` dentro del `scope`), registro y control del service worker, y carga del cascarón de terreno con `context.setOffline(true)`; presupuesto de JS de terreno (ADR-037). Lighthouse CI según D3.

### Excluido (nace después, por ADR-044)

- **Cola sin conexión de hechos de terreno** (marcación, rondas, novedades en IndexedDB con `idempotencyKey`, hora del dispositivo, GPS y evidencia) y su sincronización/Background Sync: **con el primer módulo de terreno** (Rondas o Asistencia), con su escenario de prueba sin red (ADR-044.3 y «Consecuencias»). Aquí solo queda el cascarón y la página offline, sin capturar ni encolar hechos.
- **Push** (Web Push con VAPID, suscripciones por dispositivo, permiso en contexto): se declara el canal en Comunicaciones (ADR-020) y se activa con el módulo que lo use; el permiso se pide al activar un aviso, nunca al abrir (ADR-044.4). Este brief no pide permiso ni suscribe.
- **Cámara, GPS y verificación facial:** con los módulos que los usan (Asistencia, Rondas), por `core.documentos` y el adaptador de biometría (ADR-044.5, ADR-039).
- **Empaquetado nativo con Capacitor** (iOS/Android, GPS en segundo plano, push nativo): fase 3, Brief 17 (ADR-044.8).
- **Rediseño de navegación** (Brief 05) y **arreglos de rendimiento del shell** (Brief 03, PR 2): van en sus briefs. Este brief no mueve el shell al layout ni cambia la navegación.

## 4. Arquitectura

### 4.1 Reglas (de ADR-044; no cambian)

R1. **Una sola app «OPAI»** instalable para todos los portales; el `start_url` abre el portal según la membresía, con selector si hay varias (ADR-044.1, decisión 13 de Carlos del 24-oct). No hay un manifest ni una instalación por portal.
R2. **Service worker con actualización controlada:** el nuevo queda en espera y la app ofrece actualizar; nunca se activa a mitad de una tarea (ADR-044.2).
R3. **Sin conexión solo donde corresponde:** terreno. Lo demás (ERP, configuración, cotizador, finanzas) requiere conexión y lo dice con un estado claro (ADR-044.3).
R4. **El service worker no cachea datos de negocio:** *network-first* para RSC y datos, *cache-first* solo para estáticos con hash; la seguridad sigue en el servidor (ADR-044.2, §9).
R5. **Marca del tenant** en íconos y colores cuando el tenant los tenga; OPAI por defecto (ADR-028, ADR-044.1).
R6. **Presupuesto de terreno:** primera carga ≤ 150 KB de JS gzip por ruta de terreno (framework 132 + ≤ 18 KB propios); con el service worker, la segunda carga no descarga JS (ADR-044.6, ADR-037).
R7. **Prueba en CI equivalente a la categoría PWA** (que Lighthouse 12 quitó): manifest válido, service worker que controla la página y shell de terreno sin red (ADR-044.7).

### 4.2 Manifest (`app/manifest.ts`)

- Función de Next 16 que devuelve `MetadataRoute.Manifest`. Campos: `name: "OPAI"`, `short_name: "OPAI"`, `description`, `id: "/"`, `start_url` (D1), `scope: "/"`, `display: "standalone"`, `orientation: "portrait"` para terreno (a confirmar), `lang: "es-CL"`, `dir: "ltr"`, `background_color` y `theme_color` desde `tokens.css`, `categories`, e `icons` (192, 512, `maskable` y `any`).
- **`start_url` dentro del `scope`** (lo exige la prueba de CI). La marca del tenant (nombre, íconos, color) se resuelve por el perfil de marca del núcleo cuando exista (ADR-028); el manifest estático lleva la marca OPAI y, si se decide una variante por tenant, se sirve por una ruta parametrizada en un brief posterior (no aquí).

### 4.3 Ruta de entrada (`start_url`) — ver D1

El `start_url` lleva a una ruta que, con la sesión ya resuelta, redirige al portal de la persona: el último usado (una preferencia de dispositivo o de ámbito usuario) o un selector si tiene varias membresías/portales. Reutiliza `requerirIdentidad`/`resolverActor` y el selector de portal del shell; sin sesión, `proxy.ts` ya manda a `/login`, y tras entrar se vuelve a la ruta de entrada.

### 4.4 Service worker — ver D2

Dos caminos posibles (D2), con el mismo comportamiento observable (R2–R4):

- **(a) Serwist** (lo nombra ADR-044): precache y estrategias declarativas, actualización con `skipWaiting` controlado. Exige agregar la dependencia y **verificar su compatibilidad con Next 16.4 + Turbopack + Cache Components**; si no la hay, ADR-044 ya autoriza el camino (b).
- **(b) Service worker propio mínimo, sin dependencias:** un `public/sw.js` (o generado) que en `install` precachea el cascarón de terreno y la página offline, en `fetch` aplica *network-first* para navegación/documentos/RSC con respaldo a la página offline y *cache-first* para estáticos con hash, y en `message` hace `skipWaiting` solo cuando la app lo pide. Registro desde un componente cliente pequeño en los layouts de los portales de terreno (y, si se decide, en todos).

Sea cual sea, **el registro es explícito** (no lo inyecta un plugin a ciegas) y el service worker **no intercepta `/api/*`** salvo para devolver la página offline en una navegación.

### 4.5 Actualización controlada

El registrador detecta un service worker `waiting` (`registration.waiting`) y muestra el aviso «Hay una versión nueva · Actualizar» con un componente del DS. Al aceptar, envía `postMessage({type:"SKIP_WAITING"})`; el service worker hace `skipWaiting()` y, en `controllerchange`, la app recarga una vez. Sin aceptar, se queda en la versión actual. (Las versiones que fuercen actualización al terminar una sincronización de la cola local llegan con el módulo de terreno; ADR-044.2.)

## 5. Archivos (previstos)

- `apps/web/app/manifest.ts` (nuevo): el manifest de OPAI.
- `apps/web/app/layout.tsx`: `theme-color` (claro y oscuro), `apple-mobile-web-app-capable`, `apple-touch-icon`, título de la app en `metadata`.
- `apps/web/public/` (nuevo): íconos (192, 512, maskable), `apple-touch-icon`, y `sw.js` si se elige el camino (b). Nota: subir `public/` revisa el `.gitignore` y los permitidos de `apps/web/paridad-permitidos.json` si algún archivo de `public` se sirviera desde `app/**`.
- Ruta de entrada del `start_url` (D1): p. ej. `apps/web/app/(entrada)/entrar/page.tsx` o la que resuelva la decisión; con su redirección por membresía.
- Registro del service worker: un componente cliente pequeño (p. ej. `apps/web/app/_components/pwa/registrar-sw.tsx`) y el aviso de actualización (`aviso-actualizacion.tsx`), montados en los layouts de los portales de terreno.
- Página sin conexión por portal: `apps/web/app/(terreno)/.../offline` o un componente de estado offline del DS reutilizado; aviso de instalación (`aviso-instalar.tsx`).
- Componentes del DS si faltan (banda de actualización, banda de instalar, estado «sin conexión»): se agregan a `packages/ds` con sus estados en `/ds` (ADR-017), nunca al módulo.
- `apps/web/presupuesto-js.json`: topes de `/terreno`, `/trabajador`, `/supervisor` (≤ 150 KB).
- `apps/web/e2e/pwa.spec.ts` (nuevo): manifest, registro del service worker y carga offline del cascarón de terreno.
- CI (`.github/workflows/*`): el job de e2e ya existe; si D3 incluye Lighthouse CI, se agrega `@lhci/cli` y su paso (informe o gate según D3).
- `docs/2.0/ESTADO.md`, `docs/2.0/ROADMAP.md` y, si cambia el estado de hoy, `docs/2.0/NAVEGACION.md` §8.

## 6. Modelo de datos y migraciones

**Sin migraciones.** El manifest, los íconos y el service worker son activos estáticos; la ruta de entrada y el aviso de actualización no guardan datos de negocio. La **última preferencia de portal** (D1), si se persiste, es un ajuste de ámbito usuario existente (ADR-038, como los `preferencias_*`), sin tabla nueva; si se guarda solo en el dispositivo, no toca la base. Las **suscripciones de push por dispositivo** (ADR-044.4, ADR-029.10) y la **cola local** (ADR-044.3) llegan con sus módulos, con sus migraciones.

## 7. Capacidades

- **Sin capacidades nuevas.** El manifest y el service worker no son datos de negocio, así que no tienen capacidad ni herramienta MCP (igual criterio que los recientes del Brief 05, §7). La ruta de entrada solo **lee** la identidad y las membresías que ya resuelve el núcleo.
- Si la última preferencia de portal se persiste como ajuste de usuario (D1), va por `core.config.get/set` existentes, sin capacidad nueva.
- **El gate de paridad sigue en verde:** no se agrega ninguna pantalla con datos sin su capacidad; `apps/web/app/**` y `apps/web/lib/**` no importan `@opai/db` (el registro del service worker y el manifest no leen la base).

## 8. Interfaz y responsive

- **Instalada (`standalone`):** sin barra del navegador; safe-area iOS respetada (ya hay `viewportFit: "cover"`); barra de estado con `theme-color` acorde al tema; pantalla de inicio con la marca.
- **Aviso de instalación:** discreto, descartable, en los portales de terreno; en Android/escritorio usa `beforeinstallprompt`; en iOS, instrucciones de «Compartir → Agregar a pantalla de inicio». Touch targets ≥ 44 px, foco visible, contraste AA, claro y oscuro.
- **Aviso de actualización:** banda inferior o superior del DS, no modal, no bloquea; botón «Actualizar» ≥ 44 px.
- **Página sin conexión:** estado ilustrado del DS, con el mensaje y un botón «Reintentar»; reaparece el contenido al volver la red (evento `online`). En los portales que requieren conexión (ERP, etc.), el estado deja claro que necesita red (R3).
- **Mobile e iPad first:** verificado a 375 y 1024 px; sin scroll horizontal; el aviso no tapa la barra inferior.

## 9. Seguridad y tenant

- **El service worker nunca es la barrera de seguridad.** No cachea respuestas de `/api/v1`, `/api/mcp`, documentos firmados de R2 ni ningún dato de negocio (R4); solo el cascarón (HTML/JS/CSS con hash) y la página offline, que no llevan datos de un tenant. La sesión y el acceso se siguen verificando en el servidor en cada navegación.
- **`scope` acotado** a `/` bajo el mismo origen (`test.opai.cl`); el service worker no controla otros orígenes.
- **Sin datos personales en caché** (Ley 21.719; Brief 07d): la página offline y el cascarón no muestran datos de personas. Cuando llegue la cola local (otro brief), los hechos en IndexedDB llevarán su propio cuidado de datos y se limpiarán al cerrar sesión.
- **Cierre de sesión / cambio de empresa:** al salir, el service worker no debe servir contenido de una sesión anterior; el cascarón es común y los datos van siempre por red. Se verifica que cerrar sesión y volver a entrar no muestre nada cacheado con datos.
- **Marca del tenant:** íconos y colores del tenant solo desde el perfil de marca del núcleo (ADR-028); nunca se hardcodea la marca de Gard.

## 10. Casos límite

- **Navegador sin soporte de service worker o PWA** (o iOS con limitaciones): la app funciona igual online; la instalación y el offline degradan sin romper. El registro va dentro de `if ("serviceWorker" in navigator)`.
- **iOS:** `beforeinstallprompt` no existe; el aviso muestra instrucciones. El push solo funciona con la app ya instalada en pantalla de inicio (iOS 16.4+); por eso aquí no se pide permiso (llega con el módulo que lo use).
- **Modo privado / almacenamiento no disponible:** el registro del service worker puede fallar; se captura y la app sigue online sin aviso de error.
- **Versión nueva mientras se usa la app:** queda en espera y se avisa; no se recarga sola (R2). Como aún no hay cola local, no hay sincronización que forzar (eso llega con el módulo de terreno).
- **Red intermitente en terreno:** la navegación cae a la página offline y reintenta al volver `online`; el cascarón ya está precacheado.
- **`start_url` de una persona sin ERP** (p. ej. solo Supervisor): la ruta de entrada la lleva a su portal, no a `/` del ERP (D1).
- **Despliegue nuevo con assets con hash distinto:** *cache-first* solo acierta con el hash vigente; los viejos se limpian en `activate`.

## 11. Plan por bloques (un commit por bloque)

Un **solo PR** (`brief/04-pwa`), con `Fixes CAR-?`. Orden pensado para que cada bloque deje algo verificable.

- **Bloque 0 · Lectura, decisiones y verificación.** Confirmar §2 sobre `main`; resolver con Carlos D1 (ruta de entrada) y D2 (service worker), que condicionan los bloques 1 y 2; si D2 usa una dependencia, un *spike* de compatibilidad con Next 16.4 + Turbopack + Cache Components antes de comprometerla. Sin este cierre, el bloque 2 se **detiene**.
- **Bloque 1 · `core:` manifest, íconos y meta.** `app/manifest.ts`, íconos provisionales en `public/` (D4), `theme-color`/`apple-touch-icon`/`apple-mobile-web-app-capable` en `layout.tsx`, y la **ruta de entrada** del `start_url` (D1). Verificable: la app se puede instalar y abre el portal correcto; manifest válido.
- **Bloque 2 · `core:`/`ds:` service worker y página sin conexión.** Registro, precache del cascarón de terreno, estrategias de caché (R4) y página offline por portal. Verificable: con la red cortada, el cascarón de terreno carga y aparece la página offline; `/api/*` no se cachea.
- **Bloque 3 · `ds:`/`core:` actualización controlada y aviso de instalación.** Service worker en espera + banda «Hay una versión nueva · Actualizar» (R2) y aviso de instalar en contexto (iOS con instrucciones). Componentes nuevos del DS en `/ds` con sus estados.
- **Bloque 4 · `ci:` presupuesto de terreno y prueba en CI.** Topes de `/terreno`, `/trabajador`, `/supervisor` en `presupuesto-js.json` (R6); `e2e/pwa.spec.ts` (manifest, registro del service worker, shell offline). Lighthouse CI según D3. Verificable: el gate falla si el manifest es inválido, el service worker no controla la página, el shell no carga sin red o una ruta de terreno supera su tope.
- **Bloque 5 · `docs:` cierre.** `ESTADO.md`, `ROADMAP.md`, `NAVEGACION.md` §8 si cambia el estado de hoy, y el reporte con el resumen ejecutivo.

## 12. Tests

- **e2e (`pwa.spec.ts`, 375 y 1024; también 1280):**
  - **Manifest:** se sirve, es JSON válido, tiene los campos obligatorios, los íconos declarados existen (200) y el `start_url` está dentro del `scope`.
  - **Service worker:** se registra y **controla** la página (`navigator.serviceWorker.controller` no nulo tras la primera carga).
  - **Sin conexión:** con `context.setOffline(true)`, el cascarón del portal de terreno carga y aparece la página offline; al volver `online`, el contenido vuelve. Una respuesta de `/api/v1` **no** se sirve desde la caché.
  - **Actualización:** con un service worker `waiting` simulado, aparece la banda y, al aceptar, se activa (no antes).
- **Presupuesto de JS (ADR-037):** `/terreno`, `/trabajador` y `/supervisor` ≤ 150 KB gzip; cualquier subida de tope se justifica en el PR.
- **Lighthouse CI (D3):** en emulación móvil sobre las rutas de terreno, rendimiento y accesibilidad ≥ 90, como informe o gate según la decisión. Nota: hoy los portales de terreno son placeholders, así que la medición es sobre el cascarón.
- **Gate de paridad y de presupuesto** en verde; `tools/list` en `main` sin cambios (este brief no toca capacidades).

## 13. Validación

`pnpm typecheck && pnpm lint && pnpm test` antes de cada commit; `pnpm --filter @opai/web build` + `pnpm presupuesto`; `pnpm --filter @opai/web e2e pwa` local a 375, 1024 y 1280 contra `next start`; instalación real probada en un celular (Android/Chrome y iOS/Safari) y en escritorio; revisión con `docs/2.0/checklists/qa.md`. Medición de ADR-045 no aplica a datos (el service worker no agrega consultas); se mide que la segunda carga no descargue JS (R6).

## 14. Criterios de aceptación

- **CA1.** La app se **instala** desde el celular (Android y iOS) y desde el escritorio y abre en modo `standalone`, sin barra del navegador, con el ícono y la pantalla de inicio de OPAI.
- **CA2.** **Un solo manifest** válido: `start_url` dentro del `scope`, íconos 192/512/maskable y `apple-touch-icon` presentes, `theme_color`/`background_color` desde tokens; el `start_url` lleva a cada persona a su portal según su membresía (selector si hay varios).
- **CA3.** El **service worker se registra y controla** la página; *network-first* para documentos/RSC/datos, *cache-first* para estáticos con hash; **no** cachea `/api/v1`, `/api/mcp` ni datos de negocio.
- **CA4.** **Sin conexión:** el cascarón de los portales de terreno carga y aparece una **página offline** del DS; los portales que requieren red lo dicen con un estado claro; al volver la red, el contenido vuelve.
- **CA5.** **Actualización controlada:** con una versión nueva, la app avisa y solo actualiza al aceptar; nunca se recarga sola.
- **CA6.** **Presupuesto de terreno** ≤ 150 KB gzip por ruta (`/terreno`, `/trabajador`, `/supervisor`); la segunda carga no descarga JS.
- **CA7.** **CI:** el job de PWA falla si el manifest es inválido, si el service worker no controla la página o si el shell de terreno no carga sin red; el presupuesto de JS falla si una ruta de terreno supera su tope.
- **CA8.** **Seguridad:** cerrar sesión y volver a entrar no muestra contenido cacheado con datos; el `scope` es del propio origen.
- **CA9.** Claro y oscuro con contraste AA y foco visible; touch targets ≥ 44 px; safe-area; sin scroll horizontal a 375; componentes nuevos del DS en `/ds` con sus estados y sin hex fuera de `tokens.css`.

## 15. Riesgos y rollback

- **Service worker + Turbopack/Next 16/Cache Components:** el mayor riesgo. Serwist no está en el repo y su compatibilidad con Turbopack en Next 16 no está verificada (§2.5). Mitigación: *spike* en el bloque 0; si no es limpio, service worker propio mínimo (ADR-044.2 ya lo autoriza). El service worker se despliega **detrás del registro explícito** y con `scope` acotado; si algo sale mal, se desregistra y se limpia la caché.
- **Service worker «pegajoso»:** un service worker mal hecho puede servir una versión vieja y bloquear despliegues. Mitigación: *network-first* para navegación y documentos, limpieza de cachés viejas en `activate`, y un camino de desactivación (un service worker «vacío» que se auto-desregistra) listo para un rollback rápido.
- **iOS:** instalación y push limitados; el offline y la instalación degradan sin romper. No se promete push en iOS en esta base.
- **Lighthouse CI sobre placeholders:** medir terreno hoy es medir el cascarón; el valor real llega cuando terreno tenga contenido (D3). Riesgo de un gate que no refleje la experiencia final.
- **Íconos provisionales:** sin el logo definitivo de OPAI, los íconos son provisionales y habrá que reemplazarlos (D4); es un cambio de activos, sin código.
- **e2e no obligatorio en CI:** la prueba de PWA vive en el job `e2e`, que no es check obligatorio (ADR-043 v3). Mitigación: correrla antes de abrir el PR y adjuntar el resultado; evaluar hacerla obligatoria con Carlos (como el e2e de cabecera del Brief 05).
- **Rollback:** todo es activos estáticos y UI, sin migración. Se revierte el PR; si un service worker quedó instalado en algún navegador, el service worker «vacío» de desactivación lo limpia en la siguiente visita.

## 16. Reporte de ejecución

Al cerrar: commits integrados, capturas a 375, 1024 y 1280 en claro y oscuro (instalada, página offline, aviso de actualización y de instalar), resultado de `pwa.spec.ts`, presupuesto de JS de las rutas de terreno, resultado de Lighthouse CI (si aplica), decisión tomada en D1–D4 y el resumen ejecutivo para Carlos (qué se hizo, qué cambia para Gard, qué decide él, qué sigue).

## 17. Decisiones para Carlos

Cada una con opciones y recomendación; no bloquean la aprobación del brief, pero **D1 y D2 condicionan la ejecución** (bloque 0).

**D1 · Ruta de entrada del `start_url`.** Hoy `/` es el Inicio del ERP y no hay una entrada única que elija portal por membresía.
- (a) `start_url = "/"`: simple; una persona sin ERP tendría que redirigir desde `/` a su portal.
- (b) **Ruta de entrada propia** (p. ej. `/entrar`) que, con la sesión resuelta, redirige al portal de la persona —el último usado o un selector si tiene varios—. *(Recomendada.)* Es la que mejor cumple ADR-044.1 («abre el portal según la membresía, con selector si tiene varios») y no ata la instalación al ERP. La última preferencia de portal puede guardarse solo en el dispositivo (sin base) o como ajuste de usuario (ADR-038); **recomiendo en el dispositivo**, para no sumar escrituras ni auditoría por navegación (igual criterio que los recientes del Brief 05).

**D2 · Service worker: Serwist o propio mínimo.** Serwist no está en el repo y su compatibilidad con Next 16.4 + Turbopack + Cache Components no está verificada.
- (a) **Serwist** (lo nombra ADR-044): más declarativo, pero suma dependencia y riesgo con Turbopack.
- (b) **Service worker propio mínimo, sin dependencias.** *(Recomendada para la base.)* El alcance es pequeño (precache del cascarón, página offline, estrategias de caché, `skipWaiting` controlado) y evita la fricción con Turbopack; ADR-044.2 ya autoriza este camino «si no hay compatibilidad». Propongo un *spike* corto de Serwist en el bloque 0 y, si no es limpio, el propio mínimo. La decisión no cambia el comportamiento observable (R2–R4).

**D3 · Lighthouse CI: gate ahora o informe hasta que terreno tenga contenido.** `@lhci/cli` no está instalado y los portales de terreno son placeholders.
- (a) Gate ≥ 90 ahora sobre el cascarón de terreno.
- (b) **Playwright (manifest + service worker + offline) como prueba ahora, y Lighthouse CI como informe, que pasa a gate cuando el primer módulo de terreno tenga pantallas reales.** *(Recomendada.)* Mide lo que hoy tiene sentido (manifest, service worker, offline y presupuesto) y evita un gate sobre placeholders; se confirma con Carlos cuando llegue Rondas o Asistencia.

**D4 · Íconos de OPAI: provisionales ahora o esperar el logo definitivo.** El logo definitivo de OPAI está pendiente (`ESTADO.md`).
- (a) Esperar el logo (bloquea la base).
- (b) **Íconos provisionales** derivados del monograma/acento del DS (`tokens.css`), maskable, y reemplazo cuando llegue el logo. *(Recomendada.)* No bloquea la base; el cambio posterior es solo de activos. Los íconos de marca por tenant quedan para cuando el tenant suba su marca (ADR-028), en un brief posterior.

**D5 · Alcance del service worker: solo portales de terreno o todos.**
- (a) Registrar el service worker **solo** en los portales de terreno (donde importa el offline).
- (b) Registrarlo en **toda** la app, cacheando el cascarón en todos los portales (instalación y actualización controlada en todos), pero **sin** offline con datos fuera de terreno (R3).
- *(Recomendada: (b) con precache del cascarón común y página offline en todos, pero el soporte real sin red solo en terreno.)* Así la instalación y la actualización controlada valen para todos (Carlos instala el ERP en su escritorio), sin prometer offline donde no corresponde.

---

**Resumen para quien revise:** documento de implementación sin código, estado «propuesto, pendiente de la aprobación de Carlos». Deja lista la base PWA de ADR-044 (un manifest de OPAI, íconos, service worker con página sin conexión, actualización controlada y prueba en CI), **sin** la cola sin conexión ni el push (que nacen con el primer módulo de terreno). Las decisiones abiertas están en §17, con recomendación.
