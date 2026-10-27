import { Button } from "@opai/ds";
import { PERMISOS_CORE } from "@opai/domain";

import { fecha, hoyIso } from "@/lib/fechas";
import { construirPuede } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

import { PaginaConfig } from "../_centro/pagina-config";
import { FormularioMarca } from "./formulario-marca";
import { HojaLogo } from "./diferidas";
import { LogosMarca } from "./logos-marca";
import type { Marca } from "./tipos";

export const metadata = { title: "Marca" };

type Tipo = { id: string; codigo: string };

/** Marca (22): logos, colores, nombre y eslogan para documentos, correos y portales (ADR-028). */
export default function PaginaMarca() {
  return (
    <PaginaConfig
      seccion="marca"
      titulo="Marca"
      cargar={async () => {
        const [m, t, id] = await Promise.all([
          ejecutarComoUsuario<Marca>("erp", "core.marca.get", {}),
          ejecutarComoUsuario<Tipo[]>("erp", "core.documento_tipos.list", { capa: "empresa" }),
          requerirIdentidad("/configuracion/marca"),
        ]);
        const tipos = Object.fromEntries((t.ok ? t.data : []).map((x) => [x.codigo, x.id]));
        return { marca: m.ok ? m.data : null, tipos, tenantId: id.actual?.tenantId ?? "" };
      }}
      cabecera={(_, indice) => ({
        subtitulo: "Se aplica a documentos, correos y portales; la interfaz de OPAI no cambia.",
        acciones: puedeMarca(indice) ? (
          <Button type="submit" form="form-marca">
            Guardar
          </Button>
        ) : undefined,
      })}
    >
      {({ marca, tipos, tenantId }, indice) => {
        if (!marca) return null;
        const puede = puedeMarca(indice);
        return (
          <div className="flex flex-col gap-4">
            <LogosMarca marca={marca} puede={puede} />
            <FormularioMarca marca={marca} puede={puede} hoy={fecha(hoyIso())} />
            {puede ? <HojaLogo tenantId={tenantId} tipos={tipos} /> : null}
          </div>
        );
      }}
    </PaginaConfig>
  );
}

const puedeMarca = (indice: { rol: string | null; acceso: Parameters<typeof construirPuede>[1] }) =>
  construirPuede(indice.rol, indice.acceso)(PERMISOS_CORE.marcaManage);
