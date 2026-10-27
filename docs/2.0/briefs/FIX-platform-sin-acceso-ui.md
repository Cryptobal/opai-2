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
