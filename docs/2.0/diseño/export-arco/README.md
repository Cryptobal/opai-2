# Export arco v4

Diseño en Claude Design de **Configuración › Cumplimiento**: solicitudes ARCO, incidentes y brechas, RAT, retención y Ley 21.719. Versión v4, que reemplaza el export v3 en este mismo PR.

Revisado por el operador el 30-oct-2026 ~15:15 CLT: revisión estática, sin render, contra el prompt de origen y el ajuste v4 (correcciones del Abogado al v3), en `alcance/` del computador del operador (no en el repo).

Reemplaza a #158 (export arco v2).

## Pantallas

- `00 Indice.dc.html`
- `01 Resumen.dc.html`
- `02 Bandeja de solicitudes.dc.html`
- `03 Detalle de solicitud.dc.html` (+ Dialogs: prorrogar, segunda prórroga bloqueada y denegar)
- `04 Responder.dc.html`
- `05 Registrar solicitud.dc.html`
- `06 Incidentes y brechas.dc.html`
- `07 RAT.dc.html`
- `08 Retencion y anonimizacion.dc.html` (+ Anonimizar)
- `09 Privacidad en la ficha.dc.html`
- `10 Hoja de componentes.dc.html`
- `11 DPA y delegado de proteccion de datos.dc.html`
- `B1 Bloqueo temporal.dc.html`
- `B2 Plazo de aviso de brechas.dc.html`
- `B3 Formulario publico.dc.html`

B1–B3 fueron decididas por Carlos el 30-oct-2026.

`Artboards.dc.html` y `Cumplimiento ARCO.dc.html` son los componentes fuente.

## Estado

**RETENIDO.** No integrar hasta que el Abogado valide el v4.

## Correcciones del Abogado aplicadas (v4)

1. Anonimizar es irreversible: Nombre «Se elimina»; «No guardamos ningún código ni tabla que permita volver a identificarlo.»; Turnos y rondas «Se conservan sin ningún dato que identifique a la persona».
2. Delegado de protección de datos opcional y separado del encargado: tarjeta «Delegado de protección de datos (opcional)», pantalla «DPA y delegado de protección de datos», botones «Cambiar delegado» y «Ver delegado», ayuda arts. 49 y 50 y art. 14 ter b, estado vacío «Sin delegado designado. Es opcional.».
3. Responder guarda fecha, hora, destinatario y el contenido íntegro de la respuesta.
4. B1 y Hoja: «Responder a más tardar el 21-12-2026».
5. INC-0004: Titulares «No requerido: no hay datos sensibles, de menores de 14 ni económicos.»; Agencia «Por evaluar: ¿hay riesgo razonable?».
6. Geolocalización y comunicaciones internas: base «Interés legítimo» con derecho de oposición (art. 8° a), sin consentimiento.

## Menores del ajuste aplicados

- Hoja con días sobre 30 más los prorrogados (máximo 60).
- B3 con aviso de extensión única de hasta 30 días corridos y campo opcional «Actúo como representante de…».
- Retención: Control de asistencia «5 años desde el término» y Salud ocupacional «Plazo por confirmar».
- Se quitó el checkbox «Acepto el tratamiento».
- Sin nombre real ni RUT real en los datos de ejemplo (tampoco en el bundle `_ds`).
- «Edificio Costanera Center» → «Edificio Mirador Poniente».
- «Pídele acceso a un administrador».
- Fechas de solicitudes de ejemplo desde el 01-12-2026.

## Pendientes menores (no bloquean)

- El bundle `_ds` aún trae una descripción por defecto de Forbidden con «Pídele acceso a Andrés Molina» (ficticio, no genérico).
- Historial de DPA/bases con fecha 03-03-2026.
- 30-oct-2026 ~15:25 CLT: correcciones de texto del Abogado (encabezado Bases de tratamiento, Registrar oposición, saludo y RUT de ejemplo).
- Hex sueltos #4a3fd8/#fff en los envoltorios de miniaturas.
