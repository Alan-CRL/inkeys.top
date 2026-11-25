"""V2/V3共同直接绘制对照；两列相同显示尺寸/同一绘制器，不混用原生与草稿效果。"""
from pathlib import Path
import types,sys,json,hashlib
from PIL import Image,ImageDraw
import build_draft as v3

ROOT=Path(__file__).resolve().parent
v2paths=types.ModuleType('natural_paths');v2paths.__file__=str(ROOT.parent/'natural_paths.py')
exec(compile(Path(v2paths.__file__).read_text(encoding='utf-8'),v2paths.__file__,'exec'),v2paths.__dict__)
sys.modules['natural_paths']=v2paths
v2=types.ModuleType('readonly_v2');v2.__file__=str(ROOT.parent/'prepare_samples.py')
exec(compile(Path(v2.__file__).read_text(encoding='utf-8'),v2.__file__,'exec'),v2.__dict__)


def main():
    im=Image.new('RGBA',(2080,1580),'#FAFAF8')
    v3.caption(im,'V2 / V3 · 同尺度字形对照',36,25,25,True)
    v3.caption(im,'两列均直接绘制中心线，字高与绘制方式相同；此图不是新的原生输出',36,69,13,color='#935F25')
    v3.caption(im,'V2 输入路径',66,110,19,True);v3.caption(im,'V3 输入路径',574,110,19,True)
    tests=[('3 3 3',180),('2 2 2',246),('E E F F',312),('M N M N',378),('0 0 6 6 7 7 8 8',444)]
    for content,y in tests:
        start=len(v2.NEW);v2.text(content,66,y,27)
        for stroke in v2.NEW[start:]:v3.paint(im,stroke['path_preview'],27*.105)
        v3.text(im,content,574,y,27)
    for is_old,x in [(True,66),(False,574)]:
        if is_old:
            start=len(v2.NEW);end=v2.root(3,x,522,27);end=v2.root(3,end+20,522,27);end=v2.text('18',end+20,522,27);v2.root(2,end,522,27)
            for stroke in v2.NEW[start:]:v3.paint(im,stroke['path_preview'],27*.105)
        else:
            end=v3.root(im,3,x,522,27,0);end=v3.root(im,3,end+20,522,27,1);end=v3.text(im,'18',end+20,522,27);v3.root(im,2,end,522,27,2)
    v3.caption(im,'21 px 实际尺寸',36,594,13,color='#6C7580')
    start=len(v2.NEW);end=v2.root(3,66,632,21);v2.text('3 3 3',end+20,632,21)
    for stroke in v2.NEW[start:]:v3.paint(im,stroke['path_preview'],21*.105)
    end=v3.root(im,3,574,632,21,3);v3.text(im,'3 3 3',end+20,632,21)
    ImageDraw.Draw(im).line((520*2,110*2,520*2,692*2),fill='#DDE1E4',width=2)
    v3.caption(im,'重点比较内部结构：3 的两瓣与开口、字母竖画/横画、根号入口与完整顶横。',36,731,13,color='#6C7580')
    output=ROOT/'build/handwriting-v2-v3-common-master.png'
    im.convert('RGB').save(output)
    im.convert('RGB').resize((1040,790),Image.Resampling.LANCZOS).save(ROOT/'build/handwriting-v2-v3-common-preview.png')
    manifest={'renderer':'common direct draft for BOTH V2 and V3, not native','main_height':27,'small_height':21,
              'v2_paths_sha256':hashlib.sha256(Path(v2paths.__file__).read_bytes()).hexdigest(),
              'v3_paths_sha256':hashlib.sha256((ROOT/'math_paths.py').read_bytes()).hexdigest(),
              'master_sha256':hashlib.sha256(output.read_bytes()).hexdigest()}
    (ROOT/'data/common-comparison.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    print('PASS common-renderer comparison27px/21px; no originalV2writes, no nativecalls')


if __name__=='__main__':main()
