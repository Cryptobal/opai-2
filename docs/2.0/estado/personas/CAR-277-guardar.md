# CAR-277 (pendiente de la autorrevisión) · «Guardar» solo con cambios

- **Sesión:** Sesión Personas y Documentos (modo noche)
- **PR:** rama `fix/car-277-guardar-sin-cambios`
- **Estado:** En PR
- **Migración:** no

## Qué entra

- Las hojas de Laboral que envían todos los campos (`todos: true`: pago, agregar cuenta y, con CAR-277, Jornada DT) comparan igual con lo guardado: sin cambios, **Guardar** queda desactivado y no se escribe un evento de auditoría vacío.
- Prueba en `apps/web/test/config-hojas-laboral.test.ts`; la prueba `@preview` «Pago: agregar otra cuenta bancaria» ya verifica el botón desactivado al abrir.

## Qué queda pendiente

- `patchDe` de `personas-laboral-escritura.ts` devuelve `Record<string, unknown>` (pierde el tipado de Prisma); va con el próximo cambio de esa escritura.
