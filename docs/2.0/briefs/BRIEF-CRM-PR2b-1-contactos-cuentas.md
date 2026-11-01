# CRM PR 2b-1 · contactos en varias cuentas

Encargo CAR-131, Refs CAR-26. Rama `feat/crm-pr2b-pantallas`; base `origin/main` actualizada con merge normal. Implementación: Codex. Sin migraciones, nuevas capacidades, permisos ni cambios de RLS.

Decisión de Carlos (1-nov-2026 00:57 CLT), reproducida del encargo: «Construye ya las pantallas de CRM y CPQ con Codex, con el design system de 2.0, y revisamos el diseño después en vivo».

**Diseño no aprobado: se revisa en vivo.** Referencias de contenido: `DESIGN-PROMPT-crm-pr2.md` §4.5 y el encargo. Toda la UI usa `@opai/ds` de 2.0.

## Alcance y criterios de aceptación

| Criterio del encargo | Implementación / evidencia |
| --- | --- |
| Contacto: sección Cuentas con cuenta, cargo, roles y principal por vínculo | `CuentasContacto` y `ListaVinculos`, lectura `core.contactos.cuentas`. Se incluye Cesión. Pruebas de renderizado con datos ficticios. |
| Vincular a otra cuenta | Sheet del DS con búsqueda remota `core.cuentas.list`, excluye cuentas ya vinculadas; escribe con `core.contactos.vincular`. |
| Editar cargo y roles; marcar principal | Sheet por vínculo, `core.contactos.set_roles`. Advierte que el principal anterior de esa cuenta pasa a secundario. |
| Desvincular con confirmación irreversible | Dialog del DS antes de `core.contactos.desvincular`. Explica pérdida de cargo/roles y restricciones del backend. El error conserva el diálogo. |
| Cuenta: pestaña Contactos lee por vínculo | `core.cuentas.contactos`, muestra cargo/roles/principal de esa cuenta incluso en teléfono. Filas enlazan a la ficha de Contacto. |
| Sin permiso de escritura no hay acciones | Permiso efectivo en servidor (`puedeDeIdentidad`): rol base/personalizado y excepciones. Pruebas de acciones presentes/ausentes, también en estado vacío. El servidor vuelve a autorizar cada capacidad. |
| Vacío, carga y error | Empty con acción cuando está autorizado, Skeleton en Suspense, Estado y Alerta del DS, Reintentar ante fallo de lectura. |
| Accesibilidad y celular primero | Componentes del DS, etiquetas y nombres accesibles, botones nuevos de al menos 44 px, retorno de foco al disparador tras cerrar. **Parcial:** falta comprobar en navegador a 375, 1024 y 1280 px, temas, foco, contraste y zoom. |
| Tests unitarios y negativos | `crm-vinculos.test.ts` (renderizado, permisos efectivos y errores) y `crm-vinculos-permisos.test.ts` (capacidades: sin permisos, alcance, vistas previas, input que intenta conceder permisos). La regresión real entre tenants ya existe en `core-crm-db.test.ts`; no se ejecuta en Codex. |
| E2E teléfono y escritorio | Spec `crm-vinculos.spec.ts`: crea dos cuentas y un contacto ficticios, vincula la segunda, marca principal, comprueba datos por vínculo en ambas fichas, cancela y confirma desvincular. Incluye también iPad y capturas. **Pendiente de ejecución completa:** el intento local llegó al login y falló porque no existe `opai_e2e`; no hay evidencia visual autenticada. |

## Decisiones de implementación

Codex, conforme al encargo y sin nuevas reglas de negocio:

- El cargo, los roles y el principal se presentan dentro de cada vínculo. Se retira su interpretación global en la cabecera del contacto.
- Se conserva la edición de nombres, apellidos, correo y teléfono desde «Editar datos» en Contacto. Ese formulario no envía cargo, roles ni principal; así no altera la cuenta inicial al editar datos personales desde un vínculo secundario.
- La pestaña de Cuenta conduce a Contacto para editar vínculos. «Nuevo contacto» permanece en Cuenta y solo se monta con permiso de escritura.
- Se retira el contador de la pestaña Contactos, que provenía de `core.cuentas.get` y solo contaba la cuenta inicial. No se agrega otra lectura para corregirlo.
- Formularios y confirmación se descargan al abrirlos para respetar ADR-037. No se suben topes de JS ni consultas.

## Rendimiento y limitaciones

El cambio añade una invocación de `core.contactos.cuentas` a Contacto. En Cuenta reemplaza `core.contactos.list` por `core.cuentas.contactos`. La búsqueda remota se ejecuta al abrir el selector y escribir, sin precargar todas las cuentas ni consultar por cada fila. Identidad se reutiliza en el request. La medición antes/después y el máximo de ocho consultas por navegación (ADR-045) quedan **pendientes de comprobar con sesión y base funcionales**; no se declara cumplimiento medido.

Limitación heredada de alcance: `core.contactos.get/cuentas` autoriza a partir de la cuenta inicial. Un usuario acotado puede leer un vínculo secundario desde Cuenta y recibir `NOT_FOUND` al abrir Contacto si la cuenta inicial no es visible. No se relajan permisos ni se cambia backend en este PR.

Pendientes conocidos de backend, expresamente fuera de alcance y sin corregir: carreras en `packages/capabilities/src/core/crm/contactos-desvincular.ts` y `modules/cpq/capabilities/crear.ts` (`cpq.cotizaciones.create`). Las nuevas pantallas delegan cada mutación a su capacidad existente; no implementan chequeos de negocio seguidos de escrituras propias.

**test:db: se corre fuera de Codex.** Sin migraciones; consultas de verificación de migraciones: N/A.

## Lo que sigue

CRM PR 2b-2: Actividad/timeline/tareas. CRM PR 2b-3: etiquetas. Detección de duplicados, contador de otras cuentas y ampliación del alcance N–N no se implementan en este encargo acotado. Revisión de diseño en vivo y evidencia de QA siguen pendientes.

## Gate y autorrevisión

Typecheck y lint correctos (sin errores); `pnpm test`: 1731 tests, 266 archivos, todos correctos. Build web y presupuesto de JS correctos, sin alterar topes. La autorrevisión del subagente y su pasada sobre el delta no detectaron nuevos bloqueos de seguridad/datos. La revisión externa del Revisor OPAI 2.0 sigue a cargo de la cola habitual. Las verificaciones pendientes de entorno indicadas arriba se mantienen.
