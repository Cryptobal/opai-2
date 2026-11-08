# CAR-222 · Prueba gratis (PR 2) · casos de cierre

Casos **sintéticos y reproducibles** para cerrar #379. Los datos son ficticios y de un tenant de QA propio
(`qa-prueba-gratis`, slug con `qa-`). La validación visual la hace OPAI 2.0 en `https://preview.opai.cl`.

## Reglas de esta evidencia

- **No** se opera Gard, ni un tenant de negocio, ni aliases de dominio, ni cobros reales. **Kits sigue oculto**: no se toca ni se prueba.
- La prueba gratis **no crea precios ni cargos**: es un acceso, no un cobro. Ningún caso genera una factura.
- Un QA de Finanzas **vacío** (sin movimientos ni documentos) **no acredita** que la web sea segura: aquí solo se acredita el flujo de la prueba.
- Todo lo que dice «auto» ya corre en `pnpm test` (en memoria, sin base). Lo visual queda para OPAI 2.0.

## Preparación (una vez, solo en el entorno de la preview)

1. Tenant de QA `qa-prueba-gratis` con un usuario administrador y uno con rol `supervisor`. RUT sintético válido, por ejemplo `11.111.111-1` (se pone en `/configuracion/empresa`; el caso L1 lo prueba **sin** RUT).
2. Un usuario de Plataforma `owner` y otro `support` (`/platform`).
3. Verifica que no hay pruebas ni condiciones de cobro para ese tenant antes de empezar.

## Casos

| Id | Ruta | Pasos | Esperado | Auto |
| --- | --- | --- | --- | --- |
| L1 | ERP `/configuracion/empresa` y `/configuracion/modulos` | Con el tenant **sin RUT**, abrir «Probar 10 días» en un módulo (por ejemplo CPQ). | La hoja avisa «Completa el RUT de la empresa…» con enlace a Datos de la empresa y «Activar prueba» queda desactivado. | `prueba-gratis.test.ts` (RUT) |
| L2 | ERP `/configuracion/modulos` | Con RUT, «Probar 10 días» → «Activar prueba». | Aviso «Prueba … activada por 10 días». La tarjeta muestra «Prueba gratis: 10 días» y el botón desaparece. | `prueba-gratis.test.ts` |
| L3 | ERP `/configuracion/modulos` | Recargar la página. | Misma tarjeta, **sin** botón «Probar»: se usa una sola vez por módulo. | `prueba-gratis.test.ts` («solo una vez») |
| L4 | Plataforma `/platform/tenants/<id>/cobro` | Sección «Pruebas gratis»: ver CPQ «Vigente · 10 días». Pulsar «Extender 10 días» → Extender. | «Prueba extendida»; el último día avanza 10 días **desde el último día**; «extendida 1 vez». | `prueba-gratis-casos.test.ts` |
| L5 | Plataforma · Cobro | Extender otra vez. | 20 días más desde el original; «extendida 2 veces». | `prueba-gratis-casos.test.ts` (acumulan) |
| L6 | Capacidad / MCP (no hay control de pantalla) | `platform.cobros.prueba_gratis_extender` en vista previa (`dryRun`) con `dias` = 0, 61, −1, 1.5. | Rechazo de validación en los cuatro; `dias` = 1 y 60 se aceptan. | `prueba-gratis-casos.test.ts` |
| L7 | Plataforma · Cobro | Con la prueba que **terminó** (ver nota de fecha), el botón dice «Reactivar 10 días». | La nueva fecha cuenta **desde hoy** y el módulo vuelve a «en prueba». El último día todavía cuenta como vigente. | `prueba-gratis*.test.ts` |
| P1 | ERP `/configuracion/modulos` | Entrar con el usuario `supervisor`. | No aparece «Probar 10 días» ni «Solicitar». Si se llama la capacidad, `FORBIDDEN` y no se escribe nada. | `prueba-gratis-casos.test.ts` |
| P2 | Plataforma · Cobro | Entrar como `support`. | Ve la sección «Pruebas gratis», pero extender responde «sin permiso». | `prueba-gratis.test.ts` (support) |
| P3 | MCP | Una key de agente llama `core.modules.probar` y `platform.cobros.prueba_gratis_extender` sin vista previa. | `APPROVAL_REQUIRED` (irreversible): un agente no gasta ni extiende pruebas sin aprobación humana. | `prueba-gratis.test.ts` (efecto) |
| P4 | Plataforma · Cobro de **otra** empresa QA | Abrir el Cobro de una segunda empresa QA. | No ve las pruebas de la primera (y la lectura de una empresa inexistente falla). | `prueba-gratis-casos.test.ts` |
| F1 | ERP · «Partes de Finanzas» | Probar «Bancos» en una empresa sin Finanzas. | Aviso: probar una parte abre todo Finanzas durante la prueba (decisión temporal de Carlos). Con Finanzas ya activo, las partes no se pueden probar. | `prueba-gratis.test.ts` |
| C1 | Plataforma · Cobro y Facturación | Tras L2–L5, mirar «Cargos listos para facturar» y el resumen del mes. | **Cero** cargos y **cero** condiciones nuevas; el módulo en prueba figura como no facturable. | `prueba-gratis-cobro-simulado.test.ts` |
| C2 | Plataforma · Cobro | Pulsar «Fijar precio» en el módulo en prueba y **no** guardar. | El precio de lista solo rellena la hoja; no se crea condición hasta guardar. | `plataforma-catalogo.test.ts` |
| R1 | 375 px y 1280 px | Capturar `/configuracion/modulos` (hoja de confirmación abierta) y el Cobro (sección «Pruebas gratis»). | Sin desborde horizontal, botones ≥ 44 px, textos legibles; «Partes de Finanzas» en una columna a 375 px. | — (visual) |

**Nota de fecha para L7:** una prueba de 10 días no termina sola dentro de una sesión de QA. Para verla
terminada hay tres opciones, todas sobre el tenant de QA y nunca sobre uno real: (1) esperar al día 11; (2) pedir
a quien administre la base de QA que retroceda `hasta` de esa fila; (3) confiar en la prueba automática de
«reactivar», que ya cubre ese borde.

## Cómo repetir lo automático

```bash
pnpm --filter @opai/capabilities exec vitest run \
  test/prueba-gratis.test.ts test/prueba-gratis-catalogo.test.ts \
  test/prueba-gratis-casos.test.ts test/prueba-gratis-cobro-simulado.test.ts
```

## Resultado

Se completa en el PR #379: casos ejecutados, quién y con qué commit. No se registran RUT reales, sueldos ni datos de personas.
