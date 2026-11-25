"""在 native 仓库的离屏测试入口临时挂载配图导出器；--restore 按原字节还原。

只修改 Bar.EraserAttribute.Test.cpp（精确字节备份）并复制本目录 Hero*.inc；
shape 构建额外定义 HERO_SHAPE_BUILD。还原前核对文件未被他人改动。
"""
from pathlib import Path
import argparse
import hashlib
import json

parser = argparse.ArgumentParser()
parser.add_argument('repository', type=Path)
parser.add_argument('--shape', action='store_true', help='feature/shape 构建：只导出形状图层')
parser.add_argument('--restore', action='store_true')
args = parser.parse_args()
here = Path(__file__).resolve().parent
target = args.repository / 'Inkeys/Inkeys/UI/Bar/Bar.EraserAttribute.Test.cpp'
names = sorted(p.name for p in here.glob('Hero*.inc'))
includes = [target.with_name(name) for name in names]
repository_id = hashlib.sha256(str(args.repository.resolve()).casefold().encode()).hexdigest()[:12]
backup = here.parent / 'build/adapters' / repository_id / 'Bar.EraserAttribute.Test.cpp.original'
# 离屏导出没有 Draw3 产品运行时；仅在导出环境变量存在时保留 NoteRecallHistoryAvailability 写入的撤回可用性。
recall = args.repository / 'Inkeys/Inkeys/UI/Bar/Bar.Button.cpp'
recall_backup = backup.with_name('Bar.Button.cpp.original')
recall_anchor = b'\t\tRecallHistoryAvailability availability{};\n\t\tif (Inkeys::Drawing::Draw3::ProductRunning())'
recall_guard = b'\t\tif (!Inkeys::Drawing::Draw3::ProductRunning() && GetEnvironmentVariableW(L"INKEYS_HERO_OUTPUT", nullptr, 0)) return; // hero-export\n'

original = target.read_bytes()
if args.restore:
    patched = backup.with_suffix('.patched')
    if original != patched.read_bytes():
        raise SystemExit('Native file changed since adapter installation; refusing to overwrite.')
    for name, include in zip(names, includes):
        if include.exists() and include.read_bytes() != (here / name).read_bytes():
            raise SystemExit(f'Native include differs; refusing to delete it: {name}')
    recall_patched_file = recall_backup.with_suffix('.patched')
    if recall_patched_file.exists():
        if recall.read_bytes() != recall_patched_file.read_bytes():
            raise SystemExit('Bar.Button.cpp changed since adapter installation; refusing to overwrite.')
    # 全部回滚前置检查先完成，避免恢复一半才发现另一文件已被修改。
    target.write_bytes(backup.read_bytes())
    if recall_patched_file.exists():
        recall.write_bytes(recall_backup.read_bytes())
        recall_patched_file.unlink()
    for include in includes:
        include.unlink(missing_ok=True)
    print('restored')
    raise SystemExit(0)

if b'HeroExport.inc' in original:
    raise SystemExit('Adapter already installed.')
for include in includes:
    if include.exists():
        raise SystemExit(f'Include already exists; refusing overwrite: {include.name}')
eol = b'\r\n' if b'\r\n' in original else b'\n'
anchor = b'\tint RunEraserAttributeOffscreenTest()'
branch = b'\t\tstd::filesystem::create_directories(L"Build/eraser-b");'
if original.count(anchor) != 1 or original.count(branch) != 1:
    raise SystemExit('Harness anchors changed; review adapter before reapplying.')
code = '''\t\twchar_t heroOutput[32768]{};
\t\tif (GetEnvironmentVariableW(L"INKEYS_HERO_OUTPUT", heroOutput, 32768))
\t\t{
\t\t\tconst int result = FAILED(fontCollectionHr) ? 5 : HeroExport::Export(heroOutput, HERO_SHAPE_BUILD != 0);
\t\t\tRenderPipeline::Shutdown(); CoUninitialize(); return result;
\t\t}
'''.encode().replace(b'\n', eol)
define = f'#define HERO_SHAPE_BUILD {1 if args.shape else 0}'.encode()
changed = original.replace(anchor, define + eol + b'#include "HeroExport.inc"' + eol + eol + anchor)
headers = [b'#include <DirectXMath.h>', b'#include <dxgi1_2.h>', b'#include <iomanip>', b'#include <functional>',
           b'#include <optional>', b'#include <cmath>', b'#include <sstream>', b'#include "../Whiteboard/Whiteboard.Theme.h"']
if args.shape:
    headers.append(b'#include "../../../../inkStrokeModelerTest/draw3/shape_core.h"')
else:
    # 模块只在全局片段包含 stroke modeler；harness 需显式包含才能命名 ink::stroke_model::Input。
    headers.append(b'#include <ink_stroke_modeler/stroke_modeler.h>')
changed = changed.replace(b'#include <wincodec.h>', eol.join([b'#include <wincodec.h>'] + headers))
changed = changed.replace(b'import Inkeys.Text.Font;', eol.join([b'import Inkeys.Text.Font;', b'import Inkeys.Drawing.Draw3.renderer;',
                                                                  b'import Inkeys.Drawing.Draw3.ink_document;', b'import Inkeys.Drawing.Draw3.ink_prediction;']))
changed = changed.replace(branch, code + branch)
backup.parent.mkdir(parents=True, exist_ok=True)
backup.write_bytes(original)
backup.with_suffix('.patched').write_bytes(changed)
for name, include in zip(names, includes):
    include.write_bytes((here / name).read_bytes())
target.write_bytes(changed)
# 小样不导出 UI，不需要修改生产 Recall 状态刷新。
print(json.dumps({'originalSha256': hashlib.sha256(original).hexdigest(), 'patchedSha256': hashlib.sha256(changed).hexdigest(), 'includes': names}))
