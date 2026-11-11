"use client";

import { useState } from "react";

import { avisar, Button, Campo, Select, Uploader } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { MapeoColumnas } from "./mapeo-columnas";
import { aBase64, CEROS, descargar, MAX_MB_PANTALLA, sumar, type AlExistir, type Archivo, type Catalogo, type Resultado } from "./tipos";
import { ResumenConteos, TablaFilas } from "./vista-previa";

const AL_EXISTIR = [
  { valor: "completar", etiqueta: "Completar solo lo que está vacío", descripcion: "Recomendado: no cambia datos que ya tienes." },
  { valor: "sobrescribir", etiqueta: "Reemplazar con lo de la planilla" },
  { valor: "omitir", etiqueta: "No tocar lo que ya existe" },
];

/** Carga de una planilla en tres pasos: elegir qué importar, revisar la simulación y confirmar. */
export function AsistenteImportar({ catalogo }: { catalogo: Catalogo }) {
  const disponibles = catalogo.importadores.filter((i) => i.disponible);
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [importador, setImportador] = useState(disponibles[0]?.id ?? "");
  const [alExistir, setAlExistir] = useState<AlExistir>("completar");
  const [archivo, setArchivo] = useState<Archivo | null>(null);
  const [mapeo, setMapeo] = useState<Record<string, string | null>>({});
  const [vista, setVista] = useState<Resultado | null>(null);
  const [hecho, setHecho] = useState<Resultado["conteos"] | null>(null);
  const def = catalogo.importadores.find((i) => i.id === importador);

  async function simular(a: Archivo, m: Record<string, string | null>, imp = importador, politica = alExistir) {
    setHecho(null);
    const r = await ejecutar<Resultado>("core.importar.ejecutar", { importador: imp, archivo: a, mapeo: m, alExistir: politica }, true);
    setVista(r);
    if (r) setMapeo(r.mapeo);
    return r;
  }
  async function recibir(f: File) {
    const a = { nombre: f.name, contenidoBase64: await aBase64(f) };
    setArchivo(a);
    if (!(await simular(a, {}))) throw new Error("No se pudo leer la planilla.");
  }
  function reiniciar(imp: string) {
    setImportador(imp);
    setArchivo(null);
    setVista(null);
    setMapeo({});
    setHecho(null);
  }
  async function plantilla(formato: "xlsx" | "csv") {
    const p = await ejecutar<{ nombre: string; mime: string; contenidoBase64: string }>("core.importar.plantilla", { importador, formato });
    if (p) descargar(p.nombre, p.mime, p.contenidoBase64);
  }
  async function importar() {
    if (!archivo) return;
    let total = CEROS;
    let desde: number | null = 0;
    let importacionId: string | null = null;
    while (desde !== null) {
      const r: Resultado | null = await ejecutar<Resultado>(
        "core.importar.ejecutar",
        { importador, archivo, mapeo, alExistir, desde, ...(importacionId ? { importacionId } : {}) },
        false,
        desde === 0 ? "layout" : "ninguna",
      );
      if (!r) break;
      total = sumar(total, r.conteos);
      importacionId = r.importacionId ?? importacionId;
      desde = r.siguiente;
    }
    setHecho(total);
    if (desde === null) {
      avisar.exito(`Importación lista: ${total.crear} creados y ${total.actualizar} completados`);
      setArchivo(null);
      setVista(null);
    }
  }

  if (!disponibles.length) return <p className="t-body-sm">No tienes permiso para importar datos en esta empresa.</p>;
  const aEscribir = vista ? vista.conteos.crear + vista.conteos.actualizar : 0;
  const porPartes = vista && vista.siguiente !== null;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Campo etiqueta="Qué quieres importar" htmlFor="importar-que" ayuda={def?.descripcion ?? ""}>
          <Select id="importar-que" valor={importador} onCambiar={reiniciar} disabled={pendiente} opciones={disponibles.map((i) => ({ valor: i.id, etiqueta: i.etiqueta }))} />
        </Campo>
        <Campo etiqueta="Si el registro ya existe" htmlFor="importar-existe">
          <Select
            id="importar-existe"
            valor={alExistir}
            disabled={pendiente}
            opciones={AL_EXISTIR}
            onCambiar={(v) => {
              const politica = v === "sobrescribir" || v === "omitir" ? v : "completar";
              setAlExistir(politica);
              if (archivo) void simular(archivo, mapeo, importador, politica);
            }}
          />
        </Campo>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" disabled={pendiente} onClick={() => void plantilla("xlsx")}>Descargar plantilla Excel</Button>
        <Button variant="ghost" disabled={pendiente} onClick={() => void plantilla("csv")}>Plantilla CSV</Button>
      </div>
      <Uploader
        key={importador}
        procesar={recibir}
        accept=".csv,.xlsx"
        tipos="Excel (.xlsx) o CSV"
        tamanoMaximoMb={MAX_MB_PANTALLA}
        etiquetaBoton="Elegir planilla"
        disabled={pendiente}
        onQuitar={() => reiniciar(importador)}
      />
      {error ? <p role="alert" className="text-sm font-medium text-danger-fg">{error}</p> : null}
      {vista && def ? (
        <div className="flex flex-col gap-4">
          <h3 className="t-label">Columnas ({vista.totalFilas.toLocaleString("es-CL")} filas en la planilla)</h3>
          <MapeoColumnas
            columnas={vista.columnas}
            mapeo={mapeo}
            campos={def.campos}
            disabled={pendiente}
            onCambiar={(col, campo) => archivo && void simular(archivo, { ...mapeo, [col]: campo })}
          />
          {vista.bloqueos.map((b) => (
            <p key={b} role="alert" className="text-sm font-medium text-danger-fg">{b}</p>
          ))}
          {vista.bloqueos.length === 0 ? (
            <>
              <h3 className="t-label">{porPartes ? `Simulación de las primeras ${vista.filas.length} filas` : "Simulación: todavía no se guardó nada"}</h3>
              <ResumenConteos conteos={vista.conteos} />
              <TablaFilas key={`${vista.conteos.error}-${vista.filas.length}`} filas={vista.filas} />
              <div className="flex flex-wrap items-center gap-3">
                <Button disabled={pendiente || (aEscribir === 0 && !porPartes)} onClick={() => void importar()}>
                  {porPartes ? "Importar toda la planilla" : `Importar ${aEscribir.toLocaleString("es-CL")} registros`}
                </Button>
                <p className="t-caption">Las filas con error no se importan. La carga queda como un lote que puedes revertir más abajo.</p>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
      {hecho ? <ResumenConteos conteos={hecho} /> : null}
    </div>
  );
}
