# NÚCLEO-H · P2: reglas, lecturas sensibles y documentación

Continuidad solicitada en esta sesión, sobre main `3199b00`.
Constructor: OpenCode / openai/gpt-6.1-sol. Base: auditoría de NÚCLEO-A.
Se continúa el PR #76 en `core/nucleo-p2`; no se crea otro PR ni se modifica
otra rama, Neon, producción ni OPAI 1.0.

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
- **Agregado CSP implementado en Report-Only:** endpoint propio con límites,
  nonce por petición en TEMA/REGISTRO_SW y aislamiento de imágenes de `srcdoc`.
  La activación estricta del shell sigue fuera del encargo: PPR conserva scripts
  estáticos sin nonce (comprobado en navegador). No se anuncia una fuente nonce
  en la política de respuesta, porque anularía `unsafe-inline` y produciría
  reportes espurios; el nonce sí se pasa a Next y a los dos scripts propios.
  Liveness/audio/Rekognition/Pusher/micrófono quedan diferidos (c).
- **HSTS implementado sin flags de subdominios:** solo `max-age=63072000` en
  producción; no hay inventario HTTPS de todos los subdominios. Su ampliación
  queda diferida conforme al encargo; tampoco se activa preload.
- Gate completo y e2e afectados en verde local; autorrevisión independiente
  terminada sin bloqueantes tras corregir idempotencia (resultados abajo).

## Adaptaciones técnicas y límites

Decididas por el constructor OpenCode / openai/gpt-6.1-sol dentro del encargo,
no decisiones de negocio nuevas de Carlos:

### CSP · agregado del encargo

- `/api/csp-report`: telemetría pública, no una mutación de negocio. Acepta
  reportes CSP legacy y Reporting API; 16 KiB reales de stream, máximo 10 por lote.
  Rate limit central de B: 30 solicitudes/minuto por IP y 300/minuto globales,
  fallo cerrado y 429/Retry-After. Registra en logs de servidor solo directiva de
  catálogo, categoría del destino y estado HTTP; nunca URL/ruta/query, IP, muestra
  de script ni política/nonce. `report-uri`, `report-to` y `Reporting-Endpoints`
  apuntan al endpoint propio. Sin tabla, migración, secreto ni servicio nuevo.
- Proxy: 128 bits de nonce nuevos por petición, sobreescribe cabeceras del cliente;
  también en páginas públicas, sin cambiar su autenticación. TEMA y REGISTRO_SW
  reciben el mismo nonce bajo Suspense de request; no se guarda en caché ni se
  desactiva Cache Components. La guía instalada de Next advierte que PPR no es
  compatible con nonce estricto. El e2e confirmó reportes de scripts estáticos
  al anunciar nonce en la respuesta: por eso solo se prepara en el request para
  Next y en atributos propios; la respuesta mantiene la política Report-Only
  original con `unsafe-inline`. Resolver todo el shell y activar enforcement no
  se declara completado ni se oculta modificando la prueba de cero violaciones.
- Correo: el HTML de vista previa ya escapa el texto; solo su logo era imagen
  externa indirecta por redirección a R2. El iframe conserva `sandbox=""`, añade
  no-referrer y una CSP local que bloquea imágenes ajenas. La URL relativa de
  preview usa `?vistaPrevia=1`: la ruta de marca sirve bytes propios, sin 302.
  Fetch solo a HTTPS R2 firmado, sin credenciales/redirecciones, 8 s y 10 MiB,
  tamaño real verificado; rate limit de preview 30/minuto por IP, fallo cerrado.
  SVG servido con CSP sandbox y nosniff, también si se abre directamente. El
  correo enviado conserva la URL pública absoluta y su redirección habitual.
  El e2e usa imagen ficticia interceptada para comprobar carga propia y bloqueo
  del tracker; no se afirma una descarga real de R2 ni se requieren claves nuevas.
- (c) Se difieren liveness/audio, `media-src blob:`, Rekognition, Pusher y permiso
  de micrófono hasta sus briefs. No se habilitan hosts/permisos preventivamente.
- (d) HSTS sigue solo en producción para el host: `max-age=63072000`, sin
  includeSubDomains ni preload. No se afirma inventario HTTPS de subdominios.

### ARCO y lecturas sensibles

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
- Bloque 3: gate completo y Cabeceras 6/6, sin errores; autorrevisión documental
  contrastada con paquetes, workflow e historial de main, sin hallazgos.
- Agregado CSP: gate completo `nucleo-h-csp-gate.log`: typecheck/lint, **1.125
  pruebas**, BD **98 + 139 + 25**, build y presupuesto por ruta verdes, sin
  modificar topes. Typecheck/lint repetidos sobre los últimos comentarios/specs
  en `nucleo-h-csp-tipos-final.log`. Autorrevisión corrigió el logo que redirigía
  a R2; segunda pasada y autorrevisión final de los nueve puntos sin bloqueantes.
  La comprobación PPR/nonce en navegador se conserva como límite explícito,
  no se desactiva la prueba de cero violaciones ni se declara CSP estricta.
  E2E finales: Cabeceras/srcdoc/Maestros/Configuración Empresa y Acceso/Roles
  **32 aprobadas, 10 omisiones preexistentes por proyecto**; PWA afectado
  (manifest, SW y offline) **9/9**, a 375/1024/1280. Una corrida mostró título
  vacío transitorio en Configuración iPad; la repetición completa pasó sin
  modificar su aserción ni subir timeouts. Servidor propio 3312 detenido tras
  ambas suites. Logs `nucleo-h-csp-e2e-repetido.log`; 45 capturas preservadas en
  `/tmp/opencode/nucleo-h-evidencia/`, sin añadir ruido binario al PR.

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

Sin tarea en Linear, según el relanzamiento. Se continúa el PR #76, sin crear otro.
PR-BODY.md queda local, ignorado, sin commit, conforme al encargo.

## Corrección ADR-045 · review 5670166405 del PR #76

> Nota histórica: la excepción de búsqueda descrita aquí queda sustituida por
> la corrección de la review 5671348942 al final del documento.

El gate histórico de arriba **no incluyó rendimiento**. El Revisor informó
Instalaciones **10 consultas** y Personas **9** (main: **8 y 8**, tope **8**).
No se cambia `rendimiento.spec.ts`, sus aserciones ni los presupuestos de JS.

Encargo actual: excluir declarativamente inbox propio, contadores de pendientes
y sugerencias incrementales de ⌘K, conservando auditoría al abrir una ficha.
Para que pendientes sea realmente un resumen no personal, deja de seleccionar
correo de invitación y errores libres del proveedor. El conteo conserva una
transacción común para los locks de alcance. No cambia diseño ni permisos.

Adaptación técnica del constructor OpenCode / openai/gpt-6.1-sol: función SQL
VOLATILE SECURITY INVOKER para adquirir el lock y leer la cabeza con una foto
posterior al lock. Usa el canon SQL histórico que ya soporta el verificador,
sin alterar eventos previos ni el checkpoint; conserva la cola por transacción
para llamadas paralelas reentrantes. Una única sentencia desde la app sustituye
las tres del append. Migración idempotente `20261028163000_auditoria_append`,
sin tablas/roles/permisos de escritura nuevos ni cambios a RLS/BYPASSRLS.
Desplegar esta función **antes** de la app; revertir primero la app al append
anterior y luego retirar la función. Neon sigue pendiente de Carlos.

La autorrevisión independiente detectó que `$queryRaw` quedaba fuera del contador
Prisma: el append ahora notifica explícitamente **una** consulta de negocio y un
test real exige ese conteo. No se acepta el primer resultado de rendimiento como
evidencia final. Además, página y conteo del inbox se agrupan en una sentencia
contada, con filtros explícitos de tenant/usuario y RLS: no se carga el inbox entero
ni se altera su límite. Pruebas reales de paginación/conteo, usuario/tenant ajenos
y fechas ISO en `inbox-consultas-db.test.ts`.

La repetición **con el append contado** aún dio Instalaciones **10** y Personas
**9**: el contador vigente mide operaciones lógicas de Prisma y ya excluía los
dos raw de infraestructura del append anterior. Por eso reducir roundtrips no
bastaba para ese gate. Se consolidan también las lecturas necesarias para estas
rutas, sin cambiar su contenido ni desactivar auditoría: identidad carga módulos
activos/trial junto al acceso de la membresía en el tenant elegido (sin caché
entre requests, conserva roles/excepciones y asignaciones del supervisor), y la
lista de instalaciones obtiene página, nombre de cuenta y count/suma de puestos
en una consulta SQL contada con filtros de tenant/alcance antes del cursor y los
agregados. No materializa todos los puestos. Son adaptaciones de rendimiento del
constructor dentro del arreglo ADR-045, no decisiones de negocio nuevas.
Pruebas: `fuentes-identidad.test.ts` y `instalaciones-consultas-db.test.ts`, además
de las negativas existentes de permisos/alcance y el inventario auditado.

Autorrevisión independiente del arreglo: se corrigió el raw no contado, la
referencia desfasada a «sin migraciones» y el orden del doble de inbox (timestamp,
incluidos milisegundos, con desempate por ID). La concurrencia del append usa
una barrera observable en `pg_stat_activity`, no una espera que presuponga lock.
La corrida paralela de e2e produjo timeouts de transacción/MFA y se repitió con
un worker, como CI. La corrida general concurrente también alcanzó el timeout
del test de verificador (2 s); se repite íntegra con un worker y sin paralelismo
entre archivos, seguida de `pnpm test:db`. No se modifica ni omite ningún test.

Medición estricta final contra el build exacto, servidor propio de este worktree
en 3376: Instalaciones **10 → 8 consultas, 108 ms**; Personas **9 → 8, 139 ms**.
Protocolo completo: Cuentas 6/111 ms, Instalaciones 8/108 ms, Personas 8/139 ms,
Cargos 6/125 ms, Configuración 6/101 ms e Inicio 4/47 ms. Todas ≤8 y ≤500 ms.
Comando del CI con `GATE_ESTRICTO=1` y `BASE_URL=http://localhost:3376`:
`pnpm --filter @opai/web e2e rendimiento --project=telefono --reporter=list`.
Protocolo aprobado; fixme de esqueleto preexistente e intacto. No hay skips nuevos.
Build exacto y presupuesto por ruta en verde, sin subir ningún tope; **1.138/1.138**
pruebas aprobadas con un worker, sin omitir tests. BD final **98+147+25**, sin
omisiones. E2E Maestros/Cabecera estable/Portal de inicio **17 aprobadas y 4
omisiones preexistentes** por proyecto a 375/1024/1280; servidor propio 3376
detenido. Capturas en `/tmp/opencode/p2-rend-evidencia/`, fuera del diff de código.
Los cuatro CA del arreglo están completos. Autorrevisión independiente final
sin hallazgos de código; no
sustituye a CI ni a la aprobación externa sobre el head que se empuje.
Logs finales `/tmp/opencode/p2-rend-gate-serial.log`, `p2-rend-cierre-build.log`,
`p2-rend-cierre-rendimiento.log` y `p2-rend-cierre-e2e.log`.

CA del arreglo: (1) excepciones cerradas y regresión contra desactivar auditoría
personal/documental; (2) append de una sentencia y cadena verificada con
concurrencia; (3) números reales antes/después y gate en PR-BODY local;
(4) corregidas las referencias desfasadas al PR. Resultados finales y revisión
independiente se registran al cerrar el gate; CI/Revisor externos no se presumen.

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
8. **Migraciones:** el arreglo ADR-045 añade `20261028163000_auditoria_append`,
   función invocadora idempotente sin tablas nuevas ni cambios de RLS/BYPASSRLS.
   Verificación SQL en PR-BODY local; aplicación en Neon pendiente de Carlos.
9. **Gate:** resultados finales y logs en la sección de pruebas; CI y revisión
    externa siguen pendientes y no se declaran como aprobados.

## Corrección de la review 5671348942 · PR #76

Implementación de OpenCode / openai/gpt-6.1-sol conforme a los cuatro puntos
del encargo actual, sin nuevas decisiones de negocio:

1. `core.buscar` vuelve al inventario y audita IDs de cuentas, personas y contactos
   devueltos, sin texto de búsqueda ni datos personales en el payload. Se conserva
   exactamente la salida y los filtros existentes. Transacción común y fallo
   cerrado, también para agentes/API keys. Solo inbox propio y pendientes conservan
   `auditarLectura: false`; abrir una ficha sigue generando su evento habitual.
2. Gate del registro completo con lista cerrada de lecturas heredadas sin
   proyección (instantánea revisable); cualquier omisión nueva o retirada de una
   proyección falla. No se amplían las exenciones de lecturas sensibles.
3. Migración `20261028163000`: `BEGIN` y `SET LOCAL lock_timeout = '5s'` para DDL,
   con `COMMIT` después de los grants. No cambia el cuerpo de la función, canon,
   seq, hash ni hash_anterior. La reejecución se comprueba sobre eventos existentes.
   Reversión: desplegar primero la app con append anterior y después ejecutar
   `DROP FUNCTION core.auditoria_append(uuid, uuid, text, text, text, text, text,
   text, jsonb, timestamptz);`; nunca borrar eventos. Neon no se modifica.
4. Rendimiento estricto con el comando del CI y build propio: resultados del gate
   se registran al completarlo en esta sección y PR-BODY.md local, sin subir topes
   ni cambiar MAX_CONSULTAS, skips o aserciones.

Pruebas añadidas: inventario completo con rollback si falla el append;
`buscar-auditoria-db` para actor agente con key, dos tenants, permiso/alcance vacíos
y fallo cerrado. No hay escrituras de negocio nuevas, ni cambios de privilegios,
pantallas o diseño. Se mantiene el DS 2.0. Los límites anteriores de CSP/PPR y
esqueleto preexistente siguen declarados; este encargo no los resuelve.

Medición de esta corrección, build propio en puerto 3476, mismo comando del CI
con `GATE_ESTRICTO=1`: Cuentas **6/225 ms**, Instalaciones **8/183 ms**,
Personas **8/164 ms**, Cargos **6/147 ms**, Configuración **6/183 ms** e
Inicio **4/129 ms**. Protocolo aprobado; fixme de esqueleto preexistente intacto.
Build y presupuesto por ruta aprobados sin subir topes (Instalaciones 160,2/165 KB,
Personas 160,6/165 KB). E2E Maestros/Cabecera estable/Portal de sesión:
**11 aprobadas y 4 omisiones preexistentes**, a 375/1024/1280. La repetición
completa pasó tras timeout inicial de Vencimientos, sin alterar pruebas ni límites.
Autorrevisión independiente final sin bloqueantes tras corregir la expectativa
de `dryRun` de una prueba y añadir la key sin permisos con responsable owner.
Logs `pr76-*.log` y capturas `pr76-evidencia/` bajo `/tmp/opencode/`.
Gate unitario/BD separado como en CI: **899 unitarias aprobadas**, con las 243
pruebas de BD condicionadas a su runner dedicado. Typecheck y lint aprobados con
`--concurrency=1`; el primer reintento de tipos terminó con código 137 bajo presión
de memoria del host. La primera corrida que duplicaba BD dentro de `pnpm test` se
interrumpió y no cuenta como aprobada.

**Bloqueo local: test:db no quedó verde.** Una repetición aprobó las 98 pruebas de
`packages/db` (incluida migración/idempotencia); capacidades terminó con 95
aprobadas, 1 timeout y 54 casos no ejecutados por fallos de preparación. Otras
corridas agotaron hooks o recibieron P1001 contra PostgreSQL local. El intento
con heap de Node limitado, conexión IPv4 a la misma base aislada y comprobación
de actualizaciones de Prisma desactivada tampoco resolvió los hooks. Las nuevas
pruebas de búsqueda no llegaron a sus aserciones; no se declara su aprobación.
No se tocaron timeouts, skips, permisos, tests ni bases remotas para obtener verde.
Logs `pr76-db-{serie,final,memoria}.log` y `pr76-buscar-local.log`. Se conserva el
arreglo y se entrega este bloqueo conforme al encargo: los CA 1–3 están
implementados y el 4 tiene medición/build/presupuesto/e2e aprobados, pero el cierre
del gate completo queda **parcial**, pendiente de repetir test:db con el entorno
local estable. El PR **no está terminado**; CI y Revisor externos siguen pendientes.
