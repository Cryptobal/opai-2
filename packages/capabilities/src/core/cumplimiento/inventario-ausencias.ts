import { defineDatosPersonales } from "@opai/domain";

/** Registro de ausencias de la persona (CAR-393): permisos, licencias, vacaciones y ausencias. */
export const INVENTARIO_AUSENCIAS = defineDatosPersonales("core", [
  {
    tabla: "ausencias",
    finalidad:
      "Permisos, licencias, vacaciones y ausencias de la persona trabajadora, para la pauta, la asistencia y las remuneraciones. El motivo va sin diagnósticos y su lectura queda auditada.",
    categorias: ["laboral"],
    campos: ["tipo", "desde", "hasta", "motivo", "estado"],
    baseLicitud: "relacion_laboral",
  },
]);
