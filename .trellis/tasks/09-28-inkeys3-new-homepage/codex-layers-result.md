Created:

- [build-showcase-layers.py](/D:/Project/Inkeys/website/scripts/build-showcase-layers.py)
- [layers-verify.json](/D:/Project/Inkeys/website/.trellis/tasks/09-28-inkeys3-new-homepage/layers-verify.json)

**Delivery is incomplete because Python execution is blocked:** the command runner returns `CreateProcessAsUserW: Access is denied`; the non-GUI fallback returns `EPERM`.

The exporter reuses the original compose functions, preserves paint order, bakes overview’s wash and diagonal seams into panel pixels, and separates tools’ brush/pattern coverage for normal alpha-over. It includes PNG reconstruction checks, decoded WebP checks, quality fallback, and byte-size reporting.

Static review completed; UTF-8/LF verified. **No WebPs, PNG intermediates, manifest, measured boxes, pixel metrics, or sizes were generated.** The report explicitly records unmeasured results as `null`.

To generate and verify everything once process execution works:

```powershell
python scripts/build-showcase-layers.py
```

I did not modify `media/`, existing components, or configuration. No GUI was opened and no commit was created.