# Manifiesto de casos · circuito de marca de Asistencia (CAR-89)

**Qué es:** el circuito «marcar → registro único idempotente → evento → día consolidado → presencia en Pauta diaria y mensual», con RUT + PIN y rostro por la **misma** capacidad `asistencia.marcas.registrar`. Datos sintéticos de dos empresas `qa-…`; sin datos de Gard ni rostros reales.
**Estado:** 8-nov-2026, «Asistencia · Code». **No declara el circuito aceptado:** lo que está en verde por CI es lo que dice la columna «Cubierto»; lo demás es manifiesto para validar en el preview de OPAI 2.0 cuando existan sus dependencias.

## Dependencias reales

| Pieza | Dónde vive | Efecto en este circuito |
|---|---|---|
| Marca por rostro, enrolamiento, `presencia` en `pauta.mes.leer`/`pauta.resumen.leer` y etiquetas en la Pauta | PR #360 (`claude/magical-hawking-6wz432`), en revisión | Sin #360 no hay presencia en la Pauta ni marca por rostro en `main`; los casos P-* y R-* esperan a #360 |
| Cola sin conexión, kiosco de Terreno, rondas y portería | PR #389 (`claude/eager-goodall-yohl5h`), borrador | Los casos Q-* esperan a #389. La cola debe reenviar la **misma** `claveDispositivo`; no hay segundo registro |
| Preview con Asistencia activa y datos de prueba | OPAI 2.0 (validación) | Validación visual y de flujo; el CI no la reemplaza |

Archivos que esta entrega **no** toca (para no chocar): `modules/asistencia/capabilities/{registrar,identidad-*,rostro*}.ts` y `packages/capabilities/src/pauta/*` (#360); `apps/web/lib/terreno/*`, `apps/web/public/sw*.js` y `apps/web/app/(terreno)/**` (#389).

## Casos

| ID | Caso | Cubierto hoy en `main` | Prueba |
|---|---|---|---|
| M-01 | Noche 22:00→06:00 que cruza la fecha: entrada el 3, salida el 4, el día queda en la fecha del turno (477 min, atraso al segundo) y el día siguiente queda `sin_turno` y sin marcas | Sí | `asistencia-circuito-db.test.ts` |
| M-02 | Reintento con la misma clave: misma marca, sin segunda fila, sin segundo evento `asistencia.marca.registrada`, un solo día | Sí | ídem |
| M-03 | Doble toque en paralelo (3 llamadas, misma clave): una sola marca | Sí | ídem |
| M-04 | Dos empresas: cada una ve solo sus marcas y días; marcar a la persona de otra empresa da `NOT_FOUND` y no escribe | Sí | ídem |
| M-05 | Un agente nunca marca (`FORBIDDEN`); sin `asistencia:configurar` no se recalcula (`FORBIDDEN`); el portal trabajador no lee días ajenos | Sí | ídem |
| M-06 | Hash encadenado, inmutabilidad (UPDATE/DELETE/TRUNCATE), GPS que no bloquea, 500 marcas sin huecos | Sí (previo) | `asistencia-marcas-db.test.ts` |
| D-01 | Día consolidado, atraso, corrección aceptada/pendiente, tipo de jornada por fecha, contingencia | Sí (previo) | `asistencia-dias-db.test.ts` |
| P-01 | La celda de la Pauta mensual y la Pauta diaria muestran la **misma** presencia (Asistió / Sin salida / Sin marca / Ausente / Sin turno) para marca por PIN y por rostro | No: espera #360 | A escribir sobre `presencia.ts` cuando entre |
| P-02 | La noche de M-01 aparece en la celda del día del turno (3), no en la del 4 | No: espera #360 | ídem |
| P-03 | Con Asistencia apagada o sin `asistencia:ver`, la Pauta no trae `presencia` | No: espera #360 | `apps/web/test/pauta-presencia.test.ts` (de #360) |
| P-04 | Dos empresas: la Pauta de una no muestra presencia de la otra | No: espera #360 | A escribir sobre #360 |
| R-01 | Rostro y PIN producen el mismo registro (campos, evento, día); el rostro cae a PIN con `motivo_respaldo` | No: espera #360 | `asistencia-rostro-db.test.ts` (de #360) |
| Q-01 | Marca encolada sin conexión y reenviada dos veces: una sola marca, un evento, un día | No: espera #389 | A escribir cuando exista la cola |
| Q-02 | Cola con marcas de dos empresas en el mismo dispositivo: ninguna cruza de empresa | No: espera #389 | ídem |

## Cómo validar en el preview (OPAI 2.0)

1. Dos empresas `qa-…` con Asistencia activa, `marcas_habilitadas` encendido, una persona con vínculo vigente y un turno nocturno materializado desde la Pauta.
2. Marcar entrada y salida por kiosco (RUT + PIN simulado); repetir con la misma clave y con doble toque.
3. Recalcular el día y comprobar la Pauta diaria y mensual (cuando #360 esté integrado): misma presencia en ambas.
4. Entrar con el rol de la otra empresa y con un rol sin `asistencia:ver`: no se ve nada ajeno.

Registrar el resultado en el PR de cada dependencia. Hasta entonces, **no** se da por aceptado el circuito.
