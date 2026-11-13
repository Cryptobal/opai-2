# CAR-276 · Previsión completa en la ficha de persona

1. **Objetivo:** completar la tarjeta Previsión según el export aprobado (`docs/2.0/diseño/export-ficha-persona/`, pantalla «Previsión»), con catálogos en vez de texto libre y campos alineados con Previred y el LRE.
2. **Estado actual (verificado):** `core.personas_prevision` guarda AFP, régimen, salud, isapre, plan (cifrado), plan en UF y cotización UF, en texto libre. `@opai/domain` ya tiene la lista de AFP que lee Previred (`remuneraciones/indicadores.ts`).
3. **Alcance:** catálogos; columnas nuevas; `prevision_ver` y `prevision_actualizar`; tarjeta y hoja; importador; inventario de datos. Fuera: «Última liquidación», detalle nominal de cargas, isapre como catálogo.
4. **Arquitectura:** catálogos puros en `packages/domain/src/prevision-catalogos.ts`; entrada en `personas-prevision-input.ts` (normaliza y valida con `z.enum`); vista en `personas-prevision-vista.ts`; textos de la tarjeta en `apps/web/.../vista-prevision.ts` (sin React, con pruebas).
5. **Archivos:** ver el diff del PR.
6. **Modelo de datos:** migración aditiva `20261217100000_core_personas_prevision_completa`: 15 columnas nuevas, todas opcionales o con valor por defecto, y dos CHECK. La tabla ya tiene RLS y `tenant_isolation`.
7. **Capacidades:** sin capacidades nuevas; se amplían `core.personas.prevision_ver` y `core.personas.prevision_actualizar` (dryRun e idempotencia como antes). `discapacidadInvalidez` se marca como sensible para la auditoría.
8. **Interfaz:** cuatro grupos con `ParesGrid`, alerta de datos ocultos e insignia de verificación; hoja con selectores. Mobile primero (375, 1024 y 1280 px en `preview-e2e`).
9. **Seguridad y tenant:** sin cambios de RLS; el supervisor recibe los datos sensibles en null.
10. **Casos límite:** textos anteriores que no calzan (se conservan si no se tocan); valores fuera de catálogo o de rango (se rechazan); persona sin previsión (vista con valores por defecto).
11. **Plan por bloques:** catálogos y migración; capacidades e importador; tarjeta y hoja; documentación.
12. **Tests:** dominio (catálogos y normalización), web (textos de la tarjeta y hoja válida contra la capacidad), db (escritura completa, parcial y rechazos), supervisor con datos ocultos, importador con códigos.
13. **Validación:** gate local y `preview-e2e` con `ficha-persona-prevision-preview.spec.ts`.
14. **Criterios de aceptación:** la tarjeta muestra los cuatro grupos; la hoja guarda todos los campos por pantalla, API y MCP; el supervisor no ve los sensibles.
15. **Riesgos y rollback:** columnas aditivas; revertir es `DROP COLUMN` (ver el pie de la migración).
16. **Reporte:** `docs/2.0/estado/personas/CAR-276.md`.
