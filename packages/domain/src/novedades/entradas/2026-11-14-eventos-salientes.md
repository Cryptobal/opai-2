---
id: eventos-salientes
fecha: 2026-11-14
modulo: core
titulo: Eventos salientes: OPAI avisa a tu sistema cuando algo pasa
car: CAR-352
permiso: core:apikeys.manage
ruta: /configuracion/agentes/eventos
---
En **Configuración › Agentes y API keys** hay un enlace nuevo, **Eventos salientes**. Ahí registras la dirección de un sistema tuyo (por ejemplo, tu ERP o una automatización) y eliges qué eventos quieres recibir, como «se creó una cuenta» o «se archivó un documento».

**Qué verás en pantalla:**

- La lista de destinos, con su dirección, los eventos elegidos y si está **Activo** o **Pausado**.
- **Agregar destino** abre una hoja para escribir la dirección (https) y buscar los eventos. Al guardarlo, OPAI muestra **una sola vez** el secreto con que firma cada aviso, para que tu sistema compruebe que viene de OPAI.
- Cada destino tiene su ficha, con **Pausar**, **Rotar secreto** y **Eliminar**, y el registro de **Entregas**: qué se envió, si llegó o falló y cuándo se reintenta, con un botón **Reenviar**.

El aviso solo dice qué pasó y en qué registro, nunca los datos de las personas: tu sistema los consulta luego con su propia API key. Si tu sistema no responde, OPAI reintenta durante casi dos días.
