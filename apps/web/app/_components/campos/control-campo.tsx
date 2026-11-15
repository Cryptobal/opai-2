"use client";

import { Checkbox, Input, InputFecha, InputHora, RadioGroup, Select, Textarea } from "@opai/ds";

import type { CampoMostrable } from "@opai/domain";

/** Lo que se edita: el servidor valida y normaliza (un número puede llegar como texto «12,5»). */
export type Entrada = string | boolean | string[] | null;
type Props = {
  c: CampoMostrable & { etiqueta: string };
  id: string;
  valor: Entrada;
  onCambiar: (v: Entrada) => void;
};

const VACIO = "_vacio";
const SI_NO = [
  { valor: VACIO, etiqueta: "Sin valor" },
  { valor: "si", etiqueta: "Sí" },
  { valor: "no", etiqueta: "No" },
];
const texto = (v: Entrada) => (typeof v === "string" ? v : "");
const dos = (n: number) => String(n).padStart(2, "0");

/** Fecha y hora local del navegador (Chile) a ISO; las partes se ven como dd-mm-aaaa y HH:mm. */
function FechaHora({ id, valor, onCambiar }: Omit<Props, "c">) {
  const d = typeof valor === "string" && valor ? new Date(valor) : null;
  const fecha = d ? `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}` : "";
  const hora = d ? `${dos(d.getHours())}:${dos(d.getMinutes())}` : "";
  const armar = (f: string, h: string) =>
    onCambiar(f ? new Date(`${f}T${h || "00:00"}`).toISOString() : null);
  return (
    <div className="grid grid-cols-2 gap-2">
      <InputFecha id={id} valor={fecha} onCambiar={(f) => armar(f, hora)} />
      <InputHora
        aria-label="Hora"
        valor={hora}
        onCambiar={(h) => armar(fecha, h)}
        disabled={!fecha}
      />
    </div>
  );
}

function Casillas({ c, id, valor, onCambiar }: Props) {
  const elegidas = Array.isArray(valor) ? valor : [];
  return (
    <div className="flex flex-col gap-1" id={id}>
      {c.opciones.map((o) => (
        <Checkbox
          key={o.valor}
          etiqueta={o.etiqueta}
          marcado={elegidas.includes(o.valor)}
          onCambiar={(m) =>
            onCambiar(m ? [...elegidas, o.valor] : elegidas.filter((x) => x !== o.valor))
          }
        />
      ))}
    </div>
  );
}

/** Control de un campo personalizado según su tipo. */
export function ControlCampo({ c, id, valor, onCambiar }: Props) {
  const v = texto(valor);
  const input = (extra: Record<string, string>) => (
    <Input
      id={id}
      value={v}
      maxLength={500}
      onChange={(e) => onCambiar(e.target.value)}
      {...extra}
    />
  );
  switch (c.tipo) {
    case "texto":
    case "rut":
      return input({});
    case "numero":
      return input({
        inputMode: c.formato === "entero" || c.formato === "moneda_clp" ? "numeric" : "decimal",
      });
    case "email":
      return input({ type: "email", inputMode: "email" });
    case "telefono":
      return input({ type: "tel", inputMode: "tel" });
    case "url":
      return input({ type: "url", inputMode: "url" });
    case "texto_largo":
      return (
        <Textarea
          id={id}
          rows={4}
          maxLength={5000}
          value={v}
          onChange={(e) => onCambiar(e.target.value)}
        />
      );
    case "fecha":
      return <InputFecha id={id} valor={v} onCambiar={onCambiar} />;
    case "fecha_hora":
      return <FechaHora id={id} valor={valor} onCambiar={onCambiar} />;
    case "si_no": {
      const actual = typeof valor === "boolean" ? (valor ? "si" : "no") : VACIO;
      return (
        <Select
          id={id}
          valor={actual}
          onCambiar={(x) => onCambiar(x === VACIO ? null : x === "si")}
          opciones={SI_NO}
        />
      );
    }
    case "lista":
    case "usuario": {
      const opciones = [{ valor: VACIO, etiqueta: "Sin valor" }, ...c.opciones];
      return (
        <Select
          id={id}
          valor={v || VACIO}
          onCambiar={(x) => onCambiar(x === VACIO ? null : x)}
          opciones={opciones}
        />
      );
    }
    case "radio":
      return (
        <RadioGroup
          valor={v || undefined}
          onCambiar={onCambiar}
          opciones={c.opciones}
          etiqueta={c.etiqueta}
        />
      );
    case "multiple":
      return <Casillas c={c} id={id} valor={valor} onCambiar={onCambiar} />;
    default: {
      const nunca: never = c.tipo;
      return nunca;
    }
  }
}
