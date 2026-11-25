"""批准的 V3 路线与教学布局合并；只生成原生输入，不以草稿像素替代墨迹。"""
from pathlib import Path
import sys, importlib.util, json, math, hashlib, textwrap, re
from PIL import Image
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parent
MEDIA=ROOT.parent.parent
spec=importlib.util.spec_from_file_location('shape_author',ROOT.parent/'shape-draft/build_shape_draft.py')
shape_author=importlib.util.module_from_spec(spec);spec.loader.exec_module(shape_author)
v3=shape_author.v3
from math_paths import L,C
RED=(255,16,0,255);BLUE=(34,76,137,255)
INK=RED
EXTRA={
 ',':[C((.12,.90),((.18,1.01),(.12,1.10),(.04,1.16)))],
 ':':[L((.15,.36),(.16,.39)),L((.13,.83),(.14,.86))],
 '4':[L((.62,.01),(.06,.66),(.85,.64)),L((.63,.25),(.55,1.03))],
 '5':[C((.78,.02),((.53,.07),(.34,.02),(.17,.07))),L((.17,.07),(.12,.49)),C((.12,.49),((.69,.29),(.94,.72),(.59,.95)),((.32,1.12),(.12,.97),(.03,.87)))],
 '×':[L((.08,.25),(.70,.88)),L((.71,.22),(.06,.88))],
 '⊥':[L((.38,.06),(.37,.94)),L((.03,.95),(.82,.92))],
 '→':[L((.02,.55),(.96,.51)),L((.69,.25),(.96,.51),(.70,.80))],
 '[':[L((.43,-.06),(.12,-.03),(.09,1.09),(.40,1.08))],
 ']':[L((.02,-.04),(.34,-.03),(.31,1.10),(.00,1.09))],
 'x':[C((.05,.35),((.28,.53),(.43,.80),(.68,1))),L((.69,.33),(.04,1.01))],
 'y':[C((.10,.35),((.05,.81),(.24,1.09),(.60,.38)),((.56,.85),(.39,1.44),(.14,1.43)))],
 'z':[L((.08,.37),(.68,.34),(.05,1.00),(.72,.95))],
 'a':[C((.57,.42),((.19,.17),(-.01,.93),(.28,.98)),((.45,1.01),(.61,.63),(.57,.42))),C((.61,.35),((.55,.68),(.55,1.02),(.73,.94)))],
 'b':[C((.16,.02),((.12,.34),(.10,.73),(.08,.98))),C((.09,.79),((.36,.23),(.68,.28),(.63,.67)),((.59,1.03),(.32,1.10),(.09,.91)))],
 'c':[C((.64,.40),((.32,.18),(.01,.56),(.15,.88)),((.27,1.10),(.51,1.02),(.69,.87)))],
 'e':[C((.12,.65),((.62,.69),(.74,.32),(.43,.33)),((.06,.28),(.03,.87),(.30,.99)),((.49,1.08),(.63,.95),(.73,.85)))],
 'g':[C((.58,.42),((.22,.16),(.00,.90),(.29,.96)),((.49,1.00),(.61,.56),(.58,.42))),C((.65,.35),((.60,.83),(.60,1.45),(.27,1.48)),((.00,1.53),(.04,1.26),(.30,1.16)))],
 'i':[L((.25,.35),(.17,.97)),L((.28,.10),(.29,.12))],
 'l':[C((.28,.01),((.20,.30),(.10,.77),(.17,.95)),((.22,1.05),(.38,.95),(.45,.86)))],
 'm':[C((.09,.98),((.12,.75),(.15,.48),(.18,.35)),((.15,.71),(.13,.88),(.13,.98)),((.29,.47),(.48,.22),(.54,.48)),((.58,.64),(.48,.87),(.51,.99)),((.66,.45),(.86,.24),(.92,.48)),((.98,.69),(.84,.94),(1.02,.99)))],
 'n':[C((.10,.98),((.13,.72),(.15,.48),(.18,.35))),C((.13,.77),((.35,.23),(.60,.23),(.64,.51)),((.66,.71),(.55,.96),(.73,.99)))],
 'p':[C((.18,.35),((.13,.72),(.10,1.09),(.06,1.40))),C((.14,.75),((.36,.23),(.72,.25),(.63,.68)),((.59,.98),(.34,1.04),(.13,.92)))],
 'q':[C((.59,.40),((.25,.19),(.00,.77),(.21,.94)),((.45,1.16),(.62,.63),(.59,.40))),L((.65,.34),(.51,1.41))],
 'r':[C((.10,.98),((.13,.73),(.17,.47),(.21,.35))),C((.16,.71),((.36,.27),(.48,.28),(.64,.46)))],
 't':[C((.37,.06),((.26,.41),(.14,.87),(.27,.97)),((.39,1.06),(.54,.90),(.60,.82))),L((.07,.43),(.66,.38))],
 'u':[C((.17,.35),((.07,.71),(.07,1.02),(.29,.97)),((.46,.93),(.58,.58),(.62,.35))),C((.62,.35),((.57,.71),(.53,1.02),(.73,.96)))],
}
v3.GLYPHS.update({k:[v] for k,v in EXTRA.items()})
v3.paint=lambda *args,**kwargs:None
LAYOUT=[]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def colored(start,color):
    for s in v3.STROKES[start:]:s['rgba']=color;s['width']=s['height']*.095;s['tool']='soft'
def text(im,value,x,y,h=21,color=RED):
    global INK
    INK=color;start=len(v3.STROKES);begin=x
    for token in re.split('( +)',value):
        if not token:continue
        if token.isspace():x+=len(token)*h*.34
        elif token in v3.WORDS:x=v3.words(im,token,x,y,h)
        else:x=v3.text(im,token,x,y,h)
    colored(start,color)
    LAYOUT.append({'text':value,'origin':[begin,y],'height':h,'end':x,'strokes':[start,len(v3.STROKES)]})
    return x
def radical(im,n,x,y,h=21):
    start=len(v3.STROKES);end=v3.root(im,n,x,y,h);colored(start,INK);return end
def continuous(points):
    # 三次 Hermite 插值先形成连续曲线；闭合圈使用周期切线，避免接缝折角。
    pts=list(points);closed=math.dist(pts[0],pts[-1])<1e-6
    if closed:pts=pts[:-1]
    if len(pts)<3:return list(points)
    tangent=[]
    for i,p in enumerate(pts):
        a=pts[(i-1)%len(pts)] if closed or i else p
        b=pts[(i+1)%len(pts)] if closed or i<len(pts)-1 else p
        tangent.append(tuple((b[j]-a[j])*(.5 if closed or 0<i<len(pts)-1 else 1) for j in (0,1)))
    out=[pts[0]]
    for i in range(len(pts) if closed else len(pts)-1):
        k=(i+1)%len(pts);a,b=pts[i],pts[k]
        count=max(12,math.ceil(math.dist(a,b)/.3))
        for step in range(1,count+1):
            t=step/count
            out.append(tuple((2*t**3-3*t*t+1)*a[j]+(t**3-2*t*t+t)*tangent[i][j]+(-2*t**3+3*t*t)*b[j]+(t**3-t*t)*tangent[k][j] for j in (0,1)))
    return out

def section_laser(scene):
    # 取批准的小三角形右斜边中段；轻微外偏与平滑弓形保留手绘感。
    triangle=scene['lower']['removed_triangles_2d'][2]
    a,b=triangle[0],triangle[2]
    dx,dy=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dy)
    route=[]
    for n in range(241):
        u=n/240;t=.25+.5*u;offset=1.5+2*math.sin(math.pi*u)**2
        route.append((a[0]+t*dx+dy/length*offset,a[1]+t*dy-dx/length*offset))
    return {'edge':[a,b],'edge_fraction':[.25,.75],'points':route,'closed':False,'width':3.0,'native_scale':.60,'fill':None}

def stroke(im,points,width=1.7,color=RED,curve=True,tool='soft'):
    pts=continuous(points) if curve else points
    if v3.FRAME:
        ox,oy,a=v3.FRAME;ca,sa=math.cos(a),math.sin(a)
        pts=[(ox+(x-ox)*ca-(y-oy)*sa,oy+(x-ox)*sa+(y-oy)*ca) for x,y in pts]
    samples,motion=v3.base.motion(pts,[],175)
    v3.STROKES.append({'tool':tool,'rgba':color,'width':width,'points':pts,'samples':samples,'motion':dict(motion,pre_up_hold_ms=88),'label':'annotation'})
def cluster(x,y,a):v3.frame(x,y,a)
def superscript(im,x,y,h=12):return text(im,'2',x,y,h)
def fraction_root(im,n,x,y,h=18):
    end=radical(im,3,x,y-10,h*.78)
    stroke(im,[(x-2,y+10),(end,y+9)],1.35,curve=False)
    text(im,str(n),x+11,y+13,h*.8)
    return end+5
def main():
    hand=None
    # 只读旧布局的文字与标注位置；字形、运动与笔宽完全由 V3 生成。
    code=textwrap.dedent((ROOT/'teaching_layout.py.txt').read_text(encoding='utf-8-sig')).replace('global TRANSFORM','').replace('TRANSFORM=None','v3.FRAME=None')
    exec(compile(code,'teaching_layout','exec'),globals(),{'hand':hand})
    scene=json.loads((ROOT.parent/'shape-draft/data/scene.json').read_text(encoding='utf-8'))
    for label in scene['labels']:
        for s in scene['handwriting'][label['strokes'][0]:label['strokes'][1]]:
            s=dict(s,rgba=label['color'],width=s['height']*.095,tool='soft');v3.STROKES.append(s)
    lines=['locale en-US','canvas 3200 2000','board F6F1E5 1','toolbar FF1000','pattern 2780 1250 40 34.6410161514 2 129 116 89 92']
    def free(s,tool):
        points=s['samples'];lines.append('free_hold '+tool+' '+' '.join(map(str,s['rgba']))+f" {s['width']*2:.5f} 88 {len(points)}")
        lines.extend(f'{x*2:.5f} {y*2:.5f} {t:.5f}' for x,y,t in points)
    lines.append('layer ink-handwriting dev')
    for s in v3.STROKES:free(s,'soft')
    lines+=['end','layer ink-highlight dev']
    old=json.loads((MEDIA/'data/draft-scene.json').read_text(encoding='utf-8'))
    for s in old['strokes']:
        if s['tool']=='highlighter':
            pts=[p[:2] for p in s['samples']];s['samples']=v3.base.motion(pts,[],175)[0];free(s,'highlighter')
    lines+=['end','layer ink-brush dev']
    for poly in scene['brush_sweeps']:
        a=[(poly[0][j]+poly[3][j])/2 for j in (0,1)];b=[(poly[1][j]+poly[2][j])/2 for j in (0,1)]
        free({'samples':v3.base.motion([a,b],[],200)[0],'rgba':[246,241,229,255],'width':84},'flat')
    lines+=['end','layer ink-laser dev']
    laser=section_laser(scene)
    for loop in [laser]:
        samples=v3.base.motion(loop['points'],[],240)[0];lines.append(f"laser_scaled {loop['native_scale']:.2f} {len(samples)}")
        lines.extend(f'{x*2:.5f} {y*2:.5f} {t:.5f}' for x,y,t in samples)
    lines+=['end','layer geometry shape']
    for s in scene['shapes']:
        color=''.join(f'{v:02X}' for v in s['color'][:3]);coords=' '.join(f'{v*2:.5f}' for p in s['points'] for v in p)
        lines.append(f"shape line {color} {s['width']*2:.5f} {int(s['dashed'])} {coords}")
    lines+=['end']
    path=ROOT/'data/native-scene.txt';path.write_text('\n'.join(lines)+'\n')
    manifest={'input_sha256':sha(path),'background_sha256':sha(MEDIA/'build/background-master.png'),'approved_geometry_sha256':sha(ROOT.parent/'shape-draft/data/scene.json'),'handwriting_width_policy':'height*.095 native nominal; V3 *.105 was draft proxy','hold_ms':88,'lattice':scene['lattice'],'brush_clip_y':1870,'strokes':len(v3.STROKES)}
    (ROOT/'data/native-input-manifest.json').write_text(json.dumps(manifest,indent=2))
    (ROOT/'data/scene.json').write_text(json.dumps({'handwriting':v3.STROKES,'layout':LAYOUT,'approved_geometry':scene,'laser_loops':[laser]},ensure_ascii=False),encoding='utf-8')
    print('Prepared',len(v3.STROKES),'strokes; layout max',max(x['end'] for x in LAYOUT))
if __name__=='__main__':main()
