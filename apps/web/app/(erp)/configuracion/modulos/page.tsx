import { listarModulos } from "@opai/capabilities";
import { Alerta } from "@opai/ds";
import { PERMISOS_CORE } from "@opai/domain";

import { exigirDatos } from "@/lib/carga";
import { construirPuede } from "@/lib/permisos-ui";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { PaginaConfig } from "../_centro/pagina-config";
import { BotonProbar } from "./boton-probar";
import { BotonSolicitar } from "./boton-solicitar";
import { PartesFinanzas } from "./partes-finanzas";
import { PruebaInfo, type Pruebas } from "./prueba-info";
import { TarjetaModulo } from "./tarjeta-modulo";

export const metadata = { title: "Catálogo de módulos" };

type Modulo = {
  id: string;
  nombre: string;
  version: string;
  dependencias: string[];
  estado: string | null;
};

const NUCLEO = ["Cuentas", "Instalaciones", "Personas", "Documentos", "Configuración"];

/** Módulos (42/43): contratados, en trial y disponibles; la empresa los solicita y OPAI los activa. */
export default function Modulos() {
  return (
    <PaginaConfig
      seccion="modulos"
      titulo="Catálogo de módulos"
      cargar={async () => {
        const [modulos, pruebas] = await Promise.all([
          ejecutarComoUsuario<Modulo[]>("erp", "core.modules.list"),
          ejecutarComoUsuario<Pruebas>("erp", "core.modules.pruebas", {}),
        ]);
        // Las pruebas son un complemento: si no cargan, el catálogo sigue funcionando.
        return { modulos: exigirDatos(modulos), pruebas: pruebas.ok ? pruebas.data : null };
      }}
      cabecera={({ modulos: m }) => {
        const n = (e: string | null) => m.filter((x) => x.estado === e).length;
        return {
          subtitulo: `${n("activo")} activos · ${n("trial")} en trial · ${n("solo_lectura")} en solo lectura · ${n(null)} disponibles. Los activa OPAI; tú los solicitas.`,
        };
      }}
    >
      {({ modulos, pruebas }, indice) => {
        const puede = construirPuede(indice.rol, indice.acceso)(PERMISOS_CORE.tenantManage);
        const manifests = new Map(listarModulos().map((m) => [m.id, m]));
        const item = (id: string) => pruebas?.items.find((x) => x.id === id);
        const nombre = (id: string) => modulos.find((x) => x.id === id)?.nombre ?? id;
        return (
          <div className="flex flex-col gap-4">
            <Alerta
              tono="info"
              titulo="Apagar un módulo no rompe otro: sus datos se conservan y los demás solo ocultan lo que venía de él."
            />
            <div className="grid gap-3 lg:grid-cols-2">
              <TarjetaModulo
                nombre="Núcleo"
                estado="siempre"
                funciones={NUCLEO}
                pie="Base de todos los módulos"
              />
              {modulos.map((m) => {
                const it = item(m.id);
                return (
                  <TarjetaModulo
                    key={m.id}
                    nombre={m.nombre}
                    estado={m.estado}
                    funciones={(manifests.get(m.id)?.navegacion ?? []).map((n) => n.etiqueta)}
                    pie={`Depende de ${["Núcleo", ...m.dependencias.map(nombre)].join(", ")}`}
                    {...(it ? { detalle: <PruebaInfo item={it} /> } : {})}
                    {...(puede && m.estado !== "activo"
                      ? {
                          accion: (
                            <span className="flex flex-wrap justify-end gap-2">
                              {pruebas && it?.estado === "disponible" ? (
                                <BotonProbar
                                  moduloId={m.id}
                                  nombre={m.nombre}
                                  dias={pruebas.dias}
                                  rutCompleto={pruebas.rutCompleto}
                                />
                              ) : null}
                              <BotonSolicitar moduloId={m.id} nombre={m.nombre} />
                            </span>
                          ),
                        }
                      : {})}
                  />
                );
              })}
            </div>
            {pruebas ? <PartesFinanzas pruebas={pruebas} puede={puede} /> : null}
            {modulos.length === 0 ? (
              <p className="t-caption">
                Por ahora solo está el núcleo; los módulos (Comercial, Operaciones…) aparecerán aquí
                al publicarse.
              </p>
            ) : null}
          </div>
        );
      }}
    </PaginaConfig>
  );
}
