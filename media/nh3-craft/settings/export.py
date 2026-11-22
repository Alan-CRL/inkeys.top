"""Build the S5-B no-window settings exporter and publish its six native layers."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from xml.sax.saxutils import escape

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from glass import solid_regions, thin_backdrop  # noqa: E402

BUILD = HERE / "build"
WEB = HERE.parents[2] / "docs/.vuepress/public/new-index3/craft"
DIMENSIONS = (1440, 1050)
LOCALES = ("zh-CN", "zh-TW", "en-US")
THEMES = ("light", "dark")
# 产品 BlurBehind 调色板的 AppBase（alpha 204）。
APP_BASE = {"light": (243, 243, 243), "dark": (32, 32, 32)}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_if_changed(path, data):
    if not path.exists() or path.read_bytes() != data:
        path.write_bytes(data)


def replace_one(text, old, new):
    if text.count(old) != 1:
        raise ValueError(f"Upstream source anchor changed: {old[:70]}")
    return text.replace(old, new)


def prepare(repo):
    test = repo / "InkeysHeadlessTests"
    overlay = BUILD / "overlay"
    overlay.mkdir(parents=True, exist_ok=True)
    # 只在隔离目录中替换离屏入口，产品代码、原生测试和主工程均不写入。
    design = (test / "setting_design_tests.cpp").read_text("utf-8-sig")
    design = replace_one(design, "const auto fontDirectory = FindFontDirectory();", "const auto fontDirectory = std::filesystem::path(std::getenv(\"S5B_FONTS\"));")
    design = replace_one(design, "if(warpOnly) return checks.failures+RunSettingHomeWarpProbe(fonts[0],fonts[1],fonts.back());",
        """if (warpOnly) {
            const char* language = std::getenv("S5B_LANGUAGE");
            if (!language || !LoadNavigationLabels(fontDirectory, language)) return 1;
            const int font = std::strcmp(language, "zh-TW") == 0 ? 2 : 0;
            // 标题栏沿用产品 Legacy 字体，正文与导航使用 Design 校准字体。
            auto captionConfig = Design::FreeTypeTextFontConfig(false, Design::TextFontRole::Legacy, false);
            auto* caption = ImGui::GetIO().Fonts->AddFontFromMemoryTTF(sources[font].bytes.data(),
                static_cast<int>(sources[font].bytes.size()), Design::FontReferenceSize, &captionConfig);
            auto glyphConfig = Design::IconFontConfig(scale);
            glyphConfig.MergeMode = true;
            glyphConfig.GlyphOffset.y = 10;
            glyphConfig.FontLoader = ImFontAtlasGetFontLoaderForStbTruetype();
            if (!caption || !ImGui::GetIO().Fonts->AddFontFromMemoryTTF(sources.back().bytes.data(),
                static_cast<int>(sources.back().bytes.size()), 36, &glyphConfig)) return 1;
            ImGui::GetIO().FontDefault = caption;
            return checks.failures + RunSettingHomeWarpProbe(fonts[font], fonts[font+1], fonts.back());
        }""")
    # 保留原测试的校准字体和同字重 fallback 组合，在 150% DPI 直接栅格化。
    anchor = "for (const float scale : { 1.0F, 1.25F, 1.5F, 2.0F, 1.875F, 3.0F, 4.0F })"
    index = design.index("int RunSettingDesignTests(")
    design = design[:index] + replace_one(design[index:], anchor, "for (const float scale : { 1.5F })")
    warp = (test / "setting_home_warp_tests.cpp").read_text("utf-8-sig")
    warp = replace_one(warp, '<<Width<<L" height="<<Height<<L"\\n"', '<<targetWidth<<L" height="<<targetHeight<<L"\\n"')
    warp = replace_one(warp, "int RunSettingHomeWarpProbe(ImFont* regular, ImFont* strong, ImFont* icons)",
                       "int OriginalHomeWarpProbe(ImFont* regular, ImFont* strong, ImFont* icons)")
    version = re.search(r'editionVersion\s*=\s*L"([\w.-]+)"', (repo/"Inkeys/IdtMain.cpp").read_text("utf-8-sig"))[1]
    warp += '\n#define S5B_EDITION "' + version + '"\n#include "HomeCapture.inc"\n'
    write_if_changed(overlay/"setting_design_tests.cpp", design.encode())
    write_if_changed(overlay/"setting_home_warp_tests.cpp", warp.encode())
    write_if_changed(overlay/"HomeCapture.inc", (HERE/"HomeCapture.inc").read_bytes())
    native = (repo/'Inkeys/Inkeys/UI/Setting/Setting.cpp').read_text('utf-8-sig')
    caption = native[native.index('[[nodiscard]] ImRect ToImRect('):native.index('[[nodiscard]] bool IsSettingCaptionHit(')]
    caption = replace_one(caption, 'Widgets::Color(color)', 'ImGui::ColorConvertFloat4ToU32(ImFluent::GetStyle().Colors[color])')
    caption = replace_one(caption, '* settingGlobalScale;', '* CaptureScale;')
    write_if_changed(overlay/'CaptionButtons.inc', caption.encode())
    # 私有项目导入仅定向两个离屏测试编译单元。
    props = f"""<Project><ItemGroup Condition="'$(MSBuildProjectName)'=='InkeysHeadlessTests'">
      <ClCompile Remove="setting_home_warp_tests.cpp;setting_design_tests.cpp"/>
      <ClCompile Include="{escape(str(overlay/'setting_home_warp_tests.cpp'))};{escape(str(overlay/'setting_design_tests.cpp'))}">
        <AdditionalIncludeDirectories>{escape(str(test))};%(AdditionalIncludeDirectories)</AdditionalIncludeDirectories>
        <PreprocessorDefinitions>_CRT_SECURE_NO_WARNINGS;%(PreprocessorDefinitions)</PreprocessorDefinitions>
      </ClCompile>
    </ItemGroup></Project>"""
    write_if_changed(BUILD/"capture.targets", props.encode())
    return version


def build(repo):
    version = prepare(repo)
    vswhere = Path(os.environ['ProgramFiles(x86)']) / 'Microsoft Visual Studio/Installer/vswhere.exe'
    vs = subprocess.check_output([vswhere, '-latest', '-products', '*', '-property', 'installationPath'], text=True).strip()
    msbuild = Path(vs) / 'MSBuild/Current/Bin/arm64/MSBuild.exe'
    env = {k: v for k, v in os.environ.items() if k.upper() != 'PATH'}
    env.update(Path=os.environ['PATH'], MSBUILDDISABLENODEREUSE='1', DOTNET_CLI_HOME=str(BUILD))
    # solution 的测试目标另有启动整套应用的依赖，仅本次私有副本选取 headless。
    solution = (repo/'InkeysRepo.sln').read_text('utf-8-sig')
    solution = re.sub(r'^\s*ProjectSection\(ProjectDependencies\) = postProject.*?EndProjectSection\n', '\n', solution, flags=re.M|re.S)
    solution = re.sub(r'^(Project\([^)]+\) = "[^"]+", ")([^"]+\.(?:vcxproj|csproj))(")', lambda m: m[1] + str(repo/m[2]) + m[3], solution, flags=re.M)
    write_if_changed(BUILD/'InkeysRepo.sln', solution.encode('utf-8-sig'))
    args = [msbuild, BUILD/'InkeysRepo.sln', '/t:InkeysHeadlessTests', '/p:BuildProjectReferences=false',
            '/p:Configuration=Debug', '/p:Platform=ARM64', '/m:2', '/nr:false', '/nologo', '/v:minimal',
            '/p:VcpkgManifestInstall=false', f'/p:OutDir={BUILD}/bin/', f'/p:IntDir={BUILD}/headless-obj/',
            f'/p:ForceImportBeforeCppTargets={BUILD}/capture.targets']
    with (BUILD/'msbuild.log').open('wb') as log:
        subprocess.run(args, cwd=repo, stdout=log, stderr=subprocess.STDOUT, env=env, check=True, timeout=1800)
    return version


def run(repo):
    version = build(repo)
    assets = repo/'Inkeys/src'
    for name, path, size in [('icon', assets/'icon.ico', 64), ('avatar',assets/'setting/Profile_Picture.png',67),
                             ('feedback',assets/'setting/Home_Feedback.png',150)]:
        with Image.open(path) as src:
            bitmap = src.convert('RGBA').resize((size,size), Image.Resampling.LANCZOS)
            if name == 'feedback':
                mask = bitmap.getchannel('A')
                bitmap = Image.new('RGBA', bitmap.size, 'white')
                bitmap.putalpha(mask)
            (BUILD/(name+'.rgba')).write_bytes(bitmap.tobytes())
    exe = BUILD/'bin/InkeysHeadlessTests.exe'
    report = {'version': version, 'revision': subprocess.check_output(['git','-C',repo,'rev-parse','HEAD'],text=True).strip(),
              'renderer': 'D3D11 WARP, Debug|ARM64, InkeysHeadlessTests', 'dpi': 1.5, 'size': DIMENSIONS,
              'exeSha256': digest(exe), 'buildLogSha256': digest(BUILD/'msbuild.log'),
              'adapterSha256': {p.name:digest(p) for p in (HERE/'export.py',HERE/'HomeCapture.inc',HERE.parent/'glass.py')}, 'captures': []}
    WEB.mkdir(parents=True,exist_ok=True)
    staging = BUILD / 'verified'
    staging.mkdir(exist_ok=True)
    for locale in LOCALES:
        for theme in THEMES:
            label = f'settings-{locale}-{theme}'
            log = BUILD/(label+'.log')
            env = dict(os.environ, INKEYS_FONT_WARP_ONLY='1', S5B_LANGUAGE=locale, S5B_THEME=theme, S5B_FONTS=str(assets/'ttf'))
            with log.open('wb') as handle:
                subprocess.run([exe,'--no-window','--setting-home-only'], cwd=BUILD, env=env, stdout=handle,
                               stderr=subprocess.STDOUT, check=True, timeout=180)
            if b'S5B_NATIVE failures=0' not in log.read_bytes():
                raise RuntimeError(f'Missing render marker: {log}')
            pixels = np.fromfile(BUILD/'frame.rgba', dtype=np.uint8).reshape(DIMENSIONS[1], DIMENSIONS[0], 4)
            alpha = pixels[:,:,3:4].astype(np.uint32)
            colors = pixels[:,:,:3].astype(np.uint32)
            if np.count_nonzero(alpha == 204) < alpha.size / 10 or np.count_nonzero(alpha == 255) < 1000:
                raise ValueError('Expected translucent shell and opaque foreground')
            # WARP readback 为预乘 RGBA，网页 PNG 使用直通 alpha。
            pixels[:,:,:3] = np.minimum(255, (colors * 255 + alpha//2) // np.maximum(alpha,1))
            # 网页上窗底比原生更通透：只把 80% 的 AppBase 换成 glass 的统一不透明度，横幅等卡片区域保持原生像素。
            cards = solid_regions(pixels[:,:,3], 236, 20000)
            pixels = thin_backdrop(pixels, APP_BASE[theme], 204, ~cards)
            out = staging/(label+'.png')
            Image.fromarray(pixels).save(out, optimize=True)
            report['captures'].append({'file':out.name,'sha256':digest(out),'logSha256':digest(log),
                                       'localeSha256':digest(assets/'i18n'/(locale+'.jsonc'))})
            print(label, out.stat().st_size, flush=True)
    for key, paths in [('fonts', sorted((assets/'ttf').glob('*.ttf'))),('native', [
            repo/'Inkeys/Inkeys/UI/Setting'/name for name in ('Setting.cpp','Setting.Pages.cpp','Setting.Controls.cpp','Setting.Shell.cpp')
        ] + [repo/'InkeysHeadlessTests'/name for name in ('setting_design_tests.cpp','setting_home_warp_tests.cpp')])]:
        report[key] = {p.name:digest(p) for p in paths}
    if len({entry['sha256'] for entry in report['captures']}) != 6:
        raise ValueError('Expected six distinct native images')
    # 六组都通过才发布，失败的局部重跑不会让网页混入半套图片。
    for entry in report['captures']:
        (staging / entry['file']).replace(WEB / entry['file'])
    (HERE/'capture-manifest.json').write_text(json.dumps(report,indent=2)+'\n', encoding='utf-8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(__doc__)
    parser.add_argument('repository', type=Path)
    run(parser.parse_args().repository.resolve())

