# Extracción de OPAI 1.0 — Rondas (GPS) y Tickets

**Fuente:** `Cryptobal/opai` @ `53bb97d`: modelos `ops.checkpoints`, `ops.ronda_*`, `src/lib/rondas/` (trust score, anomalías, offline, notificaciones), `ops.tickets*`, `docs/rondas/`, `docs/tickets*`.

## 1. Rondas: lo que funciona en 1.0 y se conserva como base (ADR-024)

**Modelo.** Puntos de control (`checkpoints`) por instalación con QR único por tenant, coordenadas y **radio de geocerca** (por defecto 5 m); plantillas de ronda (secuencia ordenada de puntos, obligatorios u opcionales, tiempo máximo por tramo); programación (horarios por instalación); ejecuciones con estados `pendiente → en_curso → completada | incompleta (>20 % puntos sin marcar) | no_realizada | cerrada_auto | cerrada_admin`, ad hoc permitidas; marca de punto con método de verificación (QR, NFC o GPS), posición, distancia, precisión, **confianza geográfica** (`high`/`low`/`unknown`), foto de evidencia; **tracking** GPS durante la ronda (lat, lng, precisión, batería) y `walk_route` + `route_snapshot` al cierre; incidentes asociados a la ejecución.

**Confianza (trust score) por punto, 0–100:** geocerca validada 30, movimiento real 15, foto 15, mismo dispositivo 10, velocidad entre puntos bajo umbral 20, batería > 10 % 10. Ronda = promedio; bandas verde ≥ 80, amarillo ≥ 60, rojo < 60. Detección de anomalías (velocidad imposible, saltos, teletransporte) con severidad.

**Operación.** Offline-first: la ronda se ejecuta sin red y se sincroniza (`is_offline_sync`, `synced_at`); crons de cierre (atrasadas, en curso, libres); alertas de pánico y críticas; digest diario de cumplimiento por instalación; informes con heatmap y recorrido.

**Reglas para 2.0.** Rondas es un **módulo vendible solo**: depende únicamente del núcleo (instalación, persona, dispositivo, documentos para fotos) y se vende a empresas que no usan nada más de OPAI. Conserva: geocerca con radio por punto, tres métodos de verificación, tracking con batería y precisión, trust score con los mismos pesos (configurables por tenant), offline-first con cola idempotente, estados y crons, libro de novedades integrado (decisión de oct-2026), vista del cliente (resumen y recorrido, hallazgos internos). Mapas y geocodificación por el servicio de geolocalización del núcleo (ADR-027). Lo que no se porta: hilos de Slack por ronda (pasa a Comunicaciones, ADR-020).

## 2. Tickets: lo que existe y lo que falló (ADR-025)

**Modelo en 1.0.** Tipos de ticket configurables con pasos de aprobación; tickets con estado, prioridad (p1–p4), origen (manual, evento de guardia, supervisión…), SLA con vencimiento, pausas y extensiones, aprobaciones, comentarios, eventos, vínculos a entidades, adjuntos, CSAT.

**Qué falló (según Carlos, oct-2026):** el sistema quedó lleno de tickets abiertos sin autorizar y de notificaciones (≈1.000/día); los hallazgos de supervisión creaban tickets automáticamente; las solicitudes de guardias y supervisores no llegaban a quien correspondía ni volvían resueltas al solicitante.

**Reglas para 2.0.** Tickets es un **módulo transversal del núcleo-plus**: simple, con pocos conceptos: tipo (con destinatario por defecto: rol o persona, y SLA opcional), estado (`abierto → en_curso → resuelto → cerrado`, más `rechazado`), prioridad, solicitante, asignado, vínculo a cualquier entidad, comentarios y adjuntos (vía `core.documentos`). Reglas duras: todo ticket tiene **un responsable** desde que se crea; el solicitante recibe la resolución en su portal y por correo automáticamente; los hallazgos de supervisión **no** crean tickets (quedan en la ficha de la instalación); las solicitudes de trabajadores (vacaciones, permisos, cambios) son tipos de ticket con aprobación de un paso y llegan al supervisor en su portal; sin tipos ocultos ni automatizaciones que generen tickets sin dueño. Ruido controlado por Comunicaciones (silencio por defecto, resúmenes). Se vende incluido con cualquier módulo operativo y también solo (mesa de ayuda interna).

## 3. Chat

Decisión de Carlos (oct-2026): no es prioritario; si tickets y portales funcionan bien, no hace falta. No se construye. Queda en backlog como canal futuro de Comunicaciones.
