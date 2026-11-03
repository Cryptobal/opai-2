"use client";

import { formatearFechaHora } from "@opai/domain";
import { Bot, Globe, Key, Mail, PenLine, type LucideIcon } from "lucide-react";
import { useState } from "react";

import { Alerta, avisar, Badge, Button, Campo, Dialog, Input, Select, SeccionTarjeta, Textarea } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { useMiembros } from "@/app/(erp)/solicitudes/_componentes/use-miembros";

import { ClaveFormularioCreada, type ClaveFormulario } from "./clave-formulario-creada";

export type CanalConfig = {
  canal: "formulario_web" | "correo" | "agente" | "manual";
  estado: "sin_conectar" | "conectado" | "revocado";
  dominioAutorizado: string | null;
  remitentesIgnorados: string[];
  responsableId: string | null;
  endpoint?: string;
  tokenSufijo?: string | null;
  tokenActivo?: boolean;
  ultimaSolicitudEn?: string | null;
};

const INFO: Record<CanalConfig["canal"], { nombre: string; texto: string; icono: LucideIcon }> = {
  formulario_web: {
    nombre: "Formulario web",
    texto:
      "Recibe consultas desde el sitio de la empresa (por ejemplo gard.cl). Genera una clave, configúrala en el sitio y envía al endpoint público de OPAI.",
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
  const [confirmarClave, setConfirmarClave] = useState(false);
  const [claveNueva, setClaveNueva] = useState<ClaveFormulario | null>(null);
  const [estado, setEstado] = useState(c.estado);
  const [tokenSufijo, setTokenSufijo] = useState(c.tokenSufijo ?? null);
  const [tokenActivo, setTokenActivo] = useState(c.tokenActivo ?? false);
  const info = INFO[c.canal];
  const origen = typeof window !== "undefined" ? window.location.origin : "";
  const urlEndpoint = c.endpoint ? `${origen}${c.endpoint}` : "";

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

  async function generarClave() {
    setConfirmarClave(false);
    const r = await ejecutar<{
      token: string;
      endpoint: string;
      estado: CanalConfig["estado"];
      tokenSufijo: string;
    }>("comercial.canales.rotar_token_formulario", {});
    if (!r) return;
    setEstado(r.estado);
    setTokenSufijo(r.tokenSufijo);
    setTokenActivo(true);
    setClaveNueva({ token: r.token, endpoint: r.endpoint });
    avisar.exito("Clave generada. Cópiala antes de cerrar el diálogo.");
  }

  return (
    <SeccionTarjeta titulo={info.nombre}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <info.icono aria-hidden className="size-4 text-fg-muted" />
          <Badge tono={ESTADO[estado].tono} punto={false}>
            {ESTADO[estado].etiqueta}
          </Badge>
        </div>
        <p className="t-caption">{info.texto}</p>
        {c.canal === "formulario_web" && estado === "revocado" ? (
          <Alerta
            tono="danger"
            titulo="La clave del formulario está revocada. Genera una nueva clave para volver a recibir envíos."
          />
        ) : null}
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {c.canal === "formulario_web" ? (
          <>
            <Campo
              etiqueta="Dominio autorizado"
              htmlFor="canal-dominio"
              ayuda="Opcional. Solo el dominio, por ejemplo gard.cl. Si lo defines, los envíos desde el navegador deben venir de ese sitio."
            >
              <Input
                id="canal-dominio"
                value={dominio}
                onChange={(e) => setDominio(e.target.value)}
                maxLength={120}
              />
            </Campo>
            {c.endpoint ? (
              <Campo etiqueta="Endpoint" htmlFor="canal-endpoint" ayuda="URL pública del POST (sin la clave).">
                <Input id="canal-endpoint" readOnly value={urlEndpoint} />
              </Campo>
            ) : null}
            {tokenActivo && tokenSufijo ? (
              <p className="t-caption text-fg-muted">
                Clave activa · termina en <span className="t-mono">{tokenSufijo}</span>
                {c.ultimaSolicitudEn
                  ? ` · último envío ${formatearFechaHora(c.ultimaSolicitudEn)}`
                  : ""}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" disabled={pendiente} onClick={() => setConfirmarClave(true)}>
                <Key className="size-4" aria-hidden />
                Generar nueva clave
              </Button>
            </div>
          </>
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
      <Dialog
        abierto={confirmarClave}
        onCerrar={() => setConfirmarClave(false)}
        titulo="Generar nueva clave"
        acciones={
          <>
            <Button variant="ghost" onClick={() => setConfirmarClave(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={pendiente} onClick={() => void generarClave()}>
              Generar nueva clave
            </Button>
          </>
        }
      >
        <p className="t-body m0">
          La clave anterior dejará de funcionar de inmediato. Deberás actualizar el sitio web con la
          nueva clave.
        </p>
      </Dialog>
      <ClaveFormularioCreada d={claveNueva} onCerrar={() => setClaveNueva(null)} />
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
