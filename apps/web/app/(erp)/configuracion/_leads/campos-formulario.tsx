import { formatearFechaHora } from "@opai/domain";
import { Key } from "lucide-react";

import { Button, Campo, Input } from "@opai/ds";

import type { CanalConfig } from "./canales-info";

type Props = {
  c: CanalConfig;
  dominio: string;
  onDominio: (v: string) => void;
  urlEndpoint: string;
  tokenActivo: boolean;
  tokenSufijo: string | null;
  pendiente: boolean;
  onGenerar: () => void;
};

/** Campos del canal «formulario web»: dominio, endpoint y estado de la clave. */
export function CamposFormulario({
  c,
  dominio,
  onDominio,
  urlEndpoint,
  tokenActivo,
  tokenSufijo,
  pendiente,
  onGenerar,
}: Props) {
  return (
    <>
      <Campo
        etiqueta="Dominio autorizado"
        htmlFor="canal-dominio"
        ayuda="Opcional. Solo el dominio, por ejemplo gard.cl. Si lo defines, los envíos desde el navegador deben venir de ese sitio."
      >
        <Input
          id="canal-dominio"
          value={dominio}
          onChange={(e) => onDominio(e.target.value)}
          maxLength={120}
        />
      </Campo>
      {c.endpoint ? (
        <Campo
          etiqueta="Endpoint"
          htmlFor="canal-endpoint"
          ayuda="URL pública del POST (sin la clave)."
        >
          <Input id="canal-endpoint" readOnly value={urlEndpoint} />
        </Campo>
      ) : null}
      {tokenActivo && tokenSufijo ? (
        <p className="t-caption text-fg-muted">
          Clave activa · termina en <span className="t-mono">{tokenSufijo}</span>
          {c.ultimaSolicitudEn ? ` · último envío ${formatearFechaHora(c.ultimaSolicitudEn)}` : ""}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={pendiente} onClick={() => onGenerar()}>
          <Key className="size-4" aria-hidden />
          Generar nueva clave
        </Button>
      </div>
    </>
  );
}
