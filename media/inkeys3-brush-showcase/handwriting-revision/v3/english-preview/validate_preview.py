"""Only a direct path draft/finite-data check, never native rendering."""
import importlib.util
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('english', HERE.parent / 'english_paths.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
def sample(s):
    if s['kind'] == 'polyline': return s['points']
    p0 = s['start']; out = [p0]
    for a, b, end in s['segments']:
        for i in range(1, 25):
            t = i / 24; u = 1-t
            out.append(tuple(u**3*p0[j]+3*u*u*t*a[j]+3*u*t*t*b[j]+t**3*end[j] for j in range(2)))
        p0 = end
    return out
im = Image.new('RGB', (1300, 900), '#fffdf9'); d = ImageDraw.Draw(im)
font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 22)
for n, (word, strokes) in enumerate(m.WORDS.items()):
    y = 20+n*92; d.text((20,y+25), word, fill='#55616a', font=font)
    for s in strokes:
        pts = sample(s)
        assert all(math.isfinite(x) for p in pts for x in p)
        d.line([(240+x*48,y+v*48) for x,v in pts], fill='#ed271a', width=3, joint='curve')
x = 25
for w in 'therefore the section is regular'.split():
    for s in m.WORDS[w]:
        d.line([(x+a*41,790+b*41) for a,b in sample(s)], fill='#ed271a', width=3, joint='curve')
    x += (m.WORD_WIDTHS[w]+.45)*41
im.save(HERE / 'word-gestures-draft.png')
(HERE / 'words.json').write_text(json.dumps({'words':m.WORDS,'widths':m.WORD_WIDTHS},indent=2),encoding='utf-8')
assert set(m.WORDS) == {'by','symmetry','hence','therefore','the','section','is','regular'}
print('PASS: all eight words present, finite and JSON serializable; direct draft only')