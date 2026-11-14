// Borrador de la hoja «Prerregistrar visita» (CAR-478, diseño `Prerregistrar`).
import { minutos } from "../../_componentes/borrador-entrada";

export type VisitanteB = {
  nombre: string;
  docTipo: string;
  numero: string;
  pais: string;
  empresa: string;
  patente: string;
};

export type BorradorPrerregistro = {
  instalacionId: string;
  desde: string;
  hasta: string;
  horaDesde: string;
  horaHasta: string;
  anfitrion: string;
  motivo: string;
  nota: string;
  avisar: boolean;
  visitantes: VisitanteB[];
};

export const VISITANTE_VACIO: VisitanteB = {
  nombre: "",
  docTipo: "run",
  numero: "",
  pais: "",
  empresa: "",
  patente: "",
};

export const vacio = (instalacionId: string, hoy: string): BorradorPrerregistro => ({
  instalacionId,
  desde: hoy,
  hasta: "",
  horaDesde: "",
  horaHasta: "",
  anfitrion: "",
  motivo: "",
  nota: "",
  avisar: false,
  visitantes: [VISITANTE_VACIO],
});

const DIA_MS = 86_400_000;
const dias = (b: BorradorPrerregistro) =>
  (Date.parse(`${b.hasta || b.desde}T00:00:00Z`) - Date.parse(`${b.desde}T00:00:00Z`)) / DIA_MS + 1;

/** Qué falta para poder guardar (o null), dicho en la hoja en vez de fallar al enviar. */
export function avisoPrerregistro(b: BorradorPrerregistro): string | null {
  if (!b.instalacionId) return "Elige la instalación.";
  if (!b.desde) return "Elige la fecha de la visita.";
  if (b.hasta && b.hasta < b.desde) return "La fecha de término es antes de la de inicio.";
  if (dias(b) > 30) return "El rango no puede superar 30 días.";
  if (Boolean(b.horaDesde) !== Boolean(b.horaHasta)) return "El horario necesita desde y hasta.";
  if (b.horaDesde && b.horaDesde >= b.horaHasta)
    return "El horario debe terminar después de empezar.";
  if (b.anfitrion.trim().length < 2) return "Indica el anfitrión.";
  const v = b.visitantes.find((x) => x.nombre.trim().length < 2 || !x.numero.trim());
  if (v) return "Cada visitante necesita nombre y documento.";
  if (b.visitantes.some((x) => x.docTipo !== "run" && x.pais.trim().length < 2))
    return "Indica el país de cada pasaporte o documento extranjero.";
  return null;
}

/** «Se registrarán 2 visitantes · válido del 30-10-2026 al 01-11-2026». */
export const cuantos = (b: BorradorPrerregistro) =>
  `${b.visitantes.length} ${b.visitantes.length === 1 ? "visitante" : "visitantes"} · ${dias(b)} ${dias(b) === 1 ? "día" : "días"}`;

/** Entrada de `acceso.prerregistros.crear` a partir del borrador. */
export function entradaPrerregistro(b: BorradorPrerregistro) {
  return {
    instalacionId: b.instalacionId,
    desde: b.desde,
    ...(b.hasta && b.hasta !== b.desde ? { hasta: b.hasta } : {}),
    ...(b.horaDesde && b.horaHasta
      ? { desdeMin: minutos(b.horaDesde), hastaMin: minutos(b.horaHasta) }
      : {}),
    anfitrion: b.anfitrion.trim(),
    ...(b.motivo.trim() ? { motivo: b.motivo.trim() } : {}),
    ...(b.nota.trim() ? { nota: b.nota.trim() } : {}),
    avisarLlegada: b.avisar,
    visitantes: b.visitantes.map((v) => ({
      nombre: v.nombre.trim(),
      documento: {
        tipo: v.docTipo,
        numero: v.numero.trim(),
        ...(v.docTipo !== "run" && v.pais ? { pais: v.pais } : {}),
      },
      ...(v.empresa.trim() ? { empresa: v.empresa.trim() } : {}),
      ...(v.patente.trim() ? { patente: v.patente.trim() } : {}),
    })),
  };
}
