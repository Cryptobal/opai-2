# Export — Mi cuenta v1

Pantallas de **Mi cuenta** del Núcleo: Perfil, Seguridad, Preferencias, Notificaciones, Privacidad y datos, uso de foto y nombre, y Configuración › Módulos › Mi cuenta. Versión v1.

- **Fuente:** proyecto de Claude Design `ec41019d` («OPAI 2.0 Mi cuenta v1», Sonnet). Export del 30-oct-2026 15:50 CLT.
- **Alcance:** aprobado en lo general por Carlos el 30-oct-2026 15:33 CLT.
- **Revisión:** operador, 30-oct-2026 ~16:00 CLT (revisión estática, sin render) contra el prompt de origen y la hoja de alcance, ambos en `alcance/` del computador del operador (no en el repo).

## Cómo se ve

Un solo archivo, «Mi cuenta.dc.html», que cambia con Tweaks:

- **device:** phone (375), tablet (1024), desktop (1280)
- **theme:** claro / oscuro
- **section:** ver «Pantallas»
- **estado:** normal, vacío, cargando, error, sin permiso, éxito
- **overlay:** recorte de foto, verificar celular, reautenticación, toast

## Pantallas (valores de `section`)

| Valor | Contenido |
| --- | --- |
| `indice` | Lista de secciones, a 375 |
| `perfil` | Perfil |
| `seguridad` | Seguridad |
| `preferencias` | Preferencias |
| `notificaciones` | Notificaciones |
| `privacidad` | Privacidad y datos |
| `foto` | Uso de foto y nombre en la app |
| `modulo` | Configuración › Módulos › Mi cuenta |
| `decide` | Tablero Decide Carlos |

## Decisiones abiertas (decide Carlos)

Cada una está marcada en su pantalla con la opción recomendada ya dibujada.

- **P1 — Verificación de celular:** SMS, WhatsApp o ambos. Recomendado: ambos, WhatsApp primero. (Perfil)
- **P2 — Passkey:** para entrar sin clave y como segundo factor, o solo como segundo factor. Recomendado: ambos. (Seguridad)
- **P3 — Quién apaga la foto:** recomendado el administrador de la empresa, en Configuración › Módulos › Mi cuenta.
- **P4 — Ventana de reautenticación:** recomendado 10 min. (Configuración)
- **P5 — Retención del historial de accesos:** recomendado 12 meses. (Configuración)
- **P6 — Inglés en v1:** recomendado solo español, con selector listo. (Preferencias)
- **P7 — Cambio de correo:** por el usuario o solo admin. Recomendado: usuario, con verificación y aviso al correo antiguo. (Perfil)

## Pendientes menores (no bloquean, próxima vuelta)

- **(ALTO)** El `Forbidden` del módulo dice «Pídele acceso a Carlos Irigoyen…» y el bundle `_ds` trae «Carlos Irigoyen» (usuario por defecto y Forbidden por defecto) y el RUT `77.120.884-3` en ejemplos: se reemplazan por datos inventados (el bundle se corrige una sola vez, en el DS).
- Entrega en un solo archivo con Tweaks en vez de un HTML por pantalla y ancho.
- En Configuración › Módulos › Mi cuenta falta la lista de módulos a la izquierda en 1024/1280 y el paso «‹ Módulos» a 375.
- Los estados solo están en las 5 secciones de cuenta; el vacío es genérico.
- A 375 la edición no va en Sheet.
- El RUT del perfil es editable y muestra error en reposo (debe ir en solo lectura, viene de Personas).
- Faltan los flujos de cambio de correo, de mostrar los códigos de recuperación una vez, de renombrar/quitar passkey y «No fui yo» del historial como acción.
- No se dibuja la entrada desde el menú de cuenta.
- Los requisitos de clave usan ✓/○ en texto en vez de iconos Lucide.
