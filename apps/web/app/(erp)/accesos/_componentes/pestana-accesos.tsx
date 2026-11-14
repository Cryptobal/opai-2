import { formatearFechaHora } from "@opai/domain";
import { Badge, ListScreen, Segmentado } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { estadoPantalla } from "@/lib/formato";
import { puedeGestionarListas, puedeGestionarRegistros } from "@/lib/pestanas-modulos";
import { ejecutarComoUsuario } from "@/lib/servidor";

import type { EntradaLista } from "./panel-listas";
import { CerrarEnBloque } from "./acciones-registro";
import { PanelListas } from "./panel-listas";
import { TablaIntentos, Tarjeta } from "./tablas-instalacion";
import type { Intento, Pagina, Registro } from "./datos";
import { estadoRegistro, tipoDe } from "./etiquetas";

type Sub = "registros" | "en_sitio" | "intentos" | "listas";
const SUBS: readonly { id: Sub; etiqueta: string }[] = [
  { id: "registros", etiqueta: "Registros" },
  { id: "en_sitio", etiqueta: "En sitio" },
  { id: "listas", etiqueta: "Listas" },
  { id: "intentos", etiqueta: "Intentos denegados" },
];

/**
 * Pestaña «Accesos» de la ficha de instalación (CAR-475, diseño `InstalacionAccesos`). Un `Segmentado` cambia
 * entre registros, en sitio, intentos y listas (ADR-041 no contempla pestañas anidadas).
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
  const [verListas, gestiona] = await Promise.all([
    puedeGestionarListas(),
    puedeGestionarRegistros(),
  ]);
  const sub: Sub = SUBS.some((s) => s.id === subUrl) ? (subUrl as Sub) : "registros";
  const segmento = (
    <Segmentado
      etiqueta="Secciones de Accesos"
      variante="plano"
      activa={sub}
      Link={LinkNext}
      opciones={SUBS.filter((s) => s.id !== "listas" || verListas).map((s) => ({
        ...s,
        href: `${base}?sub=${s.id}`,
      }))}
    />
  );
  if (sub === "listas") {
    const tipo = lista === "bloqueada" ? "bloqueada" : "autorizada";
    const r = await ejecutarComoUsuario<EntradaLista[]>("erp", "acceso.listas.listar", {
      instalacionId,
      tipo,
    });
    return (
      <div className="flex flex-col gap-3">
        {segmento}
        <PanelListas
          state={estadoPantalla(r)}
          instalacionId={instalacionId}
          tipo={tipo}
          entradas={r.ok ? r.data : []}
          href={(t) => `${base}?sub=listas&lista=${t}`}
        />
      </div>
    );
  }
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
  const r = await ejecutarComoUsuario<Pagina<Registro>>("erp", "acceso.registros.listar", {
    instalacionId,
    soloEnSitio: sub === "en_sitio",
  });
  return (
    <div className="flex flex-col gap-3">
      {segmento}
      <ListScreen<Registro>
        state={estadoPantalla(r)}
        titulo={sub === "en_sitio" ? "En sitio" : "Registros"}
        {...(gestiona && sub === "en_sitio" && r.ok
          ? {
              accionPrincipal: (
                <CerrarEnBloque instalacionId={instalacionId} cuantos={r.data.items.length} />
              ),
            }
          : {})}
        items={r.ok ? r.data.items : []}
        clave={(x) => x.id}
        tarjeta={(x) => (
          <Tarjeta
            titulo={x.nombre}
            sub={`${tipoDe(x.tipoRegistro)} · ${formatearFechaHora(x.entradaEn)}`}
            fin={estadoRegistro(x).etiqueta}
          />
        )}
        href={(x) => `/accesos/${x.id}?instalacion=${instalacionId}`}
        Link={LinkNext}
        columnas={[
          { id: "nombre", etiqueta: "Nombre", render: (x) => x.nombre },
          { id: "tipo", etiqueta: "Tipo", render: (x) => tipoDe(x.tipoRegistro) },
          { id: "empresa", etiqueta: "Empresa", render: (x) => x.empresa ?? "—" },
          { id: "entrada", etiqueta: "Entrada", render: (x) => formatearFechaHora(x.entradaEn) },
          {
            id: "estado",
            etiqueta: "Estado",
            render: (x) => (
              <Badge tono={estadoRegistro(x).tono} punto>
                {estadoRegistro(x).etiqueta}
              </Badge>
            ),
          },
        ]}
        textos={{
          vacio: {
            titulo: sub === "en_sitio" ? "Nadie en sitio" : "Aún no hay registros",
            descripcion:
              "Las entradas que registre la portería de esta instalación aparecerán aquí.",
          },
        }}
      />
    </div>
  );
}
