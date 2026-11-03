import { useState } from "react";

import type { ConfigDte } from "./tipos";

export type FormDte = {
  ambiente: ConfigDte["ambiente"];
  rutEmisor: string;
  emisionProveedor: ConfigDte["emisionProveedor"];
  cesionProveedor: string;
  resolucionNumero: string;
  resolucionFecha: string;
  umbral: string;
  avisoCaf: string;
  fechaCorte: string;
};

export type SetFormDte = <K extends keyof FormDte>(clave: K, valor: FormDte[K]) => void;

/** Estado local del formulario de configuración DTE, sembrado desde la configuración vigente. */
export function useFormDte(cfg: ConfigDte | null): [FormDte, SetFormDte] {
  const [f, setF] = useState<FormDte>({
    ambiente: cfg?.ambiente ?? "certificacion",
    rutEmisor: cfg?.rutEmisor ?? "",
    emisionProveedor: cfg?.emisionProveedor ?? "simulado",
    cesionProveedor: cfg?.cesionProveedor ?? "",
    resolucionNumero: cfg?.resolucionSiiNumero != null ? String(cfg.resolucionSiiNumero) : "",
    resolucionFecha: cfg?.resolucionSiiFecha ?? "",
    umbral: String(cfg?.umbralFoliosPct ?? 20),
    avisoCaf: String(cfg?.avisoCafDias ?? 30),
    fechaCorte: cfg?.fechaCorte1_0 ?? "",
  });
  const set: SetFormDte = (clave, valor) => setF((prev) => ({ ...prev, [clave]: valor }));
  return [f, set];
}
