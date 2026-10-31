"use client";

import { Bot, Globe, Mail, PenLine, type LucideIcon } from "lucide-react";
import { useState } from "react";

import {
  Alerta,
  avisar,
  Badge,
  Button,
  Campo,
  Input,
  Select,
  SeccionTarjeta,
  Textarea,
} from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { useMiembros } from "@/app/(erp)/solicitudes/_componentes/use-miembros";

export type CanalConfig = {
  canal: "formulario_web" | "correo" | "agente" | "manual";
  estado: "sin_conectar" | "conectado" | "revocado";
  dominioAutorizado: string | null;
  remitentesIgnorados: string[];
  responsableId: string | null;
};

const INFO: Record<CanalConfig["canal"], { nombre: string; texto: string; icono: LucideIcon }> = {
  formulario_web: {
    nombre: "Formulario web",
    texto:
      "Recibe las consultas del sitio de la empresa. Disponible con la próxima entrega: aún no hay endpoint ni clave.",
    icono: Globe,
  },
  correo: {
    nombre: "Correo de entrada",
    texto:
      "Una dirección por empresa que crea solicitudes desde los mensajes. Disponible con la próxima entrega.",
    icono: Mail,
  },
  agente: {
    nombre: "Agente",
    texto:
      "Los agentes registran solicitudes con la herramienta comercial_solicitudes_create, con vista previa.",
    icono: Bot,
  },
  manual: {
    nombre: "Registro manual",
    texto:
      "Una persona registra la solicitud desde la bandeja (por ejemplo, un mensaje de WhatsApp).",
    icono: PenLine,
  },
};

const ESTADO = {
  sin_conectar: { etiqueta: "Sin conectar", tono: "neutro" },
  conectado: { etiqueta: "Conectado", tono: "success" },
  revocado: { etiqueta: "Revocado", tono: "danger" },
} as const;

function TarjetaCanal({ c }: { c: CanalConfig }) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const miembros = useMiembros(true);
  const [responsable, setResponsable] = useState<string | undefined>(c.responsableId ?? undefined);
  const [dominio, setDominio] = useState(c.dominioAutorizado ?? "");
  const [ignorados, setIgnorados] = useState(c.remitentesIgnorados.join("\n"));
  const info = INFO[c.canal];
  async function guardar() {
    const r = await ejecutar("comercial.canales.update", {
      canal: c.canal,
      ...(responsable ? { responsableId: responsable } : {}),
      ...(c.canal === "formulario_web" ? { dominioAutorizado: dominio.trim() || null } : {}),
      ...(c.canal === "correo"
        ? {
            remitentesIgnorados: ignorados
              .split("\n")
              .map((x) => x.trim())
              .filter(Boolean),
          }
        : {}),
    });
    if (r) avisar.exito(`${info.nombre} guardado`);
  }
  return (
    <SeccionTarjeta titulo={info.nombre}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <info.icono aria-hidden className="size-4 text-fg-muted" />
          <Badge tono={ESTADO[c.estado].tono} punto={false}>
            {ESTADO[c.estado].etiqueta}
          </Badge>
        </div>
        <p className="t-caption">{info.texto}</p>
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {c.canal === "formulario_web" ? (
          <Campo
            etiqueta="Dominio autorizado"
            htmlFor="canal-dominio"
            ayuda="Solo el dominio, por ejemplo atlas.cl."
          >
            <Input
              id="canal-dominio"
              value={dominio}
              onChange={(e) => setDominio(e.target.value)}
              maxLength={120}
            />
          </Campo>
        ) : null}
        {c.canal === "correo" ? (
          <Campo etiqueta="Remitentes ignorados" htmlFor="canal-ignorados" ayuda="Uno por línea.">
            <Textarea
              id="canal-ignorados"
              rows={3}
              value={ignorados}
              onChange={(e) => setIgnorados(e.target.value)}
            />
          </Campo>
        ) : null}
        {miembros.length ? (
          <Campo etiqueta="Responsable por defecto" htmlFor={`canal-resp-${c.canal}`}>
            <Select
              id={`canal-resp-${c.canal}`}
              valor={responsable}
              onCambiar={setResponsable}
              placeholder="Sin asignar"
              opciones={miembros}
            />
          </Campo>
        ) : null}
        <div>
          <Button disabled={pendiente} onClick={() => void guardar()}>
            {pendiente ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </div>
    </SeccionTarjeta>
  );
}

/** Los cuatro canales como tarjetas apiladas (mobile first, sin tablas anchas). */
export function EditorCanales({ canales }: { canales: CanalConfig[] }) {
  return (
    <div className="flex flex-col gap-4">
      {canales.map((c) => (
        <TarjetaCanal key={c.canal} c={c} />
      ))}
    </div>
  );
}
