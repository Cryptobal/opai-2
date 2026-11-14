/** Hojas de Uniforme, Jornada DT y Contacto de Laboral (CAR-223, campos de CAR-277). */
import { t, type CampoLaboral, type ConfigSeccion } from "./campos-laboral";

const entero = (clave: string, etiqueta: string, min: number, maxValor: number): CampoLaboral => ({
  clave,
  etiqueta,
  tipo: "entero",
  min,
  maxValor,
});

export const HOJA_UNIFORME: ConfigSeccion = {
  param: "editar-uniforme",
  titulo: "Editar uniforme",
  capacidad: "core.personas.laboral_actualizar",
  exito: "Uniforme actualizado",
  boton: "Guardar",
  campos: [
    t("tallaCamisa", "Camisa", 20),
    t("tallaPantalon", "Pantalón", 20),
    t("tallaChaqueta", "Chaqueta", 20),
    t("tallaPolera", "Polera", 20),
    t("tallaGeologo", "Geólogo", 20),
    t("tallaPolar", "Polar", 20),
    t("tallaZapato", "Calzado", 20),
    entero("estaturaCm", "Estatura (cm)", 100, 230),
    entero("pesoKg", "Peso (kg)", 30, 250),
    t("notas", "Notas", 500),
  ],
  armar: (id, c) => ({ id, uniforme: c }),
};

/** Jornada DT. Los períodos del contrato se registran aparte, como historia (CAR-409). */
export const HOJA_JORNADA_DT: ConfigSeccion = {
  param: "editar-jornada-dt",
  titulo: "Editar jornada DT",
  capacidad: "core.personas.laboral_actualizar",
  exito: "Jornada DT actualizada",
  boton: "Guardar",
  campos: [
    t("resolucion", "Resolución", 200),
    { clave: "resolucionVigenteDesde", etiqueta: "Vigente desde", tipo: "fecha" },
    { clave: "resolucionVigenteHasta", etiqueta: "Vigente hasta", tipo: "fecha" },
    t("horasSemanales", "Horas semanales", 10),
    t("distribucion", "Distribución", 200),
    { clave: "articulo22", etiqueta: "Artículo 22", tipo: "si_no" },
    entero("avisoTerminoDias", "Aviso de término (días)", 0, 365),
  ],
  armar: (id, c) => ({ id, jornadaDt: c }),
};

export const HOJA_CONTACTO_LABORAL: ConfigSeccion = {
  param: "editar-contacto-laboral",
  titulo: "Editar contacto laboral",
  capacidad: "core.personas.laboral_actualizar",
  exito: "Contacto laboral actualizado",
  boton: "Guardar",
  campos: [
    t("codigoInterno", "Código interno", 40),
    t("estadoCivil", "Estado civil", 40),
    t("telefonoSecundario", "Teléfono secundario", 20),
    t("movilizacion", "Movilización", 120),
    t("emergenciaNombre", "Contacto de emergencia", 120),
    t("emergenciaRelacion", "Relación", 80),
    t("emergenciaTelefono", "Teléfono de emergencia", 20),
  ],
  armar: (id, c) => ({ id, contacto: c }),
};
