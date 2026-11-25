"""Apply/revert only the explicit media exporter hook; preserve native bytes/EOL."""
from pathlib import Path
import argparse
import hashlib
import json

parser = argparse.ArgumentParser()
parser.add_argument('repository', type=Path)
parser.add_argument('--restore', action='store_true')
args = parser.parse_args()
here = Path(__file__).resolve().parent
target = args.repository / 'Inkeys/Inkeys/UI/Bar/Bar.EraserAttribute.Test.cpp'
include_names = ('FeatureMediaExport.inc', 'FeatureMediaRedesign.inc')
includes = [target.with_name(name) for name in include_names]
repository_id = hashlib.sha256(str(args.repository.resolve()).casefold().encode()).hexdigest()[:12]
backup = here / 'build/adapters' / repository_id / 'Bar.EraserAttribute.Test.cpp.original'
original = target.read_bytes()
if args.restore:
    patched = backup.with_suffix('.patched')
    if original != patched.read_bytes():
        raise SystemExit('Native file changed since adapter installation; refusing to overwrite.')
    for name, include in zip(include_names, includes):
        if not include.exists() or include.read_bytes() != (here / name).read_bytes():
            raise SystemExit(f'Native include differs; refusing to delete it: {name}')
    target.write_bytes(backup.read_bytes())
    for include in includes:
        include.unlink()
else:
    if b'FeatureMediaExport.inc' in original:
        raise SystemExit('Adapter already installed.')
    for include in includes:
        if include.exists():
            raise SystemExit(f'Include already exists; refusing overwrite: {include.name}')
    eol = b'\r\n' if b'\r\n' in original else b'\n'
    anchor = b'\tint RunEraserAttributeOffscreenTest()'
    branch = b'\t\tstd::filesystem::create_directories(L"Build/eraser-b");'
    code = '''\t\twchar_t mediaOutput[32768]{};
\t\tif (GetEnvironmentVariableW(L"INKEYS_FEATURE_MEDIA_OUTPUT", mediaOutput, 32768))
\t\t{
\t\t\tconst int result = FAILED(fontCollectionHr) ? 5 : FeatureMedia::Export(mediaOutput);
\t\t\tRenderPipeline::Shutdown(); CoUninitialize(); return result;
\t\t}
'''.encode().replace(b'\n', eol)
    if original.count(anchor) != 1 or original.count(branch) != 1:
        raise SystemExit('Harness anchors changed; review adapter before reapplying.')
    changed = original.replace(anchor, b'#include "FeatureMediaExport.inc"' + eol + eol + anchor)
    changed = changed.replace(
        b'#include <wincodec.h>',
        b'#include <wincodec.h>' + eol
        + b'#include <DirectXMath.h>' + eol
        + b'#include <dxgi1_2.h>' + eol
        + b'#include <iomanip>' + eol
        + b'#include <functional>' + eol
        + b'#include <optional>' + eol
        + b'#include <cmath>' + eol
        + b'#include "../Whiteboard/Whiteboard.Theme.h"' + eol
        + b'#include "../../Drawing/Draw3/Draw3.CursorSettings.h"' + eol
        + b'#include "../../../../inkStrokeModelerTest/draw3/shape_core.h"')
    changed = changed.replace(
        b'import Inkeys.Text.Font;',
        b'import Inkeys.Text.Font;' + eol
        + b'import Inkeys.Drawing.Draw3.renderer;' + eol
        + b'import Inkeys.Drawing.Draw3.ink_document;' + eol
        + b'import Inkeys.Drawing.Draw3.ink_prediction;' + eol
        + b'import Inkeys.Drawing.Draw3.pen_cursor;')
    changed = changed.replace(branch, code + branch)
    backup.parent.mkdir(parents=True, exist_ok=True)
    backup.write_bytes(original)
    backup.with_suffix('.patched').write_bytes(changed)
    for name, include in zip(include_names, includes):
        include.write_bytes((here / name).read_bytes())
    target.write_bytes(changed)
    print(json.dumps({'originalSha256': hashlib.sha256(original).hexdigest(), 'patchedSha256': hashlib.sha256(changed).hexdigest()}))
