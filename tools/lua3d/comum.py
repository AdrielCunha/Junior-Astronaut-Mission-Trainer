# Generated with AI assistance (Claude). See README, "Use of AI tools".
# Shared by the Blender scripts: palette, toon materials, the outline shell, the cube-sphere and
# the NASA LOLA polar elevation reader. Import from a Blender script with:
#   import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import comum
import math, os, urllib.request
from estilo_lua import PALETA
import numpy as np

R_KM = 1737.4
PDS = 'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/'
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.cache')

# Look shared by every render.
LIGHT = PALETA['luzSolo']
GROUND = PALETA['solo']
ROCK = PALETA['rocha']
OUTLINE = PALETA['contorno']

# Polar DEMs (PDS labels). The map center, as polar stereographic meters.
DEMS = {
    '80m': dict(arquivo='ldem_80s_80m.img', lado=7600, m=80.0, off=3799.5),
    '240m': dict(arquivo='ldem_75s_240m.img', lado=3812, m=240.0, off=1905.5),
}
X0 = (3752 - 1 - 3799.5) * 80.0
Y0 = -(3964 - 1 - 3799.5) * 80.0


def rgb(h, a=1.0):
    h = h.lstrip('#')
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return (*[c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb], a)


def janela(dem, meio_km, passo):
    """Heights (km) around the map center, block-averaged every `passo` pixels.
    Returns (heights[n, n], x_km[n], y_km[n]) with x, y absolute polar stereographic km."""
    c = DEMS[dem]
    cs = X0 / c['m'] + c['off']
    cl = -Y0 / c['m'] + c['off']
    half = int(meio_km * 1000 / c['m'])
    l0, l1 = int(cl) - half, int(cl) + half
    s0, s1 = int(cs) - half, int(cs) + half
    os.makedirs(CACHE, exist_ok=True)
    cache = os.path.join(CACHE, f'dem_{dem}_{meio_km:g}.npy')
    if os.path.exists(cache):
        a = np.load(cache)
    else:
        start = l0 * c['lado'] * 2
        req = urllib.request.Request(PDS + c['arquivo'], headers={'Range': f'bytes={start}-{(l1 + 1) * c["lado"] * 2 - 1}'})
        a = np.frombuffer(urllib.request.urlopen(req).read(), '<i2').reshape(-1, c['lado'])[:, s0:s1 + 1].astype(np.float32) * 0.5 / 1000
        np.save(cache, a)
    n = a.shape[0] // passo
    a = a[:n * passo, :n * passo].reshape(n, passo, n, passo).mean(axis=(1, 3))
    idx = np.arange(n) * passo + passo / 2 - 0.5
    xs = (s0 + idx - c['off']) * c['m'] / 1000
    ys = -(l0 + idx - c['off']) * c['m'] / 1000
    return a, xs, ys


def polar_para_3d(x_km, y_km, h_km):
    """South polar stereographic (km) + height -> moon-fixed xyz (km). Lon 0 = +X, east = +Y."""
    rho = math.hypot(x_km, y_km)
    lat = -math.pi / 2 + 2 * math.atan(rho / (2 * R_KM))
    lon = math.atan2(x_km, y_km)
    r = R_KM + h_km
    return (r * math.cos(lat) * math.cos(lon), r * math.cos(lat) * math.sin(lon), r * math.sin(lat))


def cube_sphere(n):
    verts, faces, base = [], [], 0
    t = np.linspace(-1, 1, n + 1)
    a, b = np.meshgrid(t, t, indexing='ij')
    one = np.ones_like(a)
    for axis, sign in [(0, 1), (0, -1), (1, 1), (1, -1), (2, 1), (2, -1)]:
        p = [None] * 3
        p[axis] = one * sign
        o = [i for i in range(3) if i != axis]
        p[o[0]], p[o[1]] = (a, b) if sign > 0 else (b, a)
        q = np.stack(p, -1).reshape(-1, 3)
        verts.append(q / np.linalg.norm(q, axis=1, keepdims=True))
        idx = np.arange((n + 1) ** 2).reshape(n + 1, n + 1) + base
        faces.append(np.stack([idx[:-1, :-1], idx[1:, :-1], idx[1:, 1:], idx[:-1, 1:]], -1).reshape(-1, 4))
        base += (n + 1) ** 2
    return np.concatenate(verts), np.concatenate(faces)


# ---------- materials (need bpy) ----------
def _ramp(N, stops):
    r = N.new('ShaderNodeValToRGB'); cr = r.color_ramp; cr.interpolation = 'CONSTANT'
    while len(cr.elements) < len(stops): cr.elements.new(0.99)
    for e, (p, col) in zip(cr.elements, stops): e.position = p; e.color = rgb(col)
    return r


def toon(bpy, nome, albedo_fn, luz=LIGHT, borda=None):
    """Emission material: albedo (from albedo_fn(N, L) -> socket) x hard light bands.
    borda = (center xyz, r0, r1): fully opaque within r0 of center, fading out to r1, so a
    detailed patch melts into the coarser ground under it instead of showing an edge."""
    m = bpy.data.materials.new(nome); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links; N.clear()
    alb = albedo_fn(N, L)
    dif = N.new('ShaderNodeBsdfDiffuse'); s2r = N.new('ShaderNodeShaderToRGB'); L.new(dif.outputs['BSDF'], s2r.inputs['Shader'])
    rl = _ramp(N, luz); L.new(s2r.outputs['Color'], rl.inputs['Fac'])
    mul = N.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1
    L.new(alb, mul.inputs[6]); L.new(rl.outputs['Color'], mul.inputs[7])
    em = N.new('ShaderNodeEmission'); L.new(mul.outputs[2], em.inputs['Color'])
    out = N.new('ShaderNodeOutputMaterial')
    if not borda:
        L.new(em.outputs[0], out.inputs['Surface'])
        return m
    c, r0, r1 = borda
    geo = N.new('ShaderNodeNewGeometry')
    dv = N.new('ShaderNodeVectorMath'); dv.operation = 'DISTANCE'; dv.inputs[1].default_value = c
    L.new(geo.outputs['Position'], dv.inputs[0])
    mr = N.new('ShaderNodeMapRange'); mr.interpolation_type = 'SMOOTHSTEP'
    mr.inputs['From Min'].default_value = r0; mr.inputs['From Max'].default_value = r1
    mr.inputs['To Min'].default_value = 0; mr.inputs['To Max'].default_value = 1
    L.new(dv.outputs['Value'], mr.inputs['Value'])
    tr = N.new('ShaderNodeBsdfTransparent')
    mx = N.new('ShaderNodeMixShader'); L.new(mr.outputs['Result'], mx.inputs['Fac'])
    L.new(em.outputs[0], mx.inputs[1]); L.new(tr.outputs[0], mx.inputs[2])
    L.new(mx.outputs[0], out.inputs['Surface'])
    m.surface_render_method = 'BLENDED'
    return m


def albedo_chao(ruido_km, curva_km=None, raio_km=None):
    """Regolith: noise patches, darker rock on steep ground, optional contour lines on the height
    above the sphere (|p| - R, so it works on curved patches)."""
    def fn(N, L):
        tc = N.new('ShaderNodeTexCoord')
        nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 1 / ruido_km; nz.inputs['Detail'].default_value = 1
        L.new(tc.outputs['Object'], nz.inputs['Vector'])
        g = _ramp(N, GROUND); L.new(nz.outputs['Fac'], g.inputs['Fac'])
        geo = N.new('ShaderNodeNewGeometry')
        # steepness = angle between the surface normal and the radial direction
        rad_ = N.new('ShaderNodeVectorMath'); rad_.operation = 'NORMALIZE'; L.new(geo.outputs['Position'], rad_.inputs[0])
        d = N.new('ShaderNodeVectorMath'); d.operation = 'DOT_PRODUCT'
        L.new(geo.outputs['Normal'], d.inputs[0]); L.new(rad_.outputs['Vector'], d.inputs[1])
        st = N.new('ShaderNodeMath'); st.operation = 'LESS_THAN'; st.inputs[1].default_value = math.cos(math.radians(22))
        L.new(d.outputs['Value'], st.inputs[0])
        mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.inputs[7].default_value = rgb(ROCK)
        L.new(st.outputs[0], mx.inputs['Factor']); L.new(g.outputs['Color'], mx.inputs[6])
        if not curva_km: return mx.outputs[2]
        ln_ = N.new('ShaderNodeVectorMath'); ln_.operation = 'LENGTH'; L.new(geo.outputs['Position'], ln_.inputs[0])
        h = N.new('ShaderNodeMath'); h.operation = 'SUBTRACT'; h.inputs[1].default_value = raio_km
        L.new(ln_.outputs['Value'], h.inputs[0])
        dv = N.new('ShaderNodeMath'); dv.operation = 'DIVIDE'; dv.inputs[1].default_value = curva_km; L.new(h.outputs[0], dv.inputs[0])
        fr = N.new('ShaderNodeMath'); fr.operation = 'FRACT'; L.new(dv.outputs[0], fr.inputs[0])
        pp = N.new('ShaderNodeMath'); pp.operation = 'PINGPONG'; pp.inputs[1].default_value = 0.5; L.new(fr.outputs[0], pp.inputs[0])
        lt = N.new('ShaderNodeMath'); lt.operation = 'LESS_THAN'; lt.inputs[1].default_value = 0.035; L.new(pp.outputs[0], lt.inputs[0])
        lm = N.new('ShaderNodeMix'); lm.data_type = 'RGBA'; lm.inputs[7].default_value = rgb(PALETA['rocha'])
        L.new(lt.outputs[0], lm.inputs['Factor']); L.new(mx.outputs[2], lm.inputs[6])
        return lm.outputs[2]
    return fn
