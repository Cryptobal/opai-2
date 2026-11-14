import { formatearFecha } from "@opai/domain";
import { CodigoQr, Pares } from "@opai/ds";

import type { Invitacion } from "./datos";
import { horario } from "./etiquetas";
import { Imprimir } from "./imprimir";

/**
 * Invitación de un visitante para un día (diseño `InvitacionQR`): nombre de la empresa, QR del día, datos de
 * la visita e instrucciones. El QR sirve una sola vez y solo ese día (R14).
 */
export function InvitacionQr({ inv, svg }: { inv: Invitacion; svg: string }) {
  return (
    <article className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 rounded-xl border border-border bg-surface p-6 text-center">
      <p className="t-overline">{inv.empresa}</p>
      <h2 className="t-heading">Invitación de acceso</h2>
      <p className="t-subheading">{inv.visitante}</p>
      <CodigoQr svg={svg} alt={`Código QR de acceso de ${inv.visitante}`} />
      <div className="w-full text-left">
        <Pares
          items={[
            {
              etiqueta: "Día",
              valor: `${formatearFecha(inv.dia)} · ${horario(inv.desdeMin, inv.hastaMin)}`,
            },
            { etiqueta: "Instalación", valor: inv.instalacion },
            { etiqueta: "Anfitrión", valor: inv.anfitrion },
          ]}
        />
      </div>
      <p className="t-caption">
        Muestra este código al guardia en la portería y lleva tu cédula o pasaporte. Es válido solo
        el día indicado.
      </p>
      <Imprimir />
    </article>
  );
}
