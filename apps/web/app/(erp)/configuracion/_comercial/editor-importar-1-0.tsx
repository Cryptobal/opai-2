"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Card, Textarea } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { type ResumenSiiImport, textoResumenSii } from "./resumen-sii-importar";

type ReporteImport = {
  modulosActivos: string[];
  tributario: {
    cuentasConsideradas: number;
    listasParaFacturar: number;
    incompletas: number;
  };
  pendientes: { entidad: string; filas: number; motivo: string }[];
  avisos: { codigo: string; idsOpai1: string[] }[];
};

type ResultadoImport = {
  dryRun: boolean;
  reporte: ReporteImport;
  aplicadas: { cuentas: number; contactos: number; instalaciones: number; omitidas: number } | null;
  usuariosResueltos: number;
  usuariosSinMembresia: string[];
  sii?: ResumenSiiImport | null;
};

export function EditorImportar10() {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [texto, setTexto] = useState("");
  const [vista, setVista] = useState<ResultadoImport | null>(null);
  const [directa, setDirecta] = useState(false);

  /** `origen` pegado o, sin él, leído por el servidor desde OPAI 1 con la llave de Integraciones. */
  async function correr(dryRun: boolean, directo: boolean) {
    limpiarError();
    let fuente: Record<string, unknown> = { desdeOpai1: true, soloComercial: true };
    if (!directo) {
      try {
        fuente = { origen: JSON.parse(texto) as unknown };
      } catch {
        avisar.error("El JSON no es válido.");
        return;
      }
    }
    const r = await ejecutar<ResultadoImport>("comercial.importar_1_0", { ...fuente, accion: dryRun ? "simular" : "aplicar", usuarios: [] }, dryRun);
    if (!r) return;
    if (!dryRun) {
      avisar.exito(
        `Importación aplicada: ${r.aplicadas?.cuentas ?? 0} cuentas, ${r.aplicadas?.contactos ?? 0} contactos, ${r.aplicadas?.instalaciones ?? 0} instalaciones.`,
      );
    }
    setDirecta(directo);
    setVista(r);
  }

  const trib = vista?.reporte.tributario;

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div>
        <h2 className="t-label text-fg">Importar desde OPAI 1.0</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Trae los datos comerciales de OPAI 1. Primero simula y revisa el resumen; repetir la carga no duplica
          registros. También puedes pegar el export JSON a mano.
        </p>
      </div>
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      <div className="flex flex-col gap-2 rounded-md border border-border p-3">
        <p className="text-sm text-fg">
          <strong>Traer directo desde OPAI 1.</strong> Usa la llave de solo lectura guardada en Configuración ›
          Integraciones › OPAI 1. Trae cuentas, contactos, instalaciones y negocios; no toca Finanzas.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={pendiente} onClick={() => void correr(true, true)}>
            Simular desde OPAI 1
          </Button>
          <Button disabled={pendiente || !vista || !vista.dryRun || !directa} onClick={() => void correr(false, true)}>
            Importar desde OPAI 1
          </Button>
        </div>
      </div>
      <Textarea
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setVista(null);
        }}
        rows={8}
        placeholder='{"accounts":[...],"contacts":[...],"installations":[...]}'
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={pendiente || !texto.trim()} onClick={() => void correr(true, false)}>
          Vista previa (dry-run)
        </Button>
        <Button disabled={pendiente || !vista || vista.dryRun !== true || directa} onClick={() => void correr(false, false)}>
          Aplicar importación
        </Button>
      </div>
      {vista ? (
        <>
          <Alerta
            tono="info"
            titulo={`Tributario: ${trib?.listasParaFacturar ?? 0} listas · ${trib?.incompletas ?? 0} incompletas · ${trib?.cuentasConsideradas ?? 0} consideradas`}
          />
          {vista.sii ? (
            <Alerta tono="info" titulo={textoResumenSii(vista.sii, !vista.dryRun)} />
          ) : null}
          {vista.usuariosSinMembresia.length > 0 ? (
            <Alerta
              tono="warning"
              titulo={`${vista.usuariosSinMembresia.length} usuarios del JSON sin acceso a esta empresa`}
            />
          ) : null}
          {vista.reporte.pendientes.length > 0 ? (
            <ul className="max-h-40 overflow-auto text-sm text-fg-muted">
              {vista.reporte.pendientes.map((p) => (
                <li key={`${p.entidad}-${p.motivo}`} className="border-b border-border py-1">
                  {p.entidad}: {p.filas} filas · {p.motivo}
                </li>
              ))}
            </ul>
          ) : null}
          {vista.aplicadas ? (
            <p className="text-sm text-fg">
              Aplicadas: {vista.aplicadas.cuentas} cuentas, {vista.aplicadas.contactos} contactos,{" "}
              {vista.aplicadas.instalaciones} instalaciones ({vista.aplicadas.omitidas} omitidas).
            </p>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}
