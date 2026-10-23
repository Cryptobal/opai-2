import { Plus } from "lucide-react";

import { Estado } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import { PaginaConfig } from "../_centro/pagina-config";
import { cargarKeys } from "./datos";
import { HojaCrearKey } from "./hoja-crear";
import { TarjetaKey } from "./tarjeta-key";

export const metadata = { title: "Agentes y API keys" };

/** Agentes y API keys (24): una fila por key con su presupuesto del mes; crear y conectar tu IA. */
export default function Agentes() {
  return (
    <PaginaConfig
      seccion="agentes"
      titulo="Agentes y API keys"
      cargar={cargarKeys}
      cabecera={() => ({
        subtitulo: (
          <LinkNext
            href="/configuracion/agentes/conectar"
            className="text-accent underline underline-offset-2"
          >
            Conectar tu IA
          </LinkNext>
        ),
        acciones: (
          <EnlaceBoton href="?crear=1" icono={Plus}>
            Crear key
          </EnlaceBoton>
        ),
      })}
    >
      {({ state, keys, gasto, scopes }) => (
        <>
          <Estado
            state={state === "ready" && keys.length === 0 ? "empty" : state}
            variante="lista"
            textos={{
              vacio: {
                titulo: "Aún no hay keys",
                descripcion: "Crea una para que tu asistente opere OPAI con tus permisos.",
              },
            }}
          >
            <ul className="overflow-hidden rounded-lg border border-border bg-surface">
              {keys.map((k) => (
                <TarjetaKey key={k.id} k={k} gasto={gasto.get(k.id) ?? 0} />
              ))}
            </ul>
          </Estado>
          <HojaCrearKey scopes={scopes} />
        </>
      )}
    </PaginaConfig>
  );
}
