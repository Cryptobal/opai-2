# Evidencia: «Nueva programación» con el principal vacío (CAR-221)

Reporte de la QA en `preview.opai.cl` sobre el deployment de #418 (`a5f2f2630c74020b91888cc1d880d8b6a16c72ac`): tras un login válido, `/finanzas/ventas/programacion/nueva` mostraba el encabezado y la barra pero el principal vacío, sin controles. Persistía en #416 y en #418.

## Causa (verificada, no supuesta)
La página pinta `null` salvo que la carga de clientes salga `ready`, y esa carga pedía `core.cuentas.list` con `limite: 200`. La capacidad acepta **hasta 100** por página, así que la llamada falla por validación **con cualquier dato** y la pantalla queda en blanco. Lo de `vercel.live/feedback.js` bloqueado por la CSP no interviene: en la reproducción local no hubo ese ni otro error de consola cuando la pantalla sí se pintó.

El arreglo ya existía en #392 (carga de clientes por cursor, `vistaDeCarga` y `ErrorCarga`: nunca «nada»), pero #416 y #418 no lo incluían porque se apilan sobre `main`. Se trajo #392 a #418 **con un merge** (sin rebase ni copia de código): head de código `a494b74ee1ae26d243c19e6ab0efea5bf02b9393`.

## Reproducción y comprobación (local, base sintética `opai2_qa`, SII y Octava simulados, sin correos)
| Archivo | Qué es | Código | Resultado |
|---|---|---|---|
| `programacion-nueva/repro-antes-1280.png` y `repro-antes-375.png` | Antes, servidor de desarrollo | `a5f2f2630c74020b91888cc1d880d8b6a16c72ac` | `main` vacío, 0 controles, a 1280 y a 375 px: reproduce el reporte |
| `programacion-nueva/repro-despues-1280.png` y `repro-despues-375.png` | Después, **build de producción** (`next build` y `next start`) | `a494b74ee1ae26d243c19e6ab0efea5bf02b9393` | Formulario con 25 controles, sin errores de consola, a 1280 y a 375 px |

Los dos usan el mismo usuario sintético (rol owner de `qa-finanzas-a`, con segundo factor enrolado en la base local), sin escrituras: solo se abrió la pantalla. Cada captura es una sola rama, no una combinación de ramas.

## Prueba que queda
- `packages/capabilities/test/core-cuentas-limite.test.ts`: el contrato de `core.cuentas.list` (100 sí, 101 y 200 no).
- `apps/web/test/programacion-carga.test.ts` y `cuentas-paginadas.test.ts` (de #392): nunca se pinta «nada» y la carga pagina por cursor.

## Lo que no acredita esto
- No es la validación visual de OPAI 2.0 en `preview.opai.cl` ni una prueba del deployment real: la hace OPAI 2.0 sobre el candidato que se coordine. El alias del preview no se tocó.
- La pantalla **Emitir** (`/finanzas/ventas/nuevo`) pide también `limite: 200` en esta cadena; su corrección va en #391 y #397 y no se duplicó aquí.
