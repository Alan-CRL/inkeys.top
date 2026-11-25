"""一次导出：挂载适配器 → 构建 Debug|ARM64 → 离屏运行 → 按原字节还原 → 收集图层到 ../sources/。

用法：
  python native/export.py --repository D:/Project/Inkeys/Repo/Inkeys             # dev：主栏、分页、白板、手写墨迹
  python native/export.py --repository D:/Project/Inkeys/Repo/Inkeys-hero-shape --shape  # feature/shape：形状图层
场景数据改动（native-scene.txt）只需加 --skip-build 重新运行。
"""
from pathlib import Path
import argparse
import os
import shutil
import subprocess
import sys
import uuid
import hashlib
import json

parser = argparse.ArgumentParser()
parser.add_argument('--repository', type=Path, required=True)
parser.add_argument('--shape', action='store_true')
parser.add_argument('--skip-build', action='store_true')
parser.add_argument('--build-only', action='store_true')
args = parser.parse_args()
here = Path(__file__).resolve().parent
root = here.parent
repository = args.repository.resolve()
vswhere = Path(os.environ.get('ProgramFiles(x86)', 'C:/Program Files (x86)')) / 'Microsoft Visual Studio/Installer/vswhere.exe'
vs_root = subprocess.check_output([str(vswhere), '-latest', '-products', '*', '-property', 'installationPath'], text=True).strip()
msbuild = Path(vs_root) / 'MSBuild/Current/Bin/arm64/MSBuild.exe'
isolated_output = root / 'build' / ('native-shape-bin' if args.shape else 'native-dev-bin')
isolated_output.mkdir(parents=True, exist_ok=True)
executable = isolated_output / 'Inkeys.exe'
locales = ['en-US']
kind = 'shape' if args.shape else 'dev'

revision = subprocess.check_output(['git', '-C', str(repository), 'rev-parse', 'HEAD'], text=True).strip()
adapters = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in here.glob('Hero*.inc')}
build_manifest = isolated_output / 'compiled-adapter.json'
install = [sys.executable, str(here / 'install.py'), str(repository)] + (['--shape'] if args.shape else [])
# 已编译 EXE 重放不依赖当前源码；不重新挂载适配，避免干扰后来发生的源码迁移。
source_paths = [repository / 'Inkeys/Inkeys/UI/Bar' / name for name in ['Bar.EraserAttribute.Test.cpp', 'Bar.Button.cpp'] + list(adapters)]
source_before = {str(p): hashlib.sha256(p.read_bytes()).hexdigest() if p.exists() else None for p in source_paths}
if not args.skip_build:
    subprocess.run(install, check=True)
captures = {}
try:
    if not args.skip_build:
        env = dict(os.environ, MSBUILDDISABLENODEREUSE='1')
        log = root / 'build' / f'native-build-{kind}.log'
        with log.open('w', encoding='utf-8') as handle:
            result = subprocess.run([str(msbuild), 'InkeysRepo.sln', '/p:Configuration=Debug', '/p:Platform=ARM64', '/p:OutDir=' + str(isolated_output) + '/', '/m', '/nologo', '/v:minimal'],
                                    cwd=repository, stdout=handle, stderr=subprocess.STDOUT, env=env, timeout=1200)
        if result.returncode:
            raise SystemExit(f'Build failed; see {log}')
    if not args.skip_build:
        build_manifest.write_text(json.dumps({'adapters':adapters,'executable_sha256':hashlib.sha256(executable.read_bytes()).hexdigest(),'revision':revision,'build_log_sha256':hashlib.sha256(log.read_bytes()).hexdigest()},indent=2),encoding='utf-8')
    compiled=json.loads(build_manifest.read_text(encoding='utf-8'))
    assert compiled['adapters']==adapters and compiled['executable_sha256']==hashlib.sha256(executable.read_bytes()).hexdigest(), 'Private binary does not match compiled adapter'
    if args.build_only:
        raise SystemExit(0)
    for locale in locales:
        capture = root / 'build' / f'capture-{kind}-{locale}-{uuid.uuid4().hex[:8]}'
        capture.mkdir(parents=True)
        shutil.copy2(root / 'data/native-scene.txt', capture / 'native-scene.txt')
        env = dict(os.environ, INKEYS_HERO_OUTPUT=str(capture))
        assert 'INKEYS_HERO_OUTPUT'.encode('utf-16le') in executable.read_bytes(), 'Wrong executable: export marker absent'
        capture_manifest = {'input_sha256': hashlib.sha256((capture/'native-scene.txt').read_bytes()).hexdigest(), 'executable_sha256': hashlib.sha256(executable.read_bytes()).hexdigest(), 'executable_path': str(executable), 'adapters': {p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in here.glob('Hero*.inc')}}
        process = subprocess.Popen([str(executable), '--bar-eraser-offscreen-test'], cwd=repository, env=env,
                                   creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
        try:
            code = process.wait(timeout=900)
        except subprocess.TimeoutExpired:
            process.kill(); process.wait()
            raise SystemExit('Exporter exceeded 900s; only this exporter process was terminated.')
        log_text = (capture / 'export.log').read_text(encoding='utf-8') if (capture / 'export.log').exists() else ''
        if code or not log_text.rstrip().endswith('failures=0'):
            raise SystemExit(f'Export failed (exit {code}); see {capture / "export.log"}')
        capture_manifest['compiled_build'] = compiled
        capture_manifest['capture_only'] = args.skip_build
        capture_manifest['current_worktree_revision'] = revision
        capture_manifest['failures'] = 0
        capture_manifest['export_log_sha256'] = hashlib.sha256((capture/'export.log').read_bytes()).hexdigest()
        (capture/'capture-manifest.json').write_text(json.dumps(capture_manifest,indent=2),encoding='utf-8')
        captures[locale] = capture
finally:
    if not args.skip_build:
        subprocess.run([sys.executable, str(here / 'install.py'), str(repository), '--restore'], check=True)
    source_after = {str(p): hashlib.sha256(p.read_bytes()).hexdigest() if p.exists() else None for p in source_paths}
    assert source_before == source_after, 'Source files changed during capture; inspect before further work'
    (root / 'sources').mkdir(exist_ok=True)
    (root / f'sources/replay-source-{kind}.json').write_text(json.dumps({'capture_only':args.skip_build,'unchanged':True,'before':source_before,'after':source_after},indent=2),encoding='utf-8')

revision = compiled['revision']
for locale, capture in captures.items():
    sources = root / 'sources'
    sources.mkdir(parents=True, exist_ok=True)
    shutil.copy2(capture / 'export.log', sources / f'export-{kind}.log')
    copied = []
    for png in sorted(list(capture.glob('*.png')) + [p for p in capture.glob('*.json') if p.name != 'capture-manifest.json'] + ([] if args.shape else list(capture.glob('*.csv')))):
        shutil.copy2(png, sources / png.name)
        copied.append(png.name)
    note = ('Production shape factories; geometry capture only; no Recall patch\n' if args.shape else
            'Full UI/ink capture; guarded temporary Recall preservation; actual toolbar-state.json\n')
    if args.skip_build:
        note = 'Verified private binary replay; no native source installation or mutation; revision is compiled revision\n'
    (sources / f'provenance-{kind}.txt').write_text(
        f'repository={repository}\nrevision={revision}\nbuild=Debug|ARM64\nlocale={locale}\n{note}layers={",".join(copied)}\n',
        encoding='utf-8')
    print(locale, 'exported', copied)

    provenance = json.loads((capture/'capture-manifest.json').read_text(encoding='utf-8'))
    provenance.update({'source_revision':revision,'repository':str(repository),'build':'Debug|ARM64 full solution, isolated OutDir','layers':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in capture.glob('*.png')}})
    provenance['metadata'] = {p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in ([] if args.shape else list(capture.glob('*.csv'))) + [p for p in capture.glob('*.json') if p.name != 'capture-manifest.json']}
    (sources/f'provenance-{kind}.json').write_text(json.dumps(provenance,indent=2),encoding='utf-8')
