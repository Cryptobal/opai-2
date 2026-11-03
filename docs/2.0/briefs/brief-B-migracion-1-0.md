# Brief B · Migración de OPAI 1.0 a 2.0: recurrentes, exportador, importador seguro, salud del código y ensayo general

**Repos:**
- `Cryptobal/opai-2` (OPAI 2.0, test.opai.cl): todo el trabajo.
- `Cryptobal/opai` (OPAI 1.0, opai.gard.cl): **solo** el endpoint exportador de solo lectura de B2.

**Fecha:** 3-nov-2026 · **Issues:** CAR-25 (#231), CAR-157 (P6), CAR-158 (P7), CAR-161 (P10)

**Fuente principal:** `docs/2.0/auditoria-2026-11.md`:
- §5: piso 1.0 e importador;
- §6: R2–R7;
- §7: plan de migración.

Lee también `AGENTS.md`, `REGLAS-codigo.md`, `docs/2.0/ROADMAP.md` (decisiones D1–D8), `docs/2.0/ESTADO.md` y `docs/2.0/extraccion/comercial-y-cpq.md`.

## 0. Objetivo y contexto

Gard deja OPAI 1.0 hoy. **D4:** el corte es cuando los PR de este brief y del brief A estén en main. La importación real de Gard **solo corre después de que Carlos vea el informe dryRun del ensayo y dé su OK**, y la ejecuta el operador con respaldo previo. Claude nunca la ejecuta.

**Requisito de Carlos: cada cuenta llega con:**
- su RUT;
- sus datos de facturación SII (razón social, giro, dirección, comuna, ciudad, correo DTE);
- sus contactos, con sus roles;
- su programación de facturas recurrentes.

**1.0 es el piso, no el techo:** nada que 1.0 tenga se pierde en el camino. La migración además corrige los defectos del importador actual.

**Estado real del que partes:**
- Las 76 migraciones de main están aplicadas en Neon, y también la migración de #231 (`20261103140000_finanzas_ventas_programacion`). **Esa migración no se edita:** toda corrección va en una migración aditiva nueva.
- La sección «Migraciones» de `ESTADO.md` está desactualizada (dice que faltan evidencias). Corrígela en el PR B1, junto con el código.
- **Importador actual:** `packages/db/scripts/importar-opai1/**`, capacidad `comercial.importar_1_0`. Sus defectos (auditoría §5):
  - toda cuenta e instalación entra como «prospecto»;
  - la razón social se rellena con el nombre de fantasía;
  - las actualizaciones escriben nulos;
  - no hay corridas, reversión ni conciliación;
  - `lectorApiOpai1()` está sin implementar.
- **Esquema de 1.0** (para leer, en `Cryptobal/opai`, `prisma/schema.prisma`):
  - `CrmAccount`:
    - `status`: `prospect | client_active | client_inactive`;
    - `type` e `isActive` heredados;
    - `rut`, `legalName`, `giro`, `address`, `commune`, `city`;
    - representante legal y personería en `AccountRepresentanteLegal` / `AccountPersoneria`.
  - `CrmInstallation.status`: `prospect | active | inactive`.
  - `CrmContact`.
  - `CrmPipelineStage`: `isClosedWon`, `isClosedLost`, `order`.
  - `CrmDeal`: `amount`, `probability`, `expectedCloseDate`, `status`, `proposalSentAt`.
  - `CrmDealStageHistory`.
  - Actividades: `CrmNote`, `CrmTask`, `CrmDealMeeting`.
  - CPQ:
    - `CpqQuote`: `code`, `status`, `validUntil`, `accountId`, `dealId`, `proposalStatus`;
    - `CpqDocumentCounter`: `kind`, `year`, `lastNumber`.
  - `FinanceDte`:
    - `dteType`, `folio`, `siiStatus` con `ACCEPTED`;
    - `receiverEmail`, `receiverEmailTo[]`, `receiverEmailCc[]`.
  - `FinanceDteRecurringTemplate`, línea ~8702 (ver B1).
  - `McpApiKey`: `scope` `READ | READ_WRITE`; resolución en `src/lib/integrations/mcp/keys.ts`.

**Coordinación con el brief A:**
- La parte P8 del brief A (pantallas, job y borradores de recurrentes) depende de que **B1 esté en main**: B1 es dueño del esquema de programaciones y A4 de su uso.
- El brief A agrega `core.cuentas.consultar_sii_lote` (P5), que el ensayo usa si ya está en main.

## 1. PR B1 · CAR-25 · corregir #231 para que calce con las recurrentes reales de 1.0

**Rama:** se continúa la rama de #231 (`cursor/importar-1-0-recurrentes-131b`). Integra main con `git merge origin/main`, sin rebase ni force-push. Si Carlos indica que la rama sigue con otro agente, crea `fix/car-25-recurrentes-1-0` desde la cabeza de #231 y el operador cierra #231.

**Problema:** #231 modela una línea como `{glosa, monto}` en una programación mensual. 1.0 (`FinanceDteRecurringTemplate`) tiene:
- `dteType`: 33, 34, 56 o 61;
- `currency`: CLP o UF;
- `lines` como JSON: `[{ itemName, description, quantity, unit, unitPrice | unitPriceUf, discountPct, isExempt, accountId }]`, donde `accountId` es la cuenta contable;
- `frequency`: `monthly | biweekly | weekly | yearly`;
- `dayOfMonth`: 1–31 o -1 para el último día; además `dayOfWeek` y `monthOfYear`;
- `crmAccountId` puede ser nulo, junto con `receiverRut`, `receiverName`, `receiverGiro`, `receiverDireccion`, `receiverComuna`, `receiverCiudad`, `receiverEmail`, `receiverEmailCc[]` y `recipientContactIds[]`;
- `installationId`;
- `ufFixingPolicy` (`RUN_DAY | LAST_DAY_PREV_MONTH | FIRST_DAY_MONTH | LAST_DAY_MONTH | CUSTOM_DAY`) con `ufFixingDay`;
- `facturaTiming` y `diasCobroDesdeFactura`;
- `hasIpcAdjustment`, `ipcAdjustmentMonths` e `ipcStartDate`;
- `autoSendEmail`;
- `startDate`, `endDate` y `nextRunAt`;
- `additionalReferences`.

**Alcance:**

1. **Migración aditiva nueva** (p. ej. `2026110316xxxx_finanzas_programacion_forma_1_0`). Etiqueta `migracion-pendiente`.
   - **Líneas:** `cantidad` NUMERIC (escala 4) con default 1, `unidad`, `precio_unitario_clp` BIGINT nulo, `precio_unitario_uf` BIGINT nulo (escala `UF_ESCALA`), `descuento_pct` (escala 2), `exento` BOOLEAN y `cuenta_contable_id` nulo.
     - CHECK: exactamente uno de los dos precios, según la `moneda` de la programación.
     - `monto` queda solo para compatibilidad: se calcula y no se requiere.
   - **Programación:** `moneda` (CLP/UF), `dia_semana`, `mes_del_anio`, `instalacion_id`, `fecha_inicio`, `fecha_fin`, `politica_uf` y `dia_uf`, `ajuste_ipc_meses`, `ajuste_ipc_desde`, `envio_automatico` (default false) y `referencias` JSONB validado con Zod.
   - **Datos congelados del receptor:** `receptor_rut`, `receptor_razon_social`, `receptor_giro`, `receptor_direccion`, `receptor_comuna`, `receptor_ciudad`.
   - **CHECK de frecuencia:** `mensual | quincenal | semanal | anual`.
   - **`dia_generacion`:** se reemplaza el CHECK 1–31 por 1–31 o -1, con `DROP CONSTRAINT` + `ADD CONSTRAINT` del CHECK. Es el único cambio permitido sobre lo existente, porque relaja y no destruye.
   - **`tipo_dte`:** el CHECK se amplía a 33, 34, 56 y 61.
   - **`cuenta_id`:** pasa a nulo (`DROP NOT NULL`) para programaciones con receptor sin cuenta. Lleva un CHECK: `cuenta_id` o `receptor_rut` presente.
   - **Unicidad para corridas idempotentes:** tabla `finanzas.ventas_programaciones_corridas (programacion_id, periodo)` con UNIQUE y RLS. El brief A (A4) la usa.
2. **Tipos y lector:** `recurrentes-tipos.ts` y `origen-recurrentes-cpq.ts` aceptan la forma real de 1.0, con Zod en el borde.
   - Si una programación tiene un valor no soportado, se **omite con una advertencia nombrada** (id y motivo, sin datos personales) y no hace fallar todo el JSON.
   - El informe agrega la sección `omitidas[]`.
3. **Resolución de la cuenta:**
   - por `crmAccountId` usando el mapa de ids importados;
   - si es nulo, por `receiverRut` normalizado contra `cuentas.rut`;
   - si no hay cuenta, queda con receptor congelado y la advertencia «sin cuenta en 2.0».
4. **Destinatarios:** `recipientContactIds` se mapea a contactos importados; `receiverEmail` y `receiverEmailCc` pasan a destinatarios por correo.
5. **Estado:**
   - Las programaciones importadas quedan **pausadas** y con `proxima_ejecucion_en` NULL. **No se copia `nextRunAt`.**
   - Se guarda `ultimo_periodo_1_0`, derivado de `lastRunAt` y de `FinanceDteRecurringRun` con `success`, para que la primera generación en 2.0 sea el período siguiente sin duplicar.
6. **CPQ:** el correlativo de cotizaciones se fija dentro de la misma corrida (`correlativos.fijar` con el máximo de `CpqDocumentCounter` por año y tipo). Así ningún folio de cotización de 2.0 repite uno de 1.0.
7. **ESTADO.md:** corregir la tabla «Migraciones» (todas aplicadas al 3-nov-2026) y la nota de la etiqueta `migracion-pendiente`.

**Criterios de aceptación:**
- Fixtures ficticios, con un caso por cada combinación de 1.0:
  - UF con cantidad y descuento;
  - exento;
  - quincenal, semanal y anual;
  - día -1;
  - cuenta nula con RUT, y cuenta nula sin RUT;
  - frecuencia desconocida, que se omite con advertencia.
- `pnpm test` cubre la conversión de cada fixture.
- `pnpm test:db` aplica la migración nueva sobre la base de tests:
  - los CHECK rechazan los dos precios a la vez;
  - una programación sin cuenta ni RUT se rechaza.
- Una corrida dryRun produce el informe con conteos por sección, las omitidas y las advertencias, sin escribir nada.

## 2. PR B2 · `feat/car-158-exportador-opai1` · P7 (en `Cryptobal/opai`, más el lector en 2.0)

**D3: un endpoint de solo lectura en 1.0, sin tocar su lógica.**
- 1.0 está congelada a correcciones críticas; esta es la excepción que autorizó Carlos.
- PR propio en `Cryptobal/opai`. Carlos lo fusiona y despliega.

**En 1.0, ruta nueva `src/app/api/export/opai2/v1/[recurso]/route.ts`:**
- **Solo GET.** Archivos nuevos únicamente, salvo el registro de la ruta si hace falta. No modifica servicios, modelos, crons ni migraciones de 1.0: **cero escrituras**.
- **Autenticación:** `Authorization: Bearer <key>`, resuelta con `src/lib/integrations/mcp/keys.ts`.
  - Exige `scope === "READ"` y una key no revocada.
  - El tenant sale de la key, nunca de un parámetro.
  - Si la key no cumple, responde 401/403 sin detalle.
  - La key la crea Carlos en 1.0 y la guarda en 1Password. Nunca va al chat ni al código.
- **Contrato versionado `opai1-export/v1`:** cada respuesta es `{ version: "opai1-export/v1", generadoEn, recurso, cursor, siguiente, filas[] }`.
  - Paginación por cursor, con 500 filas por página y orden estable por `id`.
  - Recursos y campos:
    - `cuentas`: todos los campos de `cuentaOpai1` (`origen.ts` en 2.0), más `status`, `type`, `isActive`, `legalRepresentativeName/Rut`, `notaryName/Date`, `ownerId`, `startDate` y `endDate`.
      - `emailDte` = `receiverEmail` del **último `FinanceDte` con `siiStatus = ACCEPTED`** de esa cuenta (por RUT receptor o por cuenta), o nulo.
    - `contactos`: con las banderas de rol (`recibeFacturacion`, etc.).
    - `instalaciones`: con `status`.
    - `etapas`: `CrmPipelineStage` con `order`, `isClosedWon`, `isClosedLost` e `isActive`.
    - `negocios`: `CrmDeal` con etapa, monto, probabilidad, dueño, fechas, `status` y `proposalSentAt`, más `historial_etapas` (`CrmDealStageHistory`).
    - `actividades`: `CrmNote`, `CrmTask` y `CrmDealMeeting`, normalizadas a `{tipo, negocioId, cuentaId, autor, fecha, texto, estado}`.
    - `cotizaciones`: `CpqQuote` vigentes (`validUntil >= hoy`) y ganadas.
      - Van **tal como quedaron congeladas**: totales, líneas, código y estados.
      - Sin recalcular.
    - `correlativos`: `CpqDocumentCounter`.
    - `recurrentes`: `FinanceDteRecurringTemplate` tal cual, junto con su última `FinanceDteRecurringRun` exitosa.
    - `folios`: último folio usado por `dteType`, para que Carlos cargue en 2.0 un CAF sin cruce.
- **Tests en 1.0:**
  - sin key: 401;
  - key `READ_WRITE` o revocada: 403;
  - un tenant no ve filas de otro;
  - la paginación es estable;
  - no hay ningún `create`, `update` ni `delete` en la ruta (test que busca esas llamadas en los archivos nuevos).
- **Documento del contrato:** `docs/opai2-export-v1.md`, dentro del PR de 1.0.

**En 2.0 (en B3, porque usa el contrato):** `lectorApiOpai1()` implementado.
- Lee `OPAI1_EXPORT_URL` y la key desde el almacén cifrado del tenant o, para el ensayo local, desde la variable de entorno `OPAI1_EXPORT_KEY` de la sesión. Nunca se escribe en archivos.
- Recorre todas las páginas, valida cada fila con Zod (errores con rutas, sin valores) y alimenta la misma interfaz `LectorOrigen` que usan los fixtures.
- Opción `--guardar-instantanea <ruta>` que escribe el JSON fuera del repo (en `.gitignore`), para ensayar varias veces con los mismos datos sin volver a llamar a 1.0.

## 3. PR B3 · `feat/car-157-importador-v2` · P6: importador seguro, idempotente y reversible

**Alcance:**
1. **Corridas.** Tabla `core.importaciones` con id, tenant, origen, versión del contrato, modo (`simular` o `aplicar`), estado, conteos y quién la lanzó, más `core.importaciones_filas` (entidad, id_1_0, id_2_0, acción `creado | completado | sin_cambio | omitido`, y valores previos solo de los campos tocados). Ambas con RLS, en una migración aditiva.
   - Cada corrida aplica en **lotes de unas 500 filas**, cada lote en su transacción con auditoría.
   - La corrida se puede retomar: lo ya importado se detecta por `id_1_0` y no se duplica.
2. **Política «solo completar vacíos».**
   - Una actualización solo escribe en campos vacíos de 2.0. **Nunca escribe nulos** y nunca pisa un valor que ya existe.
   - Si hay conflicto (dos valores distintos), se informa y no se escribe.
   - Después del corte, esa política queda bloqueada: el importador rechaza `aplicar` sobre un tenant con `importacion_cerrada_en` puesto, salvo con la bandera explícita de reimportación que solo el operador usa.
3. **Mapeo correcto:**
   - **Cuentas:**
     - `client_active` → cliente activo;
     - `client_inactive` → cliente inactivo;
     - `prospect` → prospecto;
     - si `status` falta, se usa `type` / `isActive` heredado.
   - **Instalaciones:** `active` / `inactive` / `prospect` → su estado equivalente en 2.0.
   - **La razón social** sale de `legalName`. **Nunca se rellena con el nombre de fantasía**: si falta, queda vacía y la cuenta marca «no lista para facturar».
   - **Campos extra:** giro, dirección, comuna, ciudad, emailDte, representante legal, notaría, dueño, inicio y término.
   - **Contactos** con sus roles (facturación, cobranza, operacional, cesión, comercial).
   - **Negocios:**
     - con etapa, mediante una **tabla de equivalencia de etapas 1.0 → 2.0** en un archivo de configuración del tenant (`equivalencia-etapas.gard.json`, ids de etapa, sin datos personales);
     - con su historial;
     - sin la tabla confirmada por Carlos, `aplicar` se niega y `simular` muestra las etapas sin mapear.
   - **Actividades** al timeline de la cuenta o del negocio, como interacciones.
   - **Cotizaciones vigentes y ganadas:** congeladas, con el código de 1.0, sin recalcular y vinculadas al negocio.
   - **Recurrentes:** como en B1.
4. **Reversión.** `comercial.importar_1_0` admite la acción `revertir` sobre una corrida, con dryRun:
   - borra lo creado por esa corrida;
   - restaura los valores previos de lo completado;
   - se niega si una fila fue modificada después en 2.0, y la informa.
5. **Conciliación** (acción `conciliar`, de lectura). Por entidad entrega:
   - conteo en 1.0, importado, omitido con motivo, y diferencia;
   - sumas de control:
     - suma de montos de negocios abiertos;
     - suma de totales de cotizaciones vigentes;
     - suma CLP y UF de líneas recurrentes;
     - número de cuentas con RUT;
     - número de cuentas «listas para facturar»;
   - una **muestra de 20 cuentas** al azar con semilla fija, comparando campo por campo 1.0 frente a 2.0.

   El informe se genera en JSON y Markdown. Los datos personales (nombres, RUT, correos) solo aparecen en la salida local, nunca en el repo ni en el PR: en el repo van solo conteos y sumas.
6. Todo por capacidad (`comercial.importar_1_0` con `simular | aplicar | conciliar | revertir`) y con el script `packages/db/scripts/importar-opai1/` como envoltorio. UI = API = MCP: la pantalla de importación que ya existe, si la hay, muestra corridas, informe y reversión.

**Criterios de aceptación:**
- Con fixtures:
  - la segunda corrida da 0 creados y 0 cambios;
  - una cuenta que ya tiene giro en 2.0 no cambia;
  - un campo nulo en 1.0 no borra nada en 2.0;
  - `client_active` llega como cliente activo;
  - una razón social vacía no se rellena;
  - revertir deja la base igual al estado previo (test que compara antes y después);
  - la conciliación cuadra conteos y sumas;
  - las etapas sin equivalencia bloquean `aplicar`.
- `pnpm test:db` sobre las tablas nuevas, con aislamiento entre tenants.
- Paridad en verde.

## 4. PR B4 · `feat/car-157-ensayo-migracion` · ensayo general en una rama nueva de Neon

Es el único momento en que Claude toca Neon, y nunca en main. **Proyecto Neon `steep-wildflower-90764475`.**

**Código del PR:** el script orquestador `packages/db/scripts/importar-opai1/ensayo.ts`, más los arreglos que salgan del ensayo.

**Pasos:**
1. **Rama de Neon.** Crea una rama **nueva** desde `main`, llamada `ensayo-migracion-gard-20261103`.
   - Usa la CLI o el MCP de Neon con el acceso de la sesión.
   - La cadena de conexión vive solo en una variable de entorno de la sesión, nunca en archivos ni en el chat.
   - Aplica en esa rama las migraciones pendientes de B1, B3 y del brief A, si las hay. Es la única base en la que Claude aplica migraciones.
2. **Origen.** Usa el exportador B2 desplegado en 1.0, con la key READ que Carlos pone en la sesión (`OPAI1_EXPORT_KEY`). Guarda una instantánea local fuera del repo.
   - Si B2 todavía no está desplegado, ensaya con fixtures, marca el informe como «parcial» y no lo des por terminado.
3. **Secuencia** sobre el tenant Gard de la rama:
   1. `simular`;
   2. `aplicar`;
   3. `conciliar`;
   4. `revertir`, y verificar que vuelve a cero diferencias contra la base previa;
   5. `aplicar` otra vez, y `conciliar`;
   6. si A3 está en main, `core.cuentas.consultar_sii_lote` en **dryRun** (con mock: no llames a SimpleAPI real), solo para medir cuántas cuentas quedarían «listas para facturar».
4. **Informe dryRun para Carlos** en la descripción del PR:
   - conteos y sumas por entidad;
   - omitidas por motivo;
   - etapas sin mapear;
   - cuentas sin RUT o no listas para facturar (solo el número);
   - programaciones recurrentes por frecuencia y moneda;
   - último folio por tipo DTE (para el CAF);
   - duración por fase.

   El detalle con datos personales queda local, y se lo pasas a Carlos por el canal que él indique, no por el PR.
5. **Cierre.** Deja la rama de Neon creada, para que el operador y Carlos la revisen; no la borres. **No ejecutes nada sobre main de Neon ni sobre test.opai.cl.**

**Checklist del corte** (en el informe, para Carlos y el operador; no lo ejecutes tú):
- Carlos da su OK al informe.
- El operador respalda main de Neon.
- Aplica las migraciones dev→main.
- Corre `aplicar` real y después `conciliar`.
- Carlos apaga en 1.0 el cron de recurrentes y la emisión.
- Carlos carga en 2.0 el CAF desde el folio siguiente al último de 1.0 (D5).
- Se activan las programaciones desde el período siguiente.
- Se marca `importacion_cerrada_en`.

## 5. PR B5 · `fix/car-161-salud-codigo` · P10 (R2, R3, R5, R6, R7)

Va al final, después de B1–B3, para no chocar con ellos.

| Ítem | Qué hacer | Criterio verificable |
|---|---|---|
| R2 | Quitar `typescript.ignoreBuildErrors` y la necesidad de `NODE_OPTIONS=--max-old-space-size=4096`: referencias de proyecto o `incremental`, sin tipos gigantes inferidos. Revisa el registro de capacidades | `pnpm build` y `pnpm typecheck` pasan sin la bandera y con el límite de memoria por defecto, y el build de Vercel queda en verde |
| R3 | Quitar las N+1 de las alertas de pauta y de la importación CSV del flujo: lecturas por lote (`IN` / `findMany` agrupado) e inserciones por lote | Test que cuenta consultas: constantes respecto del número de filas (p. ej. 5 consultas o menos con 10 o con 500 filas) |
| R5 | Borrar el código muerto: `modules/*/ui` sin uso, `proveedor-stub.ts`, `cierre-ui.ts`, `personas/_componentes/{tabla-sueldo,selector-puesto,sueldo-comun}` y la capacidad `finanzas.cierres.listar` si no tiene uso (actualizando paridad y el snapshot MCP) | `pnpm typecheck` y los tests en verde; `rg` sin referencias a lo borrado |
| R6 | Quitar las dependencias de scaffold sin uso (verificar con `knip` o `depcheck`) | Lockfile más chico; build y tests en verde |
| R7 | `pnpm.overrides` para `react-dom` y `zod` en una sola versión, y `next` como peer en los paquetes que no son app | `pnpm why react-dom zod` muestra una sola versión; sin advertencias de peer |

**No toques** los archivos de P1 (sesión y cookieCache) ni los de P3 (adaptadores SII y Octava). Si R5 encuentra código muerto en ellos, solo lo anotas en ESTADO.

## 6. Qué NO hacer

- No tocar P1 (CAR-152, #233), P3 (CAR-154), #213 ni #168.
- No editar migraciones ya aplicadas (la de #231 incluida). Solo migraciones aditivas nuevas: nada de DROP de tablas o columnas ni cambios de tipo destructivos; relajar un CHECK está permitido.
- No aplicar migraciones en Neon dev ni en main. No ejecutar la importación real de Gard. No conectarse a la base de 1.0: se lee solo por el endpoint B2.
- No modificar la lógica, los modelos ni los crons de 1.0. En `Cryptobal/opai` solo van los archivos nuevos del exportador.
- No llamar a SimpleAPI ni a Octava reales, ni emitir DTE.
- No dejar datos personales de Gard en el repo, los PR, los fixtures o los logs. Los fixtures son ficticios.
- No abrir PR que solo tengan documentos.
- No dejar secretos (keys, cadenas de conexión) en el código, `.env` versionados ni el chat.

## 7. Orden de PR y reglas del repo

**Orden:**
1. B1 (#231 corregido) y B2 en 1.0 en paralelo.
2. B3 (importador v2 y lector API).
3. B4 (ensayo en una rama nueva de Neon, con el informe).
4. B5 (salud del código).

El brief A (A4) espera a B1. Antes de pedir revisión, haz `git merge origin/main` y regenera los snapshots de paridad.

**Reglas:**
- **Ramas:** `feat/car-NNN-…` o `fix/car-NNN-…`, salvo la continuación de #231. Sin force-push ni rebase.
- **Copiar este brief en el PR:** al abrirlo, guárdalo en `docs/2.0/briefs/brief-B-migracion-1-0.md` dentro de ese mismo PR, junto con el código. La descripción lleva `Fixes CAR-NNN` y la lista de criterios marcados.
- **Migraciones:** solo aditivas, con RLS (ENABLE + FORCE + política `tenant_isolation`) en cada tabla nueva y la etiqueta `migracion-pendiente`. Claude no las aplica: el operador hace el respaldo y aplica dev→main antes de la fusión. Única excepción: la rama de ensayo de B4.
- **Capas y paridad:** cada capacidad pasa por `defineCapability`, y pantalla, `/api/v1` y MCP quedan iguales. Las escrituras llevan dryRun, idempotencyKey y auditoría en la misma transacción. `paridad-inventario.test.ts` en verde.
- **Código:**
  - archivos de 150 líneas o menos;
  - sin `any`;
  - dominio puro;
  - `forTenant` / `enTransaccion`;
  - dinero en enteros y UF con `UF_ESCALA`;
  - `timestamptz` UTC;
  - Zod en los bordes.
- **Textos de negocio en español**, sin jerga ni referencias internas.
- **Gate local:** `pnpm typecheck && pnpm lint && pnpm test && pnpm test:db && pnpm presupuesto`.
- **PR listo:** cuando **Vercel está en verde**. GitHub Actions falla con `startup_failure`; no es bloqueante.
- **Carlos hace las fusiones**, también la de 1.0.
- **ESTADO e issue:** cada PR agrega una línea en `docs/2.0/ESTADO.md` y cierra o actualiza su issue CAR.
- **Secretos:** nunca en código ni en chat.
