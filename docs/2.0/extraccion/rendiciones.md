# Extracción 1.0 · Rendiciones de gastos

Fuente (solo lectura, `Cryptobal/opai`, commit `4b6e472`): `prisma/schema.prisma` (modelos `FinanceRendicion*`, `FinanceApproval`, `FinanceAttachment`, `FinancePayment`, `FinanceTrip`, `FinanceCostCenter`), `src/app/api/finance/{rendiciones,payments,trips,attachments,items,cost-centers,config,seed,guardias-search}/**`, `src/app/api/cron/finance-alerts`, `src/lib/{rendiciones-create,rendiciones-approvals,finance-notifications}.ts`, `src/lib/finance/{mileage,rendicion-status}.ts`, `src/lib/integrations/slack/{modals,approvals}/**`, `src/lib/ai/help-chat-tools.ts` y las pantallas `src/app/(app)/finanzas/rendiciones/**` con `src/components/finance/Rendicion*`. Reglas verificadas en el código; lo que 1.0 no hace se marca **No identificado** o **Brecha**. Sin pruebas automatizadas de rendiciones en 1.0 (solo `financial-lock.test.ts` toca el permiso).

## 1. Modelo de datos, estados y transiciones

- R-REN-01. Entidad principal `FinanceRendicion` (`finance.finance_rendiciones`): `code` (`REN-AAAA-NNNN`), `submitterId` (un `Admin`, no una persona), `type` (`PURCHASE` | `MILEAGE`), `status`, `amount` (Int, CLP), `date` (`@db.Date`), `description` (≤500), `documentType` (`BOLETA` | `FACTURA` | `SIN_RESPALDO`), `itemId` (categoría), `costCenterId`, `tripId` (único, solo kilometraje), `paymentId`, `paidAt`, `paymentMethod`, datos de rechazo (`rejectedAt`, `rejectionReason`, `rejectedById`), `submittedAt` y beneficiario opcional (`beneficiaryGuardiaId` o `beneficiaryAdminId`). Hijas: `FinanceApproval`, `FinanceAttachment`, `FinanceRendicionHistory`. Es **un documento por gasto**: no hay cabecera con varias líneas de gasto (`schema.prisma`, `FinanceRendicion`).
- R-REN-02. Estados del modelo: `DRAFT | SUBMITTED | IN_APPROVAL | APPROVED | REJECTED | PAID`. **`IN_APPROVAL` nunca se escribe**: ningún código lo asigna; solo lo leen filtros y alertas como sinónimo de «Enviada» (`rendicion-status.ts`, `revert/route.ts`, `finance-alerts`).
- R-REN-03. Transiciones normales y quién las hace (todas en `src/app/api/finance/rendiciones/**` y `payments/route.ts`):

| Transición | Quién / capacidad | Regla |
|---|---|---|
| (nueva) → `DRAFT` | `finance.rendiciones` edit | `createRendicion` (`rendiciones-create.ts`), historial `CREATED`. |
| `DRAFT` → `SUBMITTED` | Solo el **solicitante** (`submitterId`) con edit | Exige aprobadores configurados; crea una fila `FinanceApproval` por aprobador; historial `SUBMITTED`. |
| `DRAFT` → `APPROVED` | Automática al enviar | Solo si no hay aprobadores **y** `autoApproveWhenNoApprovers = true`; si no, 409 `NO_APPROVERS_CONFIGURED`. |
| `SUBMITTED` → `APPROVED` | `rendicion_approve` | `approveRendicion`: `updateMany` con guard `status = SUBMITTED` (anti-carrera); marca **todas** las aprobaciones pendientes como `APPROVED`. |
| `SUBMITTED` → `REJECTED` | `rendicion_approve` | Motivo obligatorio (1–500); guarda `rejectedAt/Reason/ById`. |
| `REJECTED` → `DRAFT` | Solo el solicitante, al **editar** (PATCH) | Limpia los datos de rechazo. |
| `APPROVED` → `PAID` | `rendicion_pay` | Al crear un pago (sección 5); solo rendiciones `APPROVED`. |
| `PAID/APPROVED/SUBMITTED/IN_APPROVAL/REJECTED` → hacia atrás | `rendicion_configure` | Reversión administrativa `revert`: `PAID→{APPROVED,SUBMITTED,DRAFT}`, `APPROVED→{SUBMITTED,DRAFT}`, `SUBMITTED→DRAFT`, `REJECTED→DRAFT`; motivo ≥10 caracteres; historial `REVERTED`. |

- R-REN-04. Edición: solo el solicitante y solo en `DRAFT` o `REJECTED` (PATCH `[id]`, historial `EDITED`). Eliminación: solo el solicitante, solo `DRAFT`, con `canDelete finance.rendiciones`; borra en cascada historial, aprobaciones y adjuntos de BD (`[id]/route.ts` DELETE). Los archivos en R2 **no** se borran en ese flujo (**Brecha**).
- R-REN-05. Historial `FinanceRendicionHistory`: `action` (`CREATED | SUBMITTED | APPROVED | REJECTED | PAID | EDITED | REVERTED`; `RESUBMITTED` figura en el comentario del modelo pero **nunca se escribe**), `fromStatus`, `toStatus`, `userId`, `userName` (el email), `comment`, `metadata` JSON. Sin `tenant_id` propio (aislamiento solo por la rendición padre) y sin `updatedAt`.
- R-REN-06. Auditoría global `logAudit` solo en aprobar y rechazar (`rendiciones-approvals.ts`); crear, enviar, pagar y revertir dejan únicamente el historial propio (y `logAudit` en la creación por Slack).

## 2. Tipos de rendición y kilometraje

- R-REN-10. Tipos: `PURCHASE` (compra: el usuario ingresa monto, fecha, tipo de documento, ítem, centro de costo, adjuntos) y `MILEAGE` (kilometraje: el monto se **calcula**, el usuario no lo escribe).
- R-REN-11. Kilometraje por **combustible, no por tarifa por km**: `litros = km / kmPerLiter`; `combustible = round(litros × fuelPricePerLiter)`; `desgaste = round(combustible × vehicleFeePct / 100)`; `subtotal = combustible + desgaste`; `total = subtotal + peaje`. Defaults del tenant: 10 km/l, \$1.500 por litro, 10 % (`mileage.ts` `mileageBreakdown`; `FinanceRendicionConfig`). **No existe tarifa por km ni tope de km** en 1.0.
- R-REN-12. Misma fórmula para vista previa (`trips/estimate`) y cierre (`trips/[id]/end`), para que lo mostrado sea lo guardado. El viaje guarda una **instantánea** de los parámetros al iniciar (`snapshotKmPerLiter`, `snapshotFuelPrice`, `snapshotFeePct`): cambiar la configuración después no recalcula viajes en curso (`trips/start`).
- R-REN-13. Distancia: Google Routes API (`TRAFFIC_UNAWARE`, `regionCode CL`) → respaldo Directions API legacy → respaldo línea recta (haversine). Nunca devuelve 0 silencioso; el origen (`google` | `haversine`) se informa en la vista previa pero **no se guarda** en el viaje (`mileage.ts` `roadDistanceKm`). Con haversine el monto queda subestimado respecto de la ruta real (**Brecha**).
- R-REN-14. Flujo del viaje: `start` (GPS inicial; un solo viaje `IN_PROGRESS` por usuario) y `end` (GPS final, peaje entero ≥0, hasta 5.000 puntos de ruta). `end` crea automáticamente una rendición `MILEAGE` en `DRAFT` con `amount = total`, descripción «Viaje: origen → destino (N km)» e historial `CREATED`. Desde el formulario web ambos pasos se llaman seguidos (`RendicionForm.tsx` `handleSubmit`), de modo que el «viaje» se reduce a origen y destino capturados.
- R-REN-15. El `amount` de una rendición `MILEAGE` es editable por PATCH mientras esté en `DRAFT/REJECTED` y **no se revalida** contra el viaje (**Brecha**: un solicitante podría cambiar el monto calculado).
- R-REN-16. Los viajes en `IN_PROGRESS` abandonados no tienen cierre ni cron de limpieza (**No identificado**); bloquean al usuario con «Ya tienes un viaje en progreso».

## 3. Ítems, boletas, adjuntos y extracción por IA

- R-REN-20. Catálogo de ítems/categorías por tenant `FinanceRendicionItem`: `name` (único por tenant), `code`, `category`, `active`, `maxPerDay`, `maxPerMonth`, `accountCode`. Crear solo con `rendicion_configure`; hay un `seed` de ítems por defecto (`finance/seed`).
- R-REN-21. **Los topes por ítem (`maxPerDay`, `maxPerMonth`), los globales (`maxDailyAmount`, `maxMonthlyAmount`) y `accountCode` se guardan y se muestran en la configuración, pero ningún servidor ni pantalla los aplica** (búsqueda en todo `src/`: solo `ConfigClient.tsx` y las rutas de configuración). Son campos muertos en 1.0.
- R-REN-22. Tipo de documento: Zod acepta `BOLETA | FACTURA | SIN_RESPALDO`. Reglas del formulario (no del servidor): en compra, monto > 0 y tipo de documento obligatorios; `SIN_RESPALDO` exige observación y no exige imagen; si no hay adjunto y no es `SIN_RESPALDO`, la observación es obligatoria (motivo); `requireImage` (default `true` en el modelo, `false` al sembrar) exige ≥1 imagen salvo kilometraje o `SIN_RESPALDO`; `requireObservations` exige descripción (`RendicionForm.tsx` `validate`). `requireTollImage` está en el modelo y la configuración, pero el formulario **no lo usa**.
- R-REN-23. Adjuntos `FinanceAttachment` (a rendición o a viaje): tipos `RECEIPT | INVOICE | TOLL | OTHER`; JPG, PNG, WebP, GIF o PDF; máx. 10 MB por archivo; subida a R2 (`uploadFile`, carpeta `finance`, prefijo del tenant) y descarga por URL firmada. El formulario marca `INVOICE` si el documento es `FACTURA`, si no `RECEIPT` (`attachments/upload`).
- R-REN-24. Lo que el servidor **no** valida en adjuntos: que la rendición esté en `DRAFT/REJECTED`, que quien sube sea el solicitante, ni que exista al menos uno cuando `requireImage` es verdadero (`attachments/upload`, `[id]/submit`). Quien tenga `canDelete finance.rendiciones` puede borrar adjuntos de **cualquier** rendición del tenant y en cualquier estado, incluso `PAID` (`attachments/[id]`). **Brecha** de integridad.
- R-REN-25. **Extracción por IA de la boleta: No identificado.** No hay OCR ni lectura por visión del comprobante en rendiciones (búsqueda de OpenAI/OCR/extract en `RendicionForm`, `attachments` y `lib/rendiciones-*`: sin resultados). La IA de 1.0 solo **consulta** rendiciones pendientes (herramienta `get_pending_rendiciones`, `help-chat-tools.ts`).
- R-REN-26. **Portal del guardia/trabajador con foto de boleta: No identificado.** No hay ruta de `portal/**` ni de `api/portal/**` que cree rendiciones. Los canales de captura son el ERP web y **Slack** (modal `/opai rendicion`: monto, fecha, categoría, descripción y hasta 3 archivos `jpg/jpeg/png/pdf`, siempre `PURCHASE` en `DRAFT`, gate `canEdit finance.rendiciones`; `slack/modals/rendicion.ts`). La ficha del guardia solo muestra su pestaña de rendiciones si la persona está enlazada a un `Admin` (por `persona.adminId` o por email; `personas/guardias/[id]/page.tsx`).
- R-REN-27. No se guardan datos del documento tributario: ni folio, ni RUT/razón social del proveedor, ni neto/IVA/exento, ni fecha del documento distinta de la fecha del gasto. Por eso **no hay detección de boleta duplicada** (ni por folio ni por hash de archivo) ni vínculo con el libro de compras o el RCV (**Brecha**).

## 4. Flujo de aprobación

- R-REN-30. Los aprobadores son **dos ranuras fijas por tenant** (`defaultApprover1Id`, `defaultApprover2Id`, ambos `Admin`) en `FinanceRendicionConfig`. Al enviar se crean sus filas `FinanceApproval` con `approvalOrder` 1 y 2 (`submit/route.ts`).
- R-REN-31. **No hay niveles reales ni límites por monto.** No existe aprobador por monto, por centro de costo ni por jefe directo. Los dos aprobadores son **alternativos, no secuenciales**: la primera decisión de cualquiera de los dos con `rendicion_approve` aprueba o rechaza la rendición completa y marca todas las filas pendientes (`approveRendicion`, `updateMany` sin filtro por aprobador). `approvalOrder` solo ordena la pantalla.
- R-REN-32. **No se verifica que quien decide sea un aprobador asignado**: basta la capacidad `rendicion_approve` (rutas `approve`, `reject`, `bulk-approve`, `bulk-reject`; el filtro «Mis aprobaciones» solo cambia la lista). Tampoco se impide que el solicitante apruebe su propia rendición (**Brecha**: no existe separación de funciones).
- R-REN-33. Rechazo: motivo obligatorio; solo `SUBMITTED`; en el rechazo individual solo se marca la fila de quien rechaza (las demás quedan `decision = null`). Aprobación y rechazo masivos (`bulk-*`) existen y operan solo sobre `SUBMITTED`; el masivo **no** usa el guard anti-carrera del individual y rechaza en bloque con un solo motivo.
- R-REN-34. **No existe «observación» o «devolver para corregir» distinto del rechazo**: el rechazo devuelve el documento al solicitante (editable) y no deja de ser un estado terminal hasta que el solicitante edita.
- R-REN-35. Defecto latente (inferido del código): al editar un `REJECTED` las filas de aprobación **no se borran** (solo lo hace la reversión a `DRAFT`) y `submit` hace `createMany` sobre el índice único `(rendicionId, approverId)`; un reenvío tras rechazo chocaría con las filas previas y fallaría con 500. Se corrige con una ronda de aprobación propia (ver sección 13).
- R-REN-36. Alertas de antigüedad: `pendingAlertDays` (5) y `approvalAlertDays` (3) alimentan el cron diario `finance-alerts` (08:00 UTC), que **solo escribe en el log del servidor**: no notifica a nadie (**Brecha**).
- R-REN-37. Canales de decisión: pantalla web, Slack (bandeja de aprobaciones, tarjeta y modal de motivo; reutilizan `approveRendicion`/`rejectRendicion`, los mismos que el API). Cambiar de estado desde el chat de IA o MCP: **No identificado** (solo consulta).

## 5. Pago

- R-REN-40. Un **pago** `FinancePayment` (`PAG-AAAA-NNNN`) agrupa N rendiciones `APPROVED`: `type` (`MANUAL` | `BATCH_SANTANDER`), `totalAmount` (suma), `rendicionCount`, `paidById`, `paidAt`, `notes`, comprobante opcional (`receiptFileName/receiptUrl`, ≤10 MB, JPG/PNG/WebP/PDF) y cancelación administrativa (`cancelled*`). Requiere `rendicion_pay`; todas las rendiciones pedidas deben estar `APPROVED` o falla con la lista de las que no (`payments/route.ts`).
- R-REN-41. **Crear el pago marca las rendiciones como `PAID` en el acto**, antes de que exista confirmación bancaria: no hay estado «en pago/emitido» ni conciliación posterior (el pago `BATCH_SANTANDER` no verifica que la transferencia se haya ejecutado). La rendición guarda `paymentId`, `paidAt` y `paymentMethod`.
- R-REN-42. No existe pago parcial de una rendición ni anticipo/fondo por rendir. Una rendición se paga completa o no se paga.
- R-REN-43. **Archivo de nómina bancaria: solo Santander**, XLSX con 13 columnas (cuenta origen, moneda origen, cuenta destino, moneda destino, código banco destino, RUT, nombre, monto, glosa = código del pago, correo, mensaje, glosas de cartola). Exige `rendicion_pay` **y** `banking_view`. Una fila por beneficiario (suma sus rendiciones) en CLP entero (`export-santander/route.ts`).
- R-REN-44. Beneficiario efectivo del pago, por prioridad: `beneficiaryGuardiaId` > `beneficiaryAdminId` > `submitterId`. Datos bancarios desde la **ficha del guardia** (`bankAccounts`, primero la `isDefault`): RUT de la persona, cuenta y banco → código SBIF (`CHILE_BANKS`, por código o por nombre normalizado). Para un `Admin` sin guardia se busca la persona por email (`email` o `personalEmail`) y, si falla, por nombre (todos los tokens, coincidencia única). Los datos bancarios **no se copian** a la rendición: se leen al exportar (**No hay snapshot**).
- R-REN-45. Validación al exportar: cada beneficiario necesita RUT, cuenta destino y código SBIF; también la cuenta origen (`santanderAccountNumber` del tenant). Si falta algo responde 422 con la lista por beneficiario y sin generar archivo. El archivo se puede regenerar las veces que se pida (sin versión ni bloqueo).
- R-REN-46. Historial de pagos: lista `payments` por tenant (permiso `finance.pagos` view); detalle con rendiciones; subir y borrar comprobante. Sin cierre contable ni asiento asociado.
- R-REN-47. Reversión de un `PAID`: desvincula la rendición; si era la única, el pago queda `cancelled` (con motivo y quién); si quedan otras, recalcula `totalAmount` y `rendicionCount` (`revert/route.ts`). Ya no hay archivo del banco que anular: si el XLSX se subió al banco, la reversión no lo detiene.
- R-REN-48. Un mismo `Admin` puede ser quien envía, aprueba y paga (los permisos son independientes); no hay regla de separación (**Brecha**, ver R-REN-32).

## 6. Centros de costo e imputación

- R-REN-50. `FinanceCostCenter` por tenant: `name`, `code` (único por tenant si se informa), `active`, `installationId` y `accountId` opcionales. Se pueden crear manuales (`rendicion_configure`) o **sincronizar desde instalaciones** (`cost-centers/sync-installations`): crea uno por instalación activa del CRM, lo reactiva si vuelve a estar activa y lo desactiva si deja de estarlo.
- R-REN-51. La rendición apunta a **un solo** centro de costo opcional (`costCenterId`) y a una sola categoría (`itemId`). No hay prorrateo entre centros en rendiciones (el prorrateo `FinanceBankLinkAllocation` existe solo para movimientos bancarios) ni obligatoriedad del centro.
- R-REN-52. El servidor **no valida que `itemId`, `costCenterId`, `beneficiaryGuardiaId` o `beneficiaryAdminId` pertenezcan al tenant** al crear o editar (`rendiciones-create.ts`, PATCH `[id]`): solo la FK. Riesgo de referencia cruzada entre tenants (**Brecha de seguridad** a no replicar).
- R-REN-53. Gasto por instalación y por cuenta (`by-installation`): totales `total`, `pagado` (PAID) y `pendiente` (SUBMITTED/IN_APPROVAL/APPROVED), desglose y las últimas 50. **Defecto**: filtra `costCenterId IN (ids de instalación)` pero `costCenterId` guarda el id del *centro de costo*, no el de la instalación; salvo coincidencia de ids, devuelve vacío (**error de 1.0**: no replicar).
- R-REN-54. `accountCode` del ítem existe pero no genera asiento (sección 11).

## 7. Reporte, filtros y listados

- R-REN-60. Lista principal (`finanzas/rendiciones`, `take: 200`, filtrado en el cliente): chips `Todas`, `Mis aprobaciones` (si aprueba), `En aprobación`, `Por pagar` (si paga), `Pagadas`, `Rechazadas`, `Borradores`; búsqueda por texto; filtro por solicitante y rango de fechas. Alcance: con `rendicion_view_all` ve todas las del tenant; sin ella, solo las propias (lista, detalle y API). Se aplica en la consulta, no solo en la UI.
- R-REN-61. API de lista: filtros `status`, `type`, `submitterId` (solo con `view_all`), `dateFrom/dateTo` (fecha del gasto), `search` en `code` y `description`. Sin paginación.
- R-REN-62. Reporte (`reporte/page.tsx`): total por estado, por tipo y por mes de los últimos 12 meses (suma de `amount`, conteo). Usa `$queryRaw`. El reporte **ignora** el alcance del usuario: cualquiera con `finance.rendiciones` view ve los totales del tenant completo.
- R-REN-63. Exportación CSV/XLSX: el botón del reporte (`rendicion_export`) llama a `/api/finance/reportes/export`, ruta que **no existe** en el repositorio (existen `reports/*`, sin `rendiciones`). Exportación de rendiciones: **No identificado**.
- R-REN-64. Vistas derivadas: pestaña de rendiciones por persona (`PersonaRendicionesTab`), tarjeta en finanzas, KPI en el hub y bandeja «Mis rendiciones» de Slack (chips Enviadas/Borradores/Aprobadas/Rechazadas; elimina borradores propios y «retira» una enviada solo con `rendicion_configure`).

## 8. Configuración por tenant

- R-REN-70. `FinanceRendicionConfig` (una fila por tenant, se autocrea con defaults al primer GET): parámetros de kilometraje (`kmPerLiter` 10, `fuelPricePerLiter` 1.500, `vehicleFeePct` 10), obligatoriedades (`requireImage`, `requireObservations`, `requireTollImage`), `autoApproveWhenNoApprovers` (false), dos aprobadores, topes diarios y mensuales (no aplicados, R-REN-21), días de alerta, `santanderAccountNumber`. Se escribe con `PUT /api/finance/config` (`rendicion_configure`); ver con `finance.configuracion` view.
- R-REN-71. Catálogos por tenant: ítems y centros de costo (secciones 3 y 6). Numeración `REN-AAAA-NNNN` y `PAG-AAAA-NNNN` correlativa por tenant y año calendario (hora del servidor, `new Date().getFullYear()`).
- R-REN-72. Defecto de numeración: `code` es **único global** (`@unique`), no por tenant, y el siguiente número se calcula leyendo el último código del tenant sin bloqueo. Dos tenants distintos generarían `REN-2026-0001` y el segundo falla; dos envíos simultáneos del mismo tenant también chocan (**error de 1.0**; ver `rendiciones-create.ts`, `payments/route.ts`).

## 9. Permisos y roles

- R-REN-80. Submódulos (`finance.rendiciones`, `finance.aprobaciones`, `finance.pagos`, `finance.configuracion`) con niveles `none/view/edit/full`, y capacidades: `rendicion_submit`, `rendicion_approve`, `rendicion_pay`, `rendicion_configure`, `rendicion_view_all`, `rendicion_export`, más `banking_view` para exportar al banco (`permissions.ts`).
- R-REN-81. Por defecto: owner/admin tienen todas; `editor`, `jefe_operaciones`, `operaciones` y `supervisor` conservan `finance.rendiciones` en edición con `rendicion_submit`; `editor`, `jefe_operaciones` y `operaciones` además `rendicion_approve`; `jefe_operaciones` también `view_all`; `rrhh` tiene `view_all`. Pagos y configuración quedan en `none` salvo owner/admin. «Rendiciones» sobrevive al bloqueo de cifras financieras para no-admin (`financial-access.ts`, `financial-lock.test.ts`).
- R-REN-82. Los permisos de **acción** no distinguen el **alcance de filas** más allá de `view_all`: no hay alcance por instalación ni por subordinados para aprobar. La capacidad `rendicion_submit` no se comprueba en el servidor (las rutas usan `canEdit finance.rendiciones`).
- R-REN-83. `revert` y toda la configuración usan `rendicion_configure`; esa misma capacidad **también** protege la contabilidad (`journal/[id]/post`, `periods/[id]/close`) y el seed: una sola capacidad mezcla configuración de rendiciones con contabilidad (**No replicar**).

## 10. Notificaciones

- R-REN-90. Al enviar: correo a cada aprobador activo (plantilla en texto plano, `notifyRendicionSubmitted`) y notificación `rendicion_submitted` (campana, push y tarjeta de Slack accionable). Al aprobar/rechazar: correo y notificación `rendicion_approved/rejected` al solicitante (el rechazo con campana y énfasis por defecto). Al pagar: correo `notifyRendicionPaid` con el código del pago. Al revertir: notificación `expense_report_reverted` con el motivo (`finance-notifications.ts`, `notifications/catalog.ts`).
- R-REN-91. Los correos son fire-and-forget (`sendTenantEmail`, se omiten si falta `RESEND_API_KEY`); el fallo no revierte la operación. El pago masivo no notifica por Slack/campana, solo correo. Las notificaciones solo llegan a `Admin`, nunca a la persona que no es usuario del ERP.
- R-REN-92. Sin recordatorios al aprobador ni al solicitante por antigüedad (el cron solo registra en log, R-REN-36).

## 11. Integración con otros módulos

- R-REN-100. **Flujo de caja y contabilidad: no hay integración en el código.** Ningún servicio crea asiento, `FlowRow` ni conciliación a partir de una rendición o un pago. Lo único relacionado es el plan de cuentas con «6.1.02.012 Gastos de Rendiciones» y su asociación con la categoría `EGR_OTRO` en `cashflow/category-account-defaults.ts`, para clasificar manualmente movimientos bancarios.
- R-REN-101. Payroll: **No identificado** (no descuenta ni reembolsa en liquidación; el pago es por transferencia aparte).
- R-REN-102. Banca: el pago `BATCH_SANTANDER` no se concilia con la cartola ni se enlaza a `BankTransaction`.
- R-REN-103. CRM/Operaciones: costo por instalación vía centro de costo (con el defecto de R-REN-53). Personas: beneficiario guardia y pestaña en su ficha. Hub y Slack: KPI y acciones (sección 7). Notas polimórficas: tipo `RENDICION` en `note-utils.ts`. Eliminación de tenant incluye las tablas de rendiciones (`tenant-deletion.ts`).
- R-REN-104. Periodos contables cerrados: las rendiciones **no consultan** el estado del periodo; se pueden crear, aprobar, pagar o revertir con fecha de cualquier mes, incluso en un periodo cerrado (**Brecha**).

## 12. Casos límite e integridad

- R-REN-110. Montos CLP enteros (`Int`, Zod `int().min(0)`): se acepta `amount = 0` para `PURCHASE` en el API (solo el formulario exige > 0). Sin tope máximo. Sin moneda extranjera ni UF.
- R-REN-111. La fecha del gasto se guarda como `Date` a las 00:00 UTC del día enviado; el servidor no impide fechas futuras ni muy antiguas (sin plazo máximo de rendición).
- R-REN-112. Doble clic y concurrencia: aprobar/rechazar individual es anti-carrera (R-REN-03); enviar, pagar y revertir no lo son (leen el estado y luego escriben). Un mismo pago puede quedar con una rendición que cambió de estado entre lectura y escritura (**Brecha**).
- R-REN-113. Todas las lecturas filtran por `tenantId` de la sesión. `findFirst({ id, tenantId })` en detalle, adjuntos y pagos; las consultas de nombres de `Admin` por `id IN` no filtran tenant.
- R-REN-114. Duplicados de boleta, anticipos, devoluciones de saldo, rendición parcial de un fondo, topes por política y vencimiento de rendición: **No identificado**.
- R-REN-115. Una rendición en `APPROVED` o `PAID` no es editable por el solicitante; solo vuelve atrás por reversión administrativa con motivo y trazabilidad.

## 13. Qué NO traer de 1.0 y mejoras sugeridas

| Tema | 1.0 | 2.0 (propuesta) |
|---|---|---|
| Identidad | El solicitante es un `Admin` (usuario del ERP); el guardia sin usuario no puede rendir | La rendición es de una **persona** (trabajador) con o sin usuario; portal del trabajador para rendir con foto |
| Aprobación | 2 ranuras fijas, alternativas, sin límites ni separación de funciones | Reglas por monto, centro de costo o jefatura; el solicitante nunca aprueba lo suyo; rondas de aprobación con historial (resuelve R-REN-35) |
| Verificación de aprobador | Solo la capacidad | Solo el aprobador asignado (o delegado) decide |
| Observación | No existe (solo rechazo) | «Devolver con observaciones» sin cerrar la rendición |
| Topes | Campos muertos | Se aplican y avisan (diario, mensual, por ítem) con anulación justificada |
| Boleta | Imagen y texto libre | Folio, RUT y razón social del proveedor, neto/IVA, detección de duplicado, extracción asistida por IA (propuesta, la confirma la persona, ADR-031) |
| Kilometraje | Combustible + 10 % + peaje, instantánea, haversine silencioso | Tarifa por km configurable (a confirmar), origen de la distancia guardado, monto no editable manualmente |
| Pago | `PAID` al crear el pago, solo Santander, banco leído al exportar | Estados «en pago» y «pagado» con confirmación o conciliación; datos bancarios con snapshot; más formatos de nómina |
| Contabilidad | Sin asiento ni flujo de caja | Evento de dominio por outbox al aprobar y al pagar (ADR-029); respeto del periodo cerrado |
| Numeración | `@unique` global, sin bloqueo | Correlativo por tenant con secuencia en base de datos |
| Referencias | Sin validar tenant | Validar que ítem, centro y beneficiario son del mismo tenant (RLS + chequeo) |
| Adjuntos | Cualquier estado, cualquier usuario, R2 sin limpiar | Solo editables en borrador; vinculados por `core.documentos.*` (ADR-019) |
| Alertas | Solo log | Recordatorios por Comunicaciones (ADR-020), silencio por defecto |
| Permisos | `rendicion_configure` mezclado con contabilidad | Permisos separados `<modulo>:<accion>` (ADR-016) y alcance en la consulta (ADR-022) |
| Reporte | Ignora alcance; exportar roto | Reporte con alcance, filtros y exportación |
| Paridad | Solo lectura por IA/MCP | Toda la operación como capacidad con `dryRun` e `idempotencyKey`; aprobar y pagar con aprobación humana |
| Estado | `IN_APPROVAL` fantasma | Estados que realmente se usan |

No portar: código de formulario, rutas ni Slack; los campos muertos (`requireTollImage`, `accountCode`, `maxPer*`); `IN_APPROVAL`; el cálculo de combustible como regla fija sin confirmar con Carlos.

## Preguntas de negocio para Carlos

1. ¿Quién puede rendir en 2.0? ¿Solo usuarios del ERP, o también guardias y supervisores sin usuario, a través del portal del trabajador con foto de la boleta?
2. Kilometraje: ¿se mantiene el cálculo por consumo (km/l, precio del litro, recargo 10 %, peaje) o se prefiere una tarifa por km? ¿Quién fija los valores y se tope el monto o los km por viaje/día?
3. Aprobación: ¿qué niveles quiere (jefe directo, finanzas, gerencia)? ¿Hay límites por monto, por centro de costo o por tipo de gasto? ¿Aprueban dos personas en secuencia o basta una?
4. ¿El solicitante puede aprobar o pagar su propia rendición (hoy sí)? ¿Se prohíbe en 2.0?
5. Rechazo: ¿se quiere un estado «Observada/Devuelta» distinto del rechazo definitivo, con plazo para corregir?
6. ¿Se aplican topes diarios, mensuales y por ítem (hoy no se aplican)? ¿Son bloqueo, advertencia o requieren autorización?
7. Respaldo: ¿se acepta `SIN_RESPALDO`? ¿Con qué monto máximo y quién lo autoriza? ¿Se exige foto siempre y folio/RUT del proveedor? ¿Se quiere extracción automática y la validación humana?
8. ¿Qué plazo máximo hay para rendir un gasto desde su fecha? ¿Se admiten fechas futuras?
9. Pago: ¿se marca como pagada al generar la nómina (hoy) o al confirmar el banco/conciliar la cartola? ¿Qué otros bancos o formatos de nómina se necesitan además de Santander?
10. ¿Se necesitan anticipos o fondos por rendir (entrega de dinero y luego rendición con saldo a favor/en contra) y rendiciones parciales? Hoy no existen.
11. Contabilidad y caja: ¿cada rendición aprobada debe generar un asiento y/o aparecer en el flujo de caja? ¿Con qué cuenta (hoy «Gastos de Rendiciones» 6.1.02.012 o la del ítem)? ¿Se descuenta IVA de las facturas rendidas?
12. Periodos cerrados: ¿una rendición con fecha de un mes cerrado se rechaza, se imputa al mes abierto o requiere autorización?
13. Centros de costo: ¿obligatorios? ¿Una rendición se puede repartir entre varias instalaciones o clientes? ¿Se refacturan al cliente?
14. Reembolsos por payroll: ¿alguna vez se paga o descuenta por liquidación de sueldo en lugar de transferencia?
15. Notificaciones: ¿quién debe recibir recordatorios por rendiciones pendientes y con qué frecuencia? ¿Por qué canal (correo, WhatsApp, push)?
16. Reversión de una rendición pagada: ¿quién puede hacerlo y qué sucede con el dinero ya transferido (devolución, compensación en la siguiente)?
17. Datos bancarios: ¿el pago usa siempre la cuenta de la ficha de la persona o el solicitante la indica por rendición? ¿Se paga a terceros (hoy existe «beneficiario»)?
