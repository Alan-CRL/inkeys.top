"""S1 主栏：临时安装 → 私有 Debug|ARM64 构建 → 六次离屏捕获 → 按字节还原。

--build-only 只构建；--skip-build 只启动已绑定的私有 EXE，不安装适配。
"""
from pathlib import Path
import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import uuid

parser = argparse.ArgumentParser()
parser.add_argument('--repository', type=Path, required=True)
mode = parser.add_mutually_exclusive_group()
mode.add_argument('--skip-build', action='store_true')
mode.add_argument('--build-only', action='store_true')
args = parser.parse_args()
here = Path(__file__).resolve().parent
repository = args.repository.resolve()
build = here / 'build'
out = here / 'out'
isolated_output = build / 'native-ui-bin'
executable = isolated_output / 'Inkeys.exe'
build_manifest = isolated_output / 'compiled-adapter.json'
log = build / 'native-build.log'
themes = ('light', 'dark')
states = ('soft', 'highlight', 'soft-freeze')


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write_json(path, value):
    with path.open('w', encoding='utf-8', newline='\n') as handle:
        json.dump(value, handle, indent=2)
        handle.write('\n')


def normalized_environment():
    # Windows 的环境名大小写不敏感，MSBuild 枚举时却可能遇到 Path/PATH 重复键。
    env = dict(os.environ)
    path_value = next((v for k, v in env.items() if k == 'Path'), None)
    if path_value is None:
        path_value = next((v for k, v in env.items() if k.casefold() == 'path'), '')
    for key in list(env):
        if key.casefold() == 'path':
            del env[key]
    env['Path'] = path_value
    env['MSBUILDDISABLENODEREUSE'] = '1'
    return env


if not (repository / 'InkeysRepo.sln').is_file():
    raise SystemExit('Expected native repository containing InkeysRepo.sln.')
revision = subprocess.check_output(['git', '-C', str(repository), 'rev-parse', 'HEAD'], text=True).strip()
branch = subprocess.check_output(['git', '-C', str(repository), 'branch', '--show-current'], text=True).strip()
if branch != 'dev':
    raise SystemExit(f'Expected dev branch, got {branch!r}.')
if not args.build_only:
    for theme in themes:
        for state in states:
            if (out / theme / state).exists():
                raise SystemExit(f'Capture already exists; move the old out directory before retrying: {out / theme / state}')
adapters = {p.name: sha(p) for p in sorted(here.glob('Hero*.inc'))}
installer_sha = sha(here / 'install.py')
source_paths = [repository / 'Inkeys/Inkeys/UI/Bar' / name
                for name in ['Bar.EraserAttribute.Test.cpp', 'Bar.Button.cpp'] + list(adapters)]
source_before = {str(p): sha(p) if p.exists() else None for p in source_paths}
install = [sys.executable, str(here / 'install.py'), str(repository)]
isolated_output.mkdir(parents=True, exist_ok=True)
installed = False
run_id = uuid.uuid4().hex[:12]
captures = []
try:
    if not args.skip_build:
        vswhere = Path(os.environ.get('ProgramFiles(x86)', 'C:/Program Files (x86)')) / 'Microsoft Visual Studio/Installer/vswhere.exe'
        vs_root = subprocess.check_output([str(vswhere), '-latest', '-products', '*', '-property', 'installationPath'], text=True).strip()
        msbuild = Path(vs_root) / 'MSBuild/Current/Bin/arm64/MSBuild.exe'
        if not vs_root or not msbuild.is_file():
            raise SystemExit('ARM64 native MSBuild not found through vswhere.')
        # 安装前即作废旧身份；失败构建不能被后续 --skip-build 当成成功构建。
        build_manifest.unlink(missing_ok=True)
        status = subprocess.check_output(['git', '-C', str(repository), 'status', '--porcelain'], text=True)
        subprocess.run(install, check=True)
        installed = True
        with log.open('w', encoding='utf-8', newline='\n') as handle:
            result = subprocess.run([str(msbuild), 'InkeysRepo.sln', '/p:Configuration=Debug', '/p:Platform=ARM64',
                                     '/p:OutDir=' + str(isolated_output) + '/', '/m', '/nr:false', '/nologo', '/v:minimal'],
                                    cwd=repository, stdout=handle, stderr=subprocess.STDOUT,
                                    env=normalized_environment(), timeout=1800)
        if result.returncode:
            raise SystemExit(f'Build failed (exit {result.returncode}); see {log}')
        write_json(build_manifest, {'adapters': adapters, 'installer_sha256': installer_sha,
                                   'executable_sha256': sha(executable), 'revision': revision, 'branch': branch,
                                   'repository': str(repository), 'source_status_before_install': status,
                                   'installed_sources': {str(p): sha(p) for p in source_paths},
                                   'msbuild': str(msbuild), 'configuration': 'Debug|ARM64',
                                   'build_exit_code': result.returncode, 'build_log_sha256': sha(log)})
    compiled = json.loads(build_manifest.read_text(encoding='utf-8'))
    if args.skip_build:
        restoration = json.loads((build / 'source-restoration.json').read_text(encoding='utf-8'))
        if restoration['unchanged'] is not True or restoration['before'] != restoration['after']:
            raise SystemExit('Initial build restoration did not pass; inspect source-restoration.json.')
    if (compiled['adapters'] != adapters or compiled['installer_sha256'] != installer_sha
            or compiled['executable_sha256'] != sha(executable)
            or compiled['build_log_sha256'] != sha(log)
            or compiled['repository'] != str(repository) or compiled['build_exit_code'] != 0):
        raise SystemExit('Private binary/build evidence does not match this adapter/repository.')
    if 'INKEYS_HERO_OUTPUT'.encode('utf-16le') not in executable.read_bytes():
        raise SystemExit('Wrong executable: export marker absent.')
    if args.build_only:
        print('build ok', compiled['executable_sha256'])
    else:
        for theme in themes:
            for state in states:
                capture = build / f'capture-{theme}-{state}-{run_id}'
                capture.mkdir()
                with (capture / 'native-scene.txt').open('w', encoding='utf-8', newline='\n') as handle:
                    handle.write(f'locale en-US\nstate {state}\n')
                env = normalized_environment()
                env.update(INKEYS_HERO_OUTPUT=str(capture), INKEYS_HERO_THEME=theme)
                process = subprocess.Popen([str(executable), '--bar-eraser-offscreen-test'], cwd=repository, env=env,
                                           creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
                try:
                    code = process.wait(timeout=900)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
                    raise SystemExit(f'Exporter exceeded 900s; only this exporter was terminated: {capture}')
                log_text = (capture / 'export.log').read_text(encoding='utf-8') if (capture / 'export.log').exists() else ''
                if code or not log_text.rstrip().endswith('failures=0'):
                    raise SystemExit(f'Export failed (exit {code}); see {capture / "export.log"}')
                for name in ('toolbar.png', 'toolbar-body.json', 'toolbar-state.json'):
                    if not (capture / name).is_file():
                        raise SystemExit(f'Missing capture layer/metadata: {capture / name}')
                actual = json.loads((capture / 'toolbar-state.json').read_text(encoding='utf-8'))
                if actual['state'] != state or actual['theme'] != theme:
                    raise SystemExit(f'Capture fixture mismatch: {capture}')
                manifest = {'state': state, 'theme': theme, 'input_sha256': sha(capture / 'native-scene.txt'),
                            'executable_sha256': sha(executable), 'executable_path': str(executable), 'adapters': adapters,
                            'compiled_build': compiled, 'capture_only': args.skip_build, 'source_revision': compiled['revision'],
                            'current_worktree_revision': revision, 'failures': 0, 'export_exit_code': code,
                            'export_log_sha256': sha(capture / 'export.log'),
                            'layers': {'toolbar.png': sha(capture / 'toolbar.png')},
                            'metadata': {name: sha(capture / name) for name in ('toolbar-body.json', 'toolbar-state.json')}}
                write_json(capture / 'capture-manifest.json', manifest)
                captures.append((theme, state, capture))
                print('captured', theme, state, capture.name)
finally:
    # build-only、构建失败或捕获失败都走同一还原；capture-only 不安装、不还原生产源码。
    try:
        if installed:
            subprocess.run(install + ['--restore'], check=True)
    finally:
        source_after = {str(p): sha(p) if p.exists() else None for p in source_paths}
        evidence = {'unchanged': source_before == source_after, 'before': source_before, 'after': source_after,
                    'capture_only': args.skip_build}
        evidence_path = build / (f'capture-only-source-snapshot-{run_id}.json' if args.skip_build else 'source-restoration.json')
        write_json(evidence_path, evidence)
        if source_before != source_after:
            raise SystemExit(f'Source restoration/snapshot mismatch; inspect {evidence_path}')

# 六次成功且源码还原通过后才发布最终原始捕获；保留 build 中的原始证据。
for theme, state, capture in captures:
    target = out / theme / state
    target.mkdir(parents=True, exist_ok=False)
    for name in ('toolbar.png', 'toolbar-body.json', 'toolbar-state.json', 'capture-manifest.json', 'native-scene.txt', 'export.log'):
        shutil.copy2(capture / name, target / name)
print('done', 'build-only' if args.build_only else str(out))
