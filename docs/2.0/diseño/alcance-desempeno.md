# Alcance · Desempeño (indicadores y metas por cargo) — para revisar una sola vez

**Estado:** propuesta, pendiente de la aprobación de Carlos. Sin esa aprobación no se construye.
**Origen:** pedido de Carlos del 11-nov-2026 en el chat del proyecto «Opai 2.0». Decisión: [ADR-094](../01-decisiones.md). Tarea madre: CAR-303. Mockup interactivo (propuesta): [`design/export-desempeno/`](../design/export-desempeno/README.md).

No hay extracción de 1.0: OPAI 1.0 no tiene este módulo. Es nuevo.

## 1. Qué es

Cada empresa mide la gestión de sus cargos (vendedor, reclutador, supervisor, jefe de operaciones, los que tenga) con indicadores que OPAI calcula solo, a partir de los hechos que cada módulo ya registra. Nadie digita un número y nadie lo puede retocar.

| Pieza | Dónde vive | Qué hace |
|---|---|---|
| Catálogo de indicadores | Núcleo (servicio, como ajustes y eventos) | Cada módulo publica sus indicadores en su manifiesto. El Núcleo arma el catálogo desde el registro de módulos y calcula por persona y período |
| Scorecard por cargo | Módulo Desempeño | La empresa elige qué indicadores usa cada cargo, con qué meta, qué peso y qué período |
| Resultado por persona | Módulo Desempeño | Puntaje de 0 a 120 (100 es cumplir todas las metas), cada indicador contra su meta y la parte hecha por su agente |
| Agente | Módulo Agente | Responde con los mismos indicadores, propone cambios en el hilo y avisa cuando alguien cae bajo la meta |

## 2. Qué configura cada empresa y qué no

| Lo configura la empresa | No lo configura |
|---|---|
| Sus cargos (los de Personas › Cargos) | La fórmula de cada indicador: la define el módulo, igual para todas las empresas |
| Qué indicadores usa cada cargo | Los hechos de origen: son los que el sistema registra, inmutables |
| La meta, el peso y el período de cada indicador | Los períodos ya cerrados: un cambio rige desde el período siguiente |
| Quién ve los resultados (permisos y alcance por filas) | |

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

## 4. Qué NO entra en la primera versión

- Indicadores propios armados por la empresa (CAR-313, etapa 2).
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

## 6. Decisiones que necesita Carlos

1. Aprobar esta hoja.
2. ¿La primera versión parte solo con el catálogo (propuesta), o los indicadores propios por empresa entran desde el inicio?
3. ¿Quién ve el resultado de cada persona: ella misma, su jefatura o solo la gerencia?
4. ¿Desempeño se vende como módulo aparte (propuesta) o viene incluido?
5. Período por defecto: mensual (propuesta).

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
| Etapa 2 · indicadores propios por empresa | CAR-313 | 20 · Núcleo |

Orden: D1 y D2, luego Comercial (el módulo con más datos hoy) y D3 cuando el diseño esté aprobado. Operaciones y Asistencia publican cuando sus datos existan en 2.0.

## 9. Por verificar antes del primer brief

- Si todo hecho relevante guarda hoy persona, cargo y fecha, o hay que completarlo.
- Cómo se reutiliza o reemplaza `core.inicio.indicadores` (CAR-182), que arma los indicadores de Inicio a mano.
- Si los usuarios internos de Gard existen como Persona con cargo.
