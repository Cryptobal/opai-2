# ROADMAP — OPAI 2.0

**Actualizado:** 3-nov-2026 (CAR-151, después de la [auditoría profunda](auditoria-2026-11.md); §6 agregada por la [auditoría de Finanzas y Rendiciones](auditoria-finanzas-rendiciones-2026-11.md)). El plan anterior por fases, hasta el 29-oct, está en [ROADMAP-archivo.md](ROADMAP-archivo.md). El estado real vive en [ESTADO.md](ESTADO.md), que cada PR actualiza (ADR-054). Linear (equipo CAR) es la referencia de tareas.

**Objetivo de las próximas dos semanas:** dejar Comercial y Finanzas listos para **migrar Gard desde 1.0**: cuentas con datos tributarios, contactos, instalaciones, negocios, cotizaciones y facturación recurrente, y que una factura real salga de 2.0. Operaciones viene después.

**Reglas del plan:**
- PR chicos y secuenciales: un brief por PR, dentro del PR.
- Las migraciones son aditivas y las aplica el operador con respaldo.
- Ningún PR se integra con `migracion-pendiente` puesta (ADR-043 v3, ADR-054). Esto se rompió diez veces (#181 y nueve PR entre el 1 y el 3-nov).
- Las fechas son estimaciones para un constructor (Claude) con revisión por bots y decisiones de Carlos a tiempo.

## 1. Ciclo de cada módulo (ADR-047)

Extracción de 1.0 → especificación → aprobación de Carlos → Design Prompt y diseño aprobado en Claude Design (con el DS de 2.0) → brief → PR → revisión (una pasada; solo bloquea por seguridad, migraciones o datos) → integración con squash por el operador → QA en vivo después de integrar → pendientes en un PR aparte. Las bases transversales (rendimiento ADR-045, PWA ADR-044, navegación ADR-046 y `NAVEGACION.md`) aplican a todo brief con pantallas.

## 2. Antes de construir (prerrequisitos, no son PR)

| # | Qué | Quién | Por qué |
|---|---|---|---|
| O1 | Aplicar en Neon `dev` y `main`, con respaldo, los 13 PR integrados (15 migraciones) sin evidencia de aplicación (lista en [auditoría §1.3](auditoria-2026-11.md#13-migraciones-recientes-y-su-evidencia-de-aplicación)), verificarlas y retirar `migracion-pendiente` de cada PR | Operador «OPAI 2.0» | Sin ellas, Ventas DTE, CAF, propuesta técnica, formulario web y canal agente corren contra tablas que pueden no existir |
| O2 | Revisar por qué GitHub Actions termina en `startup_failure` en todas las corridas desde el 31-oct | Carlos / operador | Mientras tanto basta el OK de Vercel, pero el gate de tests no corre |
| O3 | Decisiones de la §5 | Carlos | P1, P3, P6 y P7 dependen de ellas |

## 3. Plan de las próximas dos semanas

### Semana 1 (3 al 7 de noviembre) — estabilidad, factura real y SII

| PR | Rama sugerida | Alcance | Migración | Depende de |
|---|---|---|---|---|
| **P0** · CAR-151 | `docs/car-151-auditoria-2026-11` | Esta auditoría, ESTADO limpio y plan; tests de `main` en verde; bug B1 | No | — |
| **P1** · CAR-152 | `fix/conexiones-neon` | Cortes de conexión con Neon (1.585 errores en 7 días): `cookieCache` de sesión en Better Auth, confirmar el host `-pooler` y la suspensión de la compute, medir las precargas por navegación, corregir el `client.query()` concurrente | No | **D1 aceptada (3-nov-2026): `cookieCache` 60 s** |
| **P2** · CAR-153 | `qa/textos-y-estilos` | Bugs B2–B9 y B11: clases inexistentes, montos que se cortan, estados de Finanzas traducidos, sin referencias internas ni jerga, errores de negocio en lugar de mensajes crudos; formateador único de CLP y fecha (R4) | No | — |
| **P3** · CAR-154 | `brief/finanzas-simpleapi-real` | Portar los adaptadores **SimpleAPI y Octava de 1.0** (pieza aislada, con revisión) detrás de `AdaptadorSii`; payload completo (detalle de líneas, CAF del rango, referencias OC/HES, resolución SII del emisor); NC con el adaptador del tenant; preflight de emisión; test de contrato con respuestas grabadas de certificación | Sí, aditiva (resolución SII y referencias en borrador) | O1; D5 para probar contra certificación |
| **P4** · CAR-155 | `brief/finanzas-ficha-venta` | Ficha de venta con acciones (enviar al SII, PDF, NC, ceder); pantalla **Configuración DTE** con fuente única de ambiente y checklist de producción; **envío del DTE al cliente** (PDF + XML por Comunicaciones, a los contactos con rol facturación) | Posible, aditiva (registro de envíos) | P3 |
| **P5** · CAR-156 | `brief/comercial-consulta-sii` | `consultarContribuyente(rut)` en el adaptador; capacidades `core.cuentas.consultar_sii` (lectura) y `aplicar_sii` (diff por campo, dryRun) con su MCP; consulta en cola y cacheada; indicador «lista para facturar» en lista y ficha de cuenta | Sí, aditiva (caché por RUT) | P3 |
| Diseño | — | Design Prompt «DS 2.0 · refresco visual v1.1» (C1, C3 y C4 de la auditoría) para Claude Design | — | Carlos aprueba |

### Semana 2 (10 al 14 de noviembre) — migración de Gard

| PR | Rama sugerida | Alcance | Migración | Depende de |
|---|---|---|---|---|
| **#231** (abierto) | la suya | **Corregirlo antes de integrar**: líneas con cantidad, moneda, UF, descuento y exención; frecuencias de 1.0 omitidas con aviso, sin hacer fallar el JSON; cuenta resuelta por el RUT del receptor; receptor, IPC y política UF; **importar inactivas hasta el corte**; correlativo CPQ dentro de la corrida; poner `migracion-pendiente` | Sí (`20261103140000`) | O1 |
| **P6** · CAR-157 | `brief/importador-1-0-v2` | Importador seguro: estados de cuentas e instalaciones; «solo completar vacíos» y bloqueo después del corte; sin rellenar la razón social; responsable, representantes, personería, roles de cobro, región, geocerca y vigencias; **corridas identificadas con reversión**, lotes y conciliación (conteos y sumas de control) | Sí, aditiva (`core.importaciones`) | #231 |
| **P7** · CAR-158 | `brief/exportador-opai-1` | Exportador de 1.0 **de solo lectura** con contrato JSON versionado: deriva `emailDte` del último DTE aceptado, estados y plantillas recurrentes reales; negocios con monto, probabilidad, responsable y fechas; tabla de equivalencia de etapas; actividades con su fecha; cotizaciones vigentes y ganadas como versiones congeladas | No | D3, D4 |
| **P8** · CAR-159 | `brief/finanzas-recurrentes` | Programaciones de facturación: crear, editar y pausar; trabajo diario que genera **borradores** idempotentes por período; líneas en UF con la UF del SII; destinatarios usados en el envío | Sí, aditiva (moneda y UF en líneas) | #231, P3 |
| **P9** · CAR-160 | `brief/comercial-seguimiento` | Seguimiento de cotizaciones PR 1 (CAR-67): cadencia por tenant en días hábiles, pasos (persona u OPAI), inicio al enviar la cotización, pausa manual y por respuesta registrada, tareas en la bandeja | Sí, aditiva | — |
| **P10** · CAR-161 | `perf/salud-codigo` | R2 (heap y sin typecheck repetido en el build), R3 (N+1 de alertas de pauta e importación de flujo), R5 (código muerto), R6 (dependencias del scaffold), R7 (versiones duplicadas) | No | — |
| Ensayo | — | **Ensayo general de la migración en una rama de Neon**: simular → aplicar → conciliar → revertir → reaplicar; muestra de 20 cuentas revisada por Carlos | — | P6, P7, #231 |

**Al terminar la semana 2:** si el ensayo cuadra, Carlos fija la fecha de corte y el operador aplica en el tenant real con respaldo. Gard empieza a operar Comercial y la facturación en 2.0, primero en paralelo con 1.0 y con la emisión de 1.0 apagada desde la fecha de corte.

### Semana 3 en adelante (orden propuesto)

1. **Refresco visual del DS** (C1, C3, C4; luego C2 y C5) con el diseño aprobado.
2. **Comercial:** notas y tareas en las fichas, etiquetas, archivar contacto; correo entrante; acuse de apertura de la propuesta; reportes («Comercial › Resultados») y fusión de duplicados (CAR-27); condiciones comerciales estructuradas que generen la recurrente al ganar.
3. **Finanzas y Rendiciones:** ver §6, que reemplaza este punto.
4. **CAR-120 · chat del agente interno (GrowthBot dentro de la app):** dos PR sobre `modules/agente`, que ya tiene el backend completo (ADR-049, diseño aprobado en #176). Es un servicio pagado aparte por tenant: no bloquea la migración, por eso va después. Licencia por tenant y precio según ADR-058.
5. **Operaciones:** portal Terreno con la ejecución de Rondas, supervisión y visitas, turnos extra; retomar #213 (Cargos y Remuneraciones) con un merge de `main`.
6. **Núcleo:** retomar #168 (restablecer MFA) con un merge de `main`; capacidad pública para `/verificar/[token]`.

## 4. Qué pausar y qué descartar

**En pausa hasta cerrar la migración de Gard:**
- Central de monitoreo (CAR-85), Control de acceso (CAR-122), Portal Cliente PR 2, Licitaciones (CAR-93), Firma FEA (CAR-94).
- Cálculo de Nómina y Previred (CAR-99), Asistencia y DT (CAR-89), empaquetado nativo (CAR-90).
- PR #213 (en conflicto y con Vercel en rojo) y PR #168: se retoman con un merge de `main`, sin rebase.

**Descartar:**
- `modules/*/ui` vacíos y restos del cierre semanal del flujo (se borran en P10).
- `cpq.cotizaciones.enviar` legacy, una vez confirmado que ningún agente la usa.
- «Fintoc» como paridad con 1.0: en 1.0 no existe una integración real. Queda como mejora con proveedor por decidir.

## 5. Decisiones que necesita Carlos

| # | Decisión | Bloquea |
|---|---|---|
| D1 | ¿Se acepta que una sesión revocada siga válida hasta 60 s a cambio de quitar una consulta a la base por request (`cookieCache` de Better Auth)? | **Sí (3-nov-2026)** · PR CAR-152 |
| D2 | Confirmar con el operador qué migraciones están aplicadas en Neon, y que desde ahora no se integra nada con `migracion-pendiente` puesta | P3 y todo lo que sigue |
| D3 | Cómo se leen los datos de 1.0 para la migración: un rol de **solo lectura** en la base de 1.0 o una key de solo lectura de su API | P7 |
| D4 | **Fecha de corte** con 1.0 para facturación (folios y recurrentes) y para Comercial; tabla de equivalencia de etapas del embudo | P7, ensayo, emisión real |
| D5 | Cargar en Configuración › Integraciones la API key de SimpleAPI, el `.pfx` con su clave y el RUT emisor; cargar el CAF real; pedir el set de certificación del SII si hace falta | Emisión real después de P3 y P4 |
| D6 | Aprobar el Design Prompt del refresco visual y elegir los 3 o 4 indicadores de Inicio | Refresco del DS |
| D7 | Confirmar que CAR-120 (chat del agente) va en la semana 3, después de la migración, y su precio como servicio aparte | CAR-120 |
| D8 | Mover a otro proyecto de Linear las tareas CAR-103 a CAR-118, que no son de OPAI 2.0 | Orden del tablero |

## 6. Finanzas y Rendiciones (plan del 3-nov)

Sale de la [auditoría de Finanzas y Rendiciones](auditoria-finanzas-rendiciones-2026-11.md) (§6 del informe tiene el detalle). P3 y la parte de configuración de P4 quedaron hechos en #234; P8 se reparte en F3. Orden: primero lo que bloquea el corte de Gard, después contabilidad e informes. Rendiciones va en paralelo, como módulo propio sin dependencia de Finanzas.

| # | Alcance | Migración | Depende de |
|---|---|---|---|
| **O-1** (operador, CAR-164) | Aplicar `20261103160000` con respaldo y avisar en #235 (arregla F-B1); renombrar el prefijo de la migración de #237 | — | — |
| **F1** (CAR-165) | Pulido: proveedor creable desde la compra, estados vacíos con acción, textos, menú sin Configuración DTE ni Folios, esqueletos de ruta, hojas del flujo con carga diferida | No | — |
| **F2** (CAR-155) | Ficha de venta con acciones (PDF, SII, NC total o parcial, ceder) y envío del DTE al cliente | Sí | — |
| **F3** (CAR-159) | Programaciones: crear, editar y pausar; borradores por corrida; UF del SII; activación desde la fecha de corte; proyección en el flujo | No | O-1 |
| **F4** (CAR-166) | Cobranza: vencimiento, aging, recordatorios con feriados; «Hoy en Finanzas» | Sí | F2 |
| **F5** (CAR-167) | Cierre de mes: emisión en lote con una aprobación; EP/proforma | Sí | F3 |
| **F6** (CAR-168) | Saldos de apertura, cuentas por cobrar abiertas y último folio por tipo desde 1.0 | Sí | #237 |
| **F7** (CAR-169) | Banca: reglas y cobro manual en pantalla, conciliación N:M | Sí | F6 |
| **F8** (CAR-170) | Unificar capacidades en `modules/finanzas`, casos «dos empresas» faltantes (programación, NC, cesión), seed de QA | No | F2, F3 |
| **C1–C2** (CAR-171, CAR-172) | Asientos y períodos; apertura y asientos automáticos por evento | Sí | Después del corte; C2 depende de F6 |
| **I1–I2** (CAR-173, CAR-174) | Libros con IVA (base F29), cobranza; EERR, balance, mayor y rentabilidad por instalación | No | F4; C2 |
| **R1–R5** (CAR-175 a CAR-179) | Rendiciones: base y MCP; solicitante (ERP y Portal Trabajador); aprobador; lotes de pago con evento hacia Finanzas; reporte y configuración | R1 y R4 | Hoja de alcance y Propuesta B (Carlos) |

**Corte de Gard en Finanzas:** O-1 + F2 + F3 + F4 + F6, más D4 y D5. Contabilidad e informes pueden quedar un mes más en 1.0, en solo lectura. **Pausa:** factoring y landing de cobro hasta después de F4. **Cerrar:** #231.
