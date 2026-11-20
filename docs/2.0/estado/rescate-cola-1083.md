# Rescate de la cola · PR #1083

18-nov-2026. Carlos encargó a OPAI 2.0 resolver el bloqueo de integración.

Los logs de la corrida merge_group 44272052280 muestran que remuneraciones ya pasa con #1083, pero anexos-db falla por perfil_empresa_rut_unico: comparte un RUT fijo con anexos-sensibles-db. Ambas suites ahora generan un RUT sintético válido por corrida, siguiendo el patrón de platform-perfil-db. No se omiten pruebas ni se cambia la restricción de negocio. Sin migración ni cambio adicional de producto.

Verificación: las tres suites afectadas pasan (19 pruebas) contra Postgres real; lint sin errores. La validación completa local y el CI siguen pendientes. Se igualó el entorno local a Postgres 16 y UTF-8 como en CI; la primera validación con Postgres 18 detectó diferencias de entorno y agotó memoria en el typecheck paralelo. No se omite ninguna prueba. La integración se registra en el PR después del verde de la cola. Primero se valida e integra #1083 solo; luego se reanuda la cola.
