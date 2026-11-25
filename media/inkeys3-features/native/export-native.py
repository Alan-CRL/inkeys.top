from pathlib import Path
import argparse
import os
import subprocess
import sys

parser = argparse.ArgumentParser()
parser.add_argument('--repository', type=Path, required=True)
parser.add_argument('--output', type=Path)
parser.add_argument('--smoke', action='store_true')
parser.add_argument('--redesign', action='store_true')
parser.add_argument('--msbuild', type=Path)
args = parser.parse_args()
here = Path(__file__).resolve().parent
repository = args.repository.resolve()
output = (args.output or here / ('../sources-redesign' if args.redesign else '../sources')).resolve()
if args.redesign and output != (here / '../sources-redesign').resolve():
    raise SystemExit('Redesign exports may only target sources-redesign.')
if args.msbuild:
    msbuild = args.msbuild.resolve()
else:
    vswhere = Path(os.environ.get('ProgramFiles(x86)', 'C:/Program Files (x86)')) / 'Microsoft Visual Studio/Installer/vswhere.exe'
    vs_root = subprocess.check_output([str(vswhere), '-latest', '-products', '*', '-property', 'installationPath'], text=True).strip()
    msbuild = Path(vs_root) / 'MSBuild/Current/Bin/arm64/MSBuild.exe'
if not msbuild.is_file():
    raise SystemExit(f'ARM64 native MSBuild not found: {msbuild}')
adapter = here / 'install-adapter.py'
capture_directory = here / 'build' / ('capture-' + __import__('uuid').uuid4().hex)
installed = False
old_output = os.environ.get('INKEYS_FEATURE_MEDIA_OUTPUT')
old_smoke = os.environ.get('INKEYS_FEATURE_MEDIA_SMOKE')
old_redesign = os.environ.get('INKEYS_FEATURE_MEDIA_REDESIGN')
old_node_reuse = os.environ.get('MSBUILDDISABLENODEREUSE')


def restore_environment(name, value):
    if value is None:
        os.environ.pop(name, None)
    else:
        os.environ[name] = value


try:
    subprocess.run([sys.executable, str(adapter), str(repository)], check=True)
    installed = True
    os.environ['MSBUILDDISABLENODEREUSE'] = '1'
    with (here / 'build/adapter-build.log').open('w', encoding='utf-8') as build_log:
        subprocess.run([
            str(msbuild), 'InkeysRepo.sln', '/p:Configuration=Debug', '/p:Platform=ARM64',
            '/m', '/nologo', '/v:minimal',
        ], cwd=repository, stdout=build_log, stderr=subprocess.STDOUT, check=True)
    os.environ['INKEYS_FEATURE_MEDIA_OUTPUT'] = str(capture_directory)
    if args.smoke:
        os.environ['INKEYS_FEATURE_MEDIA_SMOKE'] = '1'
    if args.redesign:
        os.environ['INKEYS_FEATURE_MEDIA_REDESIGN'] = '1'
    capture_args = [sys.executable, str(here / 'run-capture.py'), '--repository', str(repository), '--output', str(capture_directory)]
    if args.smoke:
        capture_args.append('--smoke')
    if args.redesign:
        capture_args.append('--redesign')
    subprocess.run(capture_args, check=True)
finally:
    restore_environment('INKEYS_FEATURE_MEDIA_OUTPUT', old_output)
    restore_environment('INKEYS_FEATURE_MEDIA_SMOKE', old_smoke)
    restore_environment('INKEYS_FEATURE_MEDIA_REDESIGN', old_redesign)
    restore_environment('MSBUILDDISABLENODEREUSE', old_node_reuse)
    if installed:
        subprocess.run([sys.executable, str(adapter), str(repository), '--restore'], check=True)

if args.smoke:
    log = (capture_directory / 'export.log').read_text(encoding='utf-8')
    if not log.rstrip().endswith('failures=0'):
        raise SystemExit('Smoke export validation failed.')
    print(f'Smoke export validated: {capture_directory}')
else:
    if args.redesign:
        finalizer = here / 'finalize-redesign.py'
        command = [sys.executable, str(finalizer), '--repository', str(repository), '--sources', str(capture_directory), '--output', str(output), '--contract', str(output / 'asset-contract.json')]
    else:
        finalizer = here / 'finalize-sources.py'
        command = [sys.executable, str(finalizer), '--repository', str(repository), '--sources', str(capture_directory), '--output', str(output)]
    subprocess.run(command, check=True)
