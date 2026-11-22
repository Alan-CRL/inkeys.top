// 此适配在产品已有的无窗口 WARP 测试单元中编译，直接使用其 device、staging、shader 与 GPU 读回。
#include "../Inkeys/IdtI18n.h"
#include "../Inkeys/IdtI18nKeys.g.h"
#include "imfluent/imfluent_internal.h"

namespace
{
	namespace Setting = Inkeys::UI::Setting;
	constexpr float CaptureScale = 1.5F;
	constexpr UINT CaptureWidth = 1560, CaptureHeight = 975;
	#include "CaptionButtons.inc"

	struct HomeImages
	{
		ComPtr<ID3D11ShaderResourceView> icon, avatar, feedback;

		static bool Load(Offscreen& gpu, Checks& checks, const char* path,
			UINT extent, ComPtr<ID3D11ShaderResourceView>& view)
		{
			std::ifstream input(path, std::ios::binary);
			std::vector<char> data{std::istreambuf_iterator<char>(input), {}};
			if (!checks.Expect(data.size() == extent * extent * 4, "source texture byte count")) return false;
			D3D11_TEXTURE2D_DESC desc{};
			desc.Width = desc.Height = extent;
			desc.ArraySize = desc.MipLevels = desc.SampleDesc.Count = 1;
			desc.Usage = D3D11_USAGE_IMMUTABLE;
			desc.Format = DXGI_FORMAT_R8G8B8A8_UNORM;
			desc.BindFlags = D3D11_BIND_SHADER_RESOURCE;
			D3D11_SUBRESOURCE_DATA initial{data.data(), extent * 4, 0};
			ComPtr<ID3D11Texture2D> texture;
			return checks.Result(gpu.device->CreateTexture2D(&desc, &initial, &texture), "upload product texture")
				&& checks.Result(gpu.device->CreateShaderResourceView(texture.Get(), nullptr, &view), "product texture view");
		}
	};

	// 无 HWND 时直接供应 client 尺寸；标题栏复用原生 geometry、Fluent、资源与图标。
	void DrawCaption(Design::NavigationState& navigation, const HomeImages& images)
	{
		const auto title = IA(I18nKey.SettingsUI.N);
		ImFluent::PushFont(ImFluentTextStyle_Caption);
		const auto titleSize = ImGui::CalcTextSize(title.c_str());
		const auto versionSize = ImGui::CalcTextSize(S5B_EDITION);
		ImFluent::PopFont();
		const auto geometry = Setting::ResolveTitleBarGeometry(CaptureWidth, CaptureScale,
			Setting::TitleBarCaptionButtonWidthDip * CaptureScale, titleSize.x, versionSize.x);
		if (!ImFluent::BeginTitleBar(nullptr, geometry.height)) return;
		auto* draw = ImGui::GetWindowDrawList();
		const auto origin = ImGui::GetWindowPos();
		auto bounds = [origin](const Setting::LayoutRect& r) {
			return ImRect(origin.x + r.left, origin.y + r.top, origin.x + r.right, origin.y + r.bottom);
		};
		const auto icon = bounds(geometry.icon);
		draw->AddImage((ImTextureID)(intptr_t)images.icon.Get(), icon.Min, icon.Max);
		const ImU32 color = ImFluent::GetColorU32(ImFluentCol_TextPrimary);
		ImFluent::PushFont(ImFluentTextStyle_Caption);
		const float x = icon.Max.x + Setting::TitleBarContentSpacingDip * CaptureScale;
		const ImVec4 clip{x, origin.y, bounds(geometry.identity).Max.x, origin.y + geometry.height};
		draw->AddText(ImGui::GetFont(), ImGui::GetFontSize(),
			{x, origin.y + (geometry.height - ImGui::GetFontSize()) * .5F}, color, title.c_str(), nullptr, 0, &clip);
		if (geometry.versionVisible)
		{
			const auto r = bounds(geometry.version);
			draw->AddText({r.Min.x + (r.GetWidth() - versionSize.x) * .5F,
				r.Min.y + (r.GetHeight() - versionSize.y) * .5F}, color, S5B_EDITION);
		}
		ImFluent::PopFont();
		auto glyph = [&](const Setting::LayoutRect& rect, const char* text, float dip) {
			const auto r = bounds(rect);
			ImFluent::DrawIcon(text, r.Min, r.Max, dip, color);
		};
		glyph(geometry.themeToggle, Design::IsDarkMode() ? "\ue706" : "\ue708", Design::NavigationGlyphSize);
		Design::RenderFeedbackButton(geometry.feedback, false, navigation);
		Design::RenderDebugButton(geometry.debug, false, navigation);
		ImFluent::PushFont(ImFluentTextStyle_Body);
		RenderSettingCaptionButton(draw, nullptr, origin, geometry.minimize, "\ue921", false, true);
		RenderSettingCaptionButton(draw, nullptr, origin, geometry.maximize, "\ue922", false, true);
		RenderSettingCaptionButton(draw, nullptr, origin, geometry.close, "\ue8bb", true, true);
		ImFluent::PopFont();
		ImFluent::EndTitleBar();
	}

	void HomeFrame(Design::NavigationState& navigation, Design::HomeMotionState& motion,
		const HomeImages& images, ImFont* regular, ImFont* strong)
	{
		auto& io = ImGui::GetIO();
		io.DisplaySize = {float(CaptureWidth), float(CaptureHeight)};
		io.DisplayFramebufferScale = {1, 1};
		io.DeltaTime = 1.0F / 60;
		io.AddMousePosEvent(Away.x, Away.y);
		ImGui_ImplDX11_NewFrame();
		ImGui::NewFrame();
		ImFluent::PushFluentStyle();
		ImGui::SetNextWindowPos({0, 0});
		ImGui::SetNextWindowSize(io.DisplaySize);
		ImGui::PushStyleColor(ImGuiCol_Border, ImFluent::GetColorU32(ImFluentCol_SurfaceStrokeDefault));
		ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, {0, 0});
		ImGui::PushStyleVar(ImGuiStyleVar_WindowRounding, Setting::WindowCornerRadiusDip * CaptureScale);
		ImGui::Begin("##native-settings", nullptr, ImGuiWindowFlags_NoTitleBar | ImGuiWindowFlags_NoResize
			| ImGuiWindowFlags_NoCollapse | ImGuiWindowFlags_NoSavedSettings | ImGuiWindowFlags_NoScrollbar
			| ImGuiWindowFlags_NoScrollWithMouse);
		ImGui::PopStyleVar(2);
		ImGui::PopStyleColor();
		navigation.Resize(CaptureWidth / CaptureScale);
		Design::AdvanceNavigationAnimations(navigation, 0, false, 1);
		Design::ConfigureRowAnimations(0, false, 1);
		Design::ConfigureHomeMotion(motion, true, 1, 0, false, 1);
		const auto shell = Design::ResolveShellGeometry(CaptureWidth/CaptureScale, CaptureHeight/CaptureScale, navigation);
		Design::BindTextFonts(io.FontDefault, strong);
		DrawCaption(navigation, images);
		Design::BindTextFonts(regular, strong);
		// 产品的 BlurBehind 模式只在根窗口画一次 AppBase，侧栏和正文直接透出同一层。
		const auto& content = shell.content;
		ImGui::SetCursorPos({Design::Pixels(content.left), Design::Pixels(content.top)});
		ImGui::PushStyleColor(ImGuiCol_ChildBg, IM_COL32(0,0,0,0));
		ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, {Design::Pixels(shell.gutter), Design::Pixels(28)});
		Design::BeginScrollChild("##setting-content", {Design::Pixels(content.Width()), Design::Pixels(content.Height())},
			ImGuiChildFlags_AlwaysUseWindowPadding, 0, false, false, true);
		ImGui::PopStyleVar();
		ImGui::PopStyleColor();
		const auto clip = ImGui::GetCurrentWindow()->ClipRect;
		Design::ConfigureHomeEntryViewport(motion, {0, Design::Pixels(32), io.DisplaySize.x, io.DisplaySize.y},
			{clip.Min.x, clip.Min.y, clip.Max.x, clip.Max.y});
		const auto available = ImGui::GetContentRegionAvail().x;
		const auto width = (std::min)(available, Design::Pixels(Design::PageMaximumWidth));
		ImGui::SetCursorPosX(ImGui::GetCursorPosX() + (available-width)*.5F);
		Design::BeginScrollChild("##setting-page-content", {width,0}, ImGuiChildFlags_AutoResizeY);
		Design::RenderHome({0, 1, S5B_EDITION, (ImTextureID)(intptr_t)images.avatar.Get(),
			(ImTextureID)(intptr_t)images.feedback.Get(), 1}, &motion);
		ImGui::EndChild();
		Design::CompleteHomeEntryLayout(motion);
		ImGui::EndChild();
		Design::RenderNavigationPane(shell, navigation, {}, true);
		ImGui::End();
		ImFluent::PopFluentStyle();
		ImGui::Render();
	}
}

int RunSettingHomeWarpProbe(ImFont* regular, ImFont* strong, ImFont* icons)
{
	Checks checks;
	Offscreen renderer;
	renderer.targetWidth = CaptureWidth;
	renderer.targetHeight = CaptureHeight;
	if (!renderer.Initialize(checks)) return 1;
	HomeImages images;
	if (!images.Load(renderer, checks, "icon.rgba", 64, images.icon)
		|| !images.Load(renderer, checks, "avatar.rgba", 67, images.avatar)
		|| !images.Load(renderer, checks, "feedback.rgba", 150, images.feedback)) return 1;
	const char* theme = std::getenv("S5B_THEME");
	if (!theme || (std::strcmp(theme, "light") && std::strcmp(theme, "dark"))) return 1;
	Design::ApplyPalette(std::strcmp(theme, "dark") == 0, Setting::BackdropMode::Acrylic);
	ImFluent::GetStyle().NavItemHeight = 36;
	ImFluent::GetStyle().Colors[ImFluentCol_SolidBgBase].w = 0;
	ImGui::GetStyle().ScrollbarSize = Design::Pixels(Design::ScrollbarTrackSize);
	Design::BindTextFonts(regular, strong);
	ImFluent::SetIconFont(icons);
	Design::NavigationState navigation;
	Design::HomeMotionState motion;
	Pixels previous, current;
	int identical = 0;
	for (int frame = 0; frame < 120; ++frame)
	{
		HomeFrame(navigation, motion, images, regular, strong);
		if (!renderer.Submit(checks, ImGui::GetDrawData(), &current)) return 1;
		identical = previous == current ? identical + 1 : 0;
		if (frame >= 20 && identical >= 3)
		{
			if (!checks.Expect(!motion.EntryActive() && motion.brandVisible && navigation.Expanded(), "settled home and expanded navigation"))
				return 1;
			std::ofstream out("frame.rgba", std::ios::binary);
			out.write(reinterpret_cast<const char*>(current.data()), current.size() * sizeof(current[0]));
			out.close();
			if (!out) return 1;
			std::cout << "S5B_NATIVE failures=0 frames=" << frame+1 << " identical=" << identical
				<< " edition=" << S5B_EDITION << " locale=" << std::getenv("S5B_LANGUAGE") << " theme=" << theme << "\n";
			return checks.failures;
		}
		previous.swap(current);
	}
	return 1;
}
