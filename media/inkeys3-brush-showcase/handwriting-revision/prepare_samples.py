"""V2 natural routes and word gestures, compared with the preserved V1 regular strategy."""
from pathlib import Path
import types, json, math, hashlib
from collections import defaultdict
from natural_paths import VARIANTS, BY, SYMMETRY, L, C
ROOT=Path(__file__).resolve().parent
DATA=ROOT/'data'
ARCHIVE=ROOT/'build/v1/authoring'
base=types.ModuleType('preserved_v1');base.__file__=str(ARCHIVE/'prepare_samples.py')
exec(compile((ARCHIVE/'prepare_samples.py').read_text(encoding='utf-8'),base.__file__,'exec'),base.__dict__)
HEIGHT=21.;WIDTH=1.995
NEW=[];OCCURRENCES=[];COUNTS=defaultdict(int);FRAME=None;WRITER=None;NOTE_GESTURES=[]

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def fingerprint(value):return hashlib.sha256(json.dumps(value,sort_keys=True).encode()).hexdigest()
def frame(x,y,angle):
    global FRAME
    FRAME=(x,y,math.radians(angle))

def author_stroke(spec,x,y,h,label,variant,group,tempo=165,hold=88,corner_hold=8,gap=64):
    points,corners=base.flatten(spec,x,y,h,slant=.082 if group.startswith('math') else .055)
    if FRAME:
        ox,oy,a=FRAME;ca,sa=math.cos(a),math.sin(a)
        points=[(ox+(px-ox)*ca-(py-oy)*sa,oy+(px-ox)*sa+(py-oy)*ca) for px,py in points]
    samples,motion=base.motion(points,corners,tempo)
    arrivals={e['sample_index']:e for e in motion['corner_events']}
    skip={i for k in arrivals for i in (k+1,k+2)}
    converted=[];events=[]
    for index,p in enumerate(samples):
        if index in skip:continue
        converted.append([p[0],p[1],len(converted)*8.])
        if index in arrivals:
            event=dict(arrivals[index],sample_index=len(converted)-1,time_ms=converted[-1][2],hold_ms=corner_hold)
            events.append(event)
            for _ in range(corner_hold//8):converted.append([p[0],p[1],len(converted)*8.])
    end=converted[-1][2]
    speeds=[math.dist(a[:2],b[:2])/.008 for a,b in zip(converted,converted[1:])]
    motion.update(corner_events=events,movement_duration_ms=end,pre_up_hold_ms=hold,up_time_ms=end+hold,
                  pen_up_gap_ms=gap,segment_speeds_dip_s=speeds)
    NEW.append({'tool':'soft','rgba':[255,16,0,255],'width':WIDTH*h/HEIGHT,'samples':converted,
                'sample_label':label,'variant':variant,'gesture_group':group,'path_spec':spec,
                'normalized_path_sha256':fingerprint(spec),'path_preview':points,'motion':motion,'frame':FRAME})

def text(content,x,y,h=HEIGHT,group='math'):
    for position,ch in enumerate(content):
        if ch==' ':x+=h*.38;continue
        options=VARIANTS.get(ch,[base.GLYPHS[ch]])
        occurrence=COUNTS[ch];variant=occurrence%len(options);COUNTS[ch]+=1
        paths=options[variant]
        start=len(NEW)
        phase=WRITER['phase'] if WRITER else position+occurrence
        tempo=(158,176,168,184)[phase%4]
        hold=(80,104,88,112,72,96)[phase%6]
        for si,spec in enumerate(paths):
            effective_group='math-note-'+WRITER['line'] if WRITER else group
            author_stroke(spec,x,y,h,content+':'+ch,variant,effective_group,tempo+si*5,hold,
                          corner_hold=(0,8,16)[(variant+si)%3],gap=48 if si+1<len(paths) else 72)
            if WRITER:
                NEW[-1]['writer_context']={'line':WRITER['line'],'token':WRITER['token'],'phase':WRITER['phase']}
                WRITER['phase']+=1
        xmax=max(max(p[0] for p in s['points']) if s['kind']=='polyline' else max([s['start'][0]]+[p[0] for seg in s['segments'] for p in seg]) for s in paths)
        OCCURRENCES.append({'char':ch,'occurrence':occurrence,'variant':variant,'origin':[x,y],'height':h,
                            'normalized_structure_sha256':fingerprint(paths),'stroke_range':[start,len(NEW)],
                            'structural_paths':paths,'gesture_group':group})
        # 数学运算符前后保留有意留白；字母对相邻更紧，摆脱等距字模排布。
        nextch=content[position+1] if position+1<len(content) else ''
        gap=.13 if ch in 'MN' and nextch in 'MN' else (.22 if ch in '=+' else .16)
        x+=(xmax+gap)*h
    return x

def root(n,x,y,h=HEIGHT):
    occurrence=COUNTS['root'];COUNTS['root']+=1
    end=text(str(n),x+.70*h,y,h)
    variant=occurrence%2
    vertices=[(.015,.60),(.18,.49),(.34,.95),(.60,-.045)] if variant==0 else [(.035,.61),(.14,.52),(.32,.98),(.64,-.015)]
    seg=[]
    for a,b in zip(vertices,vertices[1:]):seg.append((tuple(a[j]+(b[j]-a[j])/3 for j in (0,1)),tuple(a[j]+2*(b[j]-a[j])/3 for j in (0,1)),b))
    right=(end-x+2)/h
    seg.append(((.82,-.06),(right-.18,.005),(right,-.055 if variant==0 else .01)))
    spec=C(vertices[0],*seg)
    author_stroke(spec,x,y,h,'root',variant,'math',172 if variant==0 else 158,80 if variant==0 else 104,8,80)
    return end+7

def phrase(x,y):
    for i,spec in enumerate(BY):author_stroke(spec,x,y,HEIGHT,'by',0,'connected-by',180,88,0,112)
    for i,spec in enumerate(SYMMETRY):
        author_stroke(spec,x+2.10*HEIGHT,y-.2,HEIGHT,'symmetry',i,'connected-symmetry',186 if i<2 else 158,
                      (80,104,88)[i],0 if i<2 else 8,48 if i<2 else 112)
    OCCURRENCES.append({'char':'by symmetry','variant':'authored-connected-route','gesture_group':'whole-word-gestures',
                        'normalized_structure_sha256':fingerprint([BY,SYMMETRY]),'pen_lifts':3,'stroke_count':4})

def formula(tx,x,y):
    end=tx('MN',x,y);end=tx('2',end,y-7,12.6)+2
    end=tx('=3',end,y);end=tx('2',end,y-7,12.6)+2
    end=tx('+3',end,y);end=tx('2',end,y-7,12.6)+2;tx('=18',end,y)

def note_line(name,x,y,tokens):
    """一次连续讲解笔记：token之间延续动作相位，落位是作者节奏而非字库等距排版。"""
    global WRITER
    WRITER={'line':name,'phase':0,'token':0}
    placements=[]
    for content,gap,dy,height in tokens:
        x+=gap
        placements.append({'token':content,'origin':[x,y+dy],'height':height,'phase':WRITER['phase']})
        x=text(content,x,y+dy,height)
        WRITER['token']+=1
    NOTE_GESTURES.append({'line':name,'placements':placements,'phase_end':WRITER['phase']})
    WRITER=None

def main():
    DATA.mkdir(exist_ok=True)
    global FRAME
    base.NEW.clear()
    # V1对照也走hold-aware路径；区别为作者策略，不再拿旧legacy尾锋作对照。
    formula(base.new_text,80,190)
    base.new_text('OM=ON=MN',80,245)
    base.new_text('by symmetry',80,295)
    for content,y in [('3 3 3  2 2 2',430),('E E F F  M N M N',490),('0 0 6 6 7 7 s s',550)]:base.new_text(content,80,y)
    end=base.new_root(80,610);end=base.new_root(end+15,610);end=base.new_text('18',end+15,610);base.new_sqrt2(end,610)
    frame(665,190,.20)
    note_line('squared-distance',665,190,[
        ('MN',0,0,21.5),('2',1.0,-7.8,11.8),('=',4.0,3.0,18.4),
        ('3',2.8,-1.3,22.0),('2',1.5,-9.7,12.7),('+',5.0,3.4,18.2),
        ('3',3.1,2.2,20.5),('2',1.8,-5.4,11.5),('=',6.0,4.0,18.8),('18',3.2,.8,21.8)])
    frame(704,245,.45)
    note_line('equal-lengths',704,245,[('OM',0,0,20.8),('=',4,2.8,18.2),('ON',5,-2.2,21.6),('=',3,1.4,18.6),('MN',7,1.3,21.0)])
    frame(678,295,-.8);phrase(678,295)
    for content,y,x,angle in [('3 3 3  2 2 2',430,660,-.4),('E E F F  M N M N',490,662,.6),('0 0 6 6 7 7 s s',550,669,-.55)]:
        frame(x,y,angle);text(content,x,y)
    frame(665,610,.5);end=root(3,665,610);end=root(3,end+14,610);end=text('18',end+17,610);root(2,end,610)
    FRAME=None
    rows=[{'id':name,'old_origin':[80,y],'new_origin':[x,y],'height':HEIGHT} for name,y,x in [('formula',190,665),('equality',245,704),('phrase',295,678),('repeated-digits',430,660),('repeated-letters',490,662),('rounds',550,669),('roots',610,665)]]
    lines=['locale en-US','canvas 2400 1400','board FFFFFF 0','toolbar FF1000']
    for name,strokes in [('samples-old',base.NEW),('samples-new',NEW)]:
        lines.append(f'layer {name} dev')
        absolute=0
        for s in strokes:
            delay=s['motion']['pre_up_hold_ms'];samples=s['samples'];s['motion']['absolute_down_time_ms']=absolute
            absolute+=s['motion']['up_time_ms']+s['motion']['pen_up_gap_ms']
            lines.append(f"free_hold soft 255 16 0 255 {s['width']*2:.4f} {delay} {len(samples)}")
            lines.extend(f'{x*2:.6f} {y*2:.6f} {t:.4f}' for x,y,t in samples)
        lines.append('end')
    path=DATA/'native-scene.txt';path.write_text('\n'.join(lines)+'\n',encoding='utf-8')
    structure={ch:len({o['normalized_structure_sha256'] for o in OCCURRENCES if o['char']==ch}) for ch in ('3','2','E','F','M','N','0','7','s')}
    assert all(n>=2 for n in structure.values()),structure
    assert all(all(b[2]-a[2]==8 for a,b in zip(s['samples'],s['samples'][1:])) for s in NEW)
    assert all(70<=s['motion']['pre_up_hold_ms']<=120 for s in NEW)
    manifest={'version':'v2-natural','canvas':[2400,1400],'nominal_preview_height':21,'base_width_preview':1.995,
              'input_sha256':sha(path),'rows':rows,'old_strokes':base.NEW,'new_strokes':NEW,'occurrences':OCCURRENCES,
              'structural_variant_counts':structure,'gesture_summary':{'by':1,'symmetry':3,'phrase_pen_lifts':3},'note_gestures':NOTE_GESTURES,
              'comparison':'V1 regular single-template authoring versus V2 structural route variants/contextual gait/whole-word gestures; BOTH use hold-aware production adapter and55ms taper',
              'v1_generator_sha256':sha(ARCHIVE/'prepare_samples.py'),'new_paths_sha256':sha(ROOT/'natural_paths.py')}
    (DATA/'sample-input-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    (DATA/'glyphs.json').write_text(json.dumps({'variants':VARIANTS,'connected_by':BY,'connected_symmetry':SYMMETRY},ensure_ascii=False,indent=2),encoding='utf-8')
    print('PASS V2 native input',len(base.NEW),'V1hold strokes /',len(NEW),'natural strokes')
    print('Structural variants (not affine copies):',structure)
    print('SHA256',sha(path))

if __name__=='__main__':main()
