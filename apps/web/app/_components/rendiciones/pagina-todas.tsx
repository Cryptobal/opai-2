import { Badge, Cabecera, Forbidden, Table, Td, Th, Tr } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { Buscador } from "@/app/_components/maestros/buscador";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { CargaFallida } from "@/lib/carga";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import { cargarOpciones, cargarTodas } from "./datos";
import { centroDe, ETIQUETA_ESTADO, ETIQUETA_TIPO, TONO_ESTADO, type ResumenRendicion } from "./tipos";
import { lineaEstado, pesos } from "./formato";

const RUTA = "/rendiciones/todas";

function rutaCon(p: Record<string, string | undefined>, extra?: Record<string, string>) {
  const url = new URL(RUTA, "http://x");
  for (const [k, v] of Object.entries(p)) if (v) url.searchParams.set(k, v);
  for (const [k, v] of Object.entries(extra ?? {})) url.searchParams.set(k, v);
  return url.pathname + url.search;
}

type Fila = ResumenRendicion & { solicitanteNombre?: string | null };

export function PaginaTodasRendiciones({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Todas las rendiciones"
      ruta={RUTA}
      cargar={async () => {
        const p = await leerParametros(searchParams);
        try {
          const [pagina, opciones] = await Promise.all([cargarTodas(p), cargarOpciones("erp")]);
          return { ok: true as const, pagina, opciones, p };
        } catch (e) {
          if (e instanceof CargaFallida && e.code === "FORBIDDEN") return { ok: false as const };
          throw e;
        }
      }}
    >
      {(d) => {
        if (!d.ok)
          return (
            <Forbidden
              titulo="Sin permiso para ver todas las rendiciones"
              descripcion="Necesitas el permiso de ver todas las rendiciones de la empresa."
            />
          );
        const { pagina, opciones, p } = d;
        return (
          <div className="flex flex-col gap-4">
            <Cabecera
              titulo="Todas las rendiciones"
              subtitulo="Búsqueda y filtros sobre las rendiciones de la empresa."
              acciones={<EnlaceBoton href="/rendiciones" variante="secondary">Mis rendiciones</EnlaceBoton>}
              accionesSiempre
            />
            <Buscador placeholder="Buscar por código REN-n, motivo o quien rinde" />
            <p className="px-4 text-base text-fg-muted md:px-0">
              {pagina.items.length}
              {pagina.siguiente ? "+" : ""} en esta página · más recientes primero
            </p>
            <div className="hidden md:block">
              <Table>
                <thead>
                  <tr>
                    <Th>Código</Th>
                    <Th>Quién rinde</Th>
                    <Th>Motivo</Th>
                    <Th className="text-right">Total</Th>
                    <Th>Estado</Th>
                    <Th>Centro</Th>
                  </tr>
                </thead>
                <tbody>
                  {pagina.items.map((r: Fila) => (
                    <Tr key={r.id}>
                      <Td>
                        <LinkNext href={`/rendiciones/${r.id}`} className="font-medium text-fg hover:underline">
                          {r.codigoVisible}
                        </LinkNext>
                      </Td>
                      <Td>{r.solicitanteNombre ?? "Persona"}</Td>
                      <Td>
                        <span className="block">{r.descripcion}</span>
                        <span className="text-sm text-fg-muted">{ETIQUETA_TIPO[r.tipo] ?? r.tipo}</span>
                      </Td>
                      <Td className="text-right tabular-nums">{pesos(r.montoTotal)}</Td>
                      <Td>
                        <Badge tono={TONO_ESTADO[r.estado]}>{ETIQUETA_ESTADO[r.estado]}</Badge>
                      </Td>
                      <Td className="text-sm text-fg-muted">{centroDe(r, opciones)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>
            <ul className="flex flex-col gap-3 p-4 md:hidden">
              {pagina.items.map((r: Fila) => (
                <li key={r.id}>
                  <LinkNext href={`/rendiciones/${r.id}`} className="flex flex-col gap-1 rounded-md border border-border p-3">
                    <span className="font-medium text-fg">{r.codigoVisible}</span>
                    <span className="text-fg-muted">{r.solicitanteNombre ?? "Persona"}</span>
                    <span>{r.descripcion}</span>
                    <span className="text-fg-muted">{lineaEstado(r)} · {centroDe(r, opciones)}</span>
                    <span className="font-medium tabular-nums">{pesos(r.montoTotal)}</span>
                  </LinkNext>
                </li>
              ))}
            </ul>
            {pagina.siguiente ? (
              <LinkNext href={rutaCon(p, { cursor: pagina.siguiente })} className="t-label px-4 py-3 text-accent">
                Siguiente página
              </LinkNext>
            ) : null}
          </div>
        );
      }}
    </PaginaPortal>
  );
}