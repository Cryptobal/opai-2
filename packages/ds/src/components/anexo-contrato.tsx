import { CheckCircle2, Clock, FileSignature, XCircle } from "lucide-react";
import type { ReactNode } from "react";

import { Alerta } from "../acceso/alerta";
import { Badge } from "./badge";

const MOTIVOS: Record<string, string> = {
  capa: "Cambio de capa de sueldo",
  monto: "Cambio de monto de sueldo",
  instalacion: "Cambio de instalación o puesto",
  rol: "Cambio de rol de turno",
};

export type EstadoAnexo = "borrador" | "aprobado" | "rechazado";

/** Aviso de estado del anexo de contrato en borrador (R11-R15, Brief 07b §9). */
export function AvisoAnexo({
  estado,
  motivoCambio,
  motivoRechazo,
}: {
  estado: EstadoAnexo;
  motivoCambio: string;
  motivoRechazo?: string | null;
}) {
  const motivo = MOTIVOS[motivoCambio] ?? motivoCambio;
  if (estado === "aprobado")
    return (
      <Alerta tono="success" icono={CheckCircle2} titulo={`${motivo}: anexo aprobado`}>
        El documento final quedó en Documentos con su huella SHA-256.
      </Alerta>
    );
  if (estado === "rechazado")
    return (
      <Alerta tono="danger" icono={XCircle} titulo={`${motivo}: anexo rechazado`}>
        {motivoRechazo ?? "Sin motivo registrado."}
      </Alerta>
    );
  return (
    <Alerta tono="warning" icono={Clock} titulo={`${motivo}: anexo en borrador`}>
      Revisa el cambio y apruébalo o recházalo con motivo.
    </Alerta>
  );
}

export type FilaAnexoDoc = { concepto: string; antes: string; despues: string };

/** Documento del anexo (plantilla base + marca, R12): antes/después, texto de ejemplo hasta el
 * texto legal definitivo (D15); en modo oscuro conserva su papel claro. */
export function DocumentoBorrador({
  filas,
  pieLegal,
}: {
  filas: readonly FilaAnexoDoc[];
  pieLegal?: ReactNode;
}) {
  // D15: el documento conserva su papel claro también en modo oscuro (es el papel del contrato, no
  // la UI); por eso fija sus propios colores en vez de los tokens de superficie del tema.
  return (
    <div className="rounded-lg border border-border bg-[#ffffff] p-4 text-[#111111] shadow-overlay dark:border-border-strong">
      <div className="mb-3 flex items-center gap-2 border-b border-[#dddddd] pb-3">
        <FileSignature className="size-4" aria-hidden />
        <p className="text-sm font-semibold">Anexo de contrato de trabajo</p>
        <Badge punto={false} className="ml-auto">
          Borrador
        </Badge>
      </div>
      {filas.length ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#dddddd] text-left">
              <th className="py-1.5 pr-3 font-medium">Concepto</th>
              <th className="py-1.5 pr-3 font-medium">Antes</th>
              <th className="py-1.5 font-medium">Después</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.concepto} className="border-b border-[#eeeeee] last:border-b-0">
                <td className="py-1.5 pr-3">{f.concepto}</td>
                <td className="py-1.5 pr-3 t-numeric">{f.antes}</td>
                <td className="py-1.5 t-numeric">{f.despues}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm opacity-70">Sin detalle de montos para este cambio.</p>
      )}
      <p className="mt-3 text-xs opacity-60">
        {pieLegal ?? "Texto de ejemplo (D15): el texto legal definitivo lo fija Carlos."}
      </p>
    </div>
  );
}
