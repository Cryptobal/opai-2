import { RefreshCw } from "lucide-react";

import {
  ETIQUETA_CAMPO_SII,
  textoFaltan,
  type CampoSii,
  type RequisitoFacturar,
} from "@opai/domain";
import { Button, type EstadoDatosSii } from "@opai/ds";

import { fecha } from "@/lib/fechas";

type Facturar = { lista: boolean; faltan: RequisitoFacturar[] };
export type Consulta = {
  estado: "ok" | "sin_inicio" | "no_encontrado" | "sin_respuesta" | "no_configurado";
  mensaje: string | null;
  campos: {
    campo: CampoSii;
    ficha: string | null;
    sii: string | null;
    estado: "igual" | "distinto" | "vacio_ficha" | "vacio_sii";
  }[];
  facturarAlAplicar: Facturar;
  origen: "cache" | "sii" | null;
  consultadoEn: string | null;
};

export function estadoDe(
  c: Consulta | null,
  error: string | null,
  reintentar: () => void,
): EstadoDatosSii {
  if (error)
    return {
      tipo: "error",
      titulo: "No se pudo consultar al SII",
      mensaje: error,
      onReintentar: reintentar,
    };
  if (!c) return { tipo: "cargando" };
  if (c.estado === "sin_respuesta")
    return {
      tipo: "error",
      titulo: "El SII no responde",
      mensaje: c.mensaje ?? "",
      onReintentar: reintentar,
    };
  if (c.estado === "no_encontrado")
    return { tipo: "error", titulo: "RUT sin registros en el SII", mensaje: c.mensaje ?? "" };
  if (c.estado === "no_configurado") return { tipo: "no_configurado", mensaje: c.mensaje ?? "" };
  const campos = c.campos.map((x) => ({ ...x, etiqueta: ETIQUETA_CAMPO_SII[x.campo] }));
  if (c.estado === "sin_inicio")
    return {
      tipo: "sin_inicio",
      mensaje:
        "El RUT existe pero no registra inicio de actividades. No se pueden emitir facturas a su nombre.",
    };
  const lista = c.facturarAlAplicar.lista;
  return {
    tipo: "ok",
    campos,
    lista,
    resumen: lista ? "Lista para facturar al aplicar" : textoFaltan(c.facturarAlAplicar.faltan),
  };
}

/**
 * De cuándo es la respuesta del SII (CAR-156: se guarda y se reutiliza mientras esté vigente) y
 * «Volver a consultar», que pregunta de nuevo si la guardada tiene más de 10 minutos.
 */
export function ConsultadoEn(p: { fecha: string; onRefrescar: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="t-caption">Respuesta del SII del {fecha(p.fecha)}.</p>
      <Button variant="ghost" onClick={p.onRefrescar}>
        <RefreshCw aria-hidden className="size-4" />
        Volver a consultar
      </Button>
    </div>
  );
}
