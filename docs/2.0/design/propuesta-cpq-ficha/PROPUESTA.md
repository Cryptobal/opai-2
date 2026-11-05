# Propuesta: rediseño de la ficha de cotización CPQ (4-nov-2026)

Estado: **Propuesta para Carlos.** No se toca código hasta que él elija con un comentario «DECISIÓN CARLOS:» en el PR. Mockups navegables (3 alternativas, escritorio y teléfono, claro y oscuro): `index.html` en esta carpeta.

## Qué pidió Carlos (4-nov, 20:48)
Un solo estado claro con un único siguiente paso; no poder marcar «Lista para enviar» con margen bajo el mínimo o valores desactualizados; sin botones duplicados ni tarjetas sueltas; flujo guiado (cliente e instalación, puestos, costos y margen, documento y envío); arriba siempre precio mensual, margen contra objetivo con semáforo explicado y estado con su acción; costos agrupados y plegables, solo con monto; mensajes simples; que funcione en el teléfono.

## Causas verificadas en el código (origin/main e49bee1)
1. `margenObjetivoPct` nace `null` y el motor lo toma como 0 %: precio igual al costo, margen 0, semáforo rojo y «Requiere aprobación» (`crear.ts`, `mapear.ts`). La tarjeta dice «Del modelo», que no existe.
2. `marcar_lista` solo valida `noEnviable` y `requiereAprobacion`; no valida valores desactualizados, mutual sin confirmar ni líneas habilitadas (`aprobacion-margen.ts`; esas se validan solo al enviar, `enviar-validar.ts`).
3. La ficha recalcula en vivo también en `lista`, así que una versión aprobada vuelve a mostrar «Requiere aprobación» y «Bajo el mínimo».
4. «Recalcular» no guarda la huella fuera de borrador y, como primaria, tapa «Enviar al contacto».
5. Editar, Quitar y Agregar puesto se ofrecen en `lista`, pero las capacidades exigen borrador. «Nueva versión» se ofrece en `lista` y choca con el índice único.
6. El mínimo (10 %) y la alerta (3 pts) están fijos en código (`recalcular.ts`); la spec los quiere como ajuste del tenant.
7. Duplicados: «Nueva cotización» y «Nueva»; «Vista previa PDF» en cabecera, menú y tarjeta; estado repetido en cabecera, resumen y pie.
8. Seis tarjetas antes del primer puesto; ocho categorías de costo siempre visibles, la mayoría en $0 (catálogo semilla en 0). La propuesta técnica no se ve bajo 1280 px.

## Reglas comunes a las tres alternativas
- Un solo estado visible: Borrador incompleto, Revisa, Margen bajo, En aprobación, Lista para enviar, Enviada. Nunca dos a la vez.
- Una sola función de requisitos que alimente el chip, la lista de pendientes y las capacidades `marcar_lista` y `enviar`.
- «Aprobada» no es «Requiere aprobación»; se congela el margen aprobado.
- Editar una versión en `lista` la vuelve a borrador (R41) o pide «Reabrir para editar»; la UI no ofrece lo que la capacidad rechaza.
- Margen objetivo con valor por defecto real; mínimo y alerta como ajuste del tenant, visibles junto al margen.
- Costos agrupados, solo con monto, «Agregar costo» para el resto; una sola «Vista previa PDF»; una sola «Nueva cotización».

## Alternativas
- **A. Un paso a la vez (asistente).** Mejor para quien cotiza poco y para el teléfono; más clics para revisar.
- **B. Ficha con pasos plegables.** Una página, cuatro bloques con pendientes; abre en el primer pendiente. **Recomendada.** Menor esfuerzo.
- **C. Tablero con panel fijo.** Para escritorio/iPad y cotizaciones largas; mayor esfuerzo, segunda etapa.

## Siguiente paso
Carlos elige A, B o C (o mezcla) con «DECISIÓN CARLOS:». Entonces: brief `BRIEF-NN-cpq-ficha`, primero las reglas de estado (capacidades y tests), luego la pantalla con capturas a 375, 1024 y 1280 verificadas con Playwright.
