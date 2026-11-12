"use client";

import { useState } from "react";

import { avisar, Button, Campo, Input, Select, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { type Hecho, mesCorto, type Propio, type VistaPrevia } from "../../_componentes/tipos";
import { CamposDefinicion } from "./campos-definicion";
import { borradorDe, definicionDe } from "./definicion";

type Props = { propio: Propio | null; hechos: Hecho[]; onCerrar: () => void };
type Guardado = { indicador: Propio; vistaPrevia: VistaPrevia };

const SENTIDOS = [
  { valor: "mayor", etiqueta: "Más es mejor" },
  { valor: "menor", etiqueta: "Menos es mejor" },
];
const numero = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 });

function textoPrevia(v: VistaPrevia): string {
  if (v.sujetos === 0) return `En ${mesCorto(v.periodo)} todavía no hay datos para este indicador.`;
  if (v.promedio === null || v.minimo === null || v.maximo === null) {
    return `En ${mesCorto(v.periodo)} hay datos de ${v.sujetos} persona(s): muy pocas para mostrar un resumen.`;
  }
  return `En ${mesCorto(v.periodo)}: ${v.sujetos} personas, promedio ${numero.format(v.promedio)} (entre ${numero.format(v.minimo)} y ${numero.format(v.maximo)}).`;
}

/** Arma o cambia un indicador propio (`desempeno.propios.guardar`), con prueba sobre datos reales. */
export function HojaPropio({ propio, hechos, onCerrar }: Props) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [nombre, setNombre] = useState(propio?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(propio?.descripcion ?? "");
  const [sentido, setSentido] = useState<string>(propio?.sentido ?? "mayor");
  const [meta, setMeta] = useState<number>(propio?.metaSugerida ?? Number.NaN);
  const [borrador, setBorrador] = useState(borradorDe(propio?.definicion));
  const [previa, setPrevia] = useState<VistaPrevia | null>(null);
  const definicion = definicionDe(borrador, propio?.definicion);
  const valido = nombre.trim().length >= 3 && meta > 0 && definicion !== null;

  async function guardar(publicar: boolean, probar = false) {
    const r = await ejecutar<Guardado>(
      "desempeno.propios.guardar",
      {
        ...(propio ? { id: propio.id } : {}),
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        sentido,
        metaSugerida: meta,
        definicion,
        publicar,
      },
      probar,
    );
    if (!r) return;
    setPrevia(r.vistaPrevia);
    if (probar) return;
    avisar.exito(publicar ? "Indicador publicado" : "Borrador guardado");
    onCerrar();
  }

  async function archivar() {
    if (!propio || !(await ejecutar("desempeno.propios.archivar", { id: propio.id }))) return;
    avisar.exito("Indicador archivado");
    onCerrar();
  }

  return (
    <Sheet
      abierto
      onCerrar={onCerrar}
      titulo={propio ? "Indicador propio" : "Nuevo indicador"}
      acciones={
        <>
          <Button variant="secondary" disabled={pendiente || !valido} onClick={() => void guardar(false)}>
            Guardar borrador
          </Button>
          <Button disabled={pendiente || !valido} onClick={() => void guardar(true)}>
            {pendiente ? "Guardando…" : "Publicar"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Campo etiqueta="Nombre" htmlFor="ip-nombre">
          <Input id="ip-nombre" value={nombre} maxLength={80} onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <Campo etiqueta="Qué mide (opcional)" htmlFor="ip-desc">
          <Input id="ip-desc" value={descripcion} maxLength={300} onChange={(e) => setDescripcion(e.target.value)} />
        </Campo>
        <CamposDefinicion
          valor={borrador}
          hechos={hechos}
          onCambiar={(b) => {
            setBorrador(b);
            setPrevia(null);
          }}
        />
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Qué es mejor" htmlFor="ip-sentido">
            <Select id="ip-sentido" valor={sentido} opciones={SENTIDOS} onCambiar={setSentido} />
          </Campo>
          <Campo etiqueta="Meta sugerida" htmlFor="ip-meta">
            <Input
              id="ip-meta"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={Number.isFinite(meta) ? meta : ""}
              onChange={(e) => setMeta(e.target.valueAsNumber)}
            />
          </Campo>
        </div>
        <div className="flex flex-col items-start gap-2">
          <Button variant="secondary" disabled={pendiente || !valido} onClick={() => void guardar(false, true)}>
            Probar con los datos de este mes
          </Button>
          {previa ? <p className="t-body-sm text-fg">{textoPrevia(previa)}</p> : null}
        </div>
        {propio && !propio.archivado ? (
          <Button variant="ghost" disabled={pendiente} onClick={() => void archivar()}>
            Archivar este indicador
          </Button>
        ) : null}
        {error ? (
          <p role="alert" className="t-body-sm text-danger-fg">
            {error}
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}
