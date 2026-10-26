# Alcance · Puestos PR 1 (el puesto como posición) — para revisar una sola vez

Fuentes verificadas el 26-oct-2026: código de 1.0 (copia del 24-sep, e3f267e0a), herramientas MCP de 1.0 en vivo y solo lectura, Page «Puestos y guardias OPAI 2.0: propuesta» (decisiones cerradas el 25-oct) y Linear CAR-8. El export de Claude Design de Puestos **no lo revisé**.

## 1. Qué pasa de 1.0 a 2.0 en este PR
| En 1.0 hoy | En 2.0 (test.opai.cl) |
|---|---|
| Los puestos se ven en la ficha de instalación (pestañas Puestos y Dotación); /ops/puestos solo redirige | /instalaciones/[id]/puestos rediseñada, con una fila por posición y una hoja para crear y editar |
| Puesto operativo con nombre, horario de inicio y fin, y «guardias requeridos» 1..20 en una sola fila (list/create/update_ops_puesto) | **1 puesto = 1 posición cubierta.** La dotación se arma con N puestos |
| Roles y patrones fijos por puesto (list_cpq_roles: días de trabajo y descanso) | Catálogo de patrones de turno por tenant (4x4, 7x7, 14x14, 5x2, 2x5, 3x4) en Configuración |
| Activar y desactivar puestos | Activar y desactivar, con vigencia desde y hasta |
| Copiar puestos al crear la instalación (ya está en 2.0) | Se mantiene, pero ahora copia posiciones |

## 2. Qué NO entra en este PR, y por qué
- **Asignar trabajadores (titular y relevo), las series de turnos y la pauta mensual**: van en el PR 2. Necesitan el vínculo con el puesto, que entra con el 07b PR 3.
- **Pauta diaria y asistencia**: son la parte de CAR-8 que habla de asistencia y de la pauta diaria. Van en el PR 3, sobre la pauta del PR 2.
- **PPC con motivos, turnos extra, refuerzos y búsqueda de urgencia (30 km, OS10, descanso)**: van en el PR 3 o después. Sin asignaciones no hay nada que cubrir.
- **Crear puestos desde la cotización ganada**: lo dejé fuera porque CPQ todavía no existe en 2.0.
- **El sueldo del puesto (capa puesto) y el anexo**: son del Brief 07b. Este PR no toca EstructuraSueldo ni VinculoLaboral.
- **La operación de 1.0 sigue igual en opai.gard.cl**: pauta, marcaciones, rondas y PPC.

## 3. Mejoras que se suman
1. **1 puesto = 1 posición**, con estado **PPC «Sin asignar»** visible desde el primer día. 1.0 mete 6 a 8 cupos en una sola fila y los repite en 4 tablas (slotNumber).
2. **El nombre del patrón se ve claro e inmediato** en Configuración → Patrones de turno y en cada puesto, como pide CAR-8.
3. **Rol, horario por tramos y horas semanales van por separado**, y la colación se guarda en el puesto. El turno de noche y la rotación día y noche quedan dentro del mismo puesto.
4. **Catálogo de funciones por tenant y vertical.** El supervisor es un puesto más.
5. **Todos los puestos se ven y se navegan, sin elementos corridos ni superpuestos** a 375, 1024 y 1280 px. Lo comprueba una prueba visual (CAR-8).
6. **Hay paridad MCP con vista previa**: core.puestos.crear y editar, y core.patrones.listar.

> **Decide Carlos**
> 1. **¿Qué pasa con los puestos que ya existen en test.opai.cl con dotación mayor que 1?** Recomiendo **dividirlos en N puestos** con un script que primero simula (--dry-run) y entrega un reporte. La columna «dotación» queda deprecada, sin borrarla.
> 2. **El 07b dice ir antes que Puestos.** Recomiendo **Puestos PR 1 primero**, porque no lleva sueldo. Después va el 07b PR 1, con su brief dentro del PR y su bloque Sueldo encima de la hoja nueva.
> 3. **¿El puesto conserva el cargo?** Recomiendo **sí**: el cargo (contractual, que ya existe) queda junto a la función nueva (operativa).
> 4. **Una migración a la vez.** Puestos se construye en paralelo, pero su migración se aplica y se integra **después de la del CRM**.

---

> **Nota del 26-oct-2026 (después de la aprobación; no cambia la hoja de arriba).** Configuración de Patrones y Funciones: aplazada hasta su diseño en DS V2 (pendiente de que Carlos lo confirme). Origen: revisión 5658390255 del «Revisor OPAI 2.0» y la regla de Carlos del 26-oct-2026 17:18 CLT («nunca copiar el diselo de 1.0, se debe usar el design system aprobado»). El nombre del patrón sí se ve en cada puesto. Seguimiento en el brief (§6 y §7).
