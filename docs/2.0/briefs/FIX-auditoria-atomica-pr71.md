# PR #71 · Correcciones de QA y review 5662759713

Fuente: encargo de continuidad de Carlos del 27-oct-2026 y QA
`/workspace/qa/pr71/informe-fea2777.md`. Rama existente `fix/auditoria-atomica`.
El encargo no aporta un ID de Linear; no se inventa uno.

## Criterios de aceptación y evidencia

- **A / review 2:** `transaccionIndependiente` conserva el aviso de auditoría,
  el estado de error de la integración y `core.integracion.error` aunque la
  solicitud revierta. Tests reales de lectura y escritura, con rollback de una
  cuenta y comprobación del diagnóstico; también `core.ia.probar` real.
- **B / review 1:** las capacidades con `tenantObjetivo` no auditan en el tenant
  seleccionado. Se conserva `tenantDe(ctx, ...)` para resolver el destino.
  Test real de plataforma con empresa seleccionada y rechazo sin rol global.
- **C:** expansión nullable con backfill y contracción NOT NULL en directorios
  separados (`20261028090000` y `20261028100000`). La segunda completa las filas
  del código viejo durante la convivencia, sin reescribir las ya encadenadas.
  Test de ambas fases, datos históricos y reejecución idempotente en base aislada.
- **Review 3:** recalcular el canon desde actor, capacidad, entidad, fecha y
  digest del payload; comparar con el guardado antes de verificar el hash.
  Comparar el máximo actual con el máximo previamente verificado, conservándolo
  tras una rotura. Tests de cada columna, borrado de cola y borrado total repetido.
- **Baratos:** FORCE RLS y GRANT explícito en cabezas; ADR-052 uniforme (ADR-051
  quedó ocupado en main por identidad de servicio, PR #70);
  `Promise.all` simultáneo de dos tenants (ocho escrituras por tenant), con
  transacciones/conexiones independientes; digest SQL calificado mediante el
  schema real de pgcrypto, probado fuera de `public`.

## Detalles técnicos del constructor

Decisiones de implementación de OpenCode / openai/gpt-6.1-sol dentro del encargo,
sin nuevas decisiones de negocio ni cambios de diseño:

1. El canon del backfill SQL usa un array JSON inequívoco, preserva NULL,
   microsegundos y texto jsonb; no concatena campos con separadores ambiguos.
   `canonHistorico` lo recalcula desde la fila; los eventos nuevos
   usan el canon JSON de dominio. Ambos protegen el contenido y la cadena.
2. Sustituido por la segunda ronda de QA descrita abajo: la verificación no
   mantiene el lock de append mientras recorre la cadena ni durante convivencia.
3. El test de migración crea y elimina únicamente su base efímera local. No aplica
   cambios en Neon ni modifica migraciones presentes en `origin/main`.
4. La autorrevisión independiente detectó y se corrigieron la selección de NULL
   al ordenar DESC durante convivencia y las colisiones del antiguo canon con
   separadores. Hay pruebas de append nuevo con filas viejas pendientes y de
   NULL frente a vacío y delimitadores. La segunda pasada no encontró bloqueantes
   concretos en esas correcciones; no equivale a aprobación formal del Revisor.
5. Se incorpora `origin/main` con merge normal (PR #67), conservando los cambios
   con stash y recuperándolos después. Sus dos llamadas nuevas de auditoría de
   lecturas sensibles se adaptan al contrato `registrar(tx, evento)`, dentro de
   la transacción de la solicitud. El e2e de publicar plantilla se acota al estado
   del formulario: el mismo mensaje aparece también en un toast y hacía ambiguo
   el selector. No se cambia su criterio ni la UI.
6. La revisión de esa integración detectó append concurrente dentro de una misma
   transacción (el lock de PostgreSQL es reentrante). La cola por objeto de
   transacción serializa los append sin abrir transacciones independientes.
   Tests reales listan dos cargos/estructuras sensibles con `enLectura`, exigen
   ambas revelaciones auditadas y cadena válida.

## Segunda ronda de QA · N1, N2, N3 y medios

Fuente: encargo actual y `/workspace/qa/pr71/informe-76760ba.md`, leído completo.
Implementación de OpenCode / openai/gpt-6.1-sol, sin decisiones de negocio nuevas:

- **N1:** foto REPEATABLE READ acotada al `max(seq)` inicial; transacción propia de
  presupuesto integral de 12 s, inferior a los 20 s por trabajo del runner: espera
  máxima de pool 1 s, escaneo 9 s (SQL 8 s), publicación 1 s, espera de pool 0,5 s y
  lock 0,5 s. Comprueba plazo y señal de cancelación antes y después del CAS.
  Canon histórico calculado en SQL por lotes de
  1.000. Checkpoint con hash, huella y revisión; solo toma el lock del tenant para
  publicar mediante CAS por revisión en otra transacción breve. Una foto obsoleta
  falla para que el runner reintente, nunca pisa otro resultado. No rebaja el máximo
  tras truncados. El job es el único invocador: se retira la capacidad del registro
  UI/API/MCP y su herramienta del snapshot.
- **Incremental e integridad antigua:** si coincide la huella del prefijo, solo se
  recalculan los eslabones posteriores al último seq verificado. La huella incluye
  todas las columnas actuales, se calcula con SHA-256 SQL en grupos fijos de hasta
  1.000 y se combina en orden en aplicación. Un cambio del prefijo obliga a validar
  desde génesis. **Sigue existiendo un escaneo SQL O(N) del contenido** para detectar
   alteraciones antiguas en cada pasada; no se promete coste O(solo cola), ni se
   mantiene lock de escritura en ese escaneo. Memoria por agregado acotada; un timeout
   es trabajo fallido, no verificación exitosa.
- **Anclaje durable (autorrevisión de continuidad):** una huella distinta del prefijo
  ya verificado siempre invalida el resultado, aunque el reescaneo encuentre una
  cadena sustituta internamente válida. Los fallos conservan seq, hash y huella del
  último checkpoint válido, para no normalizar la alteración en la siguiente pasada.
  Tests reales de truncado → append y alteración de un microsegundo, repetidos.
  Si solo la huella permite detectar el cambio, `primeraRota:1` es conservador: no
  identifica la fila exacta. Detalle técnico decidido por el constructor, no por Carlos.
  Para eventos nuevos, el lote SQL exige además precisión de milisegundos (la que
  escribe `Date`): detecta microsegundos alterados también antes de la primera
  verificación y en la cola incremental, sin perderlos por la conversión de Prisma.
- **N2:** fase 1 libera el lock de DDL antes del backfill. Un UPDATE por lote de
  hasta 1.000 filas, con CTE recursivo para la dependencia de hashes, y COMMIT por
  lote. Advisory lock solo del tenant del lote, compatible con el append nuevo;
  las inserciones viejas NULL se completan en la fase 2. Índice único separado con
  CONCURRENTLY en `20261028093000_auditoria_indice_concurrente`.
- **N3:** fase 2 instala cuatro CHECK NOT VALID, libera DDL, completa pendientes
  también por lotes con lock del tenant, valida los CHECK con el código nuevo vivo,
  hace COMMIT y solo entonces SET NOT NULL (sin reescaneo) y DROP CHECK.
- **Medios:** mientras `seq` siga nullable el verificador devuelve `pausada:true`,
  sin cambiar cabeza ni emitir `core.auditoria.rota`. Las lecturas de actividad y
  auditoría seleccionan solo columnas de negocio, tolerando NULL de la cadena.
- **Tests:** append real termina con el verificador detenido dentro de su foto;
  máximo estable; cola incremental; alteración antigua; truncado repetido; CAS de
  dos verificadores; 2.005 filas históricas; migraciones reejecutables; lecturas
  NULL con rechazo de otro tenant, rol sin permiso y actor acotado; job pausado.
  El runner propaga AbortSignal al vencer; el job de auditoría cancela antes de
  publicar y antes/después de emitir la alerta dentro de su transacción, revirtiendo
  si venció. Tests reales vía `ejecutarTrabajos` comprueban ausencia de cabeza/alerta
  tardías durante recorrido y rollback de alerta en curso. Los demás jobs pueden
  adoptar la señal; no se afirma cancelación cooperativa de todos sus handlers.

No cambian los timestamps de las dos migraciones existentes. Se agrega únicamente
el directorio intermedio del índice. El encargo confirma que no se aplicaron en
entornos reales; una preview que tenga versiones anteriores debe recrearse por
quien gestiona infraestructura. Este trabajo no modifica Neon ni otros PRs.

## Despliegue (Carlos)

No ejecutar `prisma migrate deploy` con todos los directorios pendientes antes de
desplegar: aplicaría también el NOT NULL incompatible con el código viejo.

1. Con las migraciones previas ya aplicadas y desde este checkout, ejecutar solo
   el SQL de `20261028090000_auditoria_encadenada` en autocommit (por ejemplo,
   `psql "$DATABASE_URL_MIGRATE" -v ON_ERROR_STOP=1 -f <ruta/migration.sql>`).
   No envolver en BEGIN, transacción externa ni `--single-transaction`: el DO
   hace COMMIT por lote. Registrar con `prisma migrate resolve --applied
   20261028090000_auditoria_encadenada`. Ambos comandos usan el entorno Neon que
   Carlos seleccione en `DATABASE_URL_MIGRATE`. Desde la raíz se usa
   `pnpm --filter @opai/db exec prisma ...` (config local del paquete).
2. Ejecutar de igual forma el archivo de
   `20261028093000_auditoria_indice_concurrente`, **sin transacción**, y registrar
   con `prisma migrate resolve --applied 20261028093000_auditoria_indice_concurrente`.
   Prisma PostgreSQL no envuelve automáticamente las migraciones: también se prueba
   su aplicación con `migrate deploy` sobre una base local nueva. No incluir el
   índice en otro archivo ni en un DO. Si CONCURRENTLY falla, consultar `pg_index`:
   un índice existente inválido no se arregla con IF NOT EXISTS. Carlos retira
   únicamente ese índice inválido con `DROP INDEX CONCURRENTLY
   core.audit_events_tenant_id_seq_key` y reintenta; si Prisma lo registró fallido,
   usa `migrate resolve --rolled-back` antes de reintentar. No retirar uno válido.
3. Desplegar el código nuevo y esperar a que terminen todas las instancias y
   solicitudes del código viejo. Verificar una escritura real por tenant.
4. Ejecutar `prisma migrate deploy` para aplicar
   `20261028100000_auditoria_obligatoria`. Completa pendientes por lotes por tenant,
   valida CHECK antes del breve lock de SET NOT NULL y habilita el job. Verificar
   las cadenas mediante el job y consultar `platform.auditoria.estado`.

Con las dos fases en el mismo PR, Carlos coordina ese despliegue de la versión del
PR antes de la fase 2 en cada entorno. No se integra con migraciones pendientes ni
se levanta la etiqueta para alterar el orden de las reglas de integración.

### Reversión

Si se revierte a código anterior a la cadena tras fase 2, primero retirar los
cuatro NOT NULL con SQL aprobado por Carlos; retirar también cualquier CHECK
`auditoria_nn_*` que haya quedado de una fase 2 interrumpida. Conservar índice
válido, tabla de cabezas, columnas, filas y hashes. Si se revierte al head
`76760ba`, pausar explícitamente el job: esa versión mantiene el lock durante el
escaneo y no detecta la fase nullable. El código nuevo se pausa solo al detectar
`seq` nullable. No borrar registros de `_prisma_migrations` ni datos de auditoría;
una expansión/contracción parcialmente aplicada se reejecuta después de diagnosticar
el fallo. No hay migración destructiva automática de reversa.

## Límites y seguimiento

No se resuelven los demás no bloqueantes de QA: atomicidad global de plataforma,
mensajes internos de errores y llamadas externas dentro de transacciones. La huella
sigue siendo O(N) y las migraciones requieren locks breves de DDL, cuya espera
depende del tráfico; aplicar con control de conexiones largas y medir en cada base.
La integridad
frente al dueño de la base que reescribe simultáneamente filas y cabezas requiere
anclaje externo; no se promete resistencia a ese atacante. La anonimización futura
requiere un protocolo explícito, no alterar payloads sin más.

No se cambian pantallas, componentes ni el Design System de OPAI 2.0. Se ejecutan
los e2e existentes de Configuración/Plataforma y Maestros afectados por auditoría.
Los resultados finales del gate y cualquier criterio parcial quedan en
`PR-BODY.md`, sin commitearlo.

## Cierre local de continuidad (27-oct-2026)

Se conservan los commits de la sesión anterior (`862b924`, `a540a43`) y su stash de
respaldo. El worktree estaba limpio al comenzar. Se incorpora main `5c18a92` (#65)
con merge normal `b9f84a7`; el conflicto de tipos conserva tanto EstadoMfa como
VerificacionAuditoria. Sin rebase, reescritura de historia ni cambios de otras ramas.

Autorrevisión independiente: se corrigieron sustitución del prefijo ya verificado
y pérdida de precisión temporal; pasada final sin bloqueantes. Mantiene MFA,
prepago/presupuesto atómico, plataforma denegada a agentes y auditoría atómica.
No equivale a aprobación formal del Revisor sobre el nuevo head.

**CA locales completos:** A, B, C y review 3 conservados; N1, N2, N3 y ambos medios
verificados con tests de BD; regresiones nuevas de anclaje y microsegundos en verde.
Typecheck, lint, 786 tests unitarios, test:db 91+100+24, build y presupuesto verdes.
Los unitarios se ejecutan sin DATABASE_URL_TEST y la BD aparte, como CI: lanzarlos
juntos inicialmente produjo un deadlock entre migraciones paralelas de proyectos.

E2E completos de `configuracion-{plataforma,empresa,acceso}`, `plataforma` y `maestros`
contra `next start` de este worktree en 3171, a 375/1024/1280: **21 pasaron, 12 omitidos
por condiciones existentes, EXIT=0**. Dos corridas anteriores tuvieron un fallo cada
una (contenido temporalmente oculto en Maestros desktop y TOTP rechazado); se repitió
la suite completa sin alterar ni desactivar tests. El bloqueo e2e de la sesión
anterior ya no impide la entrega local.

Logs: `/tmp/opencode/pr71-continuacion-final-gate.log`,
`pr71-continuacion-recheck.log` y `pr71-continuacion-e2e-final.log` en ese directorio.
Capturas nuevas conservadas en `/tmp/opencode/pr71-continuacion-capturas.tar.gz`,
fuera del commit. PR-BODY.md queda local y sin commit. CI, revisión del head y
aplicación de migraciones/renovación de preview por infraestructura siguen pendientes;
no se declara Neon modificado ni el PR integrado.
