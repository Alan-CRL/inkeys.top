// 独立托管生产放映分页场景，沿用 FrameTarget 的透明绘制事务。
#include "HeroCommon.inc"
#include "HeroScene.inc"

namespace HeroExport
{
	using Path = std::filesystem::path;
	using Clock = std::chrono::steady_clock;

	constexpr int CaptureZoom = 3;
	constexpr LONG CropPadding = 60;

	struct Context
	{
		std::ofstream log;
		int failures = 0;
		bool Check(HRESULT hr, const char* step)
		{
			log << step << " hr=" << std::hex << hr << std::dec << '\n';
			log.flush();
			if (FAILED(hr)) ++failures;
			return SUCCEEDED(hr);
		}
		bool Check(bool ok, const char* step) { return Check(ok ? S_OK : E_FAIL, step); }
	};

	// UI3 用这三个已应用值绘制常驻材质；离屏场景自行绑定样式即可。
	struct CaptureTheme
	{
		ThemeStyleState style;
		explicit CaptureTheme(bool dark)
		{
			style.darkStyle = dark;
			style.backgroundOpacity = 0;
			style.contentOpacity = 100;
			SetThemeStyleSource(&style);
		}
		~CaptureTheme() { SetThemeStyleSource(nullptr); }
	};

	void ExportPager(Context& context, const HeroScene::Scene& scene, const Path& directory, bool darkTheme)
	{
		// 对应 PageControl::BuildPageContent 的常态放映分支。首末页均可向宿主请求翻页。
		BarPageSurfaceContent content;
		content.surface = 0;
		content.whiteboard = false;
		content.pptActive = true;
		content.compact = false;
		content.currentPage = std::to_wstring(scene.currentPage);
		content.totalPage = L"/" + std::to_wstring(scene.totalPages);
		content.nextIsEndShow = Inkeys::UI::PageControl::IsPptEndPage(scene.currentPage, scene.totalPages);
		content.enabled = {true, true, true};
		content.interactive = {true, true, true};
		content.previousLabel = IW(I18nKey.UI.Bar.MainButtons.WhiteboardPreviousLabel);
		content.nextLabel = IW(content.nextIsEndShow ? I18nKey.UI.Bar.MainButtons.EndPresentationLabel :
			I18nKey.UI.Bar.MainButtons.WhiteboardNextLabel);

		BarPageSurface surface;
		FrameTarget target;
		surface.BindFrameTarget(&target);
		const LONG width = static_cast<LONG>(BarPptPaginationLongSideDip * CaptureZoom);
		const LONG height = static_cast<LONG>(BarPptPaginationShortSideDip * CaptureZoom);
		if (!context.Check(surface.ConfigurePagination(content) &&
			surface.SetBounds({0, 0, width, height}, CaptureZoom), "pager-configure")) return;
		surface.SetOpacity(1, 0);
		surface.SetIdleFade(false, 0);

		const auto origin = Clock::now();
		for (int frame = 0; frame <= 120; ++frame) {
			const auto time = origin + std::chrono::microseconds(16667LL * frame);
			(void)surface.Advance(time);
			const auto bounds = surface.PresentationBounds();
			const auto w = static_cast<UINT>(bounds.right - bounds.left);
			const auto h = static_cast<UINT>(bounds.bottom - bounds.top);
			const auto epoch = RenderPipeline::GetDeviceEpoch();
			surface.PrepareDeviceGeneration(epoch.generation);
			if (!context.Check(target.Ensure(epoch, w, h), "pager-resources")) return;
			auto* dc = target.DeviceContext();
			if (!context.Check(dc && target.TargetBitmap(), "pager-target")) return;
			target.BeginFrame(dc, D2D1::RectF(0, 0, static_cast<FLOAT>(w), static_cast<FLOAT>(h)));
			const auto result = surface.Render(dc, time);
			target.FinishDrawCommands(dc);
			if (!context.Check(target.EndFrame(dc), "pager-draw") ||
				!context.Check(result.rendered, "pager-render")) return;
			surface.CommitPresented();
			(void)surface.ConsumeDamage();
		}

		const auto layout = surface.Layout();
		const auto geometry = surface.Geometry();
		const auto& body = geometry.bodyBounds;
		if (!context.Check(layout.dpiScale == CaptureZoom && !geometry.layoutAnimating && geometry.opacity == 1 &&
			!surface.AnimationActive() && !surface.PopupAnimationActive() && !surface.LoadingIndicatorAnimationActive(),
			"pager-stable-layout")) return;
		if (!context.Check(body.right - body.left == 240 && body.bottom - body.top == 80, "pager-body-240x80")) return;

		// 验收读取实际绘制槽和场景已应用状态，避免只核对送入 ConfigurePagination 的夹具。
		BarPageSurfaceContent actual;
		if (!context.Check(surface.ReadSlideshowCaptureState(actual), "pager-idle-and-two-lines")) return;
		if (!context.Check(actual.surface == 0 && actual.pptActive && !actual.whiteboard && !actual.compact &&
			!actual.nextIsEndShow && !actual.switching && !actual.navigationWaitingPrevious &&
			!actual.navigationWaitingNext && actual.loadState == BarPageLoadState::None &&
			actual.menu == 0 && !actual.unsaved, "pager-stable-slideshow-state")) return;
		if (!context.Check(actual.previousLabel == L"Previous" && actual.nextLabel == L"Next" &&
			actual.currentPage == std::to_wstring(scene.currentPage) && actual.totalPage == L"/2",
			"pager-visible-labels-and-page-lines")) return;

		const char* keys[] = {"Previous", "Page", "Next"};
		constexpr size_t cellCount = 3;
		if (!context.Check(layout.buttons.size() >= 5 && layout.buttons[0].id == 1 &&
			layout.buttons[0].visible && layout.buttons[0].enabled, "pager-drag-handle")) return;
		for (size_t i = 0; i < cellCount; ++i) {
			const auto& cell = layout.buttons[i + 1];
			if (!context.Check(cell.id == i + 2 && cell.visible && cell.enabled && cell.interactive &&
				layout.buttons[i].localPixels.right <= cell.localPixels.left, keys[i])) return;
		}
		for (size_t i = 4; i < layout.buttons.size(); ++i)
			if (!context.Check(!layout.buttons[i].visible, "pager-extra-widgets-hidden")) return;

		const auto& logical = layout.logicalBounds;
		const auto& presented = layout.presentationBounds;
		// DrawingPose 把生产逻辑原点映射到 backing；主体尺寸来自栏体而非非透明像素范围。
		const double x = logical.left - presented.left, y = logical.top - presented.top;
		const double left = x + body.left * CaptureZoom, top = y + body.top * CaptureZoom;
		const double right = x + body.right * CaptureZoom, bottom = y + body.bottom * CaptureZoom;
		auto* bitmap = target.TargetBitmap();
		const auto size = bitmap->GetPixelSize();
		if (!context.Check(left >= CropPadding && top >= CropPadding &&
			right + CropPadding <= size.width && bottom + CropPadding <= size.height, "pager-crop-padding")) return;

		std::ofstream meta(directory / L"pager-body.json");
		meta << std::setprecision(15)
		     << "{\"canvas\":[" << size.width << ',' << size.height << "],\"body_rect\":["
		     << left << ',' << top << ',' << right << ',' << bottom << "],\"pixels_per_logical_unit\":"
		     << CaptureZoom << ",\"buttons\":{";
		for (size_t i = 0; i < cellCount; ++i) {
			const auto& rect = layout.buttons[i + 1].localPixels;
			if (i) meta << ',';
			meta << '"' << keys[i] << "\":[" << rect.left / double(CaptureZoom) - body.left
			     << ',' << rect.top / double(CaptureZoom) - body.top
			     << ',' << (rect.right - rect.left) / double(CaptureZoom)
			     << ',' << (rect.bottom - rect.top) / double(CaptureZoom) << ']';
		}
		meta << "}}\n";

		std::ofstream state(directory / L"pager-state.json");
		const auto ascii = [](const std::wstring& s) { return std::string(s.begin(), s.end()); };
		// 四个显示字符串已逐字验收为固定 ASCII，可直接写入 JSON。
		state << std::boolalpha << "{\"theme\":\"" << (darkTheme ? "dark" : "light")
		      << "\",\"state\":\"" << scene.state << "\",\"locale\":\"" << scene.locale
		      << "\",\"applied_dark\":" << (GetThemeLightWeight() == 0.0)
		      << ",\"applied_background_opacity\":" << GetThemeResidentBackgroundOpacityOverride() * 100
		      << ",\"applied_content_opacity\":" << GetThemeResidentContentOpacity() * 100
		      << ",\"surface\":" << actual.surface << ",\"whiteboard\":" << actual.whiteboard
		      << ",\"ppt_active\":" << actual.pptActive << ",\"compact\":" << actual.compact
		      << ",\"page_lines\":[\"" << ascii(actual.currentPage) << "\",\"" << ascii(actual.totalPage)
		      << "\"],\"next_is_end_show\":" << actual.nextIsEndShow << ",\"opacity\":" << geometry.opacity
		      << ",\"loading\":" << (actual.loadState != BarPageLoadState::None)
		      << ",\"waiting\":" << (actual.navigationWaitingPrevious || actual.navigationWaitingNext)
		      << ",\"cells\":[";
		const std::string labels[] = {ascii(actual.previousLabel), "Page", ascii(actual.nextLabel)};
		for (size_t i = 0; i < cellCount; ++i) {
			if (i) state << ',';
			state << "{\"key\":\"" << keys[i] << "\",\"label\":\"" << labels[i]
			      << "\",\"enabled\":" << layout.buttons[i + 1].enabled << '}';
		}
		state << "]}\n";
		state.flush();
		meta.flush();
		if (!context.Check(state.good() && meta.good(), "pager-metadata-write")) return;
		context.Check(HeroIo::SaveTarget(target.DeviceContext(), bitmap, directory / L"pager.png"), "pager-save");
	}

	int Export(const Path& directory)
	{
		std::filesystem::create_directories(directory);
		Context context;
		context.log.open(directory / L"export.log");
		if (!context.log) return 3;
		const auto scene = HeroScene::Load(directory / L"native-scene.txt");
		if (!context.Check(scene.has_value(), "fixture-valid")) return 3;
		wchar_t themeText[16]{};
		const auto themeLength = GetEnvironmentVariableW(L"INKEYS_SLIDESHOW_THEME", themeText, 16);
		if (!context.Check(themeLength > 0 && themeLength < 16, "theme-length")) return 3;
		const std::wstring theme(themeText, themeLength);
		const bool darkTheme = theme == L"dark";
		if (!context.Check(darkTheme || theme == L"light", "theme-valid")) return 3;

		globalPath = (std::filesystem::absolute(directory) / L"runtime-config").wstring() + L"\\";
		std::filesystem::create_directories(Path(globalPath) / L"Inkeys/Config");
		if (!context.Check(I18n::load(1, L"JSON", L"en-US") &&
			I18n::languageId() == MAKELANGID(LANG_ENGLISH, SUBLANG_ENGLISH_US), "i18n-en-US")) return 4;
		const CaptureTheme captureTheme(darkTheme);
		if (!context.Check(GetThemeLightWeight() == (darkTheme ? 0.0 : 1.0) &&
			GetThemeResidentBackgroundOpacityOverride() == 0 && GetThemeResidentContentOpacity() == 1,
			"theme-and-opacity-applied")) return 4;

		ExportPager(context, *scene, directory, darkTheme);
		context.log << "failures=" << context.failures << '\n';
		return context.failures ? 1 : 0;
	}
}
