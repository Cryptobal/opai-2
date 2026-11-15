# Brief CAR-345 · Saldo del banco por Web4Leads

**Sesión Caja · 12-nov-2026 · Fixes CAR-345 · Relacionado: CAR-269, CAR-343, CAR-346 (OPAI 1), ADR-065, ADR-073**

## 1. Objetivo

Decisión de Carlos del 12-nov-2026: el saldo de partida del flujo de caja es el que informa el banco. Cada vez que llegan movimientos por Web4Leads, o se sube una cartola provisoria, el saldo del banco a la hora del último movimiento es el saldo actual. El flujo le suma y resta lo proyectado.

## 2. Estado actual (verificado en `main` 57d0914)

- `POST /api/t/<slug>/banco/web4leads` (ADR-065) ya acepta `accountBalance { current, asOf }` en la raíz y `balance` en cada movimiento, con la misma firma HMAC que OPAI 1.
- Mientras Web4Leads siga enviando a OPAI 1, OPAI 1 reenvía el cuerpo tal cual a OPAI 2 (CAR-284). El reenvío ocurre antes de validar movimientos, así que un envío solo con saldo también llega.
- **Brecha:** `sincronizar-aplicar.ts` solo guardaba el saldo si llegaban movimientos nuevos o si la cuenta no tenía saldo. Un saldo actualizado sin movimientos nuevos se perdía.
- En Gard, los movimientos de Web4Leads llegan hoy sin `balance` ni `accountBalance`. Por eso la cuenta no tiene saldo y el flujo parte en $0.

## 3. Alcance

El saldo informado por el banco (`accountBalance`) manda por su fecha (`asOf`):
- entra si la cuenta no tenía saldo, o si es igual o más reciente que el guardado, haya o no movimientos nuevos;
- un saldo más antiguo no pisa el vigente, aunque venga con movimientos nuevos.

El saldo deducido del último movimiento (`balance`) mantiene la regla anterior: solo entra con movimientos nuevos.

Fuera de alcance: cambiar el receptor, la firma o el formato; la pantalla (el saldo y su hora ya se ven en Bancos y en el aviso del flujo).

## 4. Contrato para Web4Leads (sin cambios de formato)

Cabeceras: `x-web4leads-timestamp` (segundos Unix) y `x-web4leads-signature` = HMAC-SHA256(secreto, cuerpo + timestamp) en hexadecimal. El secreto es el mismo que ya usa Web4Leads.

```json
{
  "accountNumber": "94541158",
  "bankCode": "SANTANDER",
  "movements": [
    { "externalId": "w4l-123", "transactionDate": "2026-11-12", "description": "TRANSF. CLIENTE", "reference": null, "amount": 1500000, "balance": 23647353 }
  ],
  "accountBalance": { "current": 23647353, "asOf": "2026-11-12T17:30:00-03:00" }
}
```

- `accountBalance.current`: saldo disponible de la cuenta en CLP, entero.
- `accountBalance.asOf`: fecha y hora de ese saldo en ISO 8601, con zona horaria.
- `movements` puede ir vacío (`[]`) cuando solo se informa el saldo, por ejemplo una vez al día aunque no haya movimientos.
- `balance` en cada movimiento: saldo tras ese movimiento. Recomendado; permite cuadrar el mismo día.

## 5. Archivos

`modules/finanzas/capacidades/bancos/sincronizar.ts`, `sincronizar-aplicar.ts` y la prueba `packages/capabilities/test/finanzas-banco-web4leads-db.test.ts`.

## 6. Modelo de datos y migraciones

Sin migración: usa `cuentas_bancarias.saldo_banco` y `saldo_banco_en`.

## 9. Seguridad y tenant

Sin cambios en la firma ni en la resolución de la empresa. La prueba verifica que otra empresa con el mismo número de cuenta no se toca.

## 12. Tests

Prueba con Postgres real: saldo solo y más reciente reemplaza; saldo más antiguo no pisa, ni con movimientos nuevos; reenvío idéntico se acepta; aislamiento entre empresas. Siguen en verde las 16 suites de banco y flujo.

## 15. Riesgos y rollback

Un `asOf` mal informado por el proveedor (hora futura) fijaría un saldo que los siguientes no pueden reemplazar hasta pasar esa hora. Si ocurre, se revierte este PR. El saldo nunca reemplaza el libro de movimientos.
