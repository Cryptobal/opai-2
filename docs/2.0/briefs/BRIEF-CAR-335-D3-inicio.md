# BRIEF · CAR-335 D3 · Inicio del diseño nuevo

Plan general: `BRIEF-CAR-335-diseno-nuevo.md`. Decisión: ADR-109. Diseño: `docs/2.0/design/export-diseno-nuevo/Escritorio.dc.html` (vista `inicio`) y `Telefono.dc.html`. Depende de D2 completo (#603, #607, #609).

## 1. Objetivo
Que Inicio, con el diseño nuevo, sea la **cola de trabajo** del prototipo:
- saludo con la cantidad de decisiones pendientes;
- «Indicadores de tu empresa», que cada empresa elige con «Personalizar»;
- un solo panel con tres pestañas: «Necesita tu atención», «Actividad» y «Agenda» (próximos 14 días).

## 2. Estado actual (verificado en `main` `9cec9ac`)
- Inicio (CAR-182, `apps/web/app/(erp)/_componentes/inicio.tsx`) arma bloques sueltos: decisión, tareas, indicadores, accesos, seguimientos y actividad, cada uno con su capacidad y su Suspense.
- Los indicadores salen de `core.inicio.indicadores`, con un conjunto fijo: cobertura, negocios, facturado y tickets.
- No hay agenda en Inicio.
- El catálogo de indicadores de gestión (CAR-305, sesión Desempeño) mide por persona y período. No reemplaza a las tarjetas de Inicio; en este bloque no se toca.

## 3. Alcance
**Entra, solo con el marco nuevo** (el clásico y Hilo no cambian):
- Encabezado «Buenas tardes, <nombre>» con «Tienes N decisiones pendientes».
- Indicadores elegidos por la empresa:
  - ajuste nuevo `core.inicio_indicadores`, de ámbito empresa, con la lista ordenada de ids del conjunto actual;
  - «Personalizar» con fichas para agregar o quitar, visible solo con permiso de configuración.
- Panel con pestañas, que reutiliza las capacidades existentes:
  - «Necesita tu atención»: decisión, tareas y seguimientos;
  - «Actividad»;
  - «Agenda»: vencimientos y tareas con fecha de los próximos 14 días.

**No entra:**
- indicadores del catálogo de gestión en Inicio (se sumarán cuando ese catálogo exponga totales de empresa);
- cambios al Inicio clásico.

## 4. Arquitectura
- `InicioErp` recibe `marco`; con «nuevo» monta `InicioNuevo`, en su propio archivo y con los mismos bloques de servidor.
- El ajuste se declara en `core/config/nucleo.ts` (ADR-038, sin migración) y se cambia solo con `core.config.set`, que ya existe en pantalla, API y MCP.
- `core.inicio.indicadores` acepta el orden elegido y devuelve solo esas tarjetas.
- La agenda sale de las capacidades de tareas y vencimientos que ya existen, filtradas por fecha. Si falta una lectura, se agrega como capacidad con su herramienta MCP.

## 5. Archivos
- `apps/web/app/(erp)/page.tsx`, `_componentes/inicio*.tsx` y `indicadores-*`;
- `packages/capabilities/src/core/config/nucleo.ts`;
- la capacidad de indicadores de Inicio;
- pruebas, novedad y `ESTADO.md`.

## 6. Modelo de datos y migraciones
Ninguno. El ajuste vive en la configuración versionada existente.

## 7. Capacidades
Sin capacidades nuevas, salvo una lectura de agenda si no existe. `core.inicio.indicadores` respeta el ajuste. La paridad UI↔MCP se mantiene.

## 8. Interfaz y responsive
- **Escritorio:** saludo; indicadores en una fila de 4 tarjetas; el panel de pestañas a todo el ancho y «Próximos días» al lado.
- **iPad:** indicadores 2 × 2.
- **Teléfono:** una columna, con las pestañas como control segmentado.
- Estados de carga, vacío y error por bloque.

## 9. Seguridad y tenant
- El ajuste es de la empresa. Lo cambia solo quien tiene permiso de configuración (`core.config.set` lo verifica).
- Cada indicador sigue sujeto a su permiso: uno elegido que la persona no puede ver no aparece.

## 10. Casos límite
- Lista vacía: se muestran los indicadores por defecto.
- Id desconocido (indicador retirado): se ignora.
- Sin decisiones pendientes: «Nada pendiente».

## 11. Plan por bloques
- D3.1 ajuste y capacidad de indicadores.
- D3.2 `InicioNuevo` con encabezado, indicadores y «Personalizar».
- D3.3 panel con pestañas y agenda.
- D3.4 pruebas, novedad y documentos.

## 12. Tests
- Unitarias: ajuste, orden y filtro de indicadores, armado de la agenda.
- `@preview`: Inicio nuevo en los tres tamaños; «Personalizar» agrega y quita un indicador en qa-e2e y lo deja como estaba.

## 13. Validación
Gate completo, presupuesto de JS y `preview-e2e` con capturas revisadas contra el prototipo.

## 14. Criterios de aceptación
- Inicio nuevo igual al prototipo.
- La empresa elige sus indicadores y la elección vale para todos sus usuarios.
- Las pestañas muestran pendientes, actividad y agenda.
- El clásico no cambia.

## 15. Riesgos y rollback
Rollback: revertir el PR. El ajuste queda guardado sin uso.

## 16. Reporte de ejecución
Diferencias con este brief:
- El ajuste se declaró en `core/config/nucleo-inicio.ts`, no en `nucleo.ts`, por el límite de 150 líneas.
- La agenda trae solo tareas con fecha. Los vencimientos de documentos quedan para cuando haya una lectura por fecha.
- El `@preview` abre y cierra «Personalizar» sin guardar, para no cambiar los indicadores de qa-e2e que leen otras pruebas en paralelo. El guardado se prueba en unidad.
- `core.inicio.indicadores` también devuelve `elegidos`, la elección completa de la empresa, solo a quien puede editarla. Así quien no ve un indicador no lo borra sin querer.
- La elección de la empresa rige solo en el diseño nuevo.
