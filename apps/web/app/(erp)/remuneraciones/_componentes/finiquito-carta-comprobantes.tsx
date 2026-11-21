import Link from "next/link";

import { Card } from "@opai/ds";

import type { DatosFiniquito } from "./finiquito-detalle";

/** Carta art. 162 y comprobante Mi DT en el detalle de finiquito. */
export function FiniquitoCartaComprobantes({ datos }: { datos: DatosFiniquito }) {
  return (
    <>
      <span className="t-label">Carta y comprobantes</span>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="flex flex-col gap-2 p-4">
          <span className="t-subheading">Carta art. 162</span>
          <span className="t-body-sm text-fg-muted">Carta al trabajador enviada a firma desde Documentos.</span>
          {datos.cartaArt162 ? (
            <p className="t-body-sm">
              {datos.cartaArt162.titulo} · estado {datos.cartaArt162.estadoFirma.replaceAll("_", " ")}
              <br />
              <Link href={`/documentos/firmas/${datos.cartaArt162.solicitudId}`} className="text-accent hover:underline">
                Ver solicitud de firma
              </Link>
            </p>
          ) : (
            <p className="t-body-sm text-fg-muted">Sin carta de término vinculada a esta persona.</p>
          )}
        </Card>
        <Card className="flex flex-col gap-2 p-4">
          <span className="t-subheading">Comprobante Mi DT</span>
          <span className="t-body-sm text-fg-muted">Archivo que subes al marcar el finiquito registrado.</span>
          {datos.comprobanteMiDt ? (
            <p className="t-body-sm">
              {datos.comprobanteMiDt.nombre} · registrado {datos.comprobanteMiDt.registradoEn}
              <br />
              <Link href={`/personas/${datos.personaId}/documentos`} className="text-accent hover:underline">
                Ver documentos de la persona
              </Link>
            </p>
          ) : (
            <p className="t-body-sm text-fg-muted">
              {datos.registradoMiDt
                ? "Registrado en Mi DT sin comprobante guardado."
                : "Sube el comprobante al marcar registrado en la lista de finiquitos."}
            </p>
          )}
        </Card>
      </div>
    </>
  );
}