-- CAR-604: alerta por marca fuera de geocerca.
-- Qué hace y por qué: amplía el CHECK de asistencia.alertas.tipo con 'fuera_geocerca'. No crea tablas ni toca RLS.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "asistencia"."alertas" DROP CONSTRAINT "alertas_tipo_chk";
ALTER TABLE "asistencia"."alertas" ADD CONSTRAINT "alertas_tipo_chk"
  CHECK ("tipo" IN (
    'sin_marca_inicio', 'sin_marca_termino', 'compensables', 'sin_correo_personal',
    'descanso_insuficiente', 'limite_jornada', 'fuera_geocerca'
  ));

COMMIT;

-- Reversión: borrar alertas de ese tipo y restaurar el CHECK anterior, en este orden:
--   DELETE FROM "asistencia"."alertas" WHERE "tipo" = 'fuera_geocerca';
--   ALTER TABLE "asistencia"."alertas" DROP CONSTRAINT "alertas_tipo_chk";
--   ALTER TABLE "asistencia"."alertas" ADD CONSTRAINT "alertas_tipo_chk"
--     CHECK ("tipo" IN ('sin_marca_inicio', 'sin_marca_termino', 'compensables', 'sin_correo_personal', 'descanso_insuficiente'));