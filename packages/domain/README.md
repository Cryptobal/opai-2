# @opai/domain

Lógica de negocio pura: cálculos de dinero, tiempo, turnos, cotizaciones, nómina.

- Sin dependencias de Next, React ni de la base de datos. Recibe datos por parámetro y devuelve resultados.
- Todo cálculo tiene test en Vitest.
- Dinero en CLP: enteros. UF y porcentajes: decimales de escala fija (ver `dinero.ts`).
