# Auditoría de cierre · 11 · Portales (Trabajador, Cliente y Supervisor)

**Fecha:** 16-nov-2026 · **Sesión:** Auditoría de cierre (tanda 09, 10 y 11) · **Foto:** `main` en `5c0a5a8`.

**Avance real: 52 %** (Linear: 6 de 21 en Done).

Método: el de [`asistencia.md`](asistencia.md#cómo-se-calculó-igual-en-los-tres-informes-de-esta-tanda). Terreno tiene su propio informe ([`terreno.md`](terreno.md)). Alcance 12 / 27 = 44 %; estándares 5 / 6 = 83 %; pruebas 55 %. Total: **52 %**.

## Lo más importante

1. **El portal del cliente muestra cotizaciones y el resumen del mes, pero no el servicio.** Cobertura, rondas, novedades, tickets, facturas y accesos están todos en PR abiertos (#827, #833, #838, #860, #863, #881, #941). En 1.0 eso era lo principal del portal.
2. **El trabajador ya tiene inicio, marcar, mi pauta y mis documentos.** Le faltan solicitudes (#846 y #851, abiertos), liquidaciones (CAR-636) y firmas pendientes (CAR-634).
3. **Hay unos 14 PR de Portales abiertos**, varios apilados entre sí. Integrarlos de a uno toma tiempo mientras la cola de Actions esté llena.

## 1. Tickets contra PR

| Ticket | Estado | PR | ¿En `main`? |
|---|---|---|---|
| CAR-217 · Cuenta inactiva sin acceso al portal | Done | #384 | Sí |
| CAR-218 · Acceso por contacto y pestaña Portal | Done | #385, #432 | Sí |
| CAR-462 · Mi pauta | Done | #813 | Sí |
| CAR-463 · Mis documentos | Done | #820 | Sí |
| CAR-494 · «Más» duplicado en la barra | Done | #852 | Sí |
| CAR-514 · Pregunta: tickets y facturas en el portal | Done | — (decisión) | — |
| CAR-87 · Portales Supervisor y Trabajador (padre) | In Progress | #189, #199 sin «Fixes» | Parcial |
| CAR-88 · Portal Cliente (padre) | In Progress | #181 sin «Fixes» | Parcial |
| CAR-464 · Solicitudes de permiso y vacaciones | In Progress | #846 abierto | No |
| CAR-508 · La jefatura aprueba las solicitudes | In Progress | #851 abierto | No |
| CAR-491 · Cliente: cobertura | In Progress | #827 abierto | No |
| CAR-492 · Cliente: rondas | In Progress | #833 abierto | No |
| CAR-493 · Cliente: novedades | In Progress | #838 abierto | No |
| CAR-502 · ¿El cliente lee el texto de las novedades? | In Progress | #860 abierto | No |
| CAR-518 · Cliente: facturas | In Progress | #863 abierto | No |
| CAR-519 · Cliente: tickets | In Progress | #881 abierto | No |
| CAR-500 · Contacto de cliente en qa-e2e | In Progress | #982 abierto | No |
| CAR-589 · Patrón de lista y ficha en los portales | In Progress | #974, #979, #980, #981 abiertos | No |
| CAR-357 · Portal del trabajador (Estándares R-1) | Backlog | Hijos Done o en curso | Parcial |
| CAR-358 · Portal del cliente (Estándares R-2) | Backlog | Hijos en curso | No |
| CAR-610 · Ficha de instalación del supervisor | Backlog | — | No |

#424 (Design Prompts del portal) se cerró sin integrar; fue reemplazado.

## 2. Alcance contra 1.0

Fuente 1.0: `portal/guardia/*`, `portal/cliente` (secciones de `portal-cliente-sections.ts`) y `portal/supervisor/*`.

| # | Qué hace 1.0 | En 2.0 | Detalle |
|---|---|---|---|
| 1 | Trabajador: inicio con su próximo turno | Está | |
| 2 | Trabajador: marcar asistencia | Está | |
| 3 | Trabajador: mis turnos | Está | |
| 4 | Trabajador: mis documentos | Está | |
| 5 | Trabajador: liquidaciones | Falta | CAR-636 |
| 6 | Trabajador: solicitudes | Falta | #846 |
| 7 | Trabajador: turnos extra propios | Falta | Después de CAR-620 |
| 8 | Trabajador: mis datos, privacidad (ARCO), avisos y push | Está | |
| 9 | Trabajador: firmar lo pendiente | Parcial | Solo por enlace del correo (CAR-634) |
| 10 | Trabajador: responder correcciones de asistencia | Falta | CAR-592 |
| 11 | Trabajador: cambiar o recuperar el PIN | Está | |
| 12 | Cliente: resumen del mes | Está | |
| 13 | Cliente: cotizaciones y propuesta | Está | |
| 14 | Cliente: cobertura | Falta | #827 |
| 15 | Cliente: rondas | Falta | #833 |
| 16 | Cliente: libro de novedades | Falta | #838, #860 |
| 17 | Cliente: tickets | Falta | #881 |
| 18 | Cliente: facturas | Falta | #863 |
| 19 | Cliente: accesos (en sitio, listas, prerregistro) | Falta | #941 a #943 |
| 20 | Cliente: reportes, encuestas, protocolos | Falta | Sin ticket; CAR-358 cubre «ver el servicio» |
| 21 | Cliente: contactos con acceso | Está | |
| 22 | Supervisor: instalaciones a cargo | Parcial | Solo datos y puestos (CAR-610) |
| 23 | Supervisor: personas a cargo | Está | |
| 24 | Supervisor: rendiciones | Está | |
| 25 | Supervisor: solicitudes por aprobar | Falta | #851 |
| 26 | Supervisor: firmas pendientes | Falta | CAR-634 |
| 27 | Supervisor: asistencia de hoy | Falta | CAR-600 |

No se portan: el chat del portal (backlog).

## 3. Estándares

| Chequeo | Resultado | Evidencia |
|---|---|---|
| Lista y ficha | Parcial | CAR-589 con cuatro PR abiertos |
| Paginación | Parcial | `portal_cliente.accesos.*`, `portal_cliente.contactos.listar` y `portal_trabajador.arco.listar` siguen en `listas-pendientes.json` |
| Sin duplicados | Sí | |
| Sin textos internos | Sí en estos tres portales | El de Terreno está en `terreno.md` |
| Permisos y alcance | Sí | Portal del cliente cerrado ante cualquier falla; el alcance va en la consulta |
| MCP | Sí | |

## 4. Pruebas

En verde el 16-nov: `portal-trabajador`, `portal-cliente`, `portal-sesion`, mi pauta, mis documentos y avisos al celular. **En rojo:** `selector-riel` (iPad) y `entrar-cookie-portal` (escritorio) (CAR-637). Las pruebas visuales del portal del cliente esperan el contacto de qa-e2e (#982).

## 5. Tickets creados

| Prioridad | Ticket |
|---|---|
| Media | CAR-636 Liquidaciones en el portal del trabajador |
| Media | CAR-637 e2e rojos del selector de portal y del ingreso con cookie |

También van en esta tanda CAR-634 (firmas en los portales, proyecto 10) y, de tandas anteriores, CAR-600 y CAR-610.
