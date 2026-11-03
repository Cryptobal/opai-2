# Auditoría de corrección · Flujo de caja (Finanzas) — 2026-11-03

Alcance: `modules/finanzas/{domain,capacidades}` (flujo, celdas, mover, filas, importar*, ajustes, aviso,
lectura, cartola-planilla, derivadas/banco y dte), `apps/web/app/(erp)/finanzas/flujo/**` y
`configuracion/_finanzas/editor-flujo-caja.tsx`. Solo lectura. `pnpm --filter ./modules/finanzas test`:
7 archivos y 33 tests en verde (no prueban los casos de abajo).
Rutas relativas a `modules/finanzas/capacidades/` salvo que se diga otra cosa.

## Resumen por severidad

| # | Sev. | Hallazgo |
|---|------|----------|
| 1 | Alta | La planilla de escritorio se queda en `ajustes.desde`: con el tiempo solo muestra semanas pasadas |
| 2 | Alta | El aviso se calcula sobre otro horizonte y otra base que la planilla; deja de disparar |
| 3 | Alta | La cartola de las semanas pasadas no es la cartola: se pierden egresos, cobros sin fila y lo no conciliado |
| 4 | Alta | Lo real del banco que cae en una fila archivada desaparece del saldo |
| 5 | Alta | DTE: los borradores nunca aparecen (filtro `not` excluye NULL); una NC total resta dos veces |
| 6 | Alta | La celda de la UI muestra solo la primera celda de la semana y no cuadra con el total |
| 7 | Alta | «Hoy» se calcula en UTC: el domingo en la noche (hora de Chile) la semana en curso ya cuenta como pasada |
| 8 | Media | `planilla.obtener` y `derivadas.listar` (lecturas) crean la fila «Cobros», sin auditoría ni evento |
| 9 | Media | Importar CSV: escribe en filas archivadas, ignora la sección, el monto vacío pisa con 0, y «todo o nada» no se cumple |
| 10 | Media | Mover: lee fuera del lock (se pierden actualizaciones) y la vista previa de saldos no cuadra con la planilla |
| 11 | Media | Fijar: carrera en la primera escritura, que termina en P2002 → INTERNAL |
| 12 | Media | Hoja «Reprogramar»: aplica un `por` distinto del que se previsualizó |
| 13 | Media | Hoja de celda: «1,234» se guarda como 1 |
| 14 | Media | El aviso no se sincroniza al cambiar ajustes, al archivar ni al conciliar; dedup permanente |
| 15 | Media | Consultas N+1 por semana pasada; el costo crece sin tope con la antigüedad de `desde` |
| 16 | Baja | Varios menores (ver al final) |

---

## 1 · Alta — La planilla se queda anclada en `ajustes.desde`
- **Evidencia:** `lectura.ts:77` `desde = input.desde ?? (input.movil ? hoy : ajustes.desde)`, y la pantalla nunca
  envía `desde` (`apps/web/.../flujo/_componentes/datos-servidor.ts:15-18`).
- **Escenario:** `ajustes.desde=2026-08-03`, horizonte 12 y hoy 2026-11-03. Escritorio muestra de 03-08 a 19-10:
  todas las semanas son pasadas, no hay ninguna futura editable y el subtítulo dice «Próximas 12 semanas».
- **Arreglo:** en escritorio, por defecto `desde = max(ajustes.desde, hoy − k)` (o `hoy`). Ya se calcula
  `saldoPrevio` para las semanas anteriores (`lectura.ts:85-109`), así que el saldo sigue bien.
- **Test:** con un fake timer, hoy = desde + 20 semanas: `planilla.obtener({})` debe incluir `columnaHoy` y alguna semana con `pasada:false`.

## 2 · Alta — Aviso: otro horizonte y otra base que la planilla
- **Evidencia:** `aviso.ts:332` `lista = semanasDesde(ajustes.desde, horizonte)` y `primero === ajustes.desde`. Por
  eso `previas` (`aviso.ts:338-348`) siempre queda vacía: es código muerto. Además, `semanasProyectadas` usa las celdas
  plan crudas en las semanas pasadas, mientras la planilla usa la cartola (`lectura.ts:95-123`).
- **Escenario A:** con `desde` 12 semanas atrás, ninguna semana del horizonte cumple `>= hoy` (`aviso.ts:399`) y el
  aviso **nunca** dispara.
- **Escenario B:** una semana pasada con plan de egreso de 5 M sin cartola. El aviso proyecta un saldo 5 M más bajo
  que el que muestra la planilla: emite un aviso falso, o lo calla en el caso inverso. `avisoLeido` (planilla) y
  `sincronizarAvisosEnTx` (emisión) evalúan series distintas, y `saldoProyectado` queda guardado con la serie equivocada.
- **Arreglo:** una sola función `serieSaldos(ctx, desde, n, tx)` que use la planilla y el aviso, con la ventana
  `[hoy, hoy+horizonte)` y el saldo previo con cartola.
- **Test:** desde = hoy − 12 semanas, un egreso futuro que deja el saldo bajo el umbral: debe existir 1 `flujoAvisoEmitido`.
  Y un plan pasado sin cartola no debe emitir.

## 3 · Alta — «Real según cartola» no es la cartola
- **Evidencia:** `derivadas/banco.ts:38-43` solo trae movimientos `estado:"conciliado"`, así que la rama «no conciliado
  → Otros ingresos/egresos» de `packages/domain/src/finanzas/bancos/real-flujo.ts:37-45` es inalcanzable. Las
  conciliaciones `documento_recibido` (pago a proveedores) no generan celda (`real-flujo.ts:67-87`: no es
  `cobrosFactura` ni `filaCliente`), y se descartan. Un cobro de factura usa el **nombre de la cuenta** como etiqueta
  de fila (`banco.ts:65-67`); si no hay una fila con ese nombre exacto, `continue` lo descarta (`banco.ts:110-116`).
  Pasa lo mismo con las etiquetas de remuneración y «Costo factoring» si no existen.
- **Escenario:** en la semana pasada hubo un cobro de 1 M (cliente «ACME SpA», sin fila con ese nombre), un pago a
  proveedor de 3 M (conciliado) y una comisión sin conciliar. La planilla muestra 0 en ingresos y 0 en egresos, con
  el saldo 2 M más alto que el banco real.
- **Además:** `/MERMA|FACTORING/` (`banco.ts:94`) manda también el **abono** del factoring (ingreso) a «Costo
  factoring» (egreso): el signo queda invertido.
- **Arreglo:** derivar el real de **todos** los movimientos de la cartola de la semana. Los no conciliados van a Otros
  ingresos/egresos según el signo, los `documento_recibido` a una fila de egreso de proveedores, y lo que no tiene fila
  a la fila genérica según el signo (nunca descartar). Validar que Σ celdas reales = Σ movimientos de la semana.
- **Test:** un test de base con 4 movimientos (no conciliado, recibido, cobro sin fila homónima, abono factoring):
  `ingresos − egresos` de la semana debe ser igual a la suma con signo de los movimientos.

## 4 · Alta — Lo real en una fila archivada desaparece del saldo
- **Evidencia:** `banco.ts:70` lee **todas** las filas (también las inactivas) para mapear etiquetas. `cargarFlujo`
  (`util.ts:93-96`) carga solo las activas, y `calcularPlanilla` ignora un `filaId` desconocido (`domain/index.ts:70-71`).
- **Escenario:** se archiva «ACME SpA» (o «Cobros»). Un cobro conciliado de 1 M sale en `celdas` pero **no suma**
  en el saldo de la semana pasada.
- **Arreglo:** en las derivadas, mapear solo a filas activas (si la fila está archivada, mandar a la fila genérica),
  o bien incluir en el cálculo las filas inactivas que tienen hechos reales.
- **Test:** archivar la fila destino del cobro: los ingresos de la semana pasada deben seguir siendo el monto cobrado.

## 5 · Alta — DTE: borradores invisibles y NC que resta dos veces
- **Evidencia A:** `derivadas/dte.ts:23,27` usa `cesionEstado: { not: "cedido" }`. En Prisma/SQL eso es
  `<> 'cedido'`, que **excluye NULL**. `ventas-borrador.ts:101-115` crea los borradores sin `cesionEstado` (la columna
  es nullable, sin default: migración `20261102170000…:49`), así que ningún borrador entra nunca.
- **Evidencia B:** una NC total marca el original como `anulado_nc` (`ventas-nc-escritura.ts:121-125`), que queda
  excluido, pero la NC (tipo 61, `enviado`, `estadoCobro` pendiente) sigue «por cobrar» y aporta `signo·pendiente`
  negativo (`packages/domain/src/finanzas/derivadas-dte.ts:143-150`).
- **Escenario B:** una factura de 1 M y su NC total por 1 M. Comprometido = −1 M en lugar de 0.
- **Nota:** las derivadas DTE ni siquiera entran en `planilla.obtener`; solo se ven en `finanzas.derivadas.listar`.
  El brief y el diseño piden la capa Comprometido en la planilla.
- **Arreglo:** usar `OR: [{ cesionEstado: null }, { cesionEstado: { not: "cedido" } }]`. Que la NC solo reste si su
  referencia sigue viva (no `anulado_nc`), o mejor, que reduzca el pendiente de su referencia. Decidir si el
  comprometido entra en la planilla y cómo evita el doble conteo con el plan de la fila `finanzas:ventas`
  (regla de negocio para Carlos).
- **Test:** un test de base con un borrador sin `cesionEstado`: debe aparecer en `fuentes.dte.celdas`. Factura + NC
  total: la suma en la semana debe ser 0.

## 6 · Alta — La celda de la UI muestra solo la primera celda de la semana
- **Evidencia:** `apps/web/.../_componentes/datos.ts:111` y `vista-movil.tsx:34` usan
  `celdas.find(filaId && semana)`. En las semanas pasadas, `lectura.ts:153` devuelve **una celda real por movimiento**
  (`banco.ts:121-128`, id = movimiento) más la de «Plan sin respaldo».
- **Escenario:** dos cobros de 400 k y 600 k a la misma fila en la semana pasada. La celda muestra $400.000 y el
  «Total ingresos» $1.000.000. Sin cartola, la celda muestra el **plan** (que no suma) en una columna rotulada «· real».
- **Arreglo:** agrupar en la vista por (fila, semana, capa) y sumar; el plan pasado va como detalle, no como cifra
  principal. Mejor aún: que el backend entregue el valor agregado por celda.
- **Test:** un unit de `armarPlanilla` con dos reales en la misma fila y semana: el texto debe ser la suma, y la suma
  de las filas igual a `s.ingresos`.

## 7 · Alta — «Hoy» en UTC, no en America/Santiago
- **Evidencia:** `lunesDe(new Date().toISOString().slice(0,10))` en `lectura.ts:75`, `celdas.ts:45,108`,
  `mover.ts:45`, `importar.ts:50`, `aviso.ts:55,83`, `derivadas.ts:12` y `util.ts:63` (y en el aviso de banco,
  `bancos/aviso-banco.ts:18`).
- **Escenario:** domingo 2026-11-08 a las 21:30 CLT (UTC−3) son las 00:30 UTC del lunes 09. La semana 02-11 pasa a
  «pasada»: fijar o cumplir rechazan con «Las semanas pasadas se leen de la cartola», la planilla reemplaza el plan
  por la cartola y el aviso salta a la semana siguiente. En invierno (UTC−4) la ventana empieza a las 20:00. La
  aritmética de semanas (UTC 00:00, sin DST) está bien; el problema es solo el «hoy».
- **Arreglo:** un `hoyEnZona(ctx.tenant.timezone ?? "America/Santiago")` con `Intl.DateTimeFormat`, como en
  `packages/capabilities/src/pauta/comun.ts:14`, y un solo helper `lunesHoy(ctx)`.
- **Test:** con `vi.setSystemTime("2026-11-09T00:30:00Z")`, `celdas.fijar` en la semana `2026-11-02` debe ser ok.

## 8 · Media — Lecturas que escriben (fila «Cobros»)
- **Evidencia:** `idFilaCobros` (`banco.ts:12-31`) hace `ctx.db.flujoFila.create` y lo invocan `planilla.obtener`
  (lectura, `dryRun:false`) y `derivadas.listar`. No hay evento, no hay auditoría de escritura y no hay `sinDuplicado`.
  Si la transacción de `enLectura` es de solo lectura, la planilla falla. Dos lecturas concurrentes provocan un P2002
  en `(tenant, etiqueta)` y la planilla queda en error.
- **Arreglo:** que la fila genérica se cree en la conciliación (escritura) o en la siembra del módulo; en lectura, si
  falta, agrupar en una fila virtual.
- **Test:** dos `planilla.obtener` en paralelo sin la fila «Cobros» deben dar los dos ok, y `flujoFila.count` no debe cambiar.

## 9 · Media — Importación CSV
- (a) `importar.ts:44` lee también las filas archivadas: escribe en ellas, cuenta «aplicadas» y nada se ve ni suma.
- (b) La sección del CSV se ignora si la etiqueta ya existe (`importar-aplicar.ts:32-34`): `ingreso,Arriendo,…`
  sobre una fila de egreso «Arriendo» invierte el signo sin ningún aviso. Si dos filas nuevas comparten etiqueta con
  distinta sección, gana la primera.
- (c) Un monto vacío se parsea como 0 (`importar-parse.ts:19`) y **pisa** el plan existente con 0.
- (d) La división es ingenua (`importar-parse.ts:52`): `"Pago, marzo"` entre comillas desplaza las columnas. Lo del
  `;` está bien. Montos: «1.234.567» ok; «1234,00», «-5000» y «1,5» se rechazan (correcto y cubierto).
- (e) `lunesDe("2026-02-30")` no falla: `Date.parse` normaliza al 2 de marzo, así que una fecha inválida se importa
  en otra semana. Hay que validar con `esFechaIso` antes de `lunesDe`.
- (f) Lo de «todo o nada» no se cumple. El `catch` (`importar.ts:101`) se traga cualquier error (también el P2002 de
  filas creadas en paralelo), pero luego **igual** actualiza `saldoInicial`/`desde` (`importar.ts:109-135`) en otra
  transacción, y la capacidad responde ok (la auditoría registra una escritura que no ocurrió).
- **Arreglo:** filtrar `activa:true` (o devolver error si la fila está archivada); devolver error si la sección no
  coincide; tratar el monto vacío como error; usar un parser RFC 4180; validar con `esFechaIso`; meter las celdas y
  los ajustes en una sola transacción y propagar el error.
- **Tests:** un caso por letra en `importar-parse.test.ts` y en `flujo.test.ts`.

## 10 · Media — Mover: lectura fuera del lock y vista previa inconsistente
- **Evidencia:** `mover.ts:44` lee las celdas antes de `ctx.transaccion`. El update del destino usa el monto viejo
  `BigInt(Number(destino.monto) + m.monto)` (`mover.ts:105`).
- **Escenario:** el usuario A mueve 100 k de la semana S a la S+1, que tiene 50 k. Entre su lectura y su transacción,
  el usuario B fija S+1 en 80 k. Resultado: 150 k en vez de 180 k, porque la escritura de B se pierde.
- **Vista previa:** los saldos (`mover.ts:69-80`) parten de `ajustes.saldoInicial`, con el plan crudo en las semanas
  pasadas, sin cartola: no coinciden con la planilla (mismo origen que el n.º 2).
- **Menores:** no revisa `fila.activa`; al fusionar se pierde la nota de origen; la suma puede superar
  `MONTO_FLUJO_MAX` porque la base no tiene CHECK de tope.
- **Conservación:** en el camino feliz, el dominio y la escritura conservan los montos (origen borrado, destino +
  monto). La idempotencia depende de `idempotencyKey`: sin la clave, repetir la llamada mueve dos veces (esperable).
- **Arreglo:** releer las celdas dentro de la transacción después del lock y usar `increment` en el update; calcular
  los saldos con la serie compartida del n.º 2.
- **Test:** un test de base que intercale un `fijar` entre la lectura y el lock (o con dos `Promise.all`): Σ final =
  50 k + 100 k + delta de B.

## 11 · Media — Fijar: carrera en la primera escritura
- **Evidencia:** `celdas.ts:48-50` hace el `findFirst` fuera de la transacción y del lock. Dos `fijar` en paralelo
  sobre una celda que no existe hacen dos `create`, el segundo choca con `@@unique(tenant,fila,semana)` y sale un P2002
  como INTERNAL. El test «dos escrituras concurrentes» (`flujo.test.ts:199`) corre en memoria y no lo detecta.
- **Arreglo:** releer dentro de la transacción después de `bloquearSemanaFlujo`, o hacer `upsert`.
  `cumplir` (`celdas.ts:104`) tiene el mismo patrón.
- **Test:** en `finanzas-flujo-aviso-db.test.ts`, un `Promise.all` de dos `fijar` en una celda nueva: ambos ok.

## 12 · Media — Hoja «Reprogramar»: aplica lo que no se previsualizó
- **Evidencia:** `hoja-mover.tsx:140` (`setPor`) no limpia `vista`, y «Aplicar» manda el `por` actual (`:44,64`).
- **Escenario:** se previsualiza `por=1`, se cambia a `5` y se aplica: mueve 5 semanas sin vista previa ni la
  confirmación de semana pasada (el check se calcula con la vista vieja).
- **Arreglo:** `onChange` de `por` → `setVista(null)`; el cuerpo del botón depende de `vista`.
- **Test:** un e2e o test de componente: cambiar `por` después de la vista previa debe volver a mostrar «Ver vista previa».

## 13 · Media — Hoja de celda: parseo del monto
- **Evidencia:** `hoja-celda.tsx:44` `Number(monto.replace(/\./g,"").replace(",","."))`. «1,234» da 1.234 y se
  redondea a **1**. «12abc» devuelve sin ningún mensaje.
- **Arreglo:** reutilizar `parsearMontoClp` (rechaza decimales y comas) y mostrar el error en el `Campo`.
- **Test:** unit del parser compartido; e2e con «1,234» → error visible.

## 14 · Media — El aviso no se sincroniza en todas las escrituras; dedup permanente
- `sincronizarAvisosEnTx` solo corre en `fijar`, `cumplir`, `mover` e `importar`. No corre en `ajustes.actualizar`
  (bajar el saldo inicial o activar el aviso), en `filas.archivar` (archivar un ingreso) ni en la conciliación
  bancaria, y todas cambian el saldo.
- `@@unique(tenant, semana)` hace que, si el saldo de la semana se recupera y vuelve a caer (o cae más), no se avise
  nunca más, y `saldoProyectado` queda con el valor viejo.
- **Arreglo:** llamarlo en esas escrituras y decidir la regla de re-aviso (por ejemplo, borrar el registro cuando la
  semana se recupera). Regla de negocio para Carlos.
- **Test:** con el aviso activo y `ajustes.actualizar({saldoInicial: −1})`, debe existir 1 aviso.

## 15 · Media — Rendimiento: N+1 por semana pasada
- `cartola-planilla.ts:21-22` llama `derivadasBanco` por semana (unas 4 o 5 consultas cada una). `lectura.ts:85-100`
  repite eso para **todas** las semanas desde `ajustes.desde`, sin tope: con `desde` un año atrás son más de 250
  consultas por carga (ADR-045 pide ≤ 8 por navegación).
- **Arreglo:** una consulta por rango (`fecha BETWEEN`) y agrupar por `lunesIso` en memoria; para el saldo previo,
  un agregado SQL.
- **Test:** contar consultas como en `finanzas-flujo-importar-consultas-db.test.ts`: 4 y 40 semanas pasadas deben dar
  el mismo número.

## 16 · Baja
- `cumplir` deja «real» una celda de semana **futura**; cuando la semana pasa, la cartola la reemplaza y la cifra
  manual se pierde si no hay movimiento conciliado (`cartola-planilla.ts:17`).
- En móvil, «Saldo de hoy» = `semanas[0].saldoFinal`, que es el saldo **al cierre** de la semana, no el de hoy
  (`vista-movil.tsx:21`).
- `planilla.obtener({desde < ajustes.desde})` aplica `saldoInicial` desde la semana pedida, no desde
  `ajustes.desde` (`lectura.ts:84`).
- Las sumas de `calcularPlanilla` van en `Number`: las celdas al tope (10^12) superan 2^53 recién con unas 9.000
  celdas; hoy terminaría en INVALID_OUTPUT.
- No hay forma de borrar una celda plan (solo dejarla en 0).
- `mover` admite semanas fuera del horizonte visible sin tope respecto de `ajustes.desde`
  (`rango` = desde + 78 semanas, `mover.ts:69`); fuera de esa ventana, `saldos` vuelve vacío.

## Sin hallazgos (revisado)
- Lunes ISO, cruce de año y semana 53 (`domain/index.ts`): la aritmética en UTC 00:00 no tiene DST; `esLunes`
  rechaza fechas inválidas. Está cubierto (`domain/index.test.ts:26`).
- Aislamiento por tenant: todo pasa por `ctx.db`/`tx` (forTenant); el advisory lock lleva `tenantId` en la clave y
  usa `$executeRaw` dentro de una transacción. Cubierto por `finanzas-flujo-aislamiento-db.test.ts` (RLS A/B y rol sin
  permisos).
- Permisos: ver, gestionar y configurar están bien asignados; importar y ajustes piden configurar.
- `dryRun` de fijar, cumplir, mover, importar, filas y ajustes no escribe (salvo el n.º 8, que es en lectura).
- La conciliación deshecha (`activa:false`, movimiento vuelve a pendiente) sale de lo real: correcto.
- BIGINT: `aNumeroSeguro` falla cerrado y `montoSchema` tiene tope 10^12 (cubierto).

## Ya cubierto por tests
- Dominio: semanas y cruce de año, saldo acumulado y tono, mover con o sin arrastre, rechazo de lo no-plan y del
  destino real, cierre con tolerancia (`domain/index.test.ts`).
- Capacidades en memoria (`flujo.test.ts`): fijar (crear, rechazo de comprometido y pasada, dryRun), mover
  (vista previa y escritura, semana pasada con confirmación, no mueve lo comprometido), cumplir, permiso de
  gestionar, aviso sin duplicar y lectura que no inserta avisos, archivar.
- BIGINT y saldos grandes (`bigint-flujo.test.ts`, `saldo-grande.test.ts`); parser de montos
  (`importar-parse.test.ts`).
- Base: aislamiento y RLS, aviso con locks en fijar, cumplir, mover e importar (`finanzas-flujo-aviso-db`); cartola
  pasada = conciliado, y plan movido a pasada no suma (`finanzas-flujo-cartola-db`); consultas constantes al importar
  (`…-importar-consultas-db`); derivadas de banco (`finanzas-bancos-conciliacion-db.test.ts:313,453,536`).
- **Sin tests:** zona horaria; ventana del aviso y desde viejo; filas archivadas en derivadas, importar y mover;
  egresos, no conciliados y cobros sin fila homónima; DTE en capacidad (borradores y NC); UI `armarPlanilla` (no hay
  test unitario); `hoja-mover` y `hoja-celda`. El e2e (`apps/web/e2e/finanzas-flujo.spec.ts`) solo revisa el scroll
  horizontal.
