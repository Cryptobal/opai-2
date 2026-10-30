import { Cabecera } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { requerirIdentidad } from "@/lib/servidor";

import { cargarAjustes } from "../_centro/ajustes-datos";
import { AreaPrincipalServidor } from "./area-principal-servidor";
import { PreferenciasForm } from "./preferencias-form";

export const metadata = { title: "Preferencias" };

/**
 * Preferencias (35): página personal de la cuenta, fuera del centro de Configuración (REGLA §3b). Se
 * llega desde el menú de usuario; conserva su URL `/configuracion/preferencias` para no romper enlaces
 * ni el guardado del tema, pero no muestra el índice ni las migas de Configuración. En teléfono, el
 * «atrás» vuelve a Inicio.
 */
export default function Preferencias() {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Preferencias"
      ruta="/configuracion/preferencias"
      completo
      cargando="detalle"
      volver={{ href: "/", etiqueta: "Inicio" }}
      volverSoloTelefono
      cargar={async () => {
        const [identidad, ajustes] = await Promise.all([
          requerirIdentidad("/configuracion/preferencias"),
          cargarAjustes("core", "Preferencias"),
        ]);
        return { nombre: identidad.usuario.nombre, valores: ajustes.valores };
      }}
    >
      {({ nombre, valores }) => {
        const de = (k: string) => valores[`core.${k}`]?.valor;
        return (
          <section aria-label="Preferencias" className="flex w-full max-w-[720px] flex-col">
            <Cabecera
              titulo="Preferencias"
              tituloSiempre
              tituloDetalle
              subtitulo={`Solo para ti, ${nombre}`}
            />
            <div className="flex flex-col gap-4">
              <PreferenciasForm
                inicial={{
                  tema: String(de("preferencias_tema") ?? "sistema"),
                  silencio: de("preferencias_silencio") === true,
                  resumen: String(de("preferencias_resumen") ?? "nunca"),
                }}
              />
              <AreaPrincipalServidor />
            </div>
          </section>
        );
      }}
    </PaginaPortal>
  );
}
