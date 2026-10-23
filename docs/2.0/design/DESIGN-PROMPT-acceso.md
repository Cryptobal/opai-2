# DESIGN PROMPT — ACCESO (OPAI 2.0)

Para pegar en Claude Design junto con el export aprobado del DS 2.0 (`docs/2.0/design/export-ds-2.0/index.html`) como referencia de tokens y componentes. Diseña las pantallas de acceso de OPAI 2.0 usando exclusivamente ese sistema.

## Pantallas

1. **Login ERP / Plataforma / Supervisor** (`/login`): wordmark OPAI, correo, contraseña, "Entrar" (botón lg), "¿Olvidaste tu contraseña?", "Continuar con Google" (secundario). Estados: error de credenciales, cuenta suspendida, cargando. Viewports 375 y 1280 (en desktop, tarjeta centrada sobre fondo `bg`, sin ilustración).
2. **Recuperar contraseña**: correo → mensaje "si existe, te enviamos un enlace"; pantalla de nueva contraseña desde el enlace.
3. **Invitación** (`/invitacion/<empresa>/<token>`): "Gard Security te invitó como Administrador"; si el correo no tiene cuenta: nombre y contraseña; si la tiene: "Iniciar sesión para aceptar". Estados: expirada, ya usada.
4. **Login Trabajador** (`/trabajador/login`): RUT con formato automático (`16.234.567-8`), PIN numérico de 4 a 6 dígitos con teclado grande (≥56px por tecla), opción "Usar Face ID" cuando el dispositivo lo soporte. Solo 375. Pensado para usarse con una mano, con guantes, a la luz del sol.
5. **Login Cliente** (`/cliente/login`): correo → enlace mágico; alternativa RUT + PIN de empresa. 375 y 1280.
6. **Emparejar dispositivo Terreno** (`/terreno/emparejar`): código de 6 caracteres que entrega el ERP, nombre del dispositivo, instalación; confirmación con el nombre de la instalación en grande. Solo tablet y teléfono.
7. **Selector de empresa** (usuario con más de un tenant): lista de tarjetas con monograma, nombre y rol; se muestra tras el login.

## Reglas

- Tokens, tipografía y componentes del DS 2.0 por nombre; nada nuevo salvo el teclado numérico del login de Trabajador, que se define aquí como componente nuevo del DS.
- Modo claro y oscuro para el login principal y el de Trabajador.
- Textos en español de Chile; formatos chilenos de RUT.
- Entregar export HTML standalone, una pantalla por archivo, como el export anterior.
