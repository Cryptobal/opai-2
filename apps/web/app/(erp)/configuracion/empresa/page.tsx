import { Button } from "@opai/ds";
import { PERMISOS_CORE } from "@opai/domain";

import { exigirDatos } from "@/lib/carga";
import { construirPuede } from "@/lib/permisos-ui";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { PaginaConfig } from "../_centro/pagina-config";
import type { Perfil, Tenant } from "./datos-empresa";
import { FormularioEmpresa } from "./formulario-empresa";

export const metadata = { title: "Datos de la empresa" };

/** Datos de la empresa (21): perfil legal (core.empresa.*) y zona horaria (core.tenant.*). */
export default function Empresa() {
  return (
    <PaginaConfig
      seccion="empresa"
      titulo="Datos de la empresa"
      cargar={async () => {
        const [p, t] = await Promise.all([
          ejecutarComoUsuario<Perfil>("erp", "core.empresa.get", {}),
          ejecutarComoUsuario<Tenant>("erp", "core.tenant.get"),
        ]);
        return { perfil: exigirDatos(p), tenant: exigirDatos(t) };
      }}
      cabecera={({ tenant }, indice) => {
        const puede = construirPuede(indice.rol, indice.acceso)(PERMISOS_CORE.tenantManage);
        return {
          subtitulo: tenant
            ? `${tenant.nombre} · slug ${tenant.slug} · aparecen en documentos, correos y portales`
            : undefined,
          acciones: puede ? (
            <Button type="submit" form="form-empresa">
              Guardar
            </Button>
          ) : undefined,
        };
      }}
    >
      {({ perfil, tenant }, indice) =>
        perfil && tenant ? (
          <FormularioEmpresa
            perfil={perfil}
            tenant={tenant}
            puedeEditar={construirPuede(indice.rol, indice.acceso)(PERMISOS_CORE.tenantManage)}
          />
        ) : null
      }
    </PaginaConfig>
  );
}
