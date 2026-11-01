# CAR-130 · Actividad de Inicio y kanban móvil

Encargo: CAR-129, puntos 2 y 4 del Loom «Míralo», según el texto entregado por Carlos en esta sesión.
Referencia: https://linear.app/carlos-irigoyen/issue/CAR-129/miralo.
Rama y tarea de implementación: `fix/car130-actividad-kanban`, CAR-130.

## Alcance

- Traductor único en el servidor para Inicio y actividad de fichas. Verbos y entidades conocidos
  en español; respaldo «realizó un cambio» o «consultó información», sin mostrar ids técnicos.
- Inicio muestra cambios: selecciona capacidades cuyo efecto registrado es escritura o irreversible,
  antes del límite y cursor. El historial de las fichas conserva las lecturas.
- Kanban móvil: scroll horizontal nativo con snap; mantener 400 ms activa el arrastre táctil,
  mover más de 8 px antes cancela la pulsación y deja pasar el scroll. «Mover a…» sigue disponible.
- Vacío móvil compacto con `Empty` del DS, «Sin negocios»; escritorio conserva texto y estilo previos.

Sin migraciones, permisos nuevos, capacidades nuevas, endpoints ni modificaciones de topes.

## Decisiones de implementación

Tomadas por Codex para ejecutar este encargo, sin atribuirlas a Carlos:

1. El registro no ofrece nombres breves de acción en pasado: se conserva un diccionario único
   de verbos/entidades en el traductor existente y se consulta el registro para distinguir lecturas.
   No se usan descripciones largas de herramientas como frases del feed.
2. Inicio excluye también ids históricos que ya no estén registrados: no se puede afirmar que sean
   cambios. La auditoría completa y el historial de las fichas siguen disponibles.
3. El estado técnico de `set_estado` no se concatena: se muestra «cambió el estado de…» sin riesgo
   de exponer enums internos. El detalle auditado se conserva en la ficha.
4. Arrastre táctil por eventos nativos, sin dependencias. El snap se suspende durante el arrastre
   y se restaura al terminar o cancelar. La zona de entrega admite el espacio bajo una etapa vacía
   dentro del tablero, sin estirar el fondo gris.

5. Los listeners táctiles permanecen estables cuando el selector actualiza la URL.
   `useEffectEvent` toma las etapas y la acción actuales al soltar, sin cancelar la pulsación en curso.

## Criterios de aceptación y evidencia

- Traducción conocida, respaldo desconocido y filtro de efectos: tests unitarios del traductor.
- Filtro antes de paginar para Personas y Agentes: test de capacidad con límite 1 y lecturas recientes.
- Scroll, pulsación sostenida, movimiento de etapa y vacío compacto: e2e
  `actividad-kanban-car130.spec.ts` (390×844 en teléfono, 1024 y 1280 en los otros proyectos).
- Autorrevisión de subagente realizada; corregidos snap durante arrastre, entrega bajo columna vacía
  y conservación del vacío de escritorio. La revisión del bot Revisor corresponde al flujo posterior.
- Resultados finales del gate y cualquier CA parcial se consignan en `PR-BODY.md`.

## Limitación de validación adicional

El e2e de rendimiento global con `GATE_ESTRICTO=1` contra `next start` falla en Cargos:
contador de consultas 0, que el test trata como instrumentación desconectada. La medición separada
de Inicio también devuelve 0, por lo que no valida el tope de 8 consultas. Negocios devuelve 1
en tres muestras. No se cambian topes, la instrumentación ni las rutas ajenas al encargo.
El filtro de cambios modifica la condición del SQL existente, sin consultas adicionales.
