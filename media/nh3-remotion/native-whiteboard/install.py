"""临时安装白板主栏和分页适配；全部锚点预检，通过后才写源码，--restore 按原字节恢复。"""
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
    'Bar.EraserAttribute.Test.cpp', 'Bar.Button.cpp', 'Bar.Scene.cpp', 'Bar.RenderLoop.cpp')}
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
        code = '''\t\twchar_t whiteboardOutput[32768]{};
\t\tif (GetEnvironmentVariableW(L"INKEYS_WHITEBOARD_OUTPUT", whiteboardOutput, 32768))
\t\t{
\t\t\tconst int result = FAILED(fontCollectionHr) ? 5 : HeroExport::Export(whiteboardOutput);
\t\t\tRenderPipeline::Shutdown(); CoUninitialize(); return result;
\t\t}
'''.encode().replace(b'\n', eol)
        edits = [
            (b'\tint RunEraserAttributeOffscreenTest()', b'#include "HeroExport.inc"' + eol + eol + b'\tint RunEraserAttributeOffscreenTest()'),
            (b'\t\tstd::filesystem::create_directories(L"Build/eraser-b");', code + b'\t\tstd::filesystem::create_directories(L"Build/eraser-b");'),
            (b'#include <wincodec.h>', eol.join([b'#include <wincodec.h>', b'#include <iomanip>', b'#include <iterator>', b'#include <memory>', b'#include <optional>'])),
            # 复用白板页态解析和显示快照类型，供分页状态及主栏固定布局使用。
            (b'import Inkeys.UI.PageControl;', eol.join([
                b'import Inkeys.UI.PageControl;', b'import Inkeys.UI.Whiteboard;', b'import Inkeys.Display;'])),
        ]
    elif name == 'Bar.Button.cpp':
        anchor = b'\t\tRecallHistoryAvailability availability{};' + eol + b'\t\tif (Inkeys::Drawing::Draw3::ProductRunning())'
        # 与基底一致：离屏没有 Draw3 产品运行时，保留生产历史通知设置的 Undo/Redo 可用性。
        guard = b'\t\tif (!Inkeys::Drawing::Draw3::ProductRunning() && GetEnvironmentVariableW(L"INKEYS_WHITEBOARD_OUTPUT", nullptr, 0)) return; // whiteboard export' + eol
        edits = [(anchor, guard + anchor)]
    elif name == 'Bar.Scene.cpp':
        # 分页原生 presentation backing 在 3 倍采样时每边仅留 30px；导出时为裁切预留到 60px。
        anchor = b'LONG Outset() const noexcept { return backgroundOnly?0:static_cast<LONG>(std::ceil(DamageOutsetDip*scale)); }'
        replacement = eol.join([
            b'LONG Outset() const noexcept',
            b'\t\t{',
            b'\t\t\tconst LONG nativeOutset = backgroundOnly?0:static_cast<LONG>(std::ceil(DamageOutsetDip*scale));',
            b'\t\t\tif (!backgroundOnly && content.whiteboard && content.surface == 0 &&',
            b'\t\t\t\tGetEnvironmentVariableW(L"INKEYS_WHITEBOARD_OUTPUT", nullptr, 0))',
            b'\t\t\t\treturn (std::max)(nativeOutset, 60L);',
            b'\t\t\treturn nativeOutset;',
            b'\t\t}',
        ])
        edits = [(anchor, replacement)]
    else:
        # 只增加主栏 backing 容量，沿用生产 viewport 和绘制坐标；避免紧凑目标截掉裁切余量。
        anchor = b'RECT capacityContentBounds = currentContentBounds;'
        padding = eol.join([
            b'\t\tif (!IsBarWindowRectEmpty(capacityContentBounds) &&',
            b'\t\t\tGetEnvironmentVariableW(L"INKEYS_WHITEBOARD_OUTPUT", nullptr, 0))',
            b'\t\t\tInflateRect(&capacityContentBounds, 60, 60);',
        ])
        edits = [(anchor, anchor + eol + padding)]
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
