"""检查最终输入的真实时间序列、批准几何一致性及源文件绑定。"""
from pathlib import Path
import json,hashlib,math
ROOT=Path(__file__).resolve().parent
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
    scene=json.loads((ROOT/'data/scene.json').read_text(encoding='utf-8'))
    approved=json.loads((ROOT.parent/'shape-draft/data/scene.json').read_text(encoding='utf-8'))
    assert scene['approved_geometry']==approved
    strokes=scene['handwriting'];speeds=[]
    for stroke in strokes:
        samples=stroke['samples']
        assert len(samples)>1
        for a,b in zip(samples,samples[1:]):
            assert abs(b[2]-a[2]-8)<1e-7
            speeds.append(math.dist(a[:2],b[:2])/0.008)
        assert stroke['motion']['pre_up_hold_ms']==88
        assert all(math.isfinite(value) for p in samples for value in p)
    loops=scene['laser_loops'];assert len(loops)==1
    laser=loops[0];assert laser['fill'] is None and not laser['closed']
    triangle=approved['lower']['removed_triangles_2d'][2]
    a,b=triangle[0],triangle[2];dx,dy=b[0]-a[0],b[1]-a[1];length=math.dist(a,b)
    assert laser['edge']==[a,b] and laser['edge_fraction']==[.25,.75]
    assert laser['native_scale']==.60 and laser['width']==3.0
    pts=laser['points'];arc_length=sum(math.dist(a,b) for a,b in zip(pts,pts[1:]))
    assert 59<math.dist(pts[0],pts[-1])<61 and 60<arc_length<61
    for x,y in pts:
        t=((x-a[0])*dx+(y-a[1])*dy)/length**2
        offset=((x-a[0])*dy-(y-a[1])*dx)/length
        assert .249<t<.751 and 1.49<offset<3.51
    # 原生光晕也须避开尺寸文字与顶点标号。
    clearances={}
    for label in approved['labels']:
        if label['text'] not in ['Z','(k-6)sqrt2']:continue
        marker_points=[p for stroke in approved['handwriting'][slice(*label['strokes'])] for p in stroke['points']]
        clearances[label['text']]=min(math.dist(a,b) for a in pts for b in marker_points)
    assert min(clearances.values())>15
    before=json.loads((ROOT/'build/before-subtle-laser/data/scene.json').read_text(encoding='utf-8'))
    assert scene['layout']==before['layout'] and strokes==before['handwriting']
    assert all(s['fill'] is None for s in approved['shapes'])
    # 数学检验由独立三角形面积与截面公式交叉计算。
    k=approved['lower']['k'];d=(k-9)/math.sqrt(3)
    area=math.sqrt(3)/4*((k*math.sqrt(2))**2-3*((k-6)*math.sqrt(2))**2)
    assert math.isclose(area,27*math.sqrt(3)-3*math.sqrt(3)*d*d)
    bindings=json.loads((ROOT/'data/authoring-provenance.json').read_text())
    assert all(sha(Path(path))==digest for path,digest in bindings.items())
    report={'stroke_count':len(strokes),'fixed_sample_ms':8,'pre_up_hold_ms':88,'speed_preview_px_per_s':[min(speeds),max(speeds)],'geometry_exact_approved':True,'label_clearance_px':clearances,'single_lower_short_arc':True,'laser_arc_length_px':arc_length,'glyphs_and_layout_unchanged':True,'no_geometry_face_fill':True,'k10_area':area,'authoring_bindings_match':True,'note':'Production thickness and toolbar visibility require final native pixel review.'}
    (ROOT/'build/scene-validation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report))
if __name__=='__main__':main()
