"""右侧几何方向草稿；复用已批准 V3 中心线，不调用原生绘制或 GUI。"""
from pathlib import Path
import sys, importlib.util, json, math, hashlib
import numpy as np
from PIL import Image, ImageDraw, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parent
MEDIA = ROOT.parent.parent
REPO = MEDIA.parent.parent
sys.dont_write_bytecode = True
sys.path.insert(0, str(ROOT.parent / 'v3'))
spec = importlib.util.spec_from_file_location('approved_v3', ROOT.parent / 'v3/build_draft.py')
v3 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v3)
from math_paths import L, C

# 缺失字母仅在本次进程扩展，已批准的字形文件始终只读。
EXTRA = {
 'A':[L((0,1),(.45,0),(.82,1)),C((.15,.65),((.34,.60),(.54,.65),(.68,.60)))],
 'B':[C((.10,1),((.15,.66),(.13,.30),(.18,.02))),C((.18,.02),((.88,-.10),(.87,.42),(.22,.48)),((.94,.41),(.98,1.06),(.10,1)))],
 'C':[C((.80,.10),((.35,-.18),(-.02,.26),(.10,.73)),((.22,1.12),(.57,1.08),(.83,.87)))],
 'D':[L((.09,1),(.16,.03)),C((.16,.03),((1.05,-.09),(1.00,1.06),(.09,1)))],
 'G':[C((.80,.12),((.36,-.14),(.01,.24),(.10,.73)),((.25,1.10),(.72,1.08),(.82,.54))),L((.82,.54),(.52,.55))],
 'H':[C((.18,.02),((.12,.30),(.15,.73),(.08,1))),L((.79,.01),(.75,1)),C((.12,.54),((.34,.50),(.53,.57),(.77,.49)))],
 'Q':v3.GLYPHS['O'][0]+[C((.53,.74),((.65,.85),(.77,1.02),(.94,1.09)))],
 'R':v3.GLYPHS['P'][0]+[C((.43,.55),((.58,.68),(.71,.91),(.87,1.03)))],
 'X':[C((.10,.02),((.31,.31),(.56,.72),(.80,1))),C((.83,.02),((.58,.33),(.28,.72),(.03,1)))],
 'Y':[L((.05,.01),(.40,.49),(.84,.01)),C((.40,.49),((.35,.70),(.30,.86),(.28,1.02)))],
 'Z':[C((.05,.08),((.30,.04),(.57,.06),(.83,.01))),L((.83,.01),(.06,1.01)),C((.06,1.01),((.34,.95),(.60,1.02),(.87,.94)))],
 'k':[C((.10,1),((.17,.67),(.16,.30),(.23,.01))),L((.73,.33),(.18,.72),(.43,.60),(.70,1.01))],
 'd':[C((.61,.42),((.13,.12),(-.03,.98),(.32,.97)),((.55,.94),(.59,.64),(.62,.40))),C((.72,-.02),((.66,.31),(.57,.75),(.61,.98)))],
 '9':[C((.64,.48),((.31,.72),(.03,.39),(.18,.13)),((.42,-.14),(.79,.03),(.68,.40)),((.59,.68),(.49,.84),(.31,1.04)))],
 '<':[L((.66,.18),(.06,.55),(.61,.91))],
 '-':[C((.04,.53),((.23,.51),(.48,.55),(.70,.50)))],
 '(':[C((.42,-.05),((.08,.25),(.02,.74),(.25,1.10)))],
 ')':[C((.05,-.04),((.34,.30),(.29,.80),(.01,1.10)))],
}
v3.GLYPHS.update({k:[v] for k,v in EXTRA.items()})
BLUE = (27,111,172,255)
MUTED = (89,126,164,255)
RED = (222,47,40,255)
INK = BLUE
original_paint = v3.paint
v3.paint = lambda im,points,width,color=None: original_paint(im,points,width,INK)
SHAPES = []
LABELS = []

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def label(im, value, x, y, h=16, red=False, angle=0, root=False):
    global INK
    INK = RED if red else BLUE
    v3.frame(x,y,angle)
    start = len(v3.STROKES)
    end = v3.text(im,value,x,y,h)
    if root:
        v3.root(im,2,end+2,y,h)
    pts = [p for s in v3.STROKES[start:] for p in s['points']]
    LABELS.append({'text':value+('sqrt2' if root else ''),'bbox':[min(p[0] for p in pts),min(p[1] for p in pts),max(p[0] for p in pts),max(p[1] for p in pts)],'strokes':[start,len(v3.STROKES)],'color':INK})
    v3.FRAME = None

def line(im,a,b,color=BLUE,width=1.5,dashed=False,role='geometry'):
    d = ImageDraw.Draw(im)
    length = math.dist(a,b)
    intervals = [(0,length)] if not dashed else [(i,min(i+5,length)) for i in range(0,math.ceil(length),10)]
    for t,u in intervals:
        points = [tuple(2*(a[j]+(b[j]-a[j])*q/length) for j in (0,1)) for q in (t,u)]
        d.line(points,fill=color,width=round(width*2))
    SHAPES.append({'points':[a,b],'color':color,'width':width,'dashed':dashed,'role':role,'fill':None})

def main():
    build = ROOT/'build'
    data = ROOT/'data'
    build.mkdir(parents=True,exist_ok=True)
    data.mkdir(exist_ok=True)
    background = Image.open(MEDIA/'build/background-master.png').convert('RGBA')
    overlay = Image.new('RGBA',background.size)
    mask = Image.new('L',background.size)
    md = ImageDraw.Draw(mask)
    # 所有宽扁扫笔先求并集再上色，交叠处不变暗；同一三角点阵跨过纸页边界。
    sweeps = []
    for i in range(9):
        y = 244+i*76
        poly = [(1215+(i%3)*4,y+13),(1551-(i%2)*8,y-17),(1557-(i%3)*3,y+68),(1205+(i%2)*8,y+94)]
        md.polygon([(x*2,y*2) for x,y in poly],fill=255)
        sweeps.append(poly)
    md.rectangle((0,1870,3200,2000),fill=0)
    overlay.paste((246,241,229,255),(0,0,*overlay.size),mask)
    dots = Image.new('RGBA',overlay.size)
    dd = ImageDraw.Draw(dots)
    row = 10*math.sqrt(3)
    for j in range(-25,20):
        for i in range(-20,20):
            x,y = 1390+20*i+10*j,625+row*j
            dd.ellipse((2*x-2,2*y-2,2*x+2,2*y+2),fill=(129,116,89,92))
    dots.putalpha(ImageChops.multiply(dots.getchannel('A'),mask))
    overlay = Image.alpha_composite(overlay,dots)
    old = json.loads((MEDIA/'data/draft-scene.json').read_text(encoding='utf-8'))
    camera = old['camera']
    center = (1390,625-14*row)
    def project(p):
        q = [v-3 for v in p]
        return (center[0]+29*sum(a*b for a,b in zip(q,camera['right'])),center[1]-29*sum(a*b for a,b in zip(q,camera['up'])))
    vertices = old['cube_vertices']
    mids = old['midpoint_order']
    pts = {k:project(p) for k,p in vertices.items()}
    sec = {k:project(p) for k,p in mids.items()}
    for edge in ['AB','AD','AE','BC','CD','BF','CG','DH','EF','FG','GH','HE']:
        line(overlay,pts[edge[0]],pts[edge[1]],MUTED,1.25,edge.startswith('A'),'cube-edge')
    line(overlay,pts['A'],pts['G'],MUTED,1,True,'body-diagonal')
    order = list(sec)
    for i,k in enumerate(order):
        line(overlay,sec[k],sec[order[(i+1)%6]],BLUE,2.3,i in (0,2,4),'central-section')
    offsets = {'A':(-18,5),'B':(-23,1),'C':(8,-7),'D':(8,-9),'E':(-22,-6),'F':(3,-23),'G':(4,-24),'H':(-11,-25)}
    mo = {'M':(3,8),'N':(-7,7),'P':(8,-8),'Q':(-16,-24),'R':(3,-23),'S':(-23,-4)}
    for k,p in pts.items():
        label(overlay,k,p[0]+offsets[k][0],p[1]+offsets[k][1],15)
    for k,p in sec.items():
        label(overlay,k,p[0]+mo[k][0],p[1]+mo[k][1],16)
    label(overlay,'O',center[0]+5,center[1]-20,15)
    label(overlay,'d=0',1450,546,17,True)
    label(overlay,'9<k<12',1260,577,19,True)
    k = 10
    tri3 = [(k,0,0),(0,k,0),(0,0,k)]
    tri = [(1240,625+15*row),(1540,625+15*row),(1390,625)]
    def planar(p):
        return tuple(sum(p[i]/k*tri[i][j] for i in range(3)) for j in (0,1))
    hex3 = [(6,4,0),(4,6,0),(0,6,4),(0,4,6),(4,0,6),(6,0,4)]
    hexa = [planar(p) for p in hex3]
    corners = [[tri[0],hexa[0],hexa[5]],[tri[1],hexa[2],hexa[1]],[tri[2],hexa[4],hexa[3]]]
    for i in range(3):
        line(overlay,tri[i],tri[(i+1)%3],MUTED,1.5,True,'auxiliary-big-triangle')
    for i in range(6):
        line(overlay,hexa[i],hexa[(i+1)%6],BLUE,2.7,False,'nonregular-section')
    # 三个待扣角仅描边，不填充；短减号强化“扣去”的讲解。
    for corner in corners:
        for i in range(3):
            line(overlay,corner[i],corner[(i+1)%3],BLUE if i==1 else MUTED,1.4,i!=1,'removed-corner')
        cx,cy = [sum(p[j] for p in corner)/3 for j in (0,1)]
        label(overlay,'-',cx-8,cy-9,18,True)
    label(overlay,'X',1218,893,17)
    label(overlay,'Y',1545,892,17)
    label(overlay,'Z',1411,604,17)
    label(overlay,'k',1238,784,17,True,-60,True)
    label(overlay,'(k-6)',1465,666,15,True,60,True)
    # 两条闭合中心线绕同一个小三角形；轮廓外扩，不在内部涂抹。
    loops = []
    top = corners[2]
    cx,cy = [sum(p[j] for p in top)/3 for j in (0,1)]
    laser = Image.new('RGBA',overlay.size)
    for pass_index in range(2):
        anchors = [(cx+(x-cx)*(1.12+pass_index*.14)+pass_index*1.5,cy+(y-cy)*(1.12+pass_index*.14)+pass_index) for x,y in top]
        route = []
        for i,a in enumerate(anchors):
            b = anchors[(i+1)%3]
            dx,dy = b[0]-a[0],b[1]-a[1]
            dist = math.hypot(dx,dy)
            for j in range(32):
                t = j/32
                bend = math.sin(math.pi*t)*(1.2*math.sin(3*t+i)+.7)
                route.append((a[0]+t*dx-dy/dist*bend,a[1]+t*dy+dx/dist*bend))
        route.append(route[0])
        original_paint(laser,route,4.3,(255,51,35,235))
        loops.append({'points':route,'closed':True,'width':4.3,'fill':None})
    glow = laser.filter(ImageFilter.GaussianBlur(4))
    glow.putalpha(glow.getchannel('A').point(lambda a:round(a*.22)))
    overlay = Image.alpha_composite(Image.alpha_composite(overlay,glow),laser)
    result = Image.alpha_composite(background,overlay).convert('RGB')
    result.save(build/'context-master.png')
    result.resize((1600,1000),Image.Resampling.LANCZOS).save(build/'context-preview.png')
    overlay.save(build/'right-overlay.png')
    detail = result.crop((2360,400,3160,1870))
    board = Image.new('RGB',(880,1580),'#FAFAF8')
    board.paste(detail,(40,90))
    v3.caption(board,'右侧几何草稿 · 直接绘制，尚未原生渲染',20,12,14,True)
    board.save(build/'right-detail.png')
    context_board = Image.new('RGB',(1600,1050),'#FAFAF8')
    context_board.paste(Image.open(build/'context-preview.png'),(0,50))
    v3.caption(context_board,'右侧几何草稿 · 直接绘制 · 确认后再进行原生渲染',16,7,13,True)
    context_board.save(build/'context-review.png')
    manifest = {'stage':'direct-rendered-draft-NOT-native','coordinate_space':[1600,1000],'render_scale':2,
      'camera':dict(camera,center=center),'cube_vertices':vertices,'midpoints':mids,'projected_cube':pts,'projected_section':sec,
      'lower':{'k':k,'d':1/math.sqrt(3),'triangle_3d':tri3,'triangle_2d':tri,'hexagon_3d':hex3,'hexagon_2d':hexa,'removed_triangles_2d':corners},
      'lattice':{'origin':[1390,625],'basis':[[20,0],[10,row]],'dot_radius':1,'alpha':92},'brush_sweeps':sweeps,
      'shapes':SHAPES,'laser_loops':loops,'labels':LABELS,'handwriting':v3.STROKES,
      'sources':{str(p.relative_to(REPO)).replace('\\','/'):sha(p) for p in [MEDIA/'build/background-master.png',MEDIA/'data/draft-scene.json',ROOT.parent/'v3/build_draft.py',ROOT.parent/'v3/math_paths.py',Path(__file__)]}}
    (data/'scene.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    print('Created context-preview.png, context-review.png and right-detail.png')

if __name__=='__main__':
    main()
