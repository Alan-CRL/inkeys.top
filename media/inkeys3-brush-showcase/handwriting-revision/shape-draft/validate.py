"""独立从立方体棱与平面求交，检验构造、点阵、冻结来源和像素边界。"""
from pathlib import Path
import itertools, json, math, hashlib
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
MEDIA = ROOT.parent.parent
REPO = MEDIA.parent.parent
TASK = REPO/'.trellis/tasks/10-30-brush-showcase-handwriting-revision'

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def area(points):
    center = np.mean(points,axis=0)
    u = np.array([1,-1,0])/math.sqrt(2)
    v = np.array([1,1,-2])/math.sqrt(6)
    ordered = sorted(points,key=lambda p:math.atan2(np.dot(p-center,v),np.dot(p-center,u)))
    return np.linalg.norm(sum((np.cross(a,b) for a,b in zip(ordered,ordered[1:]+ordered[:1])),np.zeros(3)))/2, ordered

def main():
    scene = json.loads((ROOT/'data/scene.json').read_text(encoding='utf-8'))
    results = []
    vertices = list(itertools.product([0,6],repeat=3))
    edges = [(np.array(a,float),np.array(b,float)) for a,b in itertools.combinations(vertices,2) if sum(x!=y for x,y in zip(a,b))==1]
    for k in [9.2,10,11.5]:
        cuts = []
        for a,b in edges:
            t = (k-sum(a))/sum(b-a)
            if 0<=t<=1:
                cuts.append(a+t*(b-a))
        actual,ordered = area(cuts)
        expected = math.sqrt(3)/2*(k*k-3*(k-6)**2)
        d = (k-9)/math.sqrt(3)
        assert len(cuts)==6 and math.isclose(actual,expected,abs_tol=1e-9)
        assert math.isclose(actual,27*math.sqrt(3)-3*math.sqrt(3)*d*d,abs_tol=1e-9)
        lengths = [np.linalg.norm(a-b) for a,b in zip(ordered,ordered[1:]+ordered[:1])]
        assert all(math.isclose(lengths[i],lengths[(i+2)%6],abs_tol=1e-9) for i in range(6))
        assert not math.isclose(lengths[0],lengths[1])
        if k==10:
            assert {tuple(p) for p in cuts}=={tuple(p) for p in scene['lower']['hexagon_3d']}
        results.append({'k':k,'intersection_area':actual,'big_minus_three_small':expected,'alternating_sides':lengths})
    lattice = scene['lattice']
    matrix = np.array(lattice['basis']).T
    for p in scene['lower']['triangle_2d']+scene['lower']['hexagon_2d']+[scene['camera']['center']]:
        uv = np.linalg.solve(matrix,np.array(p)-lattice['origin'])
        assert np.allclose(uv,np.round(uv),atol=1e-8)
    cam = scene['camera']
    basis = np.array([cam['right'],cam['up'],cam['normal']])
    assert np.allclose(basis@basis.T,np.eye(3),atol=1e-9)
    assert all(sum(p)==9 for p in scene['midpoints'].values())
    mids = list(scene['midpoints'].values())
    assert all(math.isclose(math.dist(a,b),3*math.sqrt(2)) for a,b in zip(mids,mids[1:]+mids[:1]))
    hidden = [s for s in scene['shapes'] if s['role']=='cube-edge' and s['dashed']]
    assert len(hidden)==3 and all(s['points'][0]==scene['projected_cube']['A'] for s in hidden)
    assert len(scene['laser_loops'])==2
    assert all(s['points'][0]==s['points'][-1] and s['fill'] is None and 4<=s['width']<=5 for s in scene['laser_loops'])
    assert all(s['fill'] is None for s in scene['shapes'])
    # 排版框两两相交会报告，图线和标签的接近关系另由实际像素复核。
    overlaps = []
    for a,b in itertools.combinations(scene['labels'],2):
        x1,y1,x2,y2 = a['bbox'];u1,v1,u2,v2 = b['bbox']
        if min(x2,u2)>max(x1,u1) and min(y2,v2)>max(y1,v1):
            overlaps.append([a['text'],b['text']])
    assert not overlaps,overlaps
    base = np.array(Image.open(MEDIA/'build/background-master.png').convert('RGB'))
    final = np.array(Image.open(ROOT/'build/context-master.png').convert('RGB'))
    changed = np.any(base!=final,axis=2)
    allowed = np.zeros(changed.shape,bool)
    allowed[400:1870,2360:3160] = True
    assert not np.any(changed & ~allowed)
    assert not np.any(changed[1884:])
    freeze_counts = {}
    for filename,basepath in [('frozen-original.json',MEDIA),('frozen-v2.json',ROOT.parent),('frozen-approved-v3.json',ROOT.parent/'v3')]:
        frozen = json.loads((TASK/filename).read_text(encoding='utf-8-sig'))
        for relative,digest in frozen.items():
            assert sha(basepath/relative)==digest,(filename,relative)
        freeze_counts[filename] = len(frozen)
    for relative,digest in scene['sources'].items():
        assert sha(REPO/relative)==digest,relative
    report = {'status':'PASS','geometry':results,'lattice_nodes':'PASS','orthographic_and_hidden_edges':'PASS','closed_laser_loops':2,'face_fills':0,'label_bbox_overlaps':overlaps,'unchanged_outside_right_field':True,'unchanged_taskbar':True,'frozen_files':freeze_counts,'visual_review':'Inspect context-preview.png and right-detail.png; direct draft only, approval pending.'}
    (ROOT/'data/validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False))

if __name__=='__main__':
    main()
