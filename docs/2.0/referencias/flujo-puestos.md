# Flujo de pantallas de Puestos — solo referencia de flujo

> **SOLO REFERENCIA DE FLUJO · NO ES UN DISEÑO APROBADO.** Describe en texto el recorrido de un prototipo de Claude Design (proyecto `4cb4b749-4284-48b5-8e9b-4209f4c86715`) hecho con el estilo de 1.0. Ese export se sacó del repositorio el 26-oct-2026 por la regla de Carlos: «nunca copiar el diselo de 1.0, se debe usar el design system aprobado https://claude.ai/design/p/44e4d7b9-7464-4771-bff8-07fcff4d573d» (Carlos, 26-oct-2026 17:18 CLT, transmitido en el encargo del PR #49). Aquí no hay CSS, HTML, tokens ni clases: todo estilo sale del DS 2.0 (`@opai/ds`) que está en `main`, y toda pantalla nueva necesita su diseño aprobado en DS 2.0 antes de construirse.

## Recorrido

1. **Instalaciones → instalación → pestaña Puestos.** Lista de instalaciones con su cuenta, número de puestos y PPC de hoy. En la instalación, una fila por posición: nombre, estado de cobertura (PPC «Sin asignar» o cubierto), función, patrón, horario por tramos (con «+1» si cruza medianoche) y horas semanales. Estado vacío: «Esta instalación no tiene puestos · Crea uno por cada posición que se cubre a la vez», con la acción «Nuevo puesto».
2. **Ficha del puesto (hoja).** Datos del puesto, asignaciones vigentes, serie de los próximos 28 días e historial. Acciones: editar, desactivar, ver pauta y asignar.
3. **Crear o editar puesto (formulario por pasos).**
   1. Qué cubre: nombre (sugerido por función y jornada) y función del catálogo de la vertical.
   2. Rol y horario: patrón, inicio del ciclo, rotación día/noche en el mismo puesto, tramos con aviso cuando termina el día siguiente, colación (minutos y si va dentro o fuera) y horas semanales pactadas con el promedio calculado como sugerencia.
   3. Sueldo del puesto (Brief 07b; fuera del PR 1).
   4. Vigencia: desde y hasta.
4. **Configuración → Operaciones.** Patrones de turno (nombre claro, clase, días y en cuántos puestos se usa; los de fábrica no se eliminan, se desactivan si no están en uso), funciones por vertical con su uso, requisitos para cubrir PPC (radio de búsqueda, descanso mínimo) y grupos de sueldo. Se edita desde iPad o computador.
5. **Asignar** (PR 2): elegir trabajador, rol en el puesto (titular o relevo), desde y desfase, con vista previa de la serie y de la cobertura. Traslados con borrador de anexo que aprueba RRHH.
6. **Pauta mensual** (PR 2): calendario por puesto con Día, Noche, Libre y PPC; pintar series desde un día (iPad y computador); en el celular solo se ve y se asigna.
7. **Asistencia y pauta diaria** (PR 3): marcas planificadas frente a reales, atraso y ausente, marca manual con motivo.
8. **PPC y búsqueda de urgencia** (PR 3 o después): lista de PPC de los próximos días, candidatos cercanos que cumplen requisitos y contacto; asigna Operaciones.

## Qué entró en el PR 1 (#49)

Solo el paso 1 (lista) y el paso 3 sin el bloque de sueldo, en la hoja de crear y editar, construidos con el DS 2.0. Configuración de Patrones de turno y Funciones (paso 4) queda aplazada hasta su diseño en DS 2.0 (ver `docs/2.0/briefs/BRIEF-11-puestos.md`).
