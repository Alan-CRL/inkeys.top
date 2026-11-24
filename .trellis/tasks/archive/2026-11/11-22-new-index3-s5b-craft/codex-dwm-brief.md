# Read-only investigation: how the Inkeys 3 settings window is composited by DWM

You are working read-only in the Inkeys 3 app repository (C++ / Dear ImGui / D3D11, Windows). Do not modify any files. Answer every numbered section with `file:line` evidence. If something cannot be found, write "not found" instead of guessing.

## Context

The product website shows a static export of the settings window's home page placed over a mountain wallpaper. The export is produced by an off-screen adapter that lives in the website repo:

- `D:/Project/Inkeys/website/media/nh3-craft/settings/HomeCapture.inc` (draws one frame of the settings home with WARP; comment says "the product's BlurBehind mode only draws AppBase once on the root window, nav pane and content show through the same layer")
- `D:/Project/Inkeys/website/media/nh3-craft/settings/export.py` (reads back premultiplied RGBA and converts to straight alpha)

The resulting PNG (1560×975 px, 150% DPI, 1040×650 DIP) has alpha 204 on the root/nav/content background, alpha 240 on cards, 255 on text. On the website we blur the wallpaper behind the window with CSS `backdrop-filter: blur(18px)` and composite the PNG on top. The owner says this does not look like the real app: on a real machine the DWM transparency lets the desktop show through clearly, and different blocks have different transparency. We need to know exactly what the real compositing chain is, so the website can imitate "the app placed directly on top of this wallpaper".

## Questions

1. **Window composition setup.** Find where the settings window (and its swap chain) is created. Which DWM / composition APIs are used: `DwmSetWindowAttribute` (`DWMWA_SYSTEMBACKDROP_TYPE`, `DWMWA_USE_IMMERSIVE_DARK_MODE`, `DWMWA_WINDOW_CORNER_PREFERENCE`, ...), `DwmExtendFrameIntoClientArea`, `DwmEnableBlurBehindWindow`, `SetWindowCompositionAttribute` / `ACCENT_*` (with the gradient colour value), DirectComposition, layered windows, `DXGI_ALPHA_MODE_*`? List every material/backdrop mode the code supports (e.g. "BlurBehind", Mica, Acrylic, opaque) and which one is the default on Windows 11 and on Windows 10. Note any OS-version branching.

2. **What DWM actually does behind the client area** in the default mode: is the content behind the window blurred (by whom, which API), is there a system tint/luminosity/noise layer added by DWM, or is it plain per-pixel alpha with no blur? If the product draws its own tint, find the colour/alpha. If it uses an ACCENT gradient colour, decode its ABGR value.

3. **Per-region colours and alpha in the default mode, both light and dark theme**, for the settings home page: root window background (AppBase), title bar, navigation pane, content area, nav item selected/hover fill, the home hero/banner card (the "Inkeys" wordmark card), the "open source and free" section, buttons, dividers, the window border stroke. Give the final RGBA values (resolve theme tokens) and whether each is drawn on top of AppBase (so alphas stack) or alone. Identify which regions are the most and least transparent.

4. **Does the export adapter match the product?** Compare `HomeCapture.inc` with the product's real settings render path (`Inkeys/Inkeys/UI/Setting/*.cpp` etc.). Point out any difference that would make the export more opaque or differently tinted than the real window (e.g. missing transparency mode, extra AppBase fill, different card alpha, theme tokens for a different material mode).

5. **Premultiplied alpha.** Is the swap chain / readback premultiplied? Is export.py's conversion `straight = premul * 255 / alpha` the right inverse? If the product swap chain is presented as straight alpha or `DXGI_ALPHA_MODE_IGNORE`, say so.

6. **Window size and home page length.** Default and minimum size of the settings window in DIP. On the home page, list the vertical layout from top to bottom in DIP (title bar, page header "主页/Home", hero card, open-source section, any further sections, and the copyright/footer line at the bottom). At what client height (DIP, at width 1040) is the copyright line fully visible without scrolling? Does the adapter's `ConfigureHomeEntryViewport` / scroll child support a taller capture height without code changes other than `CaptureHeight`?

## Output

A Markdown report with one section per question, each claim with `file:line`. End with a short "Recommendation for the website" section: the minimal set of layers (blur radius if any, tint colour, per-region alpha) that reproduces the real look over an arbitrary wallpaper.
