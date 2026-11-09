# BRIEF · Terreno · Cierre operativo (CAR-226 · continuación del circuito de CAR-78)

**Sesión:** «Terreno · Code». **Tarea:** [CAR-226](https://linear.app/carlos-irigoyen/issue/CAR-226) (dependencias de cierre: CAR-77 bitácora, CAR-122 Portería, CAR-89 Asistencia). **Base:** `main` en `156376c`, que ya incluye #389 (squash `b3aee9a`, 9-nov 14:51 UTC). Este PR es solo el diagnóstico y el plan: no trae código ni migraciones. El 9-nov-2026 quedaron anotadas las ocho decisiones de Carlos (§3). Sigue sin código y no se integra.

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
3. **Portería:** no hay pantallas del ERP («Accesos», «Listas») aunque el diseño export-acceso está aprobado (CAR-122, Operaciones). La zona horaria de la empresa basta (§3.6): no se agrega zona por instalación. **`ACCESO_HUELLA_SECRET` no se lee ni se activa en esta fase** (§3.1 y §3.2); la ingesta sigue fallando cerrado mientras la clave no exista. El prerregistro entra en esta fase (§3.8), con `docs/2.0/diseño/export-control-acceso/Prerregistrar.dc.html`; no se construye en este PR.
4. **Supervisión (E6):** no hay vista del supervisor sobre rondas, accesos y novedades con revisión como hecho nuevo y lectura auditada.
5. **Circuito E7:** nunca se probó de punta a punta con dos empresas. Estaba bloqueado por Pauta↔Asistencia; con #360 integrado queda por verificar que `pauta.mes.leer`/`pauta.resumen.leer` entregan `presencia` en `main`.
6. **Arranque en frío sin conexión:** muestra `/sin-conexion` (no se precachea el HTML por llevar nombres, ADR-044 R4). Entra en esta fase (§3.7). No se resuelve en este PR.
7. **Higiene:** la fila de ESTADO de este circuito sigue diciendo «PR borrador»; este PR la corrige.

### Frontera (no se toca)
Marcación, `packages/integrations/src/biometria/*`, `modules/asistencia/**`, proyecciones de Pauta y `app/_components/biometria/**` son de Asistencia. CAR-138 y Portal Cliente, fuera. Rondas, visitas y accesos nunca infieren asistencia.

## 2. Plan por etapas

Cada etapa es un PR pequeño con su propio brief corto, un commit por bloque, gate completo y `ESTADO.md` actualizado. Las migraciones van aditivas, con `SET LOCAL lock_timeout`, prefijo de fecha libre, etiqueta `migracion-pendiente` y sin aplicar. Las pruebas con datos corren solo en la QA aislada (Neon `hidden-credit-29118258`, base `opai2_qa`) o en Postgres efímero de CI, con tenants `qa-…` sintéticos; nunca con datos de Gard.

| Etapa | Entrega | Migración | Criterios de aceptación |
|---|---|---|---|
| **T0** | Este PR: diagnóstico, plan, decisiones de Carlos y ESTADO al día | no | Decisiones anotadas en §3; los 4 checks en verde; sin código y sin integrar |
| **T1** | **Bitácora compartida (CAR-77). La construye Núcleo; Terreno no la implementa.** Dispositivo y hora del hecho en `rondas.novedades` (columnas nulas, con relleno verificado por conteo de filas, ver «Migraciones de datos después de FORCE RLS»), código NOV-xxxx, ciclo de estados como hechos nuevos, evento `rondas.novedad.grave`, escritura de Acceso (denegado/excepción) por el mismo servicio | sí, aditiva | Reintento, doble toque y reconexión no duplican; dos empresas aisladas; `test:db` con rol sin BYPASSRLS; novedad visible con autor, fuente, hora y tenant; sin copiar texto en la auditoría |
| **T2** | **Evidencia de novedades** por `core.documentos` (solo en línea, nunca en la cola) | no | La cola rechaza el tipo con foto; archivo vinculado a la novedad y visible solo con alcance; persistencia verificada antes de decir «guardada»; ningún módulo sube archivos por su cuenta (ADR-019) |
| **T3** | **Cierre operativo de Rondas**: cierre automático por tiempo y rondas programadas. El cierre se configura en Configuración; el predefinido es la mitad del tiempo entre dos rondas consecutivas (§3.4). No se abre en este PR | sí, aditiva (`dispositivo_id` opcional + origen del cierre) | Cierre del sistema distinto de uno de dispositivo; segundo cierre rechazado; sin regla nueva de GPS, tolerancia o confianza; regresión de E3 verde |
| **T4** | **Portería en el ERP** («Accesos» y «Listas») sobre el export ya aprobado. La zona horaria es la de la empresa (§3.6). Las pantallas las lleva CAR-122 (Operaciones) | no | Pantallas iguales al diseño aprobado a 375, 1024 y 1280 px; documento siempre enmascarado; **la patente la ve quien ya tiene acceso y el permiso `acceso:datos.ver_patente`**, sin lista nueva de roles, probada con y sin el permiso, en pantalla, API y MCP; lista bloqueada gana; nada de número completo en logs ni auditoría; revisión visual de Carlos antes de integrar |
| **T5** | **Supervisión auditable (E6)**: vista por alcance de rondas, accesos y novedades; revisión como hecho nuevo; lectura auditada con IDs. Usa `export-rondas` y `export-terreno`; no se crea diseño nuevo | no | El alcance se aplica en la consulta; supervisor ajeno no ve filas; lectura registrada en la misma transacción y falla cerrado; MCP con paridad |
| **T6** | **Circuito E7 de punta a punta**: emparejar → turno → marcación (contrato de Asistencia; el proveedor decidido es AWS y esta fase no lo activa ni lee secretos) → ronda → acceso → novedad → supervisión → Pauta diaria y mensual | no | Dos empresas `qa-…`; QR ajeno, equipo revocado, persona/instalación ajena, lote parcial, reloj desfasado, doble toque y concurrencia; la marca aparece en la lectura real de Pauta; rondas y accesos no crean asistencia; 375 y 1280 px con red cortada y lenta; capturas |
| **T7** | **No se ejecuta en esta fase.** No hay lector de huella dactilar. No se lee ni se activa `ACCESO_HUELLA_SECRET`. La biometría real (AWS) no se enciende | no | Sin secreto en el repo, en el chat ni en el PR; Portería sigue fallando cerrado mientras la clave no exista |

Orden sugerido: T0 (este PR, sin integrar) → T1 lo toma Núcleo → T2 → T3, sin abrirlo aquí, en paralelo con el alcance de Portería que lleve Operaciones (CAR-122; el diseño ya existe) → T5 → T6. T7 no se ejecuta. No se declara el 100 % hasta que T6 pase en un entorno seguro.

Entran en esta fase y no se construyen en este PR: el arranque en frío de `/sin-conexion` (§3.7) y el prerregistro de visitas (§3.8, `Prerregistrar.dc.html`).

### Reglas que sostienen todas las etapas
- No hay marcación con huella dactilar. En el repo «huella» sigue siendo el hash del documento. La biometría la hace AWS; esta fase no lee secretos, no activa biometría real y no abre OPAI 1.0.
- La huella del documento y el documento guardado enmascarado no cambian; el número completo nunca se persiste.
- No se integra ni se despliega desde esta sesión de plan; cada PR queda con los 4 checks en verde y `ESTADO.md` actualizado.
- Si una etapa necesita algo de Núcleo (permisos, RLS) o de Operaciones (instalaciones, puestos, pauta), se describe como dependencia en su PR, sin editar esos archivos sin aviso.

## 3. Decisiones de Carlos (9-nov-2026)

Cerradas. Llegaron por el coordinador OPAI 2.0. Este PR no las reabre y no trae código.

1. **No hay marcación con huella dactilar.** No se construye. En el repo «huella» sigue siendo el hash del documento (`ACCESO_HUELLA_SECRET`). La pregunta salió de este brief, no de un pedido de Carlos.
2. **La biometría la hace AWS.** Esta fase no lee secretos, no activa biometría real y no abre OPAI 1.0.
3. **Patente.** La ve quien ya tiene acceso y el permiso `acceso:datos.ver_patente`. No hay lista nueva de roles.
4. **Cierre automático.** Se configura en Configuración. El valor predefinido es la mitad del tiempo entre dos rondas consecutivas. `docs/2.0/modulos/rondas.md` (R25) sigue describiendo el cierre al vencer el tiempo máximo más la tolerancia; este brief no reescribe ese archivo.
5. **El diseño ya está aprobado. No se crea otro.** Se usa `docs/2.0/diseño/export-rondas` (Carlos, 29-oct-2026 16:29), `docs/2.0/diseño/export-terreno` (30-oct-2026 12:05) y, para el prerregistro, `docs/2.0/diseño/export-control-acceso` (30-oct-2026 21:19, `Prerregistrar.dc.html`). Esos paths están en `main`. Las horas son las que transmitió el coordinador.
6. **Zona horaria.** Basta la de la empresa. No hay zona por instalación en esta fase.
7. **Arranque en frío.** `/sin-conexion` se cubre en esta fase.
8. **Prerregistro de visitas.** Entra en esta fase.

## 4. Riesgos
- Mientras no exista `ACCESO_HUELLA_SECRET`, Portería no registra nada en ningún entorno (falla cerrado, a propósito).
- Tres de las etapas necesitan migración; cada una espera al bot «OPAI 2.0» con respaldo, por lo que el ritmo depende de ese turno.
- El tope de JS de Terreno está en 164 KB, por encima del objetivo de 150 KB (ADR-044); cada etapa mide y no sube topes sin autorización.
