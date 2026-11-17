import { Empty } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { tituloPagina } from "@/app/_components/portales";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { estadoTrabajador } from "../_componentes/estado";
import { EstadoLista } from "../_componentes/estado-lista";
import { TarjetaRespuesta } from "./_componentes/respuesta";
import type { Fila } from "./_componentes/tipos";

export const metadata = { title: tituloPagina("trabajador", "Contingencias") };

export default function Pagina() {
  return (
    <PaginaPortal
      portal="trabajador"
      titulo="Contingencias"
      ruta="/trabajador/contingencias"
      cargar={async () => {
        const [lista, hoy] = await Promise.all([
          ejecutarComoUsuario<{ items: Fila[] }>("trabajador", "asistencia.contingencias.listar", { estado: "pendiente" }),
          ejecutarComoUsuario<{ zona: string }>("trabajador", "asistencia.dias.hoy", {}),
        ]);
        return {
          state: estadoTrabajador(lista),
          items: lista.ok ? lista.data.items : [],
          zona: hoy.ok ? hoy.data.zona : "America/Santiago",
        };
      }}
    >
      {({ state, items, zona }) => (
        <EstadoLista state={state}>
          {items.length === 0 ? (
            <Empty icon="check-circle" title="No tienes contingencias pendientes" description="Si RR. HH. propone una marca a tu nombre, aparecerá aquí." />
          ) : (
            <div className="flex flex-col gap-4">
              {items.map((item) => (
                <TarjetaRespuesta key={item.id} item={item} zona={zona} />
              ))}
            </div>
          )}
        </EstadoLista>
      )}
    </PaginaPortal>
  );
}