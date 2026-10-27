# PR #65 · Continuidad MFA y review 5662691274

## Fuente y alcance

Encargo de Carlos del 27-oct-2026, continuidad en `core/mfa` desde `8b61fd6`.
Se conservan los cambios sin commit de la sesión anterior. Sin rebase, force-push,
workflows, capacidades nuevas ni cambios visuales. El DS 2.0 sigue siendo obligatorio.
El encargo no trae un ID de Linear; no se inventa uno.

## Criterios del encargo

1. **Bloqueo en todos los caminos:** `marcaMfaSesion.before` reserva el intento antes
   de TOTP o respaldo con sesión. Las acciones y los POST directos comparten el tope.
   Prueba real del handler HTTP: agotarlo impide verificar incluso con código correcto.
2. **Confirmar solo pendiente:** `confirmarSegundoFactor`, invocado por
   `accionConfirmarMfa`, exige usuario sin MFA activo y fila `verified: false`.
   Pruebas negativas de estados activos/inconsistentes, falta de fila y agotamiento;
   prueba positiva de confirmación. No se relaja el gate de producción.
3. **Atomicidad:** UPDATE de Prisma con retorno y WHERE de comparación del contador
   y bloqueo anteriores; un conflicto P2025 vuelve a leer y reservar, sin verificar
   ningún código todavía. Prueba con 20 POST concurrentes mezclando ambos factores:
   cinco verificaciones como máximo, el resto recibe 429. Sin SQL crudo ni migración.
4. **Fixture de portal:** solo el test de `resolverActor` declara MFA activo y sesión
   verificada del owner; conserva la comprobación de rechazo del portal nulo.
5. **Rendimiento:** el workflow llama `seed:e2e`, pero no `seed:multiempresa-e2e`.
   La preparación MFA se encadenaba solo al segundo: el owner obligatorio quedaba
   sin enrolar en el job de rendimiento. Se mueve al seed común `seed:e2e`, con
   prueba de regresión del cableado y sin cambiar workflows. No se obtuvieron logs
   remotos del check: la consulta por `gh` fue denegada; no se afirma una causa remota
   exclusiva ni un resultado CI nuevo.

## Decisiones técnicas y riesgos

OpenCode / GPT-6.1 Sol eligió comparación y actualización condicional con Prisma
para cumplir la reserva atómica sin SQL crudo fuera de `enTransaccion` ni tenant
ficticio. Los datos son de identidad: `clienteAuth()` solo en `@opai/auth`, por el
usuario autenticado, nunca por un ID del formulario. El intento se consume antes de
verificar; un éxito reinicia el contador. Una interrupción consume el intento (cierre
seguro), hasta el vencimiento o un éxito válido. No cambia la política de cinco
intentos y quince minutos de ADR-015. No hay decisiones nuevas de negocio.

Las migraciones MFA que ya traía el PR siguen pendientes de la aplicación humana
en Neon; este seguimiento no crea ni aplica migraciones nuevas. No cambia el plan
de ROADMAP. La revisión independiente no sustituye al Revisor del PR.

## Verificación

Evidencia final, gates y limitaciones en `PR-BODY.md` local (no se commitea).
La autorrevisión independiente no encontró bloqueantes; se incorporó su recomendación
de probar ausencia real, confirmación exitosa y concurrencia entre ambos factores.

Gate local completo en verde: typecheck, lint, test (839), test:db (139), build y
presupuesto. E2E MFA: 6/6 a 375/1024/1280 contra servidor propio en 3105.
Rendimiento estricto contra `next start` propio en 3106: 1 pasó y 1 fixme previo,
sin modificar el spec; protocolo de seis pantallas con 5–8 consultas y 49–113 ms.
JS: activar MFA 158,3/160 KB, verificar MFA 150,9/153 KB, login 151,3/153 KB.
No se usa ni se altera ninguna aplicación de otra sesión en el puerto 3000.
