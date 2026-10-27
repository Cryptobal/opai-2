# Plataforma: aviso e insignia sin acceso

## Encargo y criterios

Corrección de H4 de QA solicitada en el encargo de esta sesión; no se indicó ID de Linear.
El texto «Plataforma es solo para el equipo de OPAI.» viene del encargo. Se conserva
el DS existente, sin cambiar permisos de capacidades, consultas, migraciones ni workflows.

- Insignia solo con acceso en Empresas, Trabajos, Ajustes y Consumos y en la cabecera compartida.
- Aviso específico de Plataforma y redirección a Plataforma solo con la guarda compartida.
- Pruebas de `identidadDe`, roles admitidos y desconocidos, render sin acceso y e2e a 375,
  1024 y 1280 px. El e2e conserva el correo de la semilla existente por compatibilidad
  con CI; `E2E_EMAIL` permite sustituirlo por una cuenta de prueba. Evitarlo por defecto
  queda parcial: CI no siembra otra cuenta autorizada y no se modifican workflows.

No hay decisiones de negocio adicionales. QA posterior en `test.opai.cl` queda pendiente.

## Seguimiento de revisión 5662267950 y QA del PR #69

- El test importa el actor después de fijar una URL ficticia, y pasa sin `DATABASE_URL` externa.
- La insignia llega por `opciones`, como en las páginas; se comprueba para `owner` y `support`, con y sin empresa, y se mantiene la prueba negativa sin rol global.
- Los criterios anteriores se mantienen; la cuenta predeterminada del e2e sigue siendo el criterio parcial indicado arriba. No se cambia la guarda ni se toman decisiones nuevas.
- QA en vivo posterior al merge y accesibilidad visual integral siguen pendientes; el e2e local cubre los tres tamaños, pero no reemplaza esa revisión.
