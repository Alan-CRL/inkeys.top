# V2 native handwriting review — technical pass; style candidate for user review

This report does not convert the rejected V1 style into an accepted result. V1 passed mechanics only. User approval of V2 handwriting remains pending, and no full-scene replacement is authorized by this review.

Final input SHA256:3965e21ec977ea2c6a5aa285bb4bc5af4bec045ede731455b7537ffd9dca3070.
Final board master SHA256:63b7e80bec71e8c8e79698b78e6147a155246cf650b6b744d7d4d84b85b0134f.

## Structural/style evidence
- Reviewed natural_paths.py and per-occurrence manifest routes. Variants change real normalized bowl proportions/openings, stem curvature, crossbar lengths/angles, stroke order and pen-lift structure. E/F variants include different continuous versus separate-bar routes; M/N route groups also differ.
- Repeated3 has four normalized variants,2 has three,M/N three each,and E/F/0/7/s at least two. Independent Procrustes comparison of3 routes after removing translation, uniform scale and rotation has relative residual0.072–0.305. These are not merely copies moved or tilted on the page.
- BY is one authored continuous route; SYMMETRY is three planned routes including a delayed t crossbar. Three pen lifts across the full phrase are explicit. Connections follow letter exits/entries and are not generic bridging lines inserted between font glyphs.
- Mathematical note uses persistent writer context across tokens with deliberately different operator gaps, baseline positions and superscript placement. It still contains natural pen lifts; it is not represented as one physically continuous stroke.
- Final board and enlarged note/letter/digit details were visually reviewed. English connected writing is materially more handwritten than V1. Repeated digits and capitals visibly vary while retaining a consistent author family. Math remains readable, with unchanged correct formulas. No random point jitter, clipped glyphs or obvious unnatural connection across a word space was found.
- Subjective limit: V2 remains an authored demonstration, and naturalness is not proven by path hashes or timing checks. It is a credible improvement to submit for user judgment, not an assertion that the user has accepted an adult-teacher style.

## Native/temporal verification
- Both current columns use the same hold-aware adapter, not legacy immediate-Up versus corrected-Up.89V1 strokes and93V2 strokes are bound to the current input and captured sources.
- Executable SHA256 and every C++ adapter hash are identical to the preserved V1 capture. Production Draw3 simulated-pressure pen, finalization and0.055-second taper remain unchanged. No hard-pen/taper0 substitute or redrawn-font fallback.
- Actual movement inputs remain on an8ms grid. Measured maximum consecutive speed delta26.893 DIP/s; curvature/acceleration limiting retained. Contextual configured Up holds72–112ms give observed movement ages80–120ms; V1 remains104ms. All are genuine stopped-input aging, not overwritten taper arguments.
- Actual stored endpoint/base-width ratios in V2 range1.253–1.332, median1.279; V1 median1.297. This and visual inspection show no return to ubiquitous long pointed ends.
-21DIP height and1.995DIP width are reference values, not a claim that every contextual token has identical size or final weight. Math token sizes and resulting native widths are intentionally variable and documented.
- Production input/EXE/adapter/PNG/CSV/export-log hashes and failures=0 all verified. Composer only crops/composites native red pixels; detail enlargements use nearest-neighbor scaling rather than re-rendering text.

## Preservation and checks
- All44 original frozen source/artifact hashes pass.
- V1 authoring and boards match authoring-and-boards.json; V1 native sources match archive-hashes.json. The rejected V1 board remains preserved for comparison.
- Actual native harness bytes match original restoration hash; no temporary Hero includes remain.
- Current authoring/composition Python files compile successfully. No standalone project lint/type-check command exists; not reported as passing.
- No new native build was needed for V2; native worker replayed the existing private executable. Reviewer did not run native code, GUI, full-scene generation, commit or push.

## Disposition
No technical blocker or clear visual defect found in this V2 candidate. Deliver the small board and ask the user to judge the handwriting style. Do not apply it to the full teaching scene before explicit confirmation.