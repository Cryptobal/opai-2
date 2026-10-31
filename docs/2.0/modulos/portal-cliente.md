# Portal Cliente — Especificación funcional

**Estado:** borrador escrito al construir el PR 1 (Carlos no tenía especificación; el encargo del 30-oct-2026 pidió que la escriba el constructor a partir del diseño v3 aprobado y de sus decisiones) · **Fase:** 3 · **Insumos:** [`diseño/export-portal-cliente/`](../diseño/export-portal-cliente/README.md) (v3, 01–13), `extraccion/rondas-y-tickets.md`, ADR-022, ADR-033, ADR-016 · **Autor:** Claude · **Tarea:** CAR-88 (`Refs CAR-88`)

> Lenguaje de negocio. Cada regla (R) y criterio (CA) se cita desde el brief y los tests. Lo que depende de módulos que aún no están en `main` queda marcado **PENDIENTE (PR 2)** y no se simula con cifras.

## 1. Objetivo

El contacto de un cliente de la empresa de seguridad (por ejemplo, el administrador de «Logística Andina SpA») entra a un portal propio y ve **la cobertura del servicio, no el costo**: qué instalaciones tiene, cómo cumplió la empresa en el mes, qué pasó (novedades, rondas, supervisión) y qué documentos de los guardias le corresponde ver. Se nota que funciona cuando el cliente responde sus propias preguntas de «¿vinieron anoche?» sin llamar a la empresa, y cuando la empresa decide con una pantalla qué ve cada cliente (Ley 21.719).

## 2. Entidades y relaciones

| Entidad | Qué es | Se relaciona con | Dónde vive |
|---|---|---|---|
| Contacto del cliente | Persona de la empresa cliente con usuario propio: membresía con rol `viewer` y el portal `cliente` como único portal | Usuario, empresa (tenant) | Núcleo (`core.memberships`) |
| **Acceso** | Vínculo del contacto con UNA cuenta cliente y con las instalaciones que puede ver | Membresía, cuenta, contacto (opcional), instalaciones | Módulo (`portal_cliente.accesos`, `portal_cliente.acceso_instalaciones`) |
| **Configuración del portal** | Qué ve el cliente por defecto en cada cuenta: tipos de documento, secciones, datos de los guardias, listas, destinatarios del informe | Cuenta | Módulo (`portal_cliente.config_cuentas`) |
| Cuenta / Instalación / Contacto | Maestros del cliente | — | Núcleo (maestros) |

Una cuenta tiene muchos contactos con acceso; un contacto tiene un acceso por empresa (selector de varias empresas cliente: **decide Carlos**, no se construye). Un contacto con instalaciones limitadas es el caso normal.

## 3. Pantallas

| Pantalla (diseño) | Ruta | Portal | Patrón | PR |
|---|---|---|---|---|
| 01 Resumen del mes (= informe mensual) | `/cliente` | Cliente | Tablero de tarjetas por instalación | **PR 1** (instalaciones habilitadas; secciones sin datos, vacío honesto) |
| 12 Configuración Portal Cliente | `/configuracion/portal-cliente` | ERP | Formulario por tarjetas | **PR 1** |
| Gestión de accesos del portal | `/clientes/<cuenta>/portal` (pestaña propia, archivos nuevos) | ERP | Lista + hoja | **PR 1** |
| 10 Documentos y protocolos | `/cliente/documentos` | Cliente | Lista | PR 2 (depende de Personas y Cargos #165 y de la lectura auditada de documentos de personas) |
| 02 Cobertura y marcaciones, 05 Supervisión, 04 Libro de novedades, 06 Control de accesos, 08 Cotizaciones, 13 Prospecto | varias | Cliente | — | **PENDIENTE (PR 2)** por dependencias (§10) |
| 03 Rondas, 09 Reportes, 11 Solicitudes | varias | Cliente | — | PR 2 (Rondas backend existe, pero la ejecución en terreno aún no) |

Mobile first (375 → 1024 → 1280, claro y oscuro). Barra inferior en celular y lateral en escritorio con «Cliente» bajo «OPAI» (NAVEGACION §4).

## 4. Campos y validaciones

**Acceso:** membresía (obligatoria, activa, rol viewer con portal único `cliente`), cuenta (obligatoria, no archivada), contacto (opcional, de la misma cuenta), `todasInstalaciones` (por defecto falso), instalaciones (de la misma cuenta), estado (`activo`, `suspendido`, `revocado`).

**Configuración por cuenta:** tipos de documento visibles (lista de códigos del tenant; nunca remuneraciones, salud ni finiquitos), secciones visibles (cobertura, rondas, novedades, supervisión, accesos, documentos), foto y RUT de los guardias (sí/no, por defecto sí), RUT en reportes descargables (`omitido` por defecto), el cliente gestiona sus listas (sí), destinatarios del informe mensual (correos válidos, hasta 20).

## 5. Reglas de negocio

- **R1. El alcance es fail-closed.** Sin un acceso `activo` el contacto no ve nada: ni cuenta, ni instalaciones, ni configuración. Suspender o revocar corta el acceso al instante. Sin instalaciones habilitadas tampoco ve ninguna.
- **R2. Solo su cuenta.** Un contacto ve exclusivamente las instalaciones de su cuenta que su acceso habilita (o todas las de la cuenta si `todasInstalaciones`). Una instalación de otra cuenta de la misma empresa, o de otra empresa, nunca aparece, aunque su id se conozca. La base lo impide además de la capacidad (trigger).
- **R3. Instalaciones operativas.** Solo se muestran instalaciones `activa` y sin archivar. Un prospecto sin instalaciones ve solo sus cotizaciones (**PENDIENTE PR 2**).
- **R4. Ve la cobertura, no el costo (A10).** Ninguna pantalla del portal muestra costos, márgenes, tarifas internas ni anomalías internas de rondas. La excepción decidida: el precio de su cotización vigente cuando pide algo fuera de la pauta (**PENDIENTE PR 2**).
- **R5. El resumen del mes ES el informe mensual (B14).** La misma vista en pantalla y en su descarga. Una sección cuya fuente de datos aún no existe se muestra «pendiente», **nunca con una cifra inventada**.
- **R6. Datos de los guardias (Ley 21.719).** El cliente ve nombre, foto y RUT solo de los guardias asignados a sus instalaciones y solo dentro del portal; sin descarga ni exportación. Nunca coordenadas, teléfono, dirección, salud ni remuneraciones. Los Excel de reportes omiten el RUT salvo que el tenant lo incluya (decide Carlos).
- **R7. Documentos.** El cliente ve solo los tipos que el tenant marcó, de los guardias de sus instalaciones. Liquidaciones, salud y finiquitos no pueden marcarse (la capacidad lo rechaza).
- **R8. Quién configura.** Solo owner, admin y gerente (permiso `portal_cliente:config.manage` y `accesos.manage`); un supervisor no. Los cambios aplican a todos los contactos de la cuenta.
- **R9. Quién es un contacto.** Solo se vincula a un usuario invitado con rol viewer y el portal `cliente` como único portal. Un usuario interno no puede recibir acceso de cliente, ni un contacto de cliente recibir portales internos (coherencia rol-portal, NÚCLEO-D1, relajada solo para este caso).
- **R10. Permisos mínimos.** Al vincularlo, el contacto recibe un rol sistema «Contacto del cliente» con solo `portal_cliente:read`: nunca el `*:read` de viewer. Aunque falle una capa, el alcance por filas del contacto se acota igual (defensa en profundidad).
- **R11. Aceptar la cotización en línea y comentar una novedad** (decididos que sí por Carlos): **PENDIENTE PR 2** con CPQ (#147) y el libro de novedades (CAR-77).

## 6. Estados y transiciones

| Desde | Hacia | Quién | Efecto | Reversible |
|---|---|---|---|---|
| (sin acceso) | `activo` | owner, admin, gerente; agente con aprobación humana | El contacto entra y ve sus instalaciones | Sí |
| `activo` | `suspendido` | ídem | Corta el acceso al instante | Sí |
| `suspendido` | `activo` | ídem | Restablece | Sí |
| `activo` / `suspendido` | `revocado` | ídem | Cierra el vínculo | No: se vincula de nuevo |

## 7. Permisos por rol y portal

| Acción | owner | admin | gerente | supervisor | viewer | Contacto del cliente | Agente |
|---|---|---|---|---|---|---|---|
| Ver y editar la configuración | sí | sí | sí | no | solo ver | no | `portal_cliente` (aprobación humana al vincular y cambiar accesos) |
| Ver, vincular y editar accesos | sí | sí | sí | no | solo ver | no | ídem |
| Usar el portal (`portal_cliente:read`) | — | — | — | — | — | sí, solo su cuenta | no (PR 1) |

Alcance de filas: lo aplica la consulta (ADR-022), nunca la pantalla.

## 8. Eventos

`portal_cliente.acceso.vinculado`, `portal_cliente.acceso.actualizado`, `portal_cliente.config.actualizada`. Silencio por defecto (ADR-020): no hay correo ni WhatsApp en este PR. El informe mensual por correo (B14) es **propuesta pendiente de Carlos**.

## 9. Herramientas MCP

| Herramienta | Qué hace | Tipo | Vista previa | Aprobación |
|---|---|---|---|---|
| `portal_cliente_accesos_listar` | Contactos de una cuenta con acceso, estado e instalaciones | Lectura (auditada) | — | — |
| `portal_cliente_accesos_candidatos` | Usuarios invitados solo al portal cliente sin vincular | Lectura (auditada) | — | — |
| `portal_cliente_accesos_vincular` | Vincula un contacto a una cuenta e instalaciones | Irreversible para agentes | `preview_…` | Humana |
| `portal_cliente_accesos_actualizar` | Suspende, reactiva, revoca o cambia instalaciones | Irreversible para agentes | `preview_…` | Humana |
| `portal_cliente_config_leer` / `_actualizar` | Lee y cambia la configuración por cuenta | Lectura / escritura | `preview_…` | — |
| `portal_cliente_mi_acceso`, `portal_cliente_resumen_leer` | El contacto ve su cuenta y su resumen | Lectura (portal cliente) | — | — |

## 10. Dependencias e integraciones (verificadas en `main` 17f868f, 30-oct-2026)

No están en `main`: marcaciones de Asistencia (CAR-89), libro de novedades (CAR-77), supervisión (CAR-83), control de acceso operativo y CPQ (#147). Por eso 02, 04, 05, 06, 08, 13 y la aceptación en línea quedan **PENDIENTES (PR 2)**. Sin integraciones externas ni credenciales.

## 11. Hoja de alcance respecto de 1.0 (el piso)

| En 1.0 | En 2.0 | Por qué |
|---|---|---|
| El cliente entra con un perfil propio y ve sus instalaciones | Acceso por contacto, con cuenta + instalaciones habilitadas, fail-closed | Falta el vínculo usuario-cliente ↔ cuenta/instalaciones |
| Informe mensual aparte | El resumen del mes ES el informe | Decisión de Carlos, B14 |
| Datos de guardias sin gobierno por tenant | Nombre, foto y RUT con finalidad y base (Ley 21.719), configurables | Ley 21.719 |
| Lo demás de 1.0 (marcaciones, novedades, accesos) | PR 2, cuando existan sus fuentes | Dependencias |

**No se porta:** costos y márgenes en el portal; chat; el selector de varias empresas queda como decisión abierta.

## Historial

- 30-oct-2026 — versión inicial (Claude), PR 1 de CAR-88.
