# Alcance · Desempeño (indicadores y metas por cargo) — para revisar una sola vez

**Estado:** aprobada por Carlos el 11-nov-2026 a las 16:41 (hora de Chile), en el chat del proyecto «Opai 2.0», con las decisiones de la sección 6. El mockup quedó aprobado como base del diseño de las pantallas a las 17:10.
**Origen:** pedido de Carlos del 11-nov-2026 en el chat del proyecto «Opai 2.0». Decisión: [ADR-094](../01-decisiones.md). Tarea madre: CAR-303. Mockup interactivo (propuesta de diseño): [`design/export-desempeno/`](../design/export-desempeno/README.md).

No hay extracción de 1.0: OPAI 1.0 no tiene este módulo. Es nuevo.

## 1. Qué es

Cada empresa mide la gestión de sus cargos (vendedor, reclutador, supervisor, jefe de operaciones, los que tenga) con indicadores que OPAI calcula solo, a partir de los hechos que cada módulo ya registra. Nadie digita un número y nadie lo puede retocar.

| Pieza | Dónde vive | Qué hace |
|---|---|---|
| Catálogo de indicadores | Núcleo (servicio, como ajustes y eventos) | Cada módulo publica sus indicadores en su manifiesto. El Núcleo arma el catálogo desde el registro de módulos y calcula por persona y período |
| Indicadores propios de la empresa | Módulo Desempeño | La empresa arma indicadores que el catálogo no trae, sobre hechos que el sistema ya registra |
| Scorecard por cargo | Módulo Desempeño | La empresa elige qué indicadores usa cada cargo, con qué meta, qué peso y qué período |
| Jefatura por cargo | Personas (Cargos) | A quién reporta cada cargo y a qué personas ve esa jefatura |
| Resultado por persona | Módulo Desempeño | Puntaje de 0 a 120 (100 es cumplir todas las metas), cada indicador contra su meta y la parte hecha por su agente |
| Agente | Módulo Agente | Responde con los mismos indicadores, propone cambios en el hilo y avisa cuando alguien cae bajo la meta |

## 2. Qué configura cada empresa y qué no

| Lo configura la empresa | No lo configura |
|---|---|
| Sus cargos (los de Personas › Cargos) | La fórmula de los indicadores del catálogo: la define el módulo, igual para todas las empresas |
| Qué indicadores usa cada cargo, del catálogo o propios | Los hechos de origen: son los que el sistema registra, inmutables |
| La meta, el peso y el período de cada indicador | Los períodos ya cerrados: un cambio rige desde el período siguiente |
| La jefatura de cada cargo y a quiénes ve | |
| Si la persona ve su propio resultado y el ranking del equipo | |
| Sus indicadores propios: nombre, forma de cálculo, hechos, sentido y meta | |

## 3. Qué se mide

Resultado, calidad y oportunidad, no cantidad de acciones. Si el agente hace las llamadas y la digitación, contar acciones no dice nada de la persona. La auditoría ya distingue «agente X vía usuario Y», así que el resultado se atribuye a la persona y la parte del agente queda a la vista.

Catálogo inicial propuesto, por módulo:

| Módulo | Indicadores |
|---|---|
| Comercial y CPQ | Ventas cerradas · margen de lo vendido · cotizaciones ganadas · tiempo de respuesta a un lead |
| Personas | Días para cubrir una vacante · retención a 90 días · fichas con documentos al día |
| Pauta, Rondas y Tickets | Cobertura de pauta · turnos descubiertos · turnos extra sobre la pauta · visitas de supervisión cumplidas · rondas completadas · novedades cerradas en 24 h · reclamos de cliente |
| Asistencia | Marcas a la hora · ausentismo |
| Agente | Tiempo en resolver lo que escaló el agente |

Un módulo nuevo suma indicadores declarándolos en su manifiesto, sin tocar el Núcleo ni Desempeño. Un módulo apagado no aporta.

### Indicadores propios de la empresa (CAR-313)

Cuatro formas de cálculo, acotadas: contar un hecho en el período, sumar un monto, medir el tiempo entre dos hechos y porcentaje de un hecho sobre otro. Cada módulo declara qué hechos ofrece; lo no declarado no se puede usar. Antes de publicar se ve siempre la vista previa con datos reales. La definición es configuración versionada de la empresa, evaluada en dominio (ADR-021), nunca código por empresa. Se puede pedir al agente con palabras propias: el agente arma el borrador y una persona lo guarda.

### Quién ve los resultados (CAR-306 y CAR-314)

- La persona ve su propio resultado; su jefatura ve los de su equipo; la gerencia y quien administra el módulo ven a todos.
- Por cargo se configura: cuál es su jefatura (el cargo al que reporta), si esa jefatura ve a todo el equipo o solo a las personas a su cargo, si la persona ve su resultado y si ve el ranking del equipo.
- **Jefatura en el modelo de datos (CAR-314):** cada cargo guarda a qué cargo reporta y cómo lo ven sus jefes, y cada persona puede tener un jefe directo. Queda disponible para otros módulos. Antes solo existía el alcance por instalaciones del supervisor (ADR-022), que la jefatura no amplía.
- El filtro se aplica en la consulta, nunca en la pantalla.

## 4. Qué NO entra en la primera versión

- Un constructor de paneles o gráficos a medida: los paneles a medida los arma el agente (o una IA externa por MCP) con los mismos indicadores.
- Evaluaciones cualitativas, encuestas, objetivos escritos a mano, bonos y su pago por Nómina.
- Medir lo que ocurre fuera de OPAI: lo que no se registra no existe para el indicador.

## 5. Reglas

1. Todo usuario interno que recibe sueldo es una Persona con cargo; el usuario es solo el acceso. El sueldo nunca se fija en el usuario.
2. Los pesos de un scorecard suman 100 % para publicarlo.
3. Cada cambio de meta, peso o indicador queda en la auditoría.
4. Todo lo de pantalla es una capacidad con vista previa y herramienta MCP (paridad).
5. El agente propone; una persona aprueba. El agente nunca cambia una meta solo.
6. Plantillas sugeridas por vertical, desde la configuración por vertical, nunca fijas en el código.
7. Medir a personas con datos individuales exige informarlo a los trabajadores (Ley 21.719).

## 6. Decisiones de Carlos (11-nov-2026, 16:41)

1. **Hoja aprobada.**
2. **La primera versión trae el catálogo y los indicadores propios por empresa.**
3. **El resultado lo ven la persona y su jefatura.** Hay que poder configurar quién es la jefatura de cada cargo.
4. **Desempeño se vende como módulo aparte.**
5. **Mockup definitivo, 100 % interactivo, con todo lo anterior:** se actualizó el mismo día y Carlos lo aprobó como base del diseño a las 17:10.
6. **Dos personas con el mismo cargo de jefatura** (17:10): cada una ve solo a las personas que tiene asignadas; por cargo se puede elegir «todo el equipo».
7. **El jefe del jefe** (17:10): ve toda su línea hacia abajo.

Pendiente de Carlos: nada.

## 7. Defaults que tomo (avísame si alguno no te sirve)

Puntaje con tope de 120 por indicador; verde desde 100, amarillo desde 85, rojo bajo 85; las licencias médicas no cuentan en contra; un negocio se atribuye a su responsable al momento de ganarse.

## 8. Plan por bloques

| Bloque | Tarea | Proyecto en Linear |
|---|---|---|
| D0 · esta hoja, ADR y mockup | CAR-304 | 20 · Núcleo |
| D1 · catálogo de indicadores en el Núcleo | CAR-305 | 20 · Núcleo |
| D2 · scorecard por cargo | CAR-306 | 20 · Núcleo |
| D3 · pantallas sobre la base Hilo | CAR-307 | 20 · Núcleo |
| Indicadores de Comercial y CPQ | CAR-308 | 01 · Comercial |
| Indicadores de Personas | CAR-309 | 03 · Personas |
| Indicadores de Pauta, Rondas y Tickets | CAR-310 | 06 · Operaciones |
| Indicadores de Asistencia | CAR-311 | 04 · Asistencia |
| Agente: propuestas, avisos y respuesta a lo escalado | CAR-312 | 19 · Agente IA |
| D4 · indicadores propios por empresa | CAR-313 | 20 · Núcleo |
| Jefatura por cargo y personas a cargo | CAR-314 | 03 · Personas |

Orden: D1, jefatura por cargo y D2; luego Comercial (el módulo con más datos hoy) y D4; D3 cuando el diseño esté aprobado. Operaciones y Asistencia publican cuando sus datos existan en 2.0.

## 9. Por verificar antes del primer brief

- Si todo hecho relevante guarda hoy persona, cargo y fecha, o hay que completarlo.
- Cómo se reutiliza o reemplaza `core.inicio.indicadores` (CAR-182), que arma los indicadores de Inicio a mano.
- **Corregido el 11-nov-2026 (21:10):** la unión entre usuario y ficha de Persona ya existe (`core.personas.vincular_usuario`); lo que falta es que cada empresa la cargue, porque el responsable de un negocio es un usuario y el cargo vive en el vínculo laboral de la Persona. CAR-314 usa esa unión y agrega la jefatura; mientras tanto cada indicador declara si se atribuye a un usuario o a una Persona.
