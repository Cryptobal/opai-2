import { CheckCircle } from "lucide-react";

import { Empty } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { tituloPagina } from "@/app/_components/portales";
import { itemsYZonaCorrecciones } from "@/lib/asistencia-correcciones-portal";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { estadoTrabajador } from "../_componentes/estado";
import { EstadoLista } from "../_componentes/estado-lista";
import { TarjetaCorreccion } from "./_componentes/respuesta";
import type { Fila } from "./_componentes/tipos";

export const metadata = { title: tituloPagina("trabajador", "Correcciones") };

export default function Pagina() {
  return (
    <PaginaPortal
      portal="trabajador"
      titulo="Correcciones"
      ruta="/trabajador/correcciones"
      cargar={async () => {
        const [lista, hoy] = await Promise.all([
          ejecutarComoUsuario<{ items: Fila[] }>("trabajador", "asistencia.correcciones.listar", { estado: "pendiente" }),
          ejecutarComoUsuario<{ zona: string }>("trabajador", "asistencia.dias.hoy", {}),
        ]);
        return { state: estadoTrabajador(lista), ...itemsYZonaCorrecciones(lista, hoy) };
      }}
    >
      {({ state, items, zona }) => (
        <EstadoLista state={state}>
          {items.length === 0 ? (
            <Empty
              icono={<CheckCircle className="size-6" aria-hidden />}
              titulo="No tienes correcciones pendientes"
              descripcion="Si tu empleador propone cambiar una marca, aparecerá aquí."
            />
          ) : (
            <div className="flex flex-col gap-4">
              {items.map((item) => (
                <TarjetaCorreccion key={item.correccionId} item={item} zona={zona} />
              ))}
            </div>
          )}
        </EstadoLista>
      )}
    </PaginaPortal>
  );
}