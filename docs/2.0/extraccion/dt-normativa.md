# Extracción de OPAI 1.0 — Cumplimiento Dirección del Trabajo (Res. Ex. N°38/2024)

**Fuente:** `Cryptobal/opai` @ `53bb97d` (23-oct-2026): `src/lib/marcacion*.ts`, `src/lib/dt/`, `src/modules/reportes-dt/`, schema `dt` y modelo `ops.marcaciones`, migraciones `*_res38_*` y `*_marcacion_audit_chain`, `docs/FLUJOS_MARCACION.md`.
**Propósito:** reglas que 2.0 debe cumplir **desde el diseño** del módulo Asistencia (ADR-023). Son hechos verificados en código; lo no verificado se marca.

## 1. Qué exige la resolución y cómo lo cumple 1.0

| Requisito (artículo citado en código) | Implementación en 1.0 | Regla para 2.0 |
|---|---|---|
| Registro de cada marca con identificación del trabajador, empleador, establecimiento, fecha y hora (Art. 13) | `ops.marcaciones` guarda un **snapshot** por marca: RUT y razón social del empleador, dirección del establecimiento, RUT y nombre del mandante (subcontrato), N° y fecha de resolución DT de jornada excepcional (`marcacion-res38-snapshot.ts`) | La marca es un hecho inmutable con su propio snapshot: nunca se recalcula desde maestros que cambian |
| Hora oficial del servidor, no del dispositivo | `timestamp` lo pone el servidor; `device_timestamp` y `device_clock_offset_ms` se guardan solo como evidencia; marcas offline llevan `origen_marca` (`online`, `offline_queue`, `retry`, `sync_diferida`) | Igual. El sello de tiempo es del servidor y se registra el desfase del dispositivo. Verificación periódica del reloj del servidor contra hora oficial (SHOA) queda como pendiente de certificación (no identificado en 1.0) |
| Geolocalización como evidencia, **nunca bloqueante** (Art. 19 según nota en 1.0) | `gps_status` ∈ {`dentro_rango`, `fuera_rango`, `sin_gps`}, `distancia_metros`, `gps_accuracy`; fuera de rango se permite marcar y se alerta por correo | Igual: GPS obligatorio de capturar, no de validar; alerta al tenant si está fuera de rango |
| Inalterabilidad (Art. 8 y 14 a ii) | `hash_integridad` SHA-256 del registro (`guardiaId|installationId|tipo|timestamp|lat|lng|metodo|tenantId`), índice por hash, función de verificación; **bitácora append-only** `dt.marcacion_audit_log` encadenada (`prev_hash` → `row_hash`, `seq` por tenant, `payload_canon`), con triggers que prohíben UPDATE/DELETE/TRUNCATE; verificación periódica de la cadena (`dt.marcacion_audit_verifies`) | Igual, con mejoras: el hash incluye el snapshot completo y el id de dispositivo; la cadena nace con la primera marca del tenant; verificación diaria con alerta a plataforma si se rompe |
| Las marcas no se borran ni se editan: se corrigen con trazabilidad | Soft delete (`deleted_at/by`), `is_modified`, `modified_by`, `modification_reason`; correcciones como filas aparte (`ops.marcacion_correcciones`) | Igual: una corrección es un hecho nuevo que referencia al original; el original sigue visible |
| Derecho de oposición del trabajador | Cada corrección queda **pendiente 48 h desde el sello de servidor**; el trabajador acepta u objeta desde su portal o desde un enlace público por correo (`/marcacion/oposicion/[token]`, identificándose con RUT); si vence sin respuesta se tiene por aceptada (cron `consolidar-marcaciones`, registro `vencida`, aviso por correo). Mientras está pendiente, reportes y nómina usan el valor anterior | Igual, como máquina de estados explícita: `pendiente → aceptada | objetada | vencida`. La ruta pública de oposición es intencional |
| Comprobante de marca al trabajador (Art. 12-13) | Envío obligatorio al correo del trabajador con hash, hora, lugar y método; copia al empleador configurable; si el trabajador no tiene correo personal se notifica al tenant | Igual; el comprobante es una plantilla de Comunicaciones (ADR-020) con el hash verificable públicamente |
| Carga manual de contingencia cuando el sistema no estuvo disponible | `origen_marca = contingencia`, autor, motivo obligatorio, evidencia opcional; misma aceptación de 48 h; se distingue en listados; no alimenta asistencia ni nómina hasta aceptarse | Igual |
| Incidentes técnicos del sistema | `dt.incidentes_tecnicos` (inicio, fin, descripción, severidad `total`/`parcial`) y "Reporte de incidentes técnicos" | Igual; además registro automático desde el monitoreo de disponibilidad |
| Acceso del inspector de la DT | Sesión temporal de inspector (`dt.dt_inspector_sessions`: usuario y contraseña temporales, vigencia, IP, flag `is_from_dt_network` para el rango oficial `200.72.242.0/27`), códigos de acceso por correo, registro de accesos; rol `inspector_dt` de solo lectura | Igual: portal de fiscalización de solo lectura, con sesión temporal auditada |
| Reportes obligatorios (Art. 28 g y siguientes) | Seis reportes: asistencia, jornada diaria, domingos y festivos, modificaciones y alteraciones de turnos, reporte diario, incidentes técnicos; más "Clientes del prestador (Art. 26)" y "Verificar marcación por hash". Cabecera: razón social, RUT empleador, trabajador, RUT, lugar. Siglas oficiales: A.I., A.J., AT, C.T., D.E.J., H.E., J.O., L.M., P.G.R, PREN., P.S.G.R., POSTN, S.A, VAC. Exportación a Excel, PDF y Word | Igual en contenido y formato; se generan desde los hechos (marcas, correcciones aceptadas, pautas) nunca desde datos paralelos |
| Respaldos (Art. 14 b) | Exportaciones periódicas de la bitácora a R2 con manifiesto y SHA-256 (`dt.marcacion_audit_exports`), retención mínima 5 años | Igual; política de retención declarada en el tenant |
| Jornada: límites legales (Ley 21.561, 42 h; DS 48/2024) | `ConfigJornada` por tenant con vigencia (semanal 42 h, diaria 12 h, extras 2 h), tope ordinario diario 10 h (Art. 28 CT); alertas: > 40 h semana (aviso), > límite semanal (crítico), > 12 h día, > 2 h extra; cálculo de turno nocturno y colación | Igual en `packages/domain` con tests; los límites son configuración vigente con fecha |
| Tipos de jornada | fija, por turnos, distribuida en ciclos, bisemanal, excepcional, parcial | Igual (catálogo del núcleo) |
| Métodos de marca | RUT+PIN (enlace público por código de instalación o QR), Face ID (AWS Rekognition, con `pin_fallback_reason` cuando cae a PIN), manual (contingencia), import; dispositivo emparejado (`device_pairing_id`) | Igual; el método y el motivo de fallback quedan en la marca |
| Idempotencia de la marca | `idempotency_key` con índice único parcial: un reintento no duplica | Igual, en toda escritura (ya es regla de 2.0) |

## 2. Lo que 1.0 hace y 2.0 debe conservar como principio

1. **La marca es un hecho**: servidor pone la hora, se guarda snapshot de empleador/establecimiento/mandante, hash, método, dispositivo, GPS como evidencia. Nada de eso se recalcula.
2. **Nada se borra**: soft delete, correcciones como hechos nuevos, bitácora encadenada append-only con triggers en Postgres, verificación periódica.
3. **El trabajador participa**: comprobante por correo, 48 h para oponerse a correcciones, portal propio.
4. **Reportes derivados**: los seis reportes DT se construyen desde los hechos, con el formato y siglas oficiales.
5. **Inspector**: acceso de solo lectura, temporal y auditado.
6. **Jornada**: límites legales configurables con vigencia y alertas tempranas.

## 3. Pendientes de certificación identificados (para 2.0)

- Verificación del reloj del servidor contra hora oficial (SHOA) y monitoreo de deriva: no identificado en 1.0 (estaba en el "Brief C" pendiente).
- Página legal y declaración de cumplimiento consistentes.
- Lo anterior entra en el módulo Asistencia de 2.0 desde su primer brief, no después.

## 4. Lo que NO se porta

- La integración de Slack con las marcas y rondas (canal de notificaciones, no requisito).
- El flujo público `/marcar/[code]` como está (se rediseña dentro del portal Trabajador y del dispositivo Terreno, manteniendo los dos métodos: enlace/QR público y dispositivo emparejado).
