/** Secciones editables de Laboral: campos y armado del input de cada capacidad (CAR-223). */
import { CAMPOS_BANCO } from "./campos-banco";
import { t, type ConfigSeccion, type SeccionLaboral } from "./campos-laboral";
import { HOJA_PAGO_AGREGAR } from "./config-hoja-pago-agregar";
import { HOJA_CONTACTO_LABORAL, HOJA_JORNADA_DT, HOJA_UNIFORME } from "./config-hojas-laboral-datos";

export type { CampoLaboral, ConfigSeccion, SeccionLaboral, TipoCampo } from "./campos-laboral";

export const SECCIONES_LABORAL: Record<SeccionLaboral, ConfigSeccion> = {
  prevision: {
    param: "editar-prevision",
    titulo: "Editar previsión",
    capacidad: "core.personas.prevision_actualizar",
    exito: "Previsión actualizada",
    boton: "Guardar",
    campos: [
      t("afp", "AFP", 80),
      t("regimen", "Régimen", 80),
      t("sistemaSalud", "Sistema de salud", 40),
      t("isapreNombre", "ISAPRE", 120),
      t("planIsapre", "Plan ISAPRE", 500),
      { clave: "planUf", etiqueta: "Plan (UF)", tipo: "decimal", max: 20 },
      { clave: "cotizacionUfPct", etiqueta: "Cotización UF", tipo: "decimal", max: 20 },
    ],
    armar: (id, c) => ({ id, ...c }),
  },
  uniforme: HOJA_UNIFORME,
  "jornada-dt": HOJA_JORNADA_DT,
  os10: {
    param: "editar-os10",
    titulo: "Editar OS-10",
    capacidad: "core.personas.laboral_actualizar",
    exito: "OS-10 actualizado",
    boton: "Guardar",
    campos: [
      t("credencial", "Credencial", 80),
      { clave: "venceEn", etiqueta: "Vence", tipo: "fecha" },
    ],
    armar: (id, c) => ({ id, os10: c }),
  },
  "contacto-laboral": HOJA_CONTACTO_LABORAL,
  pago: {
    param: "cambiar-pago",
    titulo: "Solicitar cambio de cuenta",
    capacidad: "core.personas.pago_solicitar_cambio",
    exito: "Solicitud registrada: queda pendiente de aprobación de RRHH",
    boton: "Solicitar cambio",
    todos: true,
    campos: [
      ...CAMPOS_BANCO,
      t("numeroCuenta", "Número de cuenta", 40, true),
      t("rutTitular", "RUT del titular (opcional)", 20),
    ],
    armar: (id, c) => ({ id, ...c }),
  },
  "pago-agregar": HOJA_PAGO_AGREGAR,
};
