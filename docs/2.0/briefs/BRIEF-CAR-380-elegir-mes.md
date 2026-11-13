# BRIEF CAR-380 · Desempeño: elegir el mes y cerrar meses anteriores

Pendientes de CAR-307 («elegir otro mes») y de CAR-322 («cerrar meses más antiguos desde la pantalla»). Decisión nocturna por revisar: se muestran hasta 12 meses hacia atrás desde el primer scorecard publicado y cada mes se cierra desde su fila, sin un orden obligatorio.

## Alcance
- `desempeno.periodos.list` devuelve además `abiertos`: los meses ya terminados que siguen sin cerrar, del más reciente al más antiguo. Son 12 como máximo y nunca anteriores al primer scorecard publicado. Solo los ve quien puede cerrar (alcance completo).
- En «Meses cerrados», los meses abiertos aparecen en la lista con la insignia «Abierto» y un botón «Cerrar» en su fila. El mes anterior sigue arriba como acción principal, igual que hoy. Para cerrar se usa la confirmación que ya existe.
- En el scorecard del cargo (sección Equipo) y en el resultado de una persona aparece un selector de mes con ‹ ›. El mes va en la URL (`?mes=aaaa-mm`) y el selector no avanza más allá del mes en curso. El equipo abre a cada persona en el mismo mes.

## Seguridad
- Sin capacidad nueva ni migración.
- Las lecturas son las mismas capacidades, con el mismo alcance y los mismos permisos.
- Cerrar sigue pidiendo `desempeno:scorecards.manage`, alcance completo y aprobación humana para los agentes.

## Tests
- `desempeno-cierre-db.test.ts`: noviembre aparece como abierto antes del cierre.
- `desempeno-preview.spec.ts`: captura del mes anterior en el cargo.
