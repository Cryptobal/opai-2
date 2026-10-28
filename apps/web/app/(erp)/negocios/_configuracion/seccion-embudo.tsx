import { Estado, ParesGrid, SeccionTarjeta } from "@opai/ds";

import { cargarConfigComercial } from "./datos";
import { EditorEmbudo } from "./editor-embudo";

const REGLAS = [
  { etiqueta: "Ganada y perdida", valor: "Fijas al final: no se desactivan ni cambian de tipo" },
  { etiqueta: "Etapa con negocios", valor: "No se desactiva hasta mover sus negocios" },
  { etiqueta: "Probabilidad", valor: "Probabilidad de cierre de un negocio en la etapa" },
  { etiqueta: "Requisitos", valor: "Lo que un negocio debe tener para entrar a la etapa" },
  { etiqueta: "Perder", valor: "Exige un motivo de pérdida" },
];

/** Pestaña «Embudo» de Configuración → Módulos → Comercial: etapas y reglas (export ConfigComercial). */
export async function SeccionEmbudo() {
  const { state, config } = await cargarConfigComercial();
  return (
    <Estado state={config ? state : state === "ready" ? "error" : state} variante="formulario">
      {config ? (
        <div className="flex flex-col gap-4">
          <EditorEmbudo etapas={config.embudo.etapas} />
          <SeccionTarjeta titulo="Reglas del embudo">
            <ParesGrid items={REGLAS} />
          </SeccionTarjeta>
        </div>
      ) : null}
    </Estado>
  );
}
