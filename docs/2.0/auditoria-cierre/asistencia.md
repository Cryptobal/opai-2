# Auditoría de cierre · 04 · Asistencia

**Fecha:** 16-nov-2026 · **Sesión:** Auditoría de cierre (tanda 04, 05 y 16) · **Foto:** `main` en `886e262` · Solo lectura: no se cambió código, datos ni tickets.

**Avance real: 54 %** (Linear marca 100 %: sus 2 tickets están en Done).

## Cómo se calculó (igual en los tres informes de esta tanda)

- **Alcance (70 % del total):** cada cosa que hace OPAI 1.0 o que exige la especificación vale 1 si está en 2.0, 0,5 si está parcial y 0 si falta. Lo que se decidió no portar queda fuera de la cuenta.
- **Estándares (15 %):** seis chequeos (patrón de lista y ficha CAR-545, paginación y búsqueda reales, sin duplicados CAR-580, sin textos internos CAR-579, permisos por rol, MCP para todo lo de pantalla), con 1, 0,5 o 0 cada uno.
- **Pruebas (15 %):** juicio sobre qué flujos tienen pruebas de base y e2e, y si están en verde en la última corrida nocturna (CI `43888727747` y `preview-e2e` del 16-nov).
- Fuentes: Linear (proyecto y búsqueda por texto y etiqueta), los 955 PR del repositorio por API, el código de `main`, el repositorio de 1.0 (`Cryptobal/opai`, solo lectura) y los registros de CI.
- **No verificado en pantalla:** esta sesión no tiene las credenciales de `qa-e2e` (viven solo en GitHub Actions). Lo visual sale del código y de las corridas `preview-e2e`, que sí entran con `qa-e2e` en test.opai.cl.

Asistencia: alcance 15,5 / 28 = 55 %; estándares 3 / 6 = 50 %; pruebas 50 %. Total: 0,7 × 55 + 0,15 × 50 + 0,15 × 50 = **54 %**.

## Lo más importante

1. **CAR-89 («Asistencia y Reportes DT, Briefs 18–19») está en Done, pero el Brief 19 nunca se construyó.** No hay reportes DT, ni portal de fiscalización, ni respaldos. El diseño está aprobado desde el 31-oct (`docs/2.0/diseño/export-reporteria-dt-v2/`, PR #175) y el encargo de construirlo quedó en un comentario del ticket.
2. **Contingencias no se pueden cerrar.** No hay pantalla para registrarlas ni para aceptarlas; `asistencia.contingencias.responder` es solo para personas y no tiene pantalla. El correo al trabajador enlaza a `/mis-marcas`, una ruta que no existe (`consumidor-contingencia.ts:34` y `consumidor-alertas.ts:35`). Como una contingencia no cuenta hasta aceptarse, hoy nunca cuenta.
3. **Casi todo RR. HH. vive solo en el MCP.** En pantalla solo existe «Asistencia de hoy» (`/asistencia`). Proponer correcciones, ver marcas, contingencias, incidentes y el resumen del período no tienen pantalla.
4. **Para Gard no hay nada en vivo:** `marcas_habilitadas` viene apagado y Gard sigue marcando en 1.0 (D-07, comentario de Carlos en CAR-89).

## 1. Tickets contra PR

| Ticket | Estado Linear | PR | ¿En `main`? | ¿El código hace lo que pide? |
|---|---|---|---|---|
| CAR-89 · Ola 4 · Asistencia y Reportes DT (Briefs 18–19) | Done (9-nov) | #341 A1, #348 A2, #352 A3, #377 A3 pendientes, #360 Face ID, #401 pruebas, #394 checklist; requisito previo #338 (CAR-201) | Sí, todos integrados | **No.** Brief 18 sí (marca legal, comprobante, correcciones, días, rostro, presencia en la Pauta). Brief 19 (reportes DT) no existe. Tampoco el «e2e móvil del circuito completo» que exige la aceptación del ticket. **Done que no corresponde.** |
| CAR-311 · Indicadores «Marcas a la hora» y «Ausentismo» | Done (12-nov) | #576 | Sí | Sí. |

Sin PR cerrados sin integrar ni reversiones en el módulo (`git log` de `modules/asistencia` y de `(erp)/asistencia`). El proyecto no tiene tickets abiertos. Relacionados abiertos en otros proyectos: CAR-226 (cierre operativo de Terreno, In Progress), CAR-77 (libro de novedades, In Progress) y las brechas R-1 y R-3 de `auditoria-estandares/portales.md` (portal Trabajador y Supervisor sin asistencia).

## 2. Alcance contra 1.0

Fuente 1.0: `ops/marcaciones`, `reportes/dt/*`, `fiscalizacion-dt/*`, `marcar/[code]`, `marcacion/oposicion/[token]`, `payroll/asistencia`, `portal/supervisor/instalaciones/[id]/hoy` y `docs/2.0/extraccion/dt-normativa.md`.

| # | Qué hace 1.0 (o exige la especificación) | En 2.0 | Detalle |
|---|---|---|---|
| 1 | Marca inmutable, hora del servidor, snapshot y hash encadenado | Está | `asistencia.marcas`, triggers, `cadena.ts` |
| 2 | Marcar con RUT + PIN en el equipo de la instalación | Está | Terreno `/terreno/marcar` |
| 3 | Marcar desde el teléfono personal con GPS | Está | Portal Trabajador `/trabajador/marcar`, habilitado por persona |
| 4 | Face ID: consentimiento, enrolamiento, marca, revocación | Parcial | Código y pruebas listos (#360); faltan credenciales del proveedor, prueba de vida real y DPA |
| 5 | Enlace o QR público por instalación (`/marcar/[code]`) | Falta | La especificación dice conservar los dos métodos; 2.0 solo tiene equipo emparejado y portal |
| 6 | GPS como evidencia y alerta fuera de rango | Parcial | La marca queda «fuera»; el aviso solo sale por Slack (CAR-293), no por correo ni campana |
| 7 | Comprobante al correo y verificación pública por hash | Está | `/verificar/marca/...` |
| 8 | Correcciones con 48 h de oposición | Parcial | Servidor y enlace público sí; sin pantalla para proponer ni para que el trabajador responda en su portal |
| 9 | Contingencia | Parcial | Solo MCP para registrar; no se puede aceptar (ver «Lo más importante» 2) |
| 10 | Incidentes técnicos | Parcial | Capacidades por MCP, sin pantalla |
| 11 | Lista de marcaciones con filtros, búsqueda, hash y KPIs | Falta | `asistencia.marcas.listar` solo por MCP |
| 12 | Asistencia de hoy en el ERP | Está | `/asistencia` |
| 13 | Asistencia de hoy del supervisor | Falta | El portal Supervisor no tiene asistencia |
| 14 | Alertas del art. 45, descanso insuficiente y horas compensables | Está | `alertas-art45.ts`, `alertas-descanso.ts` |
| 15 | Alertas de límites de jornada (42 h semana, 12 h día, 2 h extra) | Falta | No hay regla en `modules/asistencia/domain` |
| 16 | Día consolidado con siglas, atraso y extras | Está | `asistencia.dias` |
| 17 | Presencia en Pauta diaria y mensual | Está | `pauta/presencia.ts` (#360) |
| 18 | Cierre de asistencia del período para Nómina | Parcial | `asistencia.dias.resumen_periodo` existe; Nómina no la usa y no tiene pantalla |
| 19 | Seis reportes DT con exportación a Excel, PDF y Word | Falta | Diseño P01–P02 aprobado, sin código |
| 20 | Clientes del prestador, mandante y EST | Falta | Diseño P08 |
| 21 | Portal de fiscalización (inspector, sesión temporal, accesos auditados) | Falta | Diseño P06–P07; el permiso `asistencia:reportes` existe sin nada que mostrar |
| 22 | Respaldos de la bitácora con manifiesto (art. 14 b) | Falta | Diseño P09 |
| 23 | Verificación diaria de la cadena | Está | Evento `asistencia.cadena.rota` |
| 24 | Configuración (canales, geocerca, plazos, alertas) | Está | Desde el manifest, en el centro de configuración |
| 25 | Dispositivos de la instalación (emparejar, revocar) | Está | `/instalaciones/[id]/dispositivos` |
| 26 | Indicadores de desempeño | Está | CAR-311 |
| 27 | Cola sin conexión para la marca | Parcial | Cola del núcleo existe; casos Q-01 y Q-02 sin prueba; e2e `terreno-cola-offline` en rojo el 16-nov |
| 28 | Reloj del servidor contra la hora oficial (SHOA) | Falta | Pendiente de certificación desde 1.0 |

No se portan por decisión: Slack como canal de marcas (es canal opcional del núcleo).

## 3. Estándares

| Chequeo | Resultado | Evidencia |
|---|---|---|
| Lista y ficha (CAR-545) | Parcial | «Asistencia de hoy» es una lista sin ficha: una fila no abre nada ni ofrece «Proponer corrección», que pedía la especificación |
| Paginación y búsqueda reales | No | `asistencia.dias.hoy` devuelve todo con marca `truncado`; sin búsqueda. Siete lecturas siguen en `apps/web/test/listas-pendientes.json` (`dias.hoy`, `dias.resumen_periodo`, `marcas.listar`, `correcciones.listar`, `contingencias.listar`, `incidentes.listar` y `rostro.textos`) |
| Sin duplicados (CAR-580) | Parcial | Geocerca de Rondas contra radio de Asistencia sigue como decisión abierta en `inventario-duplicados.md` §5 (CAR-581) |
| Sin textos internos (CAR-579) | No | Ayudas de Configuración › Asistencia en `modules/asistencia/capabilities/ajustes.ts` muestran «(D-13)», «(D-01)», «(T-04)» y «está pendiente de confirmar con el texto íntegro de la Res. 38». El test de CAR-579 no busca esos códigos |
| Permisos por rol | Sí | Seis permisos clasificados en `permisos-base-modulos.ts`; alcance del supervisor en la consulta |
| MCP para todo lo de pantalla | Sí | Toda acción de pantalla llega a una capacidad. Excepción justificada: marcar, rostro y responder son solo personas (ADR-023, Ley 21.719) |

Además, el módulo no aporta al buscador general; está declarado como excepción en `buscador-cobertura.test.ts` («pendiente su buscador»).

## 4. Pruebas

| Flujo | Pruebas | Estado |
|---|---|---|
| Marca (PIN, idempotencia, doble toque, nocturno, dos empresas) | `asistencia-circuito-db`, `asistencia-marcas-db` | Base en verde (CI del 16-nov, `test:db` ok en la nocturna) |
| Rostro | `asistencia-rostro-db`, `biometria-db`, adaptador Rekognition | Base en verde, con proveedor simulado |
| Correcciones y contingencias | `asistencia-correcciones-db` | Solo servidor; sin e2e |
| Día consolidado e indicadores | `asistencia-dias-db`, `-volumen-db`, `-indicadores-db`, dominio | Verde |
| Asistencia de hoy | `fechas-incidente-asistencia-preview` | Verde en `preview-e2e` (test.opai.cl, qa-e2e); **rojo en el e2e de CI** en las tres resoluciones el 15 y 16-nov (la lista no carga con la base efímera) |
| Marcar en Terreno y Portal Trabajador de punta a punta | Ninguna | Falta (la exige CAR-89) |
| Cola sin conexión | `terreno-cola-offline.spec.ts` | Rojo el 16-nov |
| Reportes DT y fiscalización | — | No existen |

## 5. Tickets propuestos (por impacto en la operación)

| # | Título | Qué hacer | Listo cuando | Prioridad |
|---|---|---|---|---|
| A1 | Reportes DT (Brief 19) | Construir P01, P02 y P10 del export `reporteria-dt-v2` (P03, verificar por hash, ya existe; P04 y P05 van en A2 y A3): seis reportes con siglas oficiales y exportación, desde marcas, correcciones aceptadas y días | Cada reporte es una capacidad con MCP y permiso `asistencia:reportes`; Excel y PDF con la cabecera de la Res. 38; prueba con dos empresas; e2e `@preview` | Urgente (sin esto no se certifica ni hay corte de Gard) |
| A2 | Contingencias de punta a punta y enlace roto | Pantalla de RR. HH. para registrar (con evidencia), pantalla o enlace del trabajador para aceptar u objetar, y correos que lleven a una ruta que exista | Ninguna URL de correo da 404 (prueba que recorra las URL de los comunicables); una contingencia aceptada aparece en el día; e2e | Alta |
| A3 | Correcciones desde pantalla | «Proponer corrección» desde Asistencia de hoy y desde la marca; lista de correcciones con estado; el trabajador ve y responde en su portal | RR. HH. propone sin MCP; el trabajador acepta en el portal; e2e a 375 y 1280 | Alta |
| A4 | Lista de marcas en el ERP | Lista con filtros (instalación, persona, fecha, método, GPS), búsqueda, paginación por cursor y detalle con hash | `asistencia.marcas.listar` sale de `listas-pendientes.json`; e2e `@preview` | Alta |
| A5 | Portal de fiscalización, mandantes y respaldos | P06–P09 del export: sesión temporal de inspector, accesos auditados, clientes del prestador, respaldos con manifiesto | Inspector de prueba entra en solo lectura y queda auditado; respaldo con SHA-256 verificable | Alta |
| A6 | e2e del circuito completo | Marcar (Terreno y Trabajador) → comprobante → día → Pauta diaria y mensual, en qa-e2e; arreglar la carga de `/asistencia` en el e2e de CI | Run nocturno en verde con el circuito | Media |
| A7 | Asistencia de hoy en el portal Supervisor | Llevar la misma lista al portal, con alcance por instalación | Supervisor ve solo sus instalaciones; e2e a 375 | Media |
| A8 | Nómina lee la asistencia del período | Coordinar con la sesión Payroll para que la liquidación use `asistencia.dias.resumen_periodo` | Liquidación de prueba con días y atrasos de Asistencia | Media |
| A9 | Alertas de límites de jornada | 42 h semanales, 12 h diarias y 2 h extra, con vigencia, en dominio con pruebas | Alerta al superar cada límite; sin avisos repetidos | Media |
| A10 | Listas al contrato CAR-353 | Pasar las listas a `cursor`, `limite` y `siguiente`; búsqueda en Asistencia de hoy | `listas-pendientes.json` sin entradas de asistencia | Media |
| A11 | Aviso fuera de geocerca por correo y campana | Hoy solo va a Slack | Comunicable editable en Comunicaciones | Baja |
| A12 | Ayudas de Configuración sin códigos internos | Quitar «D-13», «D-01», «T-04» y «pendiente de confirmar»; ampliar el test de CAR-579 a códigos `D-`, `T-` y `L-` | Test falla si vuelven | Baja |
| A13 | Marca por enlace o QR público de la instalación | Decidir si se conserva (la especificación dice que sí) y construirlo en el portal | Decisión anotada; si va, marca por QR con la misma capacidad | Baja |

Depende de Carlos (para «Decide Carlos», no para esta sesión): credenciales del proveedor biométrico y DPA para Face ID real; criterio de corte de 1.0 a 2.0 (D-07); plazo de corrección de 48 h contra la Res. 38.

## Para la próxima tanda

- CAR-89 debería reabrirse o tener un hijo «Brief 19 · Reportes DT»; hoy nada en Linear lo pide.
- La especificación `docs/2.0/modulos/asistencia.md` aún dice «propuesta, no implementada» y no hay hoja de alcance aprobada (`diseño/alcance-asistencia.md` no existe).
<<<<<<< HEAD

## Tickets creados (16-nov)

A1 CAR-590 · A2 CAR-591 · A3 CAR-592 · A4 CAR-593 · A5 CAR-594 · A6 CAR-599 · A7 CAR-600 · A8 CAR-601 (proyecto 12 Payroll) · A9 CAR-602 · A10 CAR-603 · A11 CAR-604 · A12 CAR-605 · A13 CAR-606. Relacionado: CAR-626 (marca sin conexión, proyecto 08 Terreno).
=======
>>>>>>> origin/main
