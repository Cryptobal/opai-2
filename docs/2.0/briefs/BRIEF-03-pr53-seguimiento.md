# Brief 03 · Seguimiento del PR #53

Este documento registra únicamente el encargo de continuidad del PR #53 y la revisión
5660523164. No sustituye el Brief 03 original, cuyo texto no está en el repositorio.
Tarea de referencia: CAR-7. Rama: `perf/brief03-consultas-navegacion`.

## Alcance y criterios de aceptación

1. Traer `origin/main` mediante merge normal, sin rebase ni reescritura: resolución
   que conserva los permisos efectivos, alcance por filas, PWA y seguimiento del
   Núcleo de main junto con las consultas optimizadas de este PR.
2. Mantener los topes solicitados **153/176/166 KB** (acceso/configuración/fichas de
   Personas indicadas en el presupuesto), sin subir los otros límites. Quitar la
   entrada duplicada de Documentos de Personas que aparece al combinar las ramas.
3. Documentar el estado real en `PR-BODY.md` local, **sin commitearlo**: precarga
   restaurada, sin barra de progreso, pendiente de hidratación vinculado al #44;
   el #44 todavía no se puede integrar.
4. QA de #59 (ya integrado como `4439401`, según el encargo):
   - N1: no ofrecer «Elegir empresa» si no hay ninguna empresa activa elegible.
   - N2: conservar la protección de main: sin acceso al ERP no hay Buscar, ⌘K ni
     Preferencias. Verificar ambos atajos (Ctrl y Meta) en el e2e.
   - N3: publicar «Sin permisos» como título del shell, sin acciones de la página
     inaccesible; verificarlo en iPad y escritorio con el DS 2.0 existente.
5. Antes del commit/push: typecheck, lint, test, test:db, build, presupuesto y e2e
   afectados contra un servidor de este worktree, con autorrevisión independiente.

## Resolución técnica y autorrevisión

Decisiones de implementación de GPT-6.1 Sol dentro de este encargo (no son nuevas
decisiones de negocio de Carlos): diferir el JS de la campana **con SSR conservado**,
descargar la limpieza de cachés PWA al salir/cambiar empresa y pasar la cabecera
al shell sin reconstruir cada prop. Compensan el JS de combinar main y este PR;
no se desactiva la precarga ni se agrega una barra de progreso.
La salida también se ejecuta si falla la descarga del chunk de limpieza (test de
rechazo del import). Tras avanzar main, se evita el `count` redundante de Personas
cuando la primera página contiene todo el resultado; con cursor o más páginas se
mantiene el conteo exacto y el mismo filtro de alcance (tests de paginación).

La autorrevisión detectó y se corrige con tests:
- El catálogo opcional de cargos en `personas.list` exige `estructuras.read`
  efectivo, igual que `cargos.list`; una denegación sobre owner prevalece.
- El simulador relacional intersecta el id pedido con el alcance, sin sobrescribirlo,
  y resuelve conectores y relaciones singulares (alertas documentales incluidas).
- El total de Personas para un supervisor sigue en cero cuando no tiene alcance.

No hay capacidades, escrituras, migraciones ni cambios de workflows nuevos respecto
de main. Se preservan los cambios que trae el merge; no se aplican migraciones.

## Criterios parciales y riesgos

El encargo no declara resuelto el Brief 03 completo. Sigue pendiente el clic durante
la hidratación con precarga activa (carrera prefetch/navegación, #44); se conservan
los dos `test.fixme` anteriores, sin agregar omisiones nuevas. El protocolo de
consultas y la navegación estable se verifican aparte. El gate obligatorio de
rendimiento en CI y Lighthouse no se añaden aquí: no se tocan workflows.

La evidencia de esta ejecución y los comandos/resultados finales quedan en
`PR-BODY.md`. La revisión formal y CI del nuevo head corresponden al flujo del PR;
la autorrevisión local no los sustituye.
El protocolo local se mide con la semilla disponible: si Personas supera una página,
se necesita una consulta adicional para su total exacto y no se declara cumplido el
tope de ocho para ese caso. La corrida ampliada de caché también ejercita clics
inmediatos afectados por el pendiente de hidratación; sus fallos se informan, no se
ocultan ni se convierten en nuevas omisiones.
