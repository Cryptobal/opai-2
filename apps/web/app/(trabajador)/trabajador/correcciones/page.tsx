import { CheckCircle } from "lucide-react";

import { Empty } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { tituloPagina } from "@/app/_components/portales";
import { itemsYZonaCorrecciones } from "@/lib/asistencia-correcciones-portal";
import { conFiltros, leerParametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { estadoTrabajador } from "../_componentes/estado";
import { EstadoLista } from "../_componentes/estado-lista";
import { TarjetaCorreccion } from "./_componentes/respuesta";
import type { Fila } from "./_componentes/tipos";

export const metadata = { title: tituloPagina("trabajador", "Correcciones") };

export default async function Pagina({ searchParams }: { searchParams: SearchParams }) {
  const parametros = await leerParametros(searchParams);
  const cursor = parametros.cursor;
  return (
    <PaginaPortal
      portal="trabajador"
      titulo="Correcciones"
      ruta="/trabajador/correcciones"
      cargar={async () => {
        const [lista, hoy] = await Promise.all([
          ejecutarComoUsuario<{ items: Fila[]; siguiente: string | null }>("trabajador", "asistencia.correcciones.listar", { estado: "pendiente", ...(cursor ? { cursor } : {}) }),
          ejecutarComoUsuario<{ zona: string }>("trabajador", "asistencia.dias.hoy", {}),
        ]);
        return { state: estadoTrabajador(lista), ...itemsYZonaCorrecciones(lista, hoy), siguiente: lista.ok ? lista.data.siguiente : null };
      }}
    >
      {({ state, items, zona, siguiente }) => (
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
          {siguiente ? <EnlaceBoton variante="secondary" href={conFiltros("/trabajador/correcciones", { ...parametros, cursor: siguiente })}>Cargar más</EnlaceBoton> : null}
        </EstadoLista>
      )}
    </PaginaPortal>
  );
}