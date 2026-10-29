import { Fragment } from "react";

import { Estado, Table, Td, Th, Tr } from "@opai/ds";

import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { PaginaConfig } from "../_centro/pagina-config";
import { FilaEvento } from "./_componentes/fila-evento";
import { type EventoComunicable, grupoDe, type Regla } from "./_componentes/tipos";

export const metadata = { title: "Comunicaciones" };

/** Comunicaciones (30): qué se avisa, por qué canal y a quién; silencio por defecto (ADR-020). */
export default function Comunicaciones() {
  return (
    <PaginaConfig
      seccion="comunicaciones"
      titulo="Comunicaciones"
      cargar={async () => {
        const [e, r] = await Promise.all([
          ejecutarComoUsuario<EventoComunicable[]>("erp", "core.comunicaciones.eventos", {}),
          ejecutarComoUsuario<Regla[]>("erp", "core.notificacion_reglas.list", {}),
        ]);
        return { e, r, reglas: r.ok ? r.data : [] };
      }}
      cabecera={() => ({ subtitulo: "Todo apagado por defecto, salvo los avisos transaccionales" })}
    >
      {({ e, r, reglas }) => {
        const eventos = e.ok ? e.data : [];
        const grupos = [...new Set(eventos.map((x) => grupoDe(x.evento)))];
        return (
          <Estado state={estadoPantalla(e, r)} variante="lista">
            <Table>
              <thead>
                <tr>
                  <Th>Evento</Th>
                  <Th>Canales</Th>
                  <Th>Destinatarios</Th>
                  <Th>Activo</Th>
                </tr>
              </thead>
              <tbody>
                {grupos.map((g) => (
                  <Fragment key={g}>
                    <Tr>
                      <Td colSpan={4} className="h-9 bg-bg text-sm text-fg-muted">
                        {g}
                      </Td>
                    </Tr>
                    {eventos
                      .filter((x) => grupoDe(x.evento) === g)
                      .map((x) => (
                        <FilaEvento
                          key={`${x.evento}-${JSON.stringify(reglas.filter((r) => r.evento === x.evento))}`}
                          e={x}
                          reglas={reglas.filter((r) => r.evento === x.evento)}
                        />
                      ))}
                  </Fragment>
                ))}
              </tbody>
            </Table>
          </Estado>
        );
      }}
    </PaginaConfig>
  );
}
