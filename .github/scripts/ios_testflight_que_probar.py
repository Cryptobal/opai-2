#!/usr/bin/env python3
"""CAR-810: rellena «Qué probar» (whatsNew) en TestFlight vía App Store Connect API."""
from __future__ import annotations

import base64
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from zoneinfo import ZoneInfo

APP_ID = "6835730787"
LOCALES = ("es-ES", "en-US")
MAX_CHARS = 4000
POLL_SEC = 15 * 60
POLL_STEP = 30
SECTION = re.compile(r"^##\s*Qué probar en la app\s*$", re.MULTILINE | re.IGNORECASE)


def b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def jwt_es256(key_path: str, key_id: str, issuer_id: str) -> str:
    now = int(time.time())
    header = {"alg": "ES256", "kid": key_id, "typ": "JWT"}
    payload = {"iss": issuer_id, "iat": now, "exp": now + 1200, "aud": "appstoreconnect-v1"}
    signing = ".".join(
        [
            b64url(json.dumps(header, separators=(",", ":")).encode()),
            b64url(json.dumps(payload, separators=(",", ":")).encode()),
        ]
    )
    sig = subprocess.run(
        ["openssl", "dgst", "-sha256", "-sign", key_path, "-binary"],
        input=signing.encode(),
        capture_output=True,
        check=True,
    ).stdout
    return f"{signing}.{b64url(sig)}"


def asc_request(token: str, path: str, *, method: str = "GET", body: dict | None = None) -> dict:
    url = f"https://api.appstoreconnect.apple.com/v1/{path.lstrip('/')}"
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.load(resp)


def esperar_build(token: str, version: str) -> str | None:
    limite = time.time() + POLL_SEC
    filtro = urllib.parse.urlencode({"filter[app]": APP_ID, "filter[version]": version, "limit": "5"})
    while time.time() < limite:
        try:
            data = asc_request(token, f"builds?{filtro}")
        except urllib.error.HTTPError as err:
            print(f"::warning::App Store Connect builds: HTTP {err.code}")
            time.sleep(POLL_STEP)
            continue
        items = data.get("data") or []
        if items:
            return items[0]["id"]
        time.sleep(POLL_STEP)
    return None


def upsert_locale(token: str, build_id: str, locale: str, whats_new: str) -> None:
    locs = asc_request(token, f"builds/{build_id}/betaBuildLocalizations?limit=200")
    existente = next(
        (x for x in locs.get("data", []) if (x.get("attributes") or {}).get("locale") == locale),
        None,
    )
    if existente and existente.get("id"):
        asc_request(
            token,
            f"betaBuildLocalizations/{existente['id']}",
            method="PATCH",
            body={
                "data": {
                    "type": "betaBuildLocalizations",
                    "id": existente["id"],
                    "attributes": {"whatsNew": whats_new},
                }
            },
        )
        print(f"Actualizado whatsNew locale={locale}")
        return
    asc_request(
        token,
        "betaBuildLocalizations",
        method="POST",
        body={
            "data": {
                "type": "betaBuildLocalizations",
                "attributes": {"locale": locale, "whatsNew": whats_new},
                "relationships": {"build": {"data": {"type": "builds", "id": build_id}}},
            }
        },
    )
    print(f"Creado whatsNew locale={locale}")


def archivo_relevante(path: str) -> bool:
    p = path.replace("\\", "/")
    if p.startswith("apps/movil/"):
        return True
    if p.startswith("packages/auth/"):
        return True
    if p.startswith("apps/web/app/(auth)/") or "/(auth)/" in p:
        return True
    bajo = p.lower()
    return "login" in bajo or "push" in bajo


def extraer_que_probar(cuerpo: str) -> str | None:
    m = SECTION.search(cuerpo)
    if not m:
        return None
    resto = cuerpo[m.end() :]
    fin = re.search(r"^##\s+\S", resto, re.MULTILINE)
    bloque = resto[: fin.start()] if fin else resto
    texto = bloque.strip()
    return texto or None


def ref_anterior(build_number: int) -> str:
    etiqueta = f"ios-build-{build_number - 1}"
    if subprocess.run(["git", "rev-parse", "--verify", etiqueta], capture_output=True).returncode == 0:
        return subprocess.check_output(["git", "rev-parse", etiqueta], text=True).strip()
    tags = subprocess.check_output(["git", "tag", "-l", "ios-build-*"], text=True).split()
    mejor = -1
    mejor_tag = ""
    for t in tags:
        hit = re.fullmatch(r"ios-build-(\d+)", t)
        if not hit:
            continue
        n = int(hit.group(1))
        if n < build_number and n > mejor:
            mejor, mejor_tag = n, t
    if mejor_tag:
        return subprocess.check_output(["git", "rev-parse", mejor_tag], text=True).strip()
    return subprocess.check_output(["git", "rev-list", "--max-parents=0", "HEAD"], text=True).splitlines()[0]


def prs_desde_base(base: str, head: str) -> list[int]:
    if base == head:
        return []
    try:
        log = subprocess.check_output(
            ["git", "log", f"{base}..{head}", "--merges", "--first-parent", "--pretty=format:%s"],
            text=True,
            stderr=subprocess.DEVNULL,
        )
    except subprocess.CalledProcessError:
        return []
    out: list[int] = []
    for line in log.splitlines():
        hit = re.search(r"\(#(\d+)\)\s*$", line)
        if hit:
            out.append(int(hit.group(1)))
    return list(dict.fromkeys(out))


def gh_pr_datos(num: int) -> dict | None:
    token = os.environ.get("GITHUB_TOKEN", "")
    if not token:
        return None
    try:
        raw = subprocess.check_output(
            ["gh", "pr", "view", str(num), "--json", "title,body,files"],
            text=True,
            env={**os.environ, "GH_TOKEN": token},
            stderr=subprocess.DEVNULL,
        )
        return json.loads(raw)
    except (subprocess.CalledProcessError, json.JSONDecodeError):
        return None


def armar_whats_new(build_number: int, head: str) -> str:
    base = ref_anterior(build_number)
    corto = head[:7]
    fecha = datetime.now(ZoneInfo("America/Santiago")).strftime("%Y-%m-%d %H:%M CLT")
    lineas = [f"Build {build_number} · {fecha} · commit {corto}", ""]
    prs = prs_desde_base(base, head)
    if not prs:
        lineas.append("Sin PRs mergeados a main en el rango desde el build anterior.")
    for num in prs:
        datos = gh_pr_datos(num)
        if not datos:
            lineas.append(f"• PR #{num} (sin metadatos)")
            continue
        archivos = [f.get("path", "") for f in datos.get("files") or []]
        if not any(archivo_relevante(p) for p in archivos):
            continue
        titulo = (datos.get("title") or "").strip()
        lineas.append(f"• #{num}: {titulo}")
        extra = extraer_que_probar(datos.get("body") or "")
        if extra:
            for ln in extra.splitlines():
                lineas.append(f"  {ln.rstrip()}")
    texto = "\n".join(lineas).strip()
    if len(texto) > MAX_CHARS:
        texto = texto[: MAX_CHARS - 1] + "…"
    return texto


def main() -> int:
    build_number = int(os.environ["BUILD_NUMBER"])
    head = os.environ.get("GITHUB_SHA") or subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
    key_path = os.environ["ASC_KEY_PATH"]
    key_id = os.environ["ASC_KEY_ID"]
    issuer_id = os.environ["ASC_ISSUER_ID"]

    texto = armar_whats_new(build_number, head)
    print(f"whatsNew ({len(texto)} caracteres), preview primera línea: {texto.splitlines()[0]}")

    token = jwt_es256(key_path, key_id, issuer_id)
    build_id = esperar_build(token, str(build_number))
    if not build_id:
        print("::warning::No apareció el build en App Store Connect a tiempo.")
        return 1

    for locale in LOCALES:
        upsert_locale(token, build_id, locale, texto)

    marcador = os.environ.get("QUE_PROBAR_OK_FILE", "")
    if marcador:
        with open(marcador, "w", encoding="utf-8") as f:
            f.write("ok")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as err:  # noqa: BLE001 — CI: solo advertencia, no tumbar el job
        print(f"::warning::Qué probar TestFlight: {err}")
        sys.exit(1)