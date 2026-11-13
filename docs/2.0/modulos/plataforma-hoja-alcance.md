# Plataforma — hoja de alcance

**Sesión 6 · CAR-187 · 4-nov-2026 · para aprobación de Carlos.** Diagnóstico verificado en el código de `main` (`7f9a8f9`) y recorriendo `test.opai.cl/platform` con la cuenta de plataforma (escritorio, 1333 px). Plataforma es el portal del equipo OPAI: empresas, módulos, usuarios, precios, uso y operación. No hay versión 1.0 que portar; el piso es lo que existe hoy en 2.0.

## 1. Qué funciona hoy

| Área | Pantalla | Capacidades (MCP) |
|---|---|---|
| Empresas: lista con búsqueda y filtros, ficha con resumen | `/platform`, `/platform/tenants/[id]` | `platform.tenants.list`, `.get`, `.panel` |
| Alta de empresa con primer owner (invitación por correo) | `/platform/tenants/nuevo` | `platform.tenants.create` |
| Estado de la empresa (activar, prueba, suspender, con confirmación al suspender) | menú ⋯ de la ficha | `platform.tenants.set_estado` |
| Módulos: activar, suspender, en prueba; valida dependencias en ambos sentidos | pestaña Módulos | `platform.modules.set` |
| Invitar owner o admin | pestaña Usuarios | `platform.admins.invite` |
| Consumos por recurso y empresa | pestaña Consumos, `/platform/consumos` | `platform.consumos.summary`, `.panel` |
| Trabajos: lista global y por empresa, reintentar y descartar | `/platform/trabajos`, pestaña Trabajos | `platform.trabajos.list`, `.reintentar`, `.cancelar` |
| Precios de recursos (USD por unidad, versionados), modelos de IA por clase, límites | `/platform/ajustes` | `platform.precios.*`, `platform.ajustes.*` |
| Valores legales de Previred con aprobación humana | `/platform/indicadores` | `platform.indicadores.*` |

Base sólida: toda escritura `platform.*` se audita en `core.auditoria_global`, las keys con scope `platform` vencen en 7 días, lo irreversible pide aprobación humana a los agentes, y hay tests de aislamiento (`plataforma-aislamiento-db.test.ts`).

## 2. Qué está roto (verificado en vivo o en el código)

1. **Pestañas Agentes e Integraciones de la empresa no cargan** («No pudimos cargar esta página»). Fallan desde el 29-oct: 30 errores `INTERNAL` de Prisma en `platform.tenants.get` y `platform.precios.list` en esas rutas (Vercel). Las demás pestañas cargan.
2. **Errores de Prisma en capacidades de plataforma en todo el ERP:** `platform.tenants.list`, `.consumos.summary`, `.precios.list`, `.ajustes.get` e `.indicadores.propuestas` fallan con `INTERNAL` al abrir `/bandeja`, `/personas`, `/pauta` y `/platform` (decenas por hora). Sospecha: `consumos.summary` y `usage.summary` lanzan una consulta por empresa en paralelo sin `porLotes` sobre un pool de 5 conexiones, sumado a los cortes de Neon conocidos (auditoría §4.1); hay que acotarlo.
3. **El costo no cuadra:** la ficha de Gard muestra «IA del mes US$ 0,00» con 684 mil tokens (con el precio vigente serían ~US$ 0,68) y `/platform/consumos` muestra **US$ 10.837** en 30 días. El costo guardado al medir (`costo_total_micro`) no es coherente con los precios: no sirve hoy para cobrar.
4. **[Resuelto, CAR-323 bloque C]** **Módulos:** CPQ dice «Requiere comercial» aunque Comercial esté activo (muestra la dependencia por id en vez del estado); los interruptores no se bloquean mientras guardan; texto viejo «Llegan con Comercial y CPQ (fase 2)».
5. **[Resuelto, CAR-323 bloque C]** **Trabajos:** la hoja muestra un bloque de payload siempre vacío (la capacidad lo omite a propósito); «Abrir» desde Atención puede no abrir la hoja; descartar es irreversible y no confirma.
6. **[Resuelto, CAR-323 bloque C]** **Consumos global:** si la carga falla muestra «Sin empresas» en vez del error.
7. **[Resuelto, CAR-323 bloque C; ver «todo o nada» en ESTADO]** **Ajustes:** «Guardar» aplica precios y ajustes uno tras otro (si falla a la mitad queda a medias), sin vista previa aunque afecta a todas las empresas; «Ingreso mínimo» aparece en Límites y además en Valores legales.
8. **Ciclo de vida:** «prueba» no vence (ni la empresa ni el módulo) y funciona igual que «activo»; `set_estado` permite cualquier transición sin motivo ni antes/después; adoptar una empresa existente le siembra el catálogo de la vertical pedida aunque la suya sea otra; cambiar la vertical no vuelve a sembrar. No existe archivar ni borrar empresa (solo suspender).
9. **Seguridad (no bloquea hoy, se corrige en el PR de arreglos):** `platform.modules.set` es «escritura», así que un agente con key de plataforma puede **suspender módulos pagados sin aprobación humana**; `platform.aprobaciones.rechazar` lo puede usar el rol `support` (solo lectura); `platform.tenants.get` no registra la empresa objetivo en su auditoría de lectura; `platform.precios.set` acepta recursos inexistentes (su consumo se valora en 0) y el precio nuevo tarda hasta 10 minutos en aplicarse por la caché.
10. **[Resuelto, CAR-323 bloque C]** **Diseño:** las páginas globales (Trabajos, Valores legales, Consumos, Ajustes, Nueva empresa) no muestran título en la barra superior; ids técnicos a la vista (`ia.economica.entrada`, `core.auditoria.verificar`, «0.1.0»); valores legales como JSON crudo. Las capturas a 375 px quedan para el PR B (Playwright local).

## 3. Qué falta

- **Cobro por módulo** (decisiones de Carlos del 4-nov: #313, CAR-188 y §6): hoy `tenant_modules` solo guarda estado; no hay plan base, precio, unidad, inicio de cobro, fin de prueba ni cargo mensual. «Prueba» no vence nunca y no existe el estado «solo lectura».
- **Catálogo de módulos:** solo existe el manifest técnico (id, nombre, dependencias). Falta nombre comercial, descripción, si se vende solo o como parte, capa de cobro (ADR-058) y una forma de partir Finanzas en partes sin rehacerlo.
- **Usuarios de plataforma:** no hay pantalla para ver usuarios de toda la plataforma ni cambiar el rol de plataforma; la pestaña Usuarios solo muestra owners y admins (sin el resto de miembros, sin reenviar ni revocar invitaciones).
- **Editar empresa** (nombre, vertical, zona horaria): existe la capacidad, no la pantalla.
- **Auditoría de plataforma:** existe la lectura, no la pantalla ni la entrada de menú.
- **Vista previa en pantalla:** ninguna pantalla de Plataforma usa `dryRun`, aunque las capacidades lo soportan.
- **Diseño aprobado:** solo hay diseño para Empresas, ficha, Ajustes y Trabajos (`export-maestros`, pantallas 48–51). Cobro, catálogo, usuarios, auditoría, Consumos y Valores legales necesitan Design Prompt.

## 4. Pantalla ↔ MCP

| Se puede en… | …pero no en | Qué |
|---|---|---|
| MCP | pantalla | `platform.tenants.update`, `.users.list`, `.users.set_role`, `.auditoria.list`, `.auditoria.estado`, `.bitacora.estado`, `.eventos.list` |
| Pantalla | MCP | Aprobar/rechazar valores legales y aprobaciones de plataforma, borrar usuario y restablecer MFA: **reservado a personas a propósito** (ADR-032) |
| Ninguno | — | `platform.usage.summary` quedó obsoleta (la reemplaza `consumos.summary`): se retira |

Paridad pantalla → MCP en verde (0 faltantes); la brecha es al revés: hay capacidades sin pantalla.

## 5. Qué se construye (orden de PRs, uno por bloque)

Orden fijado por Carlos el 4-nov-2026. Los construye la sesión **Plataforma · Code** con un prompt por bloque; la sesión **Plataforma · Proyecto** (esta) revisa código y diseño y verifica en `test.opai.cl` tras cada integración.

| PR | Bloque | Contenido |
|---|---|---|
| 1 | **A** (#314) | Esta hoja y ADR-071 con su adenda |
| 2 | **B · Cobro por módulo** (CAR-188, #317) | Plan base mensual fijo en UF; por módulo precio fijo o por unidad × cantidad del mes, con mínimo y después descuento, y la cantidad guardada en el cargo; pruebas abiertas solo por Plataforma, con fecha de término, aviso 7 días antes y, al vencer, pasa a cobro o queda en solo lectura; primer mes proporcional; UF del último día del mes; cargo mensual idempotente listo para facturar (sin emitir ni SimpleAPI); vista Facturación por empresa y total; capacidades con MCP, `preview_`, auditoría y prueba entre empresas |
| 3 | **C · Catálogo** | Nombre comercial, descripción, unidad de cobro por defecto, se vende solo o como parte de otro, dependencias visibles con su estado, plan base (empresa, usuarios, roles y permisos, ajustes, auditoría, notificaciones, documentos, tickets y portal) y partes de Finanzas (bancos, conciliación, ventas, compras, cobranza, factoring, flujo de caja) sin rehacer |
| 4 | **D · Diseño** | Design Prompt de Plataforma completo y luego aplicarlo: títulos, nombres legibles, vista previa en pantalla, 375/1024/1280 |
| 5 | **E · Paridad MCP y brechas** | Editar empresa, usuarios de plataforma, auditoría, miembros e invitaciones en pantalla; seguridad del punto 9 de §2; arreglos de §2 |

## 6. Decisiones de Carlos (respondidas el 4-nov-2026, ADR-071 adenda)

1. **Unidad:** plan base mensual fijo en UF por empresa y, por módulo, precio fijo o por unidad × cantidad del mes, con mínimo opcional y después descuento; la cantidad queda en el cargo.
2. **Fin de la prueba:** la abre Plataforma por módulo con fecha de término; aviso 7 días antes; al vencer, con «pasa a cobro» se cobra, sin él el módulo queda en solo lectura.
3. **Primer mes:** proporcional; los siguientes, completos.
4. **UF del cargo:** la del último día del mes que se cobra.

**Pendiente de aprobación:** esta hoja de alcance como plan del módulo.
