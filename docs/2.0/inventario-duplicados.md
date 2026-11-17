# Inventario de duplicados · configuración, pantallas y acciones

Revisión del 16-nov-2026 (CAR-580). Fuente viva: los tests `packages/capabilities/test/ajustes-duplicados.test.ts` y `apps/web/test/rutas-pantalla-duplicadas.test.ts`.

## 1. Ajustes registrados

Origen: `listarAjustes()` — núcleo (`packages/capabilities/src/core/config/*.ts`) más el `configuracion` de cada manifest en `modules/*` y los `ajustes.ts` en `packages/capabilities/src/<módulo>/`.

| Módulo | Cantidad | Ubicación principal |
| --- | ---: | --- |
| `core` | 50 | Empresa, cumplimiento, comunicaciones, terreno, navegación, preferencias (usuario), plataforma |
| `finanzas` | 14 | `packages/capabilities/src/finanzas/ajustes.ts` |
| `comercial` | 5 | `packages/capabilities/src/comercial/ajustes.ts` |
| `asistencia` | 11 | `modules/asistencia/capabilities/ajustes.ts` |
| `nomina` | 10 | `packages/capabilities/src/nomina/ajustes.ts` |
| `rendiciones` | 11 | `modules/rendiciones/capabilities/ajustes.ts` |
| `cpq` | 7 | manifest CPQ |
| `rondas` | 8 | `packages/capabilities/src/rondas/ajustes.ts` |
| `pauta` | 3 | `packages/capabilities/src/pauta/ajustes.ts` |
| `desempeno` | 2 | `packages/capabilities/src/desempeno/ajustes.ts` |
| `portal_cliente` | 1 | `packages/capabilities/src/portal-cliente/ajustes.ts` |
| `agente` | 2 | `modules/agente/manifest.ts` |

Ajustes de **plataforma** (ámbito `plataforma` en el catálogo): IMM, modelos de IA, DPA, biometría global, integraciones restringidas. Pantalla: `/platform/ajustes/*`.

**Total declarado al cierre de esta revisión:** 123 campos (CAR-581).

### Hallazgo y resolución (ajustes)

| Concepto | Dónde estaba | Dueño | Acción |
| --- | --- | --- | --- |
| Día de cierre del mes | `nomina.dia_cierre` y `desempeno.dia_cierre` (misma clave y etiqueta) | Dos dueños legítimos, conceptos distintos | Renombrado a `desempeno.dia_cierre_mes` con etiquetas distintas; migración SQL copia valores guardados (`20271116143000_desempeno_dia_cierre_mes`) |

## 2. Portada y secciones de Configuración

- **Portada:** `apps/web/app/(erp)/configuracion/page.tsx` — grupos en `_centro/grupos.ts`, entradas en `_centro/secciones.ts`, módulos con ajustes vía `cargarIndice()` en `_centro/datos.ts`.
- **Empresa:** datos, marca, cumplimiento, comunicaciones, correos de clientes, facturación electrónica, folios (rutas bajo `/finanzas/*` o `/configuracion/*`).
- **Módulos (pestañas):** registro `SECCIONES_MODULO` en `_centro/secciones-modulos.ts` (embudo y catálogos Comercial, flujo Finanzas, etc.).
- **Enlaces externos al menú:** `SECCIONES_FINANZAS` y `SECCIONES_OPERACION` apuntan a pantallas de trabajo que viven fuera de `/configuracion` por diseño (CAR-182); no duplican el componente, solo enlazan.

## 3. Pantallas y rutas

Aliases declarados (`apps/web/lib/rutas-alias-pantalla.ts`): API keys → Agentes, preferencias → Mi cuenta, plan de cuentas → Configuración › Finanzas, altas legacy (`/personas/nueva`, etc.), redirecciones de `next.config.ts`.

Paridad entre portales (misma UI ERP/supervisor): rendiciones; catch-alls `/:ruta...` por portal.

**Sin duplicado de componente pendiente** tras excluir aliases y paridad de portales (test en verde).

## 4. Acciones (capacidades)

Inventario de paridad pantalla ↔ MCP: `docs/2.0/paridad/mcp-inventario.md`, gate `paridad-inventario.test.ts`. No se encontraron IDs de capacidad repetidos en el registro.

Datos de configuración que **no** son ajustes del catálogo (tablas o capacidades propias): flujo de caja (`finanzas.flujo_ajustes`), embudo y catálogos comerciales (`comercial.config.*`), marca CPQ vs marca empresa (CPQ enlaza a `/configuracion/marca` para logos), **Control de acceso** (`acceso.configuraciones` + capacidades `acceso.config.*`, empresa e instalación — CAR-630; no duplicar en ajustes del núcleo).

## 5. Decisiones resueltas (CAR-581)

| Tema | Dueño | Acción |
| --- | --- | --- |
| Correo comercial | `perfil_empresa.correo_comercial` (Datos de la empresa) | Se retiran los CCO comerciales del núcleo; migración SQL desde `core.ajustes`. Cotizaciones y CPQ ya leían el perfil. |
| Copias ocultas en avisos | `core.notificaciones_correo_*` | Defecto más overrides por área (comercial, finanzas, operaciones). UI en Configuración › Usuarios y permisos; el consumidor añade BCC en avisos (no en transaccionales). |
| Marca documental (tipografía, pie, condiciones) | `perfil_empresa` + `core.marca.*` | Migra desde `cpq.marca_documento`; UI en Configuración › Marca. CPQ mantiene `cpq.marca_documento.*` como delegado MCP y versiones de PDF. |
| Flujo de caja vs cobranza/facturación | Dos capas | `finanzas.flujo_ajustes` (planilla) vs ajustes manifest Finanzas (cobranza). Ayudas actualizadas en Configuración › Finanzas › Flujo de caja y en el módulo. |
| Geocerca asistencia vs rondas | Dos módulos | Asistencia: defecto 100 m en marcas. Rondas: 15 m en puntos (`RADIO_GEOCERCA_M`). Etiquetas de ayuda distinguen ambos usos. |

### Resuelto (acceso)

| Concepto | Dónde estaba | Dueño | Acción |
| --- | --- | --- | --- |
| Configuración de Control de acceso (tipos, fuera de lista, etc.) | PR #963 (ajustes núcleo) y PR #917 (`acceso.configuraciones`) | Tabla `acceso.configuraciones` + `acceso.config.get/set` (#917, R1) | #963 cerrado; decisión en CAR-479 (CAR-630) |

## 6. Regla CI

- `ajustes-duplicados.test.ts`: falla si la misma `clave` o la misma etiqueta normalizada aparece en más de un módulo.
- `rutas-pantalla-duplicadas.test.ts`: falla si dos rutas montan la misma pantalla sin estar en `RUTAS_ALIAS_PANTALLA` o `PANTALLAS_PARIDAD_PORTAL`.