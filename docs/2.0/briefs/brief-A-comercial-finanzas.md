# Brief A · Comercial y Finanzas: textos, facturación real, SII por RUT, recurrentes, seguimiento y refresco visual

**Repo:** `Cryptobal/opai-2` (OPAI 2.0, test.opai.cl) · **Fecha:** 3-nov-2026 · **Issues:** CAR-153 (P2), CAR-155 (P4), CAR-156 (P5), CAR-159 (P8), CAR-160 (P9) y el refresco visual (C1–C5, sin issue propio: va con CAR-153)
**Fuente principal:** `docs/2.0/auditoria-2026-11.md` (§3.2 diseño, §4.2 bugs, §5 piso 1.0, §6 refactor). Léela antes de empezar, junto con `AGENTS.md`, `REGLAS-codigo.md`, `DISENO.md`, `docs/2.0/ROADMAP.md` y `docs/2.0/ESTADO.md`.

## 0. Objetivo y contexto

Hoy Gard deja de facturar en OPAI 1.0 y pasa a 2.0 (D4: el corte se hace hoy, cuando los PR de este brief y del brief B estén en main). Para eso 2.0 tiene que hacer bien, desde una pantalla y por MCP, lo que 1.0 ya hace:
- facturar y mandar la factura al cliente;
- sacar los datos tributarios de una empresa con su RUT;
- generar cada mes la facturación recurrente;
- hacer el seguimiento de las cotizaciones.

Además tiene que verse moderno y ordenado.

**Principio: 1.0 es el piso, no el techo.** Lo que 1.0 sabe hacer se iguala y se mejora. Las reglas arbitrarias de 1.0 (días cableados, etapas buscadas por nombre, umbrales fijos) no se copian.

**Lo que ya existe y no se rehace:**
- Las capacidades de ventas ya existen sin pantalla: `finanzas.ventas.{emitir_nota_credito, enviar_sii, pdf, cesion_simular, cesion_ceder}` y `finanzas.dte_config.*`.
- El envío de cotización con propuesta técnica ya existe (`cpq.cotizaciones.enviar`, `cpq.envios_propuesta.*`, `modules/cpq/persistencia/propuesta-envio-*`).
- Los roles de contacto ya existen, incluido «facturacion» (`crm.prisma`, `maestros.prisma`).
- Hay feriados en `calendario.prisma`.
- `cuentas.emailDte` ya existe.

**Lo que corre en paralelo en otros agentes y NO se toca:**
- **P1 (CAR-152, PR #233):** cortes de Neon y cookieCache de sesión.
- **P3 (CAR-154):** adaptadores reales de SimpleAPI y Octava. P3 deja el contrato `AdaptadorSii` (`packages/integrations/src/sii/tipos.ts`: `firmar`, `enviar`, `consultar`) y el resolvedor `packages/capabilities/src/finanzas/adaptador-sii.ts`, con el ambiente leído desde `finanzas.dte_config`. **Este brief usa ese contrato y no reescribe adaptadores.** Cualquier parte que emita o envíe se integra solo cuando P3 esté en main: haz `git merge origin/main`, nunca rebase. Mientras tanto, los tests usan el adaptador `simulado.ts` o mocks.
- **PR #213 y #168:** no se tocan.
- **PR #231 y el brief B:** el brief B corrige el modelo de recurrentes (#231: columnas nuevas para cantidad, UF, descuento y frecuencias). La parte P8 de este brief (§4) usa ese modelo y empieza cuando la corrección de #231 esté en main. No redefinas esas columnas.

## 1. PR A1 · `fix/car-153-textos-estilos` · P2 + R4

**Alcance.** Corregir los bugs B2 a B12 de la auditoría §4.2 (B1 ya está resuelto en #232) y dejar un solo formateador (R4).

| Bug | Qué corregir | Dónde (auditoría §4.2) | Criterio verificable |
|---|---|---|---|
| B2 | Clases que no existen (`t-h2`, `t-h3` y otras). Reemplazar por el set `t-*` real | `resumen-cotizacion.tsx:81`, `semaforo-margen-cpq.tsx:25`, `pagina-armador.tsx:51`, `pagina-biblioteca.tsx:23`, `finanzas/bancos/_componentes/*`, `configuracion/remuneraciones/*` | Un test (o regla de lint) recorre `apps/web` y falla ante cualquier clase `t-` que no esté definida en el DS. Queda en CI |
| B3 | Espacio duro (NBSP) entre «$» y el monto, y en «UF» | `packages/domain/src/dinero.ts:78` y sus copias | Test unitario: `formatearClp(1234567)` devuelve `"$\u00a01.234.567"` |
| B4 | Estados sin traducir; la pestaña muestra el id | `ventas/[id]/page.tsx:32,64,85,89`, `lista-ventas.tsx:132,141` | Ningún estado interno (`borrador`, `aceptado_sii`, …) se ve en pantalla: se usa un diccionario de etiquetas en español con test. La pestaña muestra «Factura 33 · Folio N» o «Borrador» |
| B5 | Referencias internas visibles (ADR, CAR, brief) | `configuracion/agentes/conectar/page.tsx:89`, `form-agente.tsx:80`, `hoja-refuerzo.tsx:105`, `hoja-reemplazo.tsx:151`, `planilla-flujo*.tsx`, `detalle-aprobacion.tsx:25` | `rg -n "ADR-\|CAR-\|Brief" apps/web/app --glob '*.tsx'` no encuentra texto visible (los comentarios están permitidos) |
| B6 | Jerga visible (slug, tenant, capability, payload, ids) | `hoja-punto.tsx:79`, `campos-punto.tsx:55`, `configuracion/empresa/page.tsx:31`, `auditoria/*`, `detalle-aprobacion.tsx:37,56`, `resumen-cotizacion.tsx:93` | Textos de negocio: empresa, acción, datos. La auditoría muestra la acción con su nombre legible (mapa nombre técnico → etiqueta, con test de cobertura sobre el registro de capacidades) |
| B7 | Errores del servidor mostrados en crudo | `_components/use-capacidad.ts:41` | El usuario ve un mensaje en español según el código de error (`validacion`, `permiso`, `conflicto`, `no_encontrado`, `limite`, `interno`), más un «qué hacer». El detalle técnico va solo a la consola o al log. Con test |
| B8 | Título «Error del servidor» sin guía | `hoja-subir-cartola.tsx:93`, `hoja-subir-caf.tsx:86`, `hoja-mover.tsx:107`, `hoja-celda.tsx:98` | Título según el caso más una acción sugerida (reintentar, revisar el archivo, contactar a un administrador) |
| B9 | Textos en inglés | `resumen-tenant.tsx:100`, `administradores-tab.tsx:85`, `editor-flujo-caja.tsx:109` | Todo en español |
| B10 | Calendario de pagos editado como JSON | `editor-flujo-caja.tsx:131` | Editor con filas (día, monto o porcentaje, glosa) hecho con componentes del DS. Valida con Zod y no expone JSON |
| B11 | Título duplicado y «← Volver» hecho a mano | `pantalla-bancos.tsx:68`, `ventas/[id]/page.tsx:55-60` | Un solo título por pantalla y la navegación de vuelta del DS (`AppShell`/migas) |
| B12 | La bandeja de Inicio se queda en skeleton | `bandeja-diferida.tsx` | Carga, muestra su vacío o su error en menos de 3 s con la base local. Test del estado de error (antes quedaba colgada) |

**R4: un solo formateador.**
- `@opai/domain` exporta `formatearClp`, `formatearUf` (usa `UF_ESCALA`), `formatearFecha` y `formatearFechaHora` (zona America/Santiago), `formatearRut` y `formatearPorcentaje`.
- Se borran las copias en `apps/web` y `modules/*` y se reemplazan sus usos.
- Criterio: `rg "toLocaleString\(\"es-CL\"|Intl.NumberFormat" apps modules` solo devuelve el formateador central. Hay tests de borde: negativos, cero, UF con 4 decimales y RUT con K.

**Gate:** `pnpm typecheck && pnpm lint && pnpm test && pnpm presupuesto` en verde. Sin cambios de capacidades, así que la paridad no cambia.

## 2. PR A2 · `feat/car-160-seguimiento-cotizaciones` · P9 (PR 1 del seguimiento)

**Fuente:** `docs/2.0/modulos/seguimiento-comercial.md` (CAR-67).
- Las 18 decisiones de su §16 están tomadas por Carlos. Al lanzar este brief, Carlos aprueba la especificación para este PR 1.
- Piso de 1.0: `Cryptobal/opai` `src/lib/crm/followup-cadence.ts`, de solo lectura.

**Alcance del PR 1:**
1. **Plan de seguimiento por empresa (tenant).** Pasos en **días hábiles** contados desde el envío; el día del envío no cuenta. Los días hábiles son de lunes a viernes, menos los feriados del tenant (`calendario.prisma`).
   - Cada paso tiene canal (correo, llamada o WhatsApp, tarea interna), ejecutor (`persona` u `opai`), plantilla y, opcionalmente, una etapa destino **por id**, nunca por nombre.
   - Valor inicial sembrado para Gard, igual al 1.0 vivo:
     - día 3: correo;
     - día 7: llamada o WhatsApp;
     - día 14: correo;
     - día 15: revisión interna «Proponer perdido».
   - Hora del tenant: 9:00 America/Santiago, editable.
2. **Inicio al enviar.** En el envío de cotización con propuesta técnica (`cpq.cotizaciones.enviar` y `cpq.envios_propuesta.solicitar/aprobar`), el diálogo pide decidir entre:
   - «Enviar e iniciar seguimiento» (por defecto);
   - «Enviar y mover sin seguimiento», que avisa cuántos pasos pendientes se cancelan;
   - «Solo enviar».

   Por MCP es el mismo parámetro. Un reenvío cancela los pasos pendientes y reprograma desde el nuevo envío.
3. **Pausa.**
   - Manual, con motivo: pausar, reanudar o cancelar.
   - Automática cuando el cliente responde. En este PR, «responde» significa:
     - una interacción entrante registrada en la actividad del negocio (por pantalla o por MCP, `core.actividades.*`);
     - o el negocio movido a una etapa marcada «en negociación» o posterior.
   - No se lee Gmail.
   - Nunca baja de etapa un negocio que ya está más adelante.
4. **Tareas en la bandeja.**
   - Cada paso de persona crea una tarea en la bandeja de Inicio del responsable del negocio, con el borrador de correo ya preparado si corresponde.
   - Los pasos `opai` dejan un borrador listo para aprobar. **Nunca envían solos a un cliente**: enviar es irreversible y pasa por aprobación humana (spec §6 «Envío por agentes»).
   - Cada paso hecho queda registrado como interacción en la pestaña Actividad.
5. **Visible:**
   - bloque «Seguimiento» en el Resumen del negocio;
   - indicador corto en la tarjeta del tablero: «Seguimiento 2 de 4 · hoy», «Vencido», «Pausado».
6. **Job diario** (`packages/capabilities/src/trabajos` o el cron que ya existe), idempotente por paso agendado. Marca los vencidos y crea las tareas del día.

**Capacidades** (UI, `/api/v1` y MCP idénticos; escrituras con `dryRun`/`preview_` + `idempotencyKey` + auditoría en la misma transacción):
- `comercial.seguimiento_planes.{listar, obtener, guardar}`;
- `comercial.seguimientos.{iniciar, pausar, reanudar, cancelar, listar, obtener}`;
- `comercial.seguimiento_pasos.{completar, posponer, omitir}`.

Los nombres finales siguen la §10 de la spec; si difieren, manda la spec.

**Migración aditiva:** tablas de plan, pasos del plan, seguimiento y paso agendado, con `tenant_id`, ENABLE + FORCE RLS y la política `tenant_isolation`, y `timestamptz` UTC. Lleva la etiqueta `migracion-pendiente`.

**Criterios de aceptación:**
- Test de dominio: un envío del viernes 31-oct-2026 con feriado el 1-nov agenda los pasos en los días hábiles correctos (3, 7, 14, 15).
- El reenvío reprograma y cancela los pasos previos.
- Una respuesta del cliente pausa y no baja la etapa.
- El job corrido dos veces no duplica tareas.
- Cada paso `opai` produce un borrador y cero correos enviados (mock de Comunicaciones con cero llamadas a `send`).
- `pnpm test:db`: aislamiento entre tenants en las tablas nuevas.
- `paridad-inventario.test.ts` en verde, con el snapshot de herramientas MCP actualizado.

**Fuera de este PR (declarar en ESTADO como pendiente):** detección de respuestas por correo entrante, alertas de negocios detenidos y seguimiento de negocios sin cotización.

## 3. PR A3 · `feat/car-155-ficha-venta-dte` · P4 + P5 (integra P3 cuando esté en main)

Los dos usan el contrato SII de P3. Desarrolla con el adaptador simulado y haz `git merge origin/main` cuando P3 entre. No modifiques `simpleapi.ts`, `octava.ts`, `tipos.ts` ni `adaptador-sii.ts` más allá de importar lo que exportan. Si P3 todavía no está en main al terminar, deja el PR listo y sin fusionar, avísalo en la descripción y no dupliques su trabajo.

### 3.1 P4 (CAR-155): ficha de venta con acciones

**Ficha de venta (`finanzas/ventas/[id]`)** con acciones según el estado, todas respaldadas por las capacidades que ya existen:
- **Emitir:** antes muestra un **chequeo previo** (capacidad nueva de lectura `finanzas.ventas.preflight_emision`):
  - RUT y razón social del receptor;
  - giro, dirección y comuna;
  - folio disponible del CAF;
  - certificado vigente;
  - ambiente;
  - correo de envío.

  Al emitir, los datos tributarios del receptor **se congelan en el documento**: un cambio posterior de la cuenta no altera una factura emitida.
- **Enviar al SII**, **Consultar estado**, **Ver PDF / descargar XML**.
- **Nota de crédito** (total o parcial, con motivo). Hoy `ventas-nc-escritura.ts:41` siempre simula: con P3 en main debe usar el adaptador real resuelto por ambiente. El modo «simulado» solo existe en certificación o en tests.
- **Ceder (Octava):** simular primero y después ceder, con confirmación explícita.
- **Lista de ventas:** filtros por estado SII y por cliente, y etiquetas en español (las de B4).

**Configuración DTE (`configuracion/facturacion` o la ruta de Finanzas que ya exista):**
- Pantalla para `finanzas.dte_config.*`:
  - proveedor de emisión (`dte_config.emisionProveedor`);
  - ambiente;
  - certificado .pfx (subida con el validador de `certificado-pfx.ts`; la clave nunca se muestra ni se registra);
  - CAF por tipo, con folios restantes;
  - resolución SII.
- **Una sola fuente de ambiente:** `dte_config`. Si existe otra lectura del ambiente (env var o constante), se elimina; un test verifica que el resolvedor solo lee `dte_config`.
- **Lista de chequeo de producción**, con un ítem verde o rojo por cada condición:
  - certificado vigente;
  - CAF cargado para 33, 34 y 61;
  - resolución;
  - correo de intercambio;
  - una emisión exitosa en certificación.

  El paso a «producción» requiere todo verde, además de confirmación y auditoría. **Carlos carga las credenciales y el CAF (D5); Claude no.**

**Envío al cliente por Comunicaciones:**
- Capacidad `finanzas.ventas.enviar_cliente` (escritura, con dryRun e idempotencyKey) que manda el PDF y el XML adjuntos.
- **Destinatarios por defecto:** los contactos de la cuenta con rol «facturacion», más `cuentas.emailDte` si existe. Se pueden editar y agregar CC.
- Usa el módulo Comunicaciones que ya existe (Resend detrás), nunca un cliente HTTP nuevo.
- Registro de envíos: tabla aditiva `finanzas.ventas_envios_cliente` con destinatarios, estado, id del proveedor y fecha, con RLS.
- Idempotente: la misma clave no reenvía. Hay botón «Reenviar».
- Visible en la ficha («Enviada a … el …»).
- Opción del tenant: enviar al cliente automáticamente cuando el SII acepta. Viene apagada.

### 3.2 P5 (CAR-156): datos SII por RUT

Piso de 1.0: `src/modules/finance/shared/adapters/simpleapi-rut.ts` y `src/app/api/crm/accounts/[id]/lookup-rut/route.ts` en `Cryptobal/opai` (solo lectura, para ver campos y la forma de la respuesta).

- **Integración:** `consultarContribuyente(rut)` en un archivo nuevo, `packages/integrations/src/sii/contribuyente-simpleapi.ts`, más un doble simulado. No modifica el adaptador DTE de P3.
  - Devuelve razón social, giros y actividades, dirección, comuna, ciudad, correo de intercambio, inicio de actividades y estado.
  - Las credenciales salen del almacén cifrado del tenant, nunca de una constante.
- **`core.cuentas.consultar_sii`** (lectura): valida el RUT con dígito verificador, usa caché y devuelve los datos SII más un **diff campo por campo** contra la cuenta.
  - Caché por (tenant, RUT), con migración aditiva `core.contribuyentes_sii_cache` (RLS, `consultado_en` timestamptz), y TTL de 30 días.
  - Consultas encoladas en un trabajo, con límite de ritmo, para que el lote no golpee la API.
- **`core.cuentas.aplicar_sii`** (escritura con dryRun): aplica solo los campos que la persona marca en el diff. Si hay `idempotencyKey`, queda auditado con el antes y el después.
- **`core.cuentas.consultar_sii_lote`** (escritura con dryRun): encola la consulta de N cuentas y deja el diff pendiente de revisar. El brief B lo usa después de importar.
- **Pantalla en la ficha de cuenta:** botón «Traer datos del SII», hoja con el diff (campo, actual, SII, casilla) y «Aplicar».
- **Indicador «lista para facturar»** en la ficha y en la lista de cuentas. Se cumple cuando hay:
  - RUT válido;
  - razón social;
  - giro;
  - dirección y comuna;
  - al menos un destinatario de facturación (contacto con rol o emailDte).

  Si falta algo, dice qué falta. El chequeo previo de 3.1 reutiliza la misma función de dominio.

**Criterios de aceptación de A3 (todos con mocks, cero llamadas reales):**
- Test: emitir congela los datos del receptor. Cambiar la cuenta después no cambia el documento.
- Test: la NC usa el adaptador resuelto por ambiente. En producción, el adaptador simulado lanza error.
- Test: `enviar_cliente` con la misma `idempotencyKey` llama una sola vez al mock de Comunicaciones. Los destinatarios por defecto salen de los contactos con rol facturación más emailDte.
- Test: `consultar_sii` con RUT inválido da un error de validación en español. La segunda llamada sale de la caché, con cero llamadas al mock. `aplicar_sii` con dryRun no escribe.
- Test: «lista para facturar» lista los campos faltantes.
- `pnpm test:db` sobre las tablas nuevas, más la paridad en verde. Las pantallas nuevas pasan por `pnpm presupuesto`.
- Capturas en la descripción del PR (375 y 1280 px): ficha de venta, Configuración DTE con la lista de chequeo y la hoja de diff SII.

## 4. PR A4 · `feat/car-159-recurrentes-borradores` · P8

**Empieza cuando la corrección de #231 (brief B, PR B1) esté en main.** Usa sus tablas `finanzas.ventas_programaciones*` y las columnas que agrega: cantidad, unidad, precio CLP o UF, descuento, exento, frecuencias, día -1 (último día del mes), política de fijación UF y datos del receptor. No crees columnas paralelas.

**Alcance:**
- **Pantallas** `finanzas/ventas/programacion` (lista) y `[id]` (ficha): crear, editar, pausar y reanudar.
  - Líneas con cantidad × precio, en CLP o UF, con descuento y exento.
  - Frecuencia: mensual, quincenal, semanal o anual.
  - Día de generación, con «último día del mes».
  - Plazo de pago.
  - Destinatarios, por contacto con rol facturación o por correo, más CC.
  - Vista previa del próximo borrador.
- **Capacidades:** `finanzas.programaciones.{listar, obtener, crear, editar, pausar, reanudar}`, con UI = API = MCP. Las escrituras llevan dryRun e idempotencyKey. Si #231 ya trae algunas, se completan y no se duplican.
- **Job diario**, `finanzas.programaciones.generar_borradores`, que corre en el cron del tenant a las 06:00 America/Santiago:
  - Por cada programación activa que vence, crea un **borrador** de venta. **Nunca emite**: emitir sigue siendo una acción humana o una aprobación.
  - **Idempotencia por (programación, período)**: índice único en la tabla de corridas o en el borrador. **No** se basa en `lastRunAt`. Si se corre dos veces el mismo día, o después de una caída, no duplica. Un período que ya tiene borrador queda «omitido: ya existe».
  - **Líneas en UF:** valor UF del SII (indicador oficial ya disponible en 2.0; si no está, la tabla de indicadores que ya existe), según la política de la programación:
    - día de generación;
    - último día del mes anterior;
    - primer día del mes;
    - último día del mes;
    - día fijo.

    El monto CLP se redondea al entero. Queda guardado el valor UF usado.
  - Los **destinatarios** de la programación se copian al borrador y son los que usa `finanzas.ventas.enviar_cliente` (A3) al enviar.
  - Hay registro de corridas visible en la ficha: generado, omitido con motivo, o fallido con el error en español.
- Programaciones importadas de 1.0 (brief B): llegan **pausadas** y sin `proxima_ejecucion_en`. La pantalla permite revisarlas y «Activar desde el período X».

**Criterios de aceptación:**
- Test de dominio para cada frecuencia y para «último día» en febrero y en años bisiestos.
- Test: el job corrido 2 veces para el mismo período produce 1 borrador.
- Test: una línea de UF 12,5 × 2 con descuento del 10 % y un valor UF dado da el CLP esperado.
- Test: los destinatarios de la programación llegan al envío.
- Test: una programación pausada no genera.
- Paridad en verde y `pnpm test:db`.

## 5. PR A5 · `feat/car-153-refresco-visual` · C1–C5 (siempre DS 2.0)

**Moderno y minimalista, siempre dentro del DS 2.0** (`packages/ds`), con los tokens de `packages/ds/src/tokens.css` y los componentes Radix del DS. **Nada de estilo 1.0**: ni sus colores, ni sus tarjetas, ni sus tablas. Los valores son los de la auditoría §3.2, propuesta «DS 2.0 · refresco visual v1.1». Se aplican en este orden, en commits separados: C1 + C3 + C4, luego C2, luego C5.

| Bloque | Cambio | Pantallas piloto |
|---|---|---|
| C1 | `--ds-shadow-card: 0 1px 2px rgba(17,17,19,.04), 0 0 0 1px rgba(17,17,19,.05)`; fondo de la app `#f6f6f7`; `--radius-card: 12px` (16 px solo en hojas y diálogos); encabezado de sección como eyebrow, sin línea | Inicio, Cuenta, Persona, Cotización |
| C3 | `t-kpi` 32/36, peso 600, tabular; `t-kpi-sm` 22/28. Inicio con 3 a 4 KPIs | Inicio |
| C4 | Tablas planas: encabezado 11/16 en mayúsculas, filas de 44 px, `numerica` alineada a la derecha; ítem de menú activo en color de acento | Cotizaciones, Ventas, Bancos, Plataforma › Empresas |
| C2 | Barra superior de 52 px; un solo `t-title` 28/34 por pantalla | Inicio, Negocios, Cotizaciones, Finanzas |
| C5 | Vacío con el ícono en un círculo de acento; kanban sin fondos de columna; en el celular, chips de etapa en vez de columnas | Negocios, vacíos de todas las listas |

**Reglas:**
- Solo se cambian tokens y componentes del DS. Las pantallas heredan, sin estilos locales.
- Modo oscuro equivalente.
- Contraste AA verificado.

**KPIs de Inicio (D6):** Carlos no los ha elegido. Usa por defecto:
- cobertura de hoy;
- cotizaciones por aprobar;
- negocios abiertos;
- por cobrar a 7 días.

Que estén definidos en un solo arreglo, fácil de cambiar, y deja la decisión explícita en la descripción del PR.

**Criterios de aceptación:**
- Capturas antes y después en `/ds` y en las pantallas piloto, a 375, 1024 y 1280 px, claro y oscuro, en la descripción del PR. Carlos aprueba el diseño al revisarlas y fusionar.
- `pnpm presupuesto` sin aumento de JS por encima del presupuesto.
- Sin elementos HTML crudos.

## 6. Qué NO hacer

- No tocar P1 (CAR-152, #233), P3 (CAR-154: adaptadores SimpleAPI y Octava, `tipos.ts`, `adaptador-sii.ts`), #213 ni #168.
- No llamar a las APIs reales de SimpleAPI u Octava ni emitir DTE reales. Los tests usan mocks o el adaptador simulado. No cargar certificados ni CAF reales.
- No aplicar migraciones en Neon ni conectarse a Neon. Las migraciones son aditivas: nada de DROP, RENAME ni cambios de tipo destructivos.
- No crear pantallas, colores, sombras ni tipografías fuera del DS ni con estilo 1.0. Tampoco editar `tokens.css` fuera de A5.
- No enviar correos a clientes desde un job. Los pasos de agente y el envío automático tras la aceptación del SII están apagados por defecto y siempre usan Comunicaciones.
- No copiar las reglas arbitrarias de 1.0: cierre automático por monto, etapas por nombre, variable de entorno del correo automático.
- No abrir PR que solo tengan documentos.
- No dejar secretos en el código, los tests, los logs ni el chat.

## 7. Orden de PR y reglas del repo

**Orden:**
1. A1 y A2 en paralelo, sin dependencias.
2. A3, cuando P3 esté en main.
3. A4, cuando B1 (#231 corregido) esté en main.
4. A5 al final, después de A1, para no chocar en las mismas pantallas.

Antes de pedir revisión, haz `git merge origin/main` y regenera los snapshots de paridad (herramientas MCP e inventario): habrá otros PR tocándolos.

**Reglas:**
- **Ramas:** `feat/car-NNN-…` o `fix/car-NNN-…`. Sin force-push ni rebase: se integra main con merge.
- **Copiar este brief en el PR:** al abrirlo, guárdalo en `docs/2.0/briefs/brief-A-comercial-finanzas.md` dentro de ese mismo PR, junto con el código. La descripción lleva `Fixes CAR-NNN` y la lista de criterios marcados.
- **Migraciones:** solo aditivas, con RLS (ENABLE + FORCE + política) en cada tabla nueva y la etiqueta `migracion-pendiente`. **Claude NO las aplica:** el operador hace el respaldo y aplica dev→main antes de la fusión.
- **Capas y paridad:** cada capacidad pasa por `defineCapability`, y pantalla, `/api/v1` y MCP quedan iguales. Las escrituras llevan dryRun, idempotencyKey y auditoría en la misma transacción. `paridad-inventario.test.ts` en verde; las excepciones solo en `paridad-excepciones.ts` / `paridad-entradas.ts`, con su justificación.
- **Código** (REGLAS-codigo.md):
  - archivos de 150 líneas o menos;
  - sin `any`;
  - dominio puro;
  - `forTenant` / `enTransaccion`;
  - dinero en enteros y UF con `UF_ESCALA`;
  - `timestamptz` UTC;
  - Zod en los bordes;
  - solo clases `t-*` existentes.
- **Textos de negocio en español**, sin jerga ni referencias internas.
- **Gate local:** `pnpm typecheck && pnpm lint && pnpm test && pnpm test:db && pnpm presupuesto`. Si el build se queda sin memoria, usa `NODE_OPTIONS=--max-old-space-size=4096` en tu sesión mientras el brief B (R2) lo arregla.
- **PR listo:** cuando **Vercel está en verde**. GitHub Actions hoy falla con `startup_failure`; no es bloqueante.
- **Carlos hace las fusiones.** No las hagas tú.
- **ESTADO e issue:** cada PR agrega una línea en `docs/2.0/ESTADO.md` (En curso → Integrado) y cierra o actualiza su issue CAR.
- **Secretos:** nunca en código ni en chat.
