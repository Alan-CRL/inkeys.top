"""真实Draw3旧/新输入对照板；标题可排版，墨迹只来自已绑定的原生PNG。"""
from pathlib import Path
import csv
import hashlib
import json
import statistics
import math

from PIL import Image,ImageDraw,ImageFont

ROOT=Path(__file__).resolve().parent
SOURCES=ROOT/'sources'
BUILD=ROOT/'build'


def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()


def verify():
    inputs=json.loads((ROOT/'data/sample-input-manifest.json').read_text(encoding='utf-8'))
    provenance=json.loads((SOURCES/'provenance-dev.json').read_text(encoding='utf-8'))
    assert inputs['input_sha256']==sha(ROOT/'data/native-scene.txt')==provenance['input_sha256']
    assert provenance['failures']==0
    assert sha(Path(provenance['executable_path']))==provenance['executable_sha256']
    for name,digest in provenance['adapters'].items():assert sha(ROOT/'native'/name)==digest
    for name in ['samples-old.png','samples-new.png']:
        assert sha(SOURCES/name)==provenance['layers'][name]
    for name in ['stroke-diagnostics.csv','stroke-geometry.csv']:
        assert sha(SOURCES/name)==provenance['metadata'][name]
    log=SOURCES/'export-dev.log'
    assert sha(log)==provenance['export_log_sha256']
    assert log.read_text(encoding='utf-8').rstrip().endswith('failures=0')
    return inputs,provenance


def native_crop(image,box,magnify=1):
    crop=image.crop(tuple(round(v*2) for v in box))
    # 放大保留真实导出像素，不增加平滑、描边或重绘字形。
    if magnify!=1:crop=crop.resize((crop.width*magnify,crop.height*magnify),Image.Resampling.NEAREST)
    return crop


def main():
    BUILD.mkdir(exist_ok=True)
    inputs,provenance=verify()
    old=Image.open(SOURCES/'samples-old.png').convert('RGBA')
    new=Image.open(SOURCES/'samples-new.png').convert('RGBA')
    assert old.size==new.size==(2400,1400)
    board=Image.new('RGBA',(2080,2210),'#FAFAF8');d=ImageDraw.Draw(board)
    def caption(value,x,y,size=14,color='#34404E',bold=False):
        font=ImageFont.truetype('C:/Windows/Fonts/msyhbd.ttc' if bold else 'C:/Windows/Fonts/msyh.ttc',size*2)
        d.text((x*2,y*2),value,font=font,fill=color)
    caption('板书手写小样 · V1 / V2',36,25,25,bold=True)
    caption('同一原生软笔：先看短笔记的连贯感，再看重复字形的区别',36,69,14)
    caption('上一版 · V1',66,110,19,bold=True);caption('本次修订 · V2',574,110,19,bold=True)
    caption('单一字形模板、固定排布',66,141,12,'#6C7580');caption('不同书写路线、连笔组与持续行笔节奏',574,141,12,'#6C7580')
    for image,x,target in [(old,50,36),(new,630,544)]:
        board.alpha_composite(native_crop(image,(x,165,x+460,340)),(target*2,163*2))
        board.alpha_composite(native_crop(image,(x,405,x+460,655)),(target*2,405*2))
    d=ImageDraw.Draw(board)
    d.line((520*2,110*2,520*2,655*2),fill='#DDE1E4',width=2)
    caption('短笔记 · 实际显示尺寸（基准字高 21 px）',36,348,12,'#6C7580')
    caption('重复写法检查',36,378,15,bold=True)
    d.line((36*2,680*2,1004*2,680*2),fill='#DDE1E4',width=2)
    caption('原生像素细节 · 直接放大，不重新描画',36,695,16,bold=True)
    for image,offset,target in [(old,0,66),(new,580,574)]:
        caption('短连笔 · 2×',target,732,12,'#6C7580')
        box=(75,285,285,337) if offset==0 else (673,281,883,337)
        board.alpha_composite(native_crop(image,box,2),(target*2,757*2))
        caption('重复数字 3 · 3×',target,894,12,'#6C7580')
        board.alpha_composite(native_crop(image,(75+offset,419,154+offset,464),3),(target*2,921*2))
    caption('两栏均使用真实停笔处理；V2改变实际笔画结构与动作，不用字形噪声制造变化',36,1080,12,'#6C7580')
    master=board.convert('RGB');master.save(BUILD/'handwriting-samples-master.png')
    master.resize((1040,1105),Image.Resampling.LANCZOS).save(BUILD/'handwriting-samples-preview.png')
    # 独立V2文件名避免聊天预览缓存旧版；与规范输出字节一致。
    (BUILD/'handwriting-natural-v2-master.png').write_bytes((BUILD/'handwriting-samples-master.png').read_bytes())
    (BUILD/'handwriting-natural-v2-preview.png').write_bytes((BUILD/'handwriting-samples-preview.png').read_bytes())
    details={}
    for label,y0,y1,width,scale in [('note',170,340,340,2),('digits',418,465,270,3),('letters',478,527,340,3),('rounds',538,586,300,3),('roots',596,651,280,3)]:
        strips=[native_crop(image,(x,y0,x+width,y1),scale) for image,x in [(old,65),(new,645)]]
        detail=Image.new('RGBA',(strips[0].width,strips[0].height*2+70),'white')
        detail.alpha_composite(strips[0],(0,35));detail.alpha_composite(strips[1],(0,strips[0].height+70))
        ld=ImageDraw.Draw(detail);font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',24)
        ld.text((8,4),'V1 上一版',font=font,fill='#6C7580');ld.text((8,strips[0].height+39),'V2 本次修订',font=font,fill='#6C7580')
        output=BUILD/f'detail-{label}.png';detail.convert('RGB').save(output);details[label]=output.name
    diagnostics=list(csv.DictReader((SOURCES/'stroke-diagnostics.csv').open(encoding='utf-8')))
    revised=[r for r in diagnostics if r['layer']=='samples-new'];baseline=[r for r in diagnostics if r['layer']=='samples-old']
    assert len(revised)==len(inputs['new_strokes']) and len(baseline)==len(inputs['old_strokes'])
    assert all(r['mode']=='physical-hold' for r in diagnostics)
    assert all(abs(float(r['taper_seconds'])-.055)<1e-8 for r in diagnostics)
    assert all(float(r['hold_ms'])>=70 for r in revised)
    assert all(n>=2 for n in inputs['structural_variant_counts'].values())
    assert inputs['gesture_summary']['symmetry']==3
    report={'version':'v2-natural','input_sha256':inputs['input_sha256'],'native_provenance_sha256':sha(SOURCES/'provenance-dev.json'),
            'nominal_base_height_preview':21,'reference_base_width_preview':1.995,'real_size_crop_scale':1,
            'detail_scaling':'nearest-neighbor enlargement of actual native pixels; no rerendered ink',
            'comparison':inputs['comparison'],'stroke_count':{'V1':len(baseline),'V2':len(revised)},
            'both_layers_hold_aware':True,'observed_movement_age_at_up_ms':{'V1':[min(float(r['hold_ms']) for r in baseline),max(float(r['hold_ms']) for r in baseline)],'V2':[min(float(r['hold_ms']) for r in revised),max(float(r['hold_ms']) for r in revised)]},
            'structural_variant_counts':inputs['structural_variant_counts'],'gesture_summary':inputs['gesture_summary'],
            'note_gestures':inputs['note_gestures'],'details':details,'master_sha256':sha(BUILD/'handwriting-samples-master.png')}
    (BUILD/'sample-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print('PASS V1/V2 native-only board; both hold-aware, structural variants and gesture groups verified.')
    print('MASTER',report['master_sha256'])


if __name__=='__main__':main()
