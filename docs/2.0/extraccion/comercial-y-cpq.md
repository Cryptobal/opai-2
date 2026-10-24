# Extracción de OPAI 1.0 — Comercial (CRM) y CPQ

**Fuente:** `Cryptobal/opai` @ `09ab4fe` (23-oct-2026), solo lectura: `prisma/schema.prisma` (modelos `CrmLead`, `CrmIndustry`, `CrmAccount`, `CrmContact`, `CrmInstallation`, `CrmPipelineStage`, `CrmDeal`, `CrmDealContact`, `CrmDealQuote`, `CrmDealStageHistory`, `CrmTask`, `CrmTaskAssignee`, `CrmTaskActivity`, `CrmNote`, `CrmDealMeeting`, `CrmDealContactLog`, `CrmFollowUpConfig`, `CrmFollowUpLog`, `CrmHistoryLog`, `CrmCustomField`, `CrmCustomFieldValue`, `CrmAccountReviewRequest`, `CrmDealSlackRoom`, `CpqQuote`, `CpqDocumentCounter`, `CpqQuoteTrash`, `CpqProposalBundle`, `CpqProposalBundleQuote`, `CpqProposalTemplate`, `CpqFixedSection`, `CpqIncludesSuggestion`, `CpqQuoteIncludesItem`, `CpqCostCategory`, `CpqServiceGroup`, `CpqPosition`, `CpqCatalogItem`, `CpqQuoteParameters`, `CpqQuoteUniformItem`, `CpqQuoteExamItem`, `CpqQuoteCostItem`, `CpqQuoteMeal`, `CpqQuoteVehicle`, `CpqQuoteInfrastructure`, `CpqQuoteAdditionalLine`, `CpqQuoteAttachment`), `src/lib/crm/deal-propagation.ts` y `deal-propagation-helpers.ts`, `src/modules/cpq/costing/compute-quote-costs.ts`, `src/modules/cpq/costing/financial-policy.ts`, `src/lib/cpq/cpq-employer-cost-input.ts`.
**Complementa:** `extraccion/maestros.md` (cuentas, contactos, instalaciones, cargos, estructuras y documentos ya extraídos para el Brief 02).
**Propósito:** reglas y campos verificados para diseñar Comercial y CPQ en 2.0 **sin copiar 1.0**. Qué se rescata, qué se corrige y por qué. Las decisiones están en `01-decisiones.md` (ADR-040 modelo comercial, ADR-041 fichas, ADR-042 CPQ configurable). Lo no verificado se marca.

---

## 1. Mapa de modelos de 1.0

| Modelo 1.0 | Qué es | Destino en 2.0 |
|---|---|---|
| `CrmLead` | Solicitud entrante (formulario web, correo, WhatsApp) con UTM, SLA de respuesta, acuse, datos de empresa y servicio en texto, instalaciones propias (`leadId`) y conversión a cuenta/contacto/negocio | `comercial.solicitudes`: bandeja de entrada (carpeta de solicitudes) desde la que se deriva y se crea el negocio; al calificarla nace o se reutiliza una **cuenta prospecto** (ADR-040 §1) |
| `CrmIndustry` | Catálogo de rubros **sin `tenant_id`** (global) | Grupo de etiquetas "Rubro" por tenant (ADR-040) |
| `CrmAccount` | Cuenta (ver `maestros.md`); comercial: `industry`, `size`, `segment`, `source`, `ownerId` en texto libre | Núcleo (`core.cuentas`, hecho). Rubro, tamaño y segmento → etiquetas con grupo; ejecutivo → faceta Comercial |
| `CrmContact` | Contacto de una cuenta con `isPrimary`, `roleTitle` y cinco flags `recibe*` | Núcleo: `core.contactos` pasa a ser la **persona única por tenant** (correo único) y `core.contacto_cuentas` el vínculo con N cuentas, con cargo, roles y principal por cuenta (ADR-040 §5). Roles por instalación (núcleo) y por negocio (Comercial) |
| `CrmInstallation` | Instalación con `accountId` **o** `leadId`, `activatedByDealId` | Núcleo (`core.instalaciones`, hecho). Vínculo al negocio por tabla puente |
| `CrmPipelineStage` | Etapas por tenant con `order`, `color`, flags `isClosedWon`, `isClosedLost`, `isAccepted` | `comercial.pipelines` + `comercial.etapas` con `tipo` cerrado |
| `CrmDeal` | Negocio. Además de lo comercial, copia de la instalación (`installationName`, `street`, `address`, `city`, `commune`, `lat`/`lng` Float, `installationWebsite`), `totalPuestos`, `amount` manual, `activeQuotationId`, campos de licitación, `proposalLink` (PandaDoc), `driveFolderLink`, `grokAgentId` | `comercial.negocios` sin copias; instalaciones por puente; monto derivado de la cotización vigente; licitación como faceta (fase 6) |
| `CrmDealContact` | Contacto en negocio con `role` texto (`primary`, `participant`, `decision_maker`) | `comercial.negocio_contactos` con rol de catálogo cerrado |
| `CrmDealQuote` | Tabla puente negocio ↔ cotización | No se porta: un solo vínculo `cpq.cotizaciones.negocio_id` |
| `CrmDealStageHistory` | Cambios de etapa (`from`, `to`, `changedBy`, `changedAt`) | `comercial.negocio_etapas` (append-only, con duración en la etapa anterior) |
| `CrmTask` + `CrmTaskAssignee` + `CrmTaskActivity` | Tareas con siete vínculos opcionales (`dealId`, `leadId`, `accountId`, `contactId`, `emailThreadId`, `quoteId`, `installationId`; solo `dealId` con FK), multi-responsable con `assignedTo` duplicado, bitácora propia | `core.actividades` (tipo `tarea`) con vínculos polimórficos y responsables; cambios a la auditoría |
| `CrmNote` | Nota polimórfica (`account`, `contact`, `deal`, `quote`) con hilos, menciones e `interactionType` (`note`, `contact`, `call`, `meeting`, `visit`) | `core.actividades` (tipos de interacción) |
| `CrmDealMeeting` | Reunión de negocio (asistentes, acuerdos, enlace Notion, nota y tarea de próximo paso "sueltas") | `core.actividades` tipo `reunion` con acuerdos; el próximo paso es una tarea vinculada |
| `CrmDealContactLog` | "Contacto real con el cliente" (canal, lo que dijo, próximo paso) que además copia `nextStep` a `deals.proximo_paso` | `core.actividades` (interacción con canal); el último contacto se deriva |
| `CrmFollowUpConfig` + `CrmFollowUpLog` | Cadencia de seguimiento (3/7/3 días, plantillas, WhatsApp, avance automático de etapa, pausa al responder, alerta "proponer perdido") | Backlog: automatización sobre eventos + Comunicaciones (ADR-020). Se conservan las reglas (sección 3.6) |
| `CrmHistoryLog` | Historial genérico por entidad (`action`, `details` JSON) | `core.audit_events` (ya existe) |
| `CrmCustomField` + `CrmCustomFieldValue` | Campos personalizados por tipo de entidad; el valor apunta a `entityId` **sin FK** ni tipo de entidad | No en v1. Etiquetas con grupos cubren la clasificación; campos personalizados quedan en backlog (uso real no verificado) |
| `CrmAccountReviewRequest` | Pedido interno de reseña o referencia por cuenta | Backlog (o tarea con etiqueta) |
| `CrmDealSlackRoom` | Canal de Slack por negocio | No se porta (Slack no se usa, arranque §2) |
| `CpqQuote` | Cotización: 1 cotización = 1 instalación; `accountId`, `contactId`, `dealId`, `installationId` opcionales (solo instalación con FK); dos estados (`status` y `proposalStatus`); condiciones comerciales; campos de IA | `cpq.cotizaciones` versionada, colgando solo del negocio, multi-instalación |
| `CpqProposalBundle` + `CpqProposalBundleQuote` | Capa encima para agrupar N cotizaciones (una por instalación) en una propuesta, duplicando las condiciones comerciales y propagándolas a las hijas | No se porta: una cotización con secciones por instalación |
| `CpqDocumentCounter` | Correlativo atómico por tenant, tipo y año (`CPQ-YYYY-NNN`) | Se rescata la regla (contador del núcleo por serie) |
| `CpqQuoteTrash` | Papelera con snapshot 30 días | Archivado (estado) en vez de borrado; sin papelera |
| `CpqProposalTemplate`, `CpqFixedSection`, `CpqIncludesSuggestion`, `CpqQuoteIncludesItem` | Plantillas de propuesta, secciones institucionales, "incluye" sugeridos | Módulo Documentos (plantillas, ADR-019); "incluye" como ítems del modelo con visibilidad al cliente |
| `CpqServiceGroup` | Agrupador visual de puestos | Sección por instalación (no hace falta otra entidad) |
| `CpqPosition` | Puesto cotizado: tipo de puesto, días, horario, guardias × puestos, cargo, rol de turno, sueldo base, AFP, salud, costo empleador, snapshot de nómina. **Sin `tenant_id`** | `cpq.cotizacion_lineas` tipo `puesto` con especificación del puesto y vínculo opcional a `core.puestos` (ADR-036) |
| `CpqCatalogItem`, `CpqCostCategory` | Catálogo de ítems y categorías; `tenantId` **nullable** (filas globales compartidas) | `cpq.items` y `cpq.categorias` por tenant, sembrados desde la plantilla de la vertical (ADR-042) |
| `CpqQuoteParameters` | Parámetros por cotización (horas estándar 180, permanencia 4 meses, cambios de uniforme 3/año, financiero, póliza, RC, margen y modo de margen). **Sin `tenant_id`** | Variables del modelo de costeo con ámbito; valores usados guardados en la versión |
| `CpqQuoteUniformItem`, `CpqQuoteExamItem`, `CpqQuoteCostItem`, `CpqQuoteMeal`, `CpqQuoteVehicle`, `CpqQuoteInfrastructure`, `CpqQuoteAdditionalLine` | Una tabla por tipo de costo, cada una con columnas propias (vehículo: km/día, rendimiento, combustible; infraestructura: litros/hora…). **Sin `tenant_id`** | Una sola tabla de líneas; el cálculo de cada tipo lo define el ítem del modelo (ADR-042) |
| `CpqQuoteAttachment` | Adjuntos propios con `publicUrl` | `core.documentos` vinculados a la cotización (ADR-019) |

---

## 2. Problemas verificados en 1.0

| # | Problema | Evidencia | Consecuencia |
|---|---|---|---|
| P1 | El negocio no tiene FK a instalación: copia nombre y dirección como texto | `CrmDeal.installationName`, `street`, `address`, `city`, `commune`, `lat`/`lng` (Float), `installationWebsite`, `totalPuestos` | Datos divergentes entre negocio e instalación; no se puede preguntar "¿qué negocios tuvo esta instalación?" sin buscar por texto |
| P2 | Negocio ↔ cotización unidos de tres formas | `CpqQuote.dealId` (sin FK), tabla `CrmDealQuote`, `CrmDeal.activeQuotationId` | `pickWinningQuote` une las dos primeras fuentes y prioriza la tercera; una cotización puede estar en un negocio por una vía y no por otra |
| P3 | Cotización con vínculos sueltos que pueden contradecir al negocio | `CpqQuote.accountId`, `contactId`, `dealId`, `installationId` opcionales; solo `installationId` con FK | Una cotización puede apuntar a una cuenta distinta de la del negocio |
| P4 | 1 cotización = 1 instalación; la propuesta multi-instalación es una capa aparte que duplica condiciones | `CpqProposalBundle` repite `paymentTerms`, `adjustmentType`, `financialRatePct`… y "al guardar se propagan a las hijas" | Dos fuentes de verdad para las condiciones; complejidad para el caso más común de clientes grandes |
| P5 | Dos estados en la cotización | `status` (`draft`, `sent`, `approved`, `rejected`) y `proposalStatus` (`borrador`, `en_revision`, `aprobada`, `enviada`) | Estados combinados ambiguos ("approved" + "borrador") |
| P6 | Rol del contacto en el negocio en texto libre | `CrmDealContact.role` default `"participant"` | No se puede filtrar ni reportar por rol de forma confiable |
| P7 | Destinatarios de la cuenta duplicados | Cinco flags `recibe*` en el contacto **y** `CrmAccount.contactoEstadoPagoId`/`contactoCobranzaId` | Dos reglas para "a quién se manda la cobranza" |
| P8 | Sin etiquetas | `industry`, `size`, `segment`, `source` en texto; `CrmIndustry` global sin tenant; `CrmCustomFieldValue.entityId` sin FK ni tipo | Clasificación inconsistente ("Retail", "retail", "Comercio"); filtros frágiles |
| P9 | Historial repartido en nueve tablas | `CrmHistoryLog`, `CrmNote` (con `interactionType`), `CrmDealMeeting`, `CrmDealContactLog`, `CrmTask`/`CrmTaskActivity`, `CrmFollowUpLog`, `CrmDealStageHistory`, `AuditLog` | La ficha arma su línea de tiempo consultando muchas fuentes; el "último contacto" y el "próximo paso" se copian a mano (`deals.proximo_paso`) |
| P10 | Cuenta sin RUT único | `CrmAccount.rut String?` sin índice único | Cuentas duplicadas por RUT (la importación debe deduplicar) |
| P11 | Tareas con siete vínculos opcionales y responsable duplicado | `CrmTask.dealId/leadId/accountId/contactId/emailThreadId/quoteId/installationId`; `assignedTo` = `assignees[0]` | Solo `dealId` tiene FK; el resto puede quedar huérfano |
| P12 | Tablas de CPQ sin `tenant_id` | `CpqPosition`, `CpqQuoteParameters`, `CpqQuoteUniformItem`, `CpqQuoteExamItem`, `CpqQuoteCostItem`, `CpqQuoteMeal`, `CpqQuoteVehicle`, `CpqQuoteInfrastructure`, `CpqQuoteAdditionalLine` | No admiten RLS por tenant; el aislamiento depende de la cotización padre |
| P13 | Catálogos globales mezclados con los del tenant | `CpqCatalogItem.tenantId`, `CpqCostCategory.tenantId`, `CpqProposalTemplate.tenantId` nullable; la consulta usa `OR: [{ tenantId }, { tenantId: null }]` | Un cambio global mueve las cotizaciones en borrador de todos los tenants |
| P14 | Variables de negocio cableadas a seguridad | Una tabla por tipo de costo con columnas propias; `work_injury_risk: "security_industry"`; feriados en `Setting` key-value (`cpq.holidayAnnualCount` 12, `cpq.holidayCommercialBufferPct` 10) | No sirve para aseo ni facility sin migraciones; parámetros sin tipo ni versión |
| P15 | Dinero en `Decimal(12,2)` y cálculo en `number` de JS | `financial-policy.ts` y `compute-quote-costs.ts` con floats; `roundFinal` solo al final | Diferencias de redondeo; contradice la regla de enteros de 2.0 |
| P16 | Borradores se recalculan con el catálogo actual; las enviadas no guardan el modelo | `hydrateQuoteCatalogLines` solo si `status === "draft"`; no hay versión de modelo | Un borrador abierto semanas después cambia de precio sin aviso; una enviada no se puede reproducir si cambió la lógica |
| P17 | El motor lee la base directamente | `computeCpqQuoteCosts(quoteId)` hace las consultas Prisma dentro del cálculo | No se puede probar ni ejecutar en el navegador; contradice "dominio puro" |
| P18 | Licitación, Slack y agente mezclados en el negocio | `isLicitacion`, `mercadoPublicoCode`, `fechaEntrega`, `grokAgentId` en `CrmDeal`; `CrmDealSlackRoom` | El negocio carga facetas de otros módulos |

---

## 3. Reglas de negocio que se rescatan

### 3.1 Embudo

- Etapas configurables por tenant, ordenadas, con color; **una etapa ganada y una perdida** (`isClosedWon`, `isClosedLost`). `isAccepted` marca la etapa en que el cliente aceptó la propuesta: al mover un negocio a esa etapa la UI exige la fecha de inicio del servicio (`useDealStageMove.ts`, `CrmDealDetailClient.tsx`). En 2.0 es un requisito de entrada de etapa (`exige: inicio_servicio`), no un tipo aparte.
- Motivo de pérdida con **categoría cerrada** (`precio`, `cobertura`, `plazo`, `sin_respuesta`, `otro`) y detalle obligatorio cuando es `otro`. Las pérdidas históricas sin categoría no se reescriben.
- `negotiationIncomplete`: los automatismos que mueven un negocio a Negociación sin monto real o fecha vigente lo marcan; se limpia al completar. En 2.0 es una **validación de transición** (la etapa declara qué exige) en vez de una bandera.
- Probabilidad (0–100) y fecha de cierre esperada por negocio.

### 3.2 Propagación al cerrar (`deal-propagation.ts`)

- **Ganado:** la cotización ganadora pasa a `approved`; las hermanas abiertas (`draft`, `sent`) a `rejected`; la instalación pasa a activa si estaba en prospecto o inactiva y se registra `activatedByDealId`.
- **Perdido:** se rechazan las cotizaciones abiertas. **Nunca** se desactiva la instalación automáticamente: se devuelve una candidata que la UI confirma. Es candidata solo si cumple las tres: (1) este negocio la activó, (2) no tiene operación real (pautas, asistencias, marcaciones), (3) ningún otro negocio ganado tiene una cotización aprobada que apunte a ella.

En 2.0 se conservan como consumidores de los eventos `comercial.negocio.ganado` / `perdido` (ADR-040 §3), con dos cambios declarados: (a) al perder, la acción propuesta es archivar la instalación prospecto y la condición (3) considera también negocios **abiertos** que la usan; (b) al ganar, se activan las instalaciones vinculadas en prospecto o inactivas, cualquiera sea su tipo.

### 3.3 Contactos y destinatarios

- Uno principal por cuenta (`isPrimary`; en 1.0 no está garantizado en base).
- Destinatarios por tipo de comunicación: facturación, notas de crédito, cobranza, operacional y **cesión** (Ley 19.983, falla segura: sin marcado no se notifica a nadie). En 2.0 son `roles` del vínculo contacto–cuenta (`core.contacto_cuentas`, ADR-040 §5), así la misma persona tiene roles distintos en cada cuenta; `recibeNotasCredito` se funde en `facturacion`. En 1.0 un contacto pertenece a una sola cuenta (`CrmContact.accountId` obligatorio): la misma persona aparece duplicada por cuenta.

### 3.4 Solicitudes entrantes (`CrmLead`)

- Captura de UTM (`source`, `medium`, `campaign`, `term`, `content`), página de aterrizaje y referrer; canal (`web_cotizador`, `whatsapp`, `email`…); texto original de origen.
- SLA de primera respuesta (`firstViewedAt`, `firstContactAt`, `escalatedAt`, alerta idempotente) y acuse automático al solicitante (desactivado por defecto).
- Estados `pending` → `approved` | `rejected`; al aprobar se convierte en cuenta, contacto y negocio (`converted*Id`).

### 3.5 Tareas y actividad

- Tareas con prioridad (`high`, `medium`, `low`), vencimiento con opción "todo el día", varios responsables, completado idempotente (conserva el primero), solo el creador u owner/admin la elimina.
- Interacciones tipificadas con fecha real distinta de la de registro (`occurredAt` vs `createdAt`).
- Reunión con asistentes, acuerdos y próximo paso.
- "Último contacto real" del negocio = la interacción más reciente, distinta de `updated_at`.

### 3.6 Cadencia de seguimiento (para el backlog)

Primer seguimiento a los 3 días, segundo a los 7, tercero 3 días después; avance automático de etapa opcional; pausa si el cliente responde; envío a una hora local (9:00); correo automático apagado por defecto (lo envía una persona); alerta "proponer perdido" el día hábil 15. En 2.0 se construye como automatización sobre eventos y plantillas de Comunicaciones, no como tablas de Comercial.

### 3.7 Cotización

- Correlativo atómico por tenant y año: `CPQ-YYYY-NNN`.
- Moneda de presentación UF o CLP; validez (`validUntil`).
- Condiciones comerciales: forma de pago (`contrafactura`), días de pago y modo (`SPECIFIC_DAY`), inicio del servicio (días desde aceptación, 5), duración (12 meses), servicio continuo vs plazo definido, reajuste (`NONE`, `IPC`, `IMO`, `POLYNOMIAL` con pesos y frecuencia trimestral, semestral o anual), incremento real anual, póliza de seguro en UF, meses de responsabilidad.
- Visibilidad en el Portal Cliente (`visibleInClientPortal`: nulo = visible si no es borrador).
- Cada línea de costo tiene **visibilidad al cliente** (`visible`/oculta) y puede habilitarse o no sin borrarse.

### 3.8 Cálculo de costos (`compute-quote-costs.ts`)

- **Mano de obra:** costo empleador por puesto desde el motor de nómina (`buildCpqStyleEmployerCostInput`): contrato indefinido, AFP (por defecto "modelo"), salud (Fonasa 7 % o isapre con plan), mutual de seguridad (`security_industry`), provisión de vacaciones 8,33 % e indemnización 4,166 %. Costo mensual del puesto × `numGuards` × `numPuestos`.
- **Feriados:** `(costo mensual de puestos / 30) × 0,5 × (feriados al año / 12) × (1 + colchón comercial)`, con 12 feriados y colchón de 10 %.
- **Uniformes:** precio unitario × cambios por año / 12 × total de personas (lógica "rotativa"), o prorrateado mensual.
- **Exámenes:** frecuencia = max(12 / permanencia promedio en meses, cambios de uniforme por año); variante nueva con personas a examinar y meses de amortización.
- **Ítems de costo:** modo `per_month` o `per_guard`, cantidad, precio con sobrescritura, amortizables (inversión / meses, por defecto la duración del contrato).
- **Vehículos:** arriendo + (km/día × días/mes / km por litro × precio combustible) + mantención, × cantidad.
- **Infraestructura:** arriendo + combustible opcional (litros/hora × horas/día × días/mes × precio).
- **Colación:** comidas por día × días de servicio × precio.
- **Líneas adicionales** con margen propio (`base / (1 − margen)`) y recurrencia `mensual` o `unico` (el pago único se factura una vez y va en subtotal aparte).

### 3.9 Margen y costo financiero — se conserva el cálculo

Modos de margen sobre la base de costos `C` (`compute-quote-costs.ts`, `marginMode`):

| Modo | Base con margen `B` |
|---|---|
| `margin_on_sale` (por defecto, 13 %) | `C / (1 − m)` |
| `markup` | `C × (1 + m)` |
| `margin_on_labor` | `MO / (1 − m) + (C − MO)` |

Verificado en `compute-quote-costs.ts` (líneas 653–678): `MO` = costo mensual de puestos + ajuste de feriados; `C` = base de costos sin líneas adicionales; si `m ≥ 100 %` no se aplica margen. Las **líneas adicionales** no pasan por el modo de margen: llevan su propio margen (`base / (1 − margen_línea)`) en todos los modos y se suman después, antes de los instrumentos financieros.

Instrumentos sobre la venta `S` (`financial-policy.ts`, modo `auto`, gross-up cerrado):

- `f` = tasa de costo financiero mensual (por defecto 2,5 %, si está habilitado).
- Póliza de garantía en modo porcentaje: `pG` = % garantizado del contrato (10 %), `rG` = tasa anual (2 %), `eG` = gasto administrativo (0,2 %), `Mg` = meses del contrato (12). `kG = pG × (Mg × rG / 12 + eG)`.
- `k = f + kG`. Si `0 ≤ k < 0,35`: `S = (B + RC + Gfijo + únicos) / (1 − k)`; si `k ≥ 0,35`: `S = (…) × (1 + k)` con advertencia (subvalorado).
- Responsabilidad civil (independiente de `S`): prima anual en UF × UF × % asignado / 12, o tasa sobre el monto asegurado.
- Póliza en monto fijo UF: `Gfijo = garantía × rG / 12 + garantía × eG / Mg`.
- Pagos únicos en la base de la póliza solo si `policyIncludeOneTime` (por defecto no, para no mover cotizaciones antiguas).
- **Margen efectivo** = `(S − costos − adicionales − instrumentos) / S`.
- Modo `manual`: sin gross-up, equivalencia con el motor histórico sobre un precio base dado.
- Si falta el valor UF y se necesita, advertencia `falta valor UF` y el instrumento queda en cero.

Los tests de 1.0 (`costing/__tests__/financial-policy.test.ts`, `cost-lines.test.ts`) se usan como **casos dorados** del dominio de 2.0: mismas entradas, resultado igual al peso. 1.0 **no tiene tests de los modos de margen** (`markup`, `margin_on_sale`, `margin_on_labor`) ni de la rama `k ≥ 0,35`: esos casos dorados se construyen en el brief de CPQ desde las fórmulas de esta sección y se validan contra cotizaciones reales de Gard recalculadas en 1.0 (pendiente de validación).

Casos dorados mínimos, obtenidos ejecutando `computeFinancialAndPolicy` de 1.0 (`09ab4fe`) con base con margen `B` = $10.000.000, modo `auto`, sin RC ni líneas adicionales:

| Caso | Entradas | Resultado de 1.0 |
|---|---|---|
| CD-1 · gross-up cerrado | `f` = 2,5 %; póliza % con `pG` = 10 %, `rG` = 2 %, `eG` = 0,2 %, `Mg` = 12 | `k` = 0,0272; gross-up aplicado; `S` = **$10.279.605**; sin advertencias |
| CD-2 · rama `k ≥ 0,35` | `f` = 35 %; póliza apagada | `k` = 0,35; gross-up no aplicado; `S` = $10.000.000 × 1,35 = **$13.500.000**; advertencia "Las tasas suman 35.0% del precio… el resultado queda subvalorado" |

---

## 4. Qué se corrige y por qué

| Problema | Corrección en 2.0 | Por qué |
|---|---|---|
| P1 | `comercial.negocio_instalaciones` (1..N por negocio, N negocios por instalación en el tiempo) con tipo (`nueva`, `ampliacion`, `renovacion`, `reemplazo`); la instalación prospecto se crea desde el negocio | La instalación es una sola entidad del núcleo (arranque §3.5); el negocio la referencia, no la copia |
| P2, P3 | `cpq.cotizaciones.negocio_id` obligatorio con FK; la cuenta se obtiene del negocio; `vigente` como marca única por negocio | Un solo camino, garantizado por la base |
| P4 | Una cotización con líneas por instalación y subtotales por sección | El caso multi-instalación es el normal en clientes grandes |
| P5 | Un solo estado (`borrador` → `en_aprobacion` → `lista` → `enviada` → `aceptada`/`rechazada`/`vencida`/`reemplazada`) | Máquina de estados declarada (arranque §3.8) |
| P6 | Rol de catálogo cerrado en el negocio (`decisor`, `tecnico`, `compras`, `usuario`) | Reportes y agentes confiables |
| P7 | Solo `roles[]` del vínculo contacto–cuenta; sin punteros desde la cuenta | Una regla, por cuenta |
| P8 | `core.etiquetas` por tenant con grupos (exclusivos o no) y vínculo polimórfico | Clasificación consistente, filtros y MCP |
| P9 | Interacciones y tareas en `core.actividades`; cambios en `core.audit_events`; etapas en `comercial.negocio_etapas`; la pestaña Actividad las une | Una línea de tiempo; "último contacto" y "próximo paso" derivados |
| P10 | `core.cuentas.rut` único por tenant (ya en 2.0) + deduplicación en la importación | — |
| P11 | Vínculos polimórficos (`core.actividad_vinculos`) validados por trigger (tipo registrado, existencia y mismo tenant) y limpiados al archivar o fusionar; responsables sin duplicado | Los vínculos polimórficos no tienen FK: la integridad depende del trigger y de la limpieza, igual que en `documento_vinculos` |
| P12 | Toda tabla con `tenant_id` y RLS | Regla de 2.0 (CLAUDE.md) |
| P13 | Plantillas por vertical **copiadas** al tenant al activar CPQ; nada global en tiempo de cálculo | Cambios de plataforma no mueven cotizaciones de tenants |
| P14 | Modelo de costeo declarativo por tenant: ítems, variables y fórmulas (ADR-042) | Multi-vertical sin migraciones |
| P15 | CLP en enteros y porcentajes escalados en `packages/domain` | Regla de 2.0 |
| P16 | La cotización guarda la versión del modelo y los valores usados; recalcular con el modelo nuevo es una acción explícita que crea versión | Reproducible años después (ADR-021) |
| P17 | Cálculo puro en `packages/domain` que corre en servidor (autoridad) y en el navegador (vista previa instantánea) | Pruebas y UX en vivo |
| P18 | Licitación como faceta del módulo Licitaciones (fase 6); sin Slack; el agente responsable es un dato, no un permiso | Módulos independientes (ADR-003) |

---

## 5. Modelo propuesto para 2.0 (resumen; detalle y decisiones en ADR-040 y ADR-042)

Convenciones: toda tabla con `tenant_id`, RLS `tenant_isolation`, `uuid(7)`, `created_at`/`updated_at`; referencias entre tablas verificadas del mismo tenant por `core.verificar_mismo_tenant`. Las migraciones son aditivas.

**Núcleo (`core`)**

| Tabla | Columnas clave | Restricciones |
|---|---|---|
| `contactos` (existe; cambia) | Persona: nombres, apellidos, `email` normalizado, `telefono`, notas, estado, archivado. `cuenta_id`, `cargo`, `roles`, `es_principal` quedan opcionales y en desuso | `UNIQUE (tenant_id, lower(email)) WHERE email IS NOT NULL` (reemplaza el único por cuenta) |
| `contacto_cuentas` | `contacto_id`, `cuenta_id`, `cargo`, `roles text[]` (`comercial`, `operacional`, `facturacion`, `cobranza`, `cesion`), `es_principal`, `estado`, `archivado_en` | Único por par; un principal por cuenta: `UNIQUE (tenant_id, cuenta_id) WHERE es_principal AND estado = 'activo' AND archivado_en IS NULL`; no se desvincula con roles de instalación o negocios abiertos en esa cuenta |
| `contacto_instalaciones` | `contacto_id`, `instalacion_id`, `roles text[]` (`jefe_sitio`, `recibe_reportes`, `autoriza_visitas`, `emergencia`) | Único por par; trigger: existe un vínculo activo `contacto_cuentas` con la cuenta de la instalación |
| `etiqueta_grupos` | `nombre`, `exclusivo bool`, `ambitos text[]`, `orden` | Único por nombre |
| `etiquetas` | `nombre`, `tono` (token del DS, nunca hex), `grupo_id?`, `ambitos text[]` (`cuenta`, `instalacion`, `negocio`, `contacto`, `documento`), `descripcion`, `orden`, `archivada_en` | Único `(tenant, grupo, lower(nombre))` |
| `etiqueta_vinculos` | `etiqueta_id`, `entidad_tipo`, `entidad_id`, `creado_por_tipo/id` | Único por trío; trigger: tipo registrado, existencia y mismo tenant, ámbito permitido y exclusividad del grupo |
| `actividades` | `tipo` (`nota`, `llamada`, `correo`, `whatsapp`, `reunion`, `visita`, `tarea`), `titulo`, `cuerpo`, `ocurrio_en`, `canal`, `vence_en`, `todo_el_dia`, `prioridad`, `estado_tarea` (`pendiente`, `hecha`, `cancelada`), `completada_por/en`, `acuerdos`, `respuesta_a_id`, `creado_por_tipo/id`, `via_user_id` | CHECK: campos de tarea solo en `tarea` |
| `actividad_vinculos` | `actividad_id`, `entidad_tipo`, `entidad_id` | Igual que `documento_vinculos`, más trigger de existencia y mismo tenant |
| `actividad_responsables` | `actividad_id`, `usuario_id` | Único por par |
| `fusiones` | `entidad_tipo`, `perdedora_id`, `ganadora_id`, `snapshot jsonb`, `motivo`, actor | Append-only |

**Comercial (`comercial`)**

| Tabla | Columnas clave | Restricciones |
|---|---|---|
| `solicitudes` | Datos crudos de contacto y empresa, canal, UTM, `estado` (`nueva`, `en_revision`, `convertida`, `descartada`), `motivo_descarte`, SLA (`vista_en`, `primer_contacto_en`, `escalada_en`), `cuenta_id?`, `negocio_id?` | Texto de terceros marcado como externo (ADR-034) |
| `pipelines` | `nombre`, `por_defecto` | Un `por_defecto` por tenant |
| `etapas` | `pipeline_id`, `nombre`, `orden`, `tipo` (`abierta`, `ganada`, `perdida`), `probabilidad`, `tono`, `exige` (`monto`, `fecha_cierre`, `cotizacion_enviada`, `inicio_servicio`, `motivo_perdida`), `activa` | Exactamente una `ganada` y una `perdida` por pipeline (única regla fija); editable en Configuración → Comercial → Embudo |
| `negocios` | `cuenta_id`, `pipeline_id`, `etapa_id`, `estado` (`abierto`, `ganado`, `perdido`, mantenido por trigger desde el tipo de etapa), `valor_mensual` y `cotizacion_enviada_en` (los escribe CPQ por una capacidad de Comercial), `titulo`, `tipo_id`, `origen_id`, `responsable_id`, `probabilidad`, `cierre_estimado`, `monto_estimado_mensual` (CLP, solo sin cotización vigente), `inicio_servicio_estimado`, `motivo_perdida` (cerrado), `motivo_perdida_detalle`, `competidor`, `ganado_en`, `perdido_en`, `archivado_en` | `cuenta_id` inmutable una vez que hay instalaciones o cotizaciones |
| `negocio_instalaciones` | `negocio_id`, `instalacion_id`, `tipo` (`nueva`, `ampliacion`, `renovacion`, `reemplazo`), `aplicada_en` | Único por par; trigger: la instalación es de la cuenta del negocio; no se quita si una línea de cotización la referencia |
| `negocio_contactos` | `negocio_id`, `contacto_id`, `rol` (`decisor`, `tecnico`, `compras`, `usuario`), `es_principal` | Único por par; un principal por negocio; trigger: existe un vínculo activo `contacto_cuentas` con la cuenta del negocio |
| `negocio_etapas` | `negocio_id`, `de_etapa_id`, `a_etapa_id`, `cuando`, actor, `segundos_en_anterior` | Append-only |
| `catalogos` | `catalogo` (`tipo_negocio`, `origen`), `clave`, `nombre`, `orden`, `activo` | Único `(tenant, catalogo, clave)` |
| `cuentas_comercial` | `cuenta_id` (PK), `responsable_id`, `es_referencia` | Faceta de la cuenta |

**CPQ (`cpq`)** — ver ADR-042.

| Tabla | Columnas clave | Restricciones |
|---|---|---|
| `modelos` | `nombre`, `vertical_base`, `version`, `estado` (`borrador`, `publicado`, `retirado`), `definicion jsonb` (variables, fórmulas, categorías), `publicado_en/por` | Un `publicado` vigente por tenant; publicado inmutable |
| `items` | `codigo`, `nombre`, `categoria`, `unidad`, `moneda`, `precio` (entero escalado), `modo_calculo`, `formula?`, `visible_cliente`, `por_defecto`, `activo` | Único `(tenant, codigo)` |
| `cotizaciones` | `negocio_id`, `codigo`, `version`, `reemplaza_a_id`, `estado`, `vigente`, `modelo_id` (versión), `valores jsonb` (variables usadas), `moneda`, `uf_valor` + `uf_fecha`, `valida_hasta`, condiciones comerciales, totales calculados (costo, venta mensual, únicos, margen efectivo), `enviada_en`, `aceptada_en` | Único `(tenant, codigo, version)`; un `vigente` por negocio; una versión editable por código |
| `cotizacion_lineas` | `cotizacion_id`, `instalacion_id?` (null = común), `tipo` (`puesto`, `item`, `adicional`), `puesto_id?` (core), especificación del puesto (cargo, patrón, horario, dotación, jornada), `item_id?` + **copia del ítem** (nombre, categoría, unidad, precio, modo de cálculo, fórmula), cantidad, precio sobrescrito, `margen_propio?`, `recurrencia` (`mensual`, `unico`), `visible_cliente`, `habilitada`, `orden`, resultado calculado | Trigger: la instalación pertenece al negocio de la cotización |

---

## 6. Importación desde 1.0

Script idempotente con `--dry-run` y reporte (ADR-010), ids mapeados en `core.ids_externos` (sistema `opai1`).

| 1.0 | 2.0 | Reglas |
|---|---|---|
| `CrmAccount` | `core.cuentas` | Deduplicar por RUT normalizado (P10); sin RUT, por nombre canónico (`canon` de `@opai/domain`) → propuesta de fusión, nunca automática. `industry`/`segment`/`size` → etiquetas en grupos Rubro, Segmento, Tamaño (valores normalizados en el reporte para que Carlos los confirme) |
| `CrmContact` | `core.contactos` + `core.contacto_cuentas` | Correo en minúsculas; teléfono a E.164. Los `CrmContact` con el mismo correo normalizado en cuentas distintas son **una persona** con un vínculo por cuenta (determinista, se reporta); duplicados en la misma cuenta se fusionan. `roleTitle` → `cargo` del vínculo; `recibe*` → `roles` del vínculo; si `isPrimary` se repite en una cuenta, gana el más reciente y se reporta. Sin correo: una persona por fila, con sugerencias de fusión por teléfono y nombre |
| `CrmInstallation` | `core.instalaciones` | Sin cuenta (`leadId`) → se crea o asocia la cuenta prospecto del lead; deduplicar por `place_id` o distancia < 50 m dentro de la misma cuenta |
| `CrmPipelineStage` | `comercial.etapas` | Mapeo 1:1; `isClosedWon`/`isClosedLost` → `tipo`; `isAccepted` → `exige: inicio_servicio` |
| `CrmDeal` | `comercial.negocios` + `negocio_instalaciones` | Instalación: `activatedByDealId`, luego `CpqQuote.installationId` de sus cotizaciones, luego coincidencia por nombre o dirección dentro de la cuenta; sin coincidencia → reporte (no se crea una instalación desde el texto) |
| `CrmDealContact` | `comercial.negocio_contactos` | `decision_maker` → `decisor`; `primary` → `es_principal`; `participant` → `usuario` (a revisar) |
| `CrmDealStageHistory` | `comercial.negocio_etapas` | Tal cual |
| `CrmDeal.lostReasonCategory` | `motivo_perdida` | Las cinco categorías de 1.0 existen en 2.0 (que agrega `competencia` y `no_califica`); las pérdidas sin categoría quedan nulas |
| `CrmNote`, `CrmDealMeeting`, `CrmDealContactLog`, `CrmTask` | `core.actividades` | Tipo según `interactionType` o tabla; fechas reales conservadas |
| `CpqQuote` (+ bundle) | `cpq.cotizaciones` | Solo vigentes (enviadas y no vencidas) e historial de ganadas como registro de solo lectura (PDF en documentos y totales), sin recalcular con el modelo nuevo |

---

## 7. Lo que no se porta

Copia de datos de instalación en el negocio, `CrmDealQuote` y `activeQuotationId`, `proposalStatus`, bundles, papelera de cotizaciones, catálogos globales, una tabla por tipo de costo, campos personalizados (backlog), `CrmIndustry` global, Slack por negocio, PandaDoc y carpeta de Drive en el negocio, `grokAgentId` como dueño, campos de IA en la cotización (`aiDescription`, `proposalAiContent`: un agente escribe por capacidad), adjuntos propios de cotización (van a `core.documentos`), reseñas (backlog).

---

## 8. Pendiente de verificar

- Uso real de campos personalizados y `CrmAccountReviewRequest` en Gard (datos, no código).
- ~~Si Operaciones en 1.0 crea los puestos operativos al ganar un negocio o se crean a mano~~ **Verificado (24-oct, `09ab4fe`):** ganar no crea puestos. Se crean a mano, con «Enviar dotación a la instalación» desde la cotización (`src/app/api/cpq/quotes/[id]/send-to-installation/route.ts`, crea `OpsPuestoOperativo` con estructura de sueldo y sincroniza el flujo de caja) o en Operaciones (`src/lib/ops/create-puestos.ts`, también por `POST /api/ops/puestos` y la herramienta MCP `create_ops_puesto`). Recomendación para la convivencia en `modulos/comercial.md` §14, pregunta 8.
- Casos dorados de los modos de margen y de la rama `k ≥ 0,35` contra cotizaciones reales de Gard (no hay tests en 1.0; ver §3.9).
