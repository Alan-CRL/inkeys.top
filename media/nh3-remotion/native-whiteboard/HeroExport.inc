// 从主栏离屏适配复用真实渲染事务；白板工作区与分页均不需要 HWND。
#include "HeroCommon.inc"
#include "HeroScene.inc"

namespace HeroExport
{
	using Path = std::filesystem::path;
	using Clock = std::chrono::steady_clock;

	constexpr int CaptureZoom = 3;
	constexpr LONG ScreenWidth = 3840, ScreenHeight = 2160;

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

	void WriteStateHeader(std::ostream& state, const HeroScene::Scene& scene, bool darkTheme)
	{
		const auto& style = barUISet.barStyle;
		state << std::boolalpha << "{\"theme\":\"" << (darkTheme ? "dark" : "light")
		      << "\",\"state\":\"" << scene.state << "\",\"locale\":\"" << scene.locale
		      << "\",\"whiteboard\":" << WhiteboardActive()
		      << ",\"presentation\":" << PptPresentationActive()
		      << ",\"requested_dark\":" << style.requestedDarkStyle.load()
		      << ",\"applied_dark\":" << static_cast<bool>(style.darkStyle)
		      << ",\"requested_background_opacity\":" << style.requestedBackgroundOpacity.load()
		      << ",\"applied_background_opacity\":" << style.backgroundOpacity
		      << ",\"requested_content_opacity\":" << style.requestedContentOpacity.load()
		      << ",\"applied_content_opacity\":" << style.contentOpacity
		      << ",\"select_clickthrough_mode\":" << GetSelectAndClickThroughMode();
	}

	void WriteBodyHeader(std::ostream& meta, D2D1_SIZE_U size, double zoom,
		double left, double top, double right, double bottom)
	{
		meta << std::setprecision(15)
		     << "{\"canvas\":[" << size.width << ',' << size.height << "],\"body_rect\":["
		     << left << ',' << top << ',' << right << ',' << bottom
		     << "],\"pixels_per_logical_unit\":" << zoom << ",\"buttons\":{";
	}

	void ExportToolbar(Context& context, const HeroScene::Scene& scene, const Path& directory, bool darkTheme)
	{
		auto& owner = barUISet;
		const COLORREF white = RGBA(255, 255, 255, 255);
		const auto applyPen = [&] {
			ChangeStateModeToPen();
			ChangeStateModeToPenTool(PenToolSelectionEnum::SoftPen);
			SetPenColor(white, false);
		};
		applyPen();
		owner.barMedia.LoadFormat();
		owner.spec.ConfigureLocalizedTypography();
		owner.UpdateRendering(false);
		unsigned presents = 0;
		auto callback = CreateBarOffscreenRenderCallback(owner, [&](const UPDATELAYEREDWINDOWINFO&) {
			++presents;
			return TRUE;
		});
		const auto origin = Clock::now();
		unsigned ordinal = 0;
		const auto tick = [&] {
			RenderPipeline::FrameContext frame;
			frame.epoch = RenderPipeline::GetDeviceEpoch();
			frame.frameTime = origin + std::chrono::microseconds(16667LL * ordinal++);
			(void)callback(frame);
		};
		for (int frame = 0; frame < 100; ++frame) tick();
		SetCurrentPageHasContent(true);
		applyPen();
		// 复用 Draw3 的历史可用性通知。离屏没有 Draw3 Host，安装器仅在此入口保留通知值。
		owner.NoteRecallHistoryAvailability(true, false);
		owner.barState.fold = false;
		owner.UpdateRendering(false);
		const auto beforePresent = presents;
		for (int frame = 0; frame < 240; ++frame) tick();
		if (!context.Check(presents > beforePresent, "toolbar-presented")) return;

		const auto actual = GetCommittedStateModeSnapshot();
		const auto actualColor = GetPenColor(actual);
		const auto recall = owner.RecallChromeView();
		if (!context.Check(actual.StateModeSelect == StateModeSelectEnum::IdtPen && !actual.laserActive &&
			actual.Pen.ModeSelect == PenModeSelectEnum::IdtPenSoftPen && actualColor == white, "actual-soft-pen"))
			return;
		if (!context.Check(recall.undoEnabled && !recall.redoEnabled && !owner.barState.fold, "actual-history-expanded"))
			return;

		struct ExpectedButton { BarButtonPresetEnum preset; const char* key; const wchar_t* label; bool selected; };
		const ExpectedButton expected[] = {
			{BarButtonPresetEnum::Select, "Move", L"Move", false},
			{BarButtonPresetEnum::Draw, "Soft Pen", L"Soft Pen", true},
			{BarButtonPresetEnum::Geometry, "Shapes", L"Shapes", false},
			{BarButtonPresetEnum::Eraser, "Erase", L"Erase", false},
			{BarButtonPresetEnum::Recall, "Undo", L"Undo", false},
			{BarButtonPresetEnum::Clean, "Clear", L"Clear", false},
			{BarButtonPresetEnum::More, "More", L"More", false},
			{BarButtonPresetEnum::Whiteboard, "Close", L"Close", true},
		};
		std::vector<const BarButtonClass*> buttons;
		for (const auto& entry : owner.barButtonSet.MainLayoutSnapshot()) {
			if (!entry.visible || !entry.identity) continue;
			const auto preset = entry.identity->preset.load();
			if (!context.Check(preset != BarButtonPresetEnum::Freeze && preset != BarButtonPresetEnum::Pierce,
				"no-freeze-or-click-through")) return;
			if (preset != BarButtonPresetEnum::Divider) buttons.push_back(entry.identity);
		}
		if (!context.Check(buttons.size() == std::size(expected), "eight-visible-buttons")) return;
		for (size_t i = 0; i < buttons.size(); ++i) {
			const auto* button = buttons[i];
			const auto& want = expected[i];
			if (!context.Check(button->preset.load() == want.preset && button->name.content.GetVal() == want.label &&
				(button->state->state.load() == BarWidgetState::Selected) == want.selected, want.key)) return;
			if (i && !context.Check(static_cast<double>(buttons[i - 1]->button.inhX) < static_cast<double>(button->button.inhX),
				"toolbar-left-to-right")) return;
		}

		auto* dc = owner.spec.GetDeviceContext();
		auto* bitmap = owner.spec.GetTargetBitmap();
		if (!context.Check(dc && bitmap && owner.barStyle.zoom == CaptureZoom, "toolbar-target-and-zoom")) return;
		const auto body = owner.shapeMap[BarUISetShapeEnum::MainBar];
		const auto main = owner.superellipseMap[BarUISetSuperellipseEnum::MainButton];
		D2D1_MATRIX_3X2_F transform{};
		dc->GetTransform(&transform);
		if (!context.Check(transform._11 == 1 && transform._22 == 1 &&
			transform._12 == 0 && transform._21 == 0, "toolbar-translation-only")) return;

		// 浮动布局取生产主按钮与主栏实体的并集；阴影和光晕保留在主体外。
		const double left = (std::min)(static_cast<double>(body->inhX), static_cast<double>(main->inhX));
		const double top = (std::min)(static_cast<double>(body->inhY), static_cast<double>(main->inhY));
		const double right = (std::max)(body->inhX + body->w.val, main->inhX + main->w.val);
		const double bottom = (std::max)(body->inhY + body->h.val, main->inhY + main->h.val);
		std::ofstream meta(directory / L"toolbar-body.json");
		WriteBodyHeader(meta, bitmap->GetPixelSize(), CaptureZoom,
			left * CaptureZoom + transform._31, top * CaptureZoom + transform._32,
			right * CaptureZoom + transform._31, bottom * CaptureZoom + transform._32);
		const auto writeButton = [&](const char* key, const auto& shape) {
			meta << '"' << key << "\":[" << static_cast<double>(shape.inhX) - left
			     << ',' << static_cast<double>(shape.inhY) - top << ',' << shape.w.val << ',' << shape.h.val << ']';
		};
		writeButton("MainButton", *main);
		for (size_t i = 0; i < buttons.size(); ++i) {
			meta << ',';
			writeButton(expected[i].key, buttons[i]->button);
		}
		meta << "}}\n";

		std::ofstream state(directory / L"toolbar-state.json");
		WriteStateHeader(state, scene, darkTheme);
		state << ",\"pen\":\"soft\",\"pen_rgb\":\"FFFFFF\",\"undo\":" << recall.undoEnabled
		      << ",\"redo\":" << recall.redoEnabled << ",\"buttons\":[";
		for (size_t i = 0; i < buttons.size(); ++i) {
			if (i) state << ',';
			// 上方已对每个生产标签逐字比较，确认 en-US ASCII 后直接写入 JSON。
			state << "{\"label\":\"" << expected[i].key << "\",\"selected\":"
			      << (buttons[i]->state->state.load() == BarWidgetState::Selected) << '}';
		}
		state << "]}\n";
		state.flush();
		meta.flush();
		context.Check(state.good() && meta.good(), "toolbar-metadata-write");
		context.Check(HeroIo::SaveTarget(dc, bitmap, directory / L"toolbar.png"), "toolbar-save");
	}

	void ExportPager(Context& context, const HeroScene::Scene& scene, const Path& directory, bool darkTheme)
	{
		const int count = scene.PageCount();
		const auto page = Whiteboard::ResolvePageState(count, count, false);
		// 与 PageControl::BuildPageContent 相同的稳定页态映射；离屏不启动文档或分页窗口。
		BarPageSurfaceContent content;
		content.surface = 0;
		content.whiteboard = true;
		content.switching = page.switching;
		content.currentPage = std::to_wstring(page.currentPage);
		content.totalPage = L"/" + std::to_wstring(page.totalPage);
		content.nextIsAdd = page.nextIsAdd;
		content.enabled = {page.previousEnabled, page.pageEnabled, page.nextEnabled};
		content.interactive = {page.previousInteractive, page.pageInteractive, page.nextInteractive};
		content.previousLabel = IW(I18nKey.UI.Bar.MainButtons.WhiteboardPreviousLabel);
		content.nextLabel = IW(page.nextIsAdd ? I18nKey.UI.Bar.MainButtons.WhiteboardAddPageLabel :
			I18nKey.UI.Bar.MainButtons.WhiteboardNextLabel);
		content.moreLabel = IW(I18nKey.UI.Bar.MainButtons.MoreLabel);

		BarPageSurface surface;
		const LONG width = static_cast<LONG>(BarWhiteboardPaginationLeftWidthDip * CaptureZoom);
		const LONG height = static_cast<LONG>(BarWhiteboardPaginationHeightDip * CaptureZoom);
		if (!context.Check(surface.ConfigurePagination(content) &&
			surface.SetBounds({0, 0, width, height}, CaptureZoom), "pager-configure")) return;
		surface.SetOpacity(1, 0);

		const auto origin = Clock::now();
		for (int frame = 0; frame <= 120; ++frame) {
			const auto time = origin + std::chrono::microseconds(16667LL * frame);
			(void)surface.Advance(time);
			const auto bounds = surface.PresentationBounds();
			const auto w = static_cast<UINT>(bounds.right - bounds.left);
			const auto h = static_cast<UINT>(bounds.bottom - bounds.top);
			if (!context.Check(surface.EnsureDeviceResources(RenderPipeline::GetDeviceEpoch(), w, h), "pager-resources")) return;
			auto* dc = surface.DeviceContext();
			auto& renderer = surface.Renderer();
			renderer.BeginFrameDraw(dc, D2D1::RectF(0, 0, static_cast<FLOAT>(w), static_cast<FLOAT>(h)));
			const auto result = surface.Render(dc, time);
			renderer.FinishFrameDrawCommands(dc);
			if (!context.Check(renderer.EndFrameDraw(dc), "pager-draw") ||
				!context.Check(result.rendered, "pager-render")) return;
			surface.CommitPresented();
			(void)surface.ConsumeDamage();
		}

		const auto layout = surface.Layout();
		const auto geometry = surface.Geometry();
		if (!context.Check(layout.dpiScale == CaptureZoom && !geometry.layoutAnimating && geometry.opacity == 1 &&
			!surface.PopupAnimationActive() && !surface.LoadingIndicatorAnimationActive(), "pager-stable-layout")) return;
		const char* keys[] = {"Previous", "Page", "Add page", "More"};
		const std::wstring labels[] = {L"Previous", std::to_wstring(count), L"Add page", L"More"};
		const bool enabled[] = {count > 1, true, true, true};
		if (!context.Check(page.currentPage == count && page.totalPage == count && content.nextIsAdd &&
			layout.buttons.size() >= 5, "pager-last-page")) return;
		for (size_t i = 0; i < std::size(keys); ++i) {
			const auto& cell = layout.buttons[i + 1]; // ID 1 是白板隐藏的拖动柄，分页格为 ID 2–5。
			const auto* button = static_cast<const BarButtonClass*>(cell.identity);
			if (!context.Check(cell.id == i + 2 && cell.visible && cell.enabled == enabled[i] &&
				button && button->IsVisible() && button->name.content.GetVal() == labels[i], keys[i])) return;
		}
		for (size_t i = 5; i < layout.buttons.size(); ++i)
			if (!context.Check(!layout.buttons[i].visible, "pager-menu-hidden")) return;

		const auto& body = geometry.bodyBounds;
		const auto& logical = layout.logicalBounds;
		const auto& presented = layout.presentationBounds;
		// 生产 SetPose 把屏幕逻辑边界投到 presentation backing；布局快照的格子坐标以逻辑边界为原点。
		const double x = logical.left - presented.left, y = logical.top - presented.top;
		auto* bitmap = surface.Renderer().GetTargetBitmap();
		if (!context.Check(bitmap != nullptr, "pager-target")) return;
		std::ofstream meta(directory / L"pager-body.json");
		WriteBodyHeader(meta, bitmap->GetPixelSize(), CaptureZoom,
			x + body.left * CaptureZoom, y + body.top * CaptureZoom,
			x + body.right * CaptureZoom, y + body.bottom * CaptureZoom);
		for (size_t i = 0; i < std::size(keys); ++i) {
			const auto& rect = layout.buttons[i + 1].localPixels;
			if (i) meta << ',';
			meta << '"' << keys[i] << "\":[" << rect.left / double(CaptureZoom) - body.left
			     << ',' << rect.top / double(CaptureZoom) - body.top
			     << ',' << (rect.right - rect.left) / double(CaptureZoom)
			     << ',' << (rect.bottom - rect.top) / double(CaptureZoom) << ']';
		}
		meta << "}}\n";
		std::ofstream state(directory / L"pager-state.json");
		WriteStateHeader(state, scene, darkTheme);
		state << ",\"surface\":" << content.surface << ",\"current_page\":" << page.currentPage
		      << ",\"total_pages\":" << page.totalPage << ",\"next_is_add\":" << content.nextIsAdd
		      << ",\"menu\":" << content.menu << ",\"unsaved\":" << content.unsaved
		      << ",\"loading\":" << (content.loadState != BarPageLoadState::None) << ",\"cells\":[";
		for (size_t i = 0; i < std::size(keys); ++i) {
			if (i) state << ',';
			state << "{\"key\":\"" << keys[i] << "\",\"enabled\":" << layout.buttons[i + 1].enabled << '}';
		}
		state << "]}\n";
		state.flush();
		meta.flush();
		context.Check(state.good() && meta.good(), "pager-metadata-write");
		context.Check(HeroIo::SaveTarget(surface.DeviceContext(), bitmap, directory / L"pager.png"), "pager-save");
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
		const auto themeLength = GetEnvironmentVariableW(L"INKEYS_WHITEBOARD_THEME", themeText, 16);
		if (!context.Check(themeLength > 0 && themeLength < 16, "theme-length")) return 3;
		const std::wstring theme(themeText, themeLength);
		const bool darkTheme = theme == L"dark";
		if (!context.Check(darkTheme || theme == L"light", "theme-valid")) return 3;

		globalPath = (std::filesystem::absolute(directory) / L"runtime-config").wstring() + L"\\";
		std::filesystem::create_directories(Path(globalPath) / L"Inkeys/Config");
		if (!context.Check(I18n::load(1, L"JSON", std::wstring(scene->locale.begin(), scene->locale.end())), "i18n-load")) return 4;
		BarUiAnimationEnabled = true;
		BarUiAnimationSpeedRate = 1;
		BarUiEdgeLightingEnabled = true;
		BarUiDynamicEdgeLightingEnabled = true;
		BarUiDebugModeEnabled = false;

		auto& owner = barUISet;
		owner.barState.fold = false;
		owner.barState.drawAttribute = owner.barState.moreExpanded = false;
		owner.barWindow.x = owner.barWindow.y = 0;
		owner.barWindow.w = ScreenWidth;
		owner.barWindow.h = ScreenHeight;
		(void)owner.InitializeStartupPlacement(Inkeys::UI::StartupPlacement::BottomLeftFloating);
		SetThemeMode(darkTheme ? 1 : 2);
		SetResidentOpacity(0, 100);
		InitializeUI(owner);
		owner.barStyle.dpiZoom = 1;
		owner.barStyle.configZoom = CaptureZoom;
		owner.barStyle.zoom = CaptureZoom;
		owner.barState.fold = false;

		if (scene->state == "toolbar") {
			// 生产协调器默认显示快照只有 1×1；发布固定 96 DPI 布局，给浮动栏和光影留出真实绘制空间。
			Inkeys::Display::MonitorInfo monitor{};
			monitor.bounds = {0, 0, ScreenWidth, ScreenHeight};
			monitor.workArea = {96, 0, ScreenWidth, ScreenHeight - 96};
			monitor.pixelWidth = ScreenWidth;
			monitor.pixelHeight = ScreenHeight;
			monitor.effectiveDpiX = monitor.effectiveDpiY = USER_DEFAULT_SCREEN_DPI;
			monitor.primary = monitor.fallback = true;
			auto display = std::make_shared<Inkeys::Display::Snapshot>();
			display->generation = 1;
			display->monitors = {monitor};
			display->virtualBounds = monitor.bounds;
			display->fallback = true;
			owner.PublishDisplaySnapshot(display);
			// 无论生产 UI 基准跟随 DPI 还是任务栏，最终采样倍率固定为 3。
			owner.barStyle.configZoom = CaptureZoom / owner.PendingDisplaySnapshot().uiBaseScale;
			owner.barButtonSet.PresetInitialization();
			owner.barButtonSet.RegisterBuiltInComponents();
			owner.barButtonSet.Load();
			owner.barButtonSet.StateUpdate();
		}

		Inkeys::Testing::WorkspaceSceneScope workspace(WorkspaceScene::Whiteboard);
		if (!context.Check(static_cast<bool>(workspace) && WhiteboardActive() &&
			GetWorkspaceSceneSnapshot().committed == WorkspaceScene::Whiteboard, "whiteboard-workspace")) return 4;
		SetPptPresentationActive(false);
		Freeze::SetPresentationActive(false);
		Freeze::SetWhiteboardActive(true);
		if (scene->state == "toolbar") SetWhiteboardActive(true);
		SetSelectAndClickThroughMode(0);
		if (!context.Check(GetSelectAndClickThroughMode() == 0 && !PptPresentationActive(), "merged-whiteboard")) return 4;

		if (scene->state == "toolbar")
			ExportToolbar(context, *scene, directory, darkTheme);
		else
			ExportPager(context, *scene, directory, darkTheme);

		context.Check(owner.barStyle.requestedDarkStyle.load() == darkTheme && owner.barStyle.darkStyle == darkTheme &&
			owner.barStyle.requestedBackgroundOpacity.load() == 0 && owner.barStyle.backgroundOpacity == 0 &&
			owner.barStyle.requestedContentOpacity.load() == 100 && owner.barStyle.contentOpacity == 100, "theme-and-opacity-applied");
		owner.spec.DiscardDeviceResources();
		context.log << "failures=" << context.failures << '\n';
		return context.failures ? 1 : 0;
	}
}
