import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { Superadmin } from "../_componentes/formato";
import { type EventoPlataforma, ListaAuditoria } from "../_componentes/lista-auditoria";

export const metadata = { title: "Auditoría de Plataforma" };

const ACCIONES = [
  { valor: "platform.tenants", etiqueta: "Empresas" },
  { valor: "platform.modules", etiqueta: "Módulos" },
  { valor: "platform.users", etiqueta: "Usuarios de plataforma" },
  { valor: "platform.precios", etiqueta: "Precios" },
  { valor: "platform.ajustes", etiqueta: "Ajustes" },
  { valor: "platform.aprobaciones", etiqueta: "Aprobaciones" },
  { valor: "platform.cobros", etiqueta: "Cobro" },
];
const DIAS = [
  { valor: "1", etiqueta: "Último día" },
  { valor: "7", etiqueta: "Últimos 7 días" },
  { valor: "30", etiqueta: "Últimos 30 días" },
];

const dia = (offset: number) =>
  new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10);

/** Plataforma → Auditoría (CAR-323): acciones de plataforma por empresa, acción y fecha. Solo lectura. */
export default function Auditoria({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="platform"
      titulo="Auditoría"
      ruta="/platform/auditoria"
      opciones={() => ({ titulo: "Auditoría", insignia: <Superadmin /> })}
      cargar={async () => {
        const p = await leerParametros(searchParams);
        const dias = Number(p["dias"] ?? "");
        const r = await ejecutarComoUsuario<{ eventos: EventoPlataforma[] }>(
          "platform",
          "platform.auditoria.list",
          {
            limite: 100,
            ...(p["empresa"] ? { tenantId: p["empresa"] } : {}),
            ...(p["accion"] ? { capability: p["accion"] } : {}),
            ...(dias > 0 ? { desde: dia(dias) } : {}),
          },
        );
        // En secuencia: el pool de conexiones es chico (hoja de Plataforma §2.2).
        const tenants = await ejecutarComoUsuario<{ id: string; nombre: string }[]>(
          "platform",
          "platform.tenants.list",
        );
        const lista = tenants.ok ? tenants.data : [];
        return {
          state: estadoPantalla(r),
          items: r.ok ? r.data.eventos : [],
          lista,
        };
      }}
    >
      {(d) => (
        <ListaAuditoria
          state={d.state}
          items={d.items}
          empresas={new Map(d.lista.map((t) => [t.id, t.nombre]))}
          filtros={
            <ChipsFiltro
              filtros={[
                {
                  param: "empresa",
                  etiqueta: "Empresa",
                  opciones: d.lista.map((t) => ({ valor: t.id, etiqueta: t.nombre })),
                },
                { param: "accion", etiqueta: "Acción", opciones: ACCIONES },
                { param: "dias", etiqueta: "Fecha", opciones: DIAS },
              ]}
            />
          }
        />
      )}
    </PaginaPortal>
  );
}
