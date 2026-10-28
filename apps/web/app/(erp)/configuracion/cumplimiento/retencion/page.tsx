import { Alerta, SeccionTarjeta } from "@opai/ds";

import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { AjustesConectados } from "../../_centro/ajustes-conectados";
import { cargarAjustes } from "../../_centro/ajustes-datos";
import { PaginaCumplimiento } from "../_componentes/pagina-cumplimiento";
import {
  type Ejecucion,
  type Regla,
  TablaEjecuciones,
  TablaReglas,
} from "../_componentes/tablas-retencion";

export const metadata = { title: "Retención de datos personales" };

type Politica = { activa: boolean; reglas: Regla[]; ejecuciones: Ejecucion[] };

/**
 * Datos personales · Retención (Brief 07d §4.5, CAR-39): la política por dato, lo que hizo o simuló
 * el trabajo diario y los ajustes (activación, plazos de retención y de atención). La política parte
 * APAGADA y los plazos son propuestas: se confirman con asesoría legal antes de activarla.
 */
export default function Retencion() {
  return (
    <PaginaCumplimiento
      pestana="retencion"
      cargar={async () => {
        const [r, ajustes] = await Promise.all([
          ejecutarComoUsuario<Politica>("erp", "core.cumplimiento.retencion_politica", {}),
          cargarAjustes("core", "Cumplimiento"),
        ]);
        return { state: estadoPantalla(r), politica: r.ok ? r.data : null, ajustes };
      }}
    >
      {(d, puede) =>
        d.politica ? (
          <>
            {d.politica.activa ? (
              <Alerta tono="warning" titulo="La política de retención está activa">
                Cada día se anonimiza o elimina lo vencido. Lo que la ley obliga a guardar se
                conserva.
              </Alerta>
            ) : (
              <Alerta tono="info" titulo="La política de retención está apagada">
                Cada día solo se simula y se registra lo que se haría, sin tocar datos. Los plazos
                son una propuesta: confírmalos con asesoría legal antes de activarla.
              </Alerta>
            )}
            <TablaReglas reglas={d.politica.reglas} />
            <TablaEjecuciones ejecuciones={d.politica.ejecuciones} />
            {puede.gestionar && d.ajustes.ok ? (
              <SeccionTarjeta titulo="Plazos y activación">
                {/* La versión y el texto del DPA son de plataforma (los publica OPAI): no van aquí. */}
                <AjustesConectados
                  campos={d.ajustes.campos.filter((c) => c.ambito === "tenant")}
                  valores={d.ajustes.valores}
                />
              </SeccionTarjeta>
            ) : null}
          </>
        ) : (
          <Alerta
            tono={d.state === "forbidden" ? "warning" : "danger"}
            titulo={
              d.state === "forbidden"
                ? "No tienes acceso a la política de retención."
                : "No se pudo cargar la política de retención."
            }
          />
        )
      }
    </PaginaCumplimiento>
  );
}
