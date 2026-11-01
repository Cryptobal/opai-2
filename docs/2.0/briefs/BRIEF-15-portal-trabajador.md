# BRIEF DE IMPLEMENTACIÓN — 15 PORTAL TRABAJADOR

**Estado:** PR 1 en construcción (rama `feat/portal-trabajador-pr1`, Refs CAR-87). · **Spec:** [`modulos/portal-trabajador.md`](../modulos/portal-trabajador.md) · **Diseño aprobado:** [`diseño/export-portal-trabajador/`](../diseño/export-portal-trabajador/README.md) (v3, 30-oct-2026 11:56 CLT) · **Autor:** Claude

> Numeración (decidido por Carlos, 30-oct-2026): el Brief 15 es de este portal; el Portal Supervisor pasa a 15b. `ROADMAP.md` y `PLAN-desarrollo.md` ya llaman 15b a la Central de monitoreo (CAR-70): queda por asignar el sufijo definitivo del Supervisor.

## 1. Objetivo

Un portal pequeño y propio para cada trabajador: datos de contacto y dirección editables, privacidad (Ley 21.719), preferencias de aviso y, cuando existan sus módulos, central, rondas, accesos y «Mi pauta». Agent-first: cada acción es una capacidad con la misma regla en pantalla, `/api/v1` y MCP.

## 2. Estado del repo y dependencias (verificado en `origin/main` `17f868f`, 30-oct-2026)

| Pieza | Estado | Consecuencia |
|---|---|---|
| Route group `(trabajador)` | Placeholder | PR 1 lo reemplaza |
| `portal-layout.tsx`, `portales.ts`, `acceso-portal` | Existen (acceso por membresía, ADR-016) | Se reutilizan; cambios mínimos |
| `core.personas` (contacto, dirección con `place_id`/lat/lng, `usuario_id`) | Existe | Base de «Mis datos» |
| 07d (consentimientos, ARCO, DPO) | Existe en el Núcleo | «Privacidad» enlaza a lo existente |
| Componente de dirección (`DireccionOpai`) y `core.geo.*` | Existen | Se reutilizan; sin claves en el repo |
| Central de monitoreo (CAR-85) | **No está** | 07 y 07b pendientes |
| Terreno (export #150 sin integrar, CAR-78) y ejecución de Rondas del guardia | **No están** | 08 Rondas → PR 2 |
| Control de acceso operativo | **No está** | 09 Accesos pendiente |
| Datos bancarios y previsión (Personas, #165 abierto) | **No están en main** | Banco pendiente; no se tocan `maestros.prisma` |
| Pauta (`feat/pauta-pr1`) | En paralelo | «Mi pauta» pendiente |
| Tickets (#169) | Abierto | No se usa |

## 3. Hoja de alcance (Carlos la aprueba una vez por módulo; 1.0 es el piso, no el techo)

> Nota de método: esta sesión solo tiene acceso a `Cryptobal/opai-2`; no pudo leer el portal de 1.0. La columna «1.0» sale del encargo, de la spec y de `extraccion/`. El **bot de Paridad** debe contrastarla con `checklists/paridad.md` antes de aprobar.

| Tema | Pasa de 1.0 | No pasa | Mejora en 2.0 |
|---|---|---|---|
| Datos personales | Ver y corregir contacto y dirección | Edición libre de nombre y RUT por el propio trabajador | Dirección con Google Maps (place_id, coordenadas); vista previa y auditoría de cada cambio; RR.HH. conserva lo legal |
| Privacidad | Información del tratamiento | — | Pantalla propia enlazada a ARCO y al DPO (Ley 21.719) |
| Avisos | Notificaciones | Chat libre con la empresa | Preferencias por categoría y canal, horario de silencio, silencio por defecto |
| Comunicación con la central | Aviso a la central | Chat libre | Mensajes tipificados y avisos con acuse (ADR-025) **[Pendiente: CAR-85]** |
| Rondas | Ronda con puntos | Marcar solo por GPS un punto que exige QR | Traza GPS continua; modo por punto (QR, GPS o ambos); teléfono compartido o portal **[PR 2]** |
| Accesos | Registro de accesos | — | Desde el celular personal, solo en instalación asignada y en turno **[Pendiente]** |
| Pauta | Ver turnos | Confirmar el turno (los cambios llegan como aviso) | «Mi pauta» del mes **[Pendiente: Pauta]** |
| Banco y previsión | — | — | El trabajador los edita (decisión de Carlos) **[Pendiente: Personas #165]** |
| Marcar, documentos, solicitudes | Marcar asistencia, ver y firmar documentos, pedir permisos | — | Cuando existan Asistencia, Documentos del trabajador y Tickets |

## 4. Plan en PRs

### PR 1 — Núcleo del portal (este PR)

1. **Bloque A — Docs:** spec, este brief, línea en `ESTADO.md`.
2. **Bloque B — Datos y capacidades:** `portal_trabajador.prisma`, migración `20261101090000_portal_trabajador` (aditiva, con reversa, FORCE RLS, trigger de mismo tenant), dominio puro (preferencias, silencio, campos faltantes), capacidades `mis_datos.{obtener,actualizar}`, `preferencias_notificacion.{obtener,actualizar}` y `privacidad.obtener`; manifest y registro; snapshot MCP e inventario de paridad.
3. **Bloque C — Pantallas** (01 Inicio, 06 Más, 10 Mis datos, 11 Privacidad, 12 Notificaciones) con `PaginaPortal` y los patrones del DS.
4. **Bloque D — Tests:** dominio, `test:db` (RLS entre tenants y entre trabajadores), snapshot MCP + paridad, e2e de las pantallas nuevas (1 worker).

### PR 2

Rondas del guardia (08) sobre el shell de Terreno y la traza GPS; Central 07/07b si CAR-85 ya está; Accesos 09 si el control de acceso operativo ya está; «Mi pauta»; datos bancarios y previsión sobre Personas.

## 5. Arquitectura

- Módulo vendible `portal_trabajador`; capacidades en `modules/portal_trabajador/capabilities` (no se toca el índice compartido de `packages/capabilities`).
- Alcance: `core.personas.usuario_id` = usuario de la sesión (o responsable de la key). Ningún input trae un id de persona. La escritura es condicional (`updateMany` con el mismo filtro) para que una fila que dejó de ser del usuario no se pise.
- Preferencias: una fila por (tenant, persona), JSONB con categorías cerradas validadas por el dominio; sin fila = silencio por defecto.
- Pantallas en `apps/web/app/(trabajador)/trabajador/**`; las acciones llaman `ejecutarCapacidad("trabajador", …)`. No se tocan `(cliente)` ni `(terreno)`.

## 6. Criterios de aceptación

CA1–CA6 de la spec §13. Además: CI verde (`typecheck · lint · test · test:db`, `build · presupuesto de JS`, `secretos`) y `ESTADO.md` actualizado.

## 7. Tests y gate

`pnpm typecheck && pnpm lint && pnpm test && pnpm test:db && pnpm build`, de a uno. e2e: solo los specs de este PR, con 1 worker. Migración **no aplicada** en Neon (la aplica el bot «OPAI 2.0» con respaldo).

## 8. Riesgos

- **Conflictos en archivos compartidos** (registro de módulos, snapshot MCP, `schemas` de `core.prisma`, `ESTADO.md`, `pnpm-lock.yaml`): solo líneas agregadas; al integrar se conserva lo ajeno y se regenera el snapshot.
- **Módulo sin activar:** un tenant sin el módulo `portal_trabajador` activo recibe «Módulo inactivo»; las pantallas lo muestran como estado, no como error.
- **Hoja de alcance sin contraste con 1.0** (ver nota en §3).
- **Dirección:** depende de que el servicio de geolocalización del tenant esté configurado; sin él, se escribe la dirección a mano. Para que el trabajador la busque, `core.geo.autocompletar` y `core.geo.detalle` se abren también al portal `trabajador` (una línea cada una).
- **Activación del módulo (decidido por Carlos, 30-oct-2026):** el portal se activa por empresa desde **Plataforma → Módulos** (el seed de dev lo activa para `gard`). Hasta que se active, un tenant recibe «Módulo inactivo» y la pantalla lo muestra como estado.
- **Sin solicitud ARCO desde el portal:** `core.cumplimiento.solicitud_crear` es del ERP y `soloPersonas`; Privacidad solo informa y muestra las solicitudes (propuesta de PR 2 en la spec §14).
- **Corrección CAR-87, PR #189:** la migración se renombró para ordenarla después de main, conservando el SQL. El SQL no es idempotente ante ejecución manual repetida; Prisma registra su aplicación. Codex separó la cabecera de servidor y el cuerpo compartido del formulario del DS para reducir el JS inicial sin subir topes ni cambiar permisos. CA1–CA5 conservan su implementación y pruebas existentes; CA6 queda parcial: falta comprobar visualmente todos los estados, temas y resoluciones con ficha.

## Historial

- 30-oct-2026 — creado con el PR 1.
