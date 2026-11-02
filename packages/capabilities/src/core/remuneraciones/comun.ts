import type { Indicador, ValorIndicador } from "@opai/domain";

type FilaPublicado = {
  vigenteDesde: Date;
  vigenteHasta: Date | null;
  estado: string;
  valorJson: unknown;
  indicador: { clave: string };
  fuente?: string | null;
  consultadaEl?: Date | null;
  verificacion?: string | null;
  evidencia?: string | null;
  motivo?: string | null;
};

export function fechaCivil(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseTopes(json: Record<string, unknown>) {
  const { ipsPorVerificar: _, ...topes } = json;
  return topes as ValorIndicador<"topes">["valor"];
}

export function publicacionDesdeFila(f: FilaPublicado): ValorIndicador {
  const clave = f.indicador.clave as Indicador;
  let valor = f.valorJson;
  let verificacion: "verificado" | "por_verificar" =
    f.verificacion === "por_verificar" ? "por_verificar" : "verificado";
  if (clave === "topes" && typeof f.valorJson === "object" && f.valorJson !== null) {
    const j = f.valorJson as Record<string, unknown>;
    if (j.ipsPorVerificar === true) verificacion = "por_verificar";
    valor = parseTopes(j);
  }
  return {
    indicador: clave,
    valor,
    vigenteDesde: fechaCivil(f.vigenteDesde),
    vigenteHasta: f.vigenteHasta ? fechaCivil(f.vigenteHasta) : undefined,
    fuente: f.fuente ?? f.evidencia ?? f.motivo ?? "Empresa",
    consultadaEl: f.consultadaEl ? fechaCivil(f.consultadaEl) : undefined,
    verificacion,
    estado: f.estado as ValorIndicador["estado"],
  } as ValorIndicador;
}
