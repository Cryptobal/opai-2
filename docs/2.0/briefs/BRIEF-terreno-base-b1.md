# BRIEF · Terreno base · B1 · Identidad de terreno (CAR-78)

**Sesión:** «Operaciones · Base · Code». **ADR:** 077. **Migración:** `20261108100000_core_credenciales_terreno` (aditiva, con RLS; la aplica el bot «OPAI 2.0»).

## Objetivo

Un trabajador ingresa al Portal Trabajador con **RUT + PIN de 6 dígitos**, cambia su PIN y queda bloqueado tras los intentos permitidos, todo auditado (criterio 1 del frente). RR. HH. asigna o restablece el PIN desde la ficha de la persona.

## Qué entra

- `core.credenciales_terreno` (`packages/db/prisma/schema/terreno.prisma`): hash del PIN, intentos fallidos, `bloqueado_hasta`, `pin_cambiado_en`, `debe_cambiar`, bandera `telefono_personal_habilitado` (T-04, solo la columna). RLS `tenant_isolation`. Función `SECURITY DEFINER` `core.credenciales_terreno_por_rut` (solo ids) para encontrar la empresa antes de que exista una.
- Dominio puro `terreno-pin.ts` (formato, PIN débiles, bloqueo) con pruebas.
- `@opai/auth`: `entrarConPin` + `pin-verificacion.ts` (evaluar sin escribir y después registrar) + endpoint **solo servidor** `abrirSesionPin` (plugin). Rechaza usuarios con MFA o rol de plataforma.
- Capacidades `core.credenciales_terreno.{estado, asignar_pin, restablecer, cambiar_pin}` con `dryRun` e `idempotencyKey`. `asignar_pin`, `restablecer` y `cambiar_pin` son `soloPersonas` (motivo en `paridad-excepciones.ts`); `estado` va por MCP. La acción de ingreso, en `paridad-entradas.ts`.
- Ajustes del núcleo `terreno_pin_intentos_maximos` (5) y `terreno_pin_bloqueo_minutos` (15), por empresa.
- Pantallas: login Trabajador (RUT con formato + `TecladoPin`, componente nuevo del DS con caso en `/ds`), «Cambiar PIN» (Portal Trabajador › Más) y «PIN de terreno» en ERP › Persona › Laboral.

## Decisiones de diseño

1. **Sin enumeración.** El tope (5 por RUT, 30 por origen, 15 min, fallo cerrado) se aplica antes de mirar si el RUT existe. RUT inexistente, mal escrito, sin PIN, PIN incorrecto, portal no admitido y credencial bloqueada devuelven el mismo aviso.
2. **El mismo RUT en dos empresas.** El ingreso evalúa todas las empresas candidatas sin escribir; si una coincide entra por ella y solo se cuentan fallos cuando ninguna coincidió (un trabajador de dos empresas no se bloquea una al ingresar a la otra).
3. **El intento fallido de «Cambiar PIN» persiste** (`transaccionIndependiente`), porque el error revierte la transacción de la capacidad.
4. **Sesión.** La del usuario vinculado a la persona, con la duración y renovación normales de Better Auth (7 días, renovada con el uso). «Sesión larga» más allá de eso es una decisión pendiente.
5. **Obligación de cambiar el PIN.** Tras el primer ingreso se lleva a `/trabajador/cambiar-pin?primero=1`; no hay un bloqueo duro del resto del portal (queda como mejora).

## Criterios

- Pruebas: `pnpm test` (dominio), `credenciales-terreno-db.test.ts` (capacidades; dos empresas) y `pin-verificacion-db.test.ts` (ingreso; bloqueo, ajustes, portales, dos empresas, endpoint no expuesto por HTTP).
- Paridad: instantánea MCP e inventario regenerados.
