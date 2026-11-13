# Clics por tarea clave (CAR-334, 13-nov-2026)

Conteo hecho leyendo el código de las pantallas, sin ejecutar nada; se confirma con la auditoría en vivo cuando `qa-e2e` tenga datos para cada flujo (CAR-372). Un clic o toque es cada acción que avanza la tarea; un campo es un dato que hay que escribir o elegir porque no viene precargado. Navegación en escritorio, desde el Inicio del portal.

| Tarea | Clics o toques | Campos | Confianza | Lo que más pesa |
| --- | --- | --- | --- | --- |
| Emitir una factura (ERP › Finanzas › Ventas) | 7 (9 con las dos vistas previas) | 3 (cliente, glosa, precio) | Alta | Dos fases (borrador y emisión), cada una con su vista previa; «Emitir factura» emite sin la vista previa que sí ofrece «Revisar emisión». El envío al SII es automático. |
| Crear y enviar una cotización (ERP, desde un negocio) | 12–13 | 2 (título, cargo o sueldo del puesto) | Media | Vista previa al crear (Revisar y Confirmar) y «Dejar lista» separado de «Enviar al contacto». Puede alargarse por aprobación de margen, recálculo o mutual sin confirmar. |
| Marcar asistencia (Terreno, equipo emparejado) | 2–3 con rostro · 9–10 con PIN | 1–2 | Alta (Trabajador: media) | Sin rostro usable igual hay que tocar «Usar PIN»; el PIN no marca solo al sexto dígito. En el Portal Trabajador marcar está bajo «Más» (10 toques). |
| Ronda de 3 puntos (Terreno) | 9 con cámara · 6 escribiendo los códigos | 0 con cámara · 3 sin ella | Alta | Por punto: «Escanear con la cámara» y luego «Marcar». No hay NFC. |

## Propuestas (no se aplican sin decisión de producto)

Mejoras que bajarían clics. Ninguna cambia un flujo aprobado sin que Carlos lo decida; quedan como insumo para las sesiones dueñas.

1. Factura: un solo «Guardar y emitir» con una sola vista previa (−2 a −3). Que «Emitir factura» y «Revisar emisión» no sean dos caminos para lo mismo.
2. Cotización: crear sin la vista previa (−1), título por defecto igual al del negocio, abrir «Agregar puesto» al crear y fusionar «Dejar lista» con «Enviar» cuando no hace falta aprobación (−1).
3. Asistencia: mostrar el teclado de PIN directo cuando el rostro no está disponible (−1) y marcar al completar el sexto dígito (−1). En el Portal Trabajador, «Marcar asistencia» en el Inicio (−1).
4. Rondas: marcar el punto al leer el QR y dejar la cámara abierta entre puntos (−3 en una ronda de 3 puntos).

## Riesgos vistos en el código

- «Cerrar ronda» no pide confirmación aunque queden puntos pendientes.
- «Marcar punto» aparece también en el Inicio del equipo, fuera de una ronda: la marca queda sin ronda.
- La pantalla de marcar dice «Con tu rostro o con tu RUT y PIN», pero en el equipo no se escribe el RUT: se elige el nombre.
- Con el proveedor de rostro real (Rekognition) el botón de rostro queda deshabilitado; hoy el camino real es el PIN.
