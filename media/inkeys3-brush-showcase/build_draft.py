"""第二阶段直接合成草稿；真实中心线与几何参数留给第三阶段，冻结已确认背景。"""
import hashlib
import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parent
BUILD = ROOT / 'build'
DATA = ROOT / 'data'
LAYERS = BUILD / 'draft-layers'
SCALE = 2
SIZE = (3200, 2000)
RED = (255, 16, 0, 255)
BLUE = (23, 116, 176, 255)
GRAY = (34, 76, 137, 255)
RNG = random.Random(1027)
STROKES = []
SHAPES = []
TEXT = []
TRANSFORM = None

# 原创字形以书写中心线表示；坐标单位为字高，不依赖字体轮廓。
RAW = {
 '×': '.08,.22 .66,.82|.66,.2 .07,.85',
 '∠': '.62,.08 .07,.91 .8,.91',
 'A': '0,1 .25,.38 .48,0 .79,1|.16,.63 .62,.59',
 'B': '.08,1 .13,.05|.13,.05 .5,0 .68,.18 .5,.43 .15,.47 .55,.48 .74,.72 .6,.94 .08,1',
 'C': '.77,.12 .53,0 .18,.12 .03,.52 .16,.91 .52,1 .8,.88',
 'D': '.1,1 .13,.04|.13,.04 .53,.04 .77,.35 .75,.69 .51,.97 .1,1',
 'E': '.76,.04 .15,.04 .1,.98 .76,.94|.14,.48 .6,.46',
 'F': '.12,1 .16,.04 .76,0|.15,.47 .59,.45',
 'G': '.78,.16 .53,.02 .17,.15 .04,.58 .21,.94 .61,.98 .78,.7 .76,.5 .48,.52',
 'H': '.13,.02 .07,1|.78,.02 .72,1|.1,.5 .75,.47',
 'M': '.04,1 .12,.02 .46,.59 .79,.02 .85,1',
 'N': '.06,1 .14,.02 .78,.97 .8,.02',
 'O': '.48,.02 .18,.1 .04,.5 .15,.91 .48,1 .76,.8 .81,.36 .64,.05 .48,.02',
 'P': '.1,1 .17,.04 .52,.02 .75,.21 .66,.43 .18,.48',
 'Q': '.48,.02 .18,.1 .04,.5 .15,.91 .48,1 .76,.8 .81,.36 .64,.05 .48,.02|.5,.73 .87,1.12',
 'R': '.1,1 .17,.04 .52,.02 .75,.21 .66,.43 .18,.48|.43,.47 .8,1',
 'S': '.78,.12 .5,.02 .18,.13 .12,.35 .59,.59 .75,.79 .55,.98 .14,.9',
 'a': '.55,.4 .32,.29 .07,.47 .05,.82 .25,.98 .52,.76 .58,.34 .54,.88 .72,.96',
 'b': '.11,.98 .22,.02 .17,.68 .38,.34 .61,.38 .67,.7 .45,.96 .16,.93',
 'c': '.63,.41 .37,.3 .12,.42 .05,.74 .24,.98 .6,.86',
 'd': '.55,.4 .3,.33 .06,.57 .1,.9 .35,.95 .57,.66 .67,.02 .56,.85 .72,.96',
 'e': '.08,.63 .55,.54 .55,.36 .31,.31 .08,.5 .08,.83 .35,.98 .64,.84',
 'f': '.04,.42 .66,.38|.19,1.19 .3,.18 .5,-.02 .63,.09',
 'g': '.58,.4 .32,.31 .09,.48 .1,.87 .35,.96 .58,.63 .6,.37 .52,1.25 .31,1.46 .07,1.31',
 'h': '.08,.98 .2,.01 .13,.77 .35,.37 .55,.4 .58,.96 .74,.9',
 'i': '.15,.39 .1,.88 .25,.96 .41,.82|.22,.12 .23,.11',
 'k': '.1,1 .2,.02|.64,.33 .18,.69 .44,.62 .67,.98',
 'l': '.1,.82 .4,.16 .34,-.04 .19,.11 .13,.82 .31,.98 .51,.8',
 'm': '.07,.94 .15,.35 .17,.72 .36,.35 .54,.43 .52,.97 .6,.59 .8,.38 .97,.53 .94,.97',
 'n': '.06,.98 .16,.35 .14,.77 .4,.36 .58,.44 .58,.93 .76,.94',
 'o': '.38,.32 .12,.43 .06,.75 .22,.98 .48,.92 .64,.64 .54,.37 .38,.32',
 'p': '.08,1.4 .19,.34 .16,.78 .4,.35 .63,.44 .65,.73 .46,.95 .17,.91',
 'q': '.54,.38 .28,.32 .07,.54 .13,.9 .39,.94 .6,.53 .51,1.36',
 'r': '.09,.98 .18,.36 .16,.77 .35,.37 .55,.43',
 's': '.61,.39 .34,.31 .14,.43 .22,.6 .51,.75 .52,.91 .29,1 .08,.88',
 't': '.34,.07 .23,.84 .35,1 .57,.87|.05,.4 .64,.36',
 'u': '.15,.36 .08,.8 .22,.98 .48,.78 .58,.35 .53,.89 .71,.96',
 'v': '.07,.36 .27,.99 .72,.33',
 'x': '.09,.37 .59,.98|.64,.33 .05,1',
 'y': '.1,.37 .16,.88 .37,.94 .59,.36 .5,1.2 .29,1.45 .07,1.3',
 'z': '.12,.4 .66,.35 .06,.95 .67,.9',
 '0': '.34,.03 .1,.23 .04,.7 .22,.98 .5,.9 .64,.47 .57,.08 .34,.03',
 '1': '.08,.23 .39,.03 .26,.97|.05,1 .53,.97',
 '2': '.05,.24 .27,.03 .53,.08 .63,.29 .47,.57 .06,.97 .66,.95',
 '3': '.07,.12 .43,.02 .6,.2 .43,.45 .2,.48 .48,.5 .65,.76 .46,.97 .09,.89',
 '4': '.48,.04 .05,.65 .7,.61|.53,.2 .46,1',
 '5': '.63,.04 .16,.04 .1,.48 .4,.43 .62,.64 .52,.91 .25,1 .06,.84',
 '6': '.56,.04 .26,.19 .08,.56 .12,.9 .4,1 .64,.79 .53,.54 .29,.49 .09,.66',
 '7': '.06,.08 .69,.02 .36,.53 .2,1',
 '8': '.4,.47 .13,.28 .21,.05 .49,.05 .62,.26 .4,.47 .1,.7 .15,.94 .47,1 .66,.8 .4,.47',
 '9': '.58,.48 .33,.55 .1,.39 .16,.12 .41,.03 .65,.2 .58,.61 .38,1',
 '=': '.04,.42 .64,.38|.02,.68 .62,.64',
 '+': '.05,.53 .69,.5|.38,.2 .33,.86',
 '-': '.06,.55 .62,.5',
 ',': '.18,.91 .1,1.18',
 '.': '.18,.96 .2,.98',
 ':': '.16,.4 .18,.42|.14,.94 .16,.95',
 '(': '.4,-.05 .16,.27 .07,.68 .22,1.1',
 ')': '.04,-.04 .24,.32 .19,.72 -.02,1.1',
 '[': '.35,-.03 .1,0 .04,1.05 .31,1.06',
 ']': '.05,-.03 .3,0 .25,1.05 .01,1.06',
 '<': '.62,.23 .06,.57 .58,.91',
 '°': '.2,.02 .08,.08 .07,.23 .2,.29 .32,.19 .29,.04 .2,.02',
 '→': '.02,.54 .88,.5|.6,.26 .9,.5 .61,.74',
 '≤': '.62,.12 .06,.43 .58,.7|.06,.94 .6,.91',
 '∴': '.25,.2 .27,.22|.04,.7 .06,.72|.46,.7 .48,.72',
 '⊥': '.04,.91 .8,.91|.42,.08 .42,.91',
}
GLYPHS = {k: [[tuple(map(float,p.split(','))) for p in stroke.split()] for stroke in v.split('|')] for k,v in RAW.items()}


def smooth(points):
    if len(points)<3:
        return points
    out=[]
    p=[points[0]]+points+[points[-1]]
    for i in range(1,len(p)-2):
        for step in range(9):
            t=step/9
            out.append(tuple(.5*(2*p[i][j]+(-p[i-1][j]+p[i+1][j])*t+(2*p[i-1][j]-5*p[i][j]+4*p[i+1][j]-p[i+2][j])*t*t+(-p[i-1][j]+3*p[i][j]-3*p[i+1][j]+p[i+2][j])*t*t*t) for j in (0,1)))
    return out+[points[-1]]


def stroke(im, points, width=1.7, color=RED, curve=True, tool='soft'):
    path=smooth(points) if curve else points
    if TRANSFORM:
        ox,oy,angle=TRANSFORM
        ca,sa=math.cos(angle),math.sin(angle)
        path=[(ox+(x-ox)*ca-(y-oy)*sa,oy+(x-ox)*sa+(y-oy)*ca) for x,y in path]
    d=ImageDraw.Draw(im)
    time=0
    samples=[]
    phase=RNG.uniform(0,5)
    for i,p in enumerate(path):
        if i:
            distance=math.dist(p,path[i-1])
            time+=max(1,distance/(.28+.06*math.sin(i*.3)))
            taper=.7+.3*math.sin(math.pi*i/(len(path)-1))
            w=width*taper*(1+.15*math.sin(i*.25+phase))
            xy=[tuple(v*SCALE for v in q) for q in (path[i-1],p)]
            d.line(xy,fill=color,width=max(1,round(w*SCALE)))
            r=w*SCALE/2
            x,y=xy[-1]
            d.ellipse((x-r,y-r,x+r,y+r),fill=color)
        samples.append([round(p[0],3),round(p[1],3),round(time,2)])
    STROKES.append({'tool':tool,'rgba':color,'width':width,'samples':samples})


def text(im, content, x,y,h=21,color=RED):
    start=x
    TEXT.append({'text':content,'origin':[x,y],'height':h})
    for index,ch in enumerate(content):
        if ch==' ':
            x+=h*.34
            continue
        glyph=GLYPHS[ch]
        maxx=max(p[0] for seg in glyph for p in seg)
        size=h*RNG.uniform(.92,1.075)
        offset=RNG.uniform(-1.2,1.2)+.8*math.sin(index*.65)
        slant=RNG.uniform(.07,.16)
        for segment in glyph:
            pts=[(x+(a+(1-b)*slant)*size,y+b*size+offset) for a,b in segment]
            stroke(im,pts,width=h*.095,color=color)
        x+=h*(maxx+.18)*RNG.uniform(.93,1.04)
    return x


def radical(im,n,x,y,h=21):
    # 根号、横线、被开方数均为手写中心线，保留独立笔画而非排版字体。
    end=text(im,str(n),x+h*.62,y,h)
    stroke(im,[(x,y+h*.55),(x+h*.18,y+h*.48),(x+h*.33,y+h*.92),(x+h*.57,y-h*.08),(end+2,y-h*.1)],width=h*.095,curve=False)
    return end+5


def line(im,a,b,color=GRAY,width=1.55,dashed=False):
    d=ImageDraw.Draw(im)
    length=math.dist(a,b)
    if dashed:
        for start in range(0,round(length),11):
            t=start/length; u=min(1,(start+6)/length)
            p=[((a[0]+(b[0]-a[0])*v)*2,(a[1]+(b[1]-a[1])*v)*2) for v in (t,u)]
            d.line(p,fill=color,width=round(width*2))
    else:
        d.line([tuple(x*2 for x in a),tuple(x*2 for x in b)],fill=color,width=round(width*2))
    SHAPES.append({'kind':'line','points':[a,b],'rgba':color,'width':width,'dashed':dashed})


def polygon(im,points,fill):
    ImageDraw.Draw(im).polygon([(x*2,y*2) for x,y in points],fill=fill)
    SHAPES.append({'kind':'polygon','points':points,'fill':fill})


def cluster(x,y,degrees):
    global TRANSFORM
    TRANSFORM=(x,y,math.radians(degrees))


def superscript(im,x,y,h=12):
    return text(im,'2',x,y,h)


def fraction_root(im, denominator, x,y,h=18):
    end=radical(im,3,x+4,y-11,h*.8)
    stroke(im,[(x,y+7),(end+2,y+6)],width=1.6,curve=False)
    text(im,str(denominator),x+11,y+11,h*.8)
    return end+8


def flat_path(im,points,width,fill):
    """沿曲线扫过平头带；不以圆形端点或圆角线段替代平头笔。"""
    path=smooth(points)
    left=[];right=[]
    for i,p in enumerate(path):
        a=path[max(0,i-1)];b=path[min(len(path)-1,i+1)]
        dx,dy=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dy) or 1
        nx,ny=-dy/length*width/2,dx/length*width/2
        left.append(((p[0]+nx)*2,(p[1]+ny)*2));right.append(((p[0]-nx)*2,(p[1]-ny)*2))
    ImageDraw.Draw(im).polygon(left+right[::-1],fill=fill)
    return path


def make():
    DATA.mkdir(exist_ok=True); LAYERS.mkdir(exist_ok=True)
    background=BUILD/'background-master.png'
    before=hashlib.sha256(background.read_bytes()).hexdigest()
    layers={name:Image.new('RGBA',SIZE) for name in ['highlight','cream-brush','brush-dots','geometry','handwriting','laser','toolbar-proxy']}
    high=layers['highlight']; white=layers['cream-brush']; geo=layers['geometry']; hand=layers['handwriting']
    # 每笔先绘独立透明层再 alpha 合成，使两次错位划重点真实叠深。
    for points,width in [([(697,510),(741,508),(785,510)],12),
                         ([(700,512),(742,514),(782,511)],10),
                         ([(822,529),(854,531),(889,528)],12),
                         ([(1061,568),(1097,566),(1133,568)],11)]:
        pass_layer=Image.new('RGBA',SIZE)
        path=flat_path(pass_layer,points,width,(255,218,34,90))
        high=Image.alpha_composite(high,pass_layer)
        STROKES.append({'tool':'highlighter','rgba':[255,218,34,90],'width':width,'cap':'flat','samples':[[x,y,i*8] for i,(x,y) in enumerate(path)]})
    layers['highlight']=high
    # 奶油色底只在擦拭扫过的区域，斜向去回笔有自然非矩形外轮廓。
    mask=Image.new('L',SIZE)
    brush_paths=[]
    for i in range(14):
        y=240+i*44
        left=1230+RNG.randint(-10,12)
        if 480<y<620:left+=25
        right=1526+RNG.randint(-8,9)
        points=[(left,y),(1380,y+14+RNG.randint(-7,8)),(right,y+43+RNG.randint(-9,8))]
        if i%2:points=points[::-1]
        width=RNG.randint(85,97)
        path=flat_path(mask,points,width,255)
        brush_paths.append({'tool':'textured-flat-brush-demo','rgba':[246,241,229,255],'width':width,'cap':'flat','samples':[[x,y,i*8] for i,(x,y) in enumerate(path)]})
    STROKES.extend(brush_paths)
    white.paste((246,241,229,255),(0,0,*SIZE),mask)
    dots=layers['brush-dots'];dotdraw=ImageDraw.Draw(dots)
    for y in range(742%18,1000,18):
        for x in range(1372%18,1600,18):
            dotdraw.ellipse((x*2-1.3,y*2-1.3,x*2+1.3,y*2+1.3),fill=(155,137,104,125))
    dots.putalpha(ImageChops.multiply(dots.getchannel('A'),mask))
    mask.save(LAYERS/'brush-mask.png')
    # 立方体使用单位正交屏幕基与单一比例的真实正交投影；A 相邻三条棱在背面。
    vertices={'A':(0,0,0),'B':(6,0,0),'C':(6,6,0),'D':(0,6,0),'E':(0,0,6),'F':(6,0,6),'G':(6,6,6),'H':(0,6,6)}
    normal=(4/math.sqrt(77),6/math.sqrt(77),5/math.sqrt(77))
    right=(-6/math.sqrt(52),4/math.sqrt(52),0)
    up=(normal[1]*right[2]-normal[2]*right[1],normal[2]*right[0]-normal[0]*right[2],normal[0]*right[1]-normal[1]*right[0])
    def project(p):
        q=[v-3 for v in p]
        return (1385+29*sum(a*b for a,b in zip(q,right)),390-29*sum(a*b for a,b in zip(q,up)))
    midpoints={'M':(6,3,0),'N':(3,6,0),'P':(0,6,3),'Q':(0,3,6),'R':(3,0,6),'S':(6,0,3)}
    pts={k:project(v) for k,v in vertices.items()}
    section={k:project(v) for k,v in midpoints.items()}
    for a,b in [('A','B'),('A','D'),('A','E')]:line(geo,pts[a],pts[b],color=(83,122,176,255),dashed=True)
    for a,b in [('B','C'),('C','D'),('B','F'),('C','G'),('D','H'),('E','F'),('F','G'),('G','H'),('H','E')]:line(geo,pts[a],pts[b])
    line(geo,pts['A'],pts['G'],color=(80,120,181,255),width=1.2,dashed=True)
    order=list(section)
    for i,k in enumerate(order):line(geo,section[k],section[order[(i+1)%6]],color=BLUE,width=2,dashed=i in (0,2,4))
    center=project((3,3,3))
    ImageDraw.Draw(geo).ellipse((center[0]*2-3,center[1]*2-3,center[0]*2+3,center[1]*2+3),fill=GRAY)
    offsets={'A':(-18,5),'B':(-20,1),'C':(8,-7),'D':(8,-9),'E':(-21,-6),'F':(3,-21),'G':(4,-24),'H':(-11,-25)}
    for k,p in pts.items():text(hand,k,p[0]+offsets[k][0],p[1]+offsets[k][1],15,color=GRAY)
    mo={'M':(3,8),'N':(-7,7),'P':(8,-8),'Q':(-16,-24),'R':(3,-23),'S':(-23,-4)}
    for k,p in section.items():
        ImageDraw.Draw(geo).ellipse((p[0]*2-3.5,p[1]*2-3.5,p[0]*2+3.5,p[1]*2+3.5),fill=RED)
        text(hand,k,p[0]+mo[k][0],p[1]+mo[k][1],16)
    text(hand,'O',center[0]+5,center[1]-19,16,color=GRAY)
    text(hand,'d = 0',1440,592,17)
    text(hand,'midpoints',1250,590,18)
    # 正视六边形独立于立体投影，顶点顺序与总图相同。
    hexpts={k:(1372-98*math.cos(math.radians(30+i*60)),742+98*math.sin(math.radians(30+i*60))) for i,k in enumerate(order)}
    for i,k in enumerate(order):line(geo,hexpts[k],hexpts[order[(i+1)%6]],color=BLUE,width=2)
    for k,p in hexpts.items():
        line(geo,(1372,742),p,color=(88,132,191,255),width=1,dashed=True)
        dx=p[0]-1372;dy=p[1]-742
        text(hand,k,p[0]+dx*.13-7,p[1]+dy*.13-9,17)
    text(hand,'O',1378,721,17,color=GRAY)
    angle_center=hexpts['M']
    arc=[(angle_center[0]+25*math.cos(math.radians(a)),angle_center[1]+25*math.sin(math.radians(a))) for a in range(270,391,3)]
    for a,b in zip(arc,arc[1:]):line(geo,a,b,color=RED,width=1.2)
    text(hand,'120°',1299,746,17)
    text(hand,'d=0 only',1308,860,17,color=BLUE)
    # 与印刷题意交互：软笔圈尺寸、划法向条件、从参数区间引到计算。
    stroke(hand,[(818,482),(838,478),(857,483),(856,496),(836,499),(817,494),(818,482)],1.4)
    stroke(hand,[(695,517),(778,519),(944,516)],1.5)
    stroke(hand,[(825,538),(857,540),(890,537)],1.6)
    stroke(hand,[(1060,559),(1058,576),(1137,576),(1139,557)],1.4,curve=False)
    stroke(hand,[(1108,585),(1124,604),(1058,620)],1.4)
    stroke(hand,[(1070,611),(1058,620),(1073,624)],1.4,curve=False)

    # 逐步板演：左灰区从坐标到棱中点，再检验三角形；各小组独立微倾斜。
    cluster(268,236,-1.4)
    text(hand,'A=(0,0,0)',268,236,20)
    text(hand,'G=(6,6,6)',309,278,20)
    text(hand,'O=(3,3,3)',283,320,20)
    cluster(275,367,1.7)
    text(hand,'AG ⊥ plane',275,367,19)
    text(hand,'x+y+z=k',268,408,21)
    text(hand,'3+3+3=k → k=9',281,452,17)
    stroke(hand,[(410,475),(470,472)],1.6,color=BLUE)
    cluster(274,499,-1.5)
    text(hand,'BC: x=6,z=0',274,499,18)
    text(hand,'6+y=9 → y=3',266,542,19)
    text(hand,'M=(6,3,0)',321,584,20)
    text(hand,'N=(3,6,0)',293,626,20)
    cluster(268,674,1.2)
    x=text(hand,'MN',268,674,20);x=superscript(hand,x,667)+2
    x=text(hand,'=3',x,674,20);x=superscript(hand,x,667)+2
    x=text(hand,'+3',x,674,20);x=superscript(hand,x,667)+1;text(hand,'=18',x,674,20)
    x=text(hand,'OM',305,716,20);x=superscript(hand,x,709)+2
    x=text(hand,'=ON',x,716,20);x=superscript(hand,x,709)+2;text(hand,'=18',x,716,20)
    text(hand,'→ equilateral',281,759,19)
    text(hand,'∠MON=60°',295,803,20)
    text(hand,'by symmetry',332,845,17)
    stroke(hand,[(288,827),(435,826)],1.5,color=BLUE)

    # 中心截面面积：六个全等正三角形，乘法保留而不是直接跳到结果。
    cluster(640,631,-.7)
    x=text(hand,'P=6×3',640,631,20);x=radical(hand,2,x,631,20)
    x=text(hand,'=18',x,631,20);x=radical(hand,2,x,631,20);text(hand,'cm',x+3,633,16)
    cluster(552,678,.6)
    x=text(hand,'S',552,678,20);text(hand,'0',x-1,689,12)
    x=text(hand,'=6×',x+10,678,20);x=fraction_root(hand,4,x+4,678,19)
    x=text(hand,'×(3',x,678,20);x=radical(hand,2,x,678,20);x=text(hand,')',x,678,20);superscript(hand,x,669)
    cluster(576,724,-.5)
    x=text(hand,'=6×',576,724,19);x=fraction_root(hand,4,x+3,724,18)
    x=text(hand,'×18=27',x,724,19);x=radical(hand,3,x,724,19);x=text(hand,'cm',x+3,726,15);superscript(hand,x,719,11)

    # 平移法向距离先转为截距参数；宽行展开后再代入，不省略关键中间式。
    cluster(932,622,.8)
    x=text(hand,'d=',932,622,19)
    end=text(hand,'k-9',x+8,610,17)
    stroke(hand,[(x+1,631),(end+5,630)],1.5,curve=False)
    radical(hand,3,x+8,638,16)
    cluster(935,674,-.7)
    x=text(hand,'→ k=9+',935,674,18);x=radical(hand,3,x,674,18);text(hand,'d',x,674,18)

    cluster(552,775,-.4)
    x=text(hand,'S(d)=',552,775,20);x=fraction_root(hand,2,x+5,775,18)
    x=text(hand,'[k',x,775,20);first=x;superscript(hand,x,768)
    x=text(hand,'-3(k-6)',x+12,775,20);superscript(hand,x-1,768);text(hand,']',x+10,775,20)
    text(hand,'big - 3 small',first-12,804,12,color=BLUE)
    cluster(576,822,.55)
    x=text(hand,'=',576,822,19);x=fraction_root(hand,2,x+7,822,17)
    x=text(hand,'[-2k',x,822,19);superscript(hand,x,815)
    text(hand,'+36k-108]',x+11,822,19)
    cluster(923,774,-.8)
    x=text(hand,'=',923,774,18);x=fraction_root(hand,2,x+6,774,16)
    x=text(hand,'[54-6d',x,774,18);superscript(hand,x,767,11);text(hand,']',x+10,774,18)
    cluster(926,824,.4)
    x=text(hand,'=27',926,824,18);x=radical(hand,3,x,824,18)
    x=text(hand,'-3',x+3,824,18);x=radical(hand,3,x,824,18);x=text(hand,'d',x,824,18);superscript(hand,x,817,11)
    text(hand,'max at d=0',959,863,16,color=BLUE)
    global TRANSFORM
    TRANSFORM=None
    # 蓝色连接箭头说明展开式代入右侧，避免两组计算看起来毫无关联。
    stroke(hand,[(845,833),(879,820),(903,786)],1.5,color=BLUE)
    stroke(hand,[(891,791),(903,786),(902,800)],1.5,color=BLUE,curve=False)
    path=[(400+34*math.cos(a),552+16*math.sin(a)) for a in [i*2*math.pi/60 for i in range(61)]]
    stroke(hand,path,1.5,color=BLUE,curve=False)
    path=[(437+(24+math.sin(a*3))*math.cos(a),687+17*math.sin(a)) for a in [i*2*math.pi/65 for i in range(66)]]
    stroke(hand,path,1.5,color=BLUE,curve=False)
    stroke(hand,[(460,696),(484,718),(482,751),(470,768)],1.5,color=BLUE)
    stroke(hand,[(470,758),(470,768),(480,762)],1.5,color=BLUE,curve=False)
    # 最后强调正六边形中的中心角，激光只出现一次，保留原120°内角。
    text(hand,'60°',1341,775,16,color=BLUE)
    laser=layers['laser']
    arc_points=[(1372+31*math.cos(math.radians(a)),742+31*math.sin(math.radians(a))) for a in range(88,153,2)]
    path=[(1296,786),(1364,747),(1372,752),(1372,830)]
    glow=Image.new('RGBA',SIZE)
    stroke(glow,path,6.0,(255,85,10,120),curve=False,tool='laser-glow-proxy')
    laser.alpha_composite(glow.filter(ImageFilter.GaussianBlur(4)))
    stroke(laser,path,2.15,(255,68,0,245),curve=False,tool='laser')
    stroke(laser,arc_points,1.6,(255,68,0,245),curve=False,tool='laser')
    # 本阶段仅明确标记的主栏布局代理，绝不冒充原生离屏导出。
    tb=layers['toolbar-proxy'];td=ImageDraw.Draw(tb)
    td.rounded_rectangle((487*2,880*2,1159*2,936*2),radius=10*2,fill=(30,35,42,255),outline=(255,16,0,180),width=2)
    labels=['Select','Soft Pen','Shapes','Eraser','Undo','Clear','More']
    ui=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',21)
    for i,label in enumerate(labels):
        cx=531+i*96
        if i==1:td.rounded_rectangle(((cx-40)*2,884*2,(cx+40)*2,932*2),radius=4*2,fill=(91,47,47,255))
        if i==1:
            td.line(((cx-8)*2,906*2,(cx+8)*2,890*2),fill=(255,16,0,255),width=9)
        elif i==4:
            td.arc(((cx-10)*2,889*2,(cx+11)*2,910*2),190,355,fill='white',width=4)
            td.polygon([((cx-12)*2,898*2),((cx-3)*2,888*2),((cx-3)*2,900*2)],fill='white')
        elif i==0:td.polygon([((cx-7)*2,889*2),((cx-7)*2,909*2),((cx-1)*2,903*2),((cx+8)*2,904*2)],fill='white')
        elif i==2:
            td.rectangle(((cx-10)*2,891*2,(cx+3)*2,905*2),outline='white',width=3)
            td.ellipse(((cx-2)*2,895*2,(cx+12)*2,909*2),fill='white')
        elif i==3:td.polygon([((cx-10)*2,901*2),(cx*2,890*2),((cx+11)*2,900*2),(cx*2,911*2)],fill='white')
        elif i==5:
            td.rectangle(((cx-7)*2,893*2,(cx+7)*2,909*2),outline='white',width=3);td.line(((cx-10)*2,890*2,(cx+10)*2,890*2),fill='white',width=3)
        else:td.line(((cx-9)*2,904*2,cx*2,894*2,(cx+9)*2,904*2),fill='white',width=4)
        td.text((cx*2,915*2),label,font=ui,fill='white',anchor='mt')
    shifted_toolbar=Image.new('RGBA',SIZE)
    shifted_toolbar.paste(tb,(0,12))
    # 目标实体的下边缘为 y=942（半开边界），不覆盖任务栏第一个像素。
    shifted_toolbar.paste((0,0,0,0),(0,942*2,3200,2000))
    layers['toolbar-proxy']=shifted_toolbar
    base=Image.open(background).convert('RGBA')
    for name,layer in layers.items():
        layer.save(LAYERS/f'{name}.png');base=Image.alpha_composite(base,layer)
    base.convert('RGB').save(BUILD/'draft-master.png')
    base.convert('RGB').resize((1600,1000),Image.Resampling.LANCZOS).save(BUILD/'draft-preview.png')
    (DATA/'handwriting-centerlines.json').write_text(json.dumps({'description':'Original centerline handwriting, not font outlines; normalized glyph coordinates','glyphs':GLYPHS},ensure_ascii=False,indent=2),encoding='utf-8')
    scene={'stage':'direct-composited-draft-not-native','coordinate_space':[1600,1000],'render_scale':2,'background_sha256':before,'strokes':STROKES,'shapes':SHAPES,'text_layout':TEXT,'cube_vertices':vertices,'midpoint_order':midpoints,'camera':{'type':'orthographic','normal':normal,'right':right,'up':up,'scale':29,'center':[1385,390]},'projected_cube':pts,'projected_section':section,'planar_section':hexpts,'toolbar':{'source':'draft proxy','locale':'en-US','tool':'soft-pen','mode':'drawing','color':'#FF1000','undo':True,'redo':False,'body_bounds':[487,886,1159.5,942],'anchor':{'edge':'body-bottom','target':'taskbar-top','target_y':942,'exclude_shadow_and_canvas':True}},'texture_brush':{'status':'future-demo-proxy-not-native-capability','base_color':'#F6F1E5','texture_origin':[1372,742],'texture_spacing':18,'overlap':'one global texture clipped to swept union mask'},'teaching':{'central_only':True,'stages':['coordinates','edge substitution','length squares','equilateral and60deg','six triangle area','distance to intercept','big minus3small','expansion','substitution and max']}}
    scene['layer_order']=list(layers)
    (DATA/'draft-scene.json').write_text(json.dumps(scene,ensure_ascii=False,indent=2),encoding='utf-8')
    assert before==hashlib.sha256(background.read_bytes()).hexdigest()
    cross=(right[1]*up[2]-right[2]*up[1],right[2]*up[0]-right[0]*up[2],right[0]*up[1]-right[1]*up[0])
    assert all(abs(a-b)<1e-12 for a,b in zip(cross,normal))
    assert abs(sum(a*b for a,b in zip(right,up)))<1e-12
    assert abs(sum(v*v for v in right)-1)<1e-12 and abs(sum(v*v for v in up)-1)<1e-12
    assert all(sum(p)==9 for p in midpoints.values())
    lengths=[math.dist(list(midpoints.values())[i],list(midpoints.values())[(i+1)%6]) for i in range(6)]
    assert all(abs(v-3*math.sqrt(2))<1e-9 for v in lengths)
    assert all(all(239<x<1585 and 139<y<941 for x,y,t in s['samples']) for s in STROKES)
    assert all(shape['kind'] != 'polygon' for shape in SHAPES)
    assert high.getchannel('A').getextrema()[1] > 90
    assert dots.getchannel('A').getextrema()[1] == 125
    assert ImageChops.multiply(dots.getchannel('A'),ImageChops.invert(mask)).getbbox() is None
    assert shifted_toolbar.getbbox()[3] == 942*2
    assert shifted_toolbar.crop((0,942*2,3200,2000)).getbbox() is None
    assert all(all(b[2]>=a[2] for a,b in zip(s['samples'],s['samples'][1:])) for s in STROKES)
    print(f'PASS: frozen background; {len(STROKES)} timed strokes; {len(SHAPES)} outline shapes; exact geometry; real highlight overlap; single-phase masked texture; toolbar body bottom y942; no taskbar occlusion.')


if __name__=='__main__':
    make()
