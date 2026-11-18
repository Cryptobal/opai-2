import { Badge, Table, Td, Th, Tr } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { ejecutarComoUsuario } from "@/lib/servidor";

export const metadata = { title: "Checklist de certificación DT" };

type Check = {
  sinCertificar: true;
  resumen: string;
  items: {
    id: string;
    tema: string;
    requisito: string;
    estado: "c" | "p" | "n";
    etiquetaEstado: string;
    evidencia: string;
  }[];
};

const tono = { c: "success" as const, p: "warning" as const, n: "danger" as const };

export default function CertificacionDt() {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Checklist de certificación"
      ruta="/asistencia/certificacion"
      completo
      cargar={async () => ejecutarComoUsuario<Check>("erp", "asistencia.certificacion.checklist", { filtro: "todos" })}
    >
      {(r) => {
        if (!r.ok) return null;
        const d = r.data;
        return (
          <div className="flex flex-col gap-4">
            <Badge tono="warning">Sin certificar</Badge>
            <p className="t-body-sm text-fg-muted">{d.resumen}</p>
            <Table etiqueta="Checklist Res. 38">
              <thead>
                <Tr>
                  <Th>N.º</Th>
                  <Th>Tema</Th>
                  <Th>Requisito</Th>
                  <Th>Estado</Th>
                  <Th>Evidencia</Th>
                </Tr>
              </thead>
              <tbody>
                {d.items.map((i) => (
                  <Tr key={i.id}>
                    <Td className="font-mono text-sm">{i.id}</Td>
                    <Td>{i.tema}</Td>
                    <Td>{i.requisito}</Td>
                    <Td>
                      <Badge tono={tono[i.estado]}>{i.etiquetaEstado}</Badge>
                    </Td>
                    <Td className="text-fg-muted">{i.evidencia}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
        );
      }}
    </PaginaPortal>
  );
}