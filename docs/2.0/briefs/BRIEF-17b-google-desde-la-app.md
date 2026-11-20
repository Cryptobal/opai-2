# BRIEF 17b · Ingresar con Google desde la app por el navegador del sistema

**Ticket:** CAR-516 (proyecto «18 · Apps») · **Sesión:** Sesión Apps · **Fecha:** 14-nov-2026 · **Base:** Brief 17, CAR-515 (#856), ADR-044 y sus adendas, CAR-247 (OAuth del MCP).
**Estado:** implementado en el PR de CAR-516. Toca auth y sesiones: antes de integrar lleva una revisión de seguridad hecha por un subagente independiente y la revisión final de la sesión.

## 1. Objetivo

Que «Continuar con Google» funcione dentro de la app «OPAI». Google bloquea su ingreso en las vistas web embebidas («disallowed_useragent»), así que el ingreso se hace en el navegador del sistema y vuelve a la app con una sesión propia.

## 2. Estado actual (verificado)

- La app es un contenedor Capacitor que abre la web (`apps/movil`, Brief 17). Desde CAR-515, el ingreso dentro de la app no ofrece Google.
- La sesión es de Better Auth. `core.sessions.mfa_verified` **solo la fija el servidor tras verificar el código y nunca se hereda de otra sesión** (comentario del esquema; NÚCLEO-F). Una sesión creada por el servidor pasa por los hooks de `databaseHooks.session.create` (empresa suspendida, MFA sin verificar).
- Ya existe un patrón de sesión abierta por el servidor con un endpoint solo de servidor: `sesionPin` (`packages/auth/src/sesion-pin.ts`).
- `urlDeGoogle(callbackURL)` inicia el flujo social de Google.

## 3. Alcance

**Entra:** el flujo de ida y vuelta (navegador del sistema → Google → canje en la app), el código de un solo uso con prueba de posesión (PKCE), el esquema `cl.opai.app://` en Android e iOS, el botón «Continuar con Google» en el ingreso de la app y sus pruebas.

**No entra:** universal links o App Links verificados por dominio (requieren el archivo `assetlinks.json` y la firma de la app de Carlos). Quedan como **requisito antes de publicar en las tiendas** (ver §15), no como mejora opcional. Tampoco entra el ingreso con correo y contraseña, que ya funciona dentro de la app.

## 4. Arquitectura (patrón de los referentes: OAuth en el navegador del sistema más canje con PKCE, RFC 8252)

1. **En la app.** Al tocar «Continuar con Google», la web (dentro de la app) genera un `verificador` aleatorio de 32 bytes. Lo guarda en `localStorage` de la vista web (sobrevive si el sistema suspende la app mientras está en el navegador) y lo borra al leerlo y calcula `reto = base64url(SHA-256(verificador))`. Luego abre en el **navegador del sistema** (plugin `@capacitor/browser`, que usa SFSafariViewController o Custom Tabs) la ruta `https://<entorno>/app/google?reto=<reto>`.
2. **En el navegador del sistema.** `/app/google` valida el reto (43 caracteres base64url) y lo guarda en una cookie `opai_app_reto` (HttpOnly, Secure, SameSite=Lax, 10 minutos). Luego inicia Google con `urlDeGoogle("/app/listo")`. Si la cuenta tiene segundo factor, se completa ahí mismo, en el flujo de siempre.
3. **`/app/listo`** es una página de confirmación: exige sesión y muestra «Seguir en la app OPAI». Solo al tocar el botón (acción de servidor, POST) se exige la sesión **con el segundo factor completo** (`segundoFactorPendiente` en falso) y la cookie del reto, y se guarda un **código de un solo uso** en `core.verifications` (tabla de Better Auth, sin migración; el identificador `app-canje:<código>` se guarda con hash por `verification.storeIdentifier: "hashed"`), con `value = { userId, reto }` y vida de **2 minutos**. Borra la cookie del reto y redirige a `cl.opai.app://canje?codigo=<código>`. La confirmación evita que un sitio ajeno dispare la emisión con un simple enlace. **Decisión nocturna: la sesión del navegador no se cierra** (revisar): es la misma sesión que deja entrar por la web en ese navegador, se cierra con «Salir» como cualquier otra y cerrarla obligaría a un paso de red más antes del deep link.
4. **De vuelta en la app.** El plugin `@capacitor/app` recibe el enlace (`appUrlOpen`). La web navega a `/app/canje?codigo=<código>`, una página que envía por POST (acción de servidor) el código y el `verificador` guardado.
5. **Canje (servidor).** Pasa primero por el rate limit cerrado (`permitir(..., { fallarCerrado: true })`). Después busca y **borra** el código, en una sola operación: es de un solo uso aunque falle la verificación. Revisa que no haya vencido y que `SHA-256(verificador) = reto`. Si todo cuadra, abre la sesión con el endpoint **solo de servidor** `canjearCodigoApp` del plugin `sesionApp`, igual que `sesionPin`. **La sesión nace con `mfa_verified = false`**: si la cuenta tiene segundo factor, la app pide el código otra vez. Esto respeta la regla de que la verificación no se hereda. El destino final es `/entrar`.

**Qué protege cada pieza.** Un código interceptado sirve poco: otra app que registre el mismo esquema no tiene el verificador, el código vence en 2 minutos y es de un solo uso. El canje no copia permisos ni factores: solo identifica a la persona, con las mismas reglas de empresa suspendida y MFA de cualquier sesión.

## 5. Archivos

- `packages/auth/src/canje-app.ts` (reto, código y verificación PKCE), `sesion-app.ts` (plugin `sesionApp` con endpoints solo de servidor) y `app-nativa.ts` (`emitirCodigoApp` y `canjearCodigoApp`), con pruebas unitarias y contra Postgres.
- `apps/web/app/(auth)/app/google/route.ts`, `apps/web/app/(auth)/app/listo/page.tsx`, `apps/web/app/(auth)/app/canje/` y las acciones `apps/web/app/_acciones/app-nativa.ts`.
- `apps/web/lib/app-nativa-cliente.ts`: helpers del lado de la app (abrir el navegador del sistema y escuchar el enlace) con `window.Capacitor`, sin agregar paquetes al bundle web.
- `apps/web/app/(auth)/login/`: botón «Continuar con Google» dentro de la app, que usa el flujo nuevo.
- `apps/web/proxy.ts`: `/app/google` y `/app/canje` como rutas públicas (cada una valida lo suyo); `/app/listo` exige sesión.
- `packages/capabilities/test/paridad-entradas.ts`: las rutas y la acción como entradas de identidad (sin capacidad, como el resto del ingreso).
- `apps/movil`: `@capacitor/browser`, intent-filter `cl.opai.app` en `AndroidManifest.xml` y `CFBundleURLTypes` en `Info.plist`.

## 6. Modelo de datos y migraciones

Sin migración. Usa `core.verifications`, la tabla de Better Auth.

## 7. Capacidades

No hay capacidades nuevas: es identidad, como el login, la contraseña o el PIN (`paridad-entradas.ts`).

## 8. Interfaz

Dentro de la app, el ingreso vuelve a mostrar «Continuar con Google» y ahora abre el navegador del sistema. `/app/canje` muestra «Entrando…» mientras canjea y, si falla, el aviso «No pudimos completar el ingreso. Vuelve a intentarlo.» con un botón «Volver al ingreso». Sigue el diseño del ingreso vigente y no agrega componentes nuevos.

## 9. Seguridad y tenant

- El código se guarda solo como hash; vence en 2 minutos y es de un solo uso. Sin el verificador (PKCE S256) no sirve.
- Rate limit cerrado en el canje. La respuesta de error es la misma para un código inexistente, vencido o con un verificador malo.
- `mfa_verified` no se hereda. La empresa sale de la membresía, como en cualquier sesión, y nunca del enlace.
- La emisión pide un POST desde la página de confirmación, con la sesión del navegador y la cookie del reto.
- El rastro de seguridad registra el ingreso con Google en el callback del navegador (`seguridad.login`, método `social`). El canje en la app todavía no deja un evento propio: queda pendiente (ver `estado/apps/CAR-516.md`).

## 10. Casos límite

Código vencido o ya usado, verificador perdido (la app se cerró: se vuelve a empezar), cuenta con MFA (se pide en la app), cuenta sin membresía (`/entrar` explica), empresa suspendida (hook de sesión), Google sin configurar (no se ofrece el botón).

## 11. Plan por bloques

1. `packages/auth`: emitir y canjear el código, y `abrirSesionApp`, con pruebas.
2. `apps/web`: rutas `/app/*`, acción de canje, proxy y paridad, con pruebas.
3. `apps/web`: botón dentro de la app y helpers de Capacitor, con e2e `@preview` del canje fallido.
4. `apps/movil`: plugin del navegador y esquemas en Android e iOS, con el APK compilado.
5. Documentación: estado, adenda de ADR-044 y fichas.

## 12. Tests

Unitarias del código (hash, vencimiento, un solo uso, PKCE correcto y malo). Prueba de la acción de canje con dependencias simuladas (rate limit, error genérico). Gate de paridad. E2E `@preview` de `/app/canje` con un código inválido.

## 13. Validación

Gate local, APK compilado y revisión de seguridad por subagente. La prueba de punta a punta con Google real necesita un teléfono y una cuenta de Google de prueba: queda para cuando Carlos pruebe la app.

## 14. Criterios de aceptación

- Dentro de la app, «Continuar con Google» abre el navegador del sistema y vuelve a la app con la sesión iniciada.
- Un código sin su verificador, vencido o repetido no abre sesión.
- La sesión creada por el canje no llega con `mfa_verified` en verdadero.

## 15. Riesgos y rollback

Toca el ingreso: un error podría abrir una sesión indebida. Se mitiga con PKCE, el código de un solo uso y la revisión de seguridad. **Riesgo residual:** un esquema propio (`cl.opai.app://`) lo puede registrar otra app instalada; con PKCE el código robado no sirve sin el verificador, que nunca sale de la app. Aun así, **antes de publicar en las tiendas** se cambia la vuelta a App Links (Android) y universal links (iOS) verificados por dominio, cuando existan las llaves de firma (CAR-513). Rollback: revertir el PR, y la app vuelve a ofrecer solo correo y contraseña (CAR-515).

## 16. Reporte de ejecución

Ver `docs/2.0/estado/apps/CAR-516.md`.
