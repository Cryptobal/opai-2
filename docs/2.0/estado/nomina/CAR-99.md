# CAR-99 · Nómina II · Liquidaciones (parte 1 de Nómina II + Cumplimiento DT)

- **Sesión:** Sesión Payroll
- **PR:** #801 · rama `brief/car-99-nomina-liquidaciones`
- **Estado:** En PR
- **Migración:** `20261231100000_nomina_liquidaciones` (aditiva; se aplica en dev y main con snapshot antes de integrar)
- **Apilado sobre / espera:** apilado sobre #799 (CAR-344): reutiliza la carga de vínculos y capas del costo proyectado.

## Qué entra

- Brief 27 (`docs/2.0/briefs/BRIEF-27-nomina-liquidaciones.md`).
- Cálculo puro `liquidacionDelMes` (`packages/domain/src/nomina/liquidacion.ts`): capa proporcional a los días trabajados (30 − licencia − ausencia, dentro del vínculo), horas extra R19 como haber imponible, cotizaciones e impuesto del motor del Núcleo, y anticipos, cuotas de préstamo y descuentos fuera del imponible. Avisos: sueldo base de la capa bajo el mínimo, líquido negativo y préstamos más descuentos sobre el 15 % (CAR-455, opción A mientras Carlos no decida).
- Tabla `nomina.liquidaciones` con RLS, FORCE y trigger de mismo tenant (período, persona y capa); guarda la capa y la huella del juego de valores (R21).
- Capacidades con MCP: `nomina.liquidaciones.calcular` (dryRun, idempotente, período bloqueado, borra las de personas que ya no corresponden), `nomina.liquidaciones.listar` y `nomina.liquidaciones.obtener` (lecturas auditadas por id). Evento `nomina.liquidaciones.calculadas`.
- Pantallas: «Ver liquidaciones» en el período, `/remuneraciones/[id]/liquidaciones` (resumen, cálculo con vista previa y tabla) y `/remuneraciones/[id]/liquidaciones/[liq]` (haberes, descuentos y líquido a pagar). Prueba `@preview`.

## Qué queda pendiente

- Parte 2: archivos Previred y F30-1 «por verificar» (el LRE entra en el PR apilado, sección siguiente). Parte 3: Cumplimiento DT como complemento.
- Marcar liquidaciones como revisadas, congelarlas al cerrar (hoy no se recalculan con el período cerrado), publicar al Portal Trabajador y PDF.
- Validar los montos contra 2 liquidaciones reales de Gard (decisión 11 del motor), con Carlos.
- Gratificación legal con tope mensual proporcional, semana corrida, cargas familiares y APV.

## Qué se decidió

- Días trabajados desde las novedades (licencia y ausencia) mientras Asistencia no entrega días: reversible y es lo que exige el PR 2 de la especificación.
- Mes de 30 días para proporcionar (práctica chilena y la de la especificación).
- Los descuentos no recortan el líquido: solo avisan (CAR-455).
- Calcular y ver liquidaciones exige acceso a todo el personal (sin alcance por instalación) y el permiso de sueldos sensibles: recalcular reemplaza el período completo y no debe borrar ni revelar lo que el usuario no ve.
- Días en base 30: 30 menos los días calendario fuera del vínculo (mes de 31 y febrero dan lo mismo que un mes de 30).
- Las novedades se leen con el período bloqueado, dentro de la misma transacción que guarda.

## Parte 2a · Archivo LRE (PR apilado sobre #801, rama `brief/car-99-nomina-lre`)

- **Qué entra:** `archivoLre` y `COLUMNAS_LRE` en `packages/domain/src/nomina/` (todas las columnas del índice del Suplemento LRE, Res. Ex. 285/2021, consultado en dt.gob.cl el 14-nov-2026); la liquidación guarda ahora los aportes del empleador (cesantía, Ley 16.744/SANNA, SIS, reforma) y los días de licencia; capacidad `nomina.lre.generar` con MCP (lectura auditada por las personas incluidas; exige permiso de obligaciones, sueldos sensibles y acceso a todo el personal); botón «Descargar LRE» con el Badge «Formato por verificar» en la página de liquidaciones. Sin migración.
- **Valida:** RUT de cada persona y del empleador (Ajustes → Remuneraciones), cuadratura haberes − descuentos = líquido y liquidaciones antiguas sin aportes (pide recalcular).
- **Qué se decidió:** encabezado `Nombre(código)`, nombre `cuerpoRUT_aaaamm.csv` sin DV, CRLF y sin BOM, todo marcado «por verificar» (decisión de Carlos del 30-oct-2026). Horas extra van en Sobresueldo (2102, art. 32 CT); anticipos y cuotas de préstamo en 3188; descuentos varios en 3185 («Otros descuentos»; los que pide el trabajador irían en 3183, por verificar). Sin RUT del empleador no se descarga el archivo.
- **Pendiente:** códigos de catálogo DT (AFP, salud, AFC, región, comuna, jornada) vacíos; bonos no imponibles y aporte de la reforma sin columna propia (solo en totales); marcar la obligación LRE como generada; verificar el formato contra el Manual de Usuarios LRE vigente antes del primer uso real (totales vacíos o en 0, y los totales 5230 y 5410 incluyen montos sin columna de detalle: riesgo de rechazo del validador DT); la prueba `@preview` del botón depende de que qa-e2e tenga liquidaciones calculadas.

## Parte 2b · Nómina de Previred (PR apilado sobre el del LRE, rama `brief/car-99-nomina-previred`)

- **Qué entra:** `archivoPrevired` en `packages/domain/src/nomina/previred.ts` (formato estándar de largo variable, 105 campos, especificación oficial v58 de abril 2022 consultada en previred.com el 14-nov-2026); la liquidación guarda ahora la previsión del mes (AFP, Fonasa o isapre, bases con tope); carga común `archivos-datos.ts` para LRE y Previred; capacidad `nomina.previred.generar` con MCP (mismos resguardos y auditoría que el LRE); botón «Descargar Previred» junto al LRE, bajo «Archivos legales» con el Badge «Formato por verificar». Sin migración.
- **Qué se decidió:** la carga común también lee la ficha previsional para el LRE (una consulta de más, aceptada por simplicidad); una línea principal (tipo 00) por persona, sin encabezado; nombre `previred_<cuerpoRUT>_mmaaaa.txt`; apellidos partidos en el primer espacio (el maestro los guarda juntos); tramo de asignación «D» si la ficha no lo trae; movimiento 1 (ingreso) o 2 (retiro) solo si el contrato empieza o termina en el mes; Fonasa entero en el campo 70 (sin reparto con CCAF); isapre con 7 % obligatorio y el resto adicional. Códigos de AFP de Previred: Capital 33, Cuprum 03, Habitat 05, Modelo 34, PlanVital 29, ProVida 08, Uno 35 (por verificar).
- **Pendiente:** códigos de mutual, CCAF e isapres (campo 75) y moneda del plan isapre (campo 78); código de movimiento para ingreso y retiro en el mismo mes (hoy queda 2 con las dos fechas); confirmar ASCII sin tildes (se normaliza); licencias como movimiento 3 con sus fechas; campos que cambió la reforma 2025–2026 (SIS y rentabilidad protegida); líneas adicionales (segundo contrato, APV); F30-1; marcar las obligaciones como generadas.

### Pantalla «Archivos y declaraciones» (diseño 06, en el mismo PR de Previred)

- `/remuneraciones/[id]/archivos`, enlazada desde el período («Archivos y declaraciones»): una tarjeta por archivo (LRE y Previred) con Validar, tabla de errores por persona y Descargar, que solo se habilita sin errores (como en el diseño aprobado). El botón que el PR del LRE había puesto en la página de liquidaciones sale de ahí.
- Tope de JS propio de 174 KB para la ruta nueva, igual que liquidaciones.
- Libro de remuneraciones en PDF y Excel (PR apilado sobre cierre-revisadas, rama `cursor/libro-remuneraciones-ab10`): capacidades `nomina.libro_remuneraciones.pdf` y `.excel`, tarjeta en Archivos. Pendiente diseño 06: F29 y archivo de pago del banco.

### Comprobantes y estado de obligaciones (PR apilado sobre el de Previred, rama `brief/car-99-nomina-comprobantes`)

- **Qué entra:** al validar, la obligación del mes (LRE o Previred) pasa a «generado» o «con errores» con `nomina.obligaciones.actualizar` (solo desde por generar, generado o con errores); «Subir comprobante de carga» (LRE) o «de pago» (Previred) sube el archivo a los documentos de la empresa (`core.documentos.*`, entidad tenant) y lo deja en la obligación, que pasa a «cargado» o «pagado». Si el calendario del año no existe, la pantalla avisa cómo generarlo. Sin capacidades nuevas ni migración.
- **Qué se decidió:** el comprobante se habilita solo con la obligación generada, cargada o pagada (la pantalla se refresca al validar); antes de subir, una vista previa de la actualización confirma que la obligación admite el cambio, para no dejar documentos huérfanos; el LRE cierra en «cargado» (no se paga) y Previred en «pagado».
- **Comprobante fijo (PR apilado, rama `brief/car-99-nomina-comprobante-fijo`):** `nomina.obligaciones.actualizar` rechaza reemplazar o quitar el comprobante de una obligación pagada (pagada no tiene salida en el flujo de estados), y la tarjeta deja de ofrecer subirlo. Una obligación cargada todavía se puede corregir.
- **Pendiente:** idempotencyKey en las actualizaciones desde la pantalla; ver o descargar el comprobante desde la tarjeta (hoy solo avisa que quedó guardado); permisos de documentos: quien no puede subir documentos de empresa verá el error de la capacidad.

## Liquidaciones revisadas (PR apilado sobre el del comprobante fijo, rama `brief/car-99-nomina-revisadas`)

- `nomina.liquidaciones.marcar_revisadas` (diseño 03 «Marcar revisadas»): pasa de calculada a revisada todas las liquidaciones del período, con el período abierto o en revisión y bloqueado en la transacción. Exige la vista completa (sin alcance y con sueldos sensibles), como leerlas. Con dryRun cuenta cuántas pasarían. Emite `nomina.liquidaciones.revisadas` (declarado en el manifest). Recalcular el período las devuelve a calculada (ya lo hacía `guardarLiquidaciones`).
- `nomina.liquidaciones.listar` suma `total.revisadas`. La pantalla muestra «Revisadas N de M», el estado por fila y el estado en la liquidación de cada persona. Sin migración: la columna `estado` ya existía.
- **Decisión:** marcar es por período completo, como el botón único del diseño 03; no hay selección por fila (ni en el diseño ni en el caso de uso de hoy). Cerrar el período no exige que estén todas revisadas: el diseño 02 lo muestra como dato («N de M revisadas»), no como bloqueo.
- **Pendiente:** mostrar «N de M revisadas» en el paso de cierre (diseño 02).
- **Autorrevisión (subagente, sin bloqueos), a pendientes:**
  - Revisar contra lo visto: si alguien recalcula entre que otro mira la pantalla y aprieta el botón, quedan revisados montos que nadie vio. Solución simple: que el input traiga la `calculadaEn` máxima vista y rechazar con cambio concurrente si hay filas más nuevas.
  - `idempotencyKey` desde la pantalla (el efecto ya es idempotente: la segunda llamada devuelve 0).
  - Permiso propio para revisar (`nomina:liquidaciones.revisar`) si se quiere separar quien calcula de quien revisa.
  - Prueba de concurrencia marcar/recalcular contra Postgres real (usa el mismo bloqueo ya probado).

## Publicar liquidación al portal (PR apilado sobre #983, rama `cursor/portal-liquidacion-ab10`)

- Migración `20261116210000_nomina_liquidacion_portal`: `documento_id` y `publicada_en` en `nomina.liquidaciones` (FK y trigger mismo tenant con `core.documentos`). Recalcular anula publicación.
- `nomina.liquidaciones.publicar` (dryRun, `nomina:periodos.manage`): solo liquidación **revisada**; PDF en R2 + documento con `visibleEn: ['trabajador']`; evento `nomina.liquidacion.publicada`; comunicable transaccional (correo personal + in-app). Consumidor `nomina.liquidacion.publicada`.
- Pantalla liquidación de persona: botón **Publicar al trabajador** (diseño 04) con vista previa y leyenda de correo personal. Lecturas exponen `publicadaEn` y correo para la leyenda.
## Cumplimiento DT contratos (PR apilado sobre #989, rama `cursor/cumplimiento-dt-ab10`)

- Migración `20261116220000_nomina_registros_mi_dt`: seguimiento de registro en Mi DT (comprobante y fecha) por alta, baja o anexo.
- Capacidades MCP: `nomina.midt.listar`, `nomina.midt.exportar_pendientes`, `nomina.midt.datos` y `nomina.midt.registrar` (marca con comprobante; lecturas auditadas).
- Pantalla `/remuneraciones/cumplimiento-dt/contratos` (diseño 07): segmento Por registrar / Registrados, descarga CSV, datos por fila y diálogo Marcar registrado. Navegación «Cumplimiento DT». Sin API Mi DT.

- **Pendiente:** pago banco y entitlements del complemento. Cálculo completo del finiquito (diseño 08) sigue fuera de alcance.

### Finiquitos Mi DT (PR apilado sobre #1004)

- Tipo `finiquito` en movimientos Mi DT (un pendiente por vínculo terminado, distinto de la baja).
- Pantalla `/remuneraciones/cumplimiento-dt/finiquitos` y enlace «Finiquitos Mi DT» en el menú.
- Sin migración (el tipo ya era texto libre en `registros_mi_dt`).
