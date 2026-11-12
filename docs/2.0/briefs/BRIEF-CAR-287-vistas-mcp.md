# BRIEF CAR-287 · OPAI dentro de Claude: primera vista MCP App (Pendientes)

## 1 · Objetivo
Que OPAI se abra dentro de Claude como conector interactivo (extensión abierta MCP Apps, spec 2026-01-26). Primera vista: «Pendientes», lo que espera una decisión hoy en la empresa, con «Actualizar» y «Abrir en OPAI». Parte 1 de CAR-287 (adelantado por Carlos el 11-nov, ADR-090 adenda 1).

## 2 · Estado actual (verificado)
- `/api/mcp` publica todas las capacidades como herramientas (`mcp-handler` 2.3, `@modelcontextprotocol/server` 2.3) y acepta API key u OAuth por persona (CAR-247, PR #527 y #535).
- `core.inicio.pendientes` existe y es la herramienta `core_inicio_pendientes`.
- No hay vistas `ui://`.

## 3 · Alcance
Entra: recurso `ui://opai/pendientes.html` (`text/html;profile=mcp-app`) y `_meta.ui.resourceUri` en `core_inicio_pendientes`. La vista dibuja el resultado, pide «Actualizar» por `tools/call` y abre cada pendiente con `ui/open-link`. No entra: pantalla completa, vistas de ficha (parte 3), sitios embebidos (`frameDomains`, restringido por Claude), publicación en el directorio de conectores.

## 4 · Arquitectura
`apps/web/lib/mcp-vistas/`:
- `puente.ts`: JSON-RPC 2.0 por `postMessage`, sin dependencias. Implementa `ui/initialize`, `ui/notifications/initialized`, `tool-result`, `host-context-changed`, `size-changed`, `open-link` y `resource-teardown`.
- `estilos.ts`: solo variables de estilo que entrega el cliente, con colores de sistema como respaldo.
- `pendientes.ts`: el HTML.
- `index.ts`: registro y `_meta`.

`lib/mcp.ts` registra las vistas y agrega `_meta` a las herramientas que tienen una. La vista no llama a OPAI directo: todo pasa por el cliente, con los permisos de quien se conectó. Se descartó incrustar el cliente oficial `@modelcontextprotocol/ext-apps` (546 KB sin comprimir) por su peso; el protocolo es pequeño y está probado con un cliente simulado.

## 5 · Archivos
`apps/web/lib/mcp-vistas/*`, `apps/web/lib/mcp.ts`, `apps/web/test/mcp-vistas.test.ts`, `apps/web/e2e/mcp-vista-pendientes.spec.ts`, docs.

## 6 · Modelo de datos y migraciones
Sin cambios.

## 7 · Capacidades
Ninguna nueva. La vista usa `core.inicio.pendientes` (lectura, sin auditoría por ser solo contadores).

## 8 · Interfaz y responsive
- Tarjetas con título, detalle y botón «<acción> en OPAI»; pie con «Actualizar».
- Hereda tipografía, colores y radios del cliente en claro y oscuro.
- Foco visible y transición de 150 ms con `prefers-reduced-motion`.
- La fila se reacomoda en pantallas angostas.
- Sin diseño aprobado de Claude Design: sigue las guías de diseño de MCP Apps (la vista debe verse como el cliente) y se reporta.

## 9 · Seguridad y tenant
- HTML estático sin datos ni secretos; los datos llegan por la herramienta, con la empresa del token y los permisos de la persona.
- Sin scripts ni estilos externos, y el texto se pinta con `textContent`.
- El puente solo acepta mensajes de `window.parent`.
- Los enlaces se arman sobre el origen del MCP.

## 10 · Casos límite
Error de la herramienta (aviso para reintentar), lista vacía («Todo al día»), cliente sin soporte de vistas (la herramienta sigue devolviendo texto) y cierre de la vista (`resource-teardown`).

## 11 · Plan por bloques
1. `web:` vistas MCP App y pendientes, con pruebas.
2. `docs:` brief, ESTADO y novedad.

## 12 · Tests
- `mcp-vistas.test.ts`: `tools/list` trae el `_meta`; `resources/list` y `resources/read` devuelven el MIME; la vista es autocontenida y no trae colores propios.
- e2e `@preview` con un cliente MCP Apps simulado: inicia, dibuja, actualiza con `tools/call` y abre el enlace.

## 13 · Validación
Pruebas locales en verde y captura a 375 y 1280 px. Pendiente: probarla en Claude real cuando OAuth esté en `test.opai.cl`.

## 14 · Criterios de aceptación
- Claude muestra la vista al llamar a `core_inicio_pendientes`.
- La vista solo ve lo que la persona ve en OPAI.
- Sin dependencias nuevas.

## 15 · Riesgos y rollback
- El protocolo puede cambiar; la versión se negocia en `ui/initialize`.
- Rollback: quitar `registrarVistas` y el `_meta`; las herramientas siguen iguales.

## 16 · Reporte de ejecución
- Bloque 1 hecho. Unitarios 3/3 y e2e 2/2 en local.
- Sin migración.
- Falta la prueba con Claude real después de integrar #527 y #535.
