"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Select, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { Hecho, Propio, VistaPrevia } from "../../_componentes/tipos";
import { ArchivarPropio } from "./archivar-propio";
import { AvisoPendiente } from "./aviso-pendiente";
import { CamposDefinicion } from "./campos-definicion";
import { borradorDe, definicionDe, tieneFiltros } from "./definicion";
import { faltante, textoPrevia, unidadDe, unidadLegible } from "./textos";

type Props = { propio: Propio | null; hechos: Hecho[]; onCerrar: () => void };
type Guardado = { indicador: Propio; vistaPrevia: VistaPrevia };
type Accion = "probar" | "borrador" | "publicar";

const SENTIDOS = [
  { valor: "mayor", etiqueta: "Más es mejor" },
  { valor: "menor", etiqueta: "Menos es mejor" },
];

/** Arma o cambia un indicador propio (`desempeno.propios.guardar`), con prueba sobre datos reales. */
export function HojaPropio({ propio, hechos, onCerrar }: Props) {
  // Si hay un cambio guardado que rige más adelante, se edita ese: es lo último que se guardó.
  const base = propio?.pendiente ?? propio;
  const { ejecutar, error, limpiarError } = useCapacidad("erp");
  const [accion, setAccion] = useState<Accion | null>(null);
  const [nombre, setNombre] = useState(propio?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(propio?.descripcion ?? "");
  const [sentido, setSentido] = useState<string>(base?.sentido ?? "mayor");
  const [meta, setMeta] = useState<number>(base?.metaSugerida ?? Number.NaN);
  const [borrador, setBorrador] = useState(borradorDe(base?.definicion));
  const [previa, setPrevia] = useState<VistaPrevia | null>(null);
  const definicion = definicionDe(borrador, base?.definicion);
  const unidad = unidadDe(definicion, hechos);
  const falta = faltante(nombre, meta, unidad, definicion);
  const soloPublicar = propio?.pendiente?.estado === "publicado";
  const filtros = tieneFiltros(base?.definicion) && definicion !== null && tieneFiltros(definicion);

  async function guardar(a: Accion) {
    const probar = a === "probar";
    limpiarError();
    setAccion(a);
    const r = await ejecutar<Guardado>(
      "desempeno.propios.guardar",
      {
        ...(propio ? { id: propio.id } : {}),
        // La prueba no guarda nada: solo necesita la definición.
        nombre: probar && nombre.trim().length < 3 ? "Prueba de indicador" : nombre.trim(),
        descripcion: descripcion.trim() || null,
        sentido,
        metaSugerida: probar && !(meta > 0) ? 1 : meta,
        definicion,
        publicar: a !== "borrador",
      },
      probar,
    );
    setAccion(null);
    if (!r) return;
    setPrevia(r.vistaPrevia);
    if (probar) return;
    avisar.exito(a === "publicar" ? "Indicador publicado" : "Borrador guardado");
    onCerrar();
  }

  const ocupado = accion !== null;
  return (
    <Sheet
      abierto
      onCerrar={onCerrar}
      titulo={propio ? "Indicador propio" : "Nuevo indicador"}
      acciones={
        <>
          <Button
            variant="secondary"
            disabled={ocupado || falta !== null || soloPublicar}
            onClick={() => void guardar("borrador")}
          >
            {accion === "borrador" ? "Guardando…" : "Guardar borrador"}
          </Button>
          <Button disabled={ocupado || falta !== null} onClick={() => void guardar("publicar")}>
            {accion === "publicar" ? "Publicando…" : "Publicar"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <AvisoPendiente pendiente={propio?.pendiente ?? null} />
        <Campo etiqueta="Nombre" htmlFor="ip-nombre">
          <Input
            id="ip-nombre"
            value={nombre}
            maxLength={80}
            onChange={(e) => setNombre(e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Qué mide (opcional)" htmlFor="ip-desc">
          <Input
            id="ip-desc"
            value={descripcion}
            maxLength={300}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </Campo>
        <CamposDefinicion
          valor={borrador}
          hechos={hechos}
          onCambiar={(b) => (setBorrador(b), setPrevia(null))}
        />
        {filtros ? (
          <p className="t-caption">
            Este indicador tiene filtros armados por un agente. Se conservan mientras no cambies la
            forma ni los hechos.
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Qué es mejor" htmlFor="ip-sentido">
            <Select id="ip-sentido" valor={sentido} opciones={SENTIDOS} onCambiar={setSentido} />
          </Campo>
          <Campo
            etiqueta={unidad ? `Meta sugerida (${unidadLegible(unidad)})` : "Meta sugerida"}
            htmlFor="ip-meta"
          >
            <Input
              id="ip-meta"
              type="number"
              inputMode="decimal"
              min={0}
              {...(unidad === "porcentaje" ? { max: 100 } : {})}
              step="any"
              value={Number.isFinite(meta) ? meta : ""}
              onChange={(e) => setMeta(e.target.valueAsNumber)}
            />
          </Campo>
        </div>
        {falta ? <p className="t-caption text-warning-fg">{falta}</p> : null}
        <div className="flex flex-col items-start gap-2">
          <Button
            variant="secondary"
            disabled={ocupado || definicion === null}
            onClick={() => void guardar("probar")}
          >
            {accion === "probar" ? "Probando…" : "Probar con los datos de este mes"}
          </Button>
          {previa ? <p className="t-body-sm text-fg">{textoPrevia(previa, unidad)}</p> : null}
        </div>
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {propio && !propio.archivado ? (
          <ArchivarPropio id={propio.id} nombre={propio.nombre} onListo={onCerrar} />
        ) : null}
      </div>
    </Sheet>
  );
}
