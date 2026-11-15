import { Segmentado } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { estadoPantalla } from "@/lib/formato";
import { puedeConfigurarAcceso, puedeGestionarListas } from "@/lib/pestanas-modulos";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { SeccionConfigAcceso } from "./config/seccion-config";
import { SeccionListas } from "./seccion-listas";
import { SeccionRegistros } from "./seccion-registros";
import { TablaIntentos } from "./tabla-intentos";
import type { Intento, Pagina } from "./datos";

type Sub = "registros" | "en_sitio" | "intentos" | "listas" | "config";
const SUBS: readonly { id: Sub; etiqueta: string }[] = [
  { id: "registros", etiqueta: "Registros" },
  { id: "en_sitio", etiqueta: "En sitio" },
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

/**
 * Pestaña «Accesos» de la ficha de instalación (CAR-475, diseño `InstalacionAccesos`). Un `Segmentado` cambia
 * entre registros, en sitio, intentos, listas y configuración (ADR-041 no contempla pestañas anidadas).
 */
export async function PestanaAccesos({
  instalacionId,
  base,
  sub: subUrl,
  lista,
}: {
  instalacionId: string;
  base: string;
  sub: string | undefined;
  lista: string | undefined;
}) {
  const visibles = await subsVisibles();
  const sub: Sub = visibles.some((s) => s.id === subUrl) ? (subUrl as Sub) : "registros";
  const segmento = (
    <Segmentado
      etiqueta="Secciones de Accesos"
      variante="plano"
      activa={sub}
      Link={LinkNext}
      opciones={visibles.map((s) => ({
        ...s,
        href: `${base}?sub=${s.id}`,
      }))}
    />
  );
  if (sub === "listas")
    return (
      <SeccionListas instalacionId={instalacionId} base={base} lista={lista} segmento={segmento} />
    );
  if (sub === "config")
    return (
      <div className="flex flex-col gap-3">
        {segmento}
        <SeccionConfigAcceso instalacionId={instalacionId} />
      </div>
    );
  if (sub === "intentos") {
    const r = await ejecutarComoUsuario<Pagina<Intento>>("erp", "acceso.intentos.listar", {
      instalacionId,
    });
    return (
      <div className="flex flex-col gap-3">
        {segmento}
        <TablaIntentos state={estadoPantalla(r)} items={r.ok ? r.data.items : []} />
      </div>
    );
  }
  return (
    <SeccionRegistros
      instalacionId={instalacionId}
      enSitio={sub === "en_sitio"}
      segmento={segmento}
    />
  );
}
