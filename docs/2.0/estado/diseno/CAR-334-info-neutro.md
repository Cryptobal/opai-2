# CAR-334 · Avisos informativos neutros en el diseño nuevo

**[Sesión Diseño] · 14-nov-2026**

- **Qué entró:** en la piel del diseño nuevo (`data-marco="nuevo"`, ADR-109) los tokens `info`, `info-fg` e `info-muted` pasan a los neutros (`fg-muted`, `fg`, `fill`) en claro y oscuro. Antes heredaban el azul cielo del DS 2.0 clásico, que no existe en el prototipo `export-diseno-nuevo` (allí solo hay acento de la empresa y estados bien, aviso, alerta). Afecta a todo `Alerta tono="info"` y a las etiquetas `info` (98 usos), entre ellos «Medio electrónico» del editor de plantillas. El marco clásico y Hilo no cambian.
- **Prueba:** `apps/web/e2e/nuevo-aviso-neutro-preview.spec.ts` (`@preview`) comprueba en `/configuracion/modulos` que el aviso informativo usa el relleno neutro.
- **Decisión de la sesión (reversible):** lo informativo va en neutro y no en el acento de la empresa, porque el README del diseño nuevo reserva el color restante a los estados.
- **Pendiente:** nada.
