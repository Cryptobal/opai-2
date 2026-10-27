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
- **Baratos:** FORCE RLS y GRANT explícito en cabezas; ADR-051 uniforme;
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
2. La verificación completa toma el mismo advisory lock por tenant que el append
   y lee/actualiza la cabeza en una sola transacción. No rebaja el máximo anterior
   cuando detecta borrados. Las filas nullable pendientes se consideran rotura
   hasta completar la fase 2, no se ignoran silenciosamente.
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

## Despliegue (Carlos)

No ejecutar `prisma migrate deploy` con ambos directorios pendientes antes de
desplegar: aplicaría también el NOT NULL incompatible con el código viejo.

1. Con las migraciones previas ya aplicadas y desde este checkout, ejecutar solo
   el SQL de `20261028090000_auditoria_encadenada` con `prisma db execute --file`.
   Registrar esa misma migración con `prisma migrate resolve --applied
   20261028090000_auditoria_encadenada`. Ambos comandos usan el entorno Neon que
   Carlos seleccione en `DATABASE_URL_MIGRATE`. Desde la raíz se usa
   `pnpm --filter @opai/db exec prisma ...` (config local del paquete).
2. Desplegar el código nuevo y esperar a que terminen todas las instancias y
   solicitudes del código viejo. Verificar una escritura real por tenant.
3. Ejecutar `prisma migrate deploy` para aplicar
   `20261028100000_auditoria_obligatoria`. Completa las filas de convivencia bajo
   bloqueo de tabla y luego exige NOT NULL. Verificar las cadenas de nuevo.

Con las dos fases en el mismo PR, Carlos coordina ese despliegue de la versión del
PR antes de la fase 2 en cada entorno. No se integra con migraciones pendientes ni
se levanta la etiqueta para alterar el orden de las reglas de integración.

Si se revierte el código tras la fase 2, primero retirar únicamente los cuatro
NOT NULL con SQL aprobado por Carlos; conservar tablas, columnas, filas y hashes.
No hay borrado automático ni migración destructiva de reversa.

## Límites y seguimiento

No se resuelven los demás no bloqueantes de QA: atomicidad global de plataforma,
mensajes internos de errores, llamadas externas dentro de transacciones,
verificación O(N) declarada lectura y coste del backfill/bloqueos. La integridad
frente al dueño de la base que reescribe simultáneamente filas y cabezas requiere
anclaje externo; no se promete resistencia a ese atacante. La anonimización futura
requiere un protocolo explícito, no alterar payloads sin más.

No se cambian pantallas, componentes ni el Design System de OPAI 2.0. Se ejecutan
los e2e existentes de Configuración/Plataforma y Maestros afectados por auditoría.
Los resultados finales del gate y cualquier criterio parcial quedan en
`PR-BODY.md`, sin commitearlo.
