# BRIEF CAR-307 · Desempeño: pantallas (primera entrega)

[Sesión Desempeño] · ADR-094 · rama `brief/car-307-desempeno-pantallas`, apilada sobre CAR-313 (PR #544).

## 1. Objetivo
Que una persona pueda, desde el ERP, ver qué cargos tienen definida su gestión, armar y publicar el scorecard de un cargo, definir su jefatura y ver el resultado del equipo y de cada persona. Hasta ahora todo eso solo existía como capacidades y herramientas MCP.

## 2. Estado actual (verificado en la rama)
- Capacidades listas: `desempeno.scorecards.list|get|guardar`, `desempeno.resultados.ver_cargo|ver_persona` (CAR-306), `core.cargos.set_jefatura` (CAR-314), `core.indicadores_gestion.catalogo` (CAR-305), `desempeno.propios.list` (CAR-313).
- El módulo no declaraba navegación ni tenía rutas.
- Diseño base aprobado por Carlos el 11-nov-2026: `docs/2.0/design/export-desempeno/` (estructura y contenido; datos de ejemplo).

## 3. Alcance
Entra: lista de cargos, ficha del cargo (scorecard vigente y pendiente, editor, jefatura, equipo con puntaje) y resultado de una persona. Entrada «Desempeño» en el área Personas.
No entra (queda para la segunda entrega de CAR-307): pantalla de indicadores propios (hoy se arman por MCP y ya se pueden elegir en el editor), catálogo navegable por módulo, «ver esta pantalla como», elegir un mes distinto del actual, posición en el equipo para la persona, propuestas del agente en el hilo (CAR-312).

## 4. Arquitectura
Páginas de servidor con `PaginaPortal` y los patrones `ListScreen` y `DetailScreen`; cada dato sale de una capacidad vía `ejecutarComoUsuario`. Las escrituras van en hojas (`Sheet`) de cliente con `useCapacidad`. Ninguna lógica en la pantalla: quién ve a quién, la vigencia y el puntaje los decide la capacidad.

## 5. Archivos
- `apps/web/app/(erp)/desempeno/page.tsx`, `_componentes/{datos,tipos}.ts`
- `cargos/[id]/page.tsx`, `not-found.tsx`, `_componentes/{editar-scorecard,filas-scorecard,jefatura,equipo,tabla-scorecard}.tsx`
- `personas/[id]/page.tsx`, `not-found.tsx`
- `modules/desempeno/manifest.ts` (navegación)
- `packages/capabilities/src/desempeno/{resultados,comun,scorecards-lectura}.ts`
- `apps/web/e2e/desempeno.spec.ts`, `desempeno-preview.spec.ts`
- Novedad `2026-11-12-desempeno-pantallas.md`

## 6. Modelo de datos y migraciones
Sin migración.

## 7. Capacidades
Una sola modificación: `desempeno.resultados.ver_persona` devuelve además `nombres` y `apellidos` de la persona (la ficha necesita el título y quien ve el resultado no siempre tiene permiso de leer Personas; `ver_cargo` ya entregaba el nombre). La auditoría de la lectura no cambia (solo el id). `desempeno.scorecards.get` devuelve además el nombre del cargo y, por cada indicador usado, su nombre, qué mide y su unidad: así quien ve el scorecard sin permiso sobre el catálogo (supervisor, solo lectura) lee nombres y no identificadores. El esquema `periodo` pasa a `comun.ts` para compartirlo.

Consultas por navegación (ADR-045): lista 1 capacidad; ficha del cargo 3 (scorecard, equipo, cargos) y 5 para quien edita (catálogo e indicadores propios); resultado de la persona 1.

## 8. Interfaz y responsive
Solo componentes de `@opai/ds`. Lista como tabla en escritorio y tarjetas en teléfono. La ficha apila secciones. El editor es una hoja lateral en escritorio y hoja inferior en teléfono, con «Guardar borrador» y «Publicar» (este último solo si los pesos suman 100 %). Estados: carga, vacío, error, sin permiso y no encontrado.

## 9. Seguridad y tenant
Sin acceso directo a datos. Los botones de editar se muestran según `desempeno:scorecards.manage` y `core:estructuras.manage`, y la capacidad vuelve a verificarlo. La sección de jefatura se oculta si quien mira no puede leer los cargos. Una persona fuera de lo visible responde «no encontrado», igual que una inexistente.

## 10. Casos límite
Cargo sin scorecard; borrador o cambio que rige el mes siguiente (se muestra aparte del vigente); persona sin hechos en el mes («Sin datos», no cero); indicador de un módulo apagado; equipo de más de 200 personas (se avisa); empresa sin indicadores disponibles.

## 11. Plan por bloques
1. Pantallas, navegación, novedad, pruebas y documentación (un commit).

## 12. Tests
`desempeno.spec.ts` (define, publica y fija jefatura desde la pantalla), `desempeno-preview.spec.ts` (`@preview`, 375/1024/1280), paridad e inventario MCP, 404 con shell.

## 13. Validación
Gate completo; e2e locales contra una base sembrada; capturas revisadas contra el diseño base.

## 14. Criterios de aceptación
- «Desempeño» aparece en Personas solo con el módulo activo y el permiso.
- Se puede definir, guardar en borrador y publicar un scorecard desde la pantalla.
- La jefatura del cargo se cambia desde la ficha.
- El equipo muestra solo a quienes puede ver quien consulta.

## 15. Riesgos y rollback
Sin datos nuevos: revertir el PR quita las pantallas. La vista previa necesita el módulo activo en `qa-e2e` y las migraciones de #528, #537 y #544 en `dev`.

## 16. Reporte de ejecución
Ver el PR.
