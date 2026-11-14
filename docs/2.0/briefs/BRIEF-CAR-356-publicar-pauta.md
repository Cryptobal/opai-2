# BRIEF CAR-356 · Publicar la pauta y avisar al guardia

1. **Objetivo.** Hoy la pauta rige apenas se guarda y nadie le avisa al guardia. Se agrega un paso «Publicar» por instalación y mes que avisa a cada titular sus turnos. Brecha O-1 de la auditoría de estándares; el referente es Deputy.
2. **Decisión de Carlos (13-nov-2026, 19:02 y 19:07).**
   - Sí al paso de publicar y al aviso.
   - Canales: portal del trabajador (campana) y celular (push).
   - **Sin WhatsApp** por ahora, ni automático ni con botón de reenvío.
3. **Alcance por PR (PR chicos, aviso de repo público).**
   - **PR 1 (este):** base de datos, capacidades y aviso en la campana.
   - **PR 2:** botón «Publicar» en la pantalla de Pauta, con la vista previa.
   - **PR 3:** aviso de cambios a los afectados en un mes publicado.
   - **PR 4:** push, que necesita las claves VAPID; Carlos las guarda en Vercel.
4. **Modelo.**
   - `pauta.publicaciones`: una fila por instalación y mes (aaaa-mm), con quién y cuándo publicó y a cuántos se avisó. Republicar actualiza la misma fila.
   - La migración es aditiva, con RLS, FORCE y `tenant_isolation`.
   - **Decisión de alcance:** publicar no oculta turnos. El guardia los ve igual que hoy; publicar marca cuándo se le avisa.
5. **Capacidades (pantalla, `/api/v1` y MCP).**
   - `pauta.publicaciones.publicar`: escritura con vista previa. Cuenta titulares, titulares con usuario y turnos; publica y emite `pauta.publicada` en la misma transacción.
   - `pauta.publicaciones.listar`: lectura de las publicaciones de un mes dentro del alcance.
6. **Consumidor.** `pauta.publicada.avisar` crea en la campana «Tu pauta de {mes} está publicada» con la instalación, la cantidad de turnos y los días. Avisa solo a titulares con usuario y es idempotente por evento y usuario.
7. **Turnos de cada titular.** Salen de la serie vigente de cada día, en los días que trabaja según el patrón, sin los días con una excepción activa.
8. **Seguridad.**
   - El tenant sale de la sesión y el alcance de instalaciones se aplica en la consulta; fuera del alcance responde NOT_FOUND.
   - El evento lleva solo IDs y fechas.
9. **Pruebas.** `pauta-publicar-db.test.ts` cubre:
   - la vista previa sin escritura;
   - la publicación y el evento;
   - el aviso único a quien tiene usuario;
   - el listado;
   - el aislamiento por tenant y por alcance.

## PR 4a · base del aviso al celular (13-nov-2026)

- **Decisión técnica:** Web Push **sin contenido**. El navegador entrega un endpoint de su servicio de push (Google, Mozilla, Apple); OPAI le manda un POST vacío firmado con VAPID (JWT ES256 por WebCrypto, sin SDK, ADR-031). El celular muestra un texto fijo y abre el portal, donde está el detalle. Así ningún dato personal sale a terceros (Ley 21.719) y no hace falta cifrar contenido.
- **Datos:** `core.suscripciones_push` (tenant, usuario, endpoint único por empresa, dispositivo, último aviso). RLS, FORCE y `tenant_isolation`. Migración aditiva `20261221140000_core_suscripciones_push`.
- **Capacidades:** `core.push.suscribir` y `core.push.quitar`, solo personas (el dispositivo es de quien tiene la sesión), con vista previa, sobre el usuario del actor. En `paridad-sin-pantalla.ts` hasta el PR 4b.
- **Envío:** `avisarAlCelular(ctx, usuarios, modulo)` después del aviso en la campana; nunca lanza; borra suscripciones 404/410; mide `push.aviso` en `core.consumos`. Sin claves VAPID en el entorno no hace nada.
- **Claves:** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (base64url) y `VAPID_SUBJECT` (`mailto:`), en Vercel. Las genera y guarda Carlos (`npx web-push generate-vapid-keys` en su máquina); ningún agente las ve.
- **PR 4b:** service worker (`push` muestra «Tienes un aviso nuevo en OPAI», `notificationclick` abre `/trabajador`), interruptor en el portal del trabajador que pide permiso en contexto (ADR-044.4), clave pública al cliente, novedad y `@preview`.
