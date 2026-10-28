import { Plus } from "lucide-react";

import { Alerta, Badge, SeccionTarjeta, Table, Td, Th, Tr } from "@opai/ds";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { fechaHora } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { RevocarConsentimiento } from "./revocar-consentimiento";

type Consentimientos = {
  vigentes: { proposito: string; estado: string; desde: string }[];
  historial: {
    id: string;
    proposito: string;
    estado: string;
    versionAviso: string;
    creadoEn: string;
  }[];
};

export const PROPOSITOS: Record<string, string> = {
  comunicaciones_comerciales: "Comunicaciones comerciales",
  encuestas: "Encuestas de satisfacción",
  eventos: "Invitaciones a eventos",
};
const proposito = (p: string) => PROPOSITOS[p] ?? p.replace(/_/g, " ");

type Props = { titular: { tipo: "persona" | "contacto"; id: string }; gestionar: boolean };

/**
 * Consentimientos de un titular (Ley 21.719, Brief 07d §8): el estado vigente por fin accesorio y su
 * historial append-only. Solo fines accesorios (§16.2): la relación laboral no se apoya en
 * consentimiento. Registrar y revocar son `soloPersonas`; sin `cumplimiento.read` no se muestra nada.
 */
export async function ConsentimientosTitular({ titular, gestionar }: Props) {
  const r = await ejecutarComoUsuario<Consentimientos>(
    "erp",
    "core.cumplimiento.consentimientos_listar",
    {
      titular,
    },
  );
  if (!r.ok && r.error.code === "FORBIDDEN") return null;
  const accion = gestionar ? (
    <EnlaceBotonHoja href="?consentimiento=1" icono={Plus} variante="secondary">
      Registrar
    </EnlaceBotonHoja>
  ) : null;
  return (
    <SeccionTarjeta titulo="Consentimientos" {...(accion ? { accion } : {})}>
      {!r.ok ? (
        <Alerta tono="danger" titulo={r.error.message} />
      ) : r.data.vigentes.length === 0 ? (
        <p className="text-base text-fg-muted">
          Sin consentimientos registrados. Solo se piden para fines accesorios, como comunicaciones
          comerciales; la relación laboral no depende de ellos.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col gap-2">
            {r.data.vigentes.map((v) => (
              <li key={v.proposito} className="flex min-h-11 flex-wrap items-center gap-2">
                <span className="flex-1 text-base text-fg">{proposito(v.proposito)}</span>
                <Badge tono={v.estado === "otorgado" ? "success" : "neutro"}>
                  {v.estado === "otorgado" ? "Otorgado" : "Revocado"}
                </Badge>
                {gestionar && v.estado === "otorgado" ? (
                  <RevocarConsentimiento
                    titular={titular}
                    proposito={v.proposito}
                    nombre={proposito(v.proposito)}
                  />
                ) : null}
              </li>
            ))}
          </ul>
          <Table>
            <thead>
              <tr>
                <Th>Fin</Th>
                <Th>Hecho</Th>
                <Th>Aviso</Th>
                <Th>Cuándo</Th>
              </tr>
            </thead>
            <tbody>
              {r.data.historial.map((h) => (
                <Tr key={h.id}>
                  <Td>{proposito(h.proposito)}</Td>
                  <Td>{h.estado === "otorgado" ? "Otorgó" : "Revocó"}</Td>
                  <Td className="t-mono">{h.versionAviso}</Td>
                  <Td className="t-numeric">{fechaHora(h.creadoEn)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </SeccionTarjeta>
  );
}
