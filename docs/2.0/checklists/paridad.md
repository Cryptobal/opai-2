# Checklist de paridad 1.0 ↔ 2.0 — bot de Paridad

El bot de Paridad compara OPAI 1.0 (`opai.gard.cl`) con 2.0 (`test.opai.cl`) **solo leyendo**, por MCP o por la API de cada sistema. Nunca escribe en ninguno de los dos. Se usa antes de cada corte de Gard (ver «Deja de usarse en 1.0» en `ROADMAP.md`) y cuando un brief porta algo de 1.0. Insumos: `docs/2.0/extraccion/<modulo>.md` y `docs/2.0/modulos/<modulo>.md`.

**Informes de paridad:** van en `docs/2.0/paridad/`, uno por fase (por ejemplo `paridad/nucleo.md`), junto con la línea base de 1.0 (`paridad/linea-base-1.0.md`). Son insumo, no especificación aprobada.

## 1. Brechas: lo que Gard usa en 1.0 y debe existir en 2.0
- [ ] Cada flujo que Gard usa hoy en el módulo tiene su equivalente en 2.0: pantalla, capacidad y herramienta MCP.
- [ ] Cada regla de negocio de la extracción está en la especificación o en un ADR, o figura como descartada con motivo.
- [ ] Datos: los conteos coinciden después de la importación (cuentas, contactos, instalaciones, negocios, etc.) y las diferencias quedan explicadas.
- [ ] Cálculos con dinero o tiempo dan el mismo resultado al peso o al minuto en los casos dorados (por ejemplo, el margen de CPQ y las cotizaciones reales de Gard).
- [ ] Lo que un agente hace hoy por MCP en 1.0 se puede hacer en 2.0, o queda reportado como brecha con la capacidad que falta.

## 2. Mejoras: lo que 2.0 hace distinto a propósito
- [ ] Cada diferencia con 1.0 está documentada como mejora en la extracción (§4), en la especificación (§11) o en un ADR, con su porqué. Una diferencia sin respaldo es una brecha, no una mejora.
- [ ] Las mejoras no quitan algo que Gard usa a diario sin un reemplazo.

## 3. Qué no se porta
Estos módulos de 1.0 **no se portan**: solo se reconstruyen si hay demanda real (`CONTEXTO-agentes.md`, ADR-030):

- inventario;
- cámaras;
- ATS;
- alertas y cobertura;
- incidentes;
- conocimiento;
- onboarding;
- comunicaciones (el módulo de 1.0; en 2.0 las comunicaciones son un servicio del núcleo, ADR-020);
- gamificación;
- psicolaboral;
- chat;
- módulo de Slack.

Que falten en 2.0 **no es una brecha**. Si Gard depende de alguno para operar, se reporta a Carlos como decisión, no como bug.

Además, dentro de cada módulo no se portan las piezas que la extracción lista en «Lo que no se porta» (por ejemplo, en Comercial: datos de instalación copiados en el negocio, bundles de cotizaciones y catálogos globales).

## 4. Convivencia
- [ ] Mientras dure el corte, los maestros se editan solo en 2.0. La conciliación diaria no muestra diferencias, o las diferencias están explicadas.
- [ ] Nada de lo comparado se corrige escribiendo en 1.0: OPAI 1.0 no se toca.

## Reporte
Una tabla por módulo con estas columnas: flujo o regla, 1.0, 2.0, estado (`igual`, `mejora documentada`, `brecha`, `no se porta`), evidencia (herramienta o consulta usada y resultado) y acción sugerida.
