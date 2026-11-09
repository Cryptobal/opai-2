# Manifiesto de casos sintéticos · Asistencia · Face ID (CAR-89, PR #360)

**Para qué:** validación propia de OPAI 2.0 en el preview de #360 sin esperar el OK visual de Carlos (instrucción del 7-nov-2026 21:49). Cubre la regla de Carlos: **marcar = la persona asistió**, visible igual en la Pauta diaria y la mensual, con rostro o con RUT + PIN, sin duplicados.
**Fuente de los casos:** [`packages/capabilities/scripts/asistencia-qa-casos.ts`](../../../../packages/capabilities/scripts/asistencia-qa-casos.ts). La prueba `asistencia-qa-casos-db` los siembra contra Postgres real y compara la lectura de `pauta.mes.leer` con la columna «Esperado».
**Todo ficticio:** personas «QA Caso NN», RUT generados, rostros simulados `rostro:qa-NN`. Sin rostros reales, sin AWS, sin datos de Gard.

## Puertas que siguen separadas (este manifiesto no las abre)

| Puerta | Quién | Estado |
|---|---|---|
| Evaluación de impacto y DPA (Ley 21.719) antes de cualquier empresa real | Carlos | Pendiente |
| Widget de AWS Face Liveness y prueba contra AWS (dependencia + credenciales temporales; las configura el bot con `@opai-2.0:`) | Carlos decide | Pendiente |
| Consentimiento real de personas reales | Cada persona, con Cumplimiento | No aplica a datos ficticios |
| Cualquier cambio sobre Gard | — | Prohibido |

`biometria_empresas_reales` queda apagado. El proveedor simulado solo existe en empresas `qa-…`.

## Cómo sembrar

Solo desarrollo o rama de Neon de preview, **en un tenant `qa-…` propio** (rechaza `gard` y todo slug sin `qa-`). Simula por defecto; escribe con `--confirmar`. Lo ejecuta el bot «OPAI 2.0» o quien tenga la base de preview: esta sesión no aplica nada en Neon.

```bash
OPAI_ENTORNO=dev DATABASE_URL=<opai_app de la base de preview> DATABASE_URL_MIGRATE=<propietario de la misma base> \
OPAI_SECRETS_KEY=<clave del entorno> \
pnpm --filter @opai/capabilities seed:asistencia-qa --tenant qa-asistencia --confirmar
```

Notas de diseño: la marca lleva **siempre la hora del servidor** (hecho regulado, no se puede fechar hacia atrás), así que los turnos se anclan al instante de la siembra y las marcas quedan a esa hora. Para repetir la validación se siembra un tenant `qa-…` nuevo (el seed no duplica casos en el mismo). El tenant necesita además Asistencia y Pauta activos y un usuario del equipo con `asistencia:ver` y acceso a la Pauta; esas membresías las pone quien opera el preview.

## Casos

Se leen en `/pauta`, instalación «Planta QA (ficticia)», en la fecha de la siembra (los turnos de ayer pueden quedar en el mes anterior).

| Caso | Qué simula | Esperado en Pauta (mensual: punto; diaria y detalle: etiqueta) |
|---|---|---|
| QA-01 | Entrada y salida con RUT + PIN | «Asistió» (punto verde) |
| QA-02 | Entrada y salida con rostro simulado | «Asistió»; **idéntico a QA-01** (mismo estado, atraso y horas) |
| QA-03 | Solo entrada | «Sin salida» (punto ámbar) |
| QA-04 | Turno de ayer ya terminado, sin marcas | «Ausente» (punto rojo) |
| QA-05 | Turno que empezó 45 min antes de marcar | «Asistió» con atraso informado |
| QA-06 | Turno en curso, sin marca todavía | «Sin marca» (punto ámbar) |
| QA-07 | Entrada y salida reintentadas 3 veces con la misma clave | «Asistió»; **una** marca por entrada y una por salida |

Cada caso es una persona distinta con su propio puesto, para que las celdas no se mezclen.

## Qué verificar en el preview (375, 1024 y 1280 px; tema claro y oscuro)

1. **Mensual:** cada celda de los 7 puestos muestra el punto de la tabla; el detalle del día muestra la etiqueta y las horas en hora de Chile.
2. **Diaria:** la misma etiqueta por turno, para el día de cada caso (`vista=diaria&fecha=…`).
3. **Rostro = PIN:** QA-01 y QA-02 se ven igual. Las horas difieren solo en segundos.
4. **Sin duplicados:** QA-07 muestra una sola presencia; hay 2 marcas (entrada y salida) en el historial de la persona, no 6.
5. **Alcance:** un usuario sin `asistencia:ver`, o con Asistencia apagada, no ve ningún punto ni etiqueta (el dato no viaja al navegador).
6. **Dos empresas:** otro tenant `qa-…` no ve a estas personas ni sus marcas.
7. **Sin datos biométricos visibles:** ninguna pantalla, respuesta ni log muestra imagen, plantilla o referencia del proveedor.

## Cubierto por pruebas, no por el preview

| Escenario | Dónde |
|---|---|
| Turno nocturno que cruza día y mes (30-nov → 1-dic, Santiago) | `asistencia-rostro-db`, «turno nocturno…» |
| Concurrencia (5 marcas simultáneas, una sola) y secuencia sin huecos | `asistencia-rostro-db` |
| Cambio de día y de mes con la hora de Santiago | `asistencia-dias-db` y dominio |
| Teléfono personal: canal, habilitación y consentimiento por Cumplimiento | `asistencia-rostro-db` |
| Rostro apagado en la empresa → todos con RUT + PIN | `asistencia-rostro-db` |
| Persona–instalación–turno–empresa; solo reglas laborales aprobadas | `asistencia-rostro-db` y A1–A3 |

## Evidencia a dejar en el PR

Capturas a 375 y 1280 px de `/pauta` (mensual y diaria) con los 7 casos, resultado de la lista anterior, SHA del head verificado y un comentario `VALIDACIÓN PROPIA OPAI2:` (no sustituye `REVISIÓN VISUAL CARLOS:`; ver «Pendiente de decisión»).

## Pendiente de decisión

AGENTS.md exige, para un cambio visual, el primer vistazo de Carlos o una **delegación expresa por PR**. La instrucción del 7-nov 21:49 dice «no esperar OK visual Carlos» y deriva la validación a OPAI2 en `preview.opai.cl`; si esa instrucción vale como delegación para #360, queda registrada en el PR. Esta sesión no integra: la integración exige además la migración (no aplica), el veto, los 4 checks y la revisión final sobre el head vigente.
