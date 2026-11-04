# BRIEF CAR-182 · Explorador de Documentos: «Vincular a»

Tarea: [CAR-182](https://linear.app/carlos-irigoyen/issue/CAR-182). Continúa el [brief del explorador](BRIEF-CAR-182-explorador-documentos.md) (PR #265, integrado) y su adenda de ADR-019 (punto 5: «en un PR siguiente, el selector “Vincular a”»). Diseño de referencia: `docs/2.0/diseño/export-documentos-v4/`, pantalla `02` (selector «Vincular a»). Decisiones de Carlos del 5-nov-2026 en la adenda de ADR-019.

## 1. Objetivo

Que quien sube un documento desde `/documentos` elija a qué se vincula (la empresa, una cuenta, una instalación o una persona) sin tener que entrar antes a la ficha. Al elegir, los tipos de documento ofrecidos son los de esa entidad y la hoja dice dónde se guardará.

## 2. Estado actual (verificado en `main` `b5cc8b27`)

- `HojaSubir` (`apps/web/app/_components/documentos/hoja-subir.tsx`) sube a una sola entidad que recibe por prop. En `/documentos` es siempre `{tipo:"tenant"}` con los tipos de capa `empresa`.
- El servidor ya decide: `core.documentos.iniciar_subida` llama `verificarEntidad` (existe en el tenant y está en el alcance del actor, `entidadesEnAlcance`/`vinculoEnAlcance`) y `tipoParaEntidad` (el tipo debe estar activo y ser de la capa de la entidad, `CAPA_DE`).
- Existen `core.cuentas.list`, `core.instalaciones.list` y `core.personas.list` (búsqueda, límite 1–100, alcance en la consulta, lectura auditada). `core.personas.list` y `core.cuentas.list` devuelven RUT y otros datos personales.
- `core:documentos.manage` lo tienen owner, admin y gerente; supervisor y viewer no. `puedeSubir` ya oculta «Subir» al supervisor.
- El `Combobox` del DS busca de forma remota con espera de 220 ms y descarta respuestas viejas; no tiene estado de error propio.

## 3. Alcance

**Entra**

- Campo «Vincular a» en la hoja de subir del explorador: Empresa (por defecto), Cuenta, Instalación, Persona (con el vocabulario de la vertical). Salvo Empresa, un buscador de la entidad.
- Tipos de documento filtrados por la capa de la entidad elegida; al cambiar de entidad, un tipo de otra capa se descarta.
- Texto de destino de la hoja que refleja la elección («Se guarda en los documentos de cuenta Andina»).
- Acción de servidor `buscarCandidatosDocumento` que lee con las capacidades de listar existentes y devuelve solo id y nombre.
- Solo se ofrecen las entidades cuya lista la persona puede leer (`cuentas.read`, `instalaciones.read`, `personas.read`).
- Pruebas: candidatos sin datos personales; el servidor rechaza entidad inexistente, de otra empresa, fuera de alcance y tipo de otra capa.

**No entra (y por qué)**

- **Que el supervisor suba a sus instalaciones desde el explorador.** Exige un permiso nuevo y acotado: es una decisión de permisos aparte (ver §15). No se amplía `core:documentos.manage`.
- Vincular a un puesto (la capa existe, el diseño 02 no lo ofrece).
- Capacidad nueva de búsqueda de candidatos: no hizo falta; no hay herramienta MCP, snapshot ni inventario nuevos de capacidades.
- Cambiar la entidad de un documento ya subido (`core.documentos.vincular` es otra operación, de referencias).

## 4. Arquitectura

- `buscarCandidatosDocumento({tipo, q})` (`apps/web/app/_acciones/candidatos-documento.ts`, `"use server"`): valida la entrada con Zod, invoca por `ejecutarComoUsuario("erp", …)` la capacidad `core.{cuentas,instalaciones,personas}.list` con `limite: 20` y proyecta a `{id, etiqueta, detalle?}`. Persona: «Apellidos, Nombres», sin RUT, correo, teléfono ni fecha de nacimiento; esos datos ni siquiera viajan al navegador. Instalación: nombre y, como detalle, su cuenta. Un rechazo se traduce a un mensaje breve (sin permiso, o error genérico sin detalles internos).
- Los ids de capacidad van literales (el gate de paridad rastrea qué capacidades invoca cada entrada de servidor). La acción se registra en `paridad-entradas.ts` con su motivo.
- `CampoVincular`: `Select` del DS para la entidad y `Combobox` con `onBuscar` para elegirla (búsqueda con espera de 220 ms, respuestas viejas descartadas, ≤ 20 resultados). Estado vacío: «Sin resultados para “…”». Estado de error: como el Combobox no tiene uno propio, el fallo se muestra como única fila no elegible con el mensaje (sin cambiar el DS).
- `useDestino`: estado del vínculo, tipos visibles (`CAPA_DE_ENTIDAD[tipo]`) y entidad de destino (`null` mientras no se elige). `CAPA_DE_ENTIDAD` en `tipos.ts` solo sirve para **ofrecer** tipos; una prueba la compara con `CAPA_DE` del servidor para que no se desfasen. El servidor sigue decidiendo.
- Mientras no hay destino, el `Uploader` está deshabilitado. Con archivos ya subidos o en curso, «Vincular a» se bloquea (cada archivo ya tiene su destino).
- `HojaSubir` recibe `vincular?` (id de la empresa, etiquetas, entidades disponibles). Sin esa prop se comporta como antes (fichas y portal supervisor). Se extrajeron `CampoVisibilidad` y `CamposDocumento` para mantener cada archivo en ≤ 150 líneas.

## 5. Archivos

- `apps/web/app/_acciones/candidatos-documento.ts` (nuevo).
- `apps/web/app/_components/documentos/`: `campo-vincular.tsx`, `use-destino.ts`, `campos-documento.tsx`, `campo-visibilidad.tsx` (nuevos); `hoja-subir.tsx`, `tipos.ts` (cambian).
- `apps/web/app/(erp)/documentos/page.tsx` y `_componentes/datos.ts` (pasan todos los tipos, `vinculables` y el vocabulario).
- Pruebas: `apps/web/test/candidatos-documento.test.ts`, `packages/capabilities/test/documentos-vincular-a.test.ts`, `packages/capabilities/test/documentos-vincular-a-db.test.ts`.
- Paridad: `packages/capabilities/test/paridad-entradas.ts`, `docs/2.0/paridad/mcp-inventario.md` (regenerado).
- Docs: este brief, `docs/2.0/ESTADO.md`, adenda de ADR-019 en `docs/2.0/01-decisiones.md`.

## 6. Modelo de datos y migraciones

Ninguna.

## 7. Capacidades

Ninguna nueva. Se reutilizan, con sus permisos, alcance y auditoría de lectura:

| Id | Uso | Permiso |
|---|---|---|
| `core.cuentas.list` | candidatos de cuenta | `core:cuentas.read` |
| `core.instalaciones.list` | candidatos de instalación | `core:instalaciones.read` |
| `core.personas.list` | candidatos de persona | `core:personas.read` |
| `core.documentos.iniciar_subida` | subida (sin cambios): valida entidad, alcance y capa | `core:documentos.manage` |

Un agente por MCP ya tiene las mismas herramientas (`core_*_list`, `core_documentos_iniciar_subida`); no hay brecha de paridad. Snapshot `herramientas-mcp.txt` sin cambios.

## 8. Interfaz y responsive

- Hoja «Subir documento» (Sheet): arriba «Vincular a» (Select de 44 px) y, si no es Empresa, el buscador de la entidad (Combobox, filas de 44 px); luego el archivo, el tipo, emisión, vencimiento y visibilidad, como hoy.
- 375 px: una columna, sin desbordes; la lista de resultados usa el ancho del campo. 1024 y 1280 px: la hoja lateral del DS, igual.
- Solo componentes y tokens de `@opai/ds`; sin elementos HTML interactivos crudos ni estilos inline.
- Verificación manual a 375, 1024 y 1280 px pendiente de QA en `test.opai.cl` (en la sesión del constructor no hubo base ni sesión para levantar la pantalla).

## 9. Seguridad y tenant

- El tenant sale de la sesión; la UI no manda tenant. Los candidatos pasan por las capacidades de listar: permiso y alcance en la consulta (ADR-022), RLS por tenant.
- La búsqueda de candidatos es una conveniencia, no una frontera: lo que vincula realmente lo valida `iniciar_subida` (existencia en el tenant, alcance del actor y capa del tipo). Un id manipulado en el navegador no salta esas validaciones.
- Sin datos personales hacia el navegador (persona solo por nombre) ni a logs (la acción no registra nada).
- Permisos sin cambios: `documentos.manage` no se amplía; la acción de candidatos no concede nada, solo lista lo que el actor ya puede leer.
- La lectura de candidatos queda en la auditoría de lecturas de las capacidades de listar (ids).

## 10. Casos límite

Sin permiso de lectura de una lista (la entidad no se ofrece; si igual se pide, mensaje «No tienes permiso…»); búsqueda sin resultados; caída del servicio (fila de error no elegible); persona o instalación con nombre repetido (la instalación muestra su cuenta; la persona solo el nombre, por decisión de no exponer más datos); cambio de entidad con tipo elegido (se descarta si es de otra capa); `?tipo=` del filtro del explorador que no es de la capa de la entidad (no se preselecciona); archivo agregado sin destino (el uploader está deshabilitado); cambio de destino con archivos ya subidos (bloqueado); entidad archivada tras buscar (el servidor responde `NOT_FOUND` y la hoja muestra el error de la subida).

## 11. Plan por bloques

1. `documentos: acción de candidatos para «Vincular a»` (acción, paridad de entradas, prueba de candidatos).
2. `documentos: selector «Vincular a» en la hoja de subir del explorador` (campo, hook, hoja, página).
3. `documentos: pruebas de que el servidor decide el destino` (en memoria y de base).
4. `docs: brief, ESTADO y ADR-019 para «Vincular a»`.

## 12. Tests

- `candidatos-documento.test.ts`: persona sin RUT ni datos personales, capacidad correcta por entidad, tope de 20, instalación con su cuenta, errores sin detalles internos, entrada inválida sin consulta, texto de destino, tabla de capas.
- `documentos-vincular-a.test.ts` (en memoria): cada entidad acepta los tipos de su capa (y la tabla de la UI coincide con el servidor); cada entidad rechaza tipos de otras capas; entidad inexistente o empresa ajena: `NOT_FOUND`; actor sin nada a cargo no vincula a nada.
- `documentos-vincular-a-db.test.ts` (Postgres real, RLS): el dueño vincula a cada entidad de su empresa; ni el dueño ni el supervisor vinculan a una instalación, cuenta o empresa de otra empresa; el supervisor solo vincula a su instalación y su cuenta (no a otra instalación ni a la empresa); tipo de otra capa rechazado con la entidad a cargo.
- Gate de paridad: `paridad-inventario.test.ts` regenerado.

## 13. Validación

`pnpm typecheck && pnpm lint && pnpm test` en verde. `pnpm test:db` corre en CI: en la sesión del constructor no había `DATABASE_URL_TEST` (el caso de base real se escribió siguiendo `vinculos-documentos-db.test.ts` y no se pudo ejecutar localmente). Capturas a 375, 1024 y 1280 px en `test.opai.cl` tras el despliegue (QA).

## 14. Criterios de aceptación

1. En `/documentos` › Subir hay «Vincular a» con Empresa (por defecto), Cuenta, Instalación y Persona (según permisos de lectura).
2. Al elegir una entidad, los tipos ofrecidos son los de su capa y el texto de destino la nombra.
3. Los candidatos salen de las listas existentes, ≤ 20, con búsqueda, estado vacío y de error; la persona se ve solo por nombre.
4. El servidor rechaza entidad fuera de alcance o de otra empresa y tipo de otra capa (pruebas).
5. Sin migración, sin permisos ampliados, sin capacidades nuevas; paridad en verde.
6. CI en verde; `ESTADO.md` actualizado.

## 15. Riesgos y rollback

- **Pendiente: el supervisor sube a sus instalaciones desde el explorador.** Hoy `core:documentos.manage` no es suyo y el explorador lo oculta; sube desde la ficha (portal supervisor). Hacerlo desde el explorador requiere un permiso nuevo y acotado (p. ej. subir solo a lo que tiene a cargo), que se define aparte, toca permisos y alcance y **pasa por el Revisor**. No se implementa aquí por decisión de Carlos.
- **Personas con el mismo nombre:** el selector no muestra RUT; si hay homónimos, hay que distinguirlos por contexto o subir desde la ficha. Si molesta, se puede agregar un dato no sensible (cargo o instalación) en un PR aparte.
- **Estado de error del selector:** se resuelve con una fila no elegible porque el Combobox del DS no tiene estado de error. Si se agrega al DS (con diseño en Claude Design), se reemplaza.
- **Tabla de capas duplicada** (`CAPA_DE_ENTIDAD` y `CAPA_DE`): la prueba falla si divergen; el servidor manda.
- **Consultas por navegación (ADR-045):** la página no suma consultas (`vinculables` sale de la identidad que ya se lee). Las búsquedas ocurren al escribir, una por cada pausa de 220 ms.
- **Peso de JS (ADR-037):** el código va en la hoja diferida; no cambia el JS inicial de `/documentos`. `pnpm presupuesto` lo confirma en CI.
- Rollback: revertir el PR; no hay datos migrados.
- **Pendientes del brief del explorador (revisión del PR #265), sin tocar aquí:** N2 (dos vínculos `propietario` en `explorar-entidades.ts`: índice único parcial o filtrar con `vinculoEnAlcance`), N3 (test que compare la vigencia en la consulta con `estadoVigencia`), N6 (precisión µs/ms de `createdAt` en el keyset). Este PR no modifica `explorar*.ts`; siguen en `ESTADO.md` como pendientes no bloqueantes. Con «Vincular a» hay más entidades que reciben propietarios, pero `iniciar_subida` crea un solo vínculo `propietario` por documento, así que N2 no se agrava.

## 16. Reporte de ejecución

Ver el PR y la fila «CAR-182 · “Vincular a” en el explorador» en `ESTADO.md`.
