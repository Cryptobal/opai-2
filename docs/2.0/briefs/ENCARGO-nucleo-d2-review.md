# NÚCLEO-D2 · Corrección de la review del PR #78

Encargo de corrección de la review 5671568745: permisos efectivos para las acciones de
documentos en Supervisor, pruebas con alcance limitado y host IPv6 local en el seed E2E.
Sin decisión de negocio nueva ni migración. Adaptación técnica de OpenCode.

## Criterios y límites

- La visibilidad de las acciones usa la identidad ya cargada, sin consultas adicionales.
- Las pruebas unitarias cubren denegación por excepción y concesión por rol personalizado
  con instalaciones no nulas. La navegación también se prueba con alcance limitado.
- **Parcial:** falta comprobar los botones en el E2E para ambos casos. Además, un actor
  limitado no puede acceder a ninguna persona ni documento de persona: `dondePersona` y
  `entidadEnAlcance` deniegan por defecto hasta que el Brief 07b aporte el vínculo real
  persona-instalación. No se debilita esa protección para fabricar el caso positivo.
- El seed de navegación admite el host local `[::1]`.
