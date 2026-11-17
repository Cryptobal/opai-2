-- CAR-602: tipo de alerta para límites de jornada (Ley 21.561).
ALTER TABLE "asistencia"."alertas" DROP CONSTRAINT "alertas_tipo_chk";
ALTER TABLE "asistencia"."alertas" ADD CONSTRAINT "alertas_tipo_chk"
  CHECK ("tipo" IN (
    'sin_marca_inicio', 'sin_marca_termino', 'compensables', 'sin_correo_personal',
    'descanso_insuficiente', 'limite_jornada'
  ));