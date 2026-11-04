# BRIEF CAR-120 · Agente interno: panel de conversación (PR 5a)

## 1. Objetivo
Dar pantalla al agente interno (ADR-049): un panel donde el usuario pide algo, ve el plan con vistas previas y lo confirma. El servidor ya existe (`modules/agente`, #62 y #73) y el diseño fue aprobado el 30-oct (`docs/2.0/diseño/export-agente-interno/`). Decisión de Carlos (4-nov-2026, chat): se desarrolla ahora, no después de la migración; resuelve D7 en cuanto al momento (el precio como servicio aparte sigue en ADR-058).

## 2. Estado actual (verificado)
Capacidades `agente.modelos.list`, `agente.turno.preparar` (un turno, sin streaming; devuelve `texto`, `pasos` y un `token` firmado de 1 h), `agente.plan.confirmar` (aceptar/rechazar; `aprobar_todo` o un paso por vez, con `siguiente`) y `agente.historial.list` (metadatos). Sin tablas de conversación. #258 dejó el hueco `agente` junto a la campana.

## 3. Alcance (5a)
Botón «Preguntar a OPAI» junto a la campana (solo con módulo `agente` activo y `agente:usar`), atajo Ctrl/⌘+J, panel (pantalla completa en teléfono, superpuesto con scrim en iPad, acoplado sin scrim en escritorio ≥ 1280 px), selector de modelo, nivel «Paso a paso» / «Aprobar todo», hilo en pantalla, tarjeta de plan (vista previa por paso, confirmar, descartar, estados hecho/falló/en aprobación/no ejecutado/vencido), errores en lenguaje de usuario, estado sin modelo conectado. Fuera de 5a (va en 5b): conversaciones guardadas (migración), adjuntos, historial y su ruta, «Preguntar sobre esta ficha», fila en ⌘K, `?agente=1` en la URL, redimensionar el panel, sugerencias de inicio por vertical, insignia reversible/irreversible, «Detener».

## 4. Arquitectura
Componente nuevo del DS `PanelLateral` (`packages/ds/src/shell/panel-lateral.tsx`); `AppShell` reserva `--panel-lateral` a la derecha del `main` en ≥ 1280 px. En la app: `apps/web/app/_components/agente/` (hook `use-agente`, `tarjeta-plan`, `vista-previa`, `compositor`, `panel-agente`, `boton-agente`, `use-agente-shell`). Las llamadas pasan por `ejecutarCapacidad` (mismas reglas que /api/v1 y MCP). Botón y panel se cargan con `dynamic`, fuera del JS inicial.

## 5. Archivos
Ver §4 más `datos-shell.ts` / `tipos-shell.ts` (bandera `agente`) y `marco-shell.tsx` (4 líneas).

## 6. Modelo de datos y migraciones
Ninguna.

## 7. Capacidades
Ninguna nueva; consume las cuatro de `agente.*`. Sin cambios de paridad MCP.

## 8. Interfaz y responsive
Teléfono: hoja completa con cabecera de 52 px, compositor sobre la safe-area. iPad: 400 px bajo la barra superior con scrim; con un plan pendiente, tocar fuera y Escape no cierran. Escritorio: 400 px acoplado; el contenido se reacomoda. Foco al lanzador al cerrar; `aria-live` en el hilo.

## 9. Seguridad y tenant
La identidad y los permisos son los del usuario (ADR-049 §3); la decisión de confirmar solo sale de la sesión humana (`soloPersonas`). El texto del modelo y las vistas previas se muestran como texto plano (nunca HTML) y solo muestran valores simples. El token firmado es opaco para la UI. Sin licencia o sin permiso no existe lanzador ni atajo.

## 10. Casos límite
Plan vencido (error `FORBIDDEN` al confirmar → «Pídelo de nuevo»); paso irreversible → «En aprobación» y el plan no sigue solo; fallo → los siguientes quedan «No se ejecutó»; sin modelos conectados; sin conexión; doble clic (el servidor es idempotente y el cliente serializa).

## 11. Plan por bloques
1) DS `PanelLateral`; 2) estado, plan y panel; 3) lanzador y shell; 4) tests y docs.

## 12. Tests
`agente-tarjeta-plan.test.ts` (estados del plan, texto plano, errores); suite del shell existente.

## 13. Validación
typecheck, lint, test, build y `pnpm presupuesto`; revisión independiente.

## 14. Criterios de aceptación
El botón aparece solo con módulo y permiso; el panel abre y cierra con teclado; un plan se confirma paso a paso y de una vez; nada se escribe sin confirmar; gate en verde.

## 15. Riesgos y rollback
Acoplado en ≥ 1280 px cambia el padding derecho del `main`: se revierte quitando `--panel-lateral`. Sin streaming, un turno largo se ve como «Preparando…» hasta que termina. Rollback: quitar `useAgenteShell` de `marco-shell.tsx`.

## 16. Reporte de ejecución
Ver el PR.
