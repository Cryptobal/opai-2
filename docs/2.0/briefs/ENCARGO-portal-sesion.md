# Núcleo · Validación del portal en sesiones

## Registro inicial del bloque 0 (histórico, antes de la adenda t500u)

Origen: review 5661270514 del Revisor OPAI 2.0 en el PR #59, citada en el encargo.
La adenda del encargo fija que un `ctx.portal` vacío se rechaza (fail-closed);
solo en las rutas ERP se deriva el portal del servidor, nunca del cliente.
En esa corrida inicial no se había implementado esta decisión; el estado al retomar está abajo.

Se confirmó en `origin/main` la presencia de #59 (`4439401`) y #60 (`bacf808`).
Se ejecutó `git merge origin/main` en `core/portal-sesion`, resuelto por fast-forward
a `7eefa91`. Sin push, sin PR y sin modificaciones a otras ramas.

## Bloqueo inicial resuelto por la adenda: aceptar una invitación antes de tener membresía

- `apps/web/app/(auth)/invitacion/[slug]/[token]/acciones.ts:18-30` construye
  un contexto de usuario con tenant y portal ERP, sin membresía.
- La misma acción ejecuta `core.invitations.accept` (líneas 38-41).
- `packages/capabilities/src/core/aceptar.ts:63-90` declara esa capacidad interna
  precisamente porque se acepta el enlace antes de existir la membresía.
  El handler valida el token y el correo y después crea la membresía.
- Exigir acceso al portal desde una membresía existente para toda sesión con
  tenant bloquearía este flujo. Derivar `erp` del servidor no lo resuelve:
  falta la membresía que debe conceder acceso a ese portal.

La corrida inicial se detuvo por falta de una decisión sobre esta excepción.
Propuesta para aprobación, **no implementada**: conservar exclusivamente el flujo
interno de aceptación autenticado por token y correo fuera del requisito de
portal de membresía; no exceptuar indiscriminadamente capacidades internas.
No se atribuye esta propuesta a Carlos ni se considera aprobada.

## Criterios pendientes en la corrida inicial

Bloques 1 y 2 pendientes completos: autorización, propagación de portales de la
membresía actual, pruebas negativas/positivas, test:db y e2e afectados.
Bloque 3 pendiente: registro definitivo de la regla en ADR-016/033 y ESTADO.
No hay cambios de código, pantallas, migraciones ni de permisos efectivos.
No se dispone de ID CAR-n en el encargo: no se inventa uno.

## Gate del cambio documental

`pnpm typecheck` OK; `pnpm lint` OK (18 advertencias preexistentes de longitud);
`pnpm test` OK (121 archivos, 716 pruebas). No se ejecutaron test:db, build,
presupuesto ni e2e: no hubo implementación ni push. `PR-BODY.md` queda sin commitear.

## Continuación del encargo y decisión recibida

La adenda del encargo comunica la decisión registrada como «23:42 DECISIÓN portal-sesión»:
la capacidad `core.invitations.accept`, y solo ella, queda exenta de la comprobación
de portales de la membresía. La decisión se tomó con la autonomía de fase 1 dada
por Carlos en **t500u**. Se cita la adenda como fuente: `encargos/nucleo-cierre.md`
no existe en este worktree y no se afirma haberlo verificado.

Se implementa en `restriccion()`: actor humano con tenant, sin principal de key,
debe tener portal no vacío, incluido en la membresía actual y en `portalesDe(c)`.
`null` no equivale a ERP. Las rutas ERP ya pasan `erp` desde el servidor;
`/api/v1` con sesión conserva portal nulo y se rechaza para capacidades del tenant,
sin aceptar portal de query, cabecera ni body. Plataforma, keys y sistema no cambian.

### Bloques y criterios de aceptación

- **0:** #59 y #60 confirmados. Merge normal desde `origin/main`, incluido #56,
  #64 y la actualización posterior de IA. Los cambios locales se guardaron con
  `git stash push -u` y se recuperaron con `git stash pop` antes/después del último merge.
- **1:** implementado y empujado en `e6ac80705823b9d95738d63629e05f60de5de096`.
  La membresía ya cargada por el servidor alimenta el contexto; cero consultas nuevas.
- **2:** pruebas negativas de Supervisor sin ERP, portal vacío/inventado/de otro tenant;
  positivas de ERP, capacidad compartida, owner/admin, plataforma, keys y sistema;
  excepción de aceptar invitación sin portal ni membresía con token y correo correcto.
  Postgres real comprueba membresías de dos tenants y membresía suspendida.
  Los tests antiguos de alcance representan explícitamente un rol supervisor **con ERP**;
  no constituyen prueba de compatibilidad del portal Supervisor sin ERP.
  **Parcial:** e2e nuevo detecta el bloqueo funcional descrito abajo.
- **3:** regla y excepción registradas en ADR-033 y ESTADO, con review 5661270514
  y t500u. `PR-BODY.md` sin commitear. Sin ID CAR-n en el encargo: no se inventa.

### Bloqueo nuevo: declaraciones del portal Supervisor

El e2e local descubre que `/supervisor` invoca `core.documentos.matriz`, cuya
declaración no incluye Supervisor (valor por defecto: solo ERP). Con la validación
pedida, «Hoy» muestra «No tienes acceso a esta sección». También las rutas existentes
de Supervisor usan `core.instalaciones.list/get`, `core.contactos.list`,
`core.personas.get`, `core.documentos.list` y `core.documento_tipos.list`, todas sin
declaración compartida. No se amplían portales ni se elude el guard con `erp`:
falta confirmar el conjunto de capacidades autorizado para Supervisor y su alcance.
Esta decisión queda pendiente de Carlos; no se atribuye una respuesta inexistente.

La autorrevisión independiente confirmó este bloqueo. No hay migraciones nuevas ni
cambios de pantallas o DS. No se hace push adicional con el e2e fallando, ni se abre PR.

## Resolución del bloqueo: catálogo explícito del portal Supervisor

Decisión del operador (27-oct 00:55, con autoridad delegada por Carlos): declarar
en el portal `supervisor` exclusivamente las capacidades que las pantallas de
`apps/web/app/(supervisor)` ya llaman hoy en `main`, sacadas del código de esas
pantallas (no de la memoria de la sesión anterior), solo si son de lectura o si
ya eran de uso del supervisor antes de este cambio. La declaración de `portales`
no amplía permiso ni alcance (ambos siguen exigidos sin cambios): solo habilita
el portal en el que la capacidad ya se ejecutaba. No se agrega ninguna escritura
nueva ni ninguna capacidad que esas pantallas no llamen.

Capacidades revisadas en el código de `apps/web/app/(supervisor)` (`datos.ts`,
`page.tsx` de "Hoy", `instalaciones/*`, `personas/[id]/page.tsx`,
`boton-pedir.tsx`, `documentos-terreno.tsx`, vía `HojaSubir`/`subirDocumento`
con `portal="supervisor"`), y declaradas `portales: ["erp", "supervisor"]`:

- Lectura: `core.documentos.matriz`, `core.instalaciones.list`,
  `core.instalaciones.get`, `core.contactos.list`, `core.personas.get`,
  `core.documentos.list`, `core.documento_tipos.list`.
- Escritura, incluida solo porque el propio código del supervisor la construyó
  para él (no una capacidad genérica reusada por accidente): `core.documentos.pedir_renovacion`
  (el componente `boton-pedir.tsx` existe únicamente dentro de
  `supervisor/_componentes` y no lo usa ninguna otra pantalla), y el flujo de
  subida que `apps/web/app/_components/documentos/hoja-subir.tsx` y
  `.../subir.ts` documentan explícitamente como "Supervisor en terreno" al
  recibir `portal="supervisor"` desde `personas/[id]/page.tsx`:
  `core.documentos.iniciar_subida`, `core.documentos.confirmar_subida` y
  `core.documentos.update` (esta última solo para fijar `visibleEn` tras subir).
  Las cuatro siguen exigiendo `documentos.manage` del rol y el alcance B3 de la
  entidad; antes de esta validación de portal ya eran ejecutables desde la
  sesión del supervisor con ese permiso, así que esta declaración no abre nada
  nuevo, solo repara el bloqueo que introdujo el fail-closed.
- No se declaró `core.documentos.get`, `core.contactos.get/create/update/archive`
  ni `core.documentos.archive/url_descarga`: el código de las pantallas de
  Supervisor no los llama hoy.
- `core.buscar` sigue sin declarar para `supervisor` (solo ERP): ninguna pantalla
  de Supervisor lo usa; el test de `portal-sesion.test.ts` lo deja explícito.

El e2e `apps/web/e2e/portal-sesion.spec.ts` se amplió para cubrir también
`/supervisor/instalaciones` (antes solo probaba "Hoy"), y queda en verde contra
el seed local. Bloques 1–3 de "Criterios de aceptación" (arriba) quedan
completos con este cambio; el bloque 2 deja de ser parcial.
