import { Plus } from "lucide-react";

import { Enlace, Estado } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";

import { PaginaConfig } from "../../_centro/pagina-config";
import { cargarDestinos } from "./datos";
import { HojaDestino } from "./hoja-destino";
import { TarjetaDestino } from "./tarjeta-destino";

export const metadata = { title: "Eventos salientes" };

/**
 * Eventos salientes (CAR-352): las direcciones donde la empresa recibe, firmados, los eventos que
 * eligió. Junto a las API keys, como «Developers › Webhooks» en Stripe.
 */
export default function EventosSalientes() {
  return (
    <PaginaConfig
      seccion="agentes"
      titulo="Eventos salientes"
      cargar={cargarDestinos}
      cabecera={() => ({
        subtitulo: (
          <>
            Avisos firmados a tu sistema cuando algo pasa en OPAI.{" "}
            <Enlace Link={LinkNext} href="/configuracion/agentes" className="underline">
              Volver a las API keys
            </Enlace>
          </>
        ),
        acciones: (
          <EnlaceBotonHoja href="?crear=1" icono={Plus}>
            Agregar destino
          </EnlaceBotonHoja>
        ),
      })}
    >
      {({ state, destinos, catalogo }) => (
        <>
          <Estado
            state={state === "ready" && destinos.length === 0 ? "empty" : state}
            variante="lista"
            textos={{
              vacio: {
                titulo: "Aún no hay destinos",
                descripcion:
                  "Agrega la dirección de tu sistema para recibir los eventos que elijas, sin consultar a cada rato.",
              },
            }}
          >
            <ul className="overflow-hidden rounded-lg border border-border bg-surface">
              {destinos.map((d) => (
                <TarjetaDestino key={d.id} d={d} />
              ))}
            </ul>
          </Estado>
          <HojaDestino catalogo={catalogo} />
        </>
      )}
    </PaginaConfig>
  );
}
