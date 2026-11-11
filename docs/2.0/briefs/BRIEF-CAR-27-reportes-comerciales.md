# BRIEF CAR-27 (parte 1) y CAR-298 · Reportes comerciales

Sesión Comercial, 11-nov-2026. Nace de la comparación de Comercial con OPAI 1.0 y con el alcance aprobado (`diseño/alcance-crm.md`, PR 3).

1. **Objetivo.** Que ventas vea en una pantalla cómo va el embudo, qué se ganó y perdió, de dónde vienen las solicitudes y qué se espera cerrar. El mismo dato queda disponible para agentes por MCP.
2. **Estado actual (verificado en `main` `87cfb63`).** Existen `comercial.informes.cierre` y `comercial.informes.perdidos_por_motivo`, solo por MCP. No hay pantalla ni informe por canal (`get_lead_channel_report` de 1.0, BRIEF-31). Diseño entregado por Carlos el 3-nov-2026: `diseño/export-crm-v3-cierre/ReportesComerciales.dc.html`.
3. **Alcance.** Pantalla `/negocios/reportes` y una capacidad de lectura. Fuera: exportar a Excel, filtros por origen y etiqueta, campos personalizados, fusionar y transferir (siguen en CAR-27).
4. **Arquitectura.** Una capacidad, `comercial.informes.tablero`, con el cálculo en funciones puras (`informes-tablero-calculo.ts`, `-canales.ts`, `-periodo.ts`). La pantalla es de servidor: el período y el responsable viajan en la URL.
5. **Archivos.** `packages/capabilities/src/comercial/informes-tablero*.ts`; `apps/web/app/(erp)/negocios/reportes/`; `packages/ds/src/components/barra-progreso.tsx` y `barras-verticales.tsx`.
6. **Modelo de datos y migraciones.** Ninguna.
7. **Capacidades.** `comercial.informes.tablero` (`comercial:negocios.read`, lectura). Entrada: `periodo` (mes, trimestre, anio) y `responsableId` opcional. Las solicitudes por canal salen `null` si el actor no tiene `comercial:solicitudes.read`.
8. **Interfaz y responsive.** `DashboardScreen` con cuatro indicadores y cinco secciones; una columna en teléfono y dos desde 1024 px. Probado a 375, 1024 y 1280 px.
9. **Seguridad y tenant.** Solo `ctx.db` (RLS). Devuelve agregados; los únicos nombres son los de los responsables que aparecen en el informe. `auditarLectura` sin ids, como los otros informes.
10. **Casos límite.** Sin cerrados, la conversión y el ciclo son `null` y se muestran como «—». Negocios sin fecha de cierre o fuera de los cuatro meses se informan aparte en el pronóstico. Tope de 20.000 filas por consulta. Las fechas se cortan en UTC, como los informes existentes.
11. **Plan por bloques.** (1) capacidad y pruebas; (2) DS; (3) pantalla, e2e `@preview` y Novedades; (4) documentos.
12. **Tests.** `comercial-informes-tablero.test.ts` (8, cálculo puro) y `comercial-informes-tablero-db.test.ts` (2, Postgres real con dos empresas y permisos). e2e `reportes-comerciales.spec.ts`.
13. **Validación.** Gate, e2e local a tres tamaños con capturas revisadas y `preview-e2e` en el PR.
14. **Criterios de aceptación.** La pantalla abre desde Negocios, cambia de período, filtra por responsable, no se desborda a 375 px y nunca muestra datos de otra empresa. La herramienta MCP devuelve lo mismo.
15. **Riesgos y rollback.** Solo lectura y sin migración: revertir el PR basta. Con más de 20.000 negocios cerrados en 24 meses el informe quedaría truncado; hoy ninguna empresa se acerca.
16. **Reporte de ejecución.** Ver la descripción del PR.
