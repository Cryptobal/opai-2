"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Card } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { textoMotivo } from "./motivos-importar-cotizaciones";

type Conteo = { crear: number; sin_cambios: number; omitido: number; conflicto: number; actualizar: number };

type Resultado = {
  dryRun: boolean;
  reporte: {
    conteos: { cotizacion: Conteo };
    omitidas: { entidad: string; motivo: string; idsOpai1: string[] }[];
    avisos: { codigo: string; idsOpai1: string[] }[];
  } | null;
  aplicadas: { cotizaciones?: number; importacionId: string } | null;
  revertir: { revertidos: number; bloqueados: { motivo: string }[] } | null;
};

const BASE = { desdeOpai1: true, soloComercial: true, soloCotizaciones: true, usuarios: [] };

export function EditorImportarCotizaciones({ conOpai1 }: { conOpai1: boolean }) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [vista, setVista] = useState<Resultado | null>(null);
  const [hecha, setHecha] = useState<string | null>(null);

  async function simular() {
    setHecha(null);
    const r = await ejecutar<Resultado>("comercial.importar_1_0", { ...BASE, accion: "simular" }, true);
    if (r) setVista(r);
  }

  async function importar() {
    const r = await ejecutar<Resultado>("comercial.importar_1_0", {
      ...BASE,
      accion: "aplicar",
      permitirReimportacion: true,
    });
    if (!r?.aplicadas) return;
    setHecha(r.aplicadas.importacionId);
    setVista(null);
    avisar.exito(`Se importaron ${r.aplicadas.cotizaciones ?? 0} cotizaciones.`);
  }

  async function deshacer() {
    if (!hecha) return;
    const r = await ejecutar<Resultado>("comercial.importar_1_0", { accion: "revertir", importacionId: hecha, usuarios: [] });
    if (!r?.revertir) return;
    avisar.exito(
      r.revertir.bloqueados.length > 0
        ? "No se deshizo: hay cotizaciones con trabajo hecho encima."
        : `Se deshizo la importación (${r.revertir.revertidos} filas).`,
    );
    setHecha(null);
  }

  const c = vista?.reporte?.conteos.cotizacion;
  return (
    <Card className="flex flex-col gap-4 p-4">
      <div>
        <h2 className="t-label text-fg">Importar cotizaciones desde OPAI 1</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Trae las cotizaciones de OPAI 1 y las cuelga de sus negocios. Primero simula y revisa el resumen: no
          modifica cuentas, contactos, instalaciones ni negocios, y repetir la carga no duplica.
        </p>
      </div>
      {!conOpai1 ? (
        <Alerta tono="warning" titulo="Falta la integración «OPAI 1 (traer datos)» en Configuración › Integraciones." />
      ) : null}
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={pendiente || !conOpai1} onClick={() => void simular()}>
          Simular
        </Button>
        <Button disabled={pendiente || !vista?.dryRun || (c?.crear ?? 0) === 0} onClick={() => void importar()}>
          Importar {c ? `${c.crear} cotizaciones` : "cotizaciones"}
        </Button>
        {hecha ? (
          <Button variant="secondary" disabled={pendiente} onClick={() => void deshacer()}>
            Deshacer esta importación
          </Button>
        ) : null}
      </div>
      {c ? (
        <>
          <Alerta
            tono="info"
            titulo={`Se crearían ${c.crear} cotizaciones · ${c.sin_cambios} ya estaban · ${c.omitido + c.conflicto} no entran`}
          />
          <ul className="max-h-48 overflow-auto text-sm text-fg-muted">
            {vista?.reporte?.omitidas
              .filter((o) => o.entidad === "cotizacion")
              .map((o) => (
                <li key={o.motivo} className="border-b border-border py-1">
                  {o.idsOpai1.length} sin importar: {textoMotivo(o.motivo)}
                </li>
              ))}
            {vista?.reporte?.avisos
              .filter((a) => a.codigo.startsWith("cotizacion_"))
              .map((a) => (
                <li key={a.codigo} className="border-b border-border py-1">
                  {a.idsOpai1.length} con aviso: {textoMotivo(a.codigo)}
                </li>
              ))}
          </ul>
        </>
      ) : null}
    </Card>
  );
}
