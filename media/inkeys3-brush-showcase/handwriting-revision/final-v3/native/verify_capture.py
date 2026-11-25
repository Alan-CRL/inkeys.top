"""Validate actual capture/build bindings and restored source bytes; no GUI."""
from pathlib import Path
import hashlib
import json
import csv

ROOT = Path(__file__).resolve().parent.parent
def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

restored = []
for kind, repo in [('dev', Path('D:/Project/Inkeys/Repo/Inkeys-draw')), ('shape', Path('D:/Project/Inkeys/Repo/Inkeys-hero-shape'))]:
    p = json.loads((ROOT / f'sources/provenance-{kind}.json').read_text())
    assert p['input_sha256'] == sha(ROOT / 'data/native-scene.txt')
    assert p['executable_sha256'] == sha(Path(p['executable_path']))
    assert p['compiled_build']['executable_sha256'] == p['executable_sha256']
    assert p['compiled_build']['revision'] == p['source_revision']
    assert p['compiled_build']['adapters'] == p['adapters']
    assert p['compiled_build']['build_log_sha256'] == sha(ROOT / f'build/native-build-{kind}.log')
    for name, digest in p['adapters'].items():
        assert sha(ROOT / 'native' / name) == digest, name
    for name, digest in p['layers'].items():
        assert sha(ROOT / 'sources' / name) == digest, name
    for name, digest in p['metadata'].items():
        if kind == 'shape' and name.endswith('.csv'):
            continue  # shape diagnostics are intentionally capture-local, never overwrite dev evidence.
        assert sha(ROOT / 'sources' / name) == digest, name
    assert p['failures'] == 0
    log = ROOT / f'sources/export-{kind}.log'
    assert sha(log) == p['export_log_sha256']
    assert log.read_text().rstrip().endswith('failures=0')
    if p.get('capture_only'):
        replay = json.loads((ROOT / f'sources/replay-source-{kind}.json').read_text())
        assert replay['capture_only'] and replay['unchanged'] and replay['before']==replay['after']
        for name,digest in replay['after'].items():
            target=Path(name)
            assert (sha(target) if target.exists() else None)==digest
        restored.append({'kind':kind,'capture_only':True,'source_unchanged':True,'source_before_after':replay['after']})
        continue
    ident = hashlib.sha256(str(repo.resolve()).casefold().encode()).hexdigest()[:12]
    backup = ROOT / 'build/adapters' / ident
    files = []
    for name in ['Bar.EraserAttribute.Test.cpp', 'Bar.Button.cpp']:
        original = backup / (name + '.original')
        if not original.exists():
            continue
        target = repo / 'Inkeys/Inkeys/UI/Bar' / name
        assert target.read_bytes() == original.read_bytes(), name
        files.append({'path': str(target), 'sha256': sha(target), 'matches_original': True})
    for inc in (ROOT / 'native').glob('Hero*.inc'):
        assert not (repo / 'Inkeys/Inkeys/UI/Bar' / inc.name).exists()
    restored.append({'kind':kind, 'files':files, 'temporary_includes_absent': True})

state=json.loads((ROOT / 'sources/toolbar-state.json').read_text())
assert state['select_clickthrough_mode']==0 and state['undo'] and not state['redo']
visible=[b['label'] for b in state['buttons'] if b['visible']]
assert 'Soft Pen' in visible and 'Undo' in visible and 'Select' in visible
assert not any('Click' in label or ('Select' in label and 'Clear' in label) for label in visible)
rows=list(csv.DictReader((ROOT / 'sources/stroke-diagnostics.csv').open()))
handwriting=[r for r in rows if r['layer']=='ink-handwriting']
assert handwriting and all(r['mode']=='physical-hold' and float(r['taper_seconds'])==0.055 and float(r['hold_ms'])>=72 for r in handwriting)
report={'passed': True, 'restored':restored, 'handwriting_strokes':len(handwriting), 'physical_hold_ms_range':[min(float(r['hold_ms']) for r in handwriting),max(float(r['hold_ms']) for r in handwriting)], 'actual_visible_buttons':visible}
(ROOT/'sources/restoration.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
