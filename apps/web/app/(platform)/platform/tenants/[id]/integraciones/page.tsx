import { Badge, SeccionTarjeta } from "@opai/ds";

import { exigirDatos } from "@/lib/carga";
import { haceCuanto } from "@/lib/fechas";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { PaginaTenant } from "../pagina-tenant";

export const metadata = { title: "Integraciones de la empresa" };

const ESTADO = {
  configurada: { etiqueta: "Configurada", tono: "success" },
  error: { etiqueta: "Con error", tono: "danger" },
  no_configurada: { etiqueta: "No configurada", tono: "neutro" },
} as const;

/** Plataforma → empresa · Integraciones: estado de las de la empresa y credenciales de plataforma. */
export default function Pagina({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PaginaTenant params={params} tab="integraciones">
      {async (_d, panel) => {
        const r = await ejecutarComoUsuario<{ proveedor: string; credencialPlataforma: boolean }[]>(
          "platform",
          "platform.integraciones.estado",
          {},
        );
        return (
          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
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
            <SeccionTarjeta titulo="Credenciales de plataforma en este entorno" sinRelleno>
              <ul>
                {exigirDatos(r).map((c) => (
                  <li
                    key={c.proveedor}
                    className="flex items-center justify-between border-b border-border px-4 py-3 last:border-b-0"
                  >
                    <span className="t-mono text-base text-fg">{c.proveedor}</span>
                    {c.credencialPlataforma ? (
                      <Badge tono="success">Disponible</Badge>
                    ) : (
                      <Badge>No disponible</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </SeccionTarjeta>
          </div>
        );
      }}
    </PaginaTenant>
  );
}
