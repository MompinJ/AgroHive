#!/usr/bin/env python3
"""voxelkit: libreria para crear modelos voxel/low-poly como .bbmodel (Blockbench) por codigo.

Uso como libreria:
    import sys; sys.path.insert(0, '<ruta>/herramientas'); from voxelkit import *
    m = Model('mi_modelo', PALETA_BASE)         # paleta: dict nombre -> '#rrggbb' (max 256)
    m.box('cuerpo', (0, 0, 0), (4, 6, 4), 'rojo')   # c = CENTRO DE LA CARA INFERIOR, size = (ancho, alto, fondo)
    tip = m.stem('rama', (0, 6, 0), 5, 1, 'verde', tilt=30, yaw=90)   # devuelve la punta
    m.save('mi_modelo.bbmodel')

CLI:
    python3 voxelkit.py preview modelo.bbmodel salida.png [escala] [azimut] [elev]   # render isometrico sin navegador
    python3 voxelkit.py visor salida.html modelo1.bbmodel modelo2.bbmodel ...        # visor Three.js autocontenido

Convenciones: 1 unidad = 1/16 de celda, origen = centro de la base, +Y arriba, +Z frente, rotacion Euler ZYX
(Blockbench 'free model'). Sin emojis en el codigo.
"""
import json, math, base64, io, uuid, os, sys

PALETA_BASE = {
    'soil': '#6b4a2f', 'soil_dark': '#53371f', 'soil_light': '#8a6240', 'leaf': '#4aa33a', 'leaf_dark': '#2f7a2c',
    'leaf_light': '#86cf4f', 'wood': '#8a5a2e', 'wood_dark': '#5e3c1c', 'stone': '#8d8d86', 'white': '#ececec',
    'black': '#17140f', 'red': '#c8302c', 'yellow': '#f2c230', 'orange': '#ee7d1f', 'blue': '#2a5d9f', 'water': '#2d6f9e',
}

def _png_b64(paleta):
    from PIL import Image
    names = list(paleta)
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for i, n in enumerate(names):
        h = paleta[n].lstrip('#')
        im.putpixel((i % 16, i // 16), tuple(int(h[k:k+2], 16) for k in (0, 2, 4)) + (255,))
    b = io.BytesIO(); im.save(b, 'PNG')
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()

class Model:
    def __init__(self, name, paleta=None):
        self.name = name; self.paleta = dict(paleta or PALETA_BASE); self.names = list(self.paleta); self.els = []
        if len(self.names) > 256: raise ValueError('paleta de mas de 256 colores')
    def box(self, name, c, size, col, tilt=0, yaw=0, pivot=None):
        """Caja por el centro de su cara inferior. tilt (grados, eje X) y yaw (eje Y) giran alrededor de pivot (def. c)."""
        if col not in self.paleta: raise KeyError(f'color {col!r} no esta en la paleta')
        x, y, z = c; w, h, d = size; piv = pivot or c
        i = self.names.index(col); px, py = i % 16, i // 16
        e = {'name': name, 'box_uv': False, 'render_order': 'default', 'locked': False, 'export': True, 'scope': 0,
             'allow_mirror_modeling': True, 'from': [x - w/2, y, z - d/2], 'to': [x + w/2, y + h, z + d/2], 'autouv': 0,
             'color': i % 8, 'origin': list(piv)}
        if tilt or yaw: e['rotation'] = [tilt, yaw, 0]
        e['faces'] = {f: {'uv': [px, py, px+1, py+1], 'texture': 0} for f in ('north', 'east', 'south', 'west', 'up', 'down')}
        e['type'] = 'cube'
        e['uuid'] = str(uuid.uuid5(uuid.NAMESPACE_DNS, f'{self.name}/{name}/{len(self.els)}'))
        self.els.append(e); return e
    def stem(self, name, base, length, thick, col, tilt, yaw):
        """Tallo/palo inclinado desde base; devuelve (x,y,z) de la punta para colgar cosas ahi."""
        self.box(name, base, (thick, length, thick), col, tilt, yaw)
        t, yw = math.radians(tilt), math.radians(yaw)
        vy, vz = length * math.cos(t), length * math.sin(t)
        return (base[0] + vz*math.sin(yw), base[1] + vy, base[2] + vz*math.cos(yw))
    def ring(self, name, c, size, col, n=8, **kw):
        """Anillo de n cajas alrededor de c (copas, ruedas, flores)."""
        out = []
        for k in range(n):
            a = 360 * k / n
            r = size[0]
            out.append(self.box(f'{name}{k}', (c[0] + r*math.sin(math.radians(a)), c[1], c[2] + r*math.cos(math.radians(a))), size[1:], col, yaw=a, **kw))
        return out
    def save(self, path):
        d = {'meta': {'format_version': '5.0', 'model_format': 'free', 'box_uv': False}, 'name': self.name,
             'model_identifier': '', 'visible_box': [1, 1, 0], 'variable_placeholders': '', 'multi_file_ruleset': '',
             'variable_placeholder_buttons': [], 'timeline_setups': [], 'unhandled_root_fields': {},
             'resolution': {'width': 16, 'height': 16}, 'elements': self.els, 'groups': [],
             'outliner': [e['uuid'] for e in self.els],
             'textures': [{'name': 'palette.png', 'path': '', 'folder': '', 'namespace': '', 'id': '0', 'group': '', 'scope': 0,
                           'width': 16, 'height': 16, 'uv_width': 16, 'uv_height': 16, 'particle': False, 'use_as_default': False,
                           'layers_enabled': False, 'sync_to_project': '', 'file_format': 'png', 'render_mode': 'default',
                           'render_sides': 'auto', 'wrap_mode': 'limited', 'pbr_channel': 'color', 'fps': 7,
                           'force_translucent': False, 'frame_time': 1, 'frame_order_type': 'loop', 'frame_order': '',
                           'frame_interpolate': False, 'visible': True, 'internal': True, 'saved': True,
                           'uuid': str(uuid.uuid5(uuid.NAMESPACE_DNS, 'palette' + self.name)), 'source': _png_b64(self.paleta)}]}
        json.dump(d, open(path, 'w'), separators=(',', ':')); return len(self.els)

def check(path):
    """Validacion rapida: uuids unicos, caras con textura, cajas no degeneradas, tamano total. Devuelve lista de avisos."""
    d = json.load(open(path)); w = []; seen = set()
    for e in d['elements']:
        if e['uuid'] in seen: w.append('uuid repetido ' + e['name'])
        seen.add(e['uuid'])
        if any(t - f <= 0 for f, t in zip(e['from'], e['to'])): w.append('caja degenerada ' + e['name'])
    lo = [min(e['from'][i] for e in d['elements']) for i in range(3)]; hi = [max(e['to'][i] for e in d['elements']) for i in range(3)]
    w.append(f'{len(d["elements"])} cubos, caja {[round(h-l,1) for l,h in zip(lo,hi)]} unidades, base y={lo[1]}')
    return w

# ---------------- preview isometrico sin navegador ----------------
def preview(src, dst, S=10, az=35, el=28):
    import numpy as np
    from PIL import Image, ImageDraw
    d = json.load(open(src))
    pal = Image.open(io.BytesIO(base64.b64decode(d['textures'][0]['source'].split(',')[1]))).convert('RGB')
    az, el = math.radians(az), math.radians(el)
    def rot(a):
        x, y, z = [math.radians(v) for v in a]
        Rx = np.array([[1,0,0],[0,math.cos(x),-math.sin(x)],[0,math.sin(x),math.cos(x)]])
        Ry = np.array([[math.cos(y),0,math.sin(y)],[0,1,0],[-math.sin(y),0,math.cos(y)]])
        Rz = np.array([[math.cos(z),-math.sin(z),0],[math.sin(z),math.cos(z),0],[0,0,1]])
        return Rz @ Ry @ Rx
    def view(p):
        x, y, z = p
        xr = x*math.cos(az) - z*math.sin(az); zr = x*math.sin(az) + z*math.cos(az)
        return xr, y*math.cos(el) - zr*math.sin(el), zr*math.cos(el) - y*math.sin(el)
    L = np.array([0.4, 0.8, 0.45]); L /= np.linalg.norm(L); polys = []
    for e in d['elements']:
        f, t = np.array(e['from'], float), np.array(e['to'], float)
        px, py = e['faces']['up']['uv'][:2]; col = np.array(pal.getpixel((px, py)), float)
        R = rot(e.get('rotation', [0,0,0])); o = np.array(e['origin'], float)
        v = [R @ (np.array([x,y,z]) - o) + o for x in (f[0],t[0]) for y in (f[1],t[1]) for z in (f[2],t[2])]
        edep = view(sum(v)/8)[2]
        for a,b,c,dd,n in [(0,1,3,2,(-1,0,0)),(4,6,7,5,(1,0,0)),(0,4,5,1,(0,-1,0)),(2,3,7,6,(0,1,0)),(0,2,6,4,(0,0,-1)),(1,5,7,3,(0,0,1))]:
            nn = R @ np.array(n, float); pts = [v[a],v[b],v[c],v[dd]]; ctr = sum(pts)/4
            if (np.array(view(ctr + nn)) - np.array(view(ctr)))[2] > 0: continue
            vp = [view(p) for p in pts]; sh = 0.55 + 0.55*max(0, float(nn @ L))
            polys.append((edep + 0.001*sum(p[2] for p in vp)/4, [(p[0],p[1]) for p in vp], tuple(int(min(255, c*sh)) for c in col)))
    polys.sort(key=lambda q: -q[0])
    xs = [p[0] for q in polys for p in q[1]]; ys = [p[1] for q in polys for p in q[1]]
    im = Image.new('RGB', (int((max(xs)-min(xs))*S+60), int((max(ys)-min(ys))*S+60)), (221, 232, 240)); dr = ImageDraw.Draw(im)
    for _, pts, c in polys: dr.polygon([((x-min(xs))*S+30, (max(ys)-y)*S+30) for x,y in pts], fill=c)
    im.save(dst); return im.size

# ---------------- visor Three.js autocontenido ----------------
VISOR = r'''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Visor voxel</title><style>
:root{--bg:#dfe9f0;--ink:#1d2a33;--card:#ffffffcc;--acc:#ee7d1f;--line:#00000022}
@media (prefers-color-scheme:dark){:root{--bg:#1b2329;--ink:#e8eef2;--card:#10161bcc;--line:#ffffff2a}}
*{box-sizing:border-box}html,body{margin:0;height:100%;background:var(--bg);color:var(--ink);font:14px system-ui,sans-serif;overflow:hidden}
canvas{display:block}#ui{position:fixed;left:16px;right:16px;bottom:16px;display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
button{font:inherit;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:10px;padding:8px 12px;cursor:pointer}
button.on{background:var(--acc);color:#fff;border-color:transparent}
#info{position:fixed;left:16px;top:16px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 14px}
</style></head><body><div id="info"><b id="t"></b><p id="c" style="margin:4px 0 0;opacity:.6"></p></div><div id="ui"></div>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const DATA=__DATA__;const U=1/16;const names=Object.keys(DATA);
const r=new THREE.WebGLRenderer({antialias:true});r.setPixelRatio(devicePixelRatio);r.setSize(innerWidth,innerHeight);r.shadowMap.enabled=true;document.body.prepend(r.domElement);
const dark=matchMedia('(prefers-color-scheme:dark)').matches;const scene=new THREE.Scene();scene.background=new THREE.Color(dark?0x1b2329:0xdfe9f0);
const cam=new THREE.PerspectiveCamera(35,innerWidth/innerHeight,.1,200);const ctl=new OrbitControls(cam,r.domElement);ctl.enableDamping=true;ctl.maxPolarAngle=Math.PI*.49;
scene.add(new THREE.HemisphereLight(0xffffff,0x8a7a6a,1.1));const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(4,8,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:1,far:40});scene.add(sun);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshLambertMaterial({color:dark?0x222c33:0xcfdde6}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
const geo=new THREE.BoxGeometry(1,1,1),mats={},mat=c=>mats[c]||=new THREE.MeshLambertMaterial({color:c});
function build(els){const g=new THREE.Group();for(const[n,f,t,o,rt,col]of els){const p=new THREE.Group();p.position.set(o[0]*U,o[1]*U,o[2]*U);
p.rotation.set(...rt.map(THREE.MathUtils.degToRad),'ZYX');const m=new THREE.Mesh(geo,mat(col));m.scale.set((t[0]-f[0])*U,(t[1]-f[1])*U,(t[2]-f[2])*U);
m.position.set(((f[0]+t[0])/2-o[0])*U,((f[1]+t[1])/2-o[1])*U,((f[2]+t[2])/2-o[2])*U);m.castShadow=m.receiveShadow=true;p.add(m);g.add(p)}return g}
const G={};let gap=1.5;names.forEach(n=>{G[n]=build(DATA[n]);scene.add(G[n])});const btn={};const ui=document.getElementById('ui');
function set(n){for(const k in btn)btn[k].classList.toggle('on',k===n);const all=n==='todos';let x=0;
names.forEach(k=>{const v=all||k===n;G[k].visible=v;if(v){const b=new THREE.Box3().setFromObject(G[k]);const w=Math.max(b.max.x-b.min.x,.5);
G[k].position.x=0;if(all){G[k].position.x=x-(b.min.x+b.max.x)/2;x+=w+gap*.6}}});
const box=new THREE.Box3();names.forEach(k=>{if(G[k].visible)box.expandByObject(G[k])});const c=box.getCenter(new THREE.Vector3()),s=box.getSize(new THREE.Vector3()),R=Math.max(s.x,s.y,s.z,1);
ctl.target.copy(c);cam.position.set(c.x+R*1.0,c.y+R*.9,c.z+R*1.3);
document.getElementById('t').textContent=all?'Todos':n;let k=0;names.forEach(q=>{if(G[q].visible)k+=DATA[q].length});document.getElementById('c').textContent=k+' cubos'}
for(const n of[...names,'todos']){const b=document.createElement('button');b.textContent=n;b.onclick=()=>set(n);ui.append(b);btn[n]=b}
addEventListener('resize',()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();r.setSize(innerWidth,innerHeight)});
addEventListener('keydown',e=>{const a=[...names,'todos'],i=a.findIndex(q=>btn[q].classList.contains('on'));if(e.key==='ArrowRight')set(a[(i+1)%a.length]);if(e.key==='ArrowLeft')set(a[(i+a.length-1)%a.length])});
set('todos');(function f(){requestAnimationFrame(f);ctl.update();r.render(scene,cam)})();</script></body></html>'''

def build_visor(dst, paths):
    from PIL import Image
    data = {}
    for p in paths:
        d = json.load(open(p))
        pal = Image.open(io.BytesIO(base64.b64decode(d['textures'][0]['source'].split(',')[1]))).convert('RGB')
        data[d['name']] = [[e['name'], e['from'], e['to'], e['origin'], e.get('rotation', [0,0,0]),
                            '#%02x%02x%02x' % pal.getpixel(tuple(e['faces']['up']['uv'][:2]))] for e in d['elements']]
    open(dst, 'w').write(VISOR.replace('__DATA__', json.dumps(data, separators=(',', ':'))))
    return sum(len(v) for v in data.values())

if __name__ == '__main__':
    a = sys.argv[1:]
    if a[:1] == ['preview']: print(preview(a[1], a[2], *(float(x) for x in a[3:])))
    elif a[:1] == ['visor']: print(build_visor(a[1], a[2:]), 'cubos en', a[1])
    elif a[:1] == ['check']: print('\n'.join(check(a[1])))
    else: print(__doc__)
