
import { Cabecera } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { marcoDeLaPeticion } from "@/lib/marco-servidor";
import { requerirIdentidad, tieneAccesoAPortal } from "@/lib/servidor";
import { cargarAjustes } from "@/app/(erp)/configuracion/_centro/ajustes-datos";

import { AreaPrincipalServidor } from "./area-principal-servidor";
import { PreferenciasForm } from "./preferencias-form";

export const metadata = { title: "Preferencias" };

/**
 * Preferencias (35): página personal de la cuenta, fuera del centro de Configuración (REGLA §3b). Se
 * llega desde el menú de usuario con su URL propia `/mi-cuenta/preferencias` (decisión de Carlos,
 * 30-oct-2026 09:33 CLT); `/configuracion/preferencias` queda como redirect permanente. No muestra el
 * índice ni las migas de Configuración. En teléfono, el «atrás» vuelve a Inicio.
 */
export default function Preferencias() {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Preferencias"
      ruta="/mi-cuenta/preferencias"
      completo
      cargando="detalle"
      volver={{ href: "/configuracion", etiqueta: "Configuración" }}
      volverSoloTelefono
      cargar={async () => {
        const [identidad, ajustes] = await Promise.all([
          requerirIdentidad("/mi-cuenta/preferencias"),
          cargarAjustes("core", "Preferencias"),
        ]);
        // El diseño rige por navegador, como el tema: se muestra el que este navegador tiene puesto.
        const conEmpresa = tieneAccesoAPortal(identidad, "erp") && Boolean(identidad.actual);
        const marco = await marcoDeLaPeticion("erp", conEmpresa);
        return { nombre: identidad.usuario.nombre, valores: ajustes.valores, marco };
      }}
    >
      {({ nombre, valores, marco }) => {
        const de = (k: string) => valores[`core.${k}`]?.valor;
        return (
          <section aria-label="Preferencias" className="flex w-full max-w-[720px] flex-col">
            <Cabecera
              titulo="Preferencias"
              tituloSiempre
              tituloComoShell
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
                marco={marco}
              />
              <AreaPrincipalServidor />
            </div>
          </section>
        );
      }}
    </PaginaPortal>
  );
}
