import { Badge, SeccionTarjeta } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { haceCuanto } from "@/lib/fechas";

import { PaginaTenant } from "../pagina-tenant";

export const metadata = { title: "Integraciones de la empresa" };

const ESTADO = {
  configurada: { etiqueta: "Configurada", tono: "success" },
  error: { etiqueta: "Con error", tono: "danger" },
  no_configurada: { etiqueta: "No configurada", tono: "neutro" },
} as const;

/** Plataforma → empresa · Integraciones: estado de las de la empresa (lectura). */
export default function Pagina({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PaginaTenant params={params} tab="integraciones">
      {(_d, panel) => (
        <div className="flex flex-col gap-4">
          <SeccionTarjeta titulo="De la empresa" sinRelleno>
            {panel?.integraciones.length ? (
              <ul>
                {panel.integraciones.map((i) => {
                  const e = ESTADO[i.estado as keyof typeof ESTADO] ?? {
                    etiqueta: i.estado,
                    tono: "neutro" as const,
                  };
                  return (
                    <li
                      key={i.proveedor}
                      className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="t-mono text-base text-fg">{i.proveedor}</span>
                        <span className="t-caption truncate">
                          {i.modalidad === "plataforma" ? "De plataforma" : "Propia"}
                          {i.ultimoError
                            ? ` · ${i.ultimoError}`
                            : i.ultimoTestEn
                              ? ` · último test ${haceCuanto(i.ultimoTestEn)}`
                              : ""}
                        </span>
                      </span>
                      <Badge tono={e.tono}>{e.etiqueta}</Badge>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-4 py-4 text-base text-fg-muted">
                La empresa no ha configurado integraciones.
              </p>
            )}
          </SeccionTarjeta>
          <p className="t-caption">
            Las integraciones de la empresa se configuran en su Configuración → Integraciones.
          </p>
          <p className="text-base">
            <LinkNext
              href="/platform/ajustes/credenciales"
              className="text-fg underline underline-offset-2"
            >
              Ver credenciales de plataforma →
            </LinkNext>
          </p>
        </div>
      )}
    </PaginaTenant>
  );
}
