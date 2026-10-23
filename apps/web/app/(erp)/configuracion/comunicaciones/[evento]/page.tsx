import { notFound } from "next/navigation";

import { Button, Segmentado } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

import { EnviarPrueba } from "../_componentes/acciones-plantilla";
import { FORM_PLANTILLA } from "../../_centro/formularios";
import { EditorPlantilla } from "../_componentes/editor-plantilla";
import { Historial } from "../_componentes/historial";
import {
  type EventoComunicable,
  grupoDe,
  NOMBRE_CANAL,
  type Plantillas,
  rutaEvento,
} from "../_componentes/tipos";

export const metadata = { title: "Plantilla" };

type Props = { params: Promise<{ evento: string }>; searchParams: SearchParams };

async function cargar({ params, searchParams }: Props) {
  const [{ evento: crudo }, p, id] = await Promise.all([
    params,
    leerParametros(searchParams),
    requerirIdentidad(),
  ]);
  const evento = decodeURIComponent(crudo);
  const r = await ejecutarComoUsuario<EventoComunicable[]>(
    "erp",
    "core.comunicaciones.eventos",
    {},
  );
  const e = r.ok ? r.data.find((x) => x.evento === evento) : undefined;
  const canales = e?.canales.map((c) => c.canal) ?? [];
  const canal = p["canal"] && canales.includes(p["canal"]) ? p["canal"] : (canales[0] ?? "correo");
  const t = e
    ? await ejecutarComoUsuario<Plantillas>("erp", "core.plantillas.get", { evento, canal })
    : null;
  return {
    e,
    canal,
    canales,
    t: t?.ok ? t.data : null,
    empresa: id.actual?.tenant.nombre ?? "OPAI",
  };
}

/** Editor de plantilla de un evento (31): canal, asunto, cuerpo, vista previa e historial. */
export default function Plantilla(props: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Plantilla"
      ruta="/configuracion"
      cargando="detalle"
      cargar={() => cargar(props)}
      opciones={({ e, t, canal }) => {
        const siguiente = Math.max(0, ...(t?.versiones.map((v) => v.version ?? 0) ?? [])) + 1;
        return {
          titulo: e?.nombre ?? "Plantilla",
          volver: {
            href: "/configuracion/comunicaciones",
            etiqueta: `Comunicaciones · ${grupoDe(e?.evento ?? "")}`,
          },
          acciones: (
            <>
              {e && canal === "correo" ? <EnviarPrueba evento={e.evento} /> : null}
              <Button type="submit" form={FORM_PLANTILLA}>
                Publicar versión {siguiente}
              </Button>
            </>
          ),
          accionesTelefono: (
            <Button type="submit" form={FORM_PLANTILLA}>
              Publicar
            </Button>
          ),
        };
      }}
    >
      {({ e, canal, canales, t, empresa }) => {
        if (!e || !t) notFound();
        const inicial = t.vigente ?? t.porDefecto ?? { asunto: "", cuerpo: "", version: null };
        return (
          <div className="flex flex-col gap-4">
            <h2 className="t-title text-fg md:hidden">{e.nombre}</h2>
            {canales.length > 1 ? (
              <Segmentado
                etiqueta="Canal"
                activa={canal}
                Link={LinkNext}
                className="self-start"
                opciones={canales.map((c) => ({
                  id: c,
                  etiqueta: NOMBRE_CANAL[c] ?? c,
                  href: `${rutaEvento(e.evento)}?canal=${c}`,
                }))}
              />
            ) : null}
            <EditorPlantilla
              key={`${canal}-${inicial.version ?? "opai"}`}
              evento={e.evento}
              canal={canal}
              inicial={inicial}
              variables={e.variables}
              remitente={empresa}
              historial={
                <Historial
                  t={t}
                  evento={e.evento}
                  canal={canal}
                  asunto={inicial.asunto}
                  cuerpo={inicial.cuerpo}
                />
              }
            />
          </div>
        );
      }}
    </PaginaPortal>
  );
}
