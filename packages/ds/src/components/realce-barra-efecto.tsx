"use client";

import { useEffect, useRef } from "react";

/** Margen que deja la pestaña activa respecto del borde (el ancho del degradado, 1,5 rem). */
const HOLGURA = 24;

/** Marca `data-izq/der` en la barra anterior y deja visible su pestaña activa (solo en horizontal). */
export default function RealceBarraEfecto({ activa }: { activa: string }) {
  const ancla = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ancla.current?.previousElementSibling;
    if (!(el instanceof HTMLElement)) return;
    const medir = () => {
      el.dataset.izq = String(el.scrollLeft > 1);
      el.dataset.der = String(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };
    const t = el.querySelector('[aria-current="page"], [aria-selected="true"]');
    if (t) {
      // Como scrollIntoView({ inline: "nearest" }) pero sin mover la página en vertical.
      const r = el.getBoundingClientRect();
      const b = t.getBoundingClientRect();
      if (b.left < r.left + HOLGURA) el.scrollLeft -= r.left + HOLGURA - b.left;
      else if (b.right > r.right - HOLGURA) el.scrollLeft += b.right - (r.right - HOLGURA);
    }
    medir();
    el.addEventListener("scroll", medir, { passive: true });
    addEventListener("resize", medir);
    return () => {
      el.removeEventListener("scroll", medir);
      removeEventListener("resize", medir);
    };
  }, [activa]);
  return <i ref={ancla} hidden />;
}
