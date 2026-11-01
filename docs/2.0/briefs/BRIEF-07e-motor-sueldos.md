# BRIEF DE IMPLEMENTACIÓN — 07e MOTOR DE SUELDOS (Núcleo)

**Repositorio:** `Cryptobal/opai-2` · **Rama de ejecución:** `brief/07e-motor-sueldos` (desde `main` actualizado; sucesora de este PR #126, que es solo de documentación) · **Fecha:** 29-oct-2026 · **Estado:** **M1 autorizado para construcción en el encargo del 1-nov-2026**; fuentes y pendientes abajo · **Tarea de Linear:** CAR-71 (`Refs CAR-71` en M1, sin cerrar la tarea) · **ADR:** ADR-056 (completa ADR-036 y ADR-048; modifica ADR-042 punto 4 y la fase 6 de `ROADMAP.md`).

> **Especificación:** [`modulos/motor-sueldos.md`](../modulos/motor-sueldos.md), **aprobada por Carlos el 29-oct-2026** (las 18 decisiones de su §16). **Diseño:** [`design/DESIGN-PROMPT-motor-sueldos.md`](../design/DESIGN-PROMPT-motor-sueldos.md), con el mockup **v2 aprobado** (Decisión de Carlos, 29-oct-2026 16:23 CLT, chat con OPAI 2.0, registrada por el bot OPAI 2.0), export copiado en [`diseño/export-motor-sueldos/`](../diseño/export-motor-sueldos/README.md). El Design Prompt original queda vigente en su contenido (una sola página de valores, sin segunda firma, ya la refleja); los 6 ajustes que el mockup v2 todavía no corrige quedan como criterios de aceptación de este brief (§6). **Reglas:** `AGENTS.md`, `REGLAS-codigo.md`, ADR-004/ADR-034/ADR-055 (paridad UI↔MCP, gobierno de agentes, agent-first sin excepciones), ADR-014/ADR-017 (DS 2.0), ADR-016 (bloqueo financiero de montos), ADR-021 (configuración versionada), ADR-022 (alcance en la consulta), ADR-029 (eventos y trabajos por outbox), ADR-031 (consumos medidos), ADR-036 y ADR-048 (capas de sueldo, módulos vendibles), ADR-037/ADR-045 (presupuesto de JS y rendimiento).

---

## 1. Objetivo

Construir el servicio del Núcleo que calcula el **costo empresa** (por persona, puesto, día y hora) desde el sueldo bruto de una capa (ADR-036) o un sueldo a mano, con los **indicadores legales** al día (UF, UTM, ingreso mínimo, topes, AFP, SIS, cesantía, mutual, reforma, gratificación, impuesto único) y las **variables propias de cada tenant**, todo versionado por vigencia (§1 de la especificación). Es el **único cálculo** que usarán CPQ (Brief 08/10) y, más adelante, Nómina (Briefs 25/26): el motor no depende de ninguno de los dos (ADR-048).

**1.0 es el piso en capacidades, no en reglas** (como en el resto del plan): se igualan las funciones que 1.0 ya tiene (simulador, costo por turno, parámetros legales), pero las reglas de cálculo se corrigen donde 1.0 está mal (§11 y anexo A de la especificación: SIS, provisiones, colación/movilización en CPQ, horas extra, impuesto en UTM). **Todo lo automático de este motor se configura por tenant**: cada indicador sigue su fuente o pasa a ser «propio» de la empresa (R15); cada variable tiene su plantilla por vertical pero se edita por tenant (R10, R11); nada queda fijo en el código (R8, anexo A: «sin respaldos fijos»).

**DS de OPAI 2.0, siempre:** tokens, componentes y tipografía del DS v2 (`@opai/ds`); **nunca** el estilo de 1.0 ni medidas en px crudas. Toda pantalla nueva se prueba a **375, 1024 y 1280 px**, **claro y oscuro**, con los cuatro estados obligatorios (**cargando, vacío con acción, error con «Reintentar», sin permisos**) además de los propios de cada hoja (vista previa, confirmando, éxito, error de regla, pendiente de aprobación — §5 del Design Prompt).

Se nota que funciona cuando: (1) los 6 casos dorados de §13 de la especificación cuadran al peso con 1.0 o con la diferencia explicada por regla; (2) ninguna cotización se envía con un indicador atrasado sin que el vendedor lo vea (lo construye CPQ sobre el evento `core.remuneraciones.valores_vigentes`, R22–R25, fuera de este brief); (3) cero cargas manuales de UF/UTM en el mes.

## 2. Estado actual del repo (verificado el 29-oct-2026 sobre `main`, `960112eb`)

Las cuatro dependencias que cita la especificación (§15) **ya están integradas en `main`**; no hay bloqueo de construcción por dependencias de código.

1. **Capas de sueldo y anexo (Brief 07b, CAR-19): en `main`.** `packages/domain/src/estructuras.ts` resuelve **sin herencia** `instalación → puesto → persona` y devuelve la capa y el nivel que rigió (`Resolucion`, `NivelEstructura`). `core.estructuras_sueldo` (`maestros.prisma`) tiene la capa `instalacion` (`instalacionId`), `core.vinculos_laborales` tiene `instalacionId`, `puestoId` (opcional) y la **jornada pactada** (`horasSemanales`, `distribucion`); `core.anexos_contrato` (`anexos.prisma`) genera el borrador del anexo por evento. El motor **lee** esta resolución (R21, R28); no la modifica.
2. **Puestos y catálogo de patrones (Brief 11 PR1, CAR-8): en `main`.** `core.patrones_turno` (`puestos.prisma`) tiene los 6 patrones de fábrica (4×4, 7×7, 14×14, 5×2, 2×5, 3×4) con `diasTrabajo`/`diasDescanso`/`diasSemana`; `packages/domain/src/turnos.ts` ya calcula `horasSemanalesSugeridas` desde el patrón y el horario del puesto. El motor **reutiliza** este catálogo para R18 (costo por turno); no crea un catálogo propio.
3. **Núcleo base (Brief 02): en `main`.** `defineCapability`, `executeCapability`, `ctx.transaccion`, `ctx.eventos`, `ctx.medidor`, `auditarLectura`, `core.documentos.*`, `core.aprobaciones.*` y el registro de capacidades/consumidores/trabajos (`apps/web/lib/registro.ts`) ya existen y se reutilizan tal cual.
4. **ADR-048 (módulos vendibles por separado): vigente**, sin código propio — es la regla que ya aplica el diseño (el motor no lee tablas de CPQ, R13; CPQ consume el evento `core.remuneraciones.valores_vigentes`).

**No existe todavía** ningún código del motor: ni `core.remuneraciones.*` (capacidades, permisos, ajustes), ni `packages/domain/src/remuneraciones/` (cálculo puro), ni las tablas de indicadores/valores/variables, ni las pantallas de Configuración → Remuneraciones ni el Simulador. `extraccion/nomina.md` sigue sin existir en `main` (la referencia de 1.0 es su código de payroll leído directamente, `Cryptobal/opai` `40d19a5`, anexo A de la especificación).

**Permisos:** no existe la familia `core:remuneraciones.*` (verificado en `packages/domain/src/permisos-catalogo.ts`); se agrega siguiendo el mismo patrón que `core:patrones.*`/`core:funciones.*` (read/manage separados; `.aprobar` y `.retroactivo` como permisos finos adicionales, §7 de la especificación). El rol personalizado que delega `core:remuneraciones.manage` (decisión 4) usa el mecanismo de roles personalizados del Brief 07c, ya integrado en `main`.

**Migraciones:** la última en `main` es `20261029010000_identidad_rol_auth`; las migraciones de este brief usan timestamps posteriores (`202610290200xx` en adelante, confirmando `ls packages/db/prisma/migrations` al ejecutar cada PR).

## 3. Alcance

### Incluido

- **Dominio puro** (`packages/domain/src/remuneraciones/`): catálogo de indicadores, cálculo de costo empresa paso a paso (R17), costo por turno (R18), horas extra (R19), jornada parcial (R20), valor anómalo (R7), resolución de un juego de valores a una fecha (R8). Sin base de datos, sin Next, sin Prisma (regla de dominio puro).
- **Datos de plataforma** (sin `tenant_id`, solo lectura para `opai_app`, los escribe solo el trabajo de captura): catálogo de indicadores legales, valores publicados y capturas (R1–R4, R6, R9).
- **Datos del tenant** (con `tenant_id` y RLS `tenant_isolation`): valor del tenant por indicador, variable del tenant, valor de variable, simulación guardada, juego de valores con huella (R5, R10–R15, R21).
- **Trabajo diario de captura** (ADR-029: cron encola, trabajo ejecuta) para UF y UTM (Banco Central) con SII como contraste; semiautomático para tasas y topes (Superintendencia de Pensiones/Previred); carga de valores futuros conocidos (reforma, 40 horas) (R2–R4).
- **Capacidades** de la tabla §9 de la especificación, con paridad MCP, `dryRun`/`preview_…`, `idempotencyKey` y auditoría; permisos nuevos `core:remuneraciones.{read,manage,simular,aprobar,retroactivo}`.
- **Pantallas** de la tabla §3 de la especificación (Configuración → Remuneraciones con sus dos pestañas, Simulador, Plataforma → Fuentes, Bandeja/Avisos), con el DS 2.0 y los 6 ajustes del mockup v2 resueltos (§6).
- Entrada «Simular costo» / «Simular con esta capa» en Personas → Cargos y sueldos, y «Simular costo de un puesto» / «Ver indicadores vigentes» en ⌘K (navegación §2 del Design Prompt).
- Los 6 casos dorados (GC-A a GC-F) y el costo por turno de §13 de la especificación, como tests del dominio y de capacidades.

### Excluido (otros briefs o fuera de alcance)

- **R22–R25 (efecto en cotizaciones: `AvisoRecalculo` dentro de una cotización, recalcular, congelar al enviar):** los implementa **CPQ** como consumidor de `core.remuneraciones.valores_vigentes` (Brief 08/10). Este brief diseña y construye `AvisoRecalculo` **aislado** (Componentes y Avisos del Design Prompt §3 y §4.8), listo para que CPQ lo reutilice; no hay cotizaciones que recalcular todavía.
- **Nómina** (liquidación real, impuesto único real, reliquidaciones, finiquitos, contador acumulado de vacaciones e indemnización, R20c): Briefs 25/26. El motor entrega la regla; el contador y su historia viven en Nómina.
- **«Copiar como línea de cotización» del simulador:** capacidad de CPQ; aquí el botón queda **deshabilitado** con `Tooltip` «Disponible con CPQ» (§4.6 del Design Prompt), sin capacidad que la respalde todavía.
- **Segunda firma, firma electrónica, editor de plantillas del anexo:** no aplica a este brief (decisión 4 y 5 de Carlos: sin segunda firma en ningún caso del motor).
- **Permisos finos de Operaciones o CPQ, catálogo de patrones nuevo:** se reutiliza el de Puestos (Brief 11); no se crea otro.
- **Cuenta y token del Banco Central (BDE):** los crea Carlos (decisión 3 de la especificación); mientras no existan, el trabajo usa el SII como fuente primaria y mindicador.cl solo como tercer contraste (R9).

## 4. Arquitectura

### 4.1 Datos (nuevo archivo `packages/db/prisma/schema/remuneraciones.prisma`, `@@schema("core")`)

**Plataforma (sin `tenant_id`, sin RLS, solo lectura para `opai_app`; las escribe solo el trabajo de captura con `dbAdmin()` o un rol de trabajo, nunca `apps/web`):**

- `IndicadorLegal`: `clave` (único), `nombre`, `unidad` (`clp | uf | utm | porcentaje | horas`), `periodicidad`, `fuentePrimaria`, `fuenteContraste`, `reglaValidacion` (JSON: rango y variación máxima, R7), `lecturaAutomatica` (boolean).
- `ValorPublicado`: `indicadorId`, `valor` (entero escalado), `vigenteDesde`/`vigenteHasta`, `evidencia` (enlace o documento), `estado` (`vigente | retenido | propuesto`).
- `Captura`: `indicadorId`, fecha y hora del servidor, `fuenteConsultada`, `valorLeido`, `valorVigente`, `diferencia`, `resultado`, `alertaEmitida` — **append-only** (R3).

**Tenant (con `tenant_id`, RLS `tenant_isolation`, triggers de mismo tenant):**

- `ValorTenant`: `tenantId`, `indicadorId`, `valor`, `vigenteDesde`/`vigenteHasta` (sin solapes por indicador y tenant), `motivo`, `evidencia`, `origen` (`sigue_fuente | propio`), `estado` (`propuesto | vigente | retenido | rechazado`), `confirmadoPor`.
- `VariableTenant`: `tenantId`, `clave`, `nombre`, `unidad`, `ambito` (`empresa | instalacion`), `rango` (JSON), `esPersonalizada`.
- `ValorVariable`: `tenantId`, `variableId`, `valor`, `vigenteDesde`, `motivo`, `adjuntoDocumentoId` (FK a `core.documentos`), `estado` (`programado | pendiente_aprobacion | vigente | rechazado | anulado`), `autor` (membresía o agente vía membresía).
- `SimulacionGuardada`: `tenantId`, `nombre`, entrada (capa o sueldo a mano, contrato, patrón, horario, fecha), `resultado` (JSON con la traza), `juegoValoresHuella`.

Migraciones **aditivas**, una por bloque de datos (§5), cada una con `ENABLE/FORCE ROW LEVEL SECURITY` + política `tenant_isolation` para las tablas de tenant (plantilla de `REGLAS-codigo.md`), sin RLS en las de plataforma, y `GRANT USAGE` del schema si hace falta. Toda referencia (variable↔tenant, adjunto↔documento) se valida del mismo tenant por trigger.

### 4.2 Dominio (`packages/domain/src/remuneraciones/`)

- `costo-empresa.ts`: los 7 pasos de R17 (haberes imponibles, no imponibles, bases con tope, aportes del empleador, provisiones «como contabilidad» sin colación/movilización/aportes en la base, costo empresa mensual, líquido estimado con la fila **Impuesto único**).
- `costo-turno.ts`: R18 (personas por puesto, horas semanales promedio, costo del puesto/mes/día/hora), reutilizando `horasSemanalesSugeridas` de `turnos.ts` (Puestos, ya en `main`).
- `horas-extra.ts`: R19 (fórmula legal con la jornada pactada, `base/30×28/(4×jornada)`, nunca `base/30/8×1,5` de 1.0).
- `valores.ts`: `valorAnomalo()` (R7: UF ±1 % diario, UTM ±3 % mensual, tasas ±20 % relativo, IMM solo avisa si baja — **no** «5 % el resto»), `juegoDeValores(fecha, indicadores)` con huella, `sinFuenteNoHayInvento()` (R8).
- Todo puro, sin `@opai/db`, con tests que fijan los 6 casos dorados y el costo por turno de §13 de la especificación.

### 4.3 Capacidades (`packages/capabilities/src/core/remuneraciones/`)

La tabla completa está en §9 de la especificación; se reproduce aquí solo para fijar el plan de PRs (§5). Todas con `dryRun`/`preview_…`, `idempotencyKey` y auditoría (`executeCapability` ya lo aplica). `core.remuneraciones.costo.simular` audita con **el mismo `core.estructuras.read_sensible`** cuando usa una capa (NÚCLEO-H: no se duplica la auditoría sensible existente, se reutiliza `auditarLecturaSensible` de `estructuras-acceso.ts`). Las capacidades de plataforma (`platform.remuneraciones.fuentes.listar`) usan `ctx.plataforma.empresa(id)` con `select` acotado, como el resto de `platform.*` (CAR-40); nunca exponen secretos de integraciones ni payloads.

Paridad: toda capacidad `core.*` nueva produce herramienta MCP; `platform.remuneraciones.fuentes.listar` igual (no es excepción). Snapshot `herramientas-mcp.txt` regenerado al cierre de cada PR con migración/capacidades.

### 4.4 UI

Mapa pantalla → ruta (Design Prompt §2 y §4):

| Pantalla | Ruta | Patrón DS |
|---|---|---|
| Valores (indicadores + variables en una página) | `/configuracion/remuneraciones` | Lista agrupada + `SplitScreen` + `Sheet` «Cambiar valor» |
| Historial | `/configuracion/remuneraciones/historial` | `Timeline` |
| Simulador de costo | `/cargos/simular` (y hoja desde Cargos y sueldos) | Formulario + resumen fijo (`KpiTile`, `Seccion`) |
| Fuentes (plataforma) | `/platform/indicadores` | Estado de fuentes, solo lectura |
| Avisos | Bandeja de Inicio + `AvisoRecalculo` aislado | Ítems de bandeja |

Componentes nuevos del DS (§3 del Design Prompt): `TrazaMonto`, `EstadoFuente`, `CambioValor`, `AvisoRecalculo`; cada uno aparece en `/ds` con sus estados, claro y oscuro, antes de usarse en pantalla (ADR-017). Ninguno se crea si un componente existente ya sirve.

## Plan de construcción revisado (1-nov-2026)

El encargo de Carlos del 1-nov-2026 adelanta el cálculo puro porque bloquea la ficha CPQ
(CAR-134) y el motor CPQ (CAR-133): el costo empleador sale exclusivamente del Núcleo.
El addendum t1243s4984 exige cálculo CPQ solo en servidor, sin enviar costos, costo empleador
ni márgenes al navegador; no cambia la portabilidad del dominio puro.
Este plan reemplaza la distribución histórica de §5. M1 lleva `Refs CAR-71`, nunca cierre.

| PR | Entrega |
|---|---|
| **M1 (este PR)** | Dominio puro de indicadores/vigencias/huella, costo empresa, turno, extra, parcial y contrato CPQ. Sin migración, capacidades ni pantalla. |
| **M2** | Indicadores de plataforma: migración IndicadorLegal/ValorPublicado/Captura sin tenant_id, solo lectura para opai_app; seed verificado, captura diaria, capacidades listar/historial con MCP. |
| **M3** | Valores/variables del tenant con RLS y pantalla de configuración. |
| **M4** | Simulador: `core.remuneraciones.costo.simular`, `read_sensible` y `auditarLecturaSensible` al usar capa, pantalla `/cargos/simular`. |
| **M5** | Plataforma, avisos, paridad, documentación y cierre. |
| Cableado CPQ | Adaptador del puerto después de M1 en main; se construye en CPQ. Nómina PR 2 consume el mismo dominio; liquidaciones/finiquitos siguen en BRIEF-25. |

### Contrato entregado y adaptación a CPQ

`@opai/domain` exporta `ContratoCostoEmpleador`, `EntradaCostoEmpleador`,
`ResultadoCostoEmpleador` y `costoEmpleadorPorPersona(entrada, juego)` síncrono y puro.
Recibe sueldo explícito o capa ya resuelta por `resolverCapasSueldo`/`resolverEstructura`,
sin mezclar niveles; haberes, contrato, AFP, salud, jornada en minutos, adicional mutual,
supuestos contables explícitos y horario/patrón opcional. El resultado entrega costo mensual,
líquido estimado, desglose, traza por monto con indicadores/vigencia, advertencias,
`juegoDeValores`, `huellaJuegoDeValores`, `capaUsada` y `entradaUsada`, copiados y congelados.
`juegoDeValores(fecha, publicaciones)` es async solo por Web Crypto SHA-256; no hace I/O.

El puerto inspeccionado en la rama `feat/cpq-motor-brief08`,
`modules/cpq/domain/motor/tipos.ts`, es **síncrono**:
`obtener({ lineaId, fecha }) → { costoMensualClp, origen } | null`.
El adaptador CPQ resolverá datos autorizados y preparará un mapa de snapshots en servidor:
`costoMensualClp = resultado.costoEmpresaMensualClp`, `origen = resultado.huellaJuegoDeValores`.
Validará fecha/línea y conservará el resultado completo con capa/juego para congelarlo al enviar.
Sin entrada o juego completo devuelve pendiente, nunca costo manual ni cero inventado.
No se importa CPQ ni Nómina desde el Núcleo y no se mergea su rama: es alineación de tipos,
no dependencia de construcción (ADR-048). Sus permisos/auditoría quedan en el adaptador/capacidad.

### Reglas y supuestos de M1

- Los 11 indicadores agrupan AFP/salud, topes (incluido IPS 60 UF como dato, sin cálculo IPS),
  mutual básica/SANNA y tabla de impuesto. Gratificación 25 % / 4,75 IMM reutiliza
  `estructuras.ts`; jornada e IMM entran con vigencia. No hay montos legales de producción.
- Gratificación incluye bonos imponibles mensuales, confirmado por DT (R17); el comportamiento
  de `haberes`/`gratificacionLegal` existente se reutiliza sin alterar otros consumidores.
- SIS 1,78 % se muestra separado y se resta de la reforma total 3,5 % que ya lo incluye.
  El calendario anterior también admite reforma sin SIS incluido. SANNA 0,03 % se muestra explícito.
- CLP enteros; tasas PCT_ESCALA, cantidades UF/UTM UF_ESCALA, UF diaria en centavos.
  `redondearRazonCLP` centraliza el cociente exacto BigInt en `dinero.ts`, misma mitad arriba
  en valor absoluto; redondeo por concepto. El oráculo 1.0 mantiene float/floor solo en tests.
- **Hipótesis de prueba de Codex, no decisión de Carlos:** 21 días corridos de vacaciones/año,
  base vacaciones sin gratificación, base indemnización imponible y probabilidad 100 %.
  No hay defecto en producción: el consumidor debe pasar estos supuestos. Provisiones excluyen
  colación, movilización y aportes; indemnización tope 90 UF y se detiene a 132 meses.
- GC conserva mutual total 1,20 % de la spec: básica 0,90 + SANNA 0,03 + adicional **0,27**.
  Esa adicional es hipótesis `por_verificar`, no tasa de Gard confirmada. Si se ingresa adicional
  0,30, el total es 1,23 % y cambia el costo; hay test que lo distingue.
- Isapre descuenta el plan completo en el líquido; para impuesto deduce hasta el 7 % del
  **tope previsional**, incluyendo adicional (SII Oficio 2406/2016). El estimado usa la UF del
  juego: Nómina debe resolver la UF de cierre legal y datos reales para impuesto definitivo.
- Turnos usan promedio díasMes/ciclo (30 en casos), no redondean personas; cobertura completa
  o días del patrón es explícita. Feriados del modelo comercial los agrega CPQ.
  El contrato por persona también avisa de jornadas excepcionales sobre 10 horas diarias,
  aunque el promedio semanal no supere la jornada legal (decisión 8 de la spec).

### CA9: comparación al peso y diferencia por regla

Todos los valores son CLP; solo etiquetas/números anonimizados. Fixture del 29-oct-2026,
UF 41.237,01, UTM 72.151, IMM 553.553. El oráculo de prueba reproduce al peso costo y líquido 1.0.

| Caso / base | Costo 1.0 | Costo 2.0 | Líquido 1.0 | Líquido 2.0 | Diferencia explicada |
|---|---:|---:|---:|---:|---|
| GC-A / 553.553 | 878.671 | 871.022 | 606.148 | 606.146 | R17: provisiones contables; redondeo por concepto. |
| GC-B / 553.553 | 833.673 | 831.022 | 566.148 | 566.146 | R17 y redondeo. |
| GC-C / 553.553 | 1.328.655 | 1.271.022 | 1.006.148 | 1.006.146 | R17: colación/movilización fuera de provisiones; redondeo. |
| GC-D / 237.237 | 447.285 | 436.153 | 322.635 | 322.634 | R17, parcial 18/42 y redondeo. |
| GC-E / 900.000 | 1.348.345 | 1.344.332 | 915.661 | 915.660 | R17, gratificación topada y redondeo. |
| GC-F / 1.000.000 | 1.468.829 | 1.465.598 | 995.172 | 996.542 | R17 y redondeo; impuesto vigente 938 frente a 2.309. |
| CR-A / 700.000 | 1.054.228 | 1.050.875 | 715.925 | 715.925 | R17: cambia la provisión; líquido igual. |
| CR-A / 750.000 | 1.129.530 | 1.125.938 | 767.063 | 767.062 | R17 y redondeo. |
| CR-A / 950.000 | 1.408.587 | 1.404.965 | 955.898 | 956.570 | R17, impuesto vigente y redondeo. |
| CR-B / 1.200.000 | 1.709.795 | 1.708.132 | 1.152.266 | 1.153.637 | R17, impuesto vigente y redondeo. |
| CR-C / 650.000 | 978.926 | 975.813 | 664.788 | 664.787 | R17 y redondeo. |
| CR-D | N/A | N/A | N/A | N/A | No contiene puestos/sueldos; solo ítems, fuera del motor salarial. |
| CR-E / 650.000 | 978.926 | 975.813 | 664.788 | 664.787 | R17 y redondeo. |
| CR-COMB | A + C | A + C | A + C | A + C | Reutiliza los salarios de A/C; márgenes por sección 10 %/13 % son de CPQ (addendum t1243s4984), fuera de M1. |

El cambio de costo no es solo quitar no imponibles: también sustituye las provisiones 1.0
8,33 %/4,166 % sobre directo por vacaciones base/30×21/12 e indemnización base/12.
Los tests fijan cada total nuevo y cada diferencia GC, y verifican CA10 al variar no imponibles/aportes.
Costo turno GC-A 2.0 sin ajuste CPQ de feriados: 4x4 24 h = 4 personas / 3.484.088;
4x4 12 h = 2 personas / 1.742.044; 5x2 50 h = 1 persona y advertencia >42 h.
La comparación 1.0 de §13 incluye feriados y omite colación/movilización: se explica esa diferencia,
no se atribuye al motor de turno. Horas extra 42 h: base/120; parcial 18/42 = 237.237.

### Fuentes abiertas el 1-nov-2026 y verificación pendiente

Solo datos de pruebas, sin seed. Cada publicación de fixture incluye fuente, fecha de consulta,
vigencia y estado `verificado`/`por_verificar`. Una publicación verificada sin fecha se rechaza.

| Dato / regla | Fuente leída y evidencia | Estado |
|---|---|---|
| UF 29-oct 41.237,01; 31-oct 41.247,63 | [SII UF 2026](https://www.sii.cl/valores_y_fechas/uf/uf2026.htm) | Verificado; casos fijos del 29, test adicional del 31. |
| UTM oct 72.151; tramos IUSC en UTM | [SII UTM](https://www.sii.cl/valores_y_fechas/utm/utm2026.htm), [SII impuesto 2026](https://www.sii.cl/valores_y_fechas/impuesto_2da_categoria/impuesto2026.htm) | Verificados. |
| IMM 553.553 desde 1-may-2026 | [DT ingreso mínimo](https://www.dt.gob.cl/portal/1628/w3-article-60141.html) lo confirma y remite a Ley 21.830 | Monto/vigencia leídos en DT; texto directo del Diario Oficial `por_verificar`. |
| Topes AFP/salud/16.744 90 UF y AFC 135,2 UF desde febrero | [SP comunicado definitivo](https://www71.spensiones.cl/portal/institucional/594/articles-16921_recurso_1.pdf), [SP octubre](https://www.spensiones.cl/inf_estadistica/cotprev/cotprev.html) | Verificados. IPS 60 UF contrastado con Previred; norma directa y tope indemnización aún por verificar para seed. |
| AFP 10 % + comisión por administradora; SIS 1,78 % desde agosto; reforma total 3,5 % que incluye SIS | [SP Sistema de Pensiones](https://www.spensiones.cl/portal/institucional/594/w3-propertyvalue-9893.html) | Verificados. Reforma 0,10 individual +0,90 RP +2,50 SIS/EV. |
| Desglose reforma 0,72 EV +1,78 SIS; IPS 60 UF; asignación familiar A 22.601 ≤649.039, B 13.870 ≤947.990, C 4.382 ≤1.478.539 | [Previred octubre](https://www.previred.com/indicadores-previsionales/) | Contraste del addendum; sin cálculo de asignación familiar ni régimen IPS en M1. |
| AFC indefinido 2,4/0,6 y plazo fijo 3,0/0 | [DT cesantía](https://dt.gob.cl/portal/1628/w3-article-95306.html) | Verificado para los tipos del encargo. |
| Ley 16.744 básica 0,90 + SANNA 0,03 | [ISL SANNA](https://www.isl.gob.cl/ley-sanna/), [SUSESO fondo](https://www.suseso.gob.cl/622/w3-article-749903.html) | ISL confirma SANNA; SUSESO no devolvió texto legible. Básica y resolución adicional `por_verificar`. |
| Gratificación 25 % / 4,75 IMM y bonos mensuales | [DT gratificación](https://www.dt.gob.cl/portal/1626/w3-article-99034.html) | Verificado. |
| Jornada 42 h desde 26-abr-2026 | [Mintrab 40 horas](https://www.mintrab.gob.cl/40horas-implementacion/) | Verificado. |
| Deducción salud para IUSC | [SII Oficio 2406/2016](https://www.sii.cl/pagina/jurisprudencia/adminis/2016/renta/ja2406.htm) | Verificado: límite 7 % del tope, también para adicional. |

### Decisiones abiertas y límites de aceptación

- **TODO(decisión Carlos):** validar con contabilidad conversión de feriado hábil a corrido,
  progresivo, bases contables y probabilidad/rotación. M1 no elige un defecto; 21 corridos es
  hipótesis de prueba de Codex. No se declara validación contable concluida.
- **TODO(decisión Carlos): verificación de fuentes oficiales (bloquea PR de indicadores con seed,
  ahora M2):** texto de vigencia IMM en Diario Oficial, norma de topes IPS/indemnización,
  básica 16.744 y resolución adicional mutual. Sin valores fijos de respaldo en producción.
- Nómina PR 2 debe completar cálculo real por período, UF de cierre, excepciones previsionales,
  descuentos personales y contadores; M1 entrega estimado y provisiones, no liquidaciones reales.

| CA de la spec/brief | Estado en M1 |
|---|---|
| CA1 | Parcial: resolución diaria/mensual pura probada; captura e Historial M2/M3. |
| CA2 | Parcial: último valor/aviso probado; caída de fuente y Bandeja M2/M5. |
| CA3 | Parcial: excluye retenidos/propuestos y valida rangos; confirmar con permiso M3. |
| CA3b | Pendiente M3: editar propio y auditoría. |
| CA4 | Pendiente M3 + adaptador CPQ: impacto y aviso de vigencia. |
| CA5 | Pendiente M3/M5: MCP, autonomía y aprobaciones. |
| CA6 | Parcial: snapshot congelado y reproducible; persistencia/envío son CPQ. |
| CA7 | Cumplido en dominio: GC-A…F y CR salariales, diferencia documentada; pantalla M4. |
| CA8 | Pendiente M2–M5: exposición por capacidad/API/MCP/auditoría. |
| CA9 | Cumplido: tabla 2.0/1.0 y oráculo aislado en tests. |
| CA10 | Cumplido: no imponibles/aportes no alteran provisiones. |
| CA-v2 | Parcial: IMM, UTM, umbrales e impuesto en dominio; superficies visuales M3–M5. |
| CA-paridad | Gate vigente sin nuevas entradas; tools/list del motor en M2–M5. |
| CA-DS | N/A en M1 sin pantalla; pendiente M3–M5. |

## 5. Plan por bloques y división en PRs (histórico, reemplazado por M1–M5)


**Cinco PR**, en el orden de dependencia interna del propio motor (indicadores antes de variables, variables antes de simulador, simulador antes de plataforma/avisos). Cada uno con referencia a `CAR-71` (M1 usa `Refs CAR-71`) y un commit por bloque.

**PR 1 — Indicadores legales y captura (sin pantallas).**
- Bloque 1: este brief.
- Bloque 2 · `domain:` catálogo de indicadores, `valorAnomalo`, `juegoDeValores`, `sinFuenteNoHayInvento`; tests con los 11 indicadores de §5.1 de la especificación.
- Bloque 3 · `core:` migración de las tablas de plataforma (`IndicadorLegal`, `ValorPublicado`, `Captura`); siembra de los 11 indicadores (seed de desarrollo).
- Bloque 4 · `core:` capacidades `core.remuneraciones.indicadores.listar/historial`; trabajo diario de captura (`defineTrabajo`, periodicidad diaria) para UF/UTM (API del Banco Central si ya existe la credencial de plataforma, si no, SII) y carga por adelantado de valores futuros conocidos (R4); eventos `core.remuneraciones.fuente_fallida`/`valor_anomalo`/`indicador_atrasado`; paridad MCP y snapshot.

**PR 2 — Valores del tenant: página única, confirmar/cambiar, variables.**
- Bloque 5 · `core:` migración de las tablas de tenant (`ValorTenant`, `VariableTenant`, `ValorVariable`); permisos `core:remuneraciones.{read,manage,aprobar,retroactivo}`; plantilla de variables por vertical copiada al activar el servicio (R10).
- Bloque 6 · `core:` capacidades `indicadores.cambiar/confirmar/rechazar`, `variables.listar/crear/programar/anular`, `impacto.calcular` (vista previa de impacto sobre capas de sueldo del Núcleo, contrato «proveedor de impacto» de R13); cola de aprobaciones del Núcleo reutilizada (sin herramientas nuevas); paridad MCP y snapshot.
- Bloque 7 · `ds:`/`core:` pantalla `/configuracion/remuneraciones` (Valores) con `EstadoFuente`, `CambioValor`, `KpiTile` y las hojas «Cambiar valor» y «Confirmar valor»; estados obligatorios (375/1024/1280, claro/oscuro, cargando/vacío/error/sin permisos + vista previa/confirmando/éxito/error de regla/pendiente de aprobación); **ajustes 1, 2, 3 y 6 del mockup v2 (§6)** resueltos en esta pantalla.
- Bloque 8 · `ds:`/`core:` pestaña Historial (`/configuracion/remuneraciones/historial`) con `Timeline`; **ajuste 6 (chips del vacío) del mockup v2**.

**PR 3 — Simulador de costo.**
- Bloque 9 · `domain:` `costo-empresa.ts`, `costo-turno.ts`, `horas-extra.ts` completos, con los 6 casos dorados y el costo por turno de §13 como tests (incluida la prueba que reproduce 1.0 con sus supuestos viejos, para aislar la diferencia de regla, CA9).
- Bloque 10 · `core:` capacidad `core.remuneraciones.costo.simular` (con `core.estructuras.read_sensible` cuando usa una capa), `simulaciones.guardar/exportar`; paridad MCP y snapshot.
- Bloque 11 · `ds:`/`core:` pantalla `/cargos/simular` y hoja desde Cargos y sueldos (`CargosSueldos.dc.html` del export v2: «Simular costo» en la cabecera, «Simular con esta capa» por fila), entradas en ⌘K («Simular costo de un puesto», «Ver indicadores vigentes»); **ajustes 4 y 5 del mockup v2 (§6)** resueltos aquí; «Copiar como línea de cotización» deshabilitado con `Tooltip`.
- Bloque 12 · `ds:`/`core:` «Comparar escenarios» (iPad/escritorio, hasta 3 columnas) y exportación a PDF con marca del tenant (`core.documentos`, ADR-028).

**PR 4 — Plataforma → Fuentes y Avisos.**
- Bloque 13 · `core:` capacidad `platform.remuneraciones.fuentes.listar`; `ds:` pantalla `/platform/indicadores` (solo lectura).
- Bloque 14 · `ds:` ítems de Bandeja (indicador atrasado, valor por confirmar, propuesta de agente pendiente) y componente `AvisoRecalculo` aislado, con sus dos variantes (aviso y congelada), listo para que CPQ lo consuma más adelante.

**PR 5 — Cierre: paridad, presupuesto, documentación.**
- Bloque 15 · Gate de paridad completo (`paridad.test.ts`, `paridad-registro.test.ts`), `tools/list` en `main`, `herramientas-mcp.txt` y `mcp-inventario.md` al día.
- Bloque 16 · `docs:` `ROADMAP.md`, `ESTADO.md`, `agentes/operar-el-nucleo.md` (si cambian herramientas), reporte ejecutivo.

Si el volumen de un PR crece demasiado (más de ~150 líneas por archivo, ESLint lo exige de todos modos), se puede partir un PR en dos sin cambiar el orden de dependencia (por ejemplo, separar «variables» de «indicadores» dentro del PR 2).

## 6. Ajustes del mockup v2 que se resuelven al construir (obligatorios, con criterio de aceptación cada uno)

El mockup v2 quedó **aprobado tal cual** (Decisión de Carlos, 29-oct-2026 16:23 CLT, chat con OPAI 2.0, registrada por el bot OPAI 2.0); estos 6 puntos **no se corrigen en el diseño**, Carlos decidió que se corrigen al construir y que este brief los exige como criterios de aceptación.

1. **IMM retroactivo (afecta Valores, ValorDetalle, Confirmar, Historial, Avisos, Componentes, Plataforma y Simulador).** El valor vigente es **$ 553.553 desde el 01-05-2026** (Ley 21.830, Diario Oficial 22-06-2026, con efecto retroactivo); $ 529.000 queda solo como historia (valor anterior). Es el ejemplo real de **cambio retroactivo** (R5, R24): las pantallas lo muestran así, nunca como un IMM «propuesto desde 01-01-2027». El Simulador usa el IMM vigente en sus casos.
   **CA:** en las 8 superficies listadas, el IMM mostrado es $ 553.553 con «vigente desde 01-05-2026»; ninguna muestra un IMM futuro a 01-01-2027; el historial del indicador IMM tiene a $ 529.000 marcado como valor anterior y a $ 553.553 marcado «cambio retroactivo» (R24); test de dominio y e2e/snapshot de cada pantalla.
2. **UTM de octubre 2026.** El valor correcto es **$ 72.151** (coincide con §13 de la especificación); el mockup mostraba $ 69.889.
   **CA:** toda pantalla y capacidad usa $ 72.151 como UTM de octubre 2026; test de dominio que fija ese valor en el seed/fixture de referencia.
3. **Umbrales de valor anómalo (R7), en Componentes y ConfirmarValor.** UF ±1 % diario, UTM ±3 % mensual, tasas ±20 % relativo; el IMM **solo avisa si baja**. El texto «5 % el resto» del mockup no corresponde a la regla.
   **CA:** `valorAnomalo()` del dominio implementa exactamente estos umbrales (test por cada tipo de indicador, incluido el caso límite ±1,0 %/±3,0 %/±20,0 % y el IMM que sube sin alerta vs. que baja con alerta); el texto de Componentes y ConfirmarValor refleja la regla real, verificado por snapshot/e2e.
4. **Fila «Impuesto único» en el líquido estimado del Simulador (R17, paso 7).** Aparece siempre, aunque sea $ 0 con la etiqueta «exento».
   **CA:** los 6 casos dorados (GC-A a GC-F) muestran la fila «Impuesto único» en el resultado; los casos A–E la muestran en $ 0 «exento», el caso F la muestra con el monto calculado desde la UTM vigente (≈ $ 938, no los $ 2.309 de 1.0 con UTM vieja, anexo A.5); test de dominio y e2e del Simulador.
5. **Touch ≥ 44 px en teléfono.** Enlace «Ley 21.830, Diario Oficial…» en ConfirmarValor, «Ir a Valores» del Simulador con indicador faltante, «7 capas», y los botones de `AvisoRecalculo` en Componentes.
   **CA:** e2e a 375 px que mide el `boundingBox` de cada uno de los 4 elementos (o, para enlaces en texto corrido, la altura de su zona táctil) y confirma ≥ 44×44 px, con el mismo patrón de medición que CAR-8 (Puestos).
6. **Pluralización y chips del Historial vacío.** «1 alerta» en singular en Plataforma (no «1 alertas»); en el Historial vacío, los chips de conteo (Todos, Capturados…) muestran **0 o quedan ocultos**, coherente con el mensaje «Sin cambios para estos filtros».
   **CA:** test de dominio de pluralización (0, 1, 2+ alertas) usado por la pantalla de Plataforma; e2e del Historial vacío que confirma que ningún chip muestra un conteo mayor a 0 junto con el estado vacío.

**Detalles menores (también al construir, sin numerar como ajuste aparte):** tamaños de letra con los estilos `t-*` o tokens del DS, nunca `font-size` en px fijos (afecta Componentes y CambiarValor del export v2); los casos del Simulador siguen los casos de prueba del documento (AFP Modelo, mutual 1,20 %), **no** AFP Habitat/mutual 0,93 % que aparecían como ilustración en el mockup.

## 7. Dependencias

| Dependencia (citada en `modulos/motor-sueldos.md` §15) | Estado en `main` | Qué usa el motor de ahí | Bloquea |
|---|---|---|---|
| **Brief 07b · Capas de sueldo y anexo** (CAR-19, PR 1–4: #80, #87, #89, #91) | **En `main`.** | Resolución sin herencia `instalación→puesto→persona` (`estructuras.ts`) y `instalacionId`/jornada pactada del vínculo laboral, para costear desde una capa real (R18, R19, R21, R28). | Nada: ya disponible. |
| **Puestos, Brief 11 PR1** (CAR-8, #49) | **En `main`.** | Catálogo de 6 patrones de turno (`core.patrones_turno`) y `horasSemanalesSugeridas` de `turnos.ts`, para el costo por turno (R18). | Nada: ya disponible. |
| **Núcleo 02 (maestros, capacidades base)** | **En `main`.** | `defineCapability`, `ctx.transaccion`, `ctx.eventos`, `ctx.medidor`, `auditarLectura`, `core.documentos.*`, `core.aprobaciones.*`, registro de consumidores/trabajos. | Nada: ya disponible. |
| **ADR-048** (módulos vendibles por separado) | **Vigente** (`01-decisiones.md`), sin código propio. | Regla de diseño: el motor no lee tablas de CPQ; CPQ consume su evento (R13, R22–R25, fuera de este brief). | Nada: es una regla, no una dependencia de código. |
| **Brief 07c** (roles personalizados, B2) | **En `main`** (CAR-38 y anteriores lo dan por integrado). | Mecanismo de rol personalizado para delegar `core:remuneraciones.manage` sin ser owner/admin (decisión 4). No es obligatorio: owner y admin ya pueden hacer todo sin delegación. | Nada: el motor funciona con owner/admin aunque no se delegue. |
| **Verificación de fuentes oficiales** (pregunta 13 y 17 de la especificación: SIS desde agosto de 2026, reforma, IMM, topes) | **Pendiente.** La sesión que escribió la especificación no pudo abrir sii.cl, bcentral.cl, spensiones.cl, previred.com ni dt.gob.cl (red restringida). | Valores reales que carga el seed de indicadores (PR 1, bloque 3) y los casos dorados. | **Bloquea el PR M2 con seed** hasta que alguien con acceso a esos dominios confirme los valores citados en §14.2 de la especificación (Carlos habilita los dominios, decisión 17). |
| **Cuenta y token del Banco Central (BDE)** (decisión 3) | **Pendiente**, la crea Carlos. | Fuente automática de UF/UTM (R1, PR 1 bloque 4). | No bloquea: mientras no exista, el trabajo usa el SII como primaria (R9), sin degradar el resto del brief. |

**Conclusión:** ninguna dependencia de **código** bloquea; la dependencia que bloquea el seed de M2 es la **verificación de las fuentes oficiales**, que no requiere código y que Carlos puede resolver habilitando los dominios (decisión 17) antes de empezar el PR 1.

## 8. Tests

- **Dominio:** los 6 casos dorados (GC-A a GC-F) y el costo por turno de §13, con la prueba adicional que reproduce 1.0 con sus supuestos viejos para CA9; `valorAnomalo()` con los umbrales corregidos (§6.3); horas extra con la fórmula legal (R19, no `base/240`); jornada parcial (R20); gratificación con tope; patrón que no divide el mes exacto (promedio 30/ciclo).
- **Capacidades (contexto falso y `*-db.test.ts` con `opai_app` sin BYPASSRLS):** permisos por rol y portal (§7 de la especificación); `core.remuneraciones.costo.simular` exige `core:estructuras.read_sensible` para usar una capa y audita con `auditarLecturaSensible` (sin duplicar NÚCLEO-H); `dryRun` no persiste; `idempotencyKey` no duplica; un agente sin autonomía queda en la cola de aprobaciones y no puede aprobar su propio cambio (R27); cambio retroactivo siempre pide aprobación humana aunque la key tenga autonomía «directo» (R27).
- **Base (`pnpm test:db`):** RLS de las tablas de tenant (aislamiento por tenant); ausencia de RLS en las de plataforma (son públicas, de solo lectura para `opai_app`); triggers de mismo tenant en variable↔tenant y adjunto↔documento; sin solapes de vigencia por indicador/tenant.
- **Paridad (ADR-034):** toda capacidad `core.*`/`platform.*` nueva produce herramienta MCP; snapshot `herramientas-mcp.txt` actualizado; `apps/web` sin imports de `@opai/db` salvo `paridad-permitidos.json`.
- **e2e (375/1024/1280, claro/oscuro donde se pida):** Valores con cambiar/confirmar/rechazar un indicador; Historial con sus filtros; Simulador con una capa y con sueldo a mano, comparando 2–3 escenarios; variante sin `core:estructuras.read_sensible` (solo sueldo a mano); variante sin `core:remuneraciones.simular` (`Forbidden`); touch ≥ 44 px (§6.5); pluralización y chips del Historial vacío (§6.6).

## 9. Criterios de aceptación

Los CA1 a CA10 de §13 de la especificación aplican tal cual (indicadores automáticos sin intervención, alerta de fuente caída, valor retenido que una sola persona confirma sin segunda firma, cambio a mano que pasa a «propio», impacto antes de confirmar con `AvisoRecalculo` el día de la vigencia, cotización enviada que no cambia, casos dorados al peso o con diferencia explicada, paridad pantalla/API/MCP, provisiones sin colación/movilización/aportes en la base). Se agregan:

- **CA-v2.** Los 6 ajustes de §6 están resueltos en las 8 superficies que afectan, con sus tests y e2e específicos.
- **CA-paridad.** Gate de paridad y presupuesto de JS en verde; `tools/list` en `main` sin capacidades de pantalla sin herramienta; `mcp-inventario.md` al día.
- **CA-DS.** Ninguna pantalla usa medidas en px fuera de los tokens del DS 2.0, ni el estilo de 1.0; los 4 componentes nuevos (`TrazaMonto`, `EstadoFuente`, `CambioValor`, `AvisoRecalculo`) aparecen en `/ds` con sus estados, claro y oscuro.

## 10. Riesgos y rollback

- **Fuentes oficiales no verificadas (§7):** si Carlos no habilita los dominios antes del PR 1, el seed de indicadores (bloque 3) se abre con los valores de §13/anexo A de la especificación marcados «por verificar» y el PR lo declara explícitamente; no se inventa ni se asume que coinciden con la fuente real sin confirmarlo.
- **Trabajo diario de captura sin credencial del Banco Central:** el trabajo degrada a SII como primaria (R9); si tampoco hay lectura automática para un indicador, queda «propuesto» y lo confirma una persona (R5); no hay invento de valores (R8).
- **Cálculo compartido con CPQ más adelante:** el contrato «proveedor de impacto» (R13) y el evento `core.remuneraciones.valores_vigentes` se diseñan en este brief pero **sin consumidor todavía** (CPQ no existe); antes del Brief 08, el evento se emite sin efecto, no rompe nada.
- **Migraciones:** todas aditivas, con RLS solo en las tablas de tenant; las de plataforma no llevan `tenant_id` ni RLS, igual que `core.users`/`core.tenants`, por diseño (son catálogo público de la ley). Las aplica el bot «OPAI 2.0» con respaldo en Neon `dev` y `main` (ADR-054); cada PR con migración lleva `migracion-pendiente`.
- **Rollback:** todas las tablas y capacidades son nuevas; revertir un PR no afecta a Puestos, Capas de sueldo ni al resto del Núcleo (sin columnas añadidas a tablas existentes, salvo ninguna en este brief — el motor no toca `maestros.prisma`, `anexos.prisma` ni `puestos.prisma`).

## Historial

| Fecha | Cambio | Aprobó |
|---|---|---|
| 29-oct-2026 | Brief 07e propuesto, con el plan de 5 PR, los 6 ajustes del mockup v2 como criterios de aceptación y las dependencias verificadas contra `main` (CAR-71, PR #126, solo documentación) | — |
