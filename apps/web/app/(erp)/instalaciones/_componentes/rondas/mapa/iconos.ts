import L from "leaflet";

function iconoDiv(html: string, clase = ""): L.DivIcon {
  return L.divIcon({
    className: clase,
    html,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

export function iconoNumero(n: number, seleccionado: boolean): L.DivIcon {
  const clase = seleccionado ? "ds-mapa-pin-numero ds-mapa-pin-numero--seleccionado" : "ds-mapa-pin-numero";
  return iconoDiv(`<span class="${clase}">${n}</span>`, "");
}

export function iconoInstalacion(): L.DivIcon {
  return iconoDiv('<span class="ds-mapa-pin-instalacion" aria-hidden>🏢</span>', "");
}

export function iconoPuntoEditable(): L.DivIcon {
  return iconoDiv('<span class="ds-mapa-pin-punto" aria-hidden>📍</span>', "");
}