from pathlib import Path
import argparse
import os
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--repository', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--smoke', action='store_true')
parser.add_argument('--redesign', action='store_true')
args = parser.parse_args()
repository = args.repository.resolve()
executable = repository / 'Build/ARM64/Debug/Inkeys.exe'
if not executable.is_file():
    raise SystemExit(f'Native exporter does not exist: {executable}')
environment = os.environ.copy()
environment['INKEYS_FEATURE_MEDIA_OUTPUT'] = str(args.output.resolve())
if args.smoke:
    environment['INKEYS_FEATURE_MEDIA_SMOKE'] = '1'
if args.redesign:
    environment['INKEYS_FEATURE_MEDIA_REDESIGN'] = '1'
redesign = args.redesign or environment.get('INKEYS_FEATURE_MEDIA_REDESIGN') == '1'
flags = getattr(subprocess, 'CREATE_NO_WINDOW', 0)
process = subprocess.Popen(
    [str(executable), '--bar-eraser-offscreen-test'],
    cwd=repository,
    env=environment,
    creationflags=flags,
)
print(f'Offscreen exporter pid={process.pid}', flush=True)
timeout_seconds = 1800 if redesign else 300
try:
    result = process.wait(timeout=timeout_seconds)
except subprocess.TimeoutExpired:
    process.kill()
    process.wait()
    raise SystemExit(f'Offscreen exporter exceeded {timeout_seconds} seconds; only the exporter process was terminated.')
if result:
    raise SystemExit(f'Offscreen export failed: {result}. See {args.output}/export.log.')
