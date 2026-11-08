# BRIEF CAR-223 · Editar datos laborales desde la ficha de Personas

Sesión «Personas · Code» · rama `fix/car-223-editar-datos-laborales` · Linear [CAR-223](https://linear.app/carlos-irigoyen/issue/CAR-223) (Urgent, Bug) · sin migración.

## 1. Objetivo

Que quien gestiona personas pueda **ver y editar** los datos laborales desde `/personas/[id]/laboral`, y que el botón del vínculo diga con claridad qué hace. «Editar datos» queda solo para identidad y avisa dónde se edita lo laboral.

## 2. Estado actual (verificado en `main` `d4fc6ac`)

- «Editar datos» (`hoja-persona.tsx` + `campos-persona.tsx`) llama a `core.personas.update`: solo identidad y contacto. No monta `CamposVinculo` al editar.
- Laboral (`personas/[id]/laboral/page.tsx`): casi todo es lectura. Único CTA: «Editar vínculo» (`hoja-editar-vinculo.tsx`, `?editar-vinculo=1`), que edita instalación, puesto, jornada pactada y «desde» con `core.vinculos.update`. No expone cargo ni tipo de contrato, aunque la capacidad los acepta (`camposVinculo`).
- Capacidades de escritura ya existentes y sin UI: `core.personas.laboral_actualizar` (uniforme, jornada DT, OS-10, contacto laboral; permiso `personasLaboralManage`), `core.personas.prevision_actualizar` (`personasPrevisionManage`), `core.personas.pago_solicitar_cambio` (`personasPagoManage`; la aprobación ya tiene botones).
- El sueldo vive en `/personas/[id]/sueldo` (capas 07b), fuera de alcance salvo el enlace «Ver sueldo».

## 3. Alcance

1. Botón «Editar» por sección en Laboral, visible solo con el permiso de escritura de esa sección: **Previsión, Uniforme, Jornada DT, OS-10, Contacto laboral** y **Cuenta de pago** (solicita cambio; no modifica la cuenta vigente).
2. CTA del vínculo: etiqueta «Cambiar cargo, contrato, instalación o jornada», con descripción corta; la hoja suma **cargo** y **tipo de contrato** (y término pactado si el tipo lo exige) vía `core.vinculos.update`, con la misma validación que el alta.
3. «Editar datos»: aviso en la hoja («Cargo, contrato, previsión y demás datos laborales se editan en la pestaña Laboral», con enlace).
4. Sin permiso: el botón no se muestra; el estado de solo lectura se explica en una línea, sin botones muertos.

Fuera de alcance: capas de sueldo, Puestos/Trasladar/Pauta, motor de sueldos, PIN de terreno, CAR-210 (PR aparte).

## 4. Arquitectura

- Una hoja cliente por sección (`Sheet` del DS, estado en URL con `useHojaUrl`, carga diferida en `diferidas.ts`, ADR-037) y campos en archivos aparte para respetar el tope de 150 líneas.
- Cada `seccion-*.tsx` (servidor) sigue leyendo con su capacidad `*_ver` y, si el usuario tiene el permiso de gestión, monta su botón y su hoja con los valores actuales.
- Todas las escrituras llaman a las capacidades existentes con `useCapacidad("erp")`, con vista previa (`dryRun`) donde ya la usa el patrón del vínculo. Paridad MCP: no se crean capacidades nuevas.

## 5. Archivos (previstos)

`apps/web/app/(erp)/personas/[id]/laboral/page.tsx`, `_componentes/{seccion-prevision,seccion-uniforme,seccion-jornada-dt,seccion-os10,seccion-contacto-laboral,seccion-pago}.tsx`, nuevos `hoja-laboral-*.tsx` y `campos-*.tsx`, `diferidas.ts`, `hoja-editar-vinculo.tsx`, `campos-vinculo.tsx` (reutilizado), `hoja-persona.tsx` (aviso), `docs/2.0/ESTADO.md`.

## 6. Modelo de datos y migraciones

Ninguna.

## 7. Capacidades

Se usan `core.personas.laboral_actualizar`, `core.personas.prevision_actualizar`, `core.personas.pago_solicitar_cambio`, `core.vinculos.update`. Sin cambios de permisos ni de contrato.

## 8. Interfaz y responsive

DS de OPAI 2.0 (`Sheet`, `Campo`, `Select`, `InputFecha`, `Alerta`, `Button`), sin hex ni elementos crudos. Teléfono: hoja a pantalla completa; touch targets ≥44 px. Verificar 375, 1024 y 1280 px. Estados: cargando, error de la capacidad en línea, sin cambios (botón deshabilitado con motivo), sin permiso.

## 9. Seguridad y tenant

Permisos exigidos en servidor por cada capacidad; la UI solo oculta. Previsión y cuenta de pago son datos reservados: no se escriben en logs ni en la descripción del PR. Sin datos personales en el PR ni en Linear.

## 10. Casos límite

Sin vínculo vigente (solo «Nuevo vínculo»); conflicto de versión del vínculo; cargo retirado; solicitud de pago ya pendiente; supervisor con plan ISAPRE enmascarado (no se edita); persona anonimizada o archivada.

## 11. Plan por bloques (un commit por bloque)

1. Brief.
2. Vínculo: etiqueta clara, cargo y tipo en la hoja, test.
3. Hojas de Previsión, Uniforme, Jornada DT, OS-10 y Contacto laboral.
4. Solicitud de cambio de cuenta de pago.
5. Aviso en «Editar datos».
6. Tests, `ESTADO.md`, revisión final.

## 12. Tests

Unitarios de los validadores de cada hoja; pruebas de componente donde el repo ya las usa; e2e solo de los specs de Personas tocados. Gate: `pnpm typecheck && pnpm lint && pnpm test && pnpm test:db && pnpm build` y `pnpm presupuesto`.

## 13. Validación

Recorrido con Playwright a 375/1024/1280 de `/personas/<id>/laboral` con un rol con permiso y otro sin él; consola sin errores; capturas en el PR.

## 14. Criterios de aceptación

- Con permiso, desde Laboral se ven y guardan AFP/régimen/salud, uniforme, jornada DT, OS-10 y contacto laboral, y se solicita cambio de cuenta.
- El CTA del vínculo tiene etiqueta y descripción claras; al guardar quedan persistidos cargo, tipo, instalación, puesto y jornada.
- «Editar datos» sigue siendo solo identidad y no oculta ni promete lo laboral.
- Sin permiso: mensaje claro, sin botones muertos.

## 15. Riesgos y rollback

Riesgo bajo: solo UI sobre capacidades existentes. Rollback: revertir el squash.

## 16. Reporte de ejecución

Se completa al cerrar el PR.
