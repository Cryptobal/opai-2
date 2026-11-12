---
id: slack-conexion
fecha: 2026-11-11
modulo: core
titulo: Conecta Slack para recibir las anomalías de terreno
car: CAR-291
permiso: core:integraciones.manage
ruta: /configuracion/integraciones/slack
---
En **Configuración › Integraciones** la tarjeta **Slack** ya no dice «Próximamente»: abre una pantalla nueva para conectar el espacio de Slack de tu empresa y decidir qué se avisa.

**Qué verás en pantalla:**

- Un recuadro **Conexión** con el botón **«Conectar con Slack»**. Te lleva a Slack para aceptar la app «OPAI» y vuelves a la misma pantalla con un aviso verde o, si algo falló, con el motivo en palabras simples. Ya conectado, muestra el nombre de tu espacio y el botón **«Desconectar»**, que pide confirmación.
- **Canales**: eliges el canal de las anomalías y, si quieres, uno para el pánico y otro para el resumen. Si la app no está en el canal elegido, un aviso te dice que la invites.
- **Qué se avisa**: interruptores para atraso, ausencia, fuera de zona, sin relevo, incidentes y mensajes de guardias, el **margen de atraso** en minutos y el **resumen por turno y zona**.
- **Pánico**: avisar en el canal, mensaje directo al supervisor de la zona y **escalar** a un grupo de usuarios si nadie lo toma en los minutos que elijas.

Por defecto se avisa solo lo mínimo: atraso de más de 15 minutos, ausencia y pánico. Las marcaciones normales quedan solo en OPAI y los guardias no usan Slack. Si tu empresa no conecta Slack, todo sigue igual que antes. Solo el owner y los administradores ven esta pantalla.
