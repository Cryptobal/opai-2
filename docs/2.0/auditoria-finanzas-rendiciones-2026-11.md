# Auditoría · Finanzas y Rendiciones — 3-nov-2026

**Pedido por:** Carlos Irigoyen (encargo del 3-nov-2026). **Hecha por:** Claude (constructor), en solo lectura sobre el código, 1.0 y `test.opai.cl`.
**Foto:** `main` en `7186617` (#235 integrado a las 12:05 del 3-nov), despliegue de producción de `test.opai.cl` `dpl_4NW5CdQB…` sobre ese mismo commit. OPAI 1.0 leído en `Cryptobal/opai@4b6e472`, solo como referencia funcional.
**Regla:** el código manda sobre los documentos. Cada afirmación lleva su ruta. La severidad usa la escala del encargo: **Bloqueante** (impide migrar Gard o arriesga datos, dinero o seguridad), **Alta**, **Media** y **Baja**.

## 0. Veredicto en una línea

**Finanzas tiene buen esqueleto, pero no sirve aún para que Gard deje 1.0, y Rendiciones no existe.** Flujo de caja, Compras, Banca, Folios y Configuración DTE funcionan. Ventas emite y nada más: no tiene acciones en la ficha, no envía la factura al cliente, no genera borradores recurrentes ni hace cobranza. Contabilidad se reduce al plan de cuentas, no hay informes y Rendiciones está en 0 %.

| Submódulo | Veredicto | Lo que falta para Gard |
|---|---|---|
| Flujo de caja | **Listo** (v2) | Proyección desde las programaciones; notas por celda; exportar |
| Compras | **Listo, con huecos** | RCV automático (capacidad sin pantalla), recibidos, acuse y reclamo |
| Ventas / DTE | **A medias** | Ficha con acciones, envío al cliente, recurrentes que generen borradores, NC en pantalla, ND, UF en líneas |
| Banca | **Listo, con huecos** | Reglas y cobro manual sin pantalla; conciliación N:M; saldo de apertura |
| Contabilidad | **Falta** (solo plan de cuentas y centros) | Asientos, períodos, apertura, asientos automáticos, mayor |
| Informes | **Falta** | Libros de ventas y compras, IVA/F29, EERR, balance, cobranza, rentabilidad |
| Rendiciones | **Falta** (0 líneas de código) | Todo el módulo, que se vende aparte |

## 1. Estado real por submódulo

Cifras de `main`: 32 capacidades de Finanzas en `packages/capabilities/src/finanzas/` y 56 ids (capacidades y eventos) en `modules/finanzas/`. Pantallas en `apps/web/app/(erp)/finanzas/`: `flujo`, `compras`, `compras/proveedores`, `ventas`, `ventas/[id]`, `ventas/nuevo`, `ventas/programacion` (nueva con #235), `bancos`, `folios`, `configuracion-dte` y `plan-de-cuentas`. No hay portada `/finanzas`.

### 1.1 Flujo de caja — listo

- **Terminado:** planilla semanal (`flujo/_componentes/planilla-flujo*.tsx`) con 12 semanas, filas, celdas (`finanzas.celdas.fijar|cumplir|mover`), importación CSV todo o nada (`finanzas.flujo.importar`, N+1 corregido en #238), ajustes (`finanzas.ajustes.*`) y derivadas de banco y DTE (`modules/finanzas/capacidades/derivadas/`).
- **En vivo:** carga sin errores en consola. **El error «función pasada a un componente cliente» ya no aparece** (confirmado en el navegador y en los registros de Vercel de los últimos 20 minutos).
- **A medias:** `finanzas.ventas.proyeccion_flujo` existe, pero ninguna pantalla la llama; las programaciones recurrentes todavía no proyectan en el flujo. La derivada de nómina no existe.
- **Diferido por decisión:** el cierre semanal se retiró en #219.

### 1.2 Compras — listo, con huecos

- **Terminado:** libro de compras, registro manual (`finanzas.compras.registrar`), centro de costo por documento (`asignar_centro`), proveedores con su ficha (`proveedores.*`).
- **Capacidad sin pantalla:** `finanzas.compras.importar` (RCV del SII) solo existe por MCP; la pantalla lo menciona en el estado vacío, pero no tiene botón.
- **Falta:** sincronización automática del RCV (1.0 tiene el cron `finance-rcv-sync`), documentos recibidos con su XML, acuse y reclamo dentro del plazo de 8 días, pagos a proveedores (1.0: `finanzas/pagos-proveedores`).
- **Bug en vivo (Media, F-B3):** «Registrar documento» abre un selector de proveedor vacío, sin mensaje ni opción para crear uno. Hay que saber que se crean en otra pestaña.

### 1.3 Ventas / DTE — a medias

- **Terminado:** lista, borrador manual (`ventas/nuevo`), emisión con folio atómico y CAF (`ventas-emision.ts:95`, `incluirCaf` cuando el adaptador no es el simulado, desde #234), preflight (`finanzas.ventas.preflight_emision`), seguimiento en cola del estado SII, carga de CAF y pantalla de folios (#217, #221), **Configuración DTE con fuente única** (`configuracion-dte`, #234: ambiente, conector, resolución, Octava, avisos y fecha de corte con 1.0).
- **NC:** ya no está siempre simulada. Usa el adaptador del tenant (`ventas-nc-escritura.ts:48`), **pero no tiene pantalla**.
- **Capacidades sin pantalla:** `ventas.pdf`, `ventas.enviar_sii`, `ventas.emitir_nota_credito`, `ventas.cesion_simular`, `ventas.cesion_ceder`, `cesiones.listar`. La ficha (`ventas/[id]/page.tsx`) es de solo lectura: muestra estados y montos, pero no tiene acciones.
- **Programación recurrente:** desde #235 hay tablas con la forma de 1.0 (`finanzas.prisma`: frecuencia, día, UF, IPC, receptor congelado, destinatarios, corridas) y dos lecturas (`finanzas.ventas_programacion.listar|obtener`). **No se puede crear, editar ni pausar, y no hay trabajo que genere borradores.** **En vivo, la pantalla falla** (ver §4, F-B1).
- **Falta:**
  - Envío del DTE al cliente con PDF, XML, CC e historial (1.0: `facturacion/envios` y `FinanceDteEmailLog`).
  - Nota de débito.
  - Líneas en UF con la UF del SII: el formulario no usa la UF del núcleo (`ventas/nuevo/emitir-lineas.tsx`).
  - Seguimiento EP/proforma, cierre de mes, cobranza, aging y recordatorios (1.0: `cobro-reminders`, `dte-overdue`), landing de cobro, factorings (1.0: `cesiones/factorings`).
  - Aviso de vencimiento del certificado (1.0: `dte-cert-expiry-alerts`).
- **Simulado en `test.opai.cl`:** el tenant Gard de pruebas usa el conector «Simulado», no tiene CAF ni documentos. No se pudo recorrer la emisión de punta a punta en vivo, y no se llamó a SimpleAPI ni a Octava.

### 1.4 Banca — listo, con huecos

- **Terminado:** cuentas, cartola Santander o CSV con vista previa y deshacer (`bancos/cartola-importar.ts`), reconocer movimientos, conciliación sugerir, confirmar y deshacer (#211, #212).
- **Capacidades sin pantalla:** `finanzas.reglas_banco.*` (reglas automáticas), `finanzas.cobros.manual`, `finanzas.bancos.saldo_sugerido`.
- **Falta:** conciliación N:M (un abono que paga varias facturas, que 1.0 sí tiene con `FinanceBankLinkAllocation`), saldo de apertura por cuenta a la fecha de corte, conciliación mensual y reglas sugeridas del diseño. Ingesta automática: 1.0 **no tiene Fintoc real** (ya anotado en CAR-151).

### 1.5 Contabilidad — falta

- **Terminado:** plan de cuentas en árbol, inicializar con la plantilla chilena, crear y editar (`finanzas.plan.*`), y centros de costo (`centros_costo.listar`).
- **Falta todo lo demás del diseño aprobado** (`diseño/export-finanzas-compras/07`, `07B` y `08`): asientos y períodos, asiento de apertura, EERR y balance. 1.0 los tiene: `contabilidad/asientos/nuevo`, `FinanceJournalEntry`, `FinanceJournalLine` y `FinanceAccountingPeriod`.

### 1.6 Informes — falta

- **En 2.0 no hay informes.** Solo `finanzas.ventas.libro_resumen` (totales del libro de ventas) y el libro de compras como lista.
- **1.0 tiene:** `reportes/balance`, `eerr`, `mayor`, `rentabilidad`, `ventas` (por cliente), `compras` y `facturacion/libro-iva`.
- **Para operar Gard hacen falta, en orden:**
  1. Libro de ventas y de compras exportables con IVA del período (base del F29).
  2. Cobranza y aging por cliente.
  3. Flujo real contra flujo planificado (ya está en la planilla).
  4. EERR y balance cuando exista contabilidad.
  5. Rentabilidad por instalación, cruzando ventas con el costo laboral del motor de sueldos.

### 1.7 Rendiciones — falta (módulo aparte, ADR-048)

- **En `main` no hay nada:** `grep -ri rendici` sobre `.ts`, `.tsx`, `.prisma` y `.sql` da 0 coincidencias. No hay módulo, manifest, rutas, capacidades ni migraciones.
- **Diseño aprobado** (`diseño/export-rendiciones/`, v2 del 30-oct): las 8 pantallas, con estas decisiones:
  - Centros de costo = instalaciones activas + «Administración / Oficina central».
  - Cuenta de destino tomada de la Ficha de persona, con el aviso «Sin datos bancarios en la ficha».
  - Configuración en *Configuración › Módulos › Rendiciones*.
  - Variante con y sin Finanzas.
  - La «Propuesta B» sigue pendiente de Carlos.
- **En 1.0 está completo y en uso:**
  - Rutas `rendiciones`, `nueva`, `[id]`, `aprobaciones`, `pagos`, `historial-pagos` y `reporte`.
  - Modelos `FinanceRendicion`, `FinanceRendicionItem`, `FinanceRendicionHistory`, `FinanceTrip` (kilometraje con GPS, litros, peaje y tarifa del vehículo con snapshot de precios) y `FinanceRendicionConfig` (dos aprobadores por defecto, autoaprobación sin aprobadores, topes diario y mensual, alertas y cuenta Santander para el archivo de pago).

## 2. Matriz de paridad 1.0 → 2.0

«Ya en 2.0» = en `main` y usable. La mejora es concreta, no cosmética. Lo marcado **(corte)** es lo que Gard necesita el día del corte.

### 2.1 Ventas, cobranza y factoring

| Funcionalidad | Ya en 2.0 | Falta | Mejora real propuesta |
|---|---|---|---|
| **Facturación recurrente (corte)** | Modelo con la forma de 1.0 y lecturas (#235) | Crear, editar y pausar; trabajo diario que genere **borradores** idempotentes por período (`ventas_programaciones_corridas`); UF del día; IPC; adjuntos; autoenvío | Borrador por corrida única (programación + período) en vez del `nextRunAt` de 1.0. Una revisión y una aprobación por lote antes de emitir |
| **Emisión con el CAF que carga Carlos (corte)** | Sí (#234), con preflight | Prueba del set de certificación con credenciales reales (D5) | Preflight visible antes del botón Emitir: certificado vigente, CAF, rango de folio y datos del receptor |
| **NC (corte)** | Capacidad con el adaptador del tenant | Pantalla; NC parcial | «Anular o corregir» desde la ficha, que propone la NC total o parcial y recalcula el cobro |
| Nota de débito | Solo el tipo 56 en los esquemas | Todo | Mismo motor que la NC, con signo |
| **Envío al cliente (corte)** | No | PDF y XML a los contactos de facturación, CC, historial, reenvío | Por el servicio de Comunicaciones del núcleo, idempotente y con acuse de apertura |
| PDF y XML | `ventas.pdf` sin pantalla | Botón en la ficha | Vista previa del borrador, igual que CPQ (#229) |
| **Cobranza (corte)** | Solo el estado de cobro que deja la conciliación | Vencimiento, aging, recordatorios y landing de cobro | Secuencia con feriados chilenos (1.0 no los considera) y pausa automática al conciliar el pago |
| EP/proforma y cierre de mes | No | Todo (diseño «Programación y cierre») | Tablero del período con emisión en lote: una aprobación, N emisiones |
| Cesión y factoring (Octava) | Capacidades sin pantalla | Pantalla, catálogo de factorings, abono conciliado | Comparador del costo efectivo por factoring; cesión en lote |
| **UF/UTM desde el SII (corte)** | Captura en el núcleo (#220) | Que Ventas y las programaciones la usen | UF por fecha de la tabla de plataforma, con la política de fijación de la programación (`politicaUf`, `diaUf`) |

### 2.2 Compras, banca y flujo

| Funcionalidad | Ya en 2.0 | Falta | Mejora real propuesta |
|---|---|---|---|
| Libro de compras y proveedores | Sí | RCV automático; recibidos con XML; acuse y reclamo | Aviso del plazo de reclamo de 8 días en la Bandeja |
| Pagos a proveedores | No | Todo | Lote de pago con archivo del banco, compartido con Rendiciones |
| **Conciliación bancaria (corte)** | Sí, 1:1 | N:M, castigo, saldo de apertura | Un abono que paga varias facturas, con prorrateo sugerido |
| **Flujo de caja (corte)** | Sí (v2) | Proyección desde las recurrentes; notas por celda | Las recurrentes alimentan las semanas futuras sin digitar |

### 2.3 Contabilidad e informes

| Funcionalidad | Ya en 2.0 | Falta | Mejora real propuesta |
|---|---|---|---|
| Plan de cuentas y centros | Sí | — | — |
| Asientos y períodos | No | Todo | **Asientos generados por evento** (venta emitida, compra registrada, conciliación) a partir de reglas por cuenta, y no digitados |
| Asiento de apertura | No | Todo | Generado desde los saldos de cierre importados de 1.0 |
| EERR, balance y mayor | No | Todo | Por centro de costo = instalación, para ver el margen por servicio |
| Libro IVA / F29 | No | Todo | Borrador del F29 desde los libros, con diferencias marcadas contra el RCV |
| Rentabilidad | No | Todo | Ventas de la instalación contra costo laboral real (motor de sueldos) |

### 2.4 Rendiciones

| Funcionalidad | Ya en 2.0 | Falta | Mejora real propuesta |
|---|---|---|---|
| Rendición de compra | No | Todo | Desde el Portal Trabajador, con foto de la boleta y extracción por IA (monto, RUT, fecha) |
| Kilometraje | No | Todo | Precio del combustible y rendimiento por vehículo como configuración versionada (1.0 guarda un snapshot por viaje) |
| Aprobación | No | Todo | Aprobador por instalación (supervisor a cargo) en vez de dos aprobadores fijos |
| Lotes de pago | No | Todo | Archivo del banco del tenant (no solo Santander); con Finanzas, el lote se refleja en Bancos y en el flujo |
| Reporte | No | Todo | Por instalación y por persona, con tope mensual consumido |

### 2.5 Lo que necesita el importador (#235 integrado, #237 abierto) para que Finanzas funcione después del corte

1. **Programaciones:** entran pausadas y sin próxima ejecución (#235). Para que sirvan falta lo siguiente:
   - La migración `20261103160000` aplicada (hoy **no** está, ver F-B1).
   - El trabajo que genere borradores (F3).
   - Su activación a partir de la fecha de corte, con la fecha que ya existe en Configuración DTE.
2. **Datos de facturación por cuenta:**
   - Ya entran: razón social, giro, dirección y comuna (#223).
   - Faltan:
     - El **correo de intercambio DTE**, que hay que derivar del último DTE aceptado en 1.0 (CAR-158).
     - Los **contactos con rol facturación por cuenta** para las ventas manuales. Los destinatarios de cada programación ya entran con #235.
     - La regla «exige OC/HES».
     - El plazo de pago por cliente.
3. **Saldos de apertura:** **ningún importador los contempla.**
   - Hay que importar:
     - El saldo de cada cuenta bancaria a la fecha de corte.
     - Los DTE emitidos y no pagados (cuentas por cobrar), para la cobranza y la conciliación.
     - El **último folio usado por tipo**, para no reutilizar folios del mismo CAF.
     - Los saldos contables de cierre, para el asiento de apertura.
   - Propuesta: un PR propio (F6) sobre `core.importaciones` de #237.
4. **#237:** usa el prefijo `20261103180000`, el mismo de `20261103180000_finanzas_dte_emision_real`, que ya está en `main`. Prisma las ordena por nombre, pero un mismo prefijo es frágil: **hay que renombrarla antes de integrar** (Media).

### 2.6 Vender y apagar por separado

- **Finanzas sin Rendiciones:** sin conflicto, porque Rendiciones no existe.
- **Rendiciones sin Finanzas:** debe ser un módulo `modules/rendiciones` con su manifest y **sin dependencia dura de Finanzas**.
  - Centros de costo = instalaciones del núcleo + un centro fijo.
  - Cuenta de destino = Ficha de persona (núcleo).
  - Lote de pago = archivo descargable.
  - Si Finanzas está activo, Rendiciones publica `rendiciones.lote_pagado`, y un consumidor de Finanzas lo convierte en movimiento esperado en Bancos y en salida del flujo. Si Finanzas está apagado, el evento no tiene consumidor y nada se rompe (ADR-003, comunicación por eventos).
- **Nota sobre el manifest de Finanzas:** «Configuración DTE» aparece **primera en el menú de Finanzas** (`modules/finanzas/manifest.ts:50-58`, `orden: 2`). Según ADR-018 y `NAVEGACION.md`, la configuración de un módulo va en el centro de Configuración y no como entrada de su menú (Media, F-B6).

## 3. Diseño y UX

Contraste con el DS 2.0 y con los exports `export-finanzas-ventas-banca-v3`, `export-finanzas-compras` y `export-flujo-caja-v3`.

| Pantalla del diseño | En 2.0 | Fidelidad |
|---|---|---|
| Hoy en Finanzas | No existe (`/finanzas` no tiene página) | No existe |
| Ventas | `ventas` | Parcial: lista sí, ficha sin acciones |
| Programación y cierre | `ventas/programacion` (solo lectura, rota en vivo) | Parcial |
| Landing de cobro, Cobranza, Factoring | — | No existe |
| Banca | `bancos` | Parcial: sin reglas ni conciliación mensual |
| Integraciones y Configuración DTE | `configuracion/integraciones`, `finanzas/configuracion-dte` | Completa (pero en el menú equivocado) |
| Flujo de caja | `flujo` | Completa (v3 sin cierre) |
| Libro de compras y ficha de proveedor | `compras`, `compras/proveedores` | Completa |
| Conciliación mensual, editor de reglas, reglas sugeridas | — | No existe |
| Plan de cuentas | `plan-de-cuentas` | Completa |
| Asientos, períodos, apertura, EERR y balance | — | No existe |
| Rendiciones (8 pantallas) | — | No existe |

### Cinco cambios de alto impacto, en orden

1. **«Hoy en Finanzas» como portada (`/finanzas`).** Hoy el área no tiene entrada. El diseño la trae: qué emitir, qué cobrar, qué conciliar y el saldo. Es la pantalla que Gard abre cada mañana. Va primero en móvil.
2. **Ficha de venta con barra de acciones** (Emitir · PDF · Enviar · NC · Ceder): una acción primaria según el estado y las demás en el menú «Más». En el teléfono, la barra va fija sobre la barra inferior (la misma corrección que B1 en `ventas/nuevo`).
3. **Sacar Configuración DTE y Folios del menú de Finanzas** y llevarlos a *Configuración › Módulos › Finanzas*. El menú queda con Ventas, Compras, Bancos, Flujo y Contabilidad. En 375 px esto ahorra dos filas de barra.
4. **Estados vacíos con acción real.** Compras vacía habla de «la API o el agente» y no tiene botón para importar el RCV; el selector de proveedor vacío no ofrece crear uno. Cada estado vacío debe tener una acción que el usuario pueda tocar.
5. **Tablas anchas en 375 px:** el libro de ventas, el de compras y la planilla del flujo deben usar el patrón `PlanillaScreen` del DS, con la primera columna fija y desplazamiento horizontal. En el teléfono, la lista de ventas y compras pasa a tarjetas, como en el diseño v3.

### Capturas

- **Escritorio:** se tomaron en el navegador de Carlos, en una ventana más ancha que 1280 px, en Flujo, Ventas, Compras, Compras › Registrar, Bancos, Folios, Configuración DTE, Plan de cuentas y Programación. Quedan en su equipo, en la carpeta temporal de capturas de Chrome.
- **375 px:** no se pudieron tomar. La ventana no se puede achicar desde la sesión y el sitio impide el iframe (`frame-ancestors 'none'`).
- **Pendiente para el operador «Diseño y QA»:** capturas a 375 y 1280 px de las pantallas de esta tabla, guardadas en `docs/2.0/evidencia/finanzas-2026-11/` (issue propuesto en §6).

## 4. Bugs y detalles

| # | Sev. | Qué pasa | Cómo reproducir | Archivo probable |
|---|---|---|---|---|
| **F-B1** | **Bloqueante** | La programación recurrente falla en `test.opai.cl`: «No pudimos cargar esta información». Vercel registra `PrismaClientKnownRequestError` en `finanzas.ventas_programacion.listar` (15:14 UTC) | Finanzas › Ventas › Programación | Migración `20261103160000_finanzas_programacion_forma_1_0` **no aplicada en Neon**. #235 se integró **sin la etiqueta `migracion-pendiente`** (el historial de etiquetas del PR está vacío), aunque ESTADO decía que la tenía |
| F-B2 | Alta | La ficha de venta no tiene acciones: NC, PDF, envío al SII y cesión solo existen por MCP | Ventas › una venta | `ventas/[id]/page.tsx` |
| F-B3 | Media | El selector de proveedor de «Registrar documento» abre vacío, sin mensaje ni opción para crear uno | Compras › Registrar documento, con el tenant sin proveedores | `compras/_componentes/hoja-compra.tsx` |
| F-B4 | Media | El estado vacío de Compras dice «impórtalos desde el RCV con la API o el agente»: es jerga interna y no tiene botón | Compras vacía | `compras/_componentes/libro-compras.tsx` |
| F-B5 | Baja | Texto interno visible: «Plantillas que generan borradores (el cron no emite al SII)» | Ventas › Programación | `ventas/programacion/page.tsx` |
| F-B6 | Media | «Configuración DTE» es la primera entrada del menú de Finanzas | Menú lateral | `modules/finanzas/manifest.ts:50-58` |
| F-B7 | Baja | Trato mezclado: Folios dice «Suba el XML» (usted) y el resto tutea | Folios vacío | `folios/_componentes/pantalla-folios.tsx` |
| F-B8 | Media | Compras tarda 4,6 s en el primer byte (contra 0,4–1,5 s del resto de Finanzas) | Abrir `/finanzas/compras` en frío | `finanzas.compras.listar` (revisar consultas por navegación, ADR-045) |
| F-B9 | Media | La CSP se aplica en modo estricto (`content-security-policy`) y no en «Report-Only», como dice `REGLAS-codigo.md` | Cabeceras de cualquier página | `apps/web/lib/cabeceras-seguridad.ts`, o corregir la regla |
| F-B10 | Baja | Ocho archivos superan las 150 líneas. Pantallas: `ventas/nuevo/formulario-emitir.tsx` (179), `flujo/_componentes/hoja-mover.tsx` (162) y `configuracion-dte/_componentes/pantalla-config-dte.tsx` (199). Capacidades: `modules/finanzas/capacidades/bancos/cartola-importar.ts` (158), `capacidades/lectura.ts` (159), `capacidades/bancos/cuentas.ts` (152), `modules/finanzas/manifest.ts` (151) y `packages/capabilities/src/finanzas/folios-caf-logica.ts` (151) | — | Dividirlos (pantallas en F1, capacidades en F8) |

**Pantalla contra MCP:** las capacidades sin pantalla son `ventas.pdf`, `ventas.enviar_sii`, `ventas.emitir_nota_credito`, `ventas.cesion_*`, `cesiones.listar`, `ventas.proyeccion_flujo`, `compras.importar`, `reglas_banco.*`, `cobros.manual` y `bancos.saldo_sugerido`. Al revés, no se encontró nada: todas las acciones de pantalla llaman capacidades y el gate de paridad está en verde.

**No verificado en vivo:**
- La emisión, la cartola y la conciliación con datos: el tenant de pruebas no tiene CAF, cuentas bancarias, proveedores ni documentos.
- El traslado de una celda del flujo y la edición del plan de cuentas: no se ejecutaron, para no escribir en `test.opai.cl` fuera de un set de datos de QA.
- Propuesta: un seed de QA de Finanzas para `dev` (proveedor, cuenta Santander, cartola de ejemplo, CAF de certificación, cuenta cliente con datos tributarios) que permita repetir el recorrido en cada PR.

## 5. Peso y salud del código

- **Capacidades en dos lugares:**
  - `packages/capabilities/src/finanzas/` (32 capacidades): ventas, DTE, folios, NC, cesión, compras, proveedores, plan y programación.
  - `modules/finanzas/capacidades/` (flujo, celdas, filas, ajustes y bancos).
  - **Conviene unificar en `modules/finanzas/capacidades/<submódulo>/`**, como manda ADR-003. Sin eso, Finanzas no se puede empaquetar ni apagar por partes, y el typecheck de la web recorre las capacidades como fuente (R2 de CAR-161).
  - Hacerlo en un PR mecánico, sin cambio de comportamiento, por submódulo: Ventas, luego Compras y luego Plan. La instantánea MCP no debe cambiar.
- **N+1:** la importación del flujo quedó corregida en #238. Falta medir `finanzas.compras.importar` (RCV) y `finanzas.compras.listar` (F-B8). La conciliación sugerida recorre los candidatos en memoria; está bien con los volúmenes de Gard, pero hay que revisarlo con más de 5.000 movimientos.
- **Bundles:** `presupuesto-js.json` no tiene topes propios para Finanzas, así que rige el tope general. La planilla del flujo es la ruta más pesada del área: siete componentes cliente en `flujo/_componentes`, con hojas de celda, mover e importar. Propuesta: cargar con `dynamic()` las hojas, que solo se abren al tocar una celda, y medir con `pnpm presupuesto` en el PR F1.
- **Estados de carga y error:** no hay `loading.tsx` ni `error.tsx` en `finanzas/**`. Los estados viven en `PaginaPortal` y en los patrones del DS. Funciona, pero sin un esqueleto por ruta el primer render de Compras (4,6 s) se ve vacío.
- **Pruebas:**
  - Hay e2e de compras y flujo.
  - No hay e2e de Ventas, Bancos, Folios ni Configuración DTE.
  - Las capacidades de ventas tienen pruebas de base (#234) y las de flujo, unitarias (`modules/finanzas/capacidades/flujo.test.ts`).
  - **Aislamiento entre empresas:** ya hay pruebas con dos tenants y capacidades reales. `finanzas-aislamiento-db.test.ts` cubre proveedores, libro de compras, plan, referencias cruzadas rechazadas por el trigger y el rol sin tenant. `finanzas-flujo-aislamiento-db.test.ts` cubre el flujo. Bancos, folios y ventas tienen casos de otra empresa en sus `*-db.test.ts`.
  - **Pendiente:** el mismo caso para las capacidades nuevas (programación recurrente de #235, NC y cesión) y para cada capacidad que agreguen F2–F7. No hay que duplicar las pruebas existentes.

## 6. Plan

PR chicos y secuenciales. Primero lo que bloquea la migración de Gard, después contabilidad e informes, y Rendiciones como módulo propio en paralelo, porque no comparte código.

| # | PR | Alcance | Migración | Depende de |
|---|---|---|---|---|
| **O-1** | Operador (no es PR) | Aplicar `20261103160000` con respaldo en `dev` y `main` y dejar el aviso en #235. Renombrar el prefijo de la migración de #237 antes de integrarla | — | — |
| **F1** | `qa/car-finanzas-pulido` | F-B3 a F-B10 (en F-B9, decidir si se corrige la cabecera o la regla de `REGLAS-codigo.md:73`): selector de proveedor con «Crear proveedor», estados vacíos con acción, textos, menú sin Configuración DTE ni Folios (pasan a Configuración), esqueletos de ruta, hojas del flujo con `dynamic()` | No | — |
| **F2** | `brief/car-finanzas-ficha-venta` (CAR-155) | Ficha con acciones (PDF, enviar SII, NC total o parcial, ceder) y **envío al cliente** por Comunicaciones a los contactos de facturación | Sí, aditiva (registro de envíos) | — |
| **F3** | `brief/car-finanzas-recurrentes` (CAR-159) | Crear, editar y pausar programaciones; trabajo diario que genera borradores por corrida; UF del SII según la política; activación desde la fecha de corte; proyección en el flujo | No (tablas de #235) | O-1 |
| **F4** | `brief/car-finanzas-cobranza` | Vencimiento, aging y recordatorios con feriados; pausa al conciliar; «Hoy en Finanzas» | Sí, aditiva | F2 |
| **F5** | `brief/car-finanzas-cierre-mes` | Tablero del período: emisión en lote con una aprobación; EP/proforma | Sí, aditiva | F3 |
| **F6** | `brief/car-finanzas-apertura` | Importar saldos de apertura (bancos), cuentas por cobrar abiertas y último folio por tipo, sobre `core.importaciones` | Sí, aditiva | #237 |
| **F7** | `brief/car-finanzas-banca-reglas` | Pantalla de reglas, cobro manual, conciliación N:M y saldo de apertura visible | Sí, aditiva | F6 |
| **F8** | `perf/car-finanzas-unificar` | Mover `packages/capabilities/src/finanzas` a `modules/finanzas/capacidades/`, sin cambio de comportamiento; casos «dos empresas» solo para lo que no los tiene (programación, NC, cesión); seed de QA | No | Después de F2 y F3, para no chocar |
| **C1** | `brief/car-contabilidad-asientos` | Asientos y períodos (modelo, capacidades y pantallas del export 07) | Sí | Después del corte |
| **C2** | `brief/car-contabilidad-apertura-auto` | Asiento de apertura y asientos automáticos por evento | Sí | C1, F6 |
| **I1** | `brief/car-finanzas-informes` | Libros de ventas y compras con IVA del período (base del F29), cobranza y aging | No | F4 |
| **I2** | `brief/car-contabilidad-eerr` | EERR, balance y mayor por centro de costo; rentabilidad por instalación | No | C2 |
| **R1** | `brief/car-rendiciones-base` | `modules/rendiciones`: manifest, modelo, estados, configuración y capacidades con MCP, sin pantallas | Sí (esquema `rendiciones`) | Hoja de alcance aprobada y Propuesta B decidida |
| **R2** | `brief/car-rendiciones-solicitante` | Mis rendiciones, nueva de compra y de kilometraje (ERP y Portal Trabajador) | No | R1 |
| **R3** | `brief/car-rendiciones-aprobador` | Bandeja del aprobador y detalle | No | R1 |
| **R4** | `brief/car-rendiciones-pagos` | Lotes de pago con archivo del banco; evento hacia Finanzas (Bancos y flujo) si está activo | Sí, aditiva | R3 |
| **R5** | `brief/car-rendiciones-reporte` | Reporte y configuración | No | R4 |

- **Pausar:** factoring y landing de cobro hasta después de F4. Contabilidad (C1 y C2) hasta después del corte.
- **Descartar:** el cierre semanal del flujo (ya retirado); Slack y otros canales en Finanzas.

**Corte de Gard en Finanzas:** O-1 + F2 + F3 + F4 + F6, más las credenciales reales (D5) y la fecha de corte (D4). Con eso Gard factura, envía, cobra y concilia en 2.0. Contabilidad e informes pueden seguir un mes más en 1.0 en solo lectura.

### Issues en Linear (equipo CAR, creados el 3-nov)

Padre: **CAR-163** (esta auditoría). Cada issue trae su prompt para Claude Code o para el bot que corresponde.

| Plan | Issue | Prioridad |
|---|---|---|
| O-1 (operador) | CAR-164 | Urgente |
| F1 pulido | CAR-165 | Media |
| F2 ficha de venta y envío | CAR-155 (reusado, actualizado) | Urgente |
| F3 recurrentes | CAR-159 (reusado, actualizado; bloqueado por CAR-164) | Alta |
| F4 cobranza y «Hoy en Finanzas» | CAR-166 | Alta |
| F5 cierre de mes | CAR-167 | Media |
| F6 saldos de apertura | CAR-168 | Alta |
| F7 banca | CAR-169 | Media |
| F8 unificar capacidades y seed de QA | CAR-170 | Media |
| C1, C2 contabilidad | CAR-171, CAR-172 | Baja |
| I1, I2 informes | CAR-173, CAR-174 | Media, Baja |
| R1–R5 Rendiciones | CAR-175 a CAR-179 | Alta a Baja |
| Capturas 375/1280 | CAR-180 | Media |

**Cerrar:** el PR #231, reemplazado por #235.

## 7. Decisiones que necesita Carlos

1. **Hoja de alcance de Rendiciones** y la **Propuesta B** del export: sin ellas no empieza R1.
2. **Fecha de corte de facturación (D4)** y **credenciales reales (D5)**, que ya son decisiones abiertas del ROADMAP.
3. ¿Contabilidad e informes después del corte, con 1.0 en solo lectura un mes? Es lo que propone este plan.
4. ¿Las recurrentes generan borradores para revisar (propuesto) o emiten solas como en 1.0 con `autoSendEmail`?
5. Que el operador vuelva a cumplir la regla de `migracion-pendiente`: #235 se integró sin ella y rompió una pantalla en `test.opai.cl`.
