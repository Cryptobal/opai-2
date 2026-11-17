-- CAR-604: alerta por marca fuera de geocerca.
ALTER TABLE "asistencia"."alertas" DROP CONSTRAINT "alertas_tipo_chk";
ALTER TABLE "asistencia"."alertas" ADD CONSTRAINT "alertas_tipo_chk"
  CHECK ("tipo" IN (
    'sin_marca_inicio', 'sin_marca_termino', 'compensables', 'sin_correo_personal',
    'descanso_insuficiente', 'fuera_geocerca'
  ));