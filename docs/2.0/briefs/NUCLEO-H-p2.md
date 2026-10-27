# NÚCLEO-H · P2: reglas, lecturas sensibles y documentación

Continuidad solicitada en esta sesión, sobre main `3199b00`.
Constructor: OpenCode / openai/gpt-6.1-sol. Base: auditoría de NÚCLEO-A.
No se abre PR ni se modifica otra rama, Neon, producción ni OPAI 1.0.

## Fuentes de continuidad

Se preservó todo el trabajo sin commit heredado (código, pruebas y documentación),
usando stash antes del merge normal de origin/main (ya estaba actualizado) y pop después.
Se leyó PR-BODY.md local. No existen en este worktree los encargos originales
`encargos/nucleo-h-1005-oc.txt` ni `nucleo-h-1000-oc.txt`. El único seguimiento
en `encargos/seguimiento.txt` corresponde al Brief 07d PR 1, no a NÚCLEO-H.
El relanzamiento `nucleo-h-1112-oc` aporta el encargo original completo en el
mensaje de Carlos; sustituye aquel bloqueo. No falta encargo. Sin tarea en Linear.

### Bloque 1 · reglas al dominio (continuidad 1112)

Extraídas sin cambiar comportamiento, mensajes, precedencia ni transacciones:
- `estadoAvisos`: hechos de incidente → destinatarios avisados, último estado e
  inicio del plazo (detección o registro), ahora en `domain/src/incidentes.ts`.
- `motivoAvisoInvalido`: rechazo de caso cerrado, aviso duplicado y transición
  inválida; el handler convierte el motivo al mismo error de negocio.
- `motivoSubidaInvalida`: existencia, tamaño, MIME opcional y SHA-256 del objeto;
  almacenamiento y persistencia siguen en la capacidad de confirmar subida.
Pruebas puras en `reglas-extraidas.test.ts` más las regresiones existentes.
Selección técnica de OpenCode dentro del encargo de extracción, no una nueva
decisión de negocio. No se tocan reglas ni archivos de Puestos (#49).

## Criterios y estado

- **Bloque 1: implementado** según la lista de extracción anterior.
- **Bloque 2: implementado.** Inventario de capacidades presentes en main y
  pruebas en [`NUCLEO-H-lecturas.md`](NUCLEO-H-lecturas.md). ARCO: lista y detalle
  filtran alcance antes de responder, incluidos sus cursores. Auditoría con
  actor, tenant, capacidad y los IDs efectivamente devueltos (sin titular, correo,
  resultado ni fila centinela). Lectura e insert comparten transacción; si falla
  auditoría no se revela nada. Sin nuevos permisos ni aumento de alcance.
  Se acotan también las lecturas de avanzar/resolver/exportar y el UPDATE
  condicional; crear exige titular interno en alcance para un actor acotado.
  Cargar titulares reutiliza los filtros de maestros, también para consentimientos.
  Las demás lecturas del inventario usan el mismo append mínimo de A, incluidas
  las vías indirectas de nombres/correos y los documentos/URLs firmadas. La
  auditoría sensible existente de sueldos no se duplica.
- **Bloque 3: implementado.** AGENTS, contexto, estado y reglas se contrastan con
  main `3199b00`: Playwright ya corre en CI (no obligatorio), A/C/MFA/07d/agente
  servidor/PWA/portales integrados. Se distinguen los relatos históricos de la
  foto vigente y no se presume despliegue ni aplicación de migraciones en Neon.
- **CSP parcial:** endpoint de reporte con límite, nonce de scripts inline y
  revisión de imágenes externas del iframe pendientes. Liveness/audio: futuro.
  No se cambia a CSP estricta sin esas comprobaciones.
- **HSTS implementado sin flags de subdominios:** solo `max-age=63072000` en
  producción; no hay inventario HTTPS de todos los subdominios. Su ampliación
  queda diferida conforme al encargo; tampoco se activa preload.
- Gate completo y e2e afectados en verde local; autorrevisión independiente
  terminada sin bloqueantes tras corregir idempotencia (resultados abajo).

## Adaptaciones técnicas y límites

Decididas por el constructor OpenCode / openai/gpt-6.1-sol dentro del encargo,
no decisiones de negocio nuevas de Carlos:

- `auditarLectura` es una proyección tipada de la salida validada a una lista de
  IDs. Se valida una sola vez dentro de la transacción y esa misma salida se
  entrega; una salida inválida conserva INVALID_OUTPUT y no genera revelación.
  Nunca se copia el input ni la salida completa al evento de revelación.
- El alcance ARCO reutiliza contactos de cuentas con instalación a cargo. Para
  personas se mantiene la negación de `dondePersona` hasta la relación real del
  Brief 07b. Solicitudes externas o sin titular interno no se atribuyen por email
  ni por responsable: solo las ve el acceso no acotado. No se concede permiso de
  cumplimiento al supervisor por defecto; necesita ese permiso efectivo.
- Cursor ajeno/inexistente y ficha ajena/inexistente usan el mismo camino de
  consulta y NOT_FOUND; no hay consultas de existencia global. Esto evita un
  oráculo lógico; no se promete tiempo constante de red o PostgreSQL.
- Orden estable `createdAt desc, id desc`; el centinela de paginación no se audita
  como dato revelado. Lista vacía audita `ids: []`, sin inventar identificadores.
- Las escrituras reales usan la transacción común del ejecutor y la transición
  sigue siendo un UPDATE con guarda de estado y alcance. Se conserva el alcance
  cargado en el contexto, igual que el resto del núcleo. No se cambia la semántica
  de revocaciones durante una solicitud que ya está ejecutándose.
- Autorrevisión independiente: detectó una ventana READ COMMITTED entre seleccionar
  contactos y consultar ARCO. Corregida con SELECT parametrizado y FOR SHARE de
  contactos e instalaciones dentro de la transacción completa, incluido dryRun de
  mutaciones. Cambiar cuenta o borrar esas filas espera hasta terminar el acceso;
  no se materializan autorizaciones que puedan invalidarse entre consultas. Las
  consultas raw solo se ejecutan dentro de ctx.transaccion, nunca sobre forTenant.
  No se sube aislamiento a REPEATABLE READ para no usar snapshots obsoletos en
  append de auditoría ni reintentar efectos externos de exportación.
  Riesgo: los locks cubren contactos/instalaciones de las cuentas a cargo y pueden
  retrasar una reasignación mientras corre ARCO; se conserva timeout de transacción.
- No hay migración, campos nuevos, UI ni cambios de diseño. La futura UI sigue
  requiriendo export aprobado del DS de OPAI 2.0.
- La autorrevisión de continuidad detectó que la respuesta idempotente evitaba el
  handler y podía revelar ARCO tras perder alcance en una solicitud posterior.
  El constructor añadió `autorizarRepeticion`: crear/avanzar/resolver/exportar
  revalidan la solicitud con tenant y alcance vigentes antes de devolver el caché,
  sin repetir efectos ni borrar la reserva. Una denegación no invalida la escritura
  ya realizada. Las relaciones se protegen con los mismos locks de la lectura.
- La validación y auditoría de lecturas se extraen a `execute-lectura.ts` para
  respetar el máximo de líneas del ejecutor, sin cambiar su resultado ni parsearlo
  de nuevo. El primer gate de continuidad detectó ese límite; se corrigió sin
  desactivar reglas ni pruebas.

## Pruebas y autorrevisión

### Relanzamiento nucleo-h-1112-oc

- Bloque 1: typecheck/lint, 1.107 pruebas, BD, build y presupuesto en verde.
  E2E `maestros.spec.ts` y `cabeceras-seguridad.spec.ts`: 11 aprobadas y las
  4 omisiones preexistentes por proyecto. Servidor propio en 3312, detenido.
  Autorrevisión independiente sin hallazgos.
- Bloque 2: inventario y pruebas reales en `NUCLEO-H-lecturas.md`. La
  autorrevisión detectó/corrigió carreras de documentos/consentimientos y lecturas
  indirectas de instalaciones/excepciones; segunda pasada sin bloqueantes.
  Las pruebas salariales siguen exigiendo exactamente su evento salarial y ahora
  además el acceso mínimo a la página del historial (sin repetir montos).
  El e2e detectó que negar Empresa por alcance rompía el contrato del Inspector:
  se conserva su lectura del perfil legal del propio tenant con `tenant.read`,
  sin nuevos permisos, y se agrega regresión. El e2e de preferencias espera
  específicamente el POST de `core.config.set`, no otro POST de lectura del shell.
  Normaliza por la UI el estado inicial si una corrida previa dejó Oscuro elegido;
  no espera una escritura al pulsar un radio ya seleccionado. Sin skips nuevos.
  E2E final de Maestros, Configuración Empresa/Acceso y Roles: **17 aprobadas,
  10 omisiones preexistentes por proyecto**, servidor propio 3312 y detenido.
  Las fixtures locales usan únicamente variables aisladas heredadas; la URL
  propietaria se limita al proceso de seed/e2e, nunca al servidor probado.
- Logs del relanzamiento en `/tmp/opencode/nucleo-h-b1*` y `nucleo-h-b2*`.

### Evidencia histórica de continuidad previa

`arco-lecturas-db.test.ts`: Postgres real con rol NOBYPASSRLS, dos tenants,
supervisor con/sin permiso y con/sin instalaciones; IDs exactos por página,
negativas de ficha/cursor, personas/externos/huérfanos, mutaciones y dryRun sin
alcance, concurrencia y rollback del insert de auditoría. Prueba unitaria del
ejecutor: lectura sin contenido en el evento y fallo cerrado al fallar auditoría.
`arco-concurrencia-db.test.ts` agrega una barrera entre selección de contactos y
consulta ARCO; otra conexión intenta mover/borrar contacto y cambiar la cuenta de
la instalación y obtiene lock_timeout, sin modificar las relaciones durante la
revelación. Tras terminar sí puede reasignar y el siguiente acceso es NOT_FOUND.
Incluye agente con via_user y payload exacto; el ejecutor prueba transformación
no determinista una sola vez y salida inválida.
`arco-idempotencia-db.test.ts`: reintentos de las cuatro mutaciones tras pérdida
de instalaciones o reasignación de contacto; la reserva se conserva, no se repite
la escritura y recuperar alcance permite recuperar la misma respuesta. También
prueba la creación externa antes de pasar a alcance acotado. La exportación usa
una respuesta ya persistida de prueba, sin llamar a R2.
Autorrevisión independiente de continuidad: detectó la revelación por idempotencia;
tras la corrección, segunda pasada sin bloqueantes (incluye la extracción de lectura
y su validación única). No reemplaza al Revisor externo ni a CI.

**Gate local de continuidad:** typecheck y lint en verde (lint conserva advertencias
de longitud de tests, sin errores); `pnpm test`: **1.104/1.104**; `pnpm test:db`:
**98 + 130 + 25**, sin omisiones, con las variables aisladas ya cargadas. Build
de producción recompilado después de la corrección y presupuesto de JS en verde,
sin tocar topes. `pnpm --filter @opai/web e2e cabeceras-seguridad.spec.ts`:
**6/6** a 375/1024/1280, servidor propio de este worktree en **3294**, con HSTS
exacta comprobada antes de Playwright; servidor detenido al terminar. Regresiones
iniciales: 23/23; paridad/definición: 15/15. No se leyó `/proc` ni se cargaron
archivos externos de variables.

Logs locales en `/tmp/opencode/`: `nucleo-h-gate-completo.log` (incluye build y
presupuesto), `nucleo-h-gate-tipos-lint-final.log`,
`nucleo-h-gate-pruebas-final.log`, `nucleo-h-e2e.log` y
`nucleo-h-regresiones-continuidad.log`. Gate completo y e2e repetidos en verde
antes de los pushes de HSTS y documentación; logs: `nucleo-h-gate-hsts.log`,
`nucleo-h-e2e-hsts.log`, `nucleo-h-gate-docs.log` y `nucleo-h-e2e-docs.log`.

Sin tarea en Linear, según el relanzamiento. No se abre ni se crea otro PR.
PR-BODY.md queda local, ignorado, sin commit, conforme al encargo.

## Lista de control del encargo de continuidad

1. **Rama:** merge normal de origin/main, con stash/pop de todo el trabajo
   heredado; main ya era ancestro. No hay otra rama de dependencia declarada.
2. **Permisos/alcance:** negativas por tenant, permiso y alcance; no se añaden
   permisos ni capacidades para concedérselos. Se revalida también la repetición.
3. **Concurrencia:** auditoría y revelación en la misma transacción; locks de las
   relaciones y UPDATE condicional de transición. No se repiten efectos cacheados.
4. **No enumeración:** ficha/cursor/mutaciones ajenos o inexistentes coinciden;
   no hay consulta global de existencia ni promesa falsa de tiempo constante.
5. **Decisiones:** adaptaciones técnicas del constructor registradas aquí y en
   ESTADO; no hay citas, horas, IDs ni decisiones nuevas atribuidas a Carlos.
6. **CA:** encargo original disponible en el relanzamiento; bloques 1, 2 y 3
   implementados, con inventario existente/inexistente. CSP se detalla por separado;
   HSTS permanece limitada al host conforme al encargo actual.
7. **Web:** sin pantallas nuevas ni cambios de DS; e2e de cabeceras en las tres
   resoluciones y presupuesto por ruta, sin modificar topes.
8. **Migraciones:** N/A, ninguna nueva ni cambios de RLS/BYPASSRLS. Sin SQL de
   verificación de una migración inexistente ni intervención en Neon.
9. **Gate:** resultados finales y logs en la sección de pruebas; CI y revisión
   externa siguen pendientes y no se declaran como aprobados.
