import { Estado, FilaSeleccionable } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { diaLargo } from "@/lib/fechas";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { corto, type Matriz, pendientes } from "@/app/(erp)/personas/_componentes/tipos-matriz";

export const metadata = { title: "Hoy" };

/** Hoy del supervisor: personas con documentos vencidos, por vencer o faltantes. */
export default function Hoy() {
  return (
    <PaginaPortal
      portal="supervisor"
      titulo="Hoy"
      ruta="/supervisor"
      cargar={async () => {
        const r = await ejecutarComoUsuario<Matriz>("supervisor", "core.documentos.matriz", {
          soloPendientes: true,
        });
        return { state: estadoPantalla(r), m: r.ok ? r.data : null };
      }}
    >
      {({ state, m }) => {
        const nombre = (id: string) => m?.tipos.find((t) => t.id === id)?.nombre ?? "Documento";
        return (
          <div className="flex flex-col gap-3">
            <div className="md:hidden">
              <h2 className="t-title text-fg">Hoy</h2>
              <p className="text-base text-fg-muted">{diaLargo()}</p>
            </div>
            <h3 className="text-md font-semibold text-fg">Documentos pendientes</h3>
            <Estado
              state={state === "ready" && !m?.filas.length ? "empty" : state}
              variante="lista"
              textos={{
                vacio: {
                  titulo: "Todo al día",
                  descripcion: "Nadie tiene documentos vencidos ni por vencer.",
                },
              }}
            >
              <div className="-mx-4 border-y border-border bg-surface md:mx-0 md:rounded-lg md:border">
                {m?.filas.map((f) => (
                  <FilaSeleccionable
                    key={f.personaId}
                    href={`/supervisor/personas/${f.personaId}`}
                    Link={LinkNext}
                    titulo={f.nombre}
                    secundario={pendientes(f)
                      .map((c) => corto(nombre(c.tipoId)))
                      .join(" · ")}
                  />
                ))}
              </div>
            </Estado>
          </div>
        );
      }}
    </PaginaPortal>
  );
}
