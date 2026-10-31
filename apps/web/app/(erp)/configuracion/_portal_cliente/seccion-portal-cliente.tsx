import { Estado } from "@opai/ds";

import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { type DatosPortal, PanelPortalCliente } from "./panel-portal-cliente";
import type { AccesoFila, Candidato, ConfigCuenta, CuentaOpcion, InstalacionOpcion, TipoDocumentoOpcion } from "./tipos";

type TipoDoc = { codigo: string; nombre: string; capa: string; activo: boolean };

/**
 * Pestaña «Portal Cliente» de Configuración → Módulos (pantalla 12, Ley 21.719): qué ve cada cliente
 * en su portal y quién de su equipo entra. Lee y escribe solo por capacidades (ADR-004); el módulo no
 * tiene página de configuración propia (ADR-018).
 */
export async function SeccionPortalCliente({ cuentaId }: { cuentaId?: string } = {}) {
  const [cuentas, tipos] = await Promise.all([
    ejecutarComoUsuario<{ items: CuentaOpcion[] }>("erp", "core.cuentas.list", { limite: 100 }),
    ejecutarComoUsuario<TipoDoc[]>("erp", "core.documento_tipos.list", {}),
  ]);
  const lista = cuentas.ok
    ? cuentas.data.items.filter((c) => !cuentaId || c.id === cuentaId)
    : [];
  const documentos: TipoDocumentoOpcion[] = tipos.ok
    ? tipos.data.filter((t) => t.activo && t.capa === "persona").map((t) => ({ codigo: t.codigo, nombre: t.nombre }))
    : [];
  const primera = lista[0]?.id;
  const [config, accesos, candidatos, instalaciones] = primera
    ? await Promise.all([
        ejecutarComoUsuario<ConfigCuenta>("erp", "portal_cliente.config.leer", { cuentaId: primera }),
        ejecutarComoUsuario<AccesoFila[]>("erp", "portal_cliente.accesos.listar", { cuentaId: primera }),
        ejecutarComoUsuario<Candidato[]>("erp", "portal_cliente.accesos.candidatos", {}),
        ejecutarComoUsuario<{ items: InstalacionOpcion[] }>("erp", "core.instalaciones.list", { cuentaId: primera, limite: 100 }),
      ])
    : [];
  const inicial: DatosPortal | null =
    config?.ok && accesos?.ok && candidatos?.ok
      ? { config: config.data, accesos: accesos.data, candidatos: candidatos.data, instalaciones: instalaciones?.ok ? instalaciones.data.items : [] }
      : null;
  const fallida = [cuentas, config, accesos, candidatos].filter((r) => r !== undefined);
  return (
    <Estado
      state={lista.length === 0 && cuentas.ok ? "empty" : estadoPantalla(...fallida)}
      variante="formulario"
      textos={{
        vacio: {
          titulo: "Aún no hay clientes con portal",
          descripcion: "Crea la cuenta del cliente y su contacto para configurar qué ve en su portal.",
        },
      }}
    >
      <PanelPortalCliente cuentas={lista} tiposDocumento={documentos} fija={Boolean(cuentaId)} inicial={inicial} />
    </Estado>
  );
}
