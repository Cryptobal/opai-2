-- Asistencia · alerta de descanso insuficiente (CAR-89, seguimiento de A3).
-- Qué hace y por qué: amplía el CHECK de asistencia.alertas.tipo con 'descanso_insuficiente' para poder registrar
-- (con clave única) el aviso de descanso entre jornadas bajo el mínimo. No crea tablas, no toca filas ni RLS.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "asistencia"."alertas" DROP CONSTRAINT "alertas_tipo_chk";
ALTER TABLE "asistencia"."alertas" ADD CONSTRAINT "alertas_tipo_chk"
  CHECK ("tipo" IN ('sin_marca_inicio', 'sin_marca_termino', 'compensables', 'sin_correo_personal', 'descanso_insuficiente'));

COMMIT;

-- Reversión: borrar las alertas de ese tipo y restaurar el CHECK anterior, en este orden:
--   DELETE FROM "asistencia"."alertas" WHERE "tipo" = 'descanso_insuficiente';
--   ALTER TABLE "asistencia"."alertas" DROP CONSTRAINT "alertas_tipo_chk";
--   ALTER TABLE "asistencia"."alertas" ADD CONSTRAINT "alertas_tipo_chk"
--     CHECK ("tipo" IN ('sin_marca_inicio', 'sin_marca_termino', 'compensables', 'sin_correo_personal'));
