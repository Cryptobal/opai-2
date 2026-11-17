"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { avisar, Badge, BarraSeleccion, Button, Checkbox, Dialog, FilaSeleccionable, Textarea } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { ejecutarCapacidad } from "@/app/_components/ejecutar-capacidad";

import { pesos } from "../formato";
import { hrefBandeja, RUTA_BANDEJA, type Bandeja, type FiltrosBandeja } from "./tipos";

type Fila = Bandeja["items"][number];

/** Selección múltiple en la bandeja (CAR-613): aprobar o rechazar con vista previa. */
export function ListaBandejaSeleccion({
  filtros,
  rendiciones,
  idActiva,
}: {
  filtros: FiltrosBandeja;
  rendiciones: readonly Fila[];
  idActiva: string | null;
}) {
  const router = useRouter();
  const [sel, setSel] = useState<ReadonlySet<string>>(new Set());
  const [motivo, setMotivo] = useState("");
  const [dialogo, setDialogo] = useState<"aprobar" | "rechazar" | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ids = [...sel];
  const alternar = (id: string, v: boolean) => setSel((p) => { const n = new Set(p); if (v) n.add(id); else n.delete(id); return n; });
  const soloEnviadas = (r: Fila) => r.estado === "enviada";

  async function vistaPrevia(accion: "aprobar" | "rechazar") {
    setError(null);
    if (accion === "rechazar" && motivo.trim().length < 3)
      return setError("Escribe el motivo (mínimo 3 letras) para rechazar.");
    setOcupado(true);
    const cap = accion === "aprobar" ? "rendiciones.bandeja.aprobar_varias" : "rendiciones.bandeja.rechazar_varias";
    const entrada = accion === "aprobar" ? { ids } : { ids, motivo: motivo.trim() };
    const r = await ejecutarCapacidad("erp", cap, entrada, true);
    setOcupado(false);
    if (!r.ok) return setError(r.error.message);
    const d = r.data as { aplicadas: { codigoVisible: string }[]; omitidas: { motivo: string }[] };
    setPreview(
      `Listas: ${d.aplicadas.map((x) => x.codigoVisible).join(", ") || "ninguna"}.` +
        (d.omitidas.length ? ` Omitidas: ${d.omitidas.length}.` : ""),
    );
    setDialogo(accion);
  }

  async function confirmar() {
    if (!dialogo) return;
    setOcupado(true);
    setError(null);
    const cap = dialogo === "aprobar" ? "rendiciones.bandeja.aprobar_varias" : "rendiciones.bandeja.rechazar_varias";
    const entrada = dialogo === "aprobar" ? { ids } : { ids, motivo: motivo.trim() };
    const r = await ejecutarCapacidad("erp", cap, entrada);
    setOcupado(false);
    if (!r.ok) return setError(r.error.message);
    const d = r.data as { aplicadas: { codigoVisible: string }[] };
    avisar.exito(`${d.aplicadas.length} rendiciones ${dialogo === "aprobar" ? "aprobadas" : "rechazadas"}`);
    setDialogo(null);
    setSel(new Set());
    router.push(RUTA_BANDEJA);
    router.refresh();
  }

  return (
    <>
      <ul>
        {rendiciones.map((r) => (
          <li key={r.id} className="flex items-stretch gap-1">
            {soloEnviadas(r) ? (
              <div className="flex items-center pl-2 md:pl-0">
                <Checkbox soloControl marcado={sel.has(r.id)} onCambiar={(v) => alternar(r.id, v)} etiqueta={`Seleccionar ${r.codigoVisible}`} />
              </div>
            ) : (
              <span className="w-10 shrink-0" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <FilaSeleccionable
                Link={LinkNext}
                href={hrefBandeja(filtros, r.id)}
                seleccionada={r.id === idActiva}
                titulo={r.codigoVisible}
                secundario={`${r.solicitanteNombre ?? "Persona"} · ${r.descripcion}`}
                terciario={pesos(r.montoTotal)}
                fin={<Badge tono={r.estado === "enviada" ? "info" : r.estado === "aprobada" ? "success" : r.estado === "devuelta" ? "warning" : "danger"}>{r.estado === "enviada" ? "Por revisar" : r.estado}</Badge>}
              />
            </div>
          </li>
        ))}
      </ul>
      {error ? <p role="alert" className="px-4 text-base font-medium text-danger-fg md:px-0">{error}</p> : null}
      {sel.size > 0 ? (
        <BarraSeleccion texto={`${sel.size} seleccionadas`}>
          <div className="hidden max-w-md flex-1 px-2 md:block">
            <Textarea value={motivo} maxLength={500} placeholder="Motivo común al rechazar" onChange={(e) => setMotivo(e.target.value)} />
          </div>
          <Button variant="ghost" className="text-inverse-fg" disabled={ocupado} onClick={() => void vistaPrevia("rechazar")}>
            Rechazar
          </Button>
          <Button disabled={ocupado} onClick={() => void vistaPrevia("aprobar")}>
            Aprobar
          </Button>
        </BarraSeleccion>
      ) : null}
      <Dialog
        abierto={dialogo !== null}
        onCerrar={() => setDialogo(null)}
        titulo={dialogo === "aprobar" ? "¿Aprobar las seleccionadas?" : "¿Rechazar las seleccionadas?"}
        descripcion={preview ?? ""}
        acciones={
          <>
            <Button variant="secondary" onClick={() => setDialogo(null)} disabled={ocupado}>
              Volver
            </Button>
            <Button onClick={() => void confirmar()} disabled={ocupado}>
              {ocupado ? "Guardando…" : "Confirmar"}
            </Button>
          </>
        }
      >
        {dialogo === "rechazar" ? (
          <Textarea className="md:hidden" value={motivo} maxLength={500} onChange={(e) => setMotivo(e.target.value)} />
        ) : null}
      </Dialog>
    </>
  );
}