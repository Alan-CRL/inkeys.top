"""V3字形方向草稿：直接绘制中心线，不调用原生渲染器，不改V2或整图。"""
from pathlib import Path
from collections import defaultdict
import hashlib,json,math,types
from PIL import Image,ImageDraw,ImageFont
from math_paths import GLYPHS,radical_route
from english_paths import WORDS,WORD_WIDTHS

ROOT=Path(__file__).resolve().parent
BUILD=ROOT/'build';DATA=ROOT/'data'
SCALE=2;SIZE=(2080,2840);RED=(228,30,34,255)
COUNTS=defaultdict(int);STROKES=[];OCCURRENCES=[];ROOTS=[]
FRAME=None
base=types.ModuleType('v1_motion_readonly')
base.__file__=str(ROOT.parent/'build/v1/authoring/prepare_samples.py')
exec(compile(Path(base.__file__).read_text(encoding='utf-8'),base.__file__,'exec'),base.__dict__)


def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def digest(value):return hashlib.sha256(json.dumps(value,sort_keys=True).encode()).hexdigest()


def frame(x,y,degrees):
    global FRAME
    FRAME=(x,y,math.radians(degrees))


def paint(im,points,width,color=RED):
    """统一的轻微笔宽变化只用于草稿可读性；不冒充产品软笔效果。"""
    d=ImageDraw.Draw(im)
    distance=[0.]
    for a,b in zip(points,points[1:]):distance.append(distance[-1]+math.dist(a,b))
    total=distance[-1] or 1
    for i,(a,b) in enumerate(zip(points,points[1:]),1):
        u=distance[i]/total
        w=width*(.86+.14*math.sin(math.pi*u))
        ax,ay=a;bx,by=b
        dx,dy=bx-ax,by-ay;length=math.hypot(dx,dy) or 1
        nx,ny=-dy/length*w/2,dx/length*w/2
        d.polygon([((ax+nx)*2,(ay+ny)*2),((bx+nx)*2,(by+ny)*2),((bx-nx)*2,(by-ny)*2),((ax-nx)*2,(ay-ny)*2)],fill=color)
        radius=w
        d.ellipse((bx*2-radius,by*2-radius,bx*2+radius,by*2+radius),fill=color)


def path(im,spec,x,y,h,label,variant,group='math'):
    points,corners=base.flatten(spec,x,y,h,slant=.055 if group=='math' else .045)
    if FRAME:
        ox,oy,a=FRAME;ca,sa=math.cos(a),math.sin(a)
        points=[(ox+(px-ox)*ca-(py-oy)*sa,oy+(px-ox)*sa+(py-oy)*ca) for px,py in points]
    paint(im,points,h*.105)
    samples,motion=base.motion(points,corners,175 if group=='math' else 186)
    motion['pre_up_hold_ms']=88;motion['up_time_ms']=motion['movement_duration_ms']+88
    STROKES.append({'label':label,'variant':variant,'group':group,'path_spec':spec,'normalized_sha256':digest(spec),
                    'origin':[x,y],'height':h,'frame':FRAME,'width':h*.105,'points':points,'samples':samples,'motion':motion})


def text(im,value,x,y,h=32,variants=None):
    for index,ch in enumerate(value):
        if ch==' ':x+=h*.34;continue
        options=GLYPHS[ch]
        variant=(variants[index] if variants is not None else COUNTS[ch])%len(options)
        COUNTS[ch]+=1;specs=options[variant];start=len(STROKES)
        for spec in specs:path(im,spec,x,y,h,value+':'+ch,variant)
        OCCURRENCES.append({'char':ch,'variant':variant,'normalized_sha256':digest(specs),'origin':[x,y],
                            'height':h,'stroke_range':[start,len(STROKES)],'structural_paths':specs})
        maximum=max(max(p[0] for p in spec['points']) if spec['kind']=='polyline' else max([spec['start'][0]]+[p[0] for seg in spec['segments'] for p in seg]) for spec in specs)
        x+=(maximum+(.12 if ch in 'MN' else .16))*h
    return x


def root(im,n,x,y,h=32,variant=None):
    variant=COUNTS['root']%4 if variant is None else variant;COUNTS['root']+=1
    # 横画长度取实际被开方数字的落位，不把根号作为固定宽度字符盖上去。
    radicand_x=x+(.78,.88,.80,.76)[variant]*h
    end=text(im,str(n),radicand_x,y+.055*h,h)
    bar_end=(end-x)/h+.12
    spec=radical_route(variant,bar_end)
    path(im,spec,x,y,h,'root',variant)
    ROOTS.append({'variant':variant,'radicand':n,'origin':[x,y],'height':h,'radicand_x':radicand_x,
                  'radicand_end':end,'bar_end':x+bar_end*h,'path_spec':spec,'normalized_sha256':digest(spec)})
    return x+bar_end*h+7


def words(im,value,x,y,h=32):
    for word in value.split():
        for i,spec in enumerate(WORDS[word]):path(im,spec,x,y,h,word,i,'english-word')
        x+=(WORD_WIDTHS[word]+.45)*h
    return x


def formula(im,x,y,h=32):
    a=text(im,'MN',x,y,h)
    a=text(im,'2',a+1,y-.30*h,h*.57)
    a=text(im,'=',a+5,y+.06*h,h*.88)
    a=text(im,'3',a+2,y-.025*h,h*1.025)
    a=text(im,'2',a+1,y-.36*h,h*.58)
    a=text(im,'+',a+6,y+.08*h,h*.86)
    a=text(im,'3',a+3,y+.03*h,h*.97)
    a=text(im,'2',a+2,y-.24*h,h*.53)
    a=text(im,'=',a+7,y+.10*h,h*.87)
    return text(im,'18',a+3,y+.035*h,h)


def equal_lengths(im,x,y,h=32):
    a=text(im,'OM',x,y,h)
    a=text(im,'=',a+4,y+.10*h,h*.86)
    a=text(im,'ON',a+3,y-.06*h,h*1.02)
    a=text(im,'=',a+4,y+.06*h,h*.88)
    return text(im,'MN',a+6,y+.045*h,h*.98)


def caption(im,value,x,y,size=15,bold=False,color='#34404E'):
    font=ImageFont.truetype('C:/Windows/Fonts/msyhbd.ttc' if bold else 'C:/Windows/Fonts/msyh.ttc',round(size*2))
    ImageDraw.Draw(im).text((x*2,y*2),value,font=font,fill=color)


def crop(im,box,magnify):
    result=im.crop(tuple(round(v*2) for v in box))
    return result.resize((round(result.width*magnify),round(result.height*magnify)),Image.Resampling.NEAREST)


def main():
    BUILD.mkdir(parents=True,exist_ok=True);DATA.mkdir(exist_ok=True)
    im=Image.new('RGBA',SIZE,'#FAFAF8')
    caption(im,'板书手写草稿 · V3',36,27,28,True)
    caption(im,'直接绘制的字形方向草稿 · 尚未进行原生渲染',36,73,15,color='#935F25')
    caption(im,'课堂短笔记',36,121,20,True)
    frame(83,180,-.35);formula(im,83,180)
    frame(98,250,.40);equal_lengths(im,98,250)
    frame(87,320,-.65);words(im,'by symmetry',87,320)
    frame(85,392,.25);a=words(im,'hence',85,392);a=text(im,'MN=3',a+8,392);root(im,2,a+3,392,32,0)
    frame(87,465,-.25);words(im,'therefore the section is regular',87,465)
    frame(88,541,-.20);a=text(im,'P=18',88,541,30);root(im,2,a+2,541,30,1)
    frame(413,541,.2);text(im,'∠MON=60°',413,541,27)
    frame(711,541,-.3);text(im,'∠SMN=120°',711,541,27)
    caption(im,'实际使用尺寸检查 · 基准字高 21 px',36,593,12,color='#6C7580')
    frame(83,623,-.20);formula(im,83,623,21)
    frame(539,623,.2);a=root(im,3,539,623,21,2);root(im,3,a+21,623,21,3)
    d=ImageDraw.Draw(im);d.line((36*2,673*2,1004*2,673*2),fill='#DDE1E4',width=2)
    caption(im,'重复写法检查',36,692,20,True)
    frame(83,744,-.2);text(im,'3 3 3',83,744,30)
    frame(358,744,.4);text(im,'2 2 2',358,744,30)
    frame(83,812,.35);text(im,'E E F F',83,812,30)
    frame(407,812,-.45);text(im,'M N M N',407,812,30)
    frame(83,879,-.35);text(im,'0 0 6 6 7 7 s s 8 8',83,879,29)
    frame(82,954,.1);root(im,3,82,954,31,0)
    frame(287,954,-.2);root(im,3,287,954,31,1)
    frame(489,954,.3);a=text(im,'18',489,954,31);root(im,2,a+3,954,31,2)
    frame(757,954,-.3);a=text(im,'3',757,954,31);root(im,2,a+3,954,31,3)
    # 放大区只能裁切已经绘好的像素；不另写一组更漂亮的替身。
    snapshot=im.copy()
    d=ImageDraw.Draw(im);d.line((36*2,1024*2,1004*2,1024*2),fill='#DDE1E4',width=2)
    caption(im,'局部观察 · 放大已完成草稿像素',36,1044,20,True)
    caption(im,'数字内部路线 · 2×',36,1085,13,color='#6C7580')
    im.alpha_composite(crop(snapshot,(75,733,221,788),2),(36*2,1112*2))
    caption(im,'大写笔势 · 2×',365,1085,13,color='#6C7580')
    im.alpha_composite(crop(snapshot,(76,800,206,851),2),(365*2,1112*2))
    caption(im,'根号连续转折 · 3×',702,1085,13,color='#6C7580')
    im.alpha_composite(crop(snapshot,(77,938,169,998),3),(702*2,1112*2))
    caption(im,'重点：根号整体动作、重复字符内部变化、清楚但不刻板的教师板书。',36,1359,14,color='#6C7580')
    master=im.convert('RGB');master.save(BUILD/'handwriting-v3-draft-master.png')
    master.resize((1040,1420),Image.Resampling.LANCZOS).save(BUILD/'handwriting-v3-draft-preview.png')
    for name,box in [('numbers',(70,730,640,790)),('capitals',(70,799,700,856)),('roots',(65,932,951,1004)),('notes',(65,159,1008,582))]:
        crop(snapshot,box,2).convert('RGB').save(BUILD/f'detail-{name}.png')
    structure={ch:len({o['normalized_sha256'] for o in OCCURRENCES if o['char']==ch}) for ch in ('3','2','0','6','7','8','E','F','M','N','O')}
    assert all(count>=2 for count in structure.values()),structure
    assert len({r['variant'] for r in ROOTS})==4
    assert all(r['bar_end']>r['radicand_end'] for r in ROOTS)
    assert all(all(b[2]-a[2]==8 for a,b in zip(s['samples'],s['samples'][1:])) for s in STROKES)
    manifest={'stage':'direct-rendered-draft-NOT-native','canvas':SIZE,'scale':2,'point_coordinate_space':[1040,1420],
              'input_time_unit':'milliseconds','strokes':STROKES,'occurrences':OCCURRENCES,
              'roots':ROOTS,'structural_variant_counts':structure,'math_angles':{'MON':60,'SMN':120},
              'sources':{'math_paths.py':sha(ROOT/'math_paths.py'),'english_paths.py':sha(ROOT/'english_paths.py')},
              'master_sha256':sha(BUILD/'handwriting-v3-draft-master.png')}
    (DATA/'draft-scene.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    print('PASS direct draft, no native invocation;',len(STROKES),'native-ready8ms paths;',structure)
    print('MASTER',manifest['master_sha256'])


if __name__=='__main__':main()
