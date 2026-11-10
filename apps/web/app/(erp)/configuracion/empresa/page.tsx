import { Button } from "@opai/ds";
import { PERMISOS_CORE } from "@opai/domain";

import { exigirDatos } from "@/lib/carga";
import { construirPuede } from "@/lib/permisos-ui";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { PaginaConfig } from "../_centro/pagina-config";
import type { Actividades, Perfil, Tenant } from "./datos-empresa";
import { FormularioEmpresa } from "./formulario-empresa";

export const metadata = { title: "Datos de la empresa" };

/** Datos de la empresa (21): perfil legal y ACTECO (core.empresa.*) y zona horaria (core.tenant.*). */
export default function Empresa() {
  return (
    <PaginaConfig
      seccion="empresa"
      titulo="Datos de la empresa"
      cargar={async () => {
        const [p, t, a] = await Promise.all([
          ejecutarComoUsuario<Perfil>("erp", "core.empresa.get", {}),
          ejecutarComoUsuario<Tenant>("erp", "core.tenant.get"),
          ejecutarComoUsuario<Actividades>("erp", "core.empresa.acteco_get", {}),
        ]);
        return { perfil: exigirDatos(p), tenant: exigirDatos(t), actividades: exigirDatos(a) };
      }}
      cabecera={({ tenant }, indice) => {
        const puede = construirPuede(indice.rol, indice.acceso)(PERMISOS_CORE.tenantManage);
        return {
          subtitulo: tenant
            ? `${tenant.nombre} · aparecen en documentos, correos y portales`
            : undefined,
          acciones: puede ? (
            <Button type="submit" form="form-empresa">
              Guardar
            </Button>
          ) : undefined,
        };
      }}
    >
      {({ perfil, tenant, actividades }, indice) =>
        perfil && tenant && actividades ? (
          <FormularioEmpresa
            perfil={perfil}
            tenant={tenant}
            actividades={actividades}
            puedeEditar={construirPuede(indice.rol, indice.acceso)(PERMISOS_CORE.tenantManage)}
          />
        ) : null
      }
    </PaginaConfig>
  );
}
