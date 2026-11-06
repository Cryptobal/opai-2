# BRIEF · Terreno base · B2 · Dispositivos emparejados (CAR-78)

**Sesión:** «Operaciones · Base · Code». **ADR:** 079. **Migración:** `20261108110000_core_dispositivos` (aditiva, con RLS; la aplica el bot «OPAI 2.0»). **Sobre `main` tras integrar B1** (#339).

## Objetivo

Un administrador empareja un equipo de terreno a una instalación con un código o QR en menos de 10 minutos; al revocarlo, el equipo deja de mostrar datos en su siguiente petición (criterio 2 del frente).

## Qué entra

- `core.dispositivos` (identificador `DSP-nnnn` correlativo por empresa, estado `activo | revocado`, HMAC del token, emparejado y revocado con su autor, último contacto, versión de la app) y `core.codigos_emparejamiento` (HMAC del código, vence a los 10 minutos, un solo uso). RLS `tenant_isolation`.
- Funciones `SECURITY DEFINER` `core.dispositivo_emparejar` (consume el código y crea el dispositivo en una sentencia atómica) y `core.dispositivo_por_token` (reconoce al equipo, también revocado, y registra último contacto y versión).
- Capacidades `core.dispositivos.{generar_codigo, listar, estado, revocar}` con `dryRun`/`idempotencyKey`, alcance por instalación en la consulta (ADR-022) y herramienta MCP. El código solo se ve en la primera respuesta (`salidaIdempotente`).
- ERP › Instalación › pestaña «Dispositivos» (patrón de pestañas de ADR-041): lista, «Emparejar dispositivo» (código + QR + plazo) y «Revocar» con confirmación.
- Terreno › Emparejar (`/terreno/emparejar`, pública): código de 6 caracteres, «Dispositivo emparejado» y «Este dispositivo ya no está emparejado» (borra los datos locales). El token vive en una cookie HttpOnly.

## Diferencias con el encargo (a revisar)

1. **`emparejar` no es una capacidad** sino una acción de servidor (`accionEmparejar`) sobre la función con nombre `emparejarDispositivo`: ocurre antes de existir sesión o empresa, y el principal «dispositivo» todavía no existe en `executeCapability`. Queda declarada en `paridad-entradas.ts`. El principal «dispositivo» para capacidades con alcance a una instalación llega con B3, cuando el shell de Terreno lo necesite.
2. **Los 3 intentos** no pueden contarse por código (un código equivocado no corresponde a ninguno real): se cuentan por origen cada 10 minutos, con fallo cerrado, más un tope global. No hay columna de intentos en `codigos_emparejamiento`.
3. **Diseño:** la pestaña «Dispositivos» no tiene diseño exacto; usa la sección de lista del DS (como Documentos). Emparejar sigue `export-terreno/Emparejar.dc.html`.
4. Un código vigente por instalación: generar otro invalida el anterior sin usar.
