"use client";

import { Children, type ReactNode, useState } from "react";

import { Button, cn } from "@opai/ds";

/** Lista que en teléfono se pliega a sus primeras filas con «Ver más»; desde 768 px se ve completa. */
export function FilasPlegables({ visibles, children }: { visibles: number; children: ReactNode }) {
  const [abierta, setAbierta] = useState(false);
  const hay = Children.count(children) > visibles;
  return (
    <>
      <ul className={cn("flex flex-col", !abierta && "max-md:[&>li:nth-child(n+4)]:hidden")}>
        {children}
      </ul>
      {hay ? (
        <Button
          variant="ghost"
          className="md:hidden"
          aria-expanded={abierta}
          onClick={() => setAbierta((v) => !v)}
        >
          {abierta ? "Ver menos" : "Ver más"}
        </Button>
      ) : null}
    </>
  );
}
