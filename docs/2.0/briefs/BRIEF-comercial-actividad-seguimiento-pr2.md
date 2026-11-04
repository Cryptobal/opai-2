# BRIEF · Comercial: Actividad y tareas (segundo PR) y Seguimiento comercial (segundo PR)

**Repo:** `Cryptobal/opai-2` · **Fecha:** 4-nov-2026 · **Tareas:** CAR-162 y CAR-67 · **Rama:** `brief/comercial-actividad-seguimiento-pr2` · **Briefs de origen:** [actividad y tareas](BRIEF-comercial-actividad-tareas.md) y [seguimiento comercial](BRIEF-seguimiento-comercial.md).

## 1. Objetivo
Cerrar los pendientes de Comercial que dejaron los primeros PR: que las etiquetas se vean y filtren en las listas, que un contacto se archive y restaure, que el negocio muestre su próxima tarea y el último contacto real, y que el seguimiento automático trabaje solo (mover etapa y cerrar al terminar sin respuesta), se ofrezca al enviar la cotización, avise al vendedor y muestre lo que el cliente contestó.

## 2. Estado actual (verificado)
- El PR 1 de actividad (compositor, línea de tiempo, tareas, etiquetas en ficha) y el PR 1 de seguimiento (planes versionados, pasos, trabajos, correos entrantes guardados como dato externo) están en `main`.
- Las listas de Cuentas, Contactos y Negocios no mostraban ni filtraban etiquetas. El contacto se archivaba pero no tenía restauración. El Resumen del negocio no mostraba tareas ni último contacto. La ficha de contacto no mostraba actividad.
- `ConfigPlan` (ADR-021) es JSON versionado: sumar campos opcionales no exige migración.

## 3. Alcance
**A · Actividad y tareas:** `ChipsEtiquetas` en el DS; filtro por etiqueta y etiquetas por fila en las listas de Cuentas, Contactos y Negocios; archivar y restaurar contacto (`core.contactos.restaurar`); tarjetas «Próxima tarea» y «Último contacto real» y etiquetas en el Resumen del negocio; actividad en la ficha de contacto.
**B · Seguimiento (por orden de valor):** mover la etapa al responder el cliente; cierre aplicado automático al terminar sin respuesta; hoja de seguimiento al enviar la cotización de CPQ (único punto tocado de las fichas de cotización); texto de los correos del cliente en pantalla; tarjeta en Inicio; entrada de menú «Pendientes»; aviso al vendedor cuando el cliente responde.
**Fuera de alcance:** variantes y etiquetas del plan (R24), «mover a etapa» por paso, recordatorio de «respondió sin próximo paso» y resumen diario. Quedan en ESTADO.

## 4. Arquitectura
- Dominio puro: `esContactoReal`, `ultimoContactoReal` y `textoHace` (`packages/domain/src/actividades-contacto-real.ts`); campos opcionales `etapaAlResponder` y `noCerrarDesdeEtapa` y `alTerminar: "aplicar_cierre_propuesto"` en `ConfigPlan`.
- Etiquetas por fila: helper `etiquetas-filas.ts` (una consulta por página, no por fila; ADR-045).
- Respuesta del cliente: `avanzarPorRespuesta` valida la etapa con `validarEntrada` y solo avanza, nunca retrocede, dentro de la misma transacción que registra la respuesta.
- Cierre: `seguimiento-cierre.ts` pierde el negocio con motivo `sin_respuesta` y nota, tras terminar el seguimiento; respeta «no cerrar desde la etapa».
- Aviso: ajuste apagado por defecto `seguimiento_aviso_responsable` más un consumidor de `comercial.seguimiento.cliente_respondio`; el evento comunicable y su plantilla por defecto quedan declarados para reglas de Comunicaciones (ADR-020, silencio por defecto).

## 5. Archivos
Dominio: `packages/domain/src/actividades-contacto-real.ts`, `comercial/seguimiento-plan.ts`, `comunicaciones/comercial.ts`. Capacidades: `core/crm/etiquetas-filas.ts`, `core/maestros/{contactos-restaurar,cuentas-get,cuentas,contactos}.ts`, `comercial/{contactos,negocios-lectura,seguimiento-*,seguimientos-correos,ajustes}.ts`. DS: `chips-etiquetas.tsx`. Web: `app/_components/etiquetas/*`, listas y fichas de `(erp)/{cuentas,contactos,negocios}`, `(erp)/negocios/_seguimiento/correos-cliente.tsx`, `(erp)/_componentes/seguimientos-inicio.tsx`, `(erp)/cotizaciones/[id]/_componentes/opcion-seguimiento.tsx`, `(erp)/configuracion/_comercial/*`. Manifest: `modules/comercial/manifest.ts`.

## 6. Modelo de datos y migraciones
**Sin migración.** Los campos nuevos del plan viven en el JSON versionado (ADR-021) y el aviso usa un ajuste. El prefijo reservado `20261105130000` queda sin usar. No lleva la etiqueta `migracion-pendiente`.

## 7. Capacidades
Nueva: `core.contactos.restaurar` (escritura, dryRun, idempotencia, audita). Nueva lectura: `comercial.seguimientos.correos` (texto externo, auditada). Extendidas: `core.cuentas.list`, `comercial.contactos.list` y `comercial.negocios.list` con `etiquetaId` y `etiquetas` por fila; `comercial.contactos.list` con `archivado`; `comercial.seguimiento_planes.guardar` con los campos nuevos. Todas con MCP; instantánea e inventario de paridad regenerados.

## 8. Interfaz y responsive
Chips compactos en las listas (se acortan con «+N» en teléfono), filtro de etiqueta junto a los filtros existentes, «Archivados» en Contactos. Resumen del negocio: dos tarjetas que apilan a 375 px y van en dos columnas desde 1024. «Respuestas del cliente» como texto plano con «Ver todo». Inicio: tarjeta «Seguimientos por hacer» (máximo 4, avisa atrasos; no aparece sin pendientes o sin permiso). En el diálogo de enviar cotización aparece «Seguimiento» con «Iniciar» o «Solo enviar». Menú: «Pendientes» en Comercial. Estados de carga con skeleton, vacío, error y sin permiso.

## 9. Seguridad y tenant
Todo por `ctx.db` con RLS y el tenant de la sesión. El texto del correo del cliente es contenido externo: se muestra como texto, nunca como HTML, y nunca habilita escrituras ni cambia el estado del negocio. Los cierres automáticos y el movimiento de etapa los decide el plan del tenant, no el texto del correo. El alcance de filas se aplica en la consulta.

## 10. Casos límite
Etapa configurada borrada o inválida: no se mueve y el seguimiento sigue. Negocio ya más adelante en el embudo: no retrocede. Negocio ya cerrado: el cierre automático no actúa. Cierre que falla: el seguimiento queda terminado y el negocio abierto, con propuesta de cierre. Contacto restaurado cuya cuenta está archivada: se restaura igual y lo dice la ficha. Sin permiso de Comercial o sin plan: la opción del envío no aparece y se envía como siempre.

## 11. Plan por bloques
1. Dominio de contacto real y tests. 2. `ChipsEtiquetas` en el DS y `/ds`. 3. Etiquetas en capacidades y listas. 4. Archivar/restaurar contacto y actividad en su ficha. 5. Tarjetas del Resumen del negocio. 6. Plan con etapa al responder y cierre aplicado. 7. Correos del cliente y aviso. 8. Hoja de seguimiento al enviar, tarjeta en Inicio y menú. 9. Instantáneas de paridad, brief y ESTADO.

## 12. Tests
Unitarios de dominio (5). Prueba contra Postgres `comercial-seguimiento-pr2-db.test.ts`: mover etapa sin retroceder, cierre aplicado y «no cerrar desde», correos sin cruce de empresas, filtro de etiquetas, archivar y restaurar. Paridad (instantánea e inventario), etiquetas de auditoría y menú del ERP.

## 13. Validación
`pnpm typecheck` verde en `@opai/web`, `@opai/mod-comercial` y `@opai/capabilities` (el typecheck en paralelo del monorepo se mata por memoria, código 137). `pnpm lint` sin errores. `pnpm test` verde tras regenerar la instantánea. **No se pudo correr `pnpm test:db`** (sin Postgres local) **ni capturas ni e2e** a 375/1024/1280 (sin sesión contra `dev`).

## 14. Criterios de aceptación
Las tres listas muestran y filtran por etiqueta; el contacto se archiva y restaura; el negocio muestra próxima tarea y último contacto real; al responder el cliente el negocio avanza según el plan; el plan que cierra solo pierde el negocio sin respuesta; al enviar la cotización se ofrece el seguimiento; el texto del cliente se ve como dato externo; Inicio y menú llevan a Pendientes; todo con su herramienta MCP.

## 15. Riesgos y rollback
Riesgo: sin ejecutar `test:db` ni capturas, un fallo de base o de diseño solo aparecería en CI o en QA. El aviso al vendedor está apagado por defecto. Rollback: revertir el squash; no hay migración ni datos nuevos.

## 16. Reporte de ejecución
Ver el PR. Queda pendiente lo listado en `ESTADO.md` (variantes y etiquetas del plan, «mover a etapa» por paso, recordatorio «respondió sin próximo paso», resumen diario).
