"""冻结草稿中心线转换为原生离屏输入；激光加强为围圈与反复涂划，不生成面填充。"""
from pathlib import Path
import hashlib
import json
import math

ROOT=Path(__file__).resolve().parent
DATA=ROOT/'data'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sampled(points,speed=.65):
    out=[];time=0
    for a,b in zip(points,points[1:]):
        distance=math.dist(a,b)
        count=max(2,math.ceil(distance/2))
        for i in range(count):
            f=i/count
            out.append([a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,time+distance*f/speed])
        time+=distance/speed
    out.append([*points[-1],time])
    return out


def laser_paths(scene):
    m=scene['planar_section']['M'];n=scene['planar_section']['N'];o=(1372.,742.)
    # 围住三角形后反复折返扫内部；60°蓝字区域留出读字窗口。
    border=[o,(1329.2,766.5),m,(1329.5,816),n,(1381,790),o]
    paths=[sampled(border,.7)]
    segments=[]
    protected=(1335,771,1377,799)
    for row,y in enumerate(range(753,834,5)):
        left=1372-(y-742)*math.sqrt(3) if y<=791 else m[0]+(y-791)*math.sqrt(3)
        right=1368
        left+=5
        if protected[1]<=y<=protected[3]:right=min(right,protected[0]-4)
        if right-left<8:continue
        a=(left,y);b=(right,y+(.8 if row%2 else -.8))
        segments.append((a,b) if row%2==0 else (b,a))
    # 每个来回段含微小弯曲，使用真实采样时序，保留不同笔划的起收笔。
    for a,b in segments:
        mid=((a[0]+b[0])/2,(a[1]+b[1])/2+1.2)
        paths.append(sampled([a,mid,b],.9))
    # 第二次反向斜划强化重复涂写，而非规整的单向网格填充。
    for offset in (0,11,22):
        points=[(1305+offset,786),(1330+offset*.65,807),(1355+offset*.25,822)]
        paths.append(sampled(points,.8))
    return paths,protected


def main():
    path=DATA/'draft-scene.json'
    original=sha(path)
    scene=json.loads(path.read_text(encoding='utf-8'))
    lines=['locale en-US','canvas 3200 2000','board F6F1E5 1','toolbar FF1000']
    counts={}
    def free(stroke,tool):
        samples=stroke['samples']
        lines.append('free '+tool+' '+' '.join(map(str,stroke['rgba']))+f" {stroke['width']*2:.4f} {len(samples)}")
        lines.extend(f'{x*2:.4f} {y*2:.4f} {t:.4f}' for x,y,t in samples)
    for layer,source_tool,native_tool in [('ink-highlight','highlighter','highlighter'),('ink-brush','textured-flat-brush-demo','flat'),('ink-handwriting','soft','soft')]:
        lines.append(f'layer {layer} dev')
        items=[s for s in scene['strokes'] if s['tool']==source_tool]
        counts[layer]=len(items)
        for item in items:free(item,native_tool)
        lines.append('end')
    paths,protected=laser_paths(scene)
    lines.append('layer ink-laser dev')
    for samples in paths:
        lines.append(f'laser {len(samples)}')
        lines.extend(f'{x*2:.4f} {y*2:.4f} {t:.4f}' for x,y,t in samples)
    lines.append('end');counts['ink-laser']=len(paths)
    lines.append('layer geometry shape')
    for shape in scene['shapes']:
        assert shape['kind']=='line','No polygon fills in production scene'
        rgba=shape['rgba'];color=''.join(f'{v:02X}' for v in rgba[:3])
        coords=' '.join(f'{v*2:.4f}' for point in shape['points'] for v in point)
        lines.append(f"shape line {color} {shape['width']*2:.4f} {int(shape['dashed'])} {coords}")
    # 点标记也来自生产图形路径；小椭圆只有描边，没有隐藏面填充。
    for x,y in scene['projected_section'].values():
        lines.append(f'shape ellipse FF1000 2.2 0 {(x-1.25)*2:.4f} {(y-1.25)*2:.4f} {(x+1.25)*2:.4f} {(y+1.25)*2:.4f}')
    lines.append('shape ellipse 224C89 2.0 0 2767.5 777.5 2772.5 782.5')
    lines.append('end');counts['geometry']=len(scene['shapes'])+7
    output=DATA/'native-scene.txt'
    output.write_text('\n'.join(lines)+'\n',encoding='utf-8')
    manifest={'input':output.name,'input_sha256':sha(output),'draft_scene_sha256':original,
              'background_sha256':sha(ROOT/'build/background-master.png'),'canvas':[3200,2000],
              'units':'master pixels; input t is milliseconds preserved from approved handwriting',
              'layers':counts,'laser':{'intent':'border plus repeated interior scribbles of triangle O-M-N','paths_preview_coordinates':paths,'protected_label_rect':protected,'flat_fill':False},
              'toolbar':scene['toolbar'],'texture_brush':scene['texture_brush'],
              'geometry':'production shape line/ellipse factory only, no filled polygons'}
    (DATA/'native-input-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    assert sha(path)==original
    assert all(all(b[2]>=a[2] for a,b in zip(points,points[1:])) for points in paths)
    print('PASS native input prepared:',counts)


if __name__=='__main__':main()
