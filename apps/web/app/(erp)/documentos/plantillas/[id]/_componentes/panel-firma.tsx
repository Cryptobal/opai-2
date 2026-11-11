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

/** Qué significa cada nivel, en simple (CAR-315): el nivel es la exigencia con que se identifica quien firma. */
const NIVELES: readonly { id: string; titulo: string; texto: string }[] = [
  { id: "N1", titulo: "N1 · Simple", texto: "La persona abre su enlace personal o su sesión de OPAI y acepta." },
  { id: "N2", titulo: "N2 · Con verificación", texto: "Además confirma un código y su identidad (prueba de vida o carnet con selfie)." },
  { id: "N3", titulo: "N3 · Firma avanzada (FEA)", texto: "Con certificado digital. Todavía no está disponible." },
];

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
      <Campo
        etiqueta="Cómo se firma (nivel por defecto)"
        ayuda="Toda plantilla necesita un nivel: es el que usan los documentos que salgan de ella. Los niveles en gris no se permiten para este tipo de documento."
      >
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
      <ul className="flex flex-col gap-1.5">
        {NIVELES.map((n) => (
          <li key={n.id} className={n.id === nivel ? "t-caption text-fg" : "t-caption text-fg-muted"}>
            <span className="font-semibold">{n.titulo}.</span> {n.texto}
          </li>
        ))}
      </ul>
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
