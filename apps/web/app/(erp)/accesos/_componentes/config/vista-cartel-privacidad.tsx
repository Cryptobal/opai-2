import { Button, CodigoQr } from "@opai/ds";

import type { CartelPrivacidad } from "./cartel-accion";

export function VistaCartelPrivacidad({ cartel }: { cartel: CartelPrivacidad }) {
  return (
    <article className="rounded-lg border border-border bg-bg p-4 print:border-0">
      <p className="t-caption mb-1">{cartel.empresa}</p>
      <h2 className="t-title mb-2">{cartel.instalacion}</h2>
      {cartel.punto ? <p className="t-body mb-2">{cartel.punto}</p> : null}
      <p className="t-body mb-4 whitespace-pre-wrap">{cartel.aviso}</p>
      <CodigoQr svg={cartel.qrSvg} alt="QR a la política de privacidad" className="mx-auto" />
      <p className="t-caption mt-2 break-all text-center text-fg-muted">{cartel.urlPolitica}</p>
      <Button className="mt-4 print:hidden" onClick={() => window.print()}>
        Imprimir o guardar PDF
      </Button>
    </article>
  );
}