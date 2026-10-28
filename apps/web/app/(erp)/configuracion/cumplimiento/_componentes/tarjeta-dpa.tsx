import { FileSignature } from "lucide-react";

import { Alerta, Badge, ParesGrid, SeccionTarjeta, Table, Td, Th, Tr } from "@opai/ds";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { fechaHora } from "@/lib/formato";

import type { EstadoDpa } from "./datos";

/**
 * Acuerdo de tratamiento de datos (DPA) con OPAI (§16.1): versión vigente, si la empresa la aceptó,
 * quién y cuándo, y el historial. Avisa al owner sin bloquear la operación; solo él acepta.
 */
export function TarjetaDpa({ e, aceptar }: { e: EstadoDpa; aceptar: boolean }) {
  const accion =
    aceptar && e.pendiente ? (
      <EnlaceBotonHoja href="?dpa=1" icono={FileSignature}>
        Revisar y aceptar
      </EnlaceBotonHoja>
    ) : null;
  return (
    <SeccionTarjeta titulo="Acuerdo de tratamiento de datos (DPA)" {...(accion ? { accion } : {})}>
      <div className="flex flex-col gap-4">
        {!e.publicada ? (
          <Alerta tono="info" titulo="OPAI aún no publica una versión del DPA">
            Cuando se publique, el propietario de la empresa podrá revisarla y aceptarla aquí.
          </Alerta>
        ) : e.pendiente ? (
          <Alerta tono="warning" titulo={`Falta aceptar la versión ${e.versionVigente}`}>
            {aceptar
              ? "Revisa el texto y acéptalo en nombre de la empresa. La operación no se bloquea mientras tanto."
              : "Solo el propietario (owner) de la empresa puede aceptarla."}
          </Alerta>
        ) : null}
        <ParesGrid
          items={[
            { etiqueta: "Versión vigente", valor: e.versionVigente || null, mono: true },
            {
              etiqueta: "Estado",
              valor: e.aceptadaVigente ? (
                <Badge tono="success">Aceptada</Badge>
              ) : e.publicada ? (
                <Badge tono="warning">Pendiente</Badge>
              ) : (
                <Badge>Sin publicar</Badge>
              ),
            },
            {
              etiqueta: "Última aceptación",
              valor: e.ultima
                ? `${e.ultima.aceptadoPorNombre ?? e.ultima.aceptadoPorCorreo ?? "—"} · ${fechaHora(e.ultima.aceptadoEn)}`
                : null,
              ancho: true,
            },
          ]}
        />
        {e.historial.length > 1 ? (
          <Table>
            <thead>
              <tr>
                <Th>Versión</Th>
                <Th>Aceptó</Th>
                <Th>Cuándo</Th>
              </tr>
            </thead>
            <tbody>
              {e.historial.map((h) => (
                <Tr key={`${h.version}-${h.aceptadoEn}`}>
                  <Td className="t-mono">{h.version}</Td>
                  <Td>{h.aceptadoPorNombre ?? h.aceptadoPorCorreo ?? "—"}</Td>
                  <Td className="t-numeric">{fechaHora(h.aceptadoEn)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </div>
    </SeccionTarjeta>
  );
}
