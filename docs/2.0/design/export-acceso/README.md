# Export aprobado de Claude Design — Acceso (23-oct-2026)

Referencia visual de las pantallas de acceso de OPAI 2.0, hecha sobre el DS 2.0 aprobado. No es código a copiar: la implementación vive en `apps/web/app/(auth)` y en `packages/ds`.

| Archivo | Pantalla | Se implementa en |
|---|---|---|
| `01_Login_ERP_375.html`, `02_Login_ERP_1280.html` | Login ERP / Plataforma / Supervisor: por defecto, error de credenciales, cuenta suspendida, cargando; claro y oscuro | Brief 01 |
| `03_Recuperar_contrase_a_375.html` | Recuperar contraseña (pedir enlace, nueva contraseña) | Brief 01 |
| `04_Invitaci_n_375.html` | Invitación: correo sin cuenta, correo con cuenta, expirada, ya usada | Brief 01 |
| `05_Selector_de_empresa.html` | Elegir empresa tras el login (375 y 1280) | Brief 01 |
| `06_Login_Trabajador_375.html`, `07_Keypad_Teclado_num_rico.html` | Login Trabajador: RUT con formato automático, PIN con teclado numérico (≥56px), Face ID, PIN incorrecto; claro y oscuro. El teclado es un componente nuevo del DS (`Keypad`) | Fase 3 (portales) |
| `08_Login_Cliente_375.html`, `09_Login_Cliente_1280.html` | Login Cliente: enlace mágico o RUT + PIN de empresa | Fase 3 (portales) |
| `10_Emparejar_dispositivo_Terreno_Tablet.html`, `11_Emparejar_dispositivo_Terreno_Tel_fono.html` | Emparejar dispositivo Terreno con código de 6 caracteres | Fase 3 (portales) |
| `00_tablero-completo.html` | Tablero original de Claude Design (todas las pantallas; pesa 2,4 MB por las fuentes embebidas) | — |

Reglas de implementación observadas en el diseño:

- Login: tarjeta de 400px máx. centrada en desktop sobre `bg`; en teléfono, pantalla completa con gutters de 16. Wordmark "OPAI" (y "Trabajador"/"Cliente" como sufijo muted en los portales). Título `t-title`, subtítulo muted, campos con `Campo`, botón principal `lg` ancho completo, enlace "¿Olvidaste tu contraseña?" en acento (a la derecha de la etiqueta en desktop; bajo el botón en teléfono), separador con "o" y "Continuar con Google" secundario. Al pie: "Entrar como trabajador · Portal cliente".
- Estados: error de credenciales en caja `danger-muted` con icono, con el texto "Tras 5 intentos pausaremos el acceso por 15 minutos"; cuenta suspendida en caja `warning-muted` con icono de candado y el nombre de la persona administradora; cargando con botón "Entrando…" y controles deshabilitados.
- Invitación: monograma del tenant, título "<Tenant> te invitó como <Rol>", línea "Invitación de <persona> · vence el <fecha>"; correo bloqueado (la invitación es para ese correo); contraseña "Al menos 10 caracteres, con una letra y un número"; variante con cuenta existente muestra la tarjeta de usuario y "Iniciar sesión para aceptar" + "No soy yo"; expirada y usada con icono en círculo `warning-muted` / `info-muted`.
- Selector de empresa: lista de tarjetas con monograma, nombre, badge de rol (acento) y "Último acceso dd-mm-aaaa" o "Sin accesos"; "Cerrar sesión" al pie.
- Trabajador: RUT en `t-mono` grande centrado con formato automático (puntos y guion se ponen solos); PIN como 4–6 puntos, los faltantes como círculos punteados; teclado 3×4 con K/0/Borrar en la fila inferior (o Face ID en lugar de K cuando aplica); botón "Continuar"/"Entrar" `lg`; error "PIN incorrecto. Te quedan N intentos" con puntos en `danger`.
