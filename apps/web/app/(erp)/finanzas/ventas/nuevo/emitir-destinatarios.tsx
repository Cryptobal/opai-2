"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

import {
  correoNormalizado,
  esCorreoValido,
  type DestinatarioDoc,
  type TipoDestinatario,
  MAX_PARA,
  validarDestinatarios,
} from "@opai/domain";
import { avisar, Button, Card, Input } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { FilaDestinatario } from "./fila-destinatario";

type Sugerencia = { sugeridos: DestinatarioDoc[]; guardados: DestinatarioDoc[] };

/** Destinatarios del correo del DTE: sugeridos desde la cuenta, ajustables, con hasta 10 PARA y copias CC/BCC; se guardan por documento. */
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
    if (pendiente || !esCorreoValido(nuevo) || repetido) return;
    const tipo: TipoDestinatario = lista.filter((d) => d.tipo === "PARA").length < MAX_PARA ? "PARA" : "CC";
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
        Todos los contactos de facturación reciben como PARA (hasta 10) y la casilla DTE del cliente, que
        recibe el XML, va en copia. Puedes agregar otros correos en PARA, copia (CC) o copia oculta (BCC).
      </p>
      {cargado && lista.length === 0 ? (
        <p className="text-sm text-fg-muted">
          El cliente no tiene casilla DTE ni contactos de facturación: agrega un correo.
        </p>
      ) : null}
      {lista.map((d, i) => (
        <FilaDestinatario
          key={d.email}
          d={d}
          onTipo={(tipo) => cambiar(lista.map((x, k) => (k === i ? { ...x, tipo } : x)))}
          onQuitar={() => cambiar(lista.filter((_, k) => k !== i))}
          deshabilitado={pendiente}
        />
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Agregar un correo"
          type="email"
          placeholder="otro@empresa.cl"
          disabled={pendiente}
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && agregar()}
          className="min-w-0 flex-1"
        />
        <Button
          variant="secondary"
          disabled={pendiente || !esCorreoValido(nuevo) || repetido}
          onClick={agregar}
        >
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
