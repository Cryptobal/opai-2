# Auditoría profunda de OPAI 2.0 — 3-nov-2026

**Encargo:** Carlos, 3-nov-2026 (CAR-151). **Base:** `main` en `fac5738` (#229). **Método:** el código manda sobre los documentos. Cinco revisiones en paralelo contra el código de 2.0 y de 1.0 (`Cryptobal/opai` @ `40d19a5`, solo lectura), más los errores reales de `test.opai.cl` en Vercel (últimos 7 días), el estado de los PR en GitHub y Linear.

**Límites de esta auditoría:**
- No hubo recorrido en vivo con navegador: la extensión de Chrome estaba desconectada. Los bugs de pantalla salen del código, de las capturas de QA que ya están en el repo y de los errores de ejecución de Vercel. Conviene que «Diseño y QA OPAI 2.0» confirme los bugs B1–B12 en vivo.
- Neon no se consultó. El estado de las migraciones se deduce de la etiqueta `migracion-pendiente` y de los avisos en cada PR (§1.3).
- Sin datos reales: no hay RUT, nombres de clientes ni montos.

---

## 0. Los cinco hallazgos más importantes

1. **No se puede emitir una factura real desde 2.0, aunque todo «esté construido».** El adaptador SimpleAPI de 2.0 (`packages/integrations/src/sii/simpleapi.ts`) llama a endpoints que no son los de la API real: `/v2/dte/firmar|enviar|consultar`, en JSON y con la key en `Authorization` sin el esquema Basic que exige la API. El adaptador que funciona en 1.0 (`src/modules/finance/shared/adapters/simpleapi.provider.ts`) usa `api/v1/dte/generar` → `envio/generar` → `envio/enviar`, en multipart con el `.pfx` y el CAF, y auth Basic. Además:
   - la emisión no envía el CAF ni las líneas de detalle ni las referencias OC/HES;
   - la nota de crédito usa siempre el SII simulado (`ventas-nc-escritura.ts:41`);
   - SimpleAPI no se puede activar desde la pantalla: Finanzas lee `dte_config.emisionProveedor`, que ninguna pantalla escribe.

   Los tests pasan porque solo usan un mock. El adaptador de cesión Octava tiene el mismo problema.
2. **`test.opai.cl` sigue cortándose contra Neon.** Vercel registra **1.585 errores «Connection terminated due to connection timeout» en 7 días, que afectaron a 29 usuarios**. Hay otros ~1.300 de la misma familia: P2028, «timeout exceeded when trying to connect» y `error_interno` de capacidades. El último fue el 3-nov a las 02:21 UTC. Se ven en casi todas las rutas y casi siempre empiezan al leer la sesión de Better Auth. CAR-31 y CAR-35 se cerraron, pero el problema sigue (§4.1).
3. **13 PR integrados en `main` (15 archivos de migración) no tienen evidencia de estar aplicados en Neon.** Diez siguen con la etiqueta `migracion-pendiente` (#181, #199, #203, #205, #217, #218, #219, #223, #224, #225) y dos nunca la tuvieron (#209, #220). Entre ellas están las que necesitan Ventas DTE, CAF, propuesta técnica, flujo sin cierre, formulario web, canal agente y los datos tributarios de la cuenta. Si no están aplicadas, `test.opai.cl` corre código que espera tablas y columnas que no existen. Además, `ESTADO.md` afirma lo contrario en tres lugares (§1.3).
4. **La migración de Gard desde 1.0 todavía no puede salir bien.**
   - No hay de dónde leer: no existe exportador en 1.0 y el lector API falla cerrado.
   - El importador degrada datos:
     - todas las cuentas e instalaciones quedan como «prospecto»;
     - la razón social se rellena con el nombre comercial;
     - al actualizar escribe nulos sobre lo corregido en 2.0;
     - no hay corrida identificada, reversión ni conciliación.
   - El correo DTE no existe en la cuenta de 1.0: sin derivarlo, todas las cuentas quedan «tributario incompleto» y el PR #231 omite todas las facturas recurrentes.
   - El PR #231 tampoco calza con la forma real de las plantillas de 1.0: líneas con cantidad, UF y descuento; frecuencias no mensuales; cuenta nula. Si se integra así, la validación falla o se pierden datos (§2.3).
5. **Comercial y Finanzas tienen buen esqueleto, pero no les queda nada hacia el cliente.**
   - Comercial no tiene seguimiento de cotizaciones: en 2.0 solo existe la especificación, y en 1.0 se usa a diario.
   - Comercial tampoco consulta el SII por RUT.
   - Finanzas no tiene envío del DTE al cliente, cobranza, cierre de mes ni rendiciones.
   - La ficha de venta es de solo lectura: no hay botón de NC, PDF, envío al SII ni ceder.

   Hay 89 capacidades que funcionan por MCP pero no tienen pantalla (§1.2).

**Lo que sí está bien y se mantiene:**
- Aislamiento por tenant y auditoría encadenada.
- Paridad MCP (0 faltantes en el inventario, 48 excepciones justificadas).
- Motor CPQ puro en enteros, con aprobación por margen (supera a 1.0) y propuesta técnica.
- Contactos en varias cuentas y RUT único.
- Pauta mensual y diaria, Tickets, configuración de Rondas, Bancos con conciliación y flujo de caja.
- Duplicación literal de código muy baja (0,16 %) y ninguna librería de servidor filtrada al cliente.

---

## 1. Estado real por módulo

### 1.1 Cifras (medidas en `fac5738`)

| Concepto | Valor |
|---|---|
| Capacidades | 473 reales (core 229, finanzas 53, cpq 48, comercial 36, platform 28, nómina 21, pauta 15, rondas 15, tickets 11, portal_cliente 8, portal_trabajador 8, agente 5) más 4 de prueba |
| Herramientas MCP | 419, más 217 `preview_` |
| Inventario de paridad | 464 pares pantalla → capacidad; 416 con herramienta; 48 excepciones con motivo; **0 faltantes** |
| Capacidades sin pantalla (solo API y MCP) | **89** |
| Páginas | 140: 96 en el ERP, 13 de plataforma, 9 de acceso y 22 de portales y otras |
| Migraciones | 77 (20 desde el 1-nov); 167 modelos Prisma |
| Código | ~203 mil líneas TS; 2.193 tests unitarios y 77 specs e2e |

### 1.2 Por módulo

| Módulo | Terminado y usable | A medias | Falta | Duplicado o muerto |
|---|---|---|---|---|
| **Núcleo** | Cuentas, contactos (N–N), instalaciones, personas, cargos; documentos y vencimientos; notificaciones y comunicaciones; auditoría y bitácora; identidad (login, MFA TOTP, invitación); Ley 21.719 (20 capacidades con pantallas); plataforma (13 páginas); calendario; remuneraciones (motor M2+M3) y captura SII de UF/UTM | Etiquetas (7 capacidades) y actividades/tareas (6) sin pantalla; pestaña Laboral de Personas PR 2 solo de lectura (sin pantalla para editar previsión, pago y laboral); firma: firmante de empresa, firma automática y política sin pantalla; restablecer MFA (PR #168 abierto); `core.remuneraciones.confirmar` sin pantalla; revocar invitación y archivar contacto sin pantalla | Login propio de trabajador y de cliente («Disponible pronto»); OTP por correo y SSO | `personas/_componentes/{tabla-sueldo.tsx, selector-puesto.tsx, sueldo-comun.ts}` sin importar |
| **Configuración** | 30 páginas: portada por grupos, empresa, marca, módulos, usuarios y roles, integraciones, comunicaciones, documentos, calendario, cumplimiento, remuneraciones, consumos, aprobaciones, auditoría, agentes, preferencias | Integraciones «Próximamente»: WhatsApp, Fintoc, Factoring, Biometría, Slack, Webhooks. **Configuración DTE sin pantalla**: el ambiente vive en dos lugares que no coinciden. Editor del calendario de pagos de Finanzas con JSON en un textarea | Configuración DTE con checklist de paso a producción | — |
| **Comercial / CRM** | Embudo kanban con requisitos por etapa; solicitudes con canales; conversión a negocio; formulario web (#224); canal agente GrowthBot (#225); importación 1.0 (solo simulación y núcleo) | Etiquetas y actividades del CRM sin pantalla; importación de negocios solo simulada (#231) | **Seguimiento de cotizaciones** (solo especificación); **consulta al SII por RUT**; correo entrante; reportes comerciales; fusión de duplicados | — |
| **CPQ** | Lista y creación; ficha con secciones y líneas; motor puro con costo laboral real; aprobación por margen; envío con PDF y propuesta técnica v2; clonar y versiones; marca y plantillas; ficha móvil | 17 capacidades sin pantalla (ABM del catálogo, correlativos, reordenar líneas, márgenes por sección/versión, publicar bloques, retirar aprobación); bandeja de aprobaciones: #230, integrado justo después de esta foto | Condiciones comerciales estructuradas (hoy son texto); acuse de apertura de la propuesta; puente cotización → contrato | `motor/proveedor-stub.ts` muerto desde #210; `cpq.cotizaciones.enviar` legacy; `persistencia/pdf-propuesta.ts` y `mock-motor-legal.ts` solo para tests |
| **Finanzas** | Flujo de caja v2; Bancos (cartola Santander/CSV, conciliación, reglas); Compras, proveedores, plan de cuentas y centros de costo; Folios CAF; certificado `.pfx` cifrado; borrador y emisión de ventas (simulada); seguimiento SII en cola | **Adaptadores SimpleAPI y Octava que no corresponden a la API real**; emisión sin CAF, detalle ni referencias; **NC siempre simulada**; SimpleAPI y Octava no activables desde la pantalla; ficha de venta sin acciones; reglas de banco y cobro manual solo por MCP | Facturación recurrente (llega en #231, solo lectura); nota de débito; envío del DTE al cliente; cobranza y aging; seguimiento EP/proforma; cierre de mes; RCV automático; acuse y reclamo de recibidos; factorings; rendiciones; contabilidad, EERR, balance, IVA/F29; pagos a proveedores | `finanzas.cierres.listar` y `flujo/_componentes/cierre-ui.ts`, restos del cierre semanal retirado en #219 |
| **Operaciones / Pauta** | Pauta mensual y diaria: series, excepciones, PPC, cobertura, reemplazos, refuerzos, marca manual, alertas, exportación; puestos en la instalación | Umbral de horas fijo en el código; sin aviso al guardia | Asistencia real; turnos extra pagables; supervisión y visitas | — |
| **Rondas** | Configuración en el ERP: puntos, plantillas, programaciones, tipos de incidente, PDF de etiquetas QR, migración de QR de 1.0 | Reemplazar etiqueta solo por MCP | **Ejecución en terreno**: el portal Terreno es un placeholder; sin informes ni anomalías | Permisos `rondas:revisar` y `rondas:confianza.manage` sin capacidad que los use |
| **Tickets** | Tipos, creación manual, bandeja, ficha, comentarios, estados, aprobación | Reasignar solo por MCP | Tickets desde los portales; SLA | — |
| **Personas / Remuneraciones / Nómina** | Capas de sueldo, vínculo laboral, anexos; motor de sueldos (costo empresa) usado por CPQ; Nómina: períodos, novedades, préstamos, anticipos, calendario de obligaciones | Pantallas lista-ficha de Cargos y Remuneraciones en el PR #213 (en conflicto, Vercel en rojo); carga masiva de novedades solo por MCP | **Cálculo de liquidaciones** (ninguna capacidad lo hace); Previred/LRE; finiquitos | — |
| **Agente interno (ADR-049)** | Backend completo: turno, planes, confirmación humana, presupuesto, cinco proveedores de IA | — | **Pantalla de chat (CAR-120)**: ningún componente llama a `/api/agente`; desde el producto el agente no se puede usar | — |
| **Integraciones** | Correo (Resend), R2, Google Maps, IA, captura SII de UF/UTM, certificado `.pfx` | SimpleAPI y Octava (ver Finanzas) | WhatsApp, Fintoc, Biometría, Slack, Webhooks | — |
| **Portales** | Trabajador usable tras sesión (inicio, mis datos, privacidad, ARCO, exportación) | Cliente mínimo (solo resumen del mes); Supervisor parcial (solo documentos vencidos) | Terreno (placeholder); login propio de los portales | — |
| **Firma** | Envío N1, firma por enlace, rechazo, recordatorio, cancelación, verificación pública | Firmante de empresa, firma automática y política sin pantalla; `/verificar/[token]` lee la base sin capacidad (deuda declarada) | Firma avanzada (Brief 28) | — |

**Capacidades sin pantalla que más se notan** (las demás son lecturas para agentes y están bien así):
- Finanzas: `ventas.{emitir_nota_credito, enviar_sii, pdf, cesion_simular, cesion_ceder}`, `dte_config.*`, `reglas_banco.*`, `cobros.manual`, `compras.importar`.
- CRM: `core.actividades.*`, `core.etiquetas.*`, `core.contactos.archive`.
- CPQ: `catalogo_items.*` y `catalogo_categorias.*`.
- Núcleo: `core.invitations.revoke`; `core.personas.{laboral_actualizar, prevision_actualizar, pago_solicitar_cambio}`.

El detector de paridad tampoco ve `platform.trabajos.reintentar`, que sí se usa en pantalla (`hoja-trabajo.tsx:19`).

### 1.3 Migraciones recientes y su evidencia de aplicación

Ningún PR tiene un aviso del bot del tipo «aplicada en dev y main». La evidencia es el historial de la etiqueta `migracion-pendiente` (la quita el operador después de aplicar, ADR-054).

| Estado | PR y migración |
|---|---|
| **Aplicada** (etiqueta retirada) | #200 `pauta_diaria_pr2`; #201 `cpq_lineas_montos`; #204 `finanzas_ventas_pr1`; #207 `finanzas_flujo_bigint`; #210 `nucleo_remuneraciones_m2m3`; #211 `finanzas_bancos_pr1`; #214 `personas_cargos_pr2` |
| **Sin evidencia, etiqueta aún puesta** | #199 `solicitud_arco_detalle_portal`; #203 `cpq_pr103` y `cpq_marca_plantillas`; #205 `finanzas_flujo_pr2`; #217 `finanzas_caf_endurecido_pr3`; #218 `cpq_propuesta_tecnica`; #219 `finanzas_flujo_sin_cierre`; #223 `cuentas_datos_tributarios_dte`; #224 `comercial_leads_formulario_web`; #225 `comercial_solicitudes_canal_agente`; además #181 `portal_cliente_acceso` |
| **Sin evidencia, nunca etiquetada** | #209 `finanzas_ventas_pr2`; #220 `remuneraciones_sii_ventana_tz`, `_rol_cron` y el seed SII |
| **Abierta** | #231 `20261103140000_finanzas_ventas_programacion`, también sin la etiqueta |

**Contradicciones en `ESTADO.md` (corregidas en este PR):**
- Daba por aplicada la migración de #225, que sigue con la etiqueta puesta.
- Daba por no aplicadas las de #201 y #207, cuya etiqueta ya se retiró.

**Regla rota:** según ADR-043 v3 y ADR-054, no se integra con `migracion-pendiente` puesta. Diez PR se integraron así (#181 y nueve entre el 1 y el 3-nov).

---

## 2. Comercial y Finanzas contra 1.0

### 2.1 Comercial y CPQ

| Funcionalidad | Ya en 2.0 | Falta | Mejora real propuesta |
|---|---|---|---|
| Bandeja de solicitudes y conversión | Hecho: `comercial.solicitudes.*`, pantalla `(erp)/solicitudes` | — | Al convertir una solicitud con RUT, proponer la razón social, el giro y la dirección del SII en la vista previa, para que la cuenta nazca lista para facturar |
| Solicitudes desde la web | Hecho (#224): endpoint público con clave por canal, honeypot, idempotencia y UTM | — | Respuesta automática con un enlace de autoservicio para completar RUT e instalaciones |
| Solicitudes por correo | Falta: el canal «correo» existe, pero sin receptor (1.0: `api/webhook/inbound-email`) | Receptor, extracción, adjuntos a Documentos, dedupe por hilo | Un correo que responde a una cotización enviada no crea una solicitud: se cuelga del negocio y pausa el seguimiento |
| Solicitudes por agente | Hecho (#225) | — | — |
| **Cuenta con datos del SII por RUT** | Falta. 1.0 lo hace con diff aplicable (`api/crm/accounts/[id]/lookup-rut`, `simpleapi-rut.ts`) | `consultarContribuyente(rut)` en el adaptador; capacidades `core.cuentas.consultar_sii` y `aplicar_sii` con dryRun | Consulta asíncrona y cacheada por RUT; indicador «lista para facturar» en lista y ficha; revalidación periódica del giro y la dirección; pasada en lote después de importar |
| RUT único y datos tributarios | Hecho (#223); migración sin aplicar | Aplicar migración | Congelar los datos tributarios en el documento al emitir (hoy se leen vivos desde la cuenta) |
| Contactos | Hecho, supera a 1.0: persona única en N cuentas, principal único, roles en lugar de flags | Archivar sin pantalla | — |
| Instalaciones | Hecho (geocerca, Place ID) | — | — |
| Negocios y embudo | Hecho: embudo configurable con requisitos, kanban, ganar/perder/reabrir | Higiene de negocios detenidos (1.0: `crm/deals/higiene`) | Umbral de días sin actividad por etapa, no fijo |
| Notas, tareas, reuniones | Backend hecho (actividad unificada), **sin pantalla de escritura** | Pantalla de notas y tareas en las fichas; aviso de vencimiento | Resumen diario «qué me toca hoy»: tareas, pasos de seguimiento y aprobaciones |
| Cotización CPQ y motor | Hecho, supera a 1.0: versiones, multi-instalación, motor puro en enteros | Conciliar 1.0 contra 2.0 en cotizaciones reales | — |
| **Primer tenant / CPQ bloqueado (CAR-162, 3-nov-2026)** | **Corregido en PR CAR-162:** enlaces a `/configuracion/remuneraciones`, avisos con causa concreta, mutual sin confirmar calcula con 0 % (envío exige confirmación), sueldo abre edición del puesto, margen y categorías «Costos pendientes», recálculo informa faltantes, PDF sin bucle | — | e2e `cpq-primera-cotizacion.spec.ts` con tenant vacío |
| Condiciones comerciales | Parcial: texto libre en el PDF | Campos estructurados (forma de pago, moneda, reajuste IPC, duración) | Que al ganar generen la programación de facturación recurrente sin volver a digitar |
| Envío con propuesta técnica | Hecho (#218): biblioteca, armador, PDF conjunto, destinatarios | WhatsApp, envío al portal, **acuse de apertura** | Enlace firmado que registra aperturas: es la mejor señal para el seguimiento |
| Aprobaciones de margen | Hecho, supera a 1.0 (que no tenía flujo); bandeja y campana integradas en #230 (después de la foto) | — | Umbral por segmento o tamaño; motivo del descuento para reportar el margen cedido |
| **Seguimiento de cotizaciones** | **Solo especificación** (`modulos/seguimiento-comercial.md`). En 1.0: `followup-cadence.ts`, días hábiles 3/7/14/15, con pausa si el cliente responde | Todo: modelo de cadencia, pasos, trabajos, decisión al enviar, pausa | Pasos configurables (persona, OPAI automático o agente) y pausa automática por respuesta de correo o por apertura |
| Reportes comerciales | Falta (1.0 los tenía solo por chat y MCP) | Capacidades de reporte | «Comercial › Resultados»: conversión y días por etapa (ya se guardan en `HistorialEtapa`), ganados por canal, pérdidas por motivo, margen cotizado contra margen ganado |
| Licitaciones | Falta (fase 6) | — | — |

### 2.2 Finanzas

| Funcionalidad | Ya en 2.0 | Falta | Mejora real propuesta |
|---|---|---|---|
| Borrador de factura manual (33/34) | Hecho: `finanzas.ventas.crear_borrador`, pantalla `ventas/nuevo` | Editar y descartar borrador; cantidad × precio unitario; líneas en UF; descuentos | Línea con cantidad, precio unitario, unidad y moneda, con la UF del día fijada en la línea |
| Emisión | Capacidad y pantalla hechas (folio atómico, rechaza CAF vencido) | **Adaptador real**; envío del CAF, del detalle y de las referencias; resolución SII del emisor | Preflight como capacidad de lectura, visible antes del botón Emitir: certificado vigente, CAF del RUT, folio en rango y datos del receptor |
| Datos del receptor | Lee los datos tributarios de la cuenta (#223) | Aplicar migración; validar giro y dirección antes de emitir | Congelar los datos en el documento emitido |
| Referencias OC/HES | Tabla existe; solo la usa la NC | En borrador, en emisión y en pantalla | Regla explícita por cuenta: «exige OC/HES» (1.0 la infería de la última factura) |
| Envío del DTE al cliente | **Falta** | PDF + XML al receptor, CC, historial, reenvío | Por Comunicaciones, a los contactos con rol «facturación», con registro idempotente |
| PDF del DTE | Capacidad hecha | Botón en la ficha; vista previa del borrador | Mismo patrón que la vista previa de CPQ (#229) |
| **Facturación recurrente** | **No existe en `main`.** #231 crea las tablas y una pantalla de solo lectura | Crear, editar y pausar; trabajo que genere borradores; UF; IPC; adjuntos | Borrador por período con corrida única (programación + período), no `lastRunAt` |
| Seguimiento EP/proforma → OK cliente | Falta | Todo | Máquina de estados persistida; OK del cliente desde el Portal Cliente |
| Cierre de mes de facturación | Falta | Todo | Tablero por período con emisión en lote de lo listo (una aprobación, N emisiones) |
| Nota de crédito (61) | Capacidad hecha; **siempre simulada**; sin pantalla | Adaptador del tenant; pantalla; NC parcial | Botón «Anular o corregir» que propone NC total o parcial y recalcula el cobro |
| Nota de débito (56) | Solo el tipo en los esquemas | Todo | Mismo motor que la NC, con signo |
| Certificado y CAF | Hecho (#217, #221, #222) | El CAF guardado no se usa al emitir; aviso de vencimiento del certificado | Aviso a 30 y 7 días y bloqueo con mensaje claro |
| Seguimiento de estado SII | Hecho (trabajo en cola, 7 intentos) | Aviso de rechazo; pantalla de envíos | Aviso inmediato con la glosa del SII y la acción sugerida |
| Paso a producción | Capacidad hecha, **sin pantalla**; dos fuentes de ambiente | Pantalla y fuente única | Checklist: certificado, CAF de producción, resolución SII, prueba de certificación aceptada |
| Compras y proveedores | Hecho | RCV automático; XML recibido; acuse y reclamo | Aviso del plazo de reclamo de 8 días |
| Cobranza | Solo estado de cobro desde conciliaciones | Vencimiento, aging, correos y recordatorios, confirmación del cliente | Secuencia configurable con feriados chilenos (1.0 no los considera) y pausa al conciliar el pago |
| Factoring / cesión | Capacidades hechas; **adaptador Octava distinto al de 1.0**; sin pantalla | Catálogo de factorings, liquidación, conciliación del abono | Cesión en lote con una aprobación; comparador del costo efectivo por factoring |
| Flujo de caja | Hecho (v2, sin cierre semanal por decisión) | Notas por celda, exportación | Proyección desde las programaciones recurrentes cuando existan |
| Bancos y conciliación | Hecho (migración aplicada) | Ingesta automática; conciliación N:M; castigo | Un abono que paga varias facturas, con prorrateo. Ojo: **1.0 no tiene Fintoc real**, solo textos |
| Rendiciones | **Falta** | Todo | Rendición desde el Portal Trabajador con foto de la boleta y extracción por IA; pago por lote |
| Contabilidad e informes | Solo plan de cuentas y centros de costo | Asientos, EERR, balance, IVA/F29, rentabilidad, pagos a proveedores | Asientos generados por evento; rentabilidad por instalación cruzando ventas con costo laboral |
| UF/UTM | Captura SII en el núcleo (#220, migraciones sin evidencia) | Que Finanzas la use | UF por fecha desde la tabla de plataforma, con fijación configurable por cuenta |

**Qué impide hoy emitir una factura real de Gard, en orden:**
1. El adaptador SimpleAPI de 2.0 no es la API real. Es un bloqueo de código, no de credenciales.
2. El payload de emisión está incompleto: no lleva CAF, detalle, referencias ni resolución SII.
3. Faltan cuatro migraciones en Neon: `finanzas_ventas_pr1` (aplicada según la etiqueta), `finanzas_ventas_pr2`, `finanzas_caf_endurecido_pr3` y `cuentas_datos_tributarios_dte`.
4. Credenciales del tenant (las carga Carlos en Integraciones): API key de SimpleAPI, `.pfx` con su clave y RUT emisor.
5. CAF real cargado y **fecha de corte con 1.0** definida, para no duplicar folios.
6. Configuración DTE y paso a producción sin pantalla.
7. Ficha de venta sin acciones.
8. El cliente no recibe la factura.
9. No hay prueba del set de certificación del SII con el adaptador nuevo.

### 2.3 Migración desde 1.0 (importador `packages/db/scripts/importar-opai1/**` y PR #231)

**Lo que existe:**
- Capacidad `comercial.importar_1_0`, solo para personas, con dryRun y una sola transacción.
- Plan puro y determinista, con idempotencia por `core.ids_externos`.
- El CLI solo simula.
- Importa cuentas (nombre, razón social, RUT, giro, dirección, correo DTE), contactos (persona única, roles) e instalaciones (nombre, dirección, coordenadas).
- El PR #231 agrega:
  - la simulación de negocios;
  - el correlativo CPQ;
  - las programaciones recurrentes con sus destinatarios, ya aplicadas.

**Lo que falta o está mal:**

| Problema | Gravedad |
|---|---|
| No hay origen: no existe exportador en 1.0 y `lectorApiOpai1()` falla cerrado (falta la key) | **Bloqueante** |
| El correo DTE no existe en la cuenta de 1.0 (vive en `FinanceDte.receiverEmail`). Sin derivarlo, ninguna cuenta queda lista para facturar y #231 omite todas las recurrentes | **Bloqueante** |
| Todas las cuentas e instalaciones quedan como «prospecto» (no se mapea el estado). Rompe Pauta y Operaciones en instalaciones activas | Alto |
| Al actualizar escribe todos los campos, también los nulos: un segundo ensayo después del corte borra lo corregido en 2.0 | Alto |
| Razón social rellenada con el nombre comercial cuando falta | Medio |
| No hay corrida identificada, reversión, lotes ni conciliación posterior (conteos y sumas de control) | Alto |
| #231: las líneas de 1.0 traen cantidad, UF por línea, descuento y exención, y #231 espera solo glosa y monto | Alto |
| #231: solo acepta frecuencia mensual y exige `accountId`, que en 1.0 puede ser nulo; una sola plantilla distinta hace fallar la validación de todo el JSON | Alto |
| #231: no migra el receptor propio, el reajuste IPC ni la política UF | Alto |
| #231: copia `nextRunAt`, con riesgo de doble facturación si 1.0 sigue facturando | Alto |
| #231: el correlativo CPQ se fija fuera de la transacción principal | Medio |
| Negocios: se omiten los que no tienen instalación coincidente; faltan monto, probabilidad, responsable y fechas; no hay tabla de equivalencia de etapas | Medio |
| No se migran representantes legales, personería, responsable de la cuenta, contactos de estado de pago y cobranza, región, geocerca ni vigencias | Medio |
| No se migran actividades (notas, tareas, reuniones) ni cotizaciones (solo el correlativo) | Medio |

**Pasos para una migración que salga bien:**
1. **Exportador de 1.0 de solo lectura** (credencial de solo lectura o key; la decide Carlos), con un contrato JSON versionado. Debe derivar:
   - `emailDte` desde el último DTE aceptado de cada RUT;
   - los estados de cuentas e instalaciones;
   - las plantillas recurrentes en su forma real.
2. **Ampliar el mapeo:**
   - estado de cuentas e instalaciones;
   - responsable;
   - representantes legales y personería;
   - roles de estado de pago y de cobranza;
   - región, geocerca y vigencias.

   Quitar el relleno de la razón social con el nombre.
3. **Política «solo completar vacíos»** por defecto; nunca escribir nulos sobre valores existentes; bloquear las actualizaciones después de la fecha de corte.
4. **Corridas identificadas** (`core.importaciones`) con reversión, lotes de unas 500 filas y el correlativo dentro de la misma corrida.
5. **Negocios:** tabla de equivalencia de etapas que confirma Carlos; importar sin instalación con aviso; traer monto, probabilidad, responsable y fechas reales.
6. **Actividades** con su fecha real y marca de origen. **Cotizaciones vigentes y ganadas como versiones congeladas** con el valor de 1.0, sin recalcular.
7. **Recurrentes (corregir #231 antes de integrar):**
   - líneas con cantidad, moneda, UF, descuento y exención;
   - frecuencias de 1.0 omitidas con aviso, sin hacer fallar todo el JSON;
   - cuenta resuelta por el RUT del receptor;
   - receptor, IPC y política UF;
   - **importar inactivas hasta el corte**.
8. **Conciliación** por entidad (conteos 1.0 contra 2.0 y sumas de control) y una muestra de 20 cuentas para revisión humana.
9. **Ensayo general en una rama de Neon:** simular → aplicar → conciliar → revertir → reaplicar. Recién entonces, el tenant real, con respaldo del operador.
10. **Pasada del SII en lote** sobre las cuentas con datos tributarios incompletos (depende del punto de §2.1).

---

## 3. Diseño y UX

### 3.1 Por qué se ve básico (con evidencia)

Evidencia: `qa/brief05-navegacion/1280-claro.png`, `qa/car-6/despues-ficha-768.png`, `evidencia/car130/kanban-1280.png` y `kanban-375.png`, `qa/platform-superadmin/empresas-1280.png`.

- **Todo es una caja con borde.** `Card`, `SeccionTarjeta` y `Table` usan el mismo borde de 1 px, con 16 px de radio y sin elevación. `SeccionTarjeta` además subraya la cabecera. El fondo `#fafafa` casi no se distingue del blanco de la tarjeta, así que lo único que separa los planos son líneas grises.
- **Dos titulares por pantalla en escritorio:** el de la barra superior (22 px) y otro grande en la pantalla («Inicio» y «Buenos días»; Bancos y la ficha de venta repiten un h1/h2).
- **El acento no aparece:** solo está en el botón primario. El ítem activo del menú es gris. Los montos y KPI tienen el mismo peso que el texto, e Inicio no muestra ningún número.
- **Tablas planas:** cabecera de 12 px gris, filas con borde y siempre dentro de una caja. Los números no van alineados a la derecha por defecto.
- **Estados vacíos pobres:** caja punteada con ícono gris; «Nada pendiente» es un párrafo suelto. Las columnas del kanban son grises y pesadas, y en móvil se navega con un `Select`.

### 3.2 Cinco cambios de alto impacto (dentro del DS 2.0)

Todos pasan por Claude Design (Design Prompt «DS 2.0 · refresco visual v1.1») y por la aprobación de Carlos antes del brief. El C2 cambia `NAVEGACION.md` y la regla del título en el AppShell.

1. **C1. Elevación en lugar de bordes.**
   - `--ds-shadow-card` en claro: `0 1px 2px rgba(17,17,19,.04), 0 0 0 1px rgba(17,17,19,.05)`.
   - Fondo `#f6f6f7`.
   - `--radius-card: 12px` en tarjetas, tablas y columnas; 16 px solo para hojas y diálogos.
   - Cabecera de sección sin línea, con título tipo «eyebrow».
   - Primero en: Inicio, ficha de Cuenta, ficha de Persona y ficha de Cotización.
2. **C2. Un solo titular por pantalla.**
   - Barra superior de 52 px, sin borde hasta que se hace scroll, con migas en 14 px.
   - El titular va en la pantalla con `t-title` (28/34) también en escritorio.
   - Primero en: Inicio, Negocios, Cotizaciones y Finanzas.
3. **C3. Números protagonistas.**
   - Estilos `t-kpi` (32/36, 600, tabular) y `t-kpi-sm` (22/28).
   - Franja de 3–4 indicadores en Inicio. Carlos elige cuáles; por ejemplo: cobertura de hoy, cotizaciones por aprobar, negocios abiertos y saldo proyectado de la semana.
   - En la cotización, «Venta mensual» en `t-kpi` y el margen en `t-kpi-sm`.
4. **C4. Tablas modernas.**
   - Variante plana, sin caja.
   - Cabecera en mayúscula pequeña (11/16, con tracking).
   - Filas de 44 px.
   - `numerica` alinea a la derecha con cifras tabulares.
   - Ítem activo del menú en color de acento.
   - Primero en: Cotizaciones, Ventas, Bancos y Plataforma › Empresas.
5. **C5. Estados vacíos y kanban.**
   - Estado vacío con ícono en un círculo de acento, una acción y una variante compacta.
   - Columnas del kanban sin fondo, con un punto de color por tipo de etapa.
   - Tarjetas con elevación.
   - En móvil, chips de etapa en lugar del `Select`.

**Orden:** primero C1 + C3 + C4 (tokens y componentes, verificados en `/ds` y en cuatro pantallas piloto); después C2 (navegación); después C5.

---

## 4. Bugs y detalles

### 4.1 Errores reales en `test.opai.cl` (Vercel, 27-oct → 3-nov)

| Grupo | Ocurrencias | Usuarios | Comentario |
|---|---|---|---|
| «Connection terminated due to connection timeout» (Better Auth al leer la sesión) | 1.585 | 29 | Sigue activo (último: 3-nov 02:21 UTC) |
| P2028 / transacción expirada (Better Auth) | 629 | 19 | Último: 2-nov |
| «timeout exceeded when trying to connect» | 521 + 172 | 12 + 11 | Activo |
| `[capacidad] error_interno` (Prisma; por ejemplo `nomina.periodos.listar`, `core.roles.list`, `core.actividad.list`) | 390 | 19 | Mismo origen: conexión |
| `CargaFallida` en pantallas de Configuración | 85 | 7 | Mismo origen |
| `/finanzas/flujo`: se pasa una función (`celda`) a un componente cliente | 11 | 4 | Último: 2-nov 05:33; probablemente corregido por #219 (verificar) |
| `/invitacion/[slug]/[token]`: `Date.now()` durante el prerender | 1 | 1 | Bajo |
| Aviso `pg`: `client.query()` concurrente en un mismo cliente | 159 | 39 | Se vuelve error en pg 9 |

**Antecedente:** #193 (CAR-50) ya dejó la lectura de sesión del hot path en una consulta en vez de dos, y #134–#142 ajustaron el pool. Los errores siguen después de eso.

**Causa probable:** cada request (incluidas las precargas RSC de la navegación) abre una lectura de sesión en la base. Better Auth no tiene `cookieCache` (`packages/auth/src/auth.ts:51`). El pool es de 10 conexiones por instancia, con 10 s de espera, y la compute de Neon se suspende.

**Propuesta (PR `fix/` de la semana 1):**
1. `session.cookieCache` con `maxAge` corto (por ejemplo, 60 s). Es una decisión de seguridad: una sesión revocada seguiría válida hasta 60 s. **La decide Carlos.**
2. Confirmar en Neon que `DATABASE_URL` usa el host `-pooler` y revisar la suspensión automática de la compute de `main`.
3. Medir las precargas por navegación.

### 4.2 Bugs de pantalla (por código y capturas; confirmar en vivo)

| # | Sev. | Bug | Cómo reproducir | Archivo probable |
|---|---|---|---|---|
| B1 | Alta | La barra de acciones de Ventas › Nuevo queda bajo la barra inferior en el teléfono: no se puede tocar «Guardar borrador» | 375 px › Finanzas › Ventas › Nuevo | `finanzas/ventas/nuevo/formulario-emitir.tsx:145` — **corregido en este PR** |
| B2 | Media | Clases inexistentes: `t-h2`/`t-h3` (la venta mensual de la cotización sale en 16 px normal) y `text-muted`/`text-muted-foreground` (texto sin gris) | Ficha de Cotización, Biblioteca CPQ, Bancos, Configuración › Remuneraciones | `cotizaciones/[id]/_componentes/resumen-cotizacion.tsx:81`, `semaforo-margen-cpq.tsx:25`, `pagina-armador.tsx:51`, `pagina-biblioteca.tsx:23`, `finanzas/bancos/_componentes/*`, `configuracion/remuneraciones/*` |
| B3 | Media | Los montos se cortan entre «$» y la cifra (espacio normal en lugar de irrompible) | 375 px › Negocios (subtítulo), tarjeta del kanban en 1280 | `packages/domain/src/dinero.ts:78` y sus copias locales |
| B4 | Media | Finanzas muestra estados sin traducir («aceptado», «pagada», «cedido») y la pestaña del navegador muestra un id | Finanzas › Ventas (lista y ficha) | `finanzas/ventas/[id]/page.tsx:32,64,85,89`; `lista-ventas.tsx:132,141` |
| B5 | Media | Referencias internas visibles («ADR-032», «CAR-96», «CAR-136», «en este PR») | Agentes › Conectar; Pauta › Refuerzo/Reemplazo; Flujo bajo umbral; Aprobaciones | `configuracion/agentes/conectar/page.tsx:89`, `form-agente.tsx:80`, `hoja-refuerzo.tsx:105`, `hoja-reemplazo.tsx:151`, `planilla-flujo*.tsx`, `detalle-aprobacion.tsx:25` |
| B6 | Media | Jerga visible: «tenant», «scopes», «slug», «Payload», ids de capacidad, `cpq:costos.ver` | Rondas › punto; Configuración › Empresa; Agentes; Auditoría; Aprobaciones; ficha CPQ sin permiso | `hoja-punto.tsx:79`, `campos-punto.tsx:55`, `configuracion/empresa/page.tsx:31`, `auditoria/*`, `aprobaciones/detalle-aprobacion.tsx:37,56`, `resumen-cotizacion.tsx:93` |
| B7 | Media | Mensajes de error del servidor pintados tal cual («Input inválido.», «La capacidad "x"…») | Forzar un error en Comunicaciones › vista previa, Usuarios › excepciones, selector de negocio | `_components/use-capacidad.ts:41` (mapear el código de error a un texto de negocio) |
| B8 | Baja | Título «Error del servidor» sin guía | Subir una cartola con error | `hoja-subir-cartola.tsx:93`, `hoja-subir-caf.tsx:86`, `hoja-mover.tsx:107`, `hoja-celda.tsx:98` |
| B9 | Baja | Textos en inglés: «Owner/Admin», «Owners», «Campanita in-app», «Track ID» | Plataforma › Empresa; Configuración › Finanzas | `resumen-tenant.tsx:100`, `administradores-tab.tsx:85`, `editor-flujo-caja.tsx:109` |
| B10 | Baja | El calendario de pagos se edita como JSON | Configuración › Módulos › Finanzas | `configuracion/_finanzas/editor-flujo-caja.tsx:131` |
| B11 | Baja | Título duplicado y enlace «← Volver» casero | Bancos y ficha de Venta en 1280 | `pantalla-bancos.tsx:68`, `ventas/[id]/page.tsx:55-60` |
| B12 | Baja | La Bandeja de Inicio queda como skeleton en las capturas de QA | Inicio en 1280 y 375 | `(erp)/_componentes/bandeja-diferida.tsx` (verificar en vivo; puede ser el corte de conexión de §4.1) |

**Pantalla ↔ MCP:**
- Lo que se hace en pantalla está en MCP (0 faltantes).
- Al revés, 89 capacidades no tienen pantalla; las que más se notan están en §1.2.
- Hay que corregir el detector para que vea `platform.trabajos.reintentar`.
- `app/verificar/[token]/page.tsx` sigue leyendo la base sin capacidad (deuda declarada).

### 4.3 Hallazgos de QA sin cierre
- Los pendientes del 29 y 30-oct (toast sobre la barra entre 601 y 767 px, mapa «Sin ubicación») ya están resueltos en el código; se quitan de `ESTADO.md`.
- `qa/cpq-ficha-v1/README.md` cita una captura que no está en el repo.

---

## 5. Peso y salud del código

Mediciones en una máquina de 2 vCPU y 7 GB. [M] = medido, [E] = estimado.

| Hallazgo | Dato |
|---|---|
| `pnpm test` estaba **rojo en `main`**: 5 fallos (paridad del formulario web de #224 y etiquetas RAT de #223) | **Corregido en este PR** [M] |
| CI de GitHub: todas las corridas de `main` desde el 31-oct terminan en `startup_failure` | Hoy solo valida Vercel [M] |
| `pnpm typecheck` y `next build` se quedan sin memoria con 7 GB: TypeScript de `apps/web` usa 2,65 GB (3.966 archivos; el cliente Prisma generado tiene 341 mil líneas) y Next repite el typecheck dentro del build | [M] |
| `pnpm test`: 3 min 59 s; 2.193 tests | [M] |
| JS por ruta: las 142 rutas están dentro del tope, pero 45 quedan a menos de 2 KB de él; el framework compartido ocupa 130,3 KB de 132 | [M] |
| Topes de JS: 22 subidas en 10 días; `porDefecto` pasó de ~160 a 165 KB | [M, historial] |
| Ninguna librería de servidor llega al cliente (exceljs, node-forge, Prisma) | [M]. Riesgo: exceljs entra por el barrel `@opai/domain`, que importan 19 componentes cliente |
| 21 dependencias declaradas sin uso, todas del scaffold de módulos | [M] |
| Versiones duplicadas: react-dom 19.3.0/19.3.1, dos instancias de next, zod 4.1/4.6 | [M] |
| Código muerto: 4 archivos huérfanos (154 líneas), 6 salidas `modules/*/ui` sin uso, `proveedor-stub.ts`, `cierre-ui.ts`, `pdf-propuesta.ts` | [M] |
| Duplicación literal: 0,16 %. La deuda está en los formateadores: 5 copias de fecha dd-mm-aaaa, 6 de CLP con signos negativos distintos, 35 `toLocaleString("es-CL")` sueltos y 14 pares de componentes con el mismo nombre | [M] |
| Consultas N+1: 47 bucles. Los peores: alertas de pauta (2–3 consultas por puesto, cuando ya existe `cargarMes` en lote), importación CSV del flujo (4 consultas y una transacción por fila), importación de compras, montos de cargo por instalación, cadena de versiones de documentos (hasta 50 consultas) | [M] |
| Arquitectura: Finanzas tiene la mitad de su lógica en `modules/finanzas` y la otra mitad en `packages/capabilities/src/finanzas`; Nómina, Pauta, Rondas y Comercial tienen el módulo casi vacío | [M] |

**Recortes propuestos, por impacto:**

| # | Acción | Esfuerzo |
|---|---|---|
| R1 | Tests en verde (hecho en este PR) y revisar el `startup_failure` de Actions (lo resuelve Carlos o el operador en GitHub) | S |
| R2 | `NODE_OPTIONS=--max-old-space-size=4096` en `typecheck` y `build`, y `typescript.ignoreBuildErrors` en `next.config.ts` (el CI ya hace typecheck): ~50 s menos y sin falta de memoria [E] | S |
| R3 | Consultas en lote en los cuatro N+1 peores. Las alertas pasan de unas 90 consultas a 3 [E] y un CSV de 500 filas, de unas 2.000 a menos de 10 [E] | M |
| R4 | Un solo módulo de formato en `@opai/domain` (fecha, CLP, hoy en Chile); arregla de paso el bug B3 | S–M |
| R5 | Borrar los huérfanos, los `modules/*/ui` vacíos, `proveedor-stub.ts` y los restos del cierre semanal: ~330 líneas | S |
| R6 | Quitar las dependencias sin uso y corregir el scaffold | S |
| R7 | `pnpm.overrides` para react-dom y zod, y next/react como peer en auth | S |
| R8 | Unificar las listas «split», `cambiar-password`, `modelos-ia`, `hoja-vinculo`, el uploader CSV y el bloque de 58 líneas de contactos: ~300 líneas | M |
| R9 | Congelar los topes de JS (no subir sin un recorte equivalente) y bajar `porDefecto` a 162 KB, difiriendo los editores de Configuración | M |
| R10 | Imports del cliente desde subrutas de `@opai/domain` en lugar del barrel | S |
| R11 | Mediano plazo: cada módulo en un solo lugar | L |

---

## 6. Arreglos triviales incluidos en este PR (aparte del informe)

1. **Gate de paridad en verde:** la ruta pública del formulario web (#224) queda en la lista de infraestructura de `apps/web/paridad-permitidos.json`, con su motivo. Es el mismo patrón que invitación y firma por enlace: sin sesión, el tenant se resuelve por slug y la clave del canal hace de credencial.
2. **Inventario RAT en verde:** etiquetas legibles para `giro`, `ciudad` y `email_dte` (datos tributarios de la cuenta, #223) en `packages/domain/src/etiquetas-datos-personales.ts`.
3. **B1:** la barra de acciones móvil de Ventas › Nuevo queda por encima de la barra inferior y respeta la safe-area. Es el mismo patrón que Instalaciones › Nueva.

---

## 7. Issues propuestos para Linear (equipo CAR)

**Aplicados en Linear (3-nov-2026):**
- Creado **CAR-151** (este encargo).
- Creados los issues del plan, uno por PR: **CAR-152** (P1) a **CAR-161** (P10). Ver `ROADMAP.md` §3.
- **CAR-75** cerrado como hecho (Rondas PR 1 integrado en #137, #141 y #145).

**Propuestos, sin aplicar** (el sistema no permitió más cambios de estado; Carlos decide):
- Cerrar **CAR-138** como duplicado de CAR-144 (la propuesta técnica ya entró en #218).
- Cerrar **CAR-129** («Míralo», resuelto por CAR-130).
- Pasar **CAR-98** a Backlog: solo entró Compras (#186); rendiciones y contabilidad no empezaron.
- CAR-103 a CAR-118 son tareas del sitio web y otros frentes (Search Console, GA4, fotos, GTM, Cursor) mezcladas en el equipo CAR. Conviene moverlas a su propio proyecto para que no ensucien el tablero de OPAI 2.0.
- CAR-120 (chat del agente) sigue en pausa hasta la semana 3 (ver el plan); pasar de «In Progress» a «Todo».
- CAR-27 (Comercial PR 3: reportes, exportación, campos, fusión) se fusiona con el issue nuevo de reportes comerciales y la fusión de duplicados.
- CAR-54 y el PR #168 (restablecer MFA) se retoman después de la semana 2 con un merge de `main`.
- CAR-56 (revocar la key `*` de Gard) sigue sin evidencia: es una acción de Carlos.
