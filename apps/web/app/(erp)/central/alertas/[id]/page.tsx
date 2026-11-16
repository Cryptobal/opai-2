import { DetailScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { haceCuanto } from "@/lib/fechas";
import { estadoPantalla } from "@/lib/formato";

import { cargarAlerta, cargarPropuestasAlerta, puedeAtender } from "../../_componentes/datos";
import { BadgeEstado, BadgeSeveridad } from "../../_componentes/etiquetas";
import { AccionesAlerta } from "./_componentes/acciones";
import { ControlAgente } from "./_componentes/control-agente";
import { BitacoraAlerta, QuePasoAlerta } from "./_componentes/contenido-ficha";
import { IntentosContacto } from "./_componentes/intentos-contacto";
import { PropuestasAgente } from "./_componentes/propuestas";

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
        const [r, atender, propuestas] = await Promise.all([cargarAlerta(id), puedeAtender(), cargarPropuestasAlerta(id)]);
        return { id, r, atender, propuestas };
      }}
      opciones={({ r }) => ({ titulo: r.ok ? r.data.alerta.titulo : "Alerta" })}
    >
      {({ id, r, atender, propuestas }) => {
        const a = r.ok ? r.data.alerta : null;
        const eventos = r.ok ? r.data.eventos : [];
        const intentos = r.ok ? r.data.intentos : [];
        const propsPendientes = propuestas.ok ? propuestas.data.items : [];
        return (
          <DetailScreen
            state={estadoPantalla(r, propuestas)}
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
            acciones={
              a && atender ? (
                <div className="flex w-full flex-col gap-2">
                  <AccionesAlerta id={id} estado={a.estado} />
                  <ControlAgente id={id} estado={a.estado} eventos={eventos} />
                </div>
              ) : undefined
            }
          >
            {a ? (
              <div className="flex flex-col gap-4">
                <QuePasoAlerta alerta={a} />
                {atender && propsPendientes.length > 0 ? <PropuestasAgente propuestas={propsPendientes} /> : null}
                {intentos.length > 0 ? <IntentosContacto intentos={intentos} /> : null}
                <BitacoraAlerta eventos={eventos} />
              </div>
            ) : null}
          </DetailScreen>
        );
      }}
    </PaginaPortal>
  );
}