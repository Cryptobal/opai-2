
# ───────────────────────── ensamblado de los tableros de la aplicación ─────────────────────────
BARRA_L = ('<div style="flex:none;border-top:1px solid var(--line);background:var(--surface)"><div style="max-width:900px;box-sizing:border-box;padding:10px __LPADX__px 16px __LPADX__px;display:flex;flex-direction:column;gap:8px">\n'
           + BARRA_IN + '\n</div></div>')
TEMA_BTN = '<button onClick="{{alternarTema}}" aria-label="Cambiar entre tema claro y oscuro" style="[[BTN_ICO]]">[[i:luna:20]]</button>'
PERFIL = {
 "desk": dict(W=1440, H=900, HILO=440, MOVIL="false", PADX=26, PADB=18, LPADX=44, LPADY=32, GAP=28, DISPLAY=30, DISPLAYLH=40, KCOLS=4, PCOLS=2, ICOLS=3, KPI=24, H2=28, H2LH=34, BIG=52, BIGLH=60),
 "ipad": dict(W=1024, H=768, HILO=370, MOVIL="false", PADX=20, PADB=14, LPADX=28, LPADY=24, GAP=24, DISPLAY=24, DISPLAYLH=32, KCOLS=2, PCOLS=2, ICOLS=2, KPI=22, H2=24, H2LH=30, BIG=42, BIGLH=50),
 "fono": dict(W=390, H=844, HILO=390, MOVIL="true", PADX=18, PADB=22, LPADX=18, LPADY=18, GAP=22, DISPLAY=22, DISPLAYLH=30, KCOLS=2, PCOLS=1, ICOLS=1, KPI=20, H2=22, H2LH=28, BIG=36, BIGLH=44),
}
TABLEROS = [("Main.dc.html", "desk", "erp", "ERP · escritorio"), ("iPad.dc.html", "ipad", "erp", "ERP · iPad"), ("iPhone.dc.html", "fono", "erp", "ERP · iPhone"),
            ("Supervisor.dc.html", "fono", "supervisor", "Portal Supervisor · iPhone"), ("Terreno.dc.html", "ipad", "terreno", "Portal Terreno · tablet de la instalación"),
            ("Guardia.dc.html", "fono", "guardia", "Portal del guardia · iPhone"), ("Cliente.dc.html", "fono", "cliente", "Portal del cliente · iPhone"),
            ("ClienteEscritorio.dc.html", "desk", "cliente", "Portal del cliente · escritorio"), ("Plataforma.dc.html", "desk", "plataforma", "Plataforma · escritorio")]
LOGICA = open("app_logic.js", encoding="utf-8").read()
RAIZ = 'class="{{temaClase}}" style="width:%dpx;height:%dpx;box-sizing:border-box;position:relative;overflow:hidden;display:flex;flex-direction:%s;background:var(--bg);color:var(--fg);font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:20px"'
os.makedirs(OUT, exist_ok=True); os.makedirs("scratch", exist_ok=True)

def escribir(nombre, titulo, w, h, cuerpo_html, js, extra_css=""):
    props = json.dumps({"oscuro": {"editor": "boolean", "default": False}, "$preview": {"width": w, "height": h}})
    helmet = G.HELMET.replace("</style>", extra_css + "</style>") if extra_css else G.HELMET
    html = ('<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<title>%s</title>\n<script src="./support.js"></script>\n</head>\n<body>\n<x-dc>\n%s\n%s\n</x-dc>\n'
            '<script type="text/x-dc" data-dc-script data-props=\'%s\'>\n%s</script>\n</body>\n</html>\n') % (titulo, helmet, cuerpo_html, props, js)
    assert not re.search(r"__[A-Z0-9]+__", html), re.findall(r"__[A-Z0-9]+__", html)[:5]
    open(os.path.join(OUT, nombre), "w", encoding="utf-8").write(html)

for nombre, perfil, portal, titulo in TABLEROS:
    v = dict(PERFIL[perfil]); v["PORTAL"] = portal
    movil = v["MOVIL"] == "true"
    v["TEMABTN"] = "" if movil else T(TEMA_BTN)
    if movil:
        cuerpo = ('<div %s>\n<div style="flex:1;min-height:0;position:relative;display:flex;flex-direction:column">\n<div style="flex:1;min-height:0;display:flex;flex-direction:column">\n%s\n%s\n</div>\n'
                  '<div style="position:absolute;top:0;left:0;right:0;bottom:0;display:{{lienzoDisplay}};flex-direction:column;background:var(--bg)">\n%s\n</div>\n</div>\n%s\n</div>'
                  ) % (RAIZ % (v["W"], v["H"], "column"), CABECERA, HILO, LIENZO, BARRA)
    else:
        cuerpo = ('<div %s>\n%s\n<div style="width:%dpx;flex:none;min-height:0;display:{{hiloDisplay}};flex-direction:column;border-right:1px solid var(--line)">\n%s\n%s\n</div>\n'
                  '<div style="flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;background:var(--surface)">\n%s\n%s\n</div>\n</div>'
                  ) % (RAIZ % (v["W"], v["H"], "row"), RAIL, v["HILO"], CABECERA, HILO, LIENZO, BARRA_L)
    cuerpo, js = T(cuerpo), LOGICA
    for k, val in v.items():
        cuerpo = cuerpo.replace("__%s__" % k, str(val)); js = js.replace("__%s__" % k, str(val))
    escribir(nombre, "OPAI 2.0 · " + titulo, v["W"], v["H"], cuerpo, js)
    open(os.path.join("scratch", nombre + ".app.js"), "w", encoding="utf-8").write("class DCLogic{constructor(p){this.props=p||{};}setState(s){Object.assign(this.state,s);}}\n" + js + "\nmodule.exports={Component,PORTALES,TIPOS,X};\n")

# ───────────────────────── acceso al sistema ─────────────────────────
CAMPO = ('<label style="display:flex;flex-direction:column;gap:6px"><span style="font-size:13px;line-height:18px;font-weight:500">%s</span>'
         '<span class="campo" style="height:52px;border-radius:14px;border:1px solid var(--muted);background:var(--surface);display:flex;align-items:center;padding:0 14px;box-sizing:border-box">'
         '<input type="%s" placeholder="%s" style="flex:1;height:44px;font-size:16px"></span></label>')
B_LG = "height:52px;border-radius:14px;font-size:16px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;box-sizing:border-box"
B_TINTA = B_LG + ";background:var(--fg);color:var(--bg)"
B_LINEA = B_LG + ";border:1px solid var(--line);background:var(--surface);color:var(--fg)"
B_FANT = "min-height:44px;font-weight:600;color:var(--muted);text-align:center;display:flex;align-items:center;justify-content:center;text-decoration:underline;text-underline-offset:3px"
H1 = '<h1 style="margin:0;font-size:28px;line-height:34px;font-weight:700;letter-spacing:-0.02em">%s</h1>'
P = '<p style="margin:0;font-size:15px;line-height:22px;color:var(--muted)">%s</p>'
def paso(clave, *partes):
    return si("es_" + clave, '<div style="display:flex;flex-direction:column;gap:16px">' + "".join(partes) + "</div>", "true" if clave == "equipo_form" else "false")
def boton(txt, accion, estilo=B_TINTA):
    return '<button onClick="{{%s}}" style="%s">%s</button>' % (accion, estilo, txt)
def enlace(txt, href, estilo=B_TINTA):
    return '<a href="%s" style="%s">%s</a>' % (href, estilo, txt)
def fila_portal(nombre, quien, href):
    return ('<a href="%s" style="display:flex;align-items:center;gap:12px;min-height:60px;padding:8px 0;border-bottom:1px solid var(--line);text-decoration:none;color:var(--fg)">'
            '<span style="flex:1;display:flex;flex-direction:column;gap:2px"><span style="font-size:16px;font-weight:600">%s</span><span style="font-size:13px;color:var(--muted)">%s</span></span>'
            '<span style="display:inline-flex;color:var(--muted)">[[i:flecha:16]]</span></a>') % (href, nombre, quien)

def acceso(movil):
    erp, cli = ("iPhone.dc.html", "Cliente.dc.html") if movil else ("Main.dc.html", "ClienteEscritorio.dc.html")
    pasos = "".join([
        paso("equipo_form", H1 % "Entra a OPAI", CAMPO % ("Correo", "email", "tu@empresa.cl"), CAMPO % ("Contraseña", "password", "Tu contraseña"), boton("Entrar", "irEmpresa"), boton("Continuar con Google", "irEmpresa", B_LINEA), boton("¿Olvidaste tu contraseña?", "irRecuperar", B_FANT)),
        paso("equipo_recuperar", H1 % "Recupera tu contraseña", P % "Escribe tu correo y te enviamos un enlace para crear una nueva.", CAMPO % ("Correo", "email", "tu@empresa.cl"), boton("Enviarme el enlace", "irEnviado"), boton("Volver", "irForm", B_FANT)),
        paso("equipo_enviado", H1 % "Revisa tu correo", P % "Si existe una cuenta con ese correo, te enviamos un enlace para crear una contraseña nueva.", boton("Volver a entrar", "irForm", B_LINEA)),
        paso("equipo_empresa", H1 % "Elige la empresa", P % "Tu cuenta tiene acceso a más de una.",
             '<sc-for list="{{empresas}}" as="e" hint-placeholder-count="2"><button onClick="{{irPortal}}" style="display:flex;align-items:center;gap:12px;min-height:64px;padding:8px 0;border-bottom:1px solid var(--line)"><span style="width:40px;height:40px;border-radius:12px;background:var(--fg);color:var(--bg);display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex:none">{{e.mono}}</span><span style="flex:1;display:flex;flex-direction:column;gap:2px"><span style="font-size:16px;font-weight:600">{{e.nombre}}</span><span style="font-size:13px;color:var(--muted)">{{e.rol}}</span></span><span style="display:inline-flex;color:var(--muted)">[[i:flecha:16]]</span></button></sc-for>'),
        paso("equipo_portal", H1 % "¿Dónde quieres entrar?", P % "Gard Security · tu rol te da acceso a tres portales.",
             '<div style="border-top:1px solid var(--line)">' + fila_portal("ERP", "Dueños, gerencia y administración", erp) + fila_portal("Supervisor", "Tus instalaciones en terreno", "Supervisor.dc.html") + fila_portal("Plataforma", "Operación de OPAI", "Plataforma.dc.html") + "</div>",
             P % "OPAI recuerda tu portal de inicio. Lo cambias cuando quieras con el botón «Portales»."),
        paso("guardia_form", H1 % "Hola. Tu RUT y tu PIN", CAMPO % ("RUT", "text", "12.345.678-9"),
             '<div style="display:flex;flex-direction:column;align-items:center;gap:14px"><div style="display:flex;gap:12px"><sc-for list="{{puntosPin}}" as="d" hint-placeholder-count="6"><span style="width:16px;height:16px;border-radius:99px;border:2px solid var(--fg);background:{{d.bg}}"></span></sc-for></div>'
             '<div style="display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));gap:10px;width:264px"><sc-for list="{{teclas}}" as="k" hint-placeholder-count="12"><button onClick="{{k.ir}}" aria-label="{{k.aria}}" style="height:60px;border-radius:18px;background:var(--fill);font-size:22px;font-weight:600;[[MONO]];text-align:center;opacity:{{k.op}}">{{k.t}}</button></sc-for></div></div>',
             boton("[[i:rostro:20]]<span>Usar Face ID</span>", "irListo", B_LINEA)),
        paso("guardia_listo", '<span style="width:64px;height:64px;border-radius:99px;background:var(--okbg);color:var(--ok);display:inline-flex;align-items:center;justify-content:center">[[i:check:32]]</span>', H1 % "Hola, Daniela", P % "Tu turno de hoy parte a las 20:00 en Planta Norte.", enlace("Entrar a mi portal", "Guardia.dc.html")),
        paso("cliente_form", H1 % "Portal de clientes", P % "Te enviamos un enlace a tu correo. Sin contraseña.", CAMPO % ("Correo", "email", "tu@empresa.cl"), boton("Enviarme el enlace", "irMagico"), boton("Entrar con RUT y PIN de empresa", "irRutPin", B_FANT)),
        paso("cliente_magico", H1 % "Revisa tu correo", P % "El enlace vale 15 minutos y sirve una sola vez.", enlace("Simular que abrí el enlace", cli), boton("Volver", "irForm", B_FANT)),
        paso("cliente_rutpin", H1 % "RUT y PIN de empresa", CAMPO % ("RUT de la empresa", "text", "77.222.333-4"), CAMPO % ("PIN de empresa", "password", "6 dígitos"), enlace("Entrar", cli), boton("Volver", "irForm", B_FANT)),
        paso("terreno_form", H1 % "Emparejar este dispositivo", P % "Escribe el código que entrega el ERP. Se hace una sola vez, en la tablet o el teléfono de la instalación.", CAMPO % ("Código de 6 caracteres", "text", "K7M2QD"), CAMPO % ("Nombre del dispositivo", "text", "Tablet de portería"), boton("Emparejar", "irListo")),
        paso("terreno_listo", '<span style="[[OVER]]">Dispositivo emparejado con</span>', '<span style="font-size:40px;line-height:46px;font-weight:700;letter-spacing:-0.02em">PLANTA NORTE</span>', P % "Tablet de portería · Alimentos del Maipo S.A. El guardia de turno entra eligiendo su nombre.", enlace("Abrir el puesto", "Terreno.dc.html")),
    ])
    seg = ('<div style="display:flex;gap:2px;padding:3px;border-radius:14px;background:var(--fill)"><sc-for list="{{modos}}" as="m" hint-placeholder-count="4">'
           '<button onClick="{{m.ir}}" style="flex:1;height:40px;border-radius:11px;font-size:13px;text-align:center;font-weight:{{m.peso}};background:{{m.bg}};color:{{m.fg}}">{{m.nombre}}</button></sc-for></div>')
    cabeza = ('<div style="display:flex;align-items:center;justify-content:space-between"><span style="font-size:22px;font-weight:800;letter-spacing:0.04em">OPAI</span>'
              '<button onClick="{{alternarTema}}" aria-label="Cambiar entre tema claro y oscuro" style="[[BTN_ICO]]">[[i:luna:20]]</button></div>')
    interior = cabeza + '<div style="display:flex;flex-direction:column;gap:8px"><span style="[[OVER]]">¿Quién entra?</span>' + seg + "</div>" + pasos
    if movil:
        w, h = 390, 844
        cuerpo = '<div %s><div class="sx" style="flex:1;min-height:0;overflow-y:auto;padding:16px 22px 28px 22px;display:flex;flex-direction:column;gap:22px">%s</div></div>' % (RAIZ % (w, h, "column"), interior)
    else:
        w, h = 1440, 900
        cuerpo = ('<div %s><div style="flex:1;display:flex;align-items:center;justify-content:center"><div style="width:460px;box-sizing:border-box;padding:36px;border-radius:24px;background:var(--surface);border:1px solid var(--line);display:flex;flex-direction:column;gap:22px">%s</div></div></div>'
                  ) % (RAIZ % (w, h, "column"), interior)
    return w, h, T(cuerpo)

ACC_JS = r"""
const FG = 'var(--fg)', MU = 'var(--muted)';
const PASOS = ['equipo_form', 'equipo_recuperar', 'equipo_enviado', 'equipo_empresa', 'equipo_portal', 'guardia_form', 'guardia_listo', 'cliente_form', 'cliente_magico', 'cliente_rutpin', 'terreno_form', 'terreno_listo'];
class Component extends DCLogic {
  constructor(props) { super(props); this.state = { tema: null, modo: 'equipo', paso: 'form', pin: '' }; }
  renderVals() {
    const s = this.state, oscuro = s.tema ? s.tema === 'oscuro' : !!this.props.oscuro;
    const ir = (paso) => () => this.setState({ paso: paso, pin: '' });
    const o = { temaClase: oscuro ? 't-oscuro' : 't-claro', alternarTema: () => this.setState({ tema: oscuro ? 'claro' : 'oscuro' }),
      modos: [['equipo', 'Equipo'], ['guardia', 'Guardia'], ['cliente', 'Cliente'], ['terreno', 'Dispositivo']].map((m) => ({ nombre: m[1], ir: () => this.setState({ modo: m[0], paso: 'form', pin: '' }), peso: s.modo === m[0] ? 600 : 500, bg: s.modo === m[0] ? 'var(--surface)' : 'transparent', fg: s.modo === m[0] ? FG : MU })),
      irForm: ir('form'), irEmpresa: ir('empresa'), irPortal: ir('portal'), irRecuperar: ir('recuperar'), irEnviado: ir('enviado'), irListo: ir('listo'), irMagico: ir('magico'), irRutPin: ir('rutpin'),
      empresas: [{ mono: 'G', nombre: 'Gard Security', rol: 'Dueño' }, { mono: 'AS', nombre: 'Aseo Integral del Sur', rol: 'Administrador' }],
      puntosPin: [0, 1, 2, 3, 4, 5].map((i) => ({ bg: i < s.pin.length ? FG : 'transparent' })),
      teclas: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '←'].map((k) => ({ t: k, op: k ? 1 : 0, aria: k === '←' ? 'Borrar' : (k || 'Sin tecla'),
        ir: () => { if (!k) return; if (k === '←') { this.setState({ pin: s.pin.slice(0, -1) }); return; } const p = s.pin + k; if (p.length >= 6) this.setState({ paso: 'listo', pin: '' }); else this.setState({ pin: p }); } })) };
    PASOS.forEach((p) => { o['es_' + p] = p === s.modo + '_' + s.paso; });
    return o;
  }
}
"""
CSS_ACC = ".campo:focus-within{border-color:var(--agente);box-shadow:0 0 0 3px var(--agentebg)}a:focus-visible{outline:2px solid var(--agente);outline-offset:2px}"
for nombre, movil in [("Acceso.dc.html", False), ("AccesoMovil.dc.html", True)]:
    w, h, cuerpo = acceso(movil)
    escribir(nombre, "OPAI 2.0 · Acceso" + (" en iPhone" if movil else " en escritorio"), w, h, cuerpo, ACC_JS, CSS_ACC)
    open(os.path.join("scratch", nombre + ".acc.js"), "w", encoding="utf-8").write("class DCLogic{constructor(p){this.props=p||{};}setState(s){Object.assign(this.state,s);}}\n" + ACC_JS + "\nmodule.exports=Component;\n")

# ───────────────────────── lienzo ─────────────────────────
def fila(y, items):
    x, out = 0, {}
    for nombre, w, h, titulo in items:
        out[nombre] = {"x": x, "y": y, "w": w, "h": h, "title": titulo, "is_interactive": True}; x += w + 80
    return out, x - 80
b1, w1 = fila(-1500, [("Acceso.dc.html", 1440, 900, "Acceso · escritorio"), ("AccesoMovil.dc.html", 390, 844, "Acceso · iPhone")])
b2, w2 = fila(0, [("Main.dc.html", 1440, 900, "ERP · escritorio"), ("iPad.dc.html", 1024, 768, "ERP · iPad"), ("iPhone.dc.html", 390, 844, "ERP · iPhone")])
b3, w3 = fila(1500, [("Supervisor.dc.html", 390, 844, "Supervisor · iPhone"), ("Terreno.dc.html", 1024, 768, "Terreno · tablet de la instalación"), ("Guardia.dc.html", 390, 844, "Guardia · iPhone"), ("Cliente.dc.html", 390, 844, "Cliente · iPhone"), ("ClienteEscritorio.dc.html", 1440, 900, "Cliente · escritorio"), ("Plataforma.dc.html", 1440, 900, "Plataforma · escritorio")])
boards = {}; boards.update(b2); boards.update(b1); boards.update(b3)
canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": "2026-11-11T14:10:00Z"}, "title": "OPAI 2.0 · Base agéntica «Hilo» (propuesta)", "launch": {"view": "canvas"}, "pages": [],
          "boards": boards, "order": list(b2) + list(b1) + list(b3),
          "notes": {"acceso": {"x": 0, "y": -1800, "text": "1 · Acceso al sistema", "kind": "title1", "maxW": w1},
                    "titulo": {"x": 0, "y": -300, "text": "2 · ERP · aplicación completa", "kind": "title1", "maxW": w2},
                    "portales": {"x": 0, "y": 1200, "text": "3 · Portales · cada uno en su dispositivo", "kind": "title1", "maxW": w3}},
          "designSystems": []}
json.dump(canvas, open(os.path.join(OUT, "canvas.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("ok", {n: os.path.getsize(os.path.join(OUT, n)) for n in sorted(os.listdir(OUT))})
