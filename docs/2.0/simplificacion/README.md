# Informe de simplificación del código — 14-nov-2026

**Sesión:** Sesión Estándares · **Ticket:** CAR-432 · **Regla:** `AGENTS.md` § «Código simple» (ADR-115) · **Medido sobre** `main` `3f9eda7` con `pnpm simplicidad --detalle` (knip 6.45 y jscpd 5.4; fuera quedan pruebas, e2e, generados y `docs/`).

Revisión general, hecha una sola vez. El detalle completo, hallazgo por hallazgo, está en [`detalle-2026-11-14.md`](detalle-2026-11-14.md). Desde ahora las cifras las cuida el check `simplicidad` en cada PR y la pasada semanal.

## Resumen

| # | Grupo | Cifra hoy | Beneficio | Riesgo | Ticket |
|---|---|---|---|---|---|
| 1 | Archivos sin uso y una prueba que no corre | 6 archivos | Alto | Muy bajo | CAR-436 |
| 2 | Dependencias sin uso | 35 | Medio | Bajo | CAR-437 |
| 3 | Exportaciones sin uso | 567 | Alto | Bajo a medio | CAR-438 |
| 4 | Código duplicado | 3.620 líneas en 390 bloques (1,4 %) | Alto | Medio | CAR-439 |
| 5 | Sobrecomplicado: funciones y archivos largos | 681 funciones, 38 archivos | Medio | Medio a alto | CAR-440 |

El orden es el de trabajo: primero lo que más limpia con menos riesgo. Tamaño medido: 3.657 archivos y 265.485 líneas de código.

## Método (igual para todos los grupos)

1. Un tema por PR, chico, sin cambiar el comportamiento.
2. Las pruebas existentes quedan en verde. Si la parte no tiene pruebas, el primer commit las escribe y fija el comportamiento actual; el segundo simplifica.
3. No se toca un archivo que otra sesión tenga en un PR abierto: se anota en el ticket y se espera, o se coordina por Linear con la sesión dueña.
4. Cada PR baja `simplicidad-base.json` con `pnpm simplicidad --actualizar`.
5. Se integra con la regla vigente: checks en verde, revisión final sin bloqueos y snapshot si hubiera migración (no debería).

## 1 · Archivos sin uso y una prueba que no corre (CAR-436)

Nadie los importa (verificado con knip y con búsqueda de texto en todo el repo):

- `apps/web/app/(erp)/cotizaciones/_componentes/semaforo-margen-cpq.tsx`
- `apps/web/app/(erp)/finanzas/ventas/_componentes/lista-ventas.tsx` y `acciones-fila-borrador.tsx`: la página usa `lista-ventas-maestro`; estos dos solo se referencian entre sí.
- `packages/capabilities/src/comercial/importar-1-0-esquemas.ts`
- `packages/capabilities/src/pauta/marcas-proveedor.ts`

Y un hallazgo de calidad: `apps/web/app/(erp)/finanzas/folios/_componentes/etiquetas-dte.test.ts` es una prueba que **nunca se ejecuta**, porque Vitest de `apps/web` solo incluye `test/**/*.test.ts`. Se mueve a `apps/web/test/` para que corra.

**Beneficio:** menos código que leer y mantener, y una prueba que vuelve a proteger. **Riesgo:** muy bajo; typecheck y build fallarían si algo los usara.

## 2 · Dependencias sin uso (CAR-437)

- **32 en 13 módulos y en `packages/testing`:** `@opai/db`, `@opai/ds`, `@opai/domain` y `zod` declaradas sin que el paquete las importe. Origen: la plantilla de `pnpm scaffold:module` (`scripts/templates/module/package.json`) las agrega todas «por si acaso». Se corrige la plantilla en el mismo PR.
- **`@fontsource/inter` y `@fontsource/jetbrains-mono`** en `modules/cpq`: ningún archivo las referencia.
- **`vitest`** en `modules/portal_cliente`: el módulo no tiene pruebas ni configuración de Vitest.

Ya resueltos como falsos positivos en `knip.jsonc`: `@prisma/client` (lo usa el cliente generado) y `tailwindcss` en el DS (se importa desde CSS).

**Beneficio:** el `package.json` de cada módulo dice la verdad sobre de qué depende (importa para la regla «los módulos solo importan lo declarado»). **Riesgo:** bajo; lo cubren typecheck, pruebas y build.

## 3 · Exportaciones sin uso (CAR-438)

567 valores y tipos exportados que nadie importa.

| Área | Cantidad |
|---|---|
| `capabilities · core` | 136 |
| `modules/cpq` | 57 |
| `packages/db` | 57 |
| `capabilities · finanzas` | 31 |
| `modules/rendiciones` | 24 |
| `capabilities · comercial` | 22 |
| `apps/web · app/_components` | 21 |
| `apps/web · erp/configuracion` | 21 |
| `modules/finanzas` | 15 |
| `modules/asistencia` | 14 |
| `apps/web · erp/finanzas` | 13 |
| `apps/web · erp/personas` | 12 |
| `modules/agente` | 11 |
| `packages/integrations` | 9 |
| resto | 124 |

Son de dos clases, y se tratan distinto:

- **Se usa solo dentro de su archivo:** se quita la palabra `export`. Cero riesgo.
- **No se usa en ningún lado:** se borra con su código. Aquí está la limpieza real; hay que confirmar que no lo llame una ruta por texto, un registro dinámico o un script manual.

Incluye 8 alias marcados `@deprecated` «conservados para pruebas» (`sii-validacion.ts`, `cobros.ts`, `estructuras-conceptos.ts` y el importador de OPAI 1.0): se migran las pruebas al nombre nuevo y se borran.

**Orden sugerido:** `packages/db` y `packages/integrations` (pocas sesiones los tocan) → capacidades del núcleo → módulos, cada uno coordinado con su sesión.

## 4 · Código duplicado (CAR-439)

390 bloques de 50 tokens o más; 3.620 líneas. Se concentra en capacidades (1.311 líneas) y pantallas (1.065).

| Caso | Líneas | Qué hacer |
|---|---|---|
| `core/crm/contactos-cuentas.ts` ≈ `contactos-desvincular.ts` | 58 | Una función compartida en el mismo módulo |
| Componentes de «generar documento» de Personas ≈ los genéricos de `_components/documentos/generar-entidad/` | 56 | Personas usa los genéricos |
| Tipos copiados entre `apps/web/lib` y módulos (`instrumentos-valores`, `aprobaciones-cpq`, `tipos-maestros`, pauta) | 79 | Importar el tipo desde su dueño |
| Rutas `api/terreno/*` y layouts de portales con el mismo encabezado | 66 | Un helper por familia |
| `iconos.ts`: un bloque repetido dentro del mismo archivo | 30 | Borrar la copia |
| Logo en PDF: `modules/cpq/persistencia/pdf/logo.ts` ≈ `capabilities/src/finanzas/ventas-pdf-logo.ts` | 28 | Una sola en el paquete compartido |
| `lista-maestro.tsx` ≈ `lista-maestro-split.tsx` | 26 | Extraer lo común |
| Esquemas Zod repetidos entre Tickets, Finanzas y `core/maestros/comun.ts` | 34 | Reusar los de `comun.ts` |
| `ventas-cesion-ceder.ts` ≈ `ventas-cesion-simular.ts` | 16 | Simular reutiliza la preparación de ceder |
| Semillas de e2e (`packages/auth/scripts`, `packages/db/scripts`) | ~300 | Un helper de preparación |

El resto son bloques de 6 a 14 líneas, la mayoría formularios de Configuración con la misma estructura; se revisan en la pasada semanal, sin forzar abstracciones (regla 3: nada «por si acaso»).

**Beneficio:** un arreglo se hace una vez y no en dos copias que se desalinean. **Riesgo:** medio; unir dos copias puede cambiar un caso borde, por eso va con prueba antes.

## 5 · Sobrecomplicado: funciones y archivos largos (CAR-440)

- **681 funciones de más de 60 líneas:** 449 son componentes de pantalla (formularios y hojas con todo en una función) y 232 son lógica.
- **38 archivos de más de 150 líneas;** en el repo hay 17 archivos con una excepción `eslint-disable max-lines` escrita a mano. El mayor es `packages/db/scripts/importar-opai1/aplicar.ts` (509 líneas).

Lógica más larga (primero estas, porque una función larga de lógica esconde errores):

- `packages/capabilities/src/core/maestros/estructuras-panel-datos.ts:10` (134 líneas)
- `packages/db/scripts/importar-opai1/contactos.ts:59` (134 líneas)
- `packages/db/src/plataforma-empresa.ts:30` (134 líneas)
- `packages/integrations/src/geo/google.ts:18` (134 líneas)
- `apps/web/app/_components/agente/use-historial.ts:22` (130 líneas)
- `packages/capabilities/src/core/terreno/rondas-ejecucion.ts:34` (129 líneas)
- `packages/capabilities/src/testing/db-memoria.ts:34` (128 líneas)
- `apps/web/app/_components/agente/use-agente.ts:20` (126 líneas)
- `packages/db/src/presupuesto.ts:17` (124 líneas)
- `packages/capabilities/src/comercial/importar-1-0-handler.ts:26` (123 líneas)
- `packages/db/scripts/seed-maestros-demo.ts:15` (122 líneas)
- `packages/capabilities/src/finanzas/apertura-aplicar.ts:13` (120 líneas)
- `packages/capabilities/src/finanzas/ventas-programacion-generar-nucleo.ts:28` (120 líneas)
- `packages/integrations/src/ia/anthropic-continuidad.ts:36` (119 líneas)
- `apps/web/app/(erp)/negocios/_componentes/tablero/use-arrastre-tactil.ts:8` (116 líneas)

Por área:

| Área | Cantidad |
|---|---|
| `apps/web · erp/configuracion` | 83 |
| `apps/web · app/_components` | 59 |
| `capabilities · core` | 57 |
| `apps/web · erp/finanzas` | 54 |
| `packages/ds` | 37 |
| `apps/web · erp/personas` | 28 |
| `apps/web · erp/cotizaciones` | 24 |
| `apps/web · erp/negocios` | 23 |
| `modules/cpq` | 23 |
| `apps/web · platform/platform` | 22 |
| `packages/db` | 21 |
| `apps/web · erp/instalaciones` | 20 |
| resto | 230 |

**Beneficio:** medio; el código queda más fácil de probar y revisar. **Riesgo:** medio a alto, porque dividir cambia estructura. Por eso va al final, de a una función por PR y con prueba primero. El importador de OPAI 1.0 se deja para cuando termine la migración de Gard: es código que se va a eliminar.

## Archivos con hallazgos que hoy están en un PR abierto

No se tocan hasta que ese PR se integre:

- `apps/web/app/(erp)/configuracion/integraciones/slack/_componentes/form-slack.tsx` (#569)
- `apps/web/app/(erp)/configuracion/integraciones/slack/_componentes/seccion-personas.tsx` (#569)
- `apps/web/app/(erp)/configuracion/usuarios/editar-usuario.tsx` (#765)
- `apps/web/app/(erp)/finanzas/_hoy/hoy.tsx` (#772)
- `apps/web/app/(erp)/mi-cuenta/_seguridad/metodos-acceso.tsx` (#765)
- `apps/web/app/(erp)/personas/_componentes/estado-ficha.ts` (#767)
- `apps/web/app/(erp)/personas/_componentes/lecturas-ficha.ts` (#767)
- `apps/web/app/(erp)/personas/_componentes/seccion-jornada-dt.tsx` (#767)
- `apps/web/app/(erp)/personas/_componentes/tarjetas-resumen.tsx` (#767)
- `apps/web/app/(platform)/platform/tenants/[id]/administradores-tab.tsx` (#572)
- `apps/web/app/(platform)/platform/tenants/[id]/pagina-tenant.tsx` (#572)
- `apps/web/app/(trabajador)/trabajador/_componentes/formulario-avisos.tsx` (#715)
- `apps/web/app/_components/hilo/marco-hilo.tsx` (#728, #730)
- `apps/web/app/_components/marco-shell.tsx` (#728, #730)
- `apps/web/app/_components/menu-cuenta-shell.ts` (#728, #730)
- `apps/web/lib/existencia-ruta.ts` (#736)
- `modules/asistencia/capabilities/registrar.ts` (#569)
- `packages/capabilities/src/core/comunicaciones/consumidor.ts` (#569)
- `packages/capabilities/src/core/index.ts` (#569, #572)
- `packages/capabilities/src/core/maestros/personas-laboral-escritura.ts` (#767)
- `packages/capabilities/src/core/maestros/personas-laboral-vista.ts` (#767)
- `packages/capabilities/src/core/slack/mensaje-directo.ts` (#569)
- `packages/capabilities/src/core/slack/vinculo-trabajos.ts` (#569)
- `packages/capabilities/src/core/slack/vinculo.ts` (#569)
- `packages/capabilities/src/finanzas/index.ts` (#772)
- `packages/capabilities/src/testing/db-memoria.ts` (#569)
- `packages/capabilities/src/testing/plataforma-memoria.ts` (#572)
- `packages/db/scripts/seed-e2e.ts` (#765)
- `packages/db/src/identidad.ts` (#765)
- `packages/db/src/plataforma-aprobaciones.ts` (#572)
- `packages/ds/src/shell/nuevo/shell-nuevo.tsx` (#737)
- `packages/integrations/src/slack/api.ts` (#569)

## Pasada semanal

Cada semana la Sesión Estándares corre `pnpm simplicidad --detalle`, compara con este informe, abre los PR chicos que correspondan y actualiza los tickets CAR-436 a CAR-440. Resultado esperado: las seis cifras de `simplicidad-base.json` solo bajan.
