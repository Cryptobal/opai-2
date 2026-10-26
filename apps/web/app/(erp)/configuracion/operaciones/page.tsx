import { Plus } from "lucide-react";

import { Alerta, Empty, Segmentado } from "@opai/ds";
import { esRol, PERMISOS_CORE, tienePermiso } from "@opai/domain";

import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { PaginaConfig } from "../_centro/pagina-config";
import { HojaFuncion, HojaPatron } from "./diferidas";
import { ListaFunciones, ListaPatrones } from "./lista-operaciones";
import type { Funcion, Patron, Tab } from "./tipos";

export const metadata = { title: "Patrones y funciones" };

const puede = (rol: string | null, permiso: string) =>
  Boolean(rol && esRol(rol) && tienePermiso(rol, permiso));

/** Configuración › Patrones de turno y Funciones (Brief 11, diseño DS 2.0 t436u). */
export default function Operaciones({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaConfig
      seccion="operaciones"
      titulo="Patrones y funciones"
      cargar={async () => {
        const p = await leerParametros(searchParams);
        const tab: Tab = p["tab"] === "funciones" ? "funciones" : "patrones";
        const [rp, rf] = await Promise.all([
          ejecutarComoUsuario<Patron[]>("erp", "core.patrones.list", { incluirInactivos: true }),
          ejecutarComoUsuario<Funcion[]>("erp", "core.funciones.list", { incluirInactivos: true }),
        ]);
        return { tab, rp, rf, editar: p["editar"] };
      }}
      cabecera={({ tab, rp, rf }, indice) => {
        const vacio = tab === "patrones" ? rp.ok && rp.data.length === 0 : rf.ok && rf.data.length === 0;
        const permiso = tab === "patrones" ? PERMISOS_CORE.patronesManage : PERMISOS_CORE.funcionesManage;
        return {
          subtitulo: "Patrones de turno y funciones de los puestos",
          // El botón de crear de la cabecera se oculta en el estado vacío: ahí va el único del centro.
          acciones:
            puede(indice.rol, permiso) && !vacio ? (
              <EnlaceBotonHoja href={`?tab=${tab}&nuevo=1`} icono={Plus}>
                {tab === "patrones" ? "Nuevo patrón" : "Nueva función"}
              </EnlaceBotonHoja>
            ) : undefined,
        };
      }}
    >
      {({ tab, rp, rf, editar }, indice) => {
        const r = tab === "patrones" ? rp : rf;
        const puedeP = puede(indice.rol, PERMISOS_CORE.patronesManage);
        const puedeF = puede(indice.rol, PERMISOS_CORE.funcionesManage);
        const nuevo = tab === "patrones" ? "Nuevo patrón" : "Nueva función";
        const puedeTab = tab === "patrones" ? puedeP : puedeF;
        return (
          <div className="flex flex-col gap-4">
            <Segmentado
              etiqueta="Catálogo"
              activa={tab}
              Link={LinkNext}
              className="self-start"
              opciones={[
                { id: "patrones", etiqueta: `Patrones de turno${rp.ok ? ` (${rp.data.length})` : ""}`, href: "?tab=patrones" },
                { id: "funciones", etiqueta: `Funciones${rf.ok ? ` (${rf.data.length})` : ""}`, href: "?tab=funciones" },
              ]}
            />
            {!r.ok ? (
              <Alerta tono="danger" titulo="No pudimos cargar el catálogo">
                {r.error.message}
              </Alerta>
            ) : tab === "patrones" && rp.ok && rp.data.length === 0 ? (
              <Empty
                titulo="Aún no hay patrones de turno"
                descripcion="Crea un patrón para asignarlo a los puestos."
                accion={puedeP ? <EnlaceBotonHoja href="?tab=patrones&nuevo=1" icono={Plus}>{nuevo}</EnlaceBotonHoja> : undefined}
              />
            ) : tab === "funciones" && rf.ok && rf.data.length === 0 ? (
              <Empty
                titulo="Aún no hay funciones"
                descripcion="Crea una función para asignarla a los puestos."
                accion={puedeF ? <EnlaceBotonHoja href="?tab=funciones&nuevo=1" icono={Plus}>{nuevo}</EnlaceBotonHoja> : undefined}
              />
            ) : tab === "patrones" && rp.ok ? (
              <ListaPatrones patrones={rp.data} puede={puedeP} />
            ) : rf.ok ? (
              <ListaFunciones funciones={rf.data} puede={puedeF} />
            ) : null}
            {puedeTab && tab === "patrones" ? (
              <>
                <HojaPatron />
                {rp.ok
                  ? rp.data
                      .filter((x) => x.id === editar)
                      .map((x) => <HojaPatron key={x.id} patron={x} />)
                  : null}
              </>
            ) : null}
            {puedeTab && tab === "funciones" ? (
              <>
                <HojaFuncion />
                {rf.ok
                  ? rf.data
                      .filter((x) => x.id === editar)
                      .map((x) => <HojaFuncion key={x.id} funcion={x} />)
                  : null}
              </>
            ) : null}
          </div>
        );
      }}
    </PaginaConfig>
  );
}
