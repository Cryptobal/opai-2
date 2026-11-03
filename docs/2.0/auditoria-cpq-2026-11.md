# Auditoría CPQ — 3-nov-2026 (CAR-162)

Origen: video de QA de Carlos en el teléfono, en un tenant nuevo: la cotización `CPQ-2026-001` quedó bloqueada y el botón llevó a un 404. Base: `main` en `70bfeef`, comparado con OPAI 1.0 (`Cryptobal/opai` en `4b6e472`, solo lectura).

**Conclusión.** El motor, las versiones y la aprobación de 2.0 superan a 1.0, pero **un tenant nuevo no puede cotizar**. En 1.0 se cotizaba sin configurar nada, por tres razones:
- los parámetros legales eran globales;
- la mutual estaba fija en el código;
- el sueldo se autocompletaba al elegir el rol.

En 2.0 faltan esos tres caminos, y los avisos mandan a rutas rotas.

## 1. Causa raíz del bloqueo del video

| Síntoma | Causa | Evidencia |
|---|---|---|
| «Ir a Remuneraciones» da 404 | `href` fijo a `/configuracion/grupo/operacion/remuneraciones`, que cae en el catch-all. La página real es `/configuracion/remuneraciones` | `cotizaciones/[id]/_componentes/bloqueo-cotizacion.tsx:5`; también `lib/cpq-presentacion.ts:86,104,114,123,132` |
| «Publica los valores legales del día» | Texto genérico para tres causas: juego legal, mutual o sueldo. La causa real (`resuelto.pendiente`) queda oculta | `cpq-presentacion.ts:85`, `capabilities/calcular.ts:33-36`, `persistencia/proveedor.ts:65-67`, `acciones-cotizacion-logica.ts:47-56` |
| Bloqueo por la mutual | El perfil nace con `mutual_adicional_estado 'pendiente'` y tasa NULL, sin valor por defecto | `persistencia/valores-legales.ts:20-31`, `publicaciones.ts:63-67` |
| «Ver cargos» para el sueldo | El enlace va a `/personas/cargos` (redirige a `/cargos`), que dice que ahí ya no se definen sueldos. El campo existe en la hoja del puesto | `cpq-presentacion.ts:89-96`, `hoja-editar-puesto.tsx:60-71` |
| La barra inferior marca «Personas» | Efecto de ese enlace: `fijarPendiente("/personas/cargos")` | `linea-cotizacion.tsx:132`, `estado-enlace.tsx:23` |
| «Generando PDF…» infinito | `ejecutar` de `use-capacidad` es nuevo en cada render; el efecto entra en bucle y borra el error. Mismo patrón en 5 pantallas más | `dialogo-vista-previa-pdf.tsx:27-35`, `use-capacidad.ts:21,28` |
| «Margen 0,0 % · Bajo el mínimo» sin cálculo | El semáforo no mira `costoPendiente` | `calcular.ts:49-57`, `resumen-cotizacion.tsx:97-102` |
| 8 categorías «Pendiente» | Una fila por categoría aunque no haya cálculo | `resumen-cotizacion.tsx:19-28` |
| «1 personas» | Sin `plural()` | `cargos/_componentes/detalle-cargo.tsx:30`, `packages/ds/src/components/impacto-sueldo.tsx:19` |
| Ningún test lo detectó | `cpq-ficha.spec.ts` no sigue enlaces ni abre la vista previa; el seed e2e no siembra la mutual | `apps/web/e2e/cpq-*.spec.ts`, `seed-cpq-e2e.ts` |

## 2. Valores legales

Hay 11 indicadores de plataforma (`packages/domain/src/remuneraciones/indicadores.ts`):
- **UF y UTM** se capturan solos cada día desde el SII.
- **Los otros 9** (ingreso mínimo, topes, AFP, SIS, reforma, cesantía, mutual básica, jornada e impuesto) quedaron fijos en la semilla de `20261102190000` y no tienen flujo de actualización (R5 de `motor-sueldos.md`).

**Decisión de Carlos (3-nov):** se obtienen solos y nadie los publica a mano. Plan: un trabajo mensual que lee Previred y la Superintendencia de Pensiones.
- Si el valor coincide con el vigente, se renueva.
- Si cambió, queda como cambio propuesto para que lo apruebe una persona.
- Si la fuente falla, se usa el último valor con aviso. **Nunca bloquea.**

**Mutual adicional (decisión de Carlos, 3-nov):** sin confirmar, se calcula con 0 % y se avisa. Enviar al cliente exige confirmarla.

## 3. Paridad con 1.0

**Falta o está incompleto, por prioridad:**
1. **Sueldo de referencia por cargo**, con autocompletado en la línea (R20, paso 3). Cargo y rol de turno en la línea. AFP y salud por puesto (hoy fijas en AFP modelo y Fonasa, `proveedor.ts:38-39`). Sueldo líquido → bruto.
2. **Hoja de puesto completa**: patrón, horario, días y personas por posición. La capacidad los recibe, pero la pantalla solo pide nombre, posiciones y sueldo. Colación y movilización están en 0 en el código (`recalcular.ts:62-63`). No hay pantalla para agregar ítems.
3. **Parámetros financieros por versión** (costo financiero, póliza, RC, meses de contrato): siempre `INSTRUMENTOS_DEFECTO`, apagados (`plantilla.ts:3-8`). No hay pantalla de margen, y la cotización nace con margen 0.
4. **Edición del catálogo**: las capacidades existen, pero la pantalla solo lista.
5. Enlace compartido y WhatsApp; enviar la dotación a la instalación al ganar (R2).
6. Menores: «incluye», grupos de servicio, papelera y la herramienta `cpq_cotizaciones_ajustar`.

**Mejor que 1.0:**
- aprobación por margen con bandeja;
- versiones inmutables con cálculo congelado y alternativas;
- indicadores con fuente, vigencia y huella;
- traza explicable;
- `cpq:costos.ver` aplicado en el servidor;
- RLS en todas las tablas;
- PDF y propuesta técnica con marca y plantillas.

## 4. Diseño

El v3 aprobado (`export-cpq/`) sigue vigente para el cotizador de escritorio y el envío. Lo que ya está diseñado diverge en la implementación: drawer de envío, pestañas de configuración Pólizas y Márgenes, edición en celda con chip de origen y menú PDF. No se dibujaron:
- hoja de puesto e ítem;
- requisitos o primera cotización;
- vista previa del PDF;
- cotización rápida;
- lista, pestaña del negocio, aprobación, crear puestos y agente.

Esas pantallas van en `design/DESIGN-PROMPT-cpq-v4-modulo-completo.md`. Allí el teléfono pasa a editar por hojas, y se pide un prototipo navegable del módulo completo.

## 5. Plan

| PR | Contenido | Depende de |
|---|---|---|
| **A · CAR-162** | Rutas, causa concreta, mutual al 0 % con aviso, aviso que abre la hoja del puesto, bucle de `use-capacidad`, margen «—», plurales y e2e de tenant vacío | — |
| B | Automatización de los 9 indicadores (Previred y SP, cambio propuesto, respaldo) | — |
| C | Sueldo de referencia por cargo y hoja de puesto completa (cargo, patrón, días, tramos, colación, movilización, AFP y salud, líquido → bruto) | Diseño v4 |
| D | Parámetros financieros por versión, margen y finanzas en pantalla, catálogo editable, drawer de envío fiel al v3 | Diseño v4 (móvil) |
| E | Compartir y WhatsApp, crear puestos al ganar, archivar | Diseño v4 |
