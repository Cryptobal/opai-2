import { ChevronRight, FileText } from "lucide-react";
import { headers } from "next/headers";

import { SeccionTarjeta, Tabs } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { PaginaConfig } from "../../_centro/pagina-config";
import { BotonCopiar } from "./boton-copiar";
import { MANUAL, snippets } from "./snippets";

export const metadata = { title: "Conectar tu IA" };

const Paso = ({ n }: { n: number }) => (
  <span className="flex size-6 flex-none items-center justify-center rounded-full border border-border-strong text-xs font-semibold text-fg">
    {n}
  </span>
);

/** Conectar tu IA (26): URL del servidor MCP, key y configuración por asistente. */
export default function Conectar() {
  return (
    <PaginaConfig
      seccion="agentes"
      titulo="Conectar tu IA"
      cabecera={() => ({
        subtitulo:
          "Todo lo que ves en OPAI también se opera desde tu asistente, con los mismos permisos de la key.",
      })}
      cargar={async () => {
        const [h, t] = await Promise.all([
          headers(),
          ejecutarComoUsuario<{ nombre: string; slug: string }>("erp", "core.tenant.get"),
        ]);
        const host = h.get("x-forwarded-host") ?? h.get("host") ?? "test.opai.cl";
        const proto =
          h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
        return { url: `${proto}://${host}/api/mcp`, empresa: t.ok ? t.data : null };
      }}
    >
      {({ url, empresa }) => (
        <div className="flex max-w-[720px] flex-col gap-4">
          <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
            <div className="flex gap-3">
              <Paso n={1} />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="text-base font-medium text-fg">Copia la URL del servidor MCP</p>
                <p className="t-caption">
                  La misma para todas las empresas: la key identifica a{" "}
                  {empresa?.nombre ?? "tu empresa"}
                  {empresa ? ` (${empresa.slug})` : ""}
                </p>
                <div className="flex gap-2">
                  <p className="t-mono flex min-h-11 min-w-0 flex-1 items-center truncate rounded-md border border-border bg-bg px-3 text-sm text-fg">
                    {url}
                  </p>
                  <BotonCopiar texto={url} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Paso n={2} />
              <p className="flex-1 text-base font-medium text-fg">
                Usa una key con los scopes que necesita tu asistente
              </p>
              <EnlaceBoton href="/configuracion/agentes?crear=1" variante="ghost">
                Crear key
              </EnlaceBoton>
            </div>
          </section>
          <SeccionTarjeta titulo="3 · Agrega OPAI a tu asistente">
            <Tabs
              tabs={snippets(url, empresa?.nombre ?? "tu empresa").map((s) => ({
                id: s.id,
                etiqueta: s.etiqueta,
                contenido: (
                  <div className="flex flex-col gap-3">
                    <p className="text-base text-fg-muted">{s.paso}</p>
                    <div className="relative rounded-md border border-border bg-fill p-3">
                      <pre className="t-mono overflow-x-auto pr-24 text-sm text-fg">{s.codigo}</pre>
                      <span className="absolute top-2 right-2">
                        <BotonCopiar texto={s.codigo} />
                      </span>
                    </div>
                    <p className="t-caption">
                      Lectura libre · escritura con vista previa · irreversible con aprobación
                      (ADR-032)
                    </p>
                  </div>
                ),
              }))}
            />
          </SeccionTarjeta>
          <EnlaceBoton
            href={MANUAL}
            variante="secondary"
            icono={FileText}
            className="h-auto justify-start py-3"
          >
            <span className="flex flex-1 flex-col items-start text-left">
              <span>Manual: Operar el núcleo desde un agente</span>
              <span className="t-caption font-normal">
                Capacidades, previews, aprobaciones y límites
              </span>
            </span>
            <ChevronRight className="size-4" aria-hidden />
          </EnlaceBoton>
        </div>
      )}
    </PaginaConfig>
  );
}
