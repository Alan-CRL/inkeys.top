"""只合成真实原生图层；缺失导出时直接失败，不使用草稿主栏/墨迹后备。"""
from pathlib import Path
import hashlib
import json

from PIL import Image, ImageChops

ROOT=Path(__file__).resolve().parent
BUILD=ROOT/'build'
NATIVE=ROOT/'sources'
SIZE=(3200,2000)
TASKBAR_TOP=1884


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_layer(name):
    path=NATIVE/name
    if not path.is_file():
        raise FileNotFoundError(f'Native export required, no draft fallback: {path}')
    layer=Image.open(path).convert('RGBA')
    if name!='toolbar.png' and layer.size!=SIZE:
        raise ValueError(f'Native layer {name} must be full canvas {SIZE}, got {layer.size}')
    return layer


def clip_content(layer):
    # 阅读区外是已确认的浏览器/侧栏/任务栏；保留原像素，不允许光晕越界。
    clipped=Image.new('RGBA',SIZE)
    region=(478,278,3170,TASKBAR_TOP)
    clipped.paste(layer.crop(region),region[:2])
    return clipped


def verify_capture(kind,input_hash,required_layers,required_metadata):
    """把输出像素绑定到本次输入、实际运行二进制、适配源和成功导出日志。"""
    manifest=json.loads((NATIVE/f'provenance-{kind}.json').read_text(encoding='utf-8'))
    assert manifest['input_sha256']==input_hash,f'Stale {kind} native input'
    assert manifest['failures']==0,f'{kind} export failures'
    executable=Path(manifest['executable_path'])
    assert sha(executable)==manifest['executable_sha256'],f'{kind} executable identity changed'
    assert 'INKEYS_HERO_OUTPUT'.encode('utf-16le') in executable.read_bytes()
    compiled=manifest['compiled_build']
    assert compiled['executable_sha256']==manifest['executable_sha256']
    assert compiled['adapters']==manifest['adapters']
    assert sha(BUILD/f'native-build-{kind}.log')==compiled['build_log_sha256']
    assert manifest['adapters'],f'{kind} adapter provenance missing'
    for filename,digest in manifest['adapters'].items():
        assert sha(ROOT/'native'/filename)==digest,f'{kind} adapter changed: {filename}'
    for filename in required_layers:
        assert sha(NATIVE/filename)==manifest['layers'][filename],f'{kind} layer changed: {filename}'
    for filename in required_metadata:
        assert sha(NATIVE/filename)==manifest['metadata'][filename],f'{kind} metadata changed: {filename}'
    log=NATIVE/f'export-{kind}.log'
    assert sha(log)==manifest['export_log_sha256'],f'{kind} export log changed'
    assert log.read_text(encoding='utf-8').rstrip().endswith('failures=0'),f'{kind} unsuccessful export log'
    return manifest


def main():
    input_manifest=json.loads((ROOT/'data/native-input-manifest.json').read_text(encoding='utf-8'))
    authoring=json.loads((ROOT/'data/authoring-provenance.json').read_text(encoding='utf-8'))
    for filename,digest in authoring.items():
        assert sha(Path(filename))==digest,f'Authoring source changed: {filename}'
    background=ROOT.parent.parent/'build/background-master.png'
    assert sha(background)==input_manifest['background_sha256']
    assert sha(ROOT/'data/native-scene.txt')==input_manifest['input_sha256']
    verify_capture('dev',input_manifest['input_sha256'],
        ['ink-highlight.png','ink-brush.png','ink-handwriting.png','pattern.png','toolbar.png'],
        ['toolbar-body.json','toolbar-state.json','pattern.json'])
    verify_capture('shape',input_manifest['input_sha256'],['geometry.png'],[])
    base=Image.open(background).convert('RGBA')
    used={}
    def layer(name):
        result=read_layer(name)
        used[name]=sha(NATIVE/name)
        return result
    high=layer('ink-highlight.png')
    brush=layer('ink-brush.png')
    pattern=layer('pattern.png')
    geometry=layer('geometry.png')
    handwriting=layer('ink-handwriting.png')
    # 按要求排除激光；历史原生捕获保留，但不读取或消费该图层。
    # 原生 D2D 三角点阵原型像素仅按原生平头刷 coverage 裁切一次；未来纹理刷演示合成。
    # 平移只对齐点阵全局相位，不重绘点阵；最终仅保留一份原生刷子 coverage。
    pattern_metadata=json.loads((NATIVE/'pattern.json').read_text(encoding='utf-8'))
    desired=(2780,1250)
    assert tuple(pattern_metadata['source_origin'])==desired
    assert pattern_metadata['spacing']==40 and pattern_metadata['radius']==2
    assert abs(pattern_metadata['row_height']-20*3**.5)<.001
    shift=[0,0]
    shifted_pattern=pattern
    # 末次扫笔在批准的纸面边界截止，保护底部任务栏。
    brush.paste((0,0,0,0),(0,1870,3200,2000))
    opaque_brush=brush.copy();opaque_brush.putalpha(255)
    textured=Image.alpha_composite(opaque_brush,shifted_pattern)
    textured.putalpha(brush.getchannel('A'))
    for asset in (high,textured,geometry,handwriting):
        base=Image.alpha_composite(base,clip_content(asset))

    toolbar=layer('toolbar.png')
    body_path=NATIVE/'toolbar-body.json'
    metadata=json.loads(body_path.read_text(encoding='utf-8'))
    left,top,right,bottom=map(float,metadata['body_rect'])
    assert 0<=left<right<=toolbar.width and 0<=top<bottom<=toolbar.height
    assert metadata.get('locale')=='en-US'
    state=json.loads((NATIVE/'toolbar-state.json').read_text(encoding='utf-8'))
    assert state.get('select_clickthrough_mode')==0
    assert state['undo'] is True and state['redo'] is False
    visible=[button['label'] for button in state['buttons'] if button['visible']]
    normalized=[''.join(label.split()).lower() for label in visible]
    assert visible and not any('select(clear)' in label or 'click-through' in label for label in normalized)
    assert metadata.get('pen')=='soft' and metadata.get('mode')=='drawing'
    assert metadata.get('pen_rgb')=='FF1000' and metadata.get('undo') is True and metadata.get('redo') is False
    # 用实体宽/高计算单一缩放；英文本地化更宽时优先不侵占已确认的笔记高度。
    target_width=1345.0;target_height=112.0;target_center=1646.5
    scale=min(target_width/(right-left),target_height/(bottom-top))
    tx=target_center-(left+right)*.5*scale
    ty=TASKBAR_TOP-bottom*scale
    placed=toolbar.transform(SIZE,Image.Transform.AFFINE,
        (1/scale,0,-tx/scale,0,1/scale,-ty/scale),Image.Resampling.BICUBIC)
    placed.paste((0,0,0,0),(0,TASKBAR_TOP,SIZE[0],SIZE[1]))
    base=Image.alpha_composite(base,placed)
    final=base.convert('RGB')
    final.save(BUILD/'final-no-laser-master.png')
    final.save(BUILD/'final-master.png')
    final.resize((1600,1000),Image.Resampling.LANCZOS).save(BUILD/'final-preview.png')
    final.resize((1600,1000),Image.Resampling.LANCZOS).save(BUILD/'final-no-laser-preview.png')
    (BUILD/'final-qa').mkdir(exist_ok=True)
    textured.save(BUILD/'final-qa/textured-native-brush.png')
    placed.save(BUILD/'final-qa/positioned-native-toolbar.png')
    final.crop((2440,420,3110,1820)).save(BUILD/'final-qa/geometry-laser.png')
    final.crop((1000,1200,2370,1884)).save(BUILD/'final-qa/handwriting-toolbar.png')
    source=Image.open(background).convert('RGB')
    assert ImageChops.difference(source.crop((0,TASKBAR_TOP,3200,2000)),final.crop((0,TASKBAR_TOP,3200,2000))).getbbox() is None
    assert ImageChops.difference(source.crop((0,0,3200,278)),final.crop((0,0,3200,278))).getbbox() is None
    assert ImageChops.difference(source.crop((0,278,478,1884)),final.crop((0,278,478,1884))).getbbox() is None
    target_body=[left*scale+tx,top*scale+ty,right*scale+tx,bottom*scale+ty]
    assert abs(target_body[3]-TASKBAR_TOP)<1e-9
    provenance={p.name:sha(p) for p in sorted(NATIVE.glob('*provenance*')) if p.is_file()}
    report={'native_input_sha256':input_manifest['input_sha256'],'background_sha256':sha(background),
            'native_layer_sha256':used,'native_provenance_files':provenance,
            'excluded_layers':{'ink-laser.png':'User requested removal; historical capture is not consumed'},
            'toolbar_metadata':metadata,'toolbar_actual_state':state,'toolbar_body_source':metadata['body_rect'],
            'toolbar_scale':scale,'toolbar_translation':[tx,ty],'toolbar_body_target':target_body,
            'native_pattern_metadata':pattern_metadata,'pattern_translation':shift,'pattern_target_origin':desired,
            'body_anchor':'solid-body bottom=1884; exclude shadow and transparent canvas',
            'pattern_composition':'native D2D triangular pattern prototype masked once by production flat brush alpha; future texture-brush demonstration, not an existing brush mode',
            'draft_proxy_used':False,'taskbar_and_browser_preserved':True,
            'final_sha256':sha(BUILD/'final-master.png')}
    (BUILD/'final-validation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print('PASS: native-only composition, exact body bottom1884; taskbar/browser/sidebar unchanged.')
    print('Native toolbar target body:',target_body)


if __name__=='__main__':main()
