import { Alerta } from "@opai/ds";

import { estadoPantalla, fechaHora } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { type EventoPlataforma, ListaAuditoria } from "../../../_componentes/lista-auditoria";
import { PaginaTenant } from "../pagina-tenant";

export const metadata = { title: "Auditoría de la empresa" };

type Cadena = {
  ultimoSeq: number | null;
  verificadaEn: string | null;
  verificacionOk: boolean | null;
};

function textoCadena(nombre: string, c: Cadena | null) {
  if (!c) return `${nombre}: sin datos`;
  if (c.verificacionOk === false) return `${nombre}: la última verificación encontró un quiebre`;
  if (!c.verificadaEn) return `${nombre}: aún sin verificar (${c.ultimoSeq ?? 0} registros)`;
  return `${nombre}: íntegra, verificada el ${fechaHora(c.verificadaEn)} (${c.ultimoSeq ?? 0} registros)`;
}

/**
 * Plataforma → empresa · Auditoría (CAR-323): las acciones de plataforma sobre esta empresa y el estado
 * de sus cadenas de auditoría y bitácora. Solo lectura.
 */
export default function Pagina({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PaginaTenant params={params} tab="auditoria">
      {async (d) => {
        const tenantId = d.tenant.id;
        // En secuencia: el pool de conexiones es chico (hoja de Plataforma §2.2).
        const r = await ejecutarComoUsuario<{ eventos: EventoPlataforma[] }>(
          "platform",
          "platform.auditoria.list",
          { tenantId, limite: 100 },
        );
        const auditoria = await ejecutarComoUsuario<Cadena>(
          "platform",
          "platform.auditoria.estado",
          { tenantId },
        );
        const bitacora = await ejecutarComoUsuario<Cadena>("platform", "platform.bitacora.estado", {
          tenantId,
        });
        const quiebre =
          (auditoria.ok && auditoria.data.verificacionOk === false) ||
          (bitacora.ok && bitacora.data.verificacionOk === false);
        return (
          <div className="flex flex-col gap-4">
            <Alerta tono={quiebre ? "danger" : "info"} titulo="Estado de las cadenas">
              <ul className="t-body-sm flex flex-col gap-1">
                <li>{textoCadena("Auditoría", auditoria.ok ? auditoria.data : null)}</li>
                <li>{textoCadena("Bitácora", bitacora.ok ? bitacora.data : null)}</li>
              </ul>
            </Alerta>
            <ListaAuditoria
              state={estadoPantalla(r)}
              items={r.ok ? r.data.eventos : []}
              empresas={new Map([[tenantId, d.tenant.nombre]])}
              conEmpresa={false}
            />
          </div>
        );
      }}
    </PaginaTenant>
  );
}
