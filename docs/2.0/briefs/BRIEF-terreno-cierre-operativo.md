# BRIEF · Terreno · Cierre operativo (CAR-226 · continuación del circuito de CAR-78)

**Sesión:** «Terreno · Code». **Tarea:** [CAR-226](https://linear.app/carlos-irigoyen/issue/CAR-226) (dependencias de cierre: CAR-77 bitácora, CAR-122 Portería, CAR-89 Asistencia). **Base:** `main` en `156376c`, que ya incluye #389 (squash `b3aee9a`, 9-nov 14:51 UTC). Este PR es solo el diagnóstico y el plan: no trae código ni migraciones.

## 1. Diagnóstico (verificado en `main`, 9-nov-2026)

### Ya está en `main`
| Área | Qué hay | Evidencia |
|---|---|---|
| Identidad y equipo | RUT + PIN (B1), dispositivos emparejados con código/QR y revocación (B2), cola sin conexión con `core.hechos_terreno` y lote idempotente (B3) | `core/terreno/{credenciales,dispositivos,hechos*}.ts`, migraciones `20261108100000`–`120000` |
| Biometría | Adaptador `Biometria` simulado (falla cerrado en producción), enrolamiento cifrado, borrado al revocar consentimiento (B4); Face ID sobre ese contrato y proyección de presencia en Pauta (#360, integrado) | `20261108130000`; ESTADO fila #360 |
| Offline por operación | Lista blanca de tipos: `terreno.latido`, `rondas.{marca,inicio,cierre,novedad}`, `acceso.{entrada,salida}`; cola visible (pendiente · sincronizado · rechazado) | `hechos-tipos.ts`, `cola.ts` |
| Rondas en Terreno | Marca por QR/GPS con geocerca y anomalías (R2, R3, R7, R8), inicio y cierre con completa/incompleta, «Mis rondas», cámara o código | `rondas-*.ts`, `/terreno/rondas`, migraciones `20261113100000` y `120000` |
| Novedad de ronda | Hecho `rondas.novedad` → libro `rondas.novedades`, idempotente, sin migración | `rondas-novedades.ts` |
| Portería | Módulo `acceso` (listas, registros, MCP), documento solo como huella HMAC + máscara, patente completa tras `acceso:datos.ver_patente`, entrada/salida por la cola, «En sitio» sin patente, `/terreno/porteria` | `modules/acceso`, `packages/capabilities/src/acceso`, `20261113110000` |
| Topes de JS | `/terreno/porteria` y `/terreno/rondas` en 164 KB, autorizado por Carlos el 9-nov | comentario de integración de #389 |

### Qué NO está (brechas)
1. **Bitácora compartida (CAR-77):** `rondas.novedades` no guarda dispositivo ni hora del hecho (hoy se cruza por `idempotency_key` con `core.hechos_terreno`); Acceso y Asistencia no escriben en ella; no hay código NOV, ciclo de estados, evidencia (fotos por `core.documentos`, solo en línea) ni evento `rondas.novedad.grave`.
2. **Rondas:** sin cierre automático por tiempo ni rondas programadas (`cierres_ronda.dispositivo_id` es obligatorio: exige migración); sin señales ni trust score (no hay regla aprobada); una marca con geocerca «fuera/sin GPS» igual cuenta como punto (límite declarado en la revisión de #389).
3. **Portería:** no hay pantallas del ERP («Accesos», «Listas») aunque el diseño export-acceso está aprobado (CAR-122); zona horaria solo por empresa, no por instalación; **`ACCESO_HUELLA_SECRET` no existe**, así que la ingesta falla cerrado en cualquier entorno hasta que un responsable la entregue y haya revisión de seguridad. Sin prerregistro (propuesta: fuera de esta fase).
4. **Supervisión (E6):** no hay vista del supervisor sobre rondas, accesos y novedades con revisión como hecho nuevo y lectura auditada.
5. **Circuito E7:** nunca se probó de punta a punta con dos empresas. Estaba bloqueado por Pauta↔Asistencia; con #360 integrado queda por verificar que `pauta.mes.leer`/`pauta.resumen.leer` entregan `presencia` en `main`.
6. **Arranque en frío sin conexión:** muestra `/sin-conexion` (no se precachea el HTML por llevar nombres, ADR-044 R4). Pendiente decidir si se resuelve o se declara.
7. **Higiene:** la fila de ESTADO de este circuito sigue diciendo «PR borrador»; este PR la corrige.

### Frontera (no se toca)
Marcación, `packages/integrations/src/biometria/*`, `modules/asistencia/**`, proyecciones de Pauta y `app/_components/biometria/**` son de Asistencia. CAR-138 y Portal Cliente, fuera. Rondas, visitas y accesos nunca infieren asistencia.

## 2. Plan por etapas

Cada etapa es un PR pequeño con su propio brief corto, un commit por bloque, gate completo y `ESTADO.md` actualizado. Las migraciones van aditivas, con `SET LOCAL lock_timeout`, prefijo de fecha libre, etiqueta `migracion-pendiente` y sin aplicar. Las pruebas con datos corren solo en la QA aislada (Neon `hidden-credit-29118258`, base `opai2_qa`) o en Postgres efímero de CI, con tenants `qa-…` sintéticos; nunca con datos de Gard.

| Etapa | Entrega | Migración | Criterios de aceptación |
|---|---|---|---|
| **T0** | Este PR: diagnóstico, plan, preguntas y ESTADO al día | no | Documento revisado por Carlos; los 4 checks en verde; sin código |
| **T1** | **Bitácora compartida (CAR-77)**: dispositivo y hora del hecho en `rondas.novedades` (columnas nulas, con relleno verificado por conteo de filas, ver «Migraciones de datos después de FORCE RLS»), código NOV-xxxx, ciclo de estados como hechos nuevos, evento `rondas.novedad.grave`, escritura de Acceso (denegado/excepción) por el mismo servicio | sí, aditiva | Reintento, doble toque y reconexión no duplican; dos empresas aisladas; `test:db` con rol sin BYPASSRLS; novedad visible con autor, fuente, hora y tenant; sin copiar texto en la auditoría |
| **T2** | **Evidencia de novedades** por `core.documentos` (solo en línea, nunca en la cola) | no | La cola rechaza el tipo con foto; archivo vinculado a la novedad y visible solo con alcance; persistencia verificada antes de decir «guardada»; ningún módulo sube archivos por su cuenta (ADR-019) |
| **T3** | **Cierre operativo de Rondas**: cierre automático por tiempo y rondas programadas con las reglas ya aprobadas en `modulos/rondas.md` | sí, aditiva (`dispositivo_id` opcional + origen del cierre) | Cierre del sistema distinto de uno de dispositivo; segundo cierre rechazado; sin regla nueva de GPS, tolerancia o confianza (las faltantes quedan como pregunta); regresión de E3 verde |
| **T4** | **Portería en el ERP** («Accesos» y «Listas») sobre `export-acceso` y zona horaria por instalación | posible (zona por instalación), aditiva | Pantallas iguales al diseño aprobado a 375, 1024 y 1280 px; documento siempre enmascarado; **patente completa solo con `acceso:datos.ver_patente`** probada con y sin el permiso, en pantalla, API y MCP; lista bloqueada gana; nada de número completo en logs ni auditoría; revisión visual de Carlos antes de integrar |
| **T5** | **Supervisión auditable (E6)**: vista por alcance de rondas, accesos y novedades; revisión como hecho nuevo; lectura auditada con IDs | no | El alcance se aplica en la consulta; supervisor ajeno no ve filas; lectura registrada en la misma transacción y falla cerrado; MCP con paridad |
| **T6** | **Circuito E7 de punta a punta**: emparejar → turno → marcación (contrato de Asistencia, proveedor simulado) → ronda → acceso → novedad → supervisión → Pauta diaria y mensual | no | Dos empresas `qa-…`; QR ajeno, equipo revocado, persona/instalación ajena, lote parcial, reloj desfasado, doble toque y concurrencia; la marca aparece en la lectura real de Pauta; rondas y accesos no crean asistencia; 375 y 1280 px con red cortada y lenta; capturas |
| **T7** | **Activación controlada de Portería**: `ACCESO_HUELLA_SECRET`, revisión de seguridad y prueba en `qa-…` | no | Clave entregada por canal seguro (nunca en repo ni chat); rotación con `_ANTERIOR` probada; sin clave, falla cerrado; revisión de seguridad con SHA y «sin bloqueos» |

Orden sugerido: T0 → T1 → T2 → T3 en paralelo con T4 (el diseño ya existe) → T5 → T6 → T7. T6 puede arrancar con mocks apenas T1 y T3 estén listos. No se declara el 100 % hasta que T6 pase en un entorno seguro.

### Reglas que sostienen todas las etapas
- Biometría real, liveness y huella dactilar: nada sin la aprobación de privacidad (evaluación de impacto y DPA). Todo usa el proveedor simulado.
- La huella del documento y el documento guardado enmascarado no cambian; el número completo nunca se persiste.
- No se integra ni se despliega desde esta sesión de plan; cada PR queda con los 4 checks en verde y `ESTADO.md` actualizado.
- Si una etapa necesita algo de Núcleo (permisos, RLS) o de Operaciones (instalaciones, puestos, pauta), se describe como dependencia en su PR, sin editar esos archivos sin aviso.

## 3. Preguntas para Carlos (falta decisión de negocio)

1. **¿“Marcaje con huella” es lector de huella dactilar?** En el repositorio «huella» solo significa el hash HMAC del documento; no hay ningún ADR ni brief de huella dactilar, y la marcación aprobada es Face ID o RUT + PIN. Si quieres huella dactilar, es un alcance nuevo (lector, proveedor, consentimiento 07d) y lo lleva Asistencia.
2. **Proveedor y política de teléfono personal (D-03 y D-04):** siguen pendientes. Mientras no se decidan, todo corre con el proveedor simulado. ¿Se mantiene así para T6?
3. **¿Qué roles reciben `acceso:datos.ver_patente` por defecto?** El permiso existe, pero no verifiqué los roles base: propongo solo administrador del tenant y jefe de seguridad de la instalación. Confirma o corrige.
4. **Cierre automático de rondas (T3):** ¿tiempo máximo y tratamiento de una ronda sin cierre? No inventaré tolerancias; si `modulos/rondas.md` ya las fija las uso, y si no las defines tú.
5. **Diseño de Rondas y de la supervisión (T5):** ¿está aprobado en Claude Design? Hay Design Prompt (`DESIGN-PROMPT-rondas.md`), pero no encontré un export de Rondas aprobado; sin él, T5 no tiene pantalla.
6. **Zona horaria por instalación (T4):** ¿la quieres ahora (migración) o basta la de la empresa?
7. **Arranque en frío sin conexión:** ¿se acepta `/sin-conexion` como límite declarado o se pide resolverlo?
8. **Prerregistro de visitas:** propuesta, fuera de esta fase. ¿Confirmas?

## 4. Riesgos
- Mientras no exista `ACCESO_HUELLA_SECRET`, Portería no registra nada en ningún entorno (falla cerrado, a propósito).
- Tres de las etapas necesitan migración; cada una espera al bot «OPAI 2.0» con respaldo, por lo que el ritmo depende de ese turno.
- El tope de JS de Terreno está en 164 KB, por encima del objetivo de 150 KB (ADR-044); cada etapa mide y no sube topes sin autorización.
