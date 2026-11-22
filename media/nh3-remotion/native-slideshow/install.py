"""临时安装放映左下分页适配；全部锚点预检，通过后才写源码，--restore 按原字节恢复。"""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('repository', type=Path)
parser.add_argument('--restore', action='store_true')
args = parser.parse_args()
here = Path(__file__).resolve().parent
repository = args.repository.resolve()
bar = repository / 'Inkeys/Inkeys/UI/Bar'
repository_id = hashlib.sha256(str(repository).casefold().encode()).hexdigest()[:12]
backup = here / 'build/adapters' / repository_id
record = backup / 'installation.json'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def restore():
    session = json.loads(record.read_text(encoding='utf-8'))
    if session['repository'] != str(repository):
        raise SystemExit('Backup repository differs; refusing restoration.')
    # 先核对全部文件，包括备份本身。中断安装时允许文件仍是原件或 include 尚未创建。
    originals = {}
    for name, evidence in session['sources'].items():
        original = (backup / (name + '.original')).read_bytes()
        if sha(original) != evidence['original']:
            raise SystemExit(f'Backup damaged: {name}')
        if sha((bar / name).read_bytes()) not in (evidence['original'], evidence['patched']):
            raise SystemExit(f'Native file changed; refusing overwrite: {name}')
        originals[name] = original
    for name, digest in session['includes'].items():
        path = bar / name
        if path.exists() and sha(path.read_bytes()) != digest:
            raise SystemExit(f'Native include changed; refusing removal: {name}')
    for name, original in originals.items():
        if (bar / name).read_bytes() != original:
            (bar / name).write_bytes(original)
    for name in session['includes']:
        (bar / name).unlink(missing_ok=True)
    record.unlink()
    print('restored byte-for-byte')


if args.restore:
    restore()
    raise SystemExit(0)
if record.exists():
    raise SystemExit('Unrestored installation exists; run --restore first.')

sources = {name: (bar / name).read_bytes() for name in (
    'Bar.EraserAttribute.Test.cpp', 'Bar.Scene.cppm', 'Bar.Scene.cpp')}
includes = {p.name: p.read_bytes() for p in sorted(here.glob('Hero*.inc'))}
if set(includes) != {'HeroCommon.inc', 'HeroExport.inc', 'HeroScene.inc'}:
    raise SystemExit('Expected exactly three adapter includes.')
for name in includes:
    if (bar / name).exists():
        raise SystemExit(f'Include already exists; refusing overwrite: {name}')
changed = {}
for name, original in sources.items():
    eol = b'\r\n' if b'\r\n' in original else b'\n'
    if name == 'Bar.EraserAttribute.Test.cpp':
        if b'HeroExport.inc' in original:
            raise SystemExit('Another Hero adapter is installed.')
        # 复用测试入口的 COM、D2D 及字体初始化，并在原测试写文件前进入导出。
        code = '''\t\twchar_t slideshowOutput[32768]{};
\t\tconst DWORD slideshowLength = GetEnvironmentVariableW(L"INKEYS_SLIDESHOW_OUTPUT", slideshowOutput, 32768);
\t\tif (slideshowLength)
\t\t{
\t\t\tconst int result = slideshowLength >= 32768 || FAILED(fontCollectionHr) ? 5 : HeroExport::Export(slideshowOutput);
\t\t\tRenderPipeline::Shutdown(); CoUninitialize(); return result;
\t\t}
'''.encode('ascii').replace(b'\n', eol)
        entry = b'\tint RunEraserAttributeOffscreenTest()'
        output = b'\t\tstd::filesystem::create_directories(L"Build/eraser-b");'
        header = b'#include <wincodec.h>'
        edits = [
            (header, header + eol + b'#include <iomanip>'),
            (entry, b'#include "HeroExport.inc"' + eol + eol + entry),
            (output, code + output),
        ]
    elif name == 'Bar.Scene.cppm':
        # 临时声明只读槽位探针，用于核对布局快照未暴露的第二行页码。
        anchor = b'\t\t[[nodiscard]] BarPageSurfaceGeometry Geometry() const noexcept;'
        edits = [(anchor, b'\t\tbool ReadSlideshowCaptureState(BarPageSurfaceContent&) const;' + eol + anchor)]
    else:
        # 生产 backing 默认每边 30px；仅放映左栏导出需要完整的 60px 裁切余量。
        outset = b'LONG Outset() const noexcept { return backgroundOnly?0:static_cast<LONG>(std::ceil(DamageOutsetDip*scale)); }'
        replacement = '''LONG Outset() const noexcept
\t\t{
\t\t\tconst LONG nativeOutset = backgroundOnly?0:static_cast<LONG>(std::ceil(DamageOutsetDip*scale));
\t\t\tif (!backgroundOnly && !content.whiteboard && content.pptActive && content.surface == 0 &&
\t\t\t\tGetEnvironmentVariableW(L"INKEYS_SLIDESHOW_OUTPUT", nullptr, 0))
\t\t\t\treturn (std::max)(nativeOutset, 60L);
\t\t\treturn nativeOutset;
\t\t}'''.encode('ascii').replace(b'\n', eol)
        geometry = b'\tBarPageSurfaceGeometry BarPageSurface::Geometry() const noexcept'
        inspect = '''\tbool BarPageSurface::ReadSlideshowCaptureState(BarPageSurfaceContent& observed) const
\t{
\t\tconst auto& p = *impl_;
\t\tconst auto& previous = p.pageButtons[1]->name;
\t\tconst auto& primary = p.pageButtons[2]->name;
\t\tconst auto& secondary = p.pageTotal;
\t\tconst auto& next = p.pageButtons[3]->name;
\t\tobserved = p.content;
\t\tobserved.previousLabel = previous.content.GetVal();
\t\tobserved.currentPage = primary.content.GetVal();
\t\tobserved.totalPage = secondary.content.GetVal();
\t\tobserved.nextLabel = next.content.GetVal();
\t\treturn p.idleFade.val == 0 && p.appliedHover == 0 && p.appliedPressed == 0 &&
\t\t\tp.indicator.Ring() == 0 && primary.y.val < secondary.y.val &&
\t\t\tprevious.pct.val == 1 && primary.pct.val == 1 && secondary.pct.val == 1 && next.pct.val == 1;
\t}
'''.encode('ascii').replace(b'\n', eol)
        edits = [(outset, replacement), (geometry, inspect + eol + geometry)]
    for anchor, replacement in edits:
        if original.count(anchor) != 1:
            raise SystemExit(f'Anchor must match exactly once: {name}: {anchor!r}')
    patched = original
    for anchor, replacement in edits:
        patched = patched.replace(anchor, replacement)
    changed[name] = patched

if subprocess.check_output(['git', '--no-optional-locks', '-C', str(repository), 'status', '--porcelain']):
    raise SystemExit('Native worktree must be clean before installation.')

# 备份和清单先落盘；故进程中断后也能安全辨认未写/已写文件，再统一还原。
backup.mkdir(parents=True, exist_ok=True)
session = {'repository': str(repository),
           'sources': {name: {'original': sha(data), 'patched': sha(changed[name])} for name, data in sources.items()},
           'includes': {name: sha(data) for name, data in includes.items()}}
# x 模式先取得安装记录所有权，其他任务不能在此后覆盖本次原件备份。
with record.open('x', encoding='utf-8', newline='\n') as handle:
    for name, data in sources.items():
        (backup / (name + '.original')).write_bytes(data)
    json.dump(session, handle, indent=2)
try:
    # 写入前再次核对预检快照，避免覆盖其间的外部编辑。
    for name, data in sources.items():
        if (bar / name).read_bytes() != data:
            raise SystemExit(f'Native source changed during preflight: {name}')
    for name, data in includes.items():
        with (bar / name).open('xb') as handle:
            handle.write(data)
    for name, data in changed.items():
        (bar / name).write_bytes(data)
except BaseException:
    restore()
    raise
print(json.dumps(session, indent=2))
