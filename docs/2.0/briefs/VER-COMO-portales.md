# Ver como · owner y administradores previsualizan los portales (CAR-528)

Pedido de Carlos (15-nov-2026): que el owner y los administradores vean exactamente lo que ve otra
persona en Terreno, el portal del trabajador y el portal del cliente. Paridad con 1.0:
`paridad/nucleo.md` B6 y N2, sin el secreto compartido de entorno.

## Decisiones (de Carlos, no se preguntan)

1. **Solo lectura en el servidor.** En «ver como» toda capacidad que no sea `lectura` falla en
   `restriccion` (`packages/capabilities/src/autorizacion.ts`), igual por pantalla, acción o ruta.
   La UI deja los botones visibles pero deshabilitados, con aviso.
2. **Banner fijo** «Estás viendo como <portal · nombre> · Salir».
3. **Permiso `core:ver_como.iniciar`**: clase «-» en `permisos-base-nucleo.ts`, así que solo owner y
   admin lo reciben (por el comodín); un rol personalizado lo recibe solo si se le asigna. Todo
   ocurre dentro de la empresa actual: el objetivo se busca con `ctx.db` (RLS del tenant).
4. **Auditado** en la cadena `seguridad` de la auditoría global: `seguridad.ver_como.inicio` y
   `seguridad.ver_como.fin` (quién, a quién, portal, objetivo, caducidad). Caduca a los 30 minutos;
   la caducidad queda escrita en el inicio, así que un fin por vencimiento no necesita otro evento.
5. **No toca a la persona vista**: no crea sesión, credenciales ni emparejamientos.

## Diseño

- **Capacidades** (`core.ver_como.*`, solo personas, ERP): `iniciar` (escritura con vista previa:
  valida permiso y objetivo, registra el inicio y devuelve a quién se verá y hasta cuándo),
  `terminar` (registra el fin) y `objetivos` (lectura para el buscador del selector, PR2). Las
  dos primeras quedan fuera del MCP con motivo en `paridad-excepciones.ts`: «ver como» es una vista
  de pantalla de una persona con sesión; un agente ya lee los mismos datos con sus capacidades.
- **Objetivo por portal.** Trabajador: una persona con usuario y membresía activa con el portal.
  Cliente: un acceso de contacto activo (el portal se ve por contacto, porque cada uno ve sus
  instalaciones). Terreno: una instalación con un equipo emparejado activo; se ve con ese equipo,
  en solo lectura. Sin equipo, se avisa (no se empareja nada).
- **Estado sin migración.** Una cookie `httpOnly` firmada (HMAC derivado de `BETTER_AUTH_SECRET`)
  guarda empresa, quien mira, id de su sesión, portal, objetivo y vencimiento. En cada petición se
  vuelve a comprobar la firma, el vencimiento, la misma sesión y empresa, y que quien mira siga
  teniendo el permiso. Cerrar sesión, cambiar de empresa o perder el permiso la invalida.
- **Ejecución.** `ejecutarComoUsuario(portal, …)` usa el contexto de la persona vista solo si la
  cookie es de ese portal; el contexto lleva `verComo: { porUserId }`, que bloquea escrituras y
  deja a quien mira en la auditoría de las lecturas personales. El ERP, `/api/v1` y el MCP siguen
  con la identidad propia. Terreno usa el equipo de la instalación con el mismo bloqueo.

Referente seguido y en qué se aparta: «Log in as / View as user» de Stripe y Intercom (vista de
soporte con banner, auditada y con caducidad). Se aparta en que es solo lectura y solo dentro de la
empresa, por decisión de Carlos.

## PRs

1. Servidor: permiso, capacidades `iniciar` y `terminar`, auditoría, bloqueo de escrituras, cookie
   firmada y uso en `ejecutarComoUsuario`.
2. Selector («Ver como…» en el menú de usuario, con buscador), banner y Terreno.
3. Portal del trabajador y portal del cliente.

Pruebas: unitarias del bloqueo (una escritura en «ver como» falla), del permiso (un no-admin no puede
iniciar), del objetivo de otra empresa y de la cookie; e2e `@preview` con la empresa `qa-e2e`.
