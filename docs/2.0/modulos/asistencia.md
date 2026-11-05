# Asistencia legal · arquitectura funcional y flujos

**Estado:** propuesta para aprobación de Carlos (5-nov-2026). No implementada.
**Destino al aprobarse:**
- `docs/2.0/modulos/asistencia.md` (especificación, hoy inexistente);
- un ADR nuevo (ADR-07x «Asistencia legal: modelo de marca, identidad de terreno y turno esperado»);
- adendas a ADR-044 y ADR-048.

## 1. Principios

1. **Vendible sola** (ADR-048).
   - Asistencia funciona sin Operaciones ni Nómina.
   - Sin Pauta, la jornada esperada sale de la jornada pactada del vínculo laboral.
   - Con Pauta, sale del turno materializado.
2. **La marca es un hecho regulado** (ADR-023).
   - La hora es del servidor.
   - El registro es inmutable, con hash encadenado por empresa.
   - Toda corrección es un hecho nuevo.
   - Los cálculos de horas se pueden rehacer; las marcas no.
3. **Una sola fuente de presencia.**
   - Con Asistencia activa, la Pauta muestra la marca legal.
   - El «confirmar cobertura» de la Pauta queda solo para empresas sin Asistencia, como dice ADR-048.
   - La marca manual de la Pauta (`pauta.marca.registrar`) se oculta.
4. **La identidad de terreno es del núcleo**, no de Asistencia. RUT y PIN, dispositivos emparejados, cola sin conexión y el adaptador de biometría también los usan Rondas, Libro de novedades y Control de acceso.
5. **Agent-first con límite.**
   - Un agente puede leer, corregir (con vista previa y aprobación humana), exportar reportes y abrir incidentes.
   - **Nunca marca por un trabajador**: `asistencia.marcas.registrar` lleva `soloPersonas` y solo está disponible en los portales Terreno y Trabajador.

## 2. Capas y dueños

```
Núcleo (core) ─ Frente «Operaciones · Base»
  identidad de terreno:  core.credenciales_terreno (PIN con hash, intentos, bloqueo)
                         sesión de persona en portales (RUT + PIN; principal tipo «persona», ADR-033)
  dispositivos:          core.dispositivos (emparejado a instalación, código de 6 caracteres que vence en 10 min, revocación)
  sin conexión:          cola genérica en el service worker (IndexedDB) + recepción de lotes idempotente
  biometría:             adaptador en packages/integrations (enrolar, verificar 1:1, prueba de vida, borrar),
                         proveedor simulado + AWS Rekognition; consumo medido (ADR-031)
  consentimientos:       se reutiliza el cumplimiento 07d con la finalidad «biometria_asistencia»
  turno esperado:        core.turnos_esperados (persona, día, [inicio, fin), instalación, puesto, origen, versión)
                         ─ lo escribe Pauta si está activa; si no, un trabajo diario desde la jornada pactada

Módulo «asistencia» (schema asistencia) ─ Frentes «Núcleo legal», «Face ID» y «Reportes»
  marcas                (inmutable, encadenada)       correcciones (hecho nuevo, 48 h)
  incidentes_tecnicos   contingencias                 enrolamientos (referencia al proveedor, cifrada)
  dias                  (consolidado recalculable: sigla, minutos, atraso, extra) → fuente de Nómina
  fiscalizacion_claves  fiscalizacion_accesos         respaldos (manifiesto + hash)
```

**Por qué el turno esperado va en el núcleo.** Los módulos solo dependen del núcleo y se comunican por eventos. Si el turno esperado viviera en `pauta`, Asistencia tendría que depender de Operaciones y dejaría de venderse sola. Con `core.turnos_esperados`:
- Pauta lo escribe al cambiar una serie, una excepción, un reemplazo o un refuerzo;
- Asistencia solo lo lee y copia sus datos a la marca al registrarla.

## 3. La marca

**Campos de `asistencia.marcas`.** Solo se agrega; los triggers impiden UPDATE, DELETE y TRUNCATE.

| Grupo | Campos |
|---|---|
| Identidad | `id` uuid7, `tenant_id`, `persona_id`, `seq` por empresa |
| Hecho | `tipo` (entrada, salida, inicio de colación, fin de colación), `hora_servidor`, `hora_dispositivo`, `desfase_s`, `origen` (en línea, cola sin conexión, contingencia, importación) |
| Identificación | `metodo` (rostro, rut_pin, pin_respaldo, manual_contingencia), `motivo_respaldo`, `confianza`, `prueba_vida`, `dispositivo_id`, `canal` (kiosco, teléfono personal) |
| Lugar | `instalacion_id`, `lat`, `lng`, `precision_m`, `gps_estado` (dentro, fuera, sin GPS), `distancia_m` |
| Snapshot | `turno_esperado_id`, `turno_inicio`, `turno_fin`, `snapshot` jsonb con empleador, RUT, establecimiento, mandante o EST y resolución de jornada excepcional |
| Integridad | `idempotency_key` única, `hash`, `hash_anterior`; el hash cubre el registro canónico completo |

**Flujo de registro**, en una sola transacción:
1. validar la identidad;
2. leer el turno esperado y la geocerca;
3. insertar la marca;
4. agregar a la bitácora;
5. emitir `asistencia.marca.registrada` por outbox.

Después, consumidores idempotentes envían el comprobante, evalúan alertas y actualizan `dias`.

**Reglas de dominio**, en `modules/asistencia/domain`, puras y con tests:
- `resolverTipo`: alterna entrada y salida mirando las últimas 26 h, para turnos 12×12 y nocturnos;
- atraso y sobretiempo al segundo (art. 44);
- colación según la jornada pactada (un solo valor, a diferencia de 1.0);
- siglas oficiales;
- estado del día.

## 4. Correcciones, contingencia e incidentes

- **Corrección.** El supervisor o RR. HH. propone, el trabajador acepta u objeta, y si no responde queda como vencida.
  - El plazo es un parámetro con vigencia (ADR-021), por defecto 48 h, **pendiente de confirmar con la Res. 38** (L-26).
  - Mientras está pendiente, reportes y nómina usan el valor original.
- **Contingencia.** La registra RR. HH. con autor, motivo y evidencia (un documento del núcleo). No cuenta hasta que se acepta.
- **Incidente técnico.** Se registra a mano o solo, a partir del monitoreo: el proveedor biométrico caído, la cola atrasada o la cadena rota.

## 5. Alternativas de flujo de marcación

Los diseños interactivos están en el chat, en el componente «A · Kiosco / B · Mi teléfono / C · Híbrido». Todas las alternativas usan las mismas capacidades y el mismo registro; solo cambian el canal y el dispositivo.

| | A · Kiosco emparejado | B · Teléfono personal | C · Híbrido (**recomendada**) |
|---|---|---|---|
| Cómo | Equipo de la instalación. El trabajador toca su nombre entre los turnos de ahora y se valida su rostro 1:1. Respaldo: PIN | Portal Trabajador con RUT y PIN (sesión larga). Marca con rostro y GPS | El kiosco es el principal. El teléfono personal se habilita por persona |
| A favor | Lo usa 1.0 hoy. GPS estable. Sin consentimiento de uso del teléfono ni costo para el trabajador. Fila corta (toca su nombre, sin escribir el RUT) | Sin hardware. Sirve a rondines, retenes, supervisores y teletrabajo | Cubre a toda la empresa con **un solo producto**, como exige el ORD 321/2024 |
| En contra | Un equipo por instalación. Robo o batería. Fila en el cambio de turno | Consentimiento escrito, costo del empleador, GPS falsificable y equipos dispares | Dos canales que probar y configurar |
| Diseño | Terreno v1: Inicio, Emparejar, Marcación (aprobado) | Falta «Marcar» en el Portal Trabajador | Terreno v1 + «Marcar» del Portal Trabajador + Configuración › Asistencia |

**Decisión recomendada:** C, con A como opción por defecto en cada instalación. Así cierran D1 y D2 del export de Terreno. Para D4 (supervisor), el supervisor usa Terreno en modo supervisor y su teléfono personal, sin una app aparte.

**Ajustes al diseño aprobado de Terreno · Marcación**, que se hacen al construir sin rediseñar:
1. La prueba de vida pasa de «Fase posterior» a obligatoria cuando el método es rostro (L-12 y T-03), si Carlos confirma la decisión D-03.
2. La foto obligatoria se reemplaza por la plantilla más la prueba de vida (P-03), si se confirma D-04.
3. Se agrega «Usar PIN» como mecanismo secundario visible.

**Pantallas nuevas sin diseño aprobado.** El chat muestra propuestas en DS 2.0. Cada una debe pasar por Claude Design o recibir la aprobación de Carlos aquí:
1. **Asistencia de hoy**, en el portal Supervisor y en el ERP: presentes, sin marca, atrasos y diferidas, con filtros y la acción «Proponer corrección».
2. **Enrolar rostro**: consentimiento versionado, prueba de vida y estado en la ficha de la persona.
3. **Marcar** en el Portal Trabajador.
4. **Configuración › Asistencia**, renderizada desde el manifest (ADR-018): canales por instalación, PIN de respaldo, umbral de geocerca, alertas del art. 45 y plazo de corrección.
5. **Dispositivos de la instalación** en el ERP: emparejar, ver estado y revocar.

**Pantallas que ya tienen diseño aprobado y no se rediseñan:**
- Reportería DT v2 (01 a 10): reportes, hash, correcciones y oposición, contingencia, portal de fiscalización, auditoría, mandante y EST, respaldos y checklist;
- Terreno v1;
- Rondas v3;
- Control de acceso v1;
- Pauta v3.

## 6. Puesto: frontera entre cotización y operación

El detalle está en `03-plan-sesiones-y-prompts.md` §6. En resumen:
- **el catálogo es uno solo**: `core.patrones_turno`, `core.funciones_puesto`, `core.cargos` y la jornada legal con vigencia;
- **el cálculo de horas es uno solo**: `turnos.ts`;
- CPQ guarda la intención de servicio y los supuestos de costo; Operaciones es dueño de la programación;
- el único paso entre ambos es `cpq.puestos.confirmar`, y el sueldo cotizado llega como borrador de capa.

El turno esperado y la Asistencia leen solo el puesto.

## 7. Requisitos transversales

| Tema | Regla |
|---|---|
| Multi-tenant | RLS FORCE en todas las tablas nuevas; la colección biométrica es por empresa; test con dos empresas en cada capacidad |
| Permisos | `asistencia:*`, separados en marcar (solo personas), ver, corregir, configurar, reportes y fiscalización. El alcance del supervisor va por instalación (ADR-022). El Inspector DT ve los reportes en solo lectura |
| Auditoría | Las escrituras van a `audit_events`. Las lecturas de marcas de terceros se auditan con IDs (NÚCLEO-H) |
| Móvil | Terreno a 375 px con controles de 44 px o más. JS de Terreno de 150 KB o menos (hoy 162 KB: hay que bajarlo en Base) |
| Accesibilidad | AA, foco visible y alternativa al rostro (PIN) siempre disponible |
| Rendimiento | Hasta 8 consultas por navegación. Prueba de carga en el cambio de turno (E-07) |
| e2e | Etiqueta `e2e` en cada PR de asistencia (toca dinero y tiempo, y portales) |
| Migraciones | Aditivas. Una por PR, posterior a `20261107120000`. Como máximo dos ventanas de migración en paralelo |
| Sin conexión | Una sola cola, la del núcleo, para todo Terreno; ningún módulo escribe en el `sw.js` |
