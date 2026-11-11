# BRIEF CAR-282 · Importador de personas y guardias

**Encargo:** Carlos, 11-nov-2026 (sesión dueña de Personas y Documentos). Épica CAR-279. Sobre el motor común de CAR-279/280 que integró Comercial (#502, #503).

## 1. Objetivo
Que una empresa cargue su base de personas desde una planilla (Excel o CSV) o desde un export de OPAI 1: ficha, previsión y cuenta bancaria, con el mismo estándar que Comercial.

## 2. Estado actual (verificado en `main` `a111d9c`)
El motor (`packages/capabilities/src/core/importar/`) ya resuelve lectura, mapeo, vista previa, simulación, lotes, reversión, RLS, auditoría, pantalla `/configuracion/importar` y herramientas MCP (`core.importar.*`). Tiene cuatro importadores, todos de Comercial. No hay importador de personas.

## 3. Alcance
- **Entra (PR 1):** importador `personas` con ficha (nombres, apellidos, RUT, correos, teléfono, nacimiento, sexo, nacionalidad, dirección), previsión (AFP, régimen, sistema de salud, isapre) y cuenta bancaria (banco con código SBIF, tipo de cuenta, número cifrado). Plantilla descargable, adaptador del export de OPAI 1 y prueba `@preview`.
- **Queda para el PR 2:** contratos vigentes (vínculo laboral: cargo, instalación, tipo, inicio y término). Necesita que las instalaciones y los cargos existan; va como importador `contratos`, después de `personas`.
- **Fuera:** plan de isapre en UF, tallas, OS-10 y jornada DT (CAR-276 y CAR-277 los completan en la ficha primero).

## 4. Arquitectura
Un `Importador<DatosPersona>` más en el registro del motor. Previsión y pago viven en tablas propias (una fila por persona); el importador las presenta al motor como campos de la misma persona (`aplanar`). Único cambio al motor: `actualizar` recibe también `ctx`, porque cifrar el número de cuenta lo necesita.

## 5. Archivos
`core/importar/personas.ts`, `personas-campos.ts`, `personas-escritura.ts`; `registro.ts`, `opai1.ts`, `tipos.ts`, `aplicar.ts`, `revertir.ts`, `esquemas.ts`; pruebas `core-importar-personas-db.test.ts`; e2e `importar-personas.spec.ts`; novedad; `AGENTS.md` (regla «Decisión tuya»).

## 6. Modelo de datos y migraciones
Sin migración: usa `core.personas`, `core.personas_prevision`, `core.personas_pago`, `core.importaciones*` e `ids_externos`.

## 7. Capacidades
Las del motor (`core.importar.catalogo`, `plantilla`, `ejecutar`, `lotes`, `revertir`) aceptan `importador: "personas"`. Sin herramientas nuevas; cambia la descripción del parámetro.

## 8. Interfaz y responsive
La pantalla existente lista «Personas» en «Qué quieres importar». Sin pantallas nuevas.

## 9. Seguridad y tenant
- Permiso `core:personas.manage` para importar; previsión y banco exigen además `personasPrevisionManage` y `personasPagoManage`, fila por fila.
- El número de cuenta se cifra igual que en la ficha. La planilla y sus valores no van a la auditoría (el motor ya marca `archivo` y `filas` como sensibles). En `importaciones_filas.previos` solo quedan valores previos, que para previsión y banco son vacíos.
- **La importación nunca reemplaza una cuenta bancaria existente**, ni con «sobrescribir»: el cambio de cuenta pasa por «Solicitar cambio» y la aprobación de RRHH.

## 10. Casos límite
RUT inválido o repetido en la planilla; persona archivada o anonimizada (no se toca); isapre sin nombre; banco o tipo de cuenta que no se reconoce; cuenta incompleta o con caracteres no válidos; id de origen ligado a otro RUT; persona creada por un lote que ya tiene vínculo, sueldo, anexos o usuario (no se borra al revertir); persona modificada después del lote (el lote no se revierte).

## 11. Plan por bloques
1. Importador, adaptador de OPAI 1 y registro. 2. Pruebas de base. 3. e2e `@preview`, novedad, `ESTADO.md` y `AGENTS.md`.

## 12. Tests
`core-importar-personas-db.test.ts` (simulación, creación con cifrado, reimportación, permisos, aislamiento y reversión) y el catálogo en `core-importar-db.test.ts`.

## 13. Validación
`preview-e2e` con `importar-personas.spec.ts` a 375, 1024 y 1280 px y sus capturas.

## 14. Criterios de aceptación
Los de CAR-282, salvo «contratos vigentes», que queda para el PR 2.

## 15. Riesgos y rollback
- El export de OPAI 1 (CAR-158) todavía **no trae personas**. El adaptador ya lee `personas` con los nombres de campo de `OpsPersona`, pero para usarlo hay que ampliar el exportador de 1.0 (lo decide Carlos: es tocar 1.0) o exportar a Excel desde 1.0 y subir la planilla, que funciona hoy.
- En 1.0 la AFP, el sistema de salud y la isapre están cifrados con la clave de la plataforma: el export debe entregarlos descifrados.
- Rollback: revertir el PR; sin migración.

## 16. Reporte de ejecución
Se completa al cerrar el PR.
