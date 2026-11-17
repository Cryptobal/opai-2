import { PageHeader, Table, Td, Th, Tr } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { ejecutarComoUsuario } from "@/lib/servidor";

export const metadata = { title: "Respaldos y retención" };

type Item = {
  id: string;
  origen: string;
  manifiestoSha256: string;
  totalMarcas: number;
  cadenaVerificadaOk: boolean;
  generadoEn: string;
};

export default function RespaldosAsistencia() {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Respaldos"
      ruta="/asistencia/respaldos"
      cargar={async () => ejecutarComoUsuario<{ items: Item[]; retencionAnios: number }>("erp", "asistencia.respaldos.listar", {})}
    >
      {(r) => (
        <div className="flex flex-col gap-4">
          <PageHeader
            eyebrow="Asistencia"
            title="Respaldos y retención"
            subtitle={r.ok ? `Retención mínima: ${r.data.retencionAnios} años.` : "Respaldos de la bitácora con manifiesto SHA-256."}
          />
          <Table etiqueta="Respaldos">
            <thead>
              <Tr><Th>Fecha</Th><Th>Origen</Th><Th>Marcas</Th><Th>SHA-256</Th><Th>Cadena</Th></Tr>
            </thead>
            <tbody>
              {(r.ok ? r.data.items : []).map((a) => (
                <Tr key={a.id}>
                  <Td>{a.generadoEn}</Td>
                  <Td>{a.origen}</Td>
                  <Td numeric>{a.totalMarcas}</Td>
                  <Td mono className="max-w-[200px] truncate">{a.manifiestoSha256}</Td>
                  <Td>{a.cadenaVerificadaOk ? "OK" : "—"}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </PaginaPortal>
  );
}