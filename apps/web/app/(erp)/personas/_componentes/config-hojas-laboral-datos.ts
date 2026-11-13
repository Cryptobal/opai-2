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

/**
 * Jornada DT (CAR-277): los términos de los 3 períodos de plazo fijo se editan juntos, así que la hoja
 * envía todos sus campos; el período y el término vigente se derivan de la lista en la capacidad.
 */
export const HOJA_JORNADA_DT: ConfigSeccion = {
  param: "editar-jornada-dt",
  titulo: "Editar jornada DT",
  capacidad: "core.personas.laboral_actualizar",
  exito: "Jornada DT actualizada",
  boton: "Guardar",
  todos: true,
  campos: [
    t("resolucion", "Resolución", 200),
    { clave: "resolucionVigenteDesde", etiqueta: "Vigente desde", tipo: "fecha" },
    { clave: "resolucionVigenteHasta", etiqueta: "Vigente hasta", tipo: "fecha" },
    t("horasSemanales", "Horas semanales", 10),
    t("distribucion", "Distribución", 200),
    { clave: "articulo22", etiqueta: "Artículo 22", tipo: "si_no" },
    { clave: "termino1", etiqueta: "Término del 1.er plazo fijo", tipo: "fecha" },
    { clave: "termino2", etiqueta: "Término del 2.º plazo fijo", tipo: "fecha" },
    { clave: "termino3", etiqueta: "Término del 3.er plazo fijo", tipo: "fecha" },
    entero("avisoTerminoDias", "Aviso de término (días)", 0, 365),
  ],
  armar: (id, c) => {
    const { termino1, termino2, termino3, ...resto } = c;
    const terminos = [termino1, termino2, termino3].filter((x): x is string => typeof x === "string" && x !== "");
    return { id, jornadaDt: { ...resto, terminosPlazoFijo: terminos } };
  },
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
