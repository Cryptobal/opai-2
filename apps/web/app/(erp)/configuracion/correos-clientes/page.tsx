import dynamic from "next/dynamic";

import { Estado, SeccionTarjeta } from "@opai/ds";

import { AVISO_EXTERNO, CorreoItem } from "@/app/_components/correos/correo-item";
import { DireccionRegistro } from "@/app/_components/correos/direccion-registro";
import type { PaginaCorreos } from "@/app/_components/correos/tipos";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { PaginaConfig } from "../_centro/pagina-config";

export const metadata = { title: "Correos de clientes" };

// El diálogo de asociar se carga aparte del primer JS (ADR-037).
const AsociarCorreo = dynamic(() => import("./asociar-correo").then((m) => m.AsociarCorreo));

/**
 * Correos de clientes (CAR-233): la dirección de registro que el vendedor pone en CCO y la bandeja de
 * lo que no se pudo asociar solo. No es un cliente de correo: no se redacta, responde ni reenvía.
 */
export default function CorreosClientes() {
  return (
    <PaginaConfig
      seccion="correos-clientes"
      titulo="Correos de clientes"
      cargar={async () => {
        const [d, b] = await Promise.all([
          ejecutarComoUsuario<{ direccion: string | null }>("erp", "core.correos.direccion", {}),
          ejecutarComoUsuario<PaginaCorreos>("erp", "core.correos.sin_asignar", { limite: 50 }),
        ]);
        return { d, b };
      }}
      cabecera={() => ({ subtitulo: "Historial en la ficha de cada cuenta, contacto y negocio" })}
    >
      {({ d, b }) => (
        <div className="flex flex-col gap-4">
          <SeccionTarjeta titulo="Dirección de registro">
            <DireccionRegistro direccion={d.ok ? d.data.direccion : null} puedeCrear />
          </SeccionTarjeta>
          <SeccionTarjeta titulo="Sin asignar">
            <Estado
              state={b.ok && b.data.items.length === 0 ? "empty" : estadoPantalla(b)}
              variante="lista"
              textos={{
                vacio: {
                  titulo: "No hay correos sin asignar",
                  descripcion:
                    "Cuando un correo no calza con el correo de un contacto ni con el sitio web de una sola cuenta, queda aquí para asociarlo a mano. Comparte la dirección de registro con tu equipo para que pongan en CCO los correos a clientes.",
                },
              }}
            >
              <div className="flex flex-col gap-3">
                <p className="t-caption">{AVISO_EXTERNO}</p>
                <ul className="flex flex-col gap-4">
                  {(b.ok ? b.data.items : []).map((c) => (
                    <CorreoItem
                      key={c.id}
                      c={c}
                      accion={<AsociarCorreo correoId={c.id} asunto={c.asunto} />}
                    />
                  ))}
                </ul>
                {b.ok && b.data.siguiente ? (
                  <p className="t-caption">
                    Se muestran los 50 más recientes; al asociarlos aparecen los siguientes.
                  </p>
                ) : null}
              </div>
            </Estado>
          </SeccionTarjeta>
        </div>
      )}
    </PaginaConfig>
  );
}
