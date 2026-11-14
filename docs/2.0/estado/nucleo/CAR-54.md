# CAR-54 · Recuperar el segundo factor (MFA)

**Estado:** en PR (rama `fix/car-54-mfa-recuperacion-v2`; retoma el #168, cerrado por conflictos).

## Qué entró

- **Mi cuenta › App autenticadora:** con la app activa, «Regenerar códigos de respaldo» pide la contraseña y muestra los códigos nuevos una sola vez (`accionRegenerarCodigos` → `regenerarCodigosRespaldo` de `@opai/auth`; exige sesión con el segundo factor verificado).
- **Configuración › Usuarios › ficha:** el owner ve «Restablecer MFA» con diálogo de acción irreversible; invoca `core.users.restablecer_mfa` (solo personas), que sale de la lista «sin pantalla».
- **Carrera §I-15 cerrada:** el restablecimiento bloquea la membresía y la fila de `core.users` (`FOR UPDATE`) y repite ahí las condiciones (empresa, otras empresas, rol de plataforma, MFA o passkey activos) antes de borrar; también en `platform.usuarios.restablecer_mfa`. Ajustado a CAR-286: cuenta como «segundo factor» tanto la app autenticadora como las passkeys.
- Pruebas: unitaria de regenerar códigos, concurrencia contra Postgres, e2e de Mi cuenta y de Configuración, y `@preview` `mfa-recuperacion-preview.spec.ts` (solo mira, no escribe).

## Decidido

- Carlos, 14-nov-2026 09:18 («Ok con tus sugerencias»): sin diseño nuevo de Claude Design; se usan el estilo y los componentes aprobados de Mi cuenta y de la ficha de usuario.
- Se descarta «Desactivar segundo factor» del #168: desde CAR-286 se desactiva en Mi cuenta › Métodos de acceso.

## Pendiente

- Pantalla de Plataforma para `platform.usuarios.restablecer_mfa`: va sobre la pantalla de Usuarios de Plataforma del PR #572, cuando se integre.
- El botón aparece también en la propia ficha del owner (la capacidad lo rechaza con mensaje claro): ocultarlo requiere que la lista de usuarios entregue el id de usuario.
- Regenerar códigos exige contraseña: una cuenta que entra solo con passkey no puede regenerarlos (no usa app autenticadora, así que no tiene códigos).
