import { Fragment } from "react";

import type { BloqueNovedad as Bloque, TrozoNovedad } from "@opai/domain";
import { Enlace, Table, Td, Th, Tr } from "@opai/ds";

type PropsTrozos = {
  trozos: readonly TrozoNovedad[];
  enlaceOk?: ((href: string) => boolean) | undefined;
};

function Trozos({ trozos, enlaceOk }: PropsTrozos) {
  return trozos.map((t, i) => {
    if (t.tipo === "texto") return <Fragment key={i}>{t.texto}</Fragment>;
    if (t.tipo === "codigo")
      return (
        <code key={i} className="t-mono rounded-sm bg-fill px-1 text-sm text-fg">
          {t.texto}
        </code>
      );
    if (t.tipo === "negrita")
      return (
        <strong key={i} className="font-semibold">
          <Trozos trozos={t.trozos} enlaceOk={enlaceOk} />
        </strong>
      );
    if (t.tipo === "cursiva")
      return (
        <em key={i}>
          <Trozos trozos={t.trozos} enlaceOk={enlaceOk} />
        </em>
      );
    if (enlaceOk && !enlaceOk(t.href))
      return (
        <Fragment key={i}>
          <Trozos trozos={t.trozos} enlaceOk={enlaceOk} />
        </Fragment>
      );
    return (
      <Enlace key={i} href={t.href} className="inline min-h-0">
        <Trozos trozos={t.trozos} enlaceOk={enlaceOk} />
      </Enlace>
    );
  });
}

function TablaBloque({ b, enlaceOk }: { b: Extract<Bloque, { tipo: "tabla" }>; enlaceOk?: PropsTrozos["enlaceOk"] }) {
  return (
    <Table etiqueta="Tabla">
      <thead>
        <Tr>
          {b.encabezados.map((c, j) => (
            <Th key={j}>
              <Trozos trozos={c} enlaceOk={enlaceOk} />
            </Th>
          ))}
        </Tr>
      </thead>
      <tbody>
        {b.filas.map((fila, r) => (
          <Tr key={r}>
            {fila.map((c, j) => (
              <Td key={j}>
                <Trozos trozos={c} enlaceOk={enlaceOk} />
              </Td>
            ))}
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}

export function BloqueVista({ b, enlaceOk }: { b: Bloque; enlaceOk?: PropsTrozos["enlaceOk"] }) {
  if (b.tipo === "titulo")
    return (
      <p className="t-label text-fg">
        <Trozos trozos={b.trozos} enlaceOk={enlaceOk} />
      </p>
    );
  if (b.tipo === "parrafo")
    return (
      <p>
        <Trozos trozos={b.trozos} enlaceOk={enlaceOk} />
      </p>
    );
  if (b.tipo === "tabla") return <TablaBloque b={b} enlaceOk={enlaceOk} />;
  const Lista = b.ordenada ? "ol" : "ul";
  return (
    <Lista className={`${b.ordenada ? "list-decimal" : "list-disc"} flex flex-col gap-1 pl-5`}>
      {b.items.map((item, j) => (
        <li key={j}>
          <Trozos trozos={item} enlaceOk={enlaceOk} />
        </li>
      ))}
    </Lista>
  );
}

export function TrozosNovedad(props: PropsTrozos) {
  return <Trozos {...props} />;
}
