"use client";

import { useState } from "react";

import {
  BarraProgreso,
  CampoDireccion,
  CampoSecreto,
  Campo,
  type Direccion,
  InputFecha,
  InputFechaRango,
  InputMonto,
  MapaEstatico,
  SelectorHora,
  Uploader,
} from "@opai/ds";

const SUGERENCIAS = [
  { valor: "p1", etiqueta: "Av. Las Industrias 4520", detalle: "Quilicura, Región Metropolitana" },
  { valor: "p2", etiqueta: "Av. Las Industrias 450", detalle: "Maipú, Región Metropolitana" },
];

/** Simula una subida con progreso y un error por tamaño. */
async function subidaFicticia(archivo: File, progreso: (f: number) => void) {
  for (let i = 1; i <= 10; i++) {
    await new Promise((r) => setTimeout(r, 120));
    progreso(i / 10);
  }
  await new Promise((r) => setTimeout(r, 400));
  if (archivo.name.includes("error")) throw new Error("El archivo no coincide con su huella");
}

/** InputFecha, CampoSecreto, Uploader, CampoDireccion y MapaEstatico. */
export function MuestraCampos() {
  const [fecha, setFecha] = useState("2025-03-03");
  const [rango, setRango] = useState({ desde: "2026-10-01", hasta: "2026-09-01" });
  const [hora, setHora] = useState("08:00");
  const [monto, setMonto] = useState("800000");
  const [dir, setDir] = useState<Direccion | null>(null);
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-4">
        <Campo etiqueta="Fecha" htmlFor="f1">
          <InputFecha id="f1" valor={fecha} onCambiar={setFecha} />
        </Campo>
        <div className="flex flex-col gap-1.5">
          <span className="t-label">Rango desde / hasta</span>
          <InputFechaRango desde={rango.desde} hasta={rango.hasta} onCambiar={setRango} />
        </div>
        <Campo etiqueta="Hora (selector del DS)" htmlFor="h1" ayuda="Se escribe con máscara o se elige de la lista.">
          <SelectorHora id="h1" valor={hora} onCambiar={setHora} />
        </Campo>
        <Campo etiqueta="Monto CLP" htmlFor="m1" ayuda={`Valor guardado: ${monto || "vacío"}`}>
          <InputMonto id="m1" valor={monto} onCambiar={setMonto} placeholder="0" />
        </Campo>
        <Campo etiqueta="Hora · cuartos (00, 15, 30, 45)" htmlFor="h3" ayuda="La lista ofrece horas 00 a 23 y minutos de 15 en 15; otro minuto se escribe con la máscara.">
          <SelectorHora id="h3" valor="08:15" onCambiar={() => undefined} />
        </Campo>
        <Campo etiqueta="Hora · inválida" htmlFor="h2">
          <SelectorHora id="h2" valor="" onCambiar={() => undefined} invalido />
        </Campo>
        <Campo etiqueta="Monto · deshabilitado" htmlFor="m2">
          <InputMonto id="m2" valor="1250000" onCambiar={() => undefined} disabled />
        </Campo>
        <Campo etiqueta="Clave propia · ingresando" htmlFor="sec1">
          <CampoSecreto id="sec1" onGuardar={() => undefined} />
        </Campo>
        <Campo etiqueta="Clave propia · guardada" htmlFor="sec2">
          <CampoSecreto id="sec2" guardado="1234" onGuardar={() => undefined} />
        </Campo>
        <Uploader procesar={subidaFicticia} tipos="PDF, JPG o PNG" tamanoMaximoMb={50} multiple />
      </div>
      <div className="flex flex-col gap-4">
        <Campo etiqueta="Dirección" htmlFor="dir">
          <CampoDireccion
            id="dir"
            valor={dir}
            onCambiar={setDir}
            geocercaM={300}
            buscar={async (q) =>
              SUGERENCIAS.filter((s) => s.etiqueta.toLowerCase().includes(q.toLowerCase()))
            }
            resolver={async (id) => ({
              calle: id === "p1" ? "Av. Las Industrias 4520" : "Av. Las Industrias 450",
              comuna: id === "p1" ? "Quilicura" : "Maipú",
              region: "Región Metropolitana",
              placeId: id,
              lat: -33.36,
              lng: -70.73,
            })}
          />
        </Campo>
        <Campo etiqueta="Dirección · servicio de mapas con falla" htmlFor="dir-error">
          <CampoDireccion
            id="dir-error"
            valor={null}
            onCambiar={() => undefined}
            sinMapa
            error="El mapa no responde. Escribe la dirección a mano y avisa a un administrador."
            buscar={async () => []}
            resolver={async () => null}
          />
        </Campo>
        <MapaEstatico lat={-33.36} lng={-70.73} geocercaM={300} pie="Geocerca 300 m" />
        <MapaEstatico lat={null} lng={null} />
        <div className="flex flex-col gap-2">
          <BarraProgreso valor={0.34} etiqueta="Presupuesto al 34 %" />
          <BarraProgreso valor={0.82} tono="warning" etiqueta="Presupuesto al 82 %" />
          <BarraProgreso valor={1} tono="danger" etiqueta="Presupuesto agotado" />
        </div>
      </div>
    </div>
  );
}
