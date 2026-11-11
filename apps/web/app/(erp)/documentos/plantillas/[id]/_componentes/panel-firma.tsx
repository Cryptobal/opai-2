"use client";

import {
  ETIQUETA_FIRMANTES,
  exigeAceptacionMedio,
  FIRMANTES_PLANTILLA,
  nivelPlantillaValido,
  type ClasePlantilla,
  type FirmantesPlantilla,
  type NivelPlantilla,
} from "@opai/domain";
import { Alerta, Campo, RadioGroup, Segmentado } from "@opai/ds";

const AYUDA_NIVEL: Record<NivelPlantilla, string> = {
  N1: "N1: enlace personal o sesión en OPAI, con aceptación expresa. N3 (FEA) está apagada en Configuración.",
  N2: "N2: OTP y prueba de vida o carnet con selfie. N3 (FEA) está apagada en Configuración.",
};

type Props = {
  clase: ClasePlantilla;
  nivel: NivelPlantilla;
  firmantes: FirmantesPlantilla;
  onNivel: (n: NivelPlantilla) => void;
  onFirmantes: (f: FirmantesPlantilla) => void;
  soloLectura: boolean;
};

/** Columna derecha del diseño 06: firma por defecto (N3 apagada), quién firma y el aviso del medio. */
export function PanelFirma({ clase, nivel, firmantes, onNivel, onFirmantes, soloLectura }: Props) {
  const opcion = (n: NivelPlantilla) => ({
    id: n,
    etiqueta: n,
    onClick: () => onNivel(n),
    disabled: soloLectura || !nivelPlantillaValido(clase, n),
  });
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Campo etiqueta="Nivel de firma por defecto" ayuda={AYUDA_NIVEL[nivel]}>
        <Segmentado
          etiqueta="Nivel de firma"
          activa={nivel}
          opciones={[
            opcion("N1"),
            opcion("N2"),
            { id: "N3", etiqueta: "N3 · FEA", disabled: true },
          ]}
        />
      </Campo>
      <RadioGroup
        etiqueta="Quién firma"
        valor={firmantes}
        onCambiar={(v) => {
          if (!soloLectura) onFirmantes(v as FirmantesPlantilla);
        }}
        opciones={FIRMANTES_PLANTILLA.map((f) => ({
          valor: f,
          etiqueta: ETIQUETA_FIRMANTES[f],
          disabled: soloLectura,
          ...(f === "ambos" ? { descripcion: "Primero el trabajador, después el empleador" } : {}),
        }))}
      />
      {exigeAceptacionMedio(clase) ? (
        <Alerta tono="info" titulo="Medio electrónico">
          Solo se envía a trabajadores que aceptaron el medio electrónico, y siempre a su correo
          personal.
        </Alerta>
      ) : null}
    </div>
  );
}
