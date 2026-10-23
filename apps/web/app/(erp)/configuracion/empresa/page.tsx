import { tienePermiso, type Rol } from "@opai/domain";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import { type Empresa, EmpresaDetalle, type Uso } from "./empresa-detalle";

export const metadata = { title: "Empresa" };

async function Contenido() {
  const [tenant, uso, identidad] = await Promise.all([
    ejecutarComoUsuario<Empresa>("erp", "core.tenant.get"),
    ejecutarComoUsuario<Uso>("erp", "core.usage.summary", { dias: 30 }),
    identidadActual(),
  ]);
  const rol = (identidad?.actual?.rol ?? "viewer") as Rol;
  return (
    <EmpresaDetalle
      state={estadoPantalla(tenant)}
      empresa={tenant.ok ? tenant.data : null}
      uso={uso.ok ? uso.data : null}
      puedeEditar={tienePermiso(rol, "core:tenant.manage")}
    />
  );
}

export default function PaginaEmpresa() {
  return (
    <PaginaPortal portal="erp" titulo="Empresa" ruta="/configuracion/empresa">
      <Contenido />
    </PaginaPortal>
  );
}
