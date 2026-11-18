# Auditoría de cierre · 09 · Acceso (Portería)

**Fecha:** 16-nov-2026 · **Sesión:** Auditoría de cierre (tanda 09, 10 y 11) · **Foto:** `main` en `5c0a5a8`.

**Avance real: 47 %** (Linear: 4 de 16 en Done).

Método: el de [`asistencia.md`](asistencia.md#cómo-se-calculó-igual-en-los-tres-informes-de-esta-tanda). El alcance se mide contra la especificación aprobada `docs/2.0/modulos/control-acceso.md` (R1 a R28), que incluye todo lo de `portal/acceso` de 1.0. Alcance 6,5 / 17 = 38 %; estándares 5 / 6 = 83 %; pruebas 50 %. Total: **47 %**.

## Lo más importante

1. **Hay dos PR distintos para la misma pieza.** CAR-479 parte 1 está en #917 (tabla `acceso.configuraciones` con migración) y en #963 (ajustes del núcleo, sin migración). Si entran los dos, la configuración queda en dos fuentes (**CAR-630**).
2. **Casi todo lo nuevo está en PR abiertos:** prerregistro (#864, #885), configuración y puntos (#917, #963, #934), importar listas (#945), portal del cliente (#941, #942, #943), bienvenida (#944) y «solo desde la instalación» (#950). Son unos 10 PR apilados que esperan la cola.
3. **En `main` ya funciona lo básico:** registrar entrada y salida en Terreno (también sin conexión), en sitio, cruce con listas con huella, listas en el ERP, registros, intentos denegados, anular y cierre en bloque.

## 1. Tickets contra PR

| Ticket | Estado | PR | ¿En `main`? |
|---|---|---|---|
| CAR-474 · Accesos en el ERP | Done | #830 | Sí |
| CAR-475 · Listas y pestaña de la instalación | Done | #840 | Sí |
| CAR-477 · Anular, salida desde el ERP, cierre en bloque | Done | #845 | Sí |
| CAR-483 · Llave `ACCESO_HUELLA_SECRET` en Vercel | Done | — (operación) | — |
| CAR-122 · Control de acceso (padre) | In Progress | — | — |
| CAR-478 · Prerregistro con invitación QR | In Progress | #864, #885 abiertos | No |
| CAR-479 · Configuración y puntos de acceso | In Progress | **#917 y #963 compiten**, #934 abierto | No |
| CAR-480 · Importar listas desde Excel | In Progress | #945 abierto | No |
| CAR-481 · Accesos en el portal del cliente y portería del supervisor | In Progress | #941 abierto | No |
| CAR-538 · El cliente gestiona sus listas | In Progress | #942 abierto | No |
| CAR-539 · El cliente prerregistra visitas | In Progress | #943 abierto | No |
| CAR-553 · Fondo y bienvenida de la portería | In Progress | #944 abierto | No |
| CAR-567 · Accesos solo desde la instalación | In Progress | #950 abierto | No |
| CAR-482 · Retención de visitantes | Backlog | — | No |
| CAR-506 · Listas por empresa, cuenta o grupo | Backlog | — | No |
| CAR-522 · Denegados al libro de novedades | Backlog | — | No |

Los cuatro Done corresponden a lo que está en `main`.

## 2. Alcance contra la especificación (incluye 1.0)

| # | Qué pide | En `main` | Detalle |
|---|---|---|---|
| 1 | Registrar entrada y salida en Terreno, también sin conexión | Está | Cola del núcleo (`acceso.entrada`, `acceso.salida`) |
| 2 | En sitio en la portería | Está | |
| 3 | Lectura de documento (QR de cédula, MRZ, patente) | Parcial | Cédula y patente en el formulario; MRZ no verificado |
| 4 | Cruce con listas: bloqueado gana, uso único, huella | Está | R6 a R8 y R21 |
| 5 | Listas en el ERP: ver, agregar, quitar | Está | |
| 6 | Importar listas desde Excel (R11) | Falta | #945 |
| 7 | Listas por cliente, cuenta o grupo (R12) | Falta | #942, CAR-506 |
| 8 | Prerregistro e invitación QR (R13 a R15) | Falta | #864, #885, #943 |
| 9 | Configuración de tipos, campos y modo por instalación (R1, R2) | Falta | #917 o #963 (CAR-630), #934 |
| 10 | Accesos en el ERP: registros, en sitio, intentos, ficha | Está | |
| 11 | Anular, salida desde el ERP, cierre en bloque, permanencia (R24, R25) | Está | |
| 12 | Evacuación exportable sin conexión (R26) | Falta | CAR-631 |
| 13 | Retención de datos de visitantes (R18) | Falta | CAR-482 |
| 14 | Reporte periódico (R27) | Falta | CAR-632 |
| 15 | Accesos en el portal del cliente | Falta | #941 |
| 16 | Portería del supervisor | Falta | CAR-481 |
| 17 | Denegados al libro de novedades | Falta | CAR-522 |

No verificado: el aviso de privacidad por punto de acceso (R19). No se encontró en el código y quedó en CAR-632.

## 3. Estándares

| Chequeo | Resultado | Evidencia |
|---|---|---|
| Lista y ficha | Parcial | Accesos con vista dividida; Accesos está en CAR-550 |
| Paginación y búsqueda | Sí | `acceso.registros.listar` busca por nombre, documento y patente. `acceso.listas.listar` sigue en `listas-pendientes.json` |
| Sin duplicados | Sí en `main` | Riesgo en PR: CAR-630 |
| Sin textos internos | Sí | |
| Permisos por rol | Sí | El dispositivo solo registra (R3) |
| MCP | Sí | |

## 4. Pruebas

Base: seis pruebas de acceso con dos empresas (ingesta, listas, registros, correcciones, ERP, huella). e2e: `accesos-listas-preview` pasa en `preview-e2e` (test.opai.cl) pero **falla en el e2e de CI** del 16-nov en las tres resoluciones. La portería dentro de `terreno-cola-offline` también falla (CAR-226).

## 5. Tickets creados

| Prioridad | Ticket |
|---|---|
| Alta | CAR-630 Dos PR para la misma configuración (#917 y #963) |
| Media | CAR-631 Lista de evacuación sin conexión (R26) |
| Baja | CAR-632 Reporte periódico y aviso de privacidad (R27, R19) |
