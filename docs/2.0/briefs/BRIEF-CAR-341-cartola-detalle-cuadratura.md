# BRIEF CAR-341 · Cartola Santander: solo el detalle, cuadratura y deshacer una importación

Encargo de Carlos del 12-nov-2026 (urgente). Sesión Finanzas.

## 1. Objetivo

La carga de las cartolas históricas reales de Gard se detuvo en la 0016. El lector importaba como movimientos la sección «Resumen comisiones» (que repite comisiones del detalle con el monto en decimal, es decir ÷1000) y dejaba ~14 movimientos espurios en la cuenta. Hay que leer solo el detalle, validar que la cartola cuadre, explicar los rechazos y poder deshacer una importación para limpiar y volver a cargar.

## 2. Estado actual (verificado)

- `parsearFilasSantander` cortaba solo en «Saldos diarios». Desde el encabezado seguía leyendo todo, incluido «Resumen comisiones»; en esa sección `parseMonto` redondeaba −37.203 a −37.
- No había ninguna validación de saldos ni ninguna forma de deshacer una importación (`cartolas_importadas` solo se escribía).
- El período («Fecha desde: dd/mm/aaaa», en una sola celda) no se leía por el «:».
- La fecha 13-11-2026 que muestra la cuenta viene de Web4Leads: su campo `transactionDate` llega como «2026-11-13» y OPAI lo guarda tal cual. OPAI 1 muestra las mismas fechas para esos movimientos. Es la fecha contable que entrega el banco (movimientos registrados para el día hábil siguiente), no un desfase de zona horaria de OPAI. No se cambia.

## 3. Alcance

1. Lector: solo el bloque «Detalle movimientos». El encabezado se busca desde ese título (o desde el inicio si el formato no lo trae) y se corta en «Resumen comisiones», «Saldos diarios» o cualquier otro título de sección.
2. Cuadratura: saldo inicial + detalle = saldo final, con los valores del bloque «Saldos». La vista previa la muestra; si no cuadra, la importación real se rechaza y el botón Importar queda bloqueado.
3. Cada fila rechazada trae su motivo, con el valor leído. Un monto con decimales se rechaza; ya no se redondea.
4. `finanzas.cartolas.listar` y `finanzas.cartolas.deshacer` (irreversible: el agente necesita aprobación humana; con vista previa).

Fuera de alcance: limpiar los datos de Gard. La limpieza la hace el bot «OPAI 2.0» con el OK de Carlos, con estas capacidades.

## 4–7. Arquitectura, archivos, datos y capacidades

- Dominio: `santander-secciones.ts` (título del detalle, fin del detalle, bloque de saldos, cuadratura) y `santander-fila.ts` (una fila y su motivo de rechazo). `santander.ts` recorre las secciones. `ResultadoCartola.cuadratura`.
- `finanzas.cartolas.importar`: la salida suma `cuadratura`; sin `dryRun`, una cartola que no cuadra falla con un error de negocio y no escribe nada.
- `finanzas.cartolas.listar` (lectura auditada): cartolas importadas de una cuenta, con su período, sus movimientos y cuántos de ellos están conciliados.
- `finanzas.cartolas.deshacer` (`efecto: "irreversible"`, `dryRun`): borra los movimientos de la importación, sus conciliaciones deshechas o sugeridas sin confirmar y la importación misma. Si algún movimiento tiene una conciliación confirmada vigente, no procede (se revisa de nuevo dentro de la transacción). Emite `finanzas.banco.cartola_deshecha` y recalcula los avisos. Después, la misma cartola se puede volver a importar.
- Sin migraciones.

## 8. Interfaz

Hoja «Subir cartola»: un aviso de cuadratura («La cartola cuadra», o «no cuadra», con la diferencia), Importar bloqueado si no cuadra, y las filas rechazadas listadas primero. Deshacer no tiene pantalla: es una operación de limpieza que hace el bot por MCP, con vista previa y aprobación.

## 9. Seguridad y tenant

Todo pasa por `ctx.db` / `tx` con RLS. Deshacer valida que la importación sea de la empresa (otra empresa recibe «no existe»), exige `finanzas:bancos.gestionar` y, por ser irreversible, pide aprobación humana cuando la ejecuta un agente.

## 12–13. Pruebas y validación

- Dominio (`santander-secciones.test.ts`): cortar en «Resumen comisiones» con montos decimales, «Sin comisiones en el período», cuadra y no cuadra, cartola sin saldos, motivos de rechazo y títulos de sección.
- Base (`finanzas-cartola-deshacer-db.test.ts`): una cartola que no cuadra no se importa; listar; deshacer en vista previa; bloqueo por conciliación confirmada; deshacer y volver a importar; aislamiento entre empresas.
- e2e `@preview` (`finanzas-cartola-cuadratura-preview.spec.ts`): cartola ficticia que cuadra y otra que no.
- Archivos reales: la provisoria 0030 da 83 movimientos de detalle, 0 rechazos y cuadra. La 0003 (110 esperados) y la 0016 (429 esperados) se prueban cuando Carlos las adjunte (no están en esta sesión). Ningún archivo real va al repositorio.

## 15. Riesgos y rollback

- Una cartola real cuyo bloque de saldos no se pueda leer queda sin cuadratura y se importa como antes. Una que no cuadre por un formato nuevo no se importa; eso es intencional.
- Rollback: revertir el PR. No hay migración.
