"""真实教材 PDF → Poppler 页面 → Windows/Chrome 背景；不启动 GUI。"""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess

from PIL import Image, ImageDraw, ImageFont, ImageFilter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent
RUNTIME = Path.home() / '.cache/codex-runtimes/codex-primary-runtime/dependencies'
POPPLER = RUNTIME / 'native/poppler/Library/bin/pdftoppm.exe'
FONTS = Path('C:/Windows/Fonts')
SOURCE = ROOT / 'sources/chrome-reference.png'
TRAY_SOURCE = ROOT / 'sources/windows11-tray-reference.png'
PDF = ROOT / 'output/solid-geometry.pdf'
BUILD = ROOT / 'build'
BLUE = '#174F7D'
W, H = A4
LEFT, RIGHT = 43, W - 43
WIDTH = RIGHT - LEFT


def register_fonts():
    for name, file in [('Text', 'times.ttf'), ('Text-Bold', 'timesbd.ttf'),
                       ('Text-Italic', 'timesi.ttf'), ('Text-BoldItalic', 'timesbi.ttf'),
                       ('UI', 'segoeui.ttf'), ('UI-Bold', 'segoeuib.ttf')]:
        pdfmetrics.registerFont(TTFont(name, str(FONTS / file)))
    pdfmetrics.registerFontFamily('Text', normal='Text', bold='Text-Bold', italic='Text-Italic', boldItalic='Text-BoldItalic')


def math_markup(text, size):
    # 根号不是单独的 Unicode 字符：在 PDF 文本基线处排版跨越被开方数的矢量横线。
    # 回调随 Paragraph 的行内换行移动；正文保留可搜索的根号和数字。
    return text.replace('√3', f'<onDraw name="radical_rule" label="{size}"/>√3')


def radical_rule(c, kind, label):
    size = float(label)
    info = c._curr_tx_info
    x, y = info['cur_x'], info['cur_y']
    root_width = pdfmetrics.stringWidth('√', 'Text', size)
    digit_width = pdfmetrics.stringWidth('3', 'Text', size)
    c.saveState()
    c.setStrokeColor(HexColor('#24272B'))
    c.setLineWidth(size * .04)
    c.line(x + root_width - size * .04, y + size * .89,
           x + root_width + digit_width + size * .04, y + size * .89)
    c.restoreState()


def paragraph(c, text, top, size=11.3, leading=14.1, indent=0, color='#24272B', font='Text'):
    style = ParagraphStyle('body', fontName=font, fontSize=size, leading=leading,
                           textColor=HexColor(color), spaceAfter=0)
    p = Paragraph(math_markup(text, size), style)
    _, height = p.wrap(WIDTH - indent, H)
    p.drawOn(c, LEFT + indent, H - top - height)
    return top + height


def heading(c, title, page, section='3.2  Plane sections'):
    c.setFillColor(HexColor('#53677B'))
    c.setFont('UI', 8)
    c.drawString(LEFT, H - 29, 'CHAPTER 3   SOLID GEOMETRY')
    c.setFont('Text-Italic', 9)
    c.drawRightString(RIGHT - 24, H - 29, section)
    c.setFont('Text', 9)
    c.drawRightString(RIGHT, H - 29, str(page))
    c.setStrokeColor(HexColor('#BDCBD7'))
    c.setLineWidth(.45)
    c.line(LEFT, H - 36, RIGHT, H - 36)
    paragraph(c, title, 48, size=20, leading=24, color=BLUE, font='Text-Bold')
    return 78


def block(c, label, text, top):
    # 单一浅色底与细竖线保持教材层级；不用海报式大色块。
    size = 11.3
    style = ParagraphStyle('box', fontName='Text', fontSize=11.3, leading=14.1, textColor=HexColor('#24272B'))
    p = Paragraph(math_markup(text, size), style)
    _, height = p.wrap(WIDTH - 22, H)
    total = height + 29
    c.setFillColor(HexColor('#F1F5F8'))
    c.rect(LEFT, H - top - total, WIDTH, total, stroke=0, fill=1)
    c.setFillColor(HexColor('#31749F'))
    c.rect(LEFT, H - top - total, 2, total, stroke=0, fill=1)
    c.setFillColor(HexColor(BLUE))
    c.setFont('Text-Bold', 11.8)
    c.drawString(LEFT + 11, H - top - 15, label)
    p.drawOn(c, LEFT + 11, H - top - 23 - height)
    return top + total


def make_pdf():
    register_fonts()
    c = canvas.Canvas(str(PDF), pagesize=A4, invariant=1, pageCompression=1)
    c.setNamedCB('radical_rule', radical_rule)
    c.setTitle('Solid Geometry - Plane Sections')
    c.setAuthor('Inkeys teaching demonstration')
    c.setSubject('Original five-page textbook excerpt; text and mathematical notation only')
    top = heading(c, '3.1   Coordinates in three dimensions', 69, '3.1  Spatial coordinates')
    top = paragraph(c, 'A rectangular coordinate system describes a point in space by three real numbers. The coordinate axes are mutually perpendicular, and distances are measured in the same unit on each axis.', top)
    top = block(c, 'Distance between two points', 'For points <i>P</i>(<i>x</i><sub>1</sub>, <i>y</i><sub>1</sub>, <i>z</i><sub>1</sub>) and <i>Q</i>(<i>x</i><sub>2</sub>, <i>y</i><sub>2</sub>, <i>z</i><sub>2</sub>),<br/><br/><i>PQ</i><super>2</super> = (<i>x</i><sub>2</sub> − <i>x</i><sub>1</sub>)<super>2</super> + (<i>y</i><sub>2</sub> − <i>y</i><sub>1</sub>)<super>2</super> + (<i>z</i><sub>2</sub> − <i>z</i><sub>1</sub>)<super>2</super>.', top + 17)
    top = paragraph(c, '<b>Proof.</b> Apply Pythagoras’ theorem first to the projection of the segment onto the horizontal coordinate plane, and then to the right triangle whose remaining side is the vertical displacement.', top + 14)
    top = paragraph(c, '<b>Choosing coordinates.</b> For a cube of edge length <i>a</i>, take one vertex as the origin and its three incident edges as the coordinate axes. Every vertex then has each coordinate equal to either 0 or <i>a</i>.', top + 20)
    top = block(c, 'Example 3.1', 'Find the length of a body diagonal of a cube of edge length <i>a</i>.<br/><br/><b>Solution.</b> Opposite vertices may be written as (0, 0, 0) and (<i>a</i>, <i>a</i>, <i>a</i>). The distance formula gives the length <i>a</i>√3.', top + 18)
    paragraph(c, '<b>Exercises</b><br/><br/>1. Find the distance between (1, 2, 3) and (4, 6, 3).<br/>2. Give the coordinates of the centre of a cube with opposite vertices (0, 0, 0) and (<i>a</i>, <i>a</i>, <i>a</i>).<br/>3. Explain why a face diagonal and a body diagonal have different lengths.', top + 25)
    c.showPage()
    top = heading(c, 'Planes and perpendicular distance', 70)
    top = paragraph(c, 'A plane can be described by an equation of the form <i>ux</i> + <i>vy</i> + <i>wz</i> = <i>k</i>, where <i>u</i>, <i>v</i> and <i>w</i> are not all zero. The vector (<i>u</i>, <i>v</i>, <i>w</i>) is normal to the plane.', top)
    top = block(c, 'Parallel planes', 'Planes with equations <i>ux</i> + <i>vy</i> + <i>wz</i> = <i>k</i><sub>1</sub> and <i>ux</i> + <i>vy</i> + <i>wz</i> = <i>k</i><sub>2</sub> have the same normal direction. If their constants differ, the planes are parallel and distinct.', top + 17)
    top = paragraph(c, 'To find where a plane meets a line, substitute a parametric description of the line into the plane equation. For an edge of a coordinate-aligned cube, two coordinates remain fixed while the third varies over the length of the edge.', top + 17)
    top = block(c, 'Example 3.2', 'Find the point where the plane <i>x</i> + <i>y</i> + <i>z</i> = 8 meets the edge given by <i>x</i> = 6, <i>z</i> = 0, 0 ≤ <i>y</i> ≤ 6.<br/><br/><b>Solution.</b> Substitution gives 6 + <i>y</i> = 8, so the intersection is (6, 2, 0). The value 2 lies in the permitted interval.', top + 18)
    top = paragraph(c, '<b>Checking an intersection.</b> A solution of the line equation need not lie on the edge segment. Always check the permitted coordinate interval before including a point as a vertex of the section.', top + 18)
    paragraph(c, '<b>Exercises</b><br/><br/>1. Determine whether the plane <i>x</i> + <i>y</i> + <i>z</i> = 8 meets the edge <i>x</i> = 0, <i>y</i> = 0, 0 ≤ <i>z</i> ≤ 6.<br/>2. Find a normal vector to the plane 2<i>x</i> − <i>y</i> + 3<i>z</i> = 7.<br/>3. Write the equation of the plane through (3, 3, 3) normal to (1, 1, 1).', top + 23)
    c.showPage()
    top = heading(c, '3.2   Plane sections of a cube', 71)
    top = paragraph(c, 'A plane section is the figure formed when a plane cuts a solid. For a cube, its boundary consists of line segments lying in the faces.', top)
    top = block(c, 'Theorem 3.2', 'Every non-degenerate plane section of a cube is a convex polygon with at most six sides.', top + 10)
    top = paragraph(c, '<b><font color="' + BLUE + '">Proof.</font></b> A cube is convex, so its intersection with a plane is convex. If the plane contains a face, the section is a square. Otherwise each face contributes at most one boundary segment. There are six faces, hence at most six sides.', top + 10)
    top = block(c, 'Example 3.3   A central section and its parallels', 'A cube <i>ABCD–EFGH</i> has edge length 6 cm and centre <i>O</i>; <i>AE</i>, <i>BF</i>, <i>CG</i> and <i>DH</i> are corresponding edges. A plane through <i>O</i> is perpendicular to the body diagonal <i>AG</i>.<br/>(a) Prove that it meets six edges at their midpoints and that the section is a regular hexagon.<br/>(b) Find the exact perimeter and area of this section.<br/>(c) The cutting plane is translated a distance <i>d</i> cm towards <i>G</i> along <i>AG</i>, where 0 ≤ <i>d</i> &lt; √3. Let <i>S</i>(<i>d</i>) be the area of the resulting section, in cm<super>2</super>. Find <i>S</i>(<i>d</i>) and determine its maximum value over this interval.', top + 12)
    solution_top = top + 13
    paragraph(c, 'Solution', solution_top, size=12, color=BLUE, font='Text-Italic')
    c.setStrokeColor(HexColor('#CAD7E1'))
    c.setLineWidth(.4)
    c.line(LEFT + 50, H - solution_top - 10, RIGHT, H - solution_top - 10)
    c.showPage()
    top = heading(c, 'Working with a section polygon', 72)
    top = paragraph(c, 'After finding the vertices of a section, list them in boundary order. Consecutive vertices lie on a common face of the solid. Joining points in an arbitrary order may produce crossing segments rather than the boundary.', top)
    top = block(c, 'A useful distinction', 'A polygon with equal side lengths is equilateral, but it need not be regular. To prove regularity, establish both equal sides and equal interior angles, or use a symmetry argument that guarantees both.', top + 16)
    top = paragraph(c, '<b>Angles.</b> At a vertex, form two vectors pointing towards the adjacent vertices. Their scalar product determines the angle between the sides. Use vectors with a common initial point to avoid confusing an interior angle with its supplement.', top + 17)
    top = paragraph(c, '<b>Area.</b> A regular polygon can be divided into congruent triangles by joining its centre to the vertices. For a non-regular section, a larger containing figure and the areas of the removed pieces may give a simpler calculation.', top + 17)
    top = block(c, 'Review questions', '1. Why does equality of six side lengths alone not prove that a hexagon is regular?<br/>2. Explain how a plane can cut exactly three faces of a cube.<br/>3. Can a plane section of a cube have seven sides? Justify your answer.<br/>4. How can symmetry help check a calculation of a central section?', top + 20)
    paragraph(c, 'Written work', top + 25, size=12, color=BLUE, font='Text-Italic')
    c.showPage()
    top = heading(c, 'Further exercises', 73)
    exercises = [
        'A cube has edge length 4 cm. Find the lengths of a face diagonal and a body diagonal, giving exact answers.',
        'In the cube 0 ≤ <i>x</i>, <i>y</i>, <i>z</i> ≤ 6, find all intersections of the plane <i>x</i> + <i>y</i> + <i>z</i> = 4 with the edges. Identify the section and find its area.',
        'Repeat Exercise 2 for the plane <i>x</i> + <i>y</i> + <i>z</i> = 7. Explain why the number of vertices changes.',
        'A plane parallel to a face of a cube passes through its centre. Describe its section and compare its area with that of a face.',
        'For the family <i>x</i> + <i>y</i> + <i>z</i> = <i>k</i> in a cube of edge length 6, identify the values of <i>k</i> at which the section changes between a triangle and a hexagon.',
        'Explain why sections corresponding to <i>k</i> and 18 − <i>k</i> are congruent. State the symmetry of the cube that maps one to the other.'
    ]
    for n, text in enumerate(exercises, 1):
        top = paragraph(c, f'<b>{n}.</b>  {text}', top, indent=0) + 20
    paragraph(c, 'Show your working and give exact values where possible.', top + 6, color='#53677B', font='Text-Italic')
    c.showPage()
    c.save()
    return solution_top


def compose(solution_top):
    # 在 2x 母版坐标系合成，PDF 页面保持 A4 比例，缩略图使用同一真实页面。
    scale = 2
    base = Image.open(SOURCE).convert('RGB').resize((3200, 2000), Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(base)
    def box(rect, fill):
        draw.rectangle(tuple(round(v * scale) for v in rect), fill=fill)
    def ui(text, xy, size, fill='#EEEEEE', anchor='mm'):
        font = ImageFont.truetype(str(FONTS / 'segoeui.ttf'), round(size * scale))
        draw.text((round(xy[0]*scale), round(xy[1]*scale)), text, font=font, fill=fill, anchor=anchor)
    # 重建整个阅读区避免旧插图/阴影残留，保持真实浏览器顶部及系统任务栏。
    box((0, 139, 239, 941), '#292D2F')
    box((239, 139, 1585, 941), '#E8E8E8')
    box((1585, 139, 1599, 941), '#FAFAFA')
    page_x, page_y, page_width = 508, 145, 808
    page_height = round(page_width * H / W)
    shadow = Image.new('RGBA', base.size)
    sd = ImageDraw.Draw(shadow)
    sd.rectangle((page_x*2, page_y*2, (page_x+page_width)*2, (page_y+page_height)*2), fill=(0,0,0,35))
    shadow = shadow.filter(ImageFilter.GaussianBlur(6))
    shadow.paste((0,0,0,0), (0,941*2,3200,2000))
    base = Image.alpha_composite(base.convert('RGBA'), shadow).convert('RGB')
    draw = ImageDraw.Draw(base)
    pages = []
    for n in range(1, 6):
        im = Image.open(BUILD / f'page-{n}.png').convert('RGB')
        pages.append(im)
    current = pages[2].resize((page_width*2, page_height*2), Image.Resampling.LANCZOS)
    # 限制粘贴在 PDF viewport，任务栏必须保留。
    base.paste(current.crop((0, 0, current.width, (941-page_y)*2)), (page_x*2,page_y*2))
    draw = ImageDraw.Draw(base)
    for n, page in enumerate(pages):
        top = 158 + n*151
        if n == 2:
            draw.rounded_rectangle((69*2,(top-7)*2,168*2,(top+139)*2),radius=5*2,fill='#559CF5')
        thumb = page.resize((84*2,round(84*H/W)*2), Image.Resampling.LANCZOS)
        base.paste(thumb, (77*2, top*2))
        ui(str(n+1), (119,top+130), 12)
    # 真实五页文档位于第三页顶部，滚动条大小与可见高度/总文档高度一致。
    draw.polygon([(1590*2,151*2),(1596*2,151*2),(1593*2,147*2)], fill='#909396')
    draw.polygon([(1590*2,929*2),(1596*2,929*2),(1593*2,933*2)], fill='#909396')
    draw.rounded_rectangle((1589*2,452*2,1597*2,559*2), radius=4*2, fill='#B0B2B5')
    # 仅替换页序和缩放字段，保留周围 Chrome 原生图标。
    box((622,96,709,128), '#303435')
    draw.rounded_rectangle((624*2,98*2,668*2,126*2), radius=2*2, fill='#424647', outline='#565A5B', width=1)
    ui('3',(646,111),15)
    ui('/ 5',(692,111),14)
    box((791,98,853,126),'#3B3F40')
    ui('102%',(822,111),14)
    # 使用用户补充的 Windows 11 托盘像素：图标形状和间隔不重画。
    reference = Image.open(TRAY_SOURCE).convert('RGB')
    tray = reference.crop((1402,883,1672,941)).resize((540,116),Image.Resampling.LANCZOS)
    # 原参考时钟单独清除，背景取同一托盘的空白竖条，保留上下颜色渐变。
    clean_clock = reference.crop((1435,883,1440,941)).resize((184,116),Image.Resampling.BILINEAR)
    tray.paste(clean_clock,(356,0))
    # 左侧用纯背景渐变衔接原任务栏，渐变不触及任何图标。
    alpha = Image.new('L',tray.size,255)
    ad = ImageDraw.Draw(alpha)
    for x in range(20):
        ad.line((x,0,x,115),fill=round(255*x/19))
    base.paste(tray,(2660,1884),alpha)
    draw = ImageDraw.Draw(base)
    # 参考图 Segoe UI 常规字重、右对齐、两行约 18 px 间隔；保留约定时间格式。
    clock_font = ImageFont.truetype(str(FONTS/'segoeui.ttf'),27)
    draw.text((3160,1915),'09:02',font=clock_font,fill='#202326',anchor='rt')
    draw.text((3160,1951),'2025/10/07',font=clock_font,fill='#202326',anchor='rt')
    base.save(BUILD / 'background-master.png')
    base.resize((1600,1000),Image.Resampling.LANCZOS).save(BUILD / 'background-preview.png')
    metadata = {'canvas':[3200,2000], 'preview':[1600,1000], 'pdf_page':3, 'page_count':5,
                'preview_page_box':[page_x,page_y,page_width,page_height], 'gray_margins':[269,269],
                'solution_preview_y':round(page_y+solution_top*page_width/W), 'date':'2025/10/07',
                'renderer':'ReportLab PDF + Poppler pdftoppm + Pillow',
                'source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest()}
    (BUILD / 'layout.json').write_text(json.dumps(metadata,indent=2),encoding='utf-8')


def main():
    for folder in ('sources','output','build'):
        (ROOT / folder).mkdir(parents=True,exist_ok=True)
    if not SOURCE.exists():
        shutil.copy2(Path('C:/Users/alan-/AppData/Local/Temp/codex-clipboard-c9c77e79-6dd7-46aa-8ba5-6896167c5165.png'),SOURCE)
    if not TRAY_SOURCE.exists():
        shutil.copy2(Path('C:/Users/alan-/AppData/Local/Temp/codex-clipboard-31884fee-e6df-41d8-a69b-d34b5baaef78.png'),TRAY_SOURCE)
    solution_top = make_pdf()
    subprocess.run([str(POPPLER),'-png','-r','195',str(PDF),str(BUILD/'page')],check=True,timeout=120)
    compose(solution_top)
    reader = PdfReader(PDF)
    assert len(reader.pages)==5
    assert 'regular hexagon' in reader.pages[2].extract_text()
    assert all(abs(float(p.mediabox.width)/float(p.mediabox.height)-W/H)<1e-6 for p in reader.pages)
    assert all(len(p.images)==0 for p in reader.pages)
    assert Image.open(BUILD/'background-preview.png').size==(1600,1000)
    assert Image.open(BUILD/'background-master.png').size==(3200,2000)
    print('PASS: five text-only A4 pages, required exercise, exact output dimensions; rendered with Poppler.')
    print((BUILD/'layout.json').read_text())


if __name__ == '__main__':
    main()
