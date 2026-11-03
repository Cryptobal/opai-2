# DESIGN PROMPT — CPQ v4: MÓDULO COMPLETO DE PUNTA A PUNTA (OPAI 2.0)

> **Estado:** listo para pegar en Claude Design. Nace de la auditoría de CPQ del 3-nov-2026 (`docs/2.0/auditoria-cpq-2026-11.md`) y del video de QA de Carlos (primera cotización bloqueada en un tenant nuevo).
>
> **Relación con v3:** el diseño v3 (`DESIGN-PROMPT-cpq.md`, export `docs/2.0/diseño/export-cpq/`, aprobado el 29-oct-2026) **sigue vigente**: cotizador de escritorio, planilla, resumen, semáforo, traza, instrumentos, condiciones, diff y envío. Este v4 **no lo rehace**: dibuja lo que v3 pidió y nunca se exportó, lo que la auditoría encontró que falta respecto de OPAI 1.0, y un **prototipo navegable del módulo entero**. Donde v4 contradice a v3, manda v4 y se dice explícitamente.
>
> **Decisiones de Carlos ya incorporadas (3-nov-2026):**
> - Los valores legales (ingreso mínimo, topes, AFP, SIS, cesantía, mutual básica, UF, UTM) **se obtienen solos**. Nadie los «publica» a diario. Si una fuente falla, se usa el último valor con aviso; **nunca bloquea**.
> - Si el tenant **no confirmó la mutual adicional**, se calcula con **adicional 0 %** y se muestra un aviso. **Enviar al cliente sí exige confirmarla.**

Para pegar completo en Claude Design, **en el mismo proyecto del export v3 de CPQ**, con el **Design System de OPAI 2.0 V2** (`packages/ds/src/tokens.css`, `docs/2.0/design/export-ds-2.0/`; el mismo de `docs/2.0/diseño/export-crm/` y `export-cpq/`). **Nunca el estilo de OPAI 1.0.** Reutiliza los componentes que v3 ya definió (`PlanillaCotizacion`, `ResumenCotizacion`, `ResumenCostosCategoria`, `SemaforoMargen`, `TrazaMonto`, `SimuladorMargen`, `DiffVersiones`, `DetalleInstrumentos`, `SelectorRateo`, origen del sueldo sobre `BadgeCapa`/`OrigenMonto`, `TarjetaPlanAgente`) y los del DS (`AppShell`, `SplitScreen`, `DetailScreen`, `Sheet`, `Dialog`, `Combobox`, `Segmentado`, `Switch`, `Chip`, `ChipToggle`, `Badge`, `Alerta`, `Timeline`, `KpiTile`, `PanelAprobacion`, `AntesDespues`, `Empty`, `ErrorState`, `Forbidden`, `Loading`, `avisar`). Componentes nuevos: solo los de la sección 3.

Resultado esperado: **export HTML standalone, una pantalla por archivo** (sección 8), capturas por pantalla y viewport, y **un prototipo navegable** (`FlujoCompletoCPQ.dc.html`) que enlace todas las pantallas en el orden del recorrido de la sección 2.

---

## 1. Contexto (resumen; el detalle está en v3 §1)

OPAI 2.0 es un SaaS multi-tenant y agent-first para empresas intensivas en personal (seguridad primero). En el export usa «Atlas Seguridad SpA», nunca Gard. CPQ cuelga del CRM: **toda cotización pertenece a un negocio** y cubre una o varias **instalaciones** del negocio (una sección por instalación más una **Común**). El precio sale del costo laboral real (motor de sueldos con los valores legales vigentes), los ítems del catálogo y el margen financiero. Todo lo que se ve en pantalla existe también para los agentes por MCP, con vista previa y aprobación humana de lo irreversible.

Formatos, vocabulario de la vertical, permisos (`cpq:costos.ver`: sin él no hay costo, sueldo ni margen), principios y estados obligatorios: **iguales a v3 §1 y §5**.

**Viewports:** 375, 1024 y 1280 en todas las pantallas; 768 en la ficha. Modo oscuro en la ficha a 375, la hoja de puesto y el checklist de requisitos.

**Cambio respecto de v3: el teléfono también edita.** Carlos y los ejecutivos trabajan desde el teléfono. En 375 **no hay planilla con edición en celda**, pero se agrega, edita y quita todo **por hojas**: puesto, ítem, parámetros financieros, condiciones y margen. La planilla con edición en celda queda para iPad y escritorio, como en v3. La cotización rápida sigue siendo la entrada recomendada en el teléfono.

## 2. Recorrido completo (el prototipo navegable sigue este orden)

1. **Negocio** (ficha del CRM ya diseñada en `export-crm/Negocio.dc.html`) → pestaña **Cotizaciones** vacía → «Nueva cotización».
2. **Cotización rápida** (hoja): cuenta y negocio ya elegidos, instalación, un paquete «Guardia 24/7 4x4», margen del tenant → «Crear cotización».
3. **Ficha de la cotización** recién creada, con el **checklist de requisitos** (sección 4.1) mostrando el estado real del tenant nuevo: valores legales al día (verde, automático), mutual adicional sin confirmar (aviso, se calcula con 0 %), un puesto sin sueldo (acción «Agregar sueldo»).
4. **Hoja de puesto**: el sueldo se autocompleta con el **sueldo de referencia del cargo** (chip «Referencia del cargo»); el pie muestra costo y venta en vivo.
5. **Hoja de ítem**: agregar uniformes, un examen y una camioneta de ronda; marcar dos «Incluye» sin costo (radio, linterna).
6. **Margen y finanzas** (hoja en el teléfono, sección en escritorio): margen 12 %, póliza de garantía activada.
7. **Resumen** con venta, semáforo (sobre el mínimo) y costos por categoría.
8. **Pedir aprobación** (si el margen queda bajo el mínimo) → **Decidir** desde la Bandeja de Inicio en el teléfono.
9. **Enviar**: checklist de bloqueos (incluida «Confirma la mutual adicional» con su acción en línea), vista previa del PDF, destinatarios desde los contactos del negocio, canal correo o enlace.
10. **Compartir**: enlace del cliente y WhatsApp.
11. **Seguimiento** en la ficha: «Vista por el cliente hace 2 h»; versión enviada en solo lectura; «Editar crea la v2».
12. **Aceptada → negocio ganado → Crear puestos** (hoja de RRHH), que lleva la dotación a la **instalación** (pantalla de puestos de la instalación ya diseñada en `export-puestos/`).

## 3. Componentes nuevos (definirlos con sus estados en `/ds`)

| Componente | Qué es | Especificación |
|---|---|---|
| `ChecklistRequisitos` | Lo que falta para calcular o enviar, con acción por ítem | Lista compacta. Cada fila lleva: ícono de estado (listo, aviso, falta), texto concreto («Falta el sueldo de *Guardia diurno*»), consecuencia («El costo de esa línea queda pendiente») y **una acción que resuelve en el lugar**: abre la hoja del puesto, el diálogo de la mutual o reintenta la UF. Nunca un enlace a otra pantalla si se puede resolver ahí. Agrupa en «Para calcular» y «Para enviar». Sin pendientes, se colapsa en una línea verde («Todo listo para enviar»). En el teléfono es una **barra compacta** sobre la acción principal («2 pendientes · Ver») que abre la lista en una hoja; nunca un bloque fijo que ocupe un tercio de la pantalla. Estados: cargando, todo listo, avisos sin bloqueo, bloqueos, resolviendo un ítem (spinner en la fila). |
| `FuenteValor` | Procedencia y frescura de un valor legal o financiero | Chip pequeño: «UF 39.512,34 · SII · hoy», «IMM $ 539.000 · Previred · vigente desde 01-07-2026», «Mutual adicional 0 % · sin confirmar». Tonos: neutro (al día), aviso (respaldo: «último valor del 28-10 · la fuente no respondió»), sin rojo (estos valores nunca bloquean). Tooltip con la fuente y la fecha de captura. |
| `CampoSueldo` | Sueldo de la línea con origen y ayuda | Entrada CLP con chip de origen (de v3: «Referencia del cargo», «Capa de la instalación», «Escrito a mano»), «Restablecer» al de referencia y un `Segmentado` «Bruto / Líquido objetivo»: en líquido, muestra el bruto calculado debajo («≈ $ 612.400 bruto»). Error si queda bajo el ingreso mínimo. Sin `cpq:costos.ver` no se muestra. |
| `SupuestosPrevisionales` | AFP, salud y otros supuestos de costo de una línea | Bloque plegable con valores por defecto del tenant (AFP modelo, Fonasa 7 %, seguro de cesantía según contrato) y `Badge` «Sobrescrito» al cambiarlos. Cerrado por defecto, con una línea resumen. |
| `TarjetaCompartir` | Enlace del cliente y canales | Enlace copiable con vigencia y estado («Activo · vence 01-12-2026», «Revocado»), «Copiar», «WhatsApp», «Correo», «Revocar», y contador de vistas con la última fecha. |

## 4. Pantallas nuevas o que v3 pidió y no se exportaron

### 4.1 Ficha de la cotización con requisitos (`/cotizaciones/[id]`, foco en 375 y en tenant nuevo)
Ficha de v3 §4.3, más el `ChecklistRequisitos` y la regla de qué se muestra **sin cálculo**:
- **Venta mensual «—»** con la leyenda «Se calcula al completar los requisitos». **Margen «—», sin semáforo**: nunca «0,0 % · Bajo el mínimo» si no hay cálculo.
- **Costos por categoría**: una sola fila «Costos pendientes», no 8 filas «Pendiente».
- **«Recalcular»** al terminar dice lo que cambió o «Sin cambios: falta el sueldo de Guardia diurno».
- Dibujar 4 estados: **tenant nuevo** (los tres requisitos de la sección 2, paso 3), **listo con avisos** (mutual sin confirmar, todo calculado), **todo listo**, y **valores legales en respaldo** («UF del 28-10 · la fuente no respondió», sin bloqueo).
- En 375: venta y estado arriba, la barra de requisitos sobre la acción principal y las secciones plegadas con subtotal. Acciones por hoja: «Agregar puesto», «Agregar ítem», «Margen y finanzas», «Condiciones».

### 4.2 Hoja de puesto (`LineaPuesto`; v3 §4.4, completada)
- Sección (instalación o Común) y grupo.
- Nombre.
- **Cargo** (`Combobox` del catálogo de cargos del tenant). Al elegirlo trae el **sueldo de referencia** y las funciones.
- **Patrón** (4x4, 7x7, 14x14, 5x2, 2x5, 3x4…) y **días** con chips L M M J V S D.
- **Tramos horarios**, con el cruce de medianoche visible («20:00 → 08:00 +1»). Horas semanales calculadas, con aviso sobre la jornada legal.
- **Posiciones** y **personas por posición** sugeridas por el patrón («2 · sugerido por 4x4 de 12 h»; sobrescribir pide motivo).
- `CampoSueldo`.
- **Colación** y **movilización** mensuales por persona (hoy faltan; en 1.0 estaban). Más bonos u otros conceptos imponibles y no imponibles.
- `SupuestosPrevisionales`.
- Pie fijo: **costo mensual y venta de la línea en vivo**, con un enlace a su traza.
- Estados: nuevo, editando, sueldo bajo el mínimo (error), sin `cpq:costos.ver` (sin sueldo ni costo, solo dotación y horario), vista previa, guardando, error del servidor.
- En el teléfono es una hoja completa con secciones plegables. En escritorio, `Sheet` lateral.

### 4.3 Hoja de ítem o paquete (`ItemPaquete`; v3 §4.5, completada)
- Pestañas **Catálogo · Paquetes · Incluye**.
- **Catálogo:** búsqueda por categoría (uniformes, exámenes, equipamiento, vehículos, infraestructura, otros); costo unitario, modo de cálculo y rateo por defecto; cantidad, `SelectorRateo` y costo sobrescrito; visible al cliente; margen propio para adicionales.
- **Incluye:** ítems sin costo que se muestran al cliente («Radio portátil», «Libro de novedades digital»). Equivalen a los «includes» de 1.0.
- **Paquetes:** tarjetas del tenant que agregan línea más ítems de una vez.

### 4.4 Margen y finanzas en el teléfono (`MargenFinanzasMovil`)
Hoja con:
- margen, modo de margen y simulador;
- `DetalleInstrumentos` de v3: póliza, RC y costo financiero, cada uno con su `Switch` y «Sobrescrito»;
- **meses de contrato** (no se deducen de la validez);
- condiciones comerciales.

Venta y semáforo en vivo en el pie. En escritorio esto ya está en v3 como secciones plegables: no se redibuja.

### 4.5 Lista de cotizaciones (`Cotizaciones`; v3 §4.1)
Como en v3, más: filtro «Con requisitos pendientes», acción de fila «Archivar» y vista «Archivadas» con «Restaurar». En lugar de borrar se archiva; borrar definitivamente es solo para borradores nunca enviados, con confirmación.

### 4.6 Pestaña Cotizaciones del negocio (`NegocioCotizaciones`; v3 §4.2)
Como en v3. Dibujar también el **vacío** («Este negocio aún no tiene cotización» con «Nueva cotización» y «Cotización rápida») y el negocio **ganado**, con el aviso «3 puestos por crear» y la acción «Crear puestos».

### 4.7 Enviar con vista previa (`Enviar`; reemplaza el diálogo actual)
Drawer en escritorio, hoja completa en el teléfono:
1. **Bloqueos y avisos** (`ChecklistRequisitos`, grupo «Para enviar»): mutual sin confirmar, con el diálogo de confirmación en línea; margen bajo el mínimo sin aprobación; UF del día; colación faltante.
2. **Vista previa del documento**, con la plantilla y la marca del tenant y la marca de agua BORRADOR. Estados obligatorios: **generando**, con skeleton de página y un **máximo visible** («Esto tarda más de lo normal · Reintentar»); **listo**, con miniaturas y zoom; y **error** con el motivo y «Reintentar». Nunca un «Generando PDF…» sin fin.
3. **Formato**: cotización sola o cotización más propuesta técnica.
4. **Destinatarios** desde los contactos del negocio (`Combobox`, con «Agregar contacto»).
5. **Canal**: correo y/o enlace.
6. **Confirmación explícita**: «Enviar congela esta versión».

Estado del agente: «Esperando aprobación humana».

### 4.8 Compartir y seguimiento (`Compartir`)
`TarjetaCompartir` en la ficha de una cotización enviada, con «WhatsApp» (abre la app con el mensaje y el enlace), «Copiar enlace», «Revocar» y el `Timeline` de eventos: enviada, abierta por el cliente, descargada, aceptada o rechazada. Lo que se muestra al cliente es `PropuestaCliente.dc.html` de v3: no se redibuja.

### 4.9 Aprobación (`Aprobacion`; v3 §4.8)
Pedir aprobación y decidir, ambos también en 375, reutilizando `PanelAprobacion`. Dibujar el ítem en la Bandeja de Inicio y la hoja de decisión abierta desde la campana.

### 4.10 Cotización rápida (`CotizacionRapida`; v3 §4.9)
Como en v3. Al abrirse desde un negocio, el negocio y la cuenta ya vienen elegidos. Dibujar la vista previa («Se creará CPQ-2026-NNN v1 con 2 posiciones 4x4») y el éxito, que abre la ficha con su checklist.

### 4.11 Crear puestos al ganar (`CrearPuestos`; v3 §4.11)
Como en v3, con la consecuencia en la instalación: «Se crearán 4 puestos en *Planta Norte*», con enlace a sus puestos y el sueldo marcado «Referencia del cargo» o «Escrito a mano» para que RRHH lo confirme.

### 4.12 Configuración del CPQ: sueldos de referencia por cargo (`ConfigSueldosReferencia`)
**Se agrega en la pestaña Catálogo de v3, sin pestaña nueva.** Sub-sección **«Sueldos de referencia para cotizar»**:
- tabla de cargos con sueldo de referencia, vigencia y **«Usado en N cotizaciones abiertas»**;
- edición en línea, con aviso: «Cambiarlo no altera cotizaciones enviadas; las abiertas muestran "desactualizada"».

Es un **supuesto de venta, no el sueldo que se paga** (decisión del 29-oct). Las pestañas Pólizas y finanzas y Márgenes son las de v3, ya diseñadas: se implementan tal cual.

### 4.13 Requisitos del tenant en Configuración › Remuneraciones (`RequisitosRemuneraciones`)
Destino único de «Confirmar mutual adicional» cuando se quiere ver el detalle. Muestra:
- **valores legales con `FuenteValor`**, de solo lectura, con «Actualizados automáticamente» y la última captura;
- el **cambio propuesto pendiente de revisión** cuando una fuente trae un valor distinto (aprobar o rechazar, para owner y admin);
- la **mutual adicional**: tasa, estado («sin confirmar · se cotiza con 0 %») y «Confirmar».

Reutiliza el export `export-motor-sueldos/` donde aplique: solo se dibujan los estados nuevos.

### 4.14 Agente sobre CPQ (`AgenteCPQ`; v3 §4.13)
Como en v3, más un cuarto momento: «Cotiza 2 guardias 4x4 en Planta Norte para este negocio», donde el plan incluye el sueldo de referencia y avisa «mutual adicional sin confirmar: se calcula con 0 %».

## 5. Estados obligatorios
Los de v3 §5, más:
- tenant nuevo sin requisitos;
- mutual sin confirmar;
- valores legales en respaldo;
- vista previa del PDF generando, lenta o con error;
- enlace revocado o vencido;
- cotización archivada.

## 6. Datos de ejemplo
Los de v3 §6, más:
- un tenant nuevo «Vigía Sur SpA» sin mutual confirmada;
- un cargo «Guardia de seguridad» con sueldo de referencia $ 620.000;
- una cotización enviada con 3 vistas del cliente.

Nunca RUT, nombres ni sueldos reales.

## 7. Fuera de este prompt
Ya tienen diseño aprobado y no se redibujan: ficha de **negocio**, **cuentas** y **contactos** (`export-crm/`), **instalaciones** y maestros (`design/export-maestros/`), **puestos** de la instalación (`diseño/export-puestos/`), página pública de la propuesta, propuesta técnica y PDF (`export-cpq/PropuestaCliente`, v2 de propuesta técnica). El **seguimiento comercial** (tareas y recordatorios del negocio) tiene su propio prompt (`DESIGN-PROMPT-seguimiento-comercial.md`).

## 8. Archivos del export
`FlujoCompletoCPQ.dc.html` (prototipo navegable con el recorrido de la sección 2), `FichaRequisitos.dc.html`, `LineaPuesto.dc.html`, `ItemPaquete.dc.html`, `MargenFinanzasMovil.dc.html`, `Cotizaciones.dc.html`, `NegocioCotizaciones.dc.html`, `Enviar.dc.html`, `Compartir.dc.html`, `Aprobacion.dc.html`, `CotizacionRapida.dc.html`, `CrearPuestos.dc.html`, `ConfigSueldosReferencia.dc.html`, `RequisitosRemuneraciones.dc.html`, `AgenteCPQ.dc.html`, y `shots/` en 375, 1024 y 1280 (oscuro: `FichaRequisitos`, `LineaPuesto`, `Enviar`).
