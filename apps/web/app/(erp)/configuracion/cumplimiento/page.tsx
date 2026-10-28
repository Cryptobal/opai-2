import { Alerta } from "@opai/ds";

import { cargarResumen } from "./_componentes/datos";
import { DialogoDpa, HojaDpo } from "./_componentes/diferidas";
import { PaginaCumplimiento } from "./_componentes/pagina-cumplimiento";
import { TarjetaDpa } from "./_componentes/tarjeta-dpa";
import { TarjetaDpo } from "./_componentes/tarjeta-dpo";
import { TarjetaRat } from "./_componentes/tarjeta-rat";

export const metadata = { title: "Datos personales" };

/** Datos personales · Resumen: DPA, DPO y RAT (Ley 21.719, Brief 07d bloque 3/7-UI). */
export default function Cumplimiento() {
  return (
    <PaginaCumplimiento pestana="resumen" cargar={cargarResumen}>
      {(d, puede) =>
        d.estado ? (
          <>
            <TarjetaDpa e={d.estado} aceptar={puede.aceptarDpa} />
            <TarjetaDpo dpo={d.estado.dpo} editar={puede.gestionar} />
            {d.rat ? (
              <TarjetaRat actividades={d.rat.actividades} propuestas={d.rat.basesPropuestas} />
            ) : null}
            {puede.aceptarDpa && d.estado.pendiente && d.texto ? (
              <DialogoDpa texto={d.texto} />
            ) : null}
            {puede.gestionar ? <HojaDpo dpo={d.estado.dpo} /> : null}
          </>
        ) : (
          <Alerta
            tono={d.state === "forbidden" ? "warning" : "danger"}
            titulo={
              d.state === "forbidden"
                ? "No tienes acceso a los datos personales de la empresa."
                : "No se pudo cargar el estado de cumplimiento."
            }
          />
        )
      }
    </PaginaCumplimiento>
  );
}
