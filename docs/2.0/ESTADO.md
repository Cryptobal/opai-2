# ESTADO — OPAI 2.0

**Foto verificada contra el código de `main` en `fac5738` (#229), 3-nov-2026**, por la [auditoría profunda](auditoria-2026-11.md) (CAR-151); **Finanzas y Rendiciones re-verificadas en `7186617` (#235)** por la [auditoría de Finanzas](auditoria-finanzas-rendiciones-2026-11.md). Cada PR actualiza este archivo (ADR-054): lo que entra, lo que queda pendiente y lo que se decide. Una entrada «integrado» acredita el merge en `main`, no el despliegue ni la migración en Neon: eso va en la tabla de migraciones. El plan está en [ROADMAP](ROADMAP.md), las decisiones en [ADR](01-decisiones.md) y el flujo en [OPERACION-agentes](OPERACION-agentes.md). Lo anterior a esta foto está en [ESTADO-archivo](ESTADO-archivo.md).

## En curso

| PR | Qué | Estado | Migración |
|---|---|---|---|
| **Auditoría Finanzas y Rendiciones** (CAR-163, rama `docs/car-163-auditoria-finanzas-rendiciones`) | [Informe](auditoria-finanzas-rendiciones-2026-11.md): estado por submódulo, paridad con 1.0, diseño, bugs en vivo (F-B1 a F-B10), salud del código y plan F/C/I/R. Sin código de producto | En revisión | No |
| #237 (CAR-157) | Importador 1.0 v2: equivalencia de etapas de Gard, corridas `core.importaciones`, lector del export B2. Apila a #235 | Abierto. **Renombrar el prefijo de su migración**: `20261103180000_nucleo_importaciones` comparte prefijo con `20261103180000_finanzas_dte_emision_real` de `main` | Sí, `20261103180000_nucleo_importaciones` (`migracion-pendiente` puesta) |
| #239, #240 (CAR-162) | CPQ: desbloqueo de la primera cotización y export de diseño CPQ v4 | En revisión | No |
| #231 | Importación 1.0 de recurrentes, versión anterior | **Cerrar**: reemplazado por #235, ya integrado | — |
| #168 | Restablecer MFA y regenerar códigos de respaldo (CAR-54) | **En pausa**: en conflicto. Se retoma después de la migración | — |

## Integrado en `main`, por módulo

Detalle, brechas y evidencia en la [auditoría §1.2](auditoria-2026-11.md#12-por-módulo). Cifras: 473 capacidades, 419 herramientas MCP, 0 faltantes de paridad pantalla → MCP, 89 capacidades sin pantalla, 140 páginas.

- **Núcleo:** maestros (cuentas con RUT único y datos tributarios #223, contactos N–N #196, instalaciones, personas, cargos), documentos y vencimientos, comunicaciones, auditoría encadenada (#71) y FORCE RLS (#79), identidad y MFA (#65, #74, #131), roles y alcance del supervisor (#46, #47, #51, #105, #106), Ley 21.719 (#56, #61, #107), plataforma (#109), calendario (#139, #143), capas de sueldo y anexo (#80–#93), Personas y Cargos PR 1 y PR 2 (#165, #214), motor de sueldos M1–M3 y captura SII de UF/UTM (#197, #210, #220, #227), firma N1 (#140, #153), ficha de cuenta post-QA (#226).
- **Configuración:** portada por grupos y v1.1 (#160, #202), acordeón del sidebar (#216), integraciones con certificado `.pfx` y tarjeta Octava (#222).
- **Comercial:** negocios y embudo (#97–#110, #194), solicitudes y canales (#184), contactos y actividad unificada (backend #190, pantallas #196), formulario web público (#224), canal agente GrowthBot (#225), importación 1.0 del núcleo (#223, solo simulación por CLI).
- **CPQ:** base y pantallas (#187, #195, #201), motor (#198), cotizar en serio con marca y plantillas (#203), cierre con aprobación por margen y PDF (#208), ficha visual (#215), propuesta técnica v2 (#218), ficha a 375 px (#228), PDF rediseñado (#229), bandeja y campana conectadas a las aprobaciones de CPQ (#230: consumidor `cpq.bandeja` y `cpq.aprobaciones.{list,get,contar}`, que delegan en las capacidades de aprobación y envío existentes).
- **Finanzas** (estado real en la [auditoría de Finanzas](auditoria-finanzas-rendiciones-2026-11.md)): flujo de caja (#186, #205, #206, #207) y v2 sin cierre semanal (#219); compras, proveedores y plan de cuentas (#186); ventas DTE PR 1 y PR 2 (#204, #209); bancos y conciliación (#211, #212); CAF endurecido y pantalla de folios (#217, #221); **emisión real con SimpleAPI v1, preflight, Configuración DTE con fuente única y NC con el adaptador del tenant (#234)**; **programaciones recurrentes con la forma de 1.0, solo lectura e importación pausada (#235)**. Veredicto: Flujo, Compras y Banca listos; Ventas a medias (ficha sin acciones, sin envío al cliente, sin generación de borradores ni cobranza); Contabilidad (salvo el plan de cuentas), Informes y **Rendiciones (0 %)** faltan.
- **Integrados el 3-nov después de la foto de CAR-151:** auditoría profunda (#232), `cookieCache` 60 s (#233), SimpleAPI v1 (#234), recurrentes B1 (#235), textos y formateador único (#236), salud del código B5 (#238) y Cargos y Remuneraciones (#213).
- **Operaciones:** Pauta mensual (#180) y diaria (#200).
- **Rondas:** configuración en el ERP y QR (#137, #141, #145).
- **Tickets:** PR 1 y PR 2 (#169, #188).
- **Nómina:** períodos, novedades, préstamos y calendario, sin cálculo (#183, #192).
- **Portales:** Trabajador PR 1 y PR 2 (#189, #199); Cliente PR 1 (#181).
- **Agente interno:** servidor y proveedores de IA (#62, #73). **No hay pantalla de chat** (CAR-120).
- **Infraestructura y rendimiento:** pool de Neon y lecturas de sesión (#100–#102, #134–#142, #193), CI sin corte por tiempo (#191), presupuesto de JS (#129).
- **Exports de diseño aprobados:** #148–#151, #154, #155, #157, #159, #161–#164, #166, #167, #170–#173, #175–#179, #185.

## Migraciones en Neon

Al 3-nov-2026 todas las migraciones integradas en `main` están aplicadas en Neon `dev` y `main`, incluida `20261103140000_finanzas_ventas_programacion` (#231, instrucción de Carlos en el brief B). Esa migración no se edita: las correcciones van en migraciones aditivas nuevas.

| Estado | Migraciones |
|---|---|
| Aplicadas en `dev` y `main` | Las 76 de `main` y `20261103140000_finanzas_ventas_programacion` |
| **Integrada sin aplicar y sin etiqueta** | `20261103160000_finanzas_programacion_forma_1_0` (#235). El historial de etiquetas de #235 está vacío: se integró sin `migracion-pendiente`. **Consecuencia en vivo:** `finanzas.ventas_programacion.listar` falla con `PrismaClientKnownRequestError` y Ventas › Programación muestra «No pudimos cargar esta información» (auditoría de Finanzas, F-B1). Además, confirmar que `20261103180000_finanzas_dte_emision_real` (#234) está aplicada |

Los avisos escritos de «aplicada con respaldo» siguen siendo el requisito de ADR-054 para cada PR nuevo con migración: el operador respalda, aplica `dev` → `main`, deja el aviso en el PR y retira la etiqueta.

## Pendientes

**Finanzas y Rendiciones (auditoría del 3-nov, [plan](ROADMAP.md#6-finanzas-y-rendiciones-plan-del-3-nov)):**
- **Bloqueante F-B1:** aplicar con respaldo `20261103160000` y dejar el aviso en #235 (operador).
- **Para el corte de Gard en Finanzas:** ficha de venta con acciones y envío al cliente (F2), generación de borradores recurrentes con UF del SII (F3), cobranza (F4) y saldos de apertura con último folio por tipo (F6).
- Bugs F-B3 a F-B10 (selector de proveedor vacío, estados vacíos con jerga, menú con Configuración DTE, Compras a 4,6 s, CSP estricta contra la regla Report-Only, tres archivos de más de 150 líneas).
- Capacidades unificadas en `modules/finanzas` (F8); seed de QA de Finanzas para recorrer flujos en `test.opai.cl`.
- Capturas a 375 y 1280 px de Finanzas: pendientes para «Diseño y QA», porque la sesión no pudo achicar la ventana.
- Rendiciones: hoja de alcance y Propuesta B por decidir; luego R1–R5.

**R2 (CAR-161): typecheck de la web sin la bandera de memoria.** Medido el 3-nov-2026: `tsc` sobre `packages/capabilities` genera 1,2 millones de tipos y usa ~2,8 GB (la web, que importa las capacidades como fuente, ~2,5 GB); el tope por defecto de Node es 2,1 GB. Cerca de un tercio de los tipos viene del cliente de Prisma (~300 modelos), y el resto son los esquemas zod y los tipos inferidos de las capacidades. Lo que se arregló: una comparación estructural entre dos `Omit<ClienteApp, …>` que costaba ~17 s. Lo que falta: **referencias de proyecto** (`composite`, `declaration` y `references` por paquete, con `tsc -b`), para que la web lea `.d.ts` y no vuelva a chequear las capacidades. Es un cambio de configuración de todos los paquetes (tests y scripts que cruzan paquetes por rutas relativas hay que separarlos) y va en su propio PR.

**Bloqueantes para migrar Gard (plan P1–P10 del ROADMAP):**
- SimpleAPI v1, emisión con CAF, NC con el adaptador del tenant y Configuración DTE: **resueltos en #234**. Octava sigue sin pantalla.
- Ficha de venta sin acciones.
- Sin envío del DTE al cliente.
- Consulta al SII por RUT inexistente.
- Importador sin origen (no hay exportador de 1.0) y que degrada datos: todo queda como prospecto, la razón social se rellena con el nombre y al actualizar escribe nulos.
- Recurrentes con la forma de 1.0: corregido en B1 (CAR-25); falta la generación de borradores (brief A4) y el exportador de 1.0 (B2).
- Seguimiento de cotizaciones solo en especificación.
- **Infraestructura:**
  - Cortes de conexión con Neon en `test.opai.cl`: 1.585 errores de conexión en 7 días, que afectaron a 29 usuarios; siguen activos ([auditoría §4.1](auditoria-2026-11.md#41-errores-reales-en-testopaicl-vercel-27-oct--3-nov)).
  - GitHub Actions en `startup_failure` desde el 31-oct.
- **Diseño y QA:** bugs B2–B12 ([auditoría §4.2](auditoria-2026-11.md#42-bugs-de-pantalla-por-código-y-capturas-confirmar-en-vivo)); refresco visual C1–C5 como propuesta para Carlos.
- **Código:**
  - `typecheck` y `build` se quedan sin memoria en máquinas de 7–8 GB.
  - N+1 en las alertas de pauta y en la importación de flujo y de compras.
  - Formateadores repetidos.
  - Código muerto: `modules/*/ui`, `cpq/domain/motor/proveedor-stub.ts`, `finanzas/flujo/_componentes/cierre-ui.ts`, `personas/_componentes/{tabla-sueldo,selector-puesto,sueldo-comun}`.
- **Pantallas que faltan sobre capacidades existentes:**
  - Notas y tareas en las fichas (`core.actividades.*`), etiquetas y archivar contacto.
  - Revocar invitación.
  - Editar el catálogo de CPQ.
  - Editar la ficha laboral de Persona PR 2.
  - Firmante de empresa y política de firma.
  - Confirmar remuneraciones.
- **Deudas declaradas:**
  - `/verificar/[token]` lee la base sin capacidad.
  - Umbral de horas de Pauta fijo en el código.
  - Fuentes de seed M2 del motor de sueldos y la publicación humana de los 9 indicadores que no son UF/UTM (`motor-sueldos.md` R5).
  - Tope de JS de la ficha de cuenta en 166 KB (CAR-74).
- **Operación sin evidencia:** revocación de la key `*` de Gard (CAR-56).
- **Cerrados por esta auditoría:**
  - Los pendientes no bloqueantes del 29 y 30-oct ya están resueltos en el código: toast con `max-md:` y mapa «Sin ubicación».
  - El error de `/finanzas/flujo` (función pasada a un componente cliente) no aparece en Vercel desde el 2-nov 05:33; hay que confirmarlo en la QA en vivo.

## Decisiones y riesgos vigentes

- **Decisiones pendientes de Carlos:** D2–D8 del [ROADMAP §5](ROADMAP.md#5-decisiones-que-necesita-carlos) (migraciones, acceso de solo lectura a 1.0, fecha de corte, credenciales DTE, diseño, CAR-120 y orden de Linear). **D1 (`cookieCache` 60 s) aceptada el 3-nov-2026 (CAR-152).**
- **Regla de integración reafirmada:** no se integra con `migracion-pendiente` puesta (ADR-043 v3, ADR-054). Diez PR se integraron así (#181 y nueve entre el 1 y el 3-nov).
- **BYPASSRLS de `neondb_owner`:** el dueño de las tablas en Neon (rol de `prisma migrate deploy`) tiene BYPASSRLS, así que FORCE no le afecta. La garantía es `opai_app` sin BYPASSRLS con `tenant_isolation` (ADR-002, [NUCLEO-G2](briefs/NUCLEO-G2-force-rls.md)). Toda migración de datos posterior a `20261028170000` verifica las filas afectadas (`REGLAS-codigo.md`).
- **Inspector DT:** solo lectura; ve sueldos, auditoría y montos sensibles (`core:estructuras.read_sensible`, decisión t479u del 26-oct; `packages/db/scripts/roles-base-plantillas.ts`).
- **`IF NOT EXISTS` en migraciones:** no valida el esquema de lo que ya existe. Una migración nueva no depende de eso para reintentos si no tiene un test equivalente (`plataforma-migracion-reintento.test.ts`).
- **Ley 21.719:** integrada (#56, #61, #107), pero eso no acredita cumplimiento legal ni activación operativa. Confirmar el plazo de retención con el abogado antes de activarla. La marca «No recontratar» queda bloqueada en producción hasta el 1-dic-2026.
- **Prisma drift heredado** entre migraciones y schema (FK de Pauta, visto en el merge de CAR-81): sigue sin diff vacío acreditado.
