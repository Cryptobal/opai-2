"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import {
  correoNormalizado,
  esCorreoValido,
  type DestinatarioDoc,
  type OrigenDestinatario,
  type TipoDestinatario,
  validarDestinatarios,
} from "@opai/domain";
import { avisar, Badge, Button, Card, Input, Select } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

type Sugerencia = { sugeridos: DestinatarioDoc[]; guardados: DestinatarioDoc[] };

const ORIGEN: Record<OrigenDestinatario, string> = {
  casilla_dte: "Casilla DTE",
  contacto_facturacion: "Facturación",
  manual: "Manual",
};
const TIPOS = (["PARA", "CC", "BCC"] as const).map((t) => ({ valor: t, etiqueta: t }));

/** Destinatarios del correo del DTE: sugeridos desde la cuenta, ajustables, con un PARA y copias CC/BCC; se guardan por documento. */
export function EmitirDestinatarios({
  documentoId,
  cuentaId,
}: {
  documentoId: string;
  cuentaId: string | null;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [lista, setLista] = useState<DestinatarioDoc[]>([]);
  const [cargado, setCargado] = useState(false);
  const [nuevo, setNuevo] = useState("");
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    if (!cuentaId) return;
    let cancelar = false;
    void ejecutar<Sugerencia>("finanzas.ventas.destinatarios_sugeridos", {
      cuentaId,
      documentoId,
    }).then((r) => {
      if (cancelar) return;
      setLista(r ? (r.guardados.length > 0 ? r.guardados : r.sugeridos) : []);
      setCargado(true);
    });
    return () => {
      cancelar = true;
    };
  }, [cuentaId, documentoId, ejecutar]);

  const cambiar = (nuevaLista: DestinatarioDoc[]) => {
    setLista(nuevaLista);
    setGuardado(false);
  };
  const problema = cargado ? validarDestinatarios(lista) : null;
  const correo = correoNormalizado(nuevo);
  const repetido = lista.some((d) => correoNormalizado(d.email) === correo);

  function agregar() {
    if (!esCorreoValido(nuevo) || repetido) return;
    const tipo: TipoDestinatario = lista.some((d) => d.tipo === "PARA") ? "CC" : "PARA";
    cambiar([...lista, { tipo, email: correo, origen: "manual" }]);
    setNuevo("");
  }

  async function guardar() {
    const r = await ejecutar("finanzas.ventas.guardar_destinatarios", {
      documentoId,
      destinatarios: lista.map((d) => ({ tipo: d.tipo, email: d.email })),
    });
    if (r) {
      setGuardado(true);
      avisar.exito("Destinatarios guardados");
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="t-label text-fg">Destinatarios del correo</h2>
      <p className="text-sm text-fg-muted">
        Se sugieren la casilla DTE del cliente y sus contactos de facturación. Puedes agregar otros
        correos; un solo PARA y el resto en copia (CC) o copia oculta (BCC).
      </p>
      {cargado && lista.length === 0 ? (
        <p className="text-sm text-fg-muted">
          El cliente no tiene casilla DTE ni contactos de facturación: agrega un correo.
        </p>
      ) : null}
      {lista.map((d, i) => (
        <div
          key={d.email}
          className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2"
        >
          <span className="min-w-0 flex-1 break-all text-sm">{d.email}</span>
          <Badge tono="neutro">{ORIGEN[d.origen]}</Badge>
          <Select
            aria-label={`Tipo de ${d.email}`}
            valor={d.tipo}
            onCambiar={(v) =>
              cambiar(lista.map((x, k) => (k === i ? { ...x, tipo: v as TipoDestinatario } : x)))
            }
            opciones={TIPOS}
          />
          <Button
            variant="ghost"
            aria-label={`Quitar ${d.email}`}
            onClick={() => cambiar(lista.filter((_, k) => k !== i))}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Agregar un correo"
          type="email"
          placeholder="otro@empresa.cl"
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && agregar()}
          className="min-w-0 flex-1"
        />
        <Button variant="secondary" disabled={!esCorreoValido(nuevo) || repetido} onClick={agregar}>
          <Plus className="size-4" aria-hidden />
          Agregar
        </Button>
      </div>
      {problema ? (
        <p role="alert" className="text-sm text-danger-fg">
          {problema}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-danger-fg">
          {error}
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <Button
          disabled={pendiente || !cargado || problema != null || guardado}
          onClick={() => void guardar()}
        >
          Guardar destinatarios
        </Button>
        {guardado ? (
          <span className="text-sm text-fg-muted">Guardados para este documento.</span>
        ) : null}
      </div>
    </Card>
  );
}
