import { Estado } from "@opai/ds";

import { BotonReintentar } from "@/app/_components/boton-reintentar";
import { cargarMiBiometria, TEXTOS_SIN_MARCAS, textoDe } from "@/app/_components/biometria/cargar";
import { MarcarPersona } from "@/app/_components/biometria/marcar-persona";
import { RevocarRostro } from "@/app/_components/biometria/revocar-rostro";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { tituloPagina } from "@/app/_components/portales";
import { dispositivoActual } from "@/lib/dispositivo";

export const metadata = { title: tituloPagina("terreno", "Marcar") };

/**
 * Terreno · Marcación (export-terreno «Marcacion», con los ajustes de D-02/D-03: prueba de vida obligatoria
 * con el rostro, «Usar PIN» siempre visible y sin foto por marca, D-04). La instalación es la del
 * dispositivo emparejado; sin dispositivo, la de la persona.
 */
export default function Pagina() {
  return (
    <PaginaPortal
      portal="terreno"
      titulo="Marcar"
      ruta="/terreno/marcar"
      volver={{ href: "/terreno", etiqueta: "Inicio" }}
      cargar={async () => {
        const [m, d] = await Promise.all([cargarMiBiometria("terreno"), dispositivoActual()]);
        const delDispositivo = d && d.estado === "activo" ? d.instalacionId : null;
        return { ...m, instalacionId: delDispositivo ?? m.estado?.yo?.instalacionId ?? null };
      }}
    >
      {({ state, estado, textos, instalacionId }) => (
        <Estado state={state} variante="detalle" textos={{ ...TEXTOS_SIN_MARCAS, error: { accion: <BotonReintentar /> } }}>
          {estado && instalacionId ? (
            <div className="flex flex-col gap-4">
              <h2 className="t-title text-fg md:hidden">Marcar</h2>
              <MarcarPersona
                portal="terreno" canal="kiosco" estado={estado} instalacionId={instalacionId}
                instalacion={estado.yo?.instalacionNombre ?? "Tu instalación"} textoRostro={textoDe(textos, "biometria_facial")}
              />
              {estado.rostroEnrolado ? <div className="mx-auto w-full max-w-xl"><RevocarRostro portal="terreno" /></div> : null}
            </div>
          ) : (
            <p className="text-md text-fg-muted">No tienes una instalación asignada para marcar. Habla con tu supervisor.</p>
          )}
        </Estado>
      )}
    </PaginaPortal>
  );
}
