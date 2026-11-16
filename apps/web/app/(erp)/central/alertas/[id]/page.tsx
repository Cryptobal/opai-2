import { DetailScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { haceCuanto } from "@/lib/fechas";
import { estadoPantalla } from "@/lib/formato";

import { cargarAlerta, puedeAtender } from "../../_componentes/datos";
import { BadgeEstado, BadgeSeveridad } from "../../_componentes/etiquetas";
import { AccionesAlerta } from "./_componentes/acciones";
import { ContenidoFicha } from "./_componentes/contenido-ficha";

export const metadata = { title: "Alerta" };
type Props = { params: Promise<{ id: string }> };

/** Ficha de la alerta (spec §3): qué pasó, la bitácora y las acciones, en una sola pantalla con secciones. */
export default function AlertaFicha({ params }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Alerta"
      ruta="/central"
      cargar={async () => {
        const { id } = await params;
        const [r, atender] = await Promise.all([cargarAlerta(id), puedeAtender()]);
        return { id, r, atender };
      }}
      opciones={({ r }) => ({ titulo: r.ok ? r.data.alerta.titulo : "Alerta" })}
    >
      {({ id, r, atender }) => {
        const a = r.ok ? r.data.alerta : null;
        const eventos = r.ok ? r.data.eventos : [];
        return (
          <DetailScreen
            state={estadoPantalla(r)}
            titulo={a?.titulo ?? "Alerta"}
            subtitulo={a ? `${a.instalacionNombre ?? "Instalación"} · ${haceCuanto(a.createdAt)}` : undefined}
            estado={
              a ? (
                <span className="flex items-center gap-2">
                  <BadgeSeveridad severidad={a.severidad} />
                  <BadgeEstado estado={a.estado} />
                </span>
              ) : undefined
            }
            acciones={a && atender ? <AccionesAlerta id={id} estado={a.estado} /> : undefined}
          >
            {a ? <ContenidoFicha alerta={a} eventos={eventos} /> : null}
          </DetailScreen>
        );
      }}
    </PaginaPortal>
  );
}