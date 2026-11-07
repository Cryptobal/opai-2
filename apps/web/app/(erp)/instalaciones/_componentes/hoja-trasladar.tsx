"use client";

import { useCallback, useEffect, useState } from "react";

import { Alerta, avisar, Button, Campo, Combobox, Input, InputFecha, Sheet } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";
import type { Puesto } from "@/lib/tipos-maestros";

import { fechaCl, hoyCl, type PrevisualizacionTraslado, type TitularesPuesto } from "./titular-tipos";
import { DiasPrevia } from "./vista-previa-titular";

type Props = { puestos: Puesto[]; subtitulo: string; titulares: TitularesPuesto | null };

/** Trasladar al titular de un puesto a otro puesto (CAR-207), abierto por `?trasladar=<puesto>`. */
export function HojaTrasladar({ puestos, subtitulo, titulares }: Props) {
  const hoja = useHojaUrl("trasladar");
  const puesto = puestos.find((p) => p.id === hoja.valor);
  if (!hoja.abierta || !puesto || !titulares || titulares.puestoId !== puesto.id || !titulares.titularActualId) return null;
  return <Formulario key={puesto.id} puesto={puesto} subtitulo={subtitulo} titulares={titulares} onCerrar={hoja.cerrar} />;
}

function Formulario({ puesto, subtitulo, titulares, onCerrar }: { puesto: Puesto; subtitulo: string; titulares: TitularesPuesto; onCerrar: () => void }) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const hoy = hoyCl();
  const [destino, setDestino] = useState("");
  const [desde, setDesde] = useState(hoy);
  const [inicio, setInicio] = useState(hoy);
  const [propio, setPropio] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [horas, setHoras] = useState("");
  const [distribucion, setDistribucion] = useState("");
  const [pedirJornada, setPedirJornada] = useState(false);
  const [calculada, setCalculada] = useState<{ clave: string; datos: PrevisualizacionTraslado } | null>(null);
  const listo = Boolean(destino && desde && inicio && motivo.trim().length >= 5);
  const nHoras = Number(horas);
  const input = {
    personaId: titulares.titularActualId, puestoDestinoId: destino, desde, inicioCiclo: inicio, motivo: motivo.trim(),
    ...(horas.trim() !== "" && Number.isInteger(nHoras) ? { horasSemanales: nHoras } : {}),
    ...(distribucion.trim() ? { distribucion: distribucion.trim() } : {}),
  };
  const clave = JSON.stringify(input);
  const previa = listo && calculada?.clave === clave ? calculada.datos : null;

  // Vista previa en vivo (dryRun) al elegir destino y motivo; el botón principal la repite si falló.
  const calcular = useCallback(async (c: string) => {
    const r = await ejecutar<PrevisualizacionTraslado>("pauta.titular.trasladar", JSON.parse(c), true);
    if (!r) return;
    setCalculada({ clave: c, datos: r });
    if (r.faltaJornada) setPedirJornada(true);
  }, [ejecutar]);
  useEffect(() => {
    if (!listo) return;
    const t = setTimeout(() => void calcular(clave), 300);
    return () => clearTimeout(t);
  }, [clave, listo, calcular]);
  const faltaJornada = previa?.faltaJornada ?? false;

  async function confirmar() {
    if (await ejecutar("pauta.titular.trasladar", input)) {
      avisar.exito("Guardia trasladado");
      onCerrar();
    }
  }
  return (
    <Sheet
      abierto
      onCerrar={onCerrar}
      titulo={`Trasladar titular · ${puesto.nombre}`}
      descripcion={subtitulo}
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
          {previa ? (
            <Button disabled={pendiente || faltaJornada} cargando={pendiente} onClick={() => void confirmar()}>Trasladar</Button>
          ) : (
            <Button disabled={!listo || pendiente} cargando={pendiente} onClick={() => void calcular(clave)}>Ver vista previa</Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo="No se puede trasladar">{error}</Alerta> : null}
        <Campo etiqueta="Puesto de destino" htmlFor="tr-destino" ayuda="Puestos activos con patrón, de esta u otra instalación.">
          <Combobox id="tr-destino" opciones={titulares.destinos.map((d) => ({ valor: d.id, etiqueta: d.etiqueta }))} valor={destino} onCambiar={([v]) => setDestino(v ?? "")} placeholder="Elegir puesto" />
        </Campo>
        <Campo etiqueta="Rige desde" htmlFor="tr-desde" ayuda="No puede ser anterior a hoy. Para otra instalación rige desde hoy.">
          <InputFecha id="tr-desde" valor={desde} onCambiar={(v) => { setDesde(v); if (!propio) setInicio(v); }} />
        </Campo>
        <Campo etiqueta="Inicio de ciclo" htmlFor="tr-inicio">
          <InputFecha id="tr-inicio" valor={inicio} onCambiar={(v) => { setInicio(v); setPropio(true); }} />
        </Campo>
        <Campo etiqueta="Motivo" htmlFor="tr-motivo" ayuda="Queda en la auditoría y en el vínculo anterior (mínimo 5 caracteres).">
          <Input id="tr-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </Campo>
        {pedirJornada ? (
          <>
            <Alerta tono="warning" titulo="Falta la jornada pactada">El vínculo actual no la tiene y el vínculo nuevo la exige: indica las horas semanales y la distribución.</Alerta>
            <Campo etiqueta="Horas semanales" htmlFor="tr-horas"><Input id="tr-horas" inputMode="numeric" value={horas} onChange={(e) => setHoras(e.target.value)} /></Campo>
            <Campo etiqueta="Distribución" htmlFor="tr-distribucion" ayuda="Por ejemplo: 4x4, 12 horas."><Input id="tr-distribucion" value={distribucion} onChange={(e) => setDistribucion(e.target.value)} /></Campo>
          </>
        ) : null}
        {previa ? (
          <div className="flex flex-col gap-3" aria-live="polite">
            <p className="t-label">Vista previa</p>
            <ul className="t-body-sm flex flex-col gap-1 text-fg-muted">
              {previa.puestosOrigen.map((o) => <li key={o.puestoId}>Su serie en «{o.puesto}» se cierra el {fechaCl(o.serieHasta)}.</li>)}
              {previa.titularDesplazado ? <li>Deja de ser titular del puesto de destino {previa.titularDesplazado.nombre}: ese puesto pasa a ser suyo.</li> : null}
              {previa.vinculoNuevo && previa.vinculoTerminado ? (
                <li>Su vínculo actual termina el {fechaCl(previa.vinculoTerminado.termino)} y se crea uno nuevo en la otra instalación, con borrador de anexo para RR. HH.</li>
              ) : (
                <li>Sigue en la misma instalación: el vínculo no cambia.</li>
              )}
            </ul>
            <DiasPrevia dias={previa.primerosDias} />
            <p className="t-caption text-fg-muted">Patrón {previa.serie.patron}, desde {fechaCl(previa.serie.desde)}. Verde: turno · gris: libre.</p>
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}
