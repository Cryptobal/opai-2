# BRIEF · Terreno · Circuito operativo (CAR-78 · continuación de B1–B4)

**Sesión:** «Operaciones · Base · Code» (`session_012Xsh3sxxFSAUPiq3VxNrDM`). **Orden de Carlos:** 7-nov-2026, 10:26 CLT: completar el portal de Terreno al 100 % con Rondas, Control de acceso, Asistencia y bitácora digital; debe **superar a OPAI 1.0**. Seguimiento existente, sin duplicar tareas hechas: CAR-78 (B1–B4 integrados), CAR-122 (portería), CAR-77 (bitácora y rondas); CAR-138 (documentos) no se toca.

## Objetivo

Cerrar el circuito **emparejar → instalación y turno → marcación → ronda → acceso → incidencia y bitácora → supervisión y pauta**, probado de punta a punta con datos sintéticos de dos empresas, permisos reales y mala conectividad. Hoy hay base técnica (identidad, dispositivos, cola de hechos, adaptador de biometría), no un circuito operativo.

## Frontera con la sesión de Asistencia / Face ID

La sesión `012Xsh3sqTZFGXm8GpnhjvmC` es dueña propuesta del contrato de biometría, la marcación y las proyecciones de la Pauta diaria y mensual (su PR [#360](https://github.com/Cryptobal/opai-2/pull/360)). **No se reescribe ni se edita a la vez** nada de lo suyo:

| Superficie ajena (no se toca) | Quién | Cómo se consume |
|---|---|---|
| `packages/integrations/src/biometria/*` (tipos, proveedor) | Asistencia | Solo el contrato existente; mocks hasta integrar |
| `modules/asistencia/**` (capacidades, dominio, manifest), `asistencia.prisma` | Asistencia | Se invoca `asistencia.marcas.registrar` y se leen sus días/estado; sin otro sistema de asistencia |
| `app/(terreno)/terreno/page.tsx` y `terreno/marcar/page.tsx`, `app/_components/biometria/**` | Asistencia | El shell nuevo vive en rutas y componentes propios; el enganche en `terreno/page.tsx` se hace **después** de que #360 se integre |
| Proyección en Pauta diaria y mensual | Asistencia | Esta sesión solo **prueba** que la marca llega a la lectura real de Pauta (criterio obligatorio) |
| `core.enrolamientos_biometricos` / migración `20261108130000` (mía, ya en `main`) | compartida | Asistencia puede reutilizarla o reemplazarla; no se cambia sin acordarlo |

Tampoco se toca CAR-138 (catálogo de campos de documentos).

## Reglas de la orden (obligatorias)

1. **La asistencia se ve en la Pauta.** Que una persona marcó se refleja en la Pauta diaria y mensual; la prueba integra la interfaz y lee el estado real, no un toast ni una operación local.
2. **Rondas y visitas no marcan presencia laboral.** Ninguna ronda, visita ni acceso infiere asistencia; una persona visitante nunca se confunde con un guardia.
3. **Offline por operación, solo cuando es seguro e idempotente.** No se encolan pruebas faciales ni nada que exija sesión en línea. La pantalla muestra pendiente, sincronizado y rechazado; el arranque en frío es seguro; **nunca éxito sin persistencia verificable**.
4. **Sin escrituras en Gard, biometría real, alertas o correos externos ni infraestructura nueva** sin autorización específica y entorno seguro; mocks y entorno sintético aislado.
5. **Sin merge, despliegue ni migraciones ejecutadas por esta sesión.** Las migraciones se proponen aditivas, con respaldo y las aplica el responsable (bot «OPAI 2.0»).

## Entregas (pequeñas, cada una con pruebas, SHA de evidencia y `ESTADO.md`)

| # | Entrega | Qué deja | Depende de | Tabla nueva |
|---|---|---|---|---|
| E0 | Este plan | Contrato de trabajo, frontera, prerrequisitos | — | no |
| E1 | **Offline por operación y cola visible** | Política por tipo (encolable / solo en línea), resultado local por hecho (pendiente · sincronizado · rechazado con motivo), rechazados que no se pierden, persistencia verificada antes de decir «guardado», arranque en frío seguro de Terreno, pantalla «Cola» con los tres estados | B3 | no |
| E2 | **Contexto de Terreno (shell unificado)** | Capacidad que da instalación, turno esperado, persona elegida y módulos habilitados con permisos; pantalla de inicio por instalación y turno con solo lo que corresponde | B1–B3, `core.turnos_esperados` | no |
| E3 | **Ejecución de Rondas** (QR y GPS) | Ejecución, marcas inmutables, señales y anomalías, cierre; hecho offline `rondas.marca`; QR de otra instalación rechazado; sin marcar presencia | E1, E2, Rondas PR 1–2 | **sí** (aditiva) |
| E4 | **Portería (Control de acceso)**: entrada y salida | Módulo `acceso`: puntos, registros, listas bloqueadas, duplicados y reintentos idempotentes, acceso sin permiso rechazado; persona visitante distinta de guardia | E1, E2 | **sí** (aditiva) |
| E5 | **Incidencias, evidencias y bitácora compartida** | Novedad con gravedad y evidencia por `core.documentos`, bitácora única de la instalación para Rondas, Acceso y Asistencia | E3, E4, CAR-77 | **sí** (aditiva) |
| E6 | **Supervisión auditable** | Vista del supervisor por alcance, revisión como hecho nuevo, lectura auditada | E3–E5 | no |
| E7 | **Circuito de punta a punta** | Prueba con dos empresas: emparejar → turno → marcación (contrato de Asistencia) → ronda → acceso → incidencia → supervisión → Pauta diaria y mensual; entrada/salida, duplicados, reintentos, cambio de turno, QR ajeno, acceso sin permiso; 375 y 1280 px, conectividad mala | todas | no |

Cada entrega abre y cierra con su evidencia: SHA, pruebas ejecutadas y `ESTADO.md`. No se declara el 100 % hasta que E7 pase.

## Prerrequisitos y dependencias del Núcleo (identificadas)

- **Marcación → Pauta:** Pauta hoy **no lee** Asistencia (`modules/pauta` no referencia `asistencia`). La proyección es de la sesión de Asistencia; E7 queda **bloqueada en su parte de Pauta** hasta que exista. Se avanza con todo lo independiente.
- **Hecho offline de marcación:** `asistencia.marcas.registrar` (con `origen: offline_queue` y `claveDispositivo`) ya existe. Declarar su tipo en la lista blanca corresponde a Asistencia o se acuerda con ellos; los métodos con prueba facial son solo en línea.
- **Módulo `acceso`:** no existe; se crea en E4 con migración propia. **Requiere** el diseño aprobado (`docs/2.0/modulos/control-acceso.md`, aprobada) y decidir si el prerregistro entra en esta fase (propuesta: no).
- **Ejecución de Rondas:** el módulo tiene configuración, QR y novedad mínima; faltan ejecuciones, marcas, señales y anomalías (migración).
- **Biometría real:** sin proveedor (D-03/D-04). Se usa el simulado; no hay escritura real.
- **Presupuesto de JS:** las rutas de Terreno pesan 162–166 KB frente al objetivo de 150 KB. Se mide en cada entrega; recortar el shell es parte de E2.

## Pruebas

- Dominio puro (Vitest), capacidades con Postgres real (`*-db.test.ts`, dos empresas, permisos reales), Playwright a 375 y 1280 px con la red cortada, lenta y con reintentos.
- Casos obligatorios: entrada/salida, duplicados, reintentos, cambio de turno, QR ajeno, acceso sin permiso, mezcla de empresas, tipos solo en línea rechazados por la cola, éxito solo con persistencia verificada.
- Cada entrega pasa el gate (`typecheck`, `lint`, `test`, `test:db`, `build`, `presupuesto`).
