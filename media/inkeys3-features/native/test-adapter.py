"""Exercise reversible source installation on an isolated byte-for-byte fixture."""
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

here = Path(__file__).resolve().parent
(here / 'build').mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix='adapter-test-', dir=here / 'build') as temporary:
    base = Path(temporary)
    tooling = base / 'tools'
    tooling.mkdir()
    for name in ('install-adapter.py', 'FeatureMediaExport.inc', 'FeatureMediaRedesign.inc'):
        shutil.copyfile(here / name, tooling / name)
    repository = base / 'repository'
    target = repository / 'Inkeys/Inkeys/UI/Bar/Bar.EraserAttribute.Test.cpp'
    target.parent.mkdir(parents=True)
    original = b'\xef\xbb\xbfmodule;\r\n#include <wincodec.h>\r\nmodule Inkeys.UI.Bar;\r\nimport Inkeys.Text.Font;\r\n\tint RunEraserAttributeOffscreenTest()\r\n{\r\n\t\tstd::filesystem::create_directories(L"Build/eraser-b");\r\n}\r\n'
    target.write_bytes(original)
    include = target.with_name('FeatureMediaExport.inc')
    redesign_include = target.with_name('FeatureMediaRedesign.inc')
    def run(*args):
        return subprocess.run([sys.executable, str(tooling / 'install-adapter.py'), str(repository), *args], capture_output=True)
    assert run().returncode == 0
    patched = target.read_bytes()
    assert patched.startswith(b'\xef\xbb\xbf')
    assert b'\n' not in patched.replace(b'\r\n', b'')
    assert run().returncode != 0 and target.read_bytes() == patched
    template = include.read_bytes()
    redesign_template = redesign_include.read_bytes()
    include.write_bytes(template + b'\n// concurrent include edit\n')
    assert run('--restore').returncode != 0
    assert target.read_bytes() == patched, 'Restore must check include before writing source.'
    include.write_bytes(template)
    redesign_include.write_bytes(redesign_template + b'\n// concurrent redesign include edit\n')
    assert run('--restore').returncode != 0
    assert target.read_bytes() == patched, 'Restore must check every include before writing source.'
    redesign_include.write_bytes(redesign_template)
    target.write_bytes(patched + b'// concurrent source edit\r\n')
    assert run('--restore').returncode != 0
    assert target.read_bytes().endswith(b'// concurrent source edit\r\n')
    target.write_bytes(patched)
    assert run('--restore').returncode == 0
    assert target.read_bytes() == original and not include.exists() and not redesign_include.exists()
    target.write_bytes(b'no matching harness anchors')
    assert run().returncode != 0
    assert target.read_bytes() == b'no matching harness anchors' and not include.exists() and not redesign_include.exists()
print('Adapter tests passed: exact BOM/CRLF restore, duplicate install, concurrent edits, changed anchors.')
