import { Badge, Empty, Enlace, Table, Td, Th, Tr } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import { SwitchTipo } from "./switch-tipo";
import { etiquetaPortales, type TipoDoc } from "./tipos";

/** Tipos de una capa (32): código, nombre, obligatorio, vence, alerta, normativa y portal. */
export function TablaTipos({ tipos, puede }: { tipos: TipoDoc[]; puede: boolean }) {
  if (!tipos.length)
    return <Empty titulo="Sin tipos en esta capa" descripcion="Crea uno con “Nuevo tipo”." />;
  return (
    <Table>
      <thead>
        <tr>
          <Th>Código</Th>
          <Th>Nombre</Th>
          <Th>Obligatorio</Th>
          <Th>Vence</Th>
          <Th className="text-right">Alerta</Th>
          <Th>Normativa</Th>
          <Th>Portal</Th>
        </tr>
      </thead>
      <tbody>
        {tipos.map((t) => (
          <Tr key={t.id}>
            <Td className="t-mono max-w-32 truncate text-xs uppercase" title={t.codigo}>
              {t.codigo}
            </Td>
            <Td className="font-medium">
              {puede ? (
                <Enlace Link={LinkNext} variante="fila" href={`?editar=${t.id}`}>
                  {t.nombre}
                </Enlace>
              ) : (
                t.nombre
              )}
              {t.activo ? null : (
                <Badge className="ml-2" punto={false}>
                  Inactivo
                </Badge>
              )}
            </Td>
            <Td>
              <SwitchTipo
                id={t.id}
                campo="obligatorio"
                activo={t.obligatorio}
                etiqueta={`${t.nombre}: obligatorio`}
                disabled={!puede}
              />
            </Td>
            <Td>
              <SwitchTipo
                id={t.id}
                campo="tieneVencimiento"
                activo={t.tieneVencimiento}
                etiqueta={`${t.nombre}: vence`}
                disabled={!puede}
              />
            </Td>
            <Td className="t-numeric text-right">
              {t.tieneVencimiento ? `${t.diasAlerta} días` : "—"}
            </Td>
            <Td className="text-fg-muted">{t.normativa ?? "—"}</Td>
            <Td className="text-fg-muted">{etiquetaPortales(t.visiblePortalDefault)}</Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}
