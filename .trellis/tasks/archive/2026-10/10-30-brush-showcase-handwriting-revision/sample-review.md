# Native handwriting sample review — PASS for user review gate

Active task: 10-30-brush-showcase-handwriting-revision. Scope is the isolated small native sample board only; this does not approve or perform a full-scene replacement.

## Findings resolved during collaboration
- Initial corner schedule slowed only before a corner and resumed at full speed after the hold. Sample worker replaced this with arc-length speed profiles, curvature caps, forward/backward acceleration constraints and inverse time sampling. Final measured maximum consecutive8ms speed change is26.205 DIP/s, eliminating the earlier short-segment velocity jumps.
- E/F detail crops initially included a cut-off part of M. The final crops exclude it.
- Report/caption now distinguish the configured96ms pre-Up dwell from observed104ms age since last admitted movement; the extra8ms is due to the production0.25px movement admission gate. The nominal baseline width is explicitly distinguished from the resulting actual stroke weight.

## Production path and adapter audit
- Both columns use real Draw3 soft-pen simulated-pressure modeling, production endpoint admission/recovery, FinalizeStoredStroke and stored-stroke replay. No hard-pen or taper=0 bypass is used.
- Legacy free preserves original timing behavior: every move updates movement time and Up follows last sample by0.1ms.
- Revised free_hold separates logical clock from admitted real movement. Stationary/subthreshold snapshots do not reset the speed time/position baseline; idle settling follows DrawingController behavior, and resumed movement uses recovery admission.
- Physical Up is last input sample plus96ms, terminal time is locked, and lastMovementInputTime is preserved through terminal admission. Both paths retain the production0.055-second taper argument. Its retirement follows the actual elapsed stop age rather than disabling the algorithm.
- New shapes use explicit polylines for E/F/M/N/4/7/radicals and controlled Beziers for rounded characters; no uniform Catmull smoothing of sharp corners, no font-outline tracing.
- Only sample ink layers are rendered; no toolbar, whiteboard, geometry or full-scene work is invoked. Old generation module is loaded read-only solely to recover baseline centerlines/timing, and its Pillow scratch pixels never appear in the sample board.

## Independent numerical checks
- Current input SHA25684a157689ae07d30b9ac613e1777b1e99a1dba27efb6fb065a4d5e8fbbd82129 is bound to the actual private executable, adapter hashes, both native PNGs, both diagnostic CSVs and successful export log.
-52 legacy strokes and66 revised strokes. Main characters have identical21DIP nominal height and1.995DIP base width; superscripts scale equivalently in both columns. This is a combined glyph/timing/adapter comparison, not a single-variable causal experiment.
- All revised movement intervals are8ms;28 explicit corners have16ms holds. Metadata records96ms pre-Up delay and64ms pen-up gaps. Pen-up gaps describe sequencing between independent strokes, not width input to a currently active stroke.
- Actual native movement-to-Up ages: legacy0.1ms; revised104ms. Actual stored end/base-width median ratios: legacy0.313; revised1.297. The difference is production velocity response plus retired live taper, not a post-render effect.
- Across28 corners, nearest stored centerline is within0.110DIP of the intended sharp vertex. Minimum corner-width/base ratio is1.212; no corner is anomalously thinned.
- New long-horizontal middle stored width is2.535–2.556DIP (stable); legacy is2.020–2.025DIP. New samples are visibly heavier despite the same nominal base because their actual movement is slower. This is disclosed rather than presented as equal final weight.
- All44 frozen prior source/artifact hashes remain unchanged.
- Actual native harness SHA256 equals recorded original/restored hashes; temporary Hero includes are absent. Sample mode does not patch Recall.
- Python source compile checks pass. Native worker reports successful existing full-solution Debug|ARM64 build in the task-private OutDir and export failures=0. Reviewer did not rebuild or run the product.

## Visual review
Inspected final1040x1020 preview plus enlarged corner and formula details. E/F/M/N and radical corners are explicit; rounded glyphs retain curves; formula superscripts and symbols are readable. Common stroke ends and long horizontal ending no longer show the previous long needle taper. Details are nearest-neighbor enlargements of actual native pixels; all red handwriting comes from the source PNGs, with no redraw fallback.

Final board master SHA256 at review: c3a729a75199e4e20822926ed829500993f6e6839750ef7365b89faa740929dc.

## Remaining boundary
No blocking sample defect found. The mature-teacher visual preference and slightly heavier revised weight remain for user confirmation. Keep the full scene and its later lower-diagram/laser/point-grid/toolbar changes untouched until that confirmation. No standalone lint/type-check configuration exists; neither is falsely reported passing. No GUI, commit, push or old-artifact mutation was performed by reviewer.