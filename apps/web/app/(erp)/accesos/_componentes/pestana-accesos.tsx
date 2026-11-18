import type { ReactNode } from "react";

import { Segmentado } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { estadoPantalla } from "@/lib/formato";
import { puedeConfigurarAcceso, puedeGestionarListas } from "@/lib/pestanas-modulos";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { SeccionPrerregistros } from "../prerregistros/_componentes/seccion-prerregistros";
import { SeccionConfigAcceso } from "./config/seccion-config";
import { SeccionListas } from "./seccion-listas";
import { SeccionRegistros } from "./seccion-registros";
import { TablaIntentos } from "./tabla-intentos";
import type { Intento, Pagina } from "./datos";

type Sub = "registros" | "en_sitio" | "prerregistros" | "intentos" | "listas" | "config";
const SUBS: readonly { id: Sub; etiqueta: string }[] = [
  { id: "registros", etiqueta: "Registros" },
  { id: "en_sitio", etiqueta: "En sitio" },
  { id: "prerregistros", etiqueta: "Prerregistros" },
  { id: "listas", etiqueta: "Listas" },
  { id: "intentos", etiqueta: "Intentos denegados" },
  { id: "config", etiqueta: "Configuración" },
];

async function subsVisibles() {
  const [verListas, verConfig] = await Promise.all([
    puedeGestionarListas(),
    puedeConfigurarAcceso(),
  ]);
  return SUBS.filter((s) => (s.id !== "listas" || verListas) && (s.id !== "config" || verConfig));
}

type Props = {
  instalacion: { id: string; nombre: string };
  base: string;
  sub: string | undefined;
  lista: string | undefined;
  cursor: string | undefined;
};

/**
 * Pestaña «Accesos» de la ficha de instalación (CAR-475, diseño `InstalacionAccesos`), única entrada al control de
 * acceso en el ERP. Un `Segmentado` cambia entre registros, en sitio, prerregistros, intentos, listas y configuración
 * (ADR-041 no contempla pestañas anidadas).
 */
export async function PestanaAccesos({ sub: subUrl, ...p }: Props) {
  const visibles = await subsVisibles();
  const sub: Sub = visibles.some((s) => s.id === subUrl) ? (subUrl as Sub) : "registros";
  // En teléfono las seis secciones no caben: se desplazan en su fila en vez de ensanchar la página.
  const segmento = (
    <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <Segmentado
        etiqueta="Secciones de Accesos"
        variante="plano"
        activa={sub}
        Link={LinkNext}
        opciones={visibles.map((s) => ({ ...s, href: `${p.base}?sub=${s.id}` }))}
      />
    </div>
  );
  return <Seccion {...p} sub={sub} segmento={segmento} />;
}

async function Seccion({
  instalacion,
  base,
  sub,
  lista,
  cursor,
  segmento,
}: Omit<Props, "sub"> & { sub: Sub; segmento: ReactNode }) {
  const conSegmento = (contenido: ReactNode) => (
    <div className="flex flex-col gap-3">
      {segmento}
      {contenido}
    </div>
  );
  switch (sub) {
    case "prerregistros":
      return (
        <SeccionPrerregistros
          instalacion={instalacion}
          base={base}
          cursor={cursor}
          segmento={segmento}
        />
      );
    case "listas":
      return (
        <SeccionListas
          instalacionId={instalacion.id}
          base={base}
          lista={lista}
          segmento={segmento}
        />
      );
    case "config":
      return conSegmento(<SeccionConfigAcceso instalacionId={instalacion.id} />);
    case "intentos": {
      const r = await ejecutarComoUsuario<Pagina<Intento>>("erp", "acceso.intentos.listar", {
        instalacionId: instalacion.id,
      });
      return conSegmento(
        <TablaIntentos state={estadoPantalla(r)} items={r.ok ? r.data.items : []} />,
      );
    }
    case "registros":
    case "en_sitio":
      return (
        <SeccionRegistros
          instalacionId={instalacion.id}
          enSitio={sub === "en_sitio"}
          base={base}
          cursor={cursor}
          segmento={segmento}
        />
      );
    default: {
      const nunca: never = sub;
      return nunca;
    }
  }
}

export { COLUMNAS } from "./seccion-registros";