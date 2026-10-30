# DESIGN PROMPT — Centro de Configuración 2.0: portada por tarjetas

> **Para pegar en Claude Design:** Usa exclusivamente el design system de OPAI 2.0 (proyecto DS V2 `44e4d7b9`), sus tokens y componentes; nada del estilo de OPAI 1.0. Entrega cada pantalla en escritorio a 1280 px, iPad a 1024 px y teléfono a 375 px, en claro y oscuro.

**Proyecto:** OPAI 2.0 · **Design system:** DS 2.0 (proyecto DS V2 `44e4d7b9`). Usa solo sus tokens y componentes (`Card`, `FilaSeleccionable`, `CommandPalette`, `Tabs` por ruta, `Badge`, `Alerta`, `EmptyState`, `Sheet`, `SplitScreen`). **Nada del estilo de OPAI 1.0.** Claro y oscuro. Todo en español de Chile.
**Base:** origin/main `ddeba7ac` (30-oct-2026). Aprobado por Carlos el 30-oct-2026, 00:53 CLT.

## 1. Problema
Hoy `/configuracion` es un índice largo de unas 20 filas en 5 grupos (Empresa, Operaciones, Acceso, Plataforma y Módulos activos) a la izquierda y «Elige un ajuste» a la derecha. Cada módulo nuevo suma filas. Hay que hacerlo **intuitivo y simple**: el usuario reconoce dónde está algo en un solo vistazo.

## 2. Inventario actual (origin/main)
| # | Entrada (ruta) | Grupo hoy | Permiso |
|---|---|---|---|
| 1 | Datos de la empresa `/configuracion/empresa` | Empresa | tenantRead |
| 2 | Marca `/configuracion/marca` | Empresa | tenantRead |
| 3 | Datos personales `/configuracion/cumplimiento` (+ `/solicitudes`, `/incidentes`, `/retencion`) | Empresa | cumplimientoRead |
| 4 | Preferencias `/configuracion/preferencias` (las mías) → **sale al menú de usuario** | Empresa | ninguno |
| 5 | Patrones y funciones `/configuracion/operaciones` | Operaciones | patronesRead |
| 6 | Calendario `/configuracion/calendario` (feriados, #139) | Operaciones | calendarioRead |
| 7 | Usuarios y permisos `/configuracion/usuarios` (+ pestaña Roles `/usuarios/roles`) | Acceso | usersRead |
| 8 | Agentes y API keys `/configuracion/agentes` (+ `/[id]`, `/conectar`; `/api-keys`) | Acceso | apikeysManage |
| 9 | Aprobaciones pendientes `/configuracion/aprobaciones` | Acceso | aprobacionesManage |
| 10 | Módulos `/configuracion/modulos` | Plataforma | tenantRead |
| 11 | Integraciones `/configuracion/integraciones` (+ `/[proveedor]`) | Plataforma | integracionesManage |
| 12 | Comunicaciones `/configuracion/comunicaciones` (+ `/[evento]`) | Plataforma | comunicacionesManage |
| 13 | Documentos `/configuracion/documentos` | Plataforma | documentosManage |
| 14 | Consumos `/configuracion/consumos` | Plataforma | consumosRead |
| 15 | Auditoría `/configuracion/auditoria` | Plataforma | auditRead |
| 16+ | Un módulo activo con ajustes `/configuracion/modulo/[id]` (hoy Comercial: Embudo, Catálogos, Ajustes) | Módulos activos | según módulo |

**En camino:** Rondas (#141) suma la pestaña «Tipos de incidente» dentro de `/configuracion/modulo/rondas` (no una fila nueva). Firma (#140) aún no trae pantalla de configuración; cuando la tenga, entra en su grupo. Calendario ya está en main.

## 3. Agrupación propuesta (máx. 7 por grupo)
| Grupo (tarjeta) | Entradas | Total |
|---|---|---|
| **Empresa** | Datos de la empresa · Marca · Datos personales · Comunicaciones | 4 |
| **Operación** | Patrones y funciones · Calendario · Documentos | 3 |
| **Personas y acceso** | Usuarios y permisos (pestañas Usuarios / Roles) | 1 |
| **Agentes** | Agentes y API keys (incluye «Conectar tu IA») · Aprobaciones pendientes | 2 |
| **Módulos** | Catálogo de módulos · una entrada por módulo activo con ajustes (Comercial, Rondas, …) | 1 + N |
| **Uso y registros** | Integraciones · Consumos · Auditoría | 3 |

**Preferencias** (las mías: tema, idioma, notificaciones) **sale de Configuración** y va al menú de usuario (avatar y correo abajo a la izquierda), junto a «Mi cuenta». Diseñar ese menú con la entrada nueva (decisión de Carlos, 30-oct-2026 00:55 CLT).

**Módulos con más de 7 entradas:** la tarjeta Módulos abre su propia lista con todos los módulos (con buscador si hace falta); no se divide en dos grupos.

Subpáginas internas (solicitudes, incidentes, retención, roles, detalle de agente, proveedor, evento) son **pestañas por ruta** de su entrada, no entradas.

## 4. Pantallas a diseñar
Cada una a **1280 (escritorio), 1024 (iPad, barra lateral completa, D9) y 375 (teléfono)**, en claro y oscuro.

### 4.1 Portada `/configuracion`
- Título «Configuración» y, arriba, **buscador de ajustes** ancho completo («Busca un ajuste: feriados, logo, API key…»), que usa `core.config.buscar` y muestra resultados agrupados por tarjeta con la ruta («Operación › Calendario»). Atajo ⌘K visible en escritorio.
- **Grilla de tarjetas** (3 columnas en 1280, 2 en 1024, 1 en 375). Cada tarjeta: ícono, nombre del grupo, línea corta («Feriados, patrones y documentos»), las 2–3 primeras entradas como texto secundario y el total («3 ajustes»). Toda la tarjeta es tocable (≥ 44 px).
- **Aviso de aprobaciones**: si hay pendientes, `Alerta` warning sobre la grilla («2 aprobaciones de agentes esperan tu revisión · Revisar»). Sin contadores en las tarjetas.
- En teléfono, las tarjetas pasan a filas compactas (`FilaSeleccionable` con ícono, nombre y línea corta).

### 4.2 Subpágina de grupo `/configuracion/<grupo>`
- Migas «Configuración › Operación», título del grupo.
- Escritorio/iPad: `SplitScreen` con la lista de entradas del grupo (máx. 7) a la izquierda y la entrada elegida a la derecha; la primera queda abierta por defecto. Teléfono: lista → pantalla de la entrada con «atrás».
- Grupo **Módulos**: si hay más de 7, lista completa propia (no se divide); primero «Catálogo de módulos» (contratados, en trial, disponibles), después cada módulo activo; al abrirlo, pestañas del módulo (p. ej. Rondas: Tipos de incidente · Ajustes).
- Mostrar un ejemplo lleno: Operación › Calendario.

### 4.3 Estados
- **Vacío del buscador**: «No encontramos “xyz”. Prueba con otra palabra» + enlaces a los grupos.
- **Grupo sin entradas visibles**: la tarjeta no aparece (nunca deshabilitada, ADR-041.5).
- **Módulos sin módulos activos**: «Aún no tienes módulos con ajustes» + «Ver catálogo».
- **Sin aprobaciones**: no se muestra el aviso.
- Carga (esqueleto de tarjetas), error y 404 de una ruta de grupo inexistente, con shell.

### 4.4 Permisos (mostrar 3 portadas lado a lado a 1280)
- **Owner/Admin**: las 6 tarjetas (Empresa, Operación, Personas y acceso, Agentes, Módulos, Uso y registros).
- **Supervisor**: ve solo lo que su rol puede leer (p. ej. Operación con Patrones y Calendario); **nunca** Agentes, Integraciones ni Consumos.
- **Visualizador (viewer)**: solo lo que su rol puede leer, sin botones de guardar; **nunca** Agentes, Integraciones ni Consumos.
- Regla: una tarjeta aparece si el rol puede leer al menos una de sus entradas; una entrada sin permiso no aparece. Lo que solo usa OPAI vive en `/platform` y nunca se muestra aquí.

## 5. Entregables
Pantallas numeradas `NN_Nombre_ancho` (portada ×3 anchos ×2 temas, grupo ×3 anchos, Módulos, estados vacíos, comparación de roles), más una lámina de componentes nuevos (`TarjetaGrupo`, resultado del buscador de ajustes) con sus estados (reposo, hover, foco, presionado).
