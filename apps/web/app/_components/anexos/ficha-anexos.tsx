import { FileSignature } from "lucide-react";
import Link from "next/link";

import { Badge, Estado } from "@opai/ds";

import { fecha } from "@/lib/fechas";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { TITULO_MOTIVO, type Anexo } from "./tipos";

const TONO = { borrador: "warning", aprobado: "success", rechazado: "danger" } as const;

/** Tab Anexos de la ficha de persona (26-30, D16): historial de anexos de contrato, con el pendiente
 * primero. El detalle (aprobar/rechazar) vive en su propia ruta `[anexoId]`. */
export async function FichaAnexos({ personaId }: { personaId: string }) {
  const r = await ejecutarComoUsuario<Anexo[]>("erp", "core.anexos.list", { personaId });
  const items = r.ok ? r.data : [];
  return (
    <Estado
      state={r.ok && items.length === 0 ? "empty" : estadoPantalla(r)}
      variante="lista"
      textos={{
        vacio: {
          titulo: "Sin anexos de contrato",
          descripcion:
            "Un cambio de capa, monto, instalación o rol de esta persona genera aquí su borrador.",
        },
      }}
    >
      <ul className="overflow-hidden rounded-lg border border-border bg-surface">
        {items.map((a) => (
          <li key={a.id} className="border-b border-border last:border-b-0">
            <Link
              href={`/personas/${personaId}/anexos/${a.id}`}
              className="flex min-h-16 items-center gap-3 px-4 py-2.5 hover:bg-fill"
            >
              <span
                aria-hidden
                className="flex size-9 flex-none items-center justify-center rounded-md bg-fill text-fg-muted"
              >
                <FileSignature className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-medium text-fg">
                  {TITULO_MOTIVO[a.motivoCambio]}
                </span>
                <span className="block truncate text-sm text-fg-muted">
                  Generado el {fecha(a.creadoEn)}
                </span>
              </span>
              <Badge tono={TONO[a.estado]} punto>
                {a.estado}
              </Badge>
            </Link>
          </li>
        ))}
      </ul>
    </Estado>
  );
}
