// S1 卡片主栏状态导出；只经离屏入口与生产状态 API 渲染，不创建窗口。
#include "HeroCommon.inc"
#include "HeroScene.inc"

namespace HeroExport
{
	using Path = std::filesystem::path;
	using Clock = std::chrono::steady_clock;
	using Microsoft::WRL::ComPtr;

	struct Context
	{
		std::ofstream log;
		int failures = 0;
		bool Check(HRESULT hr, const char* step)
		{
			log << step << " hr=" << std::hex << hr << std::dec << '\n'; log.flush();
			if (FAILED(hr)) ++failures;
			return SUCCEEDED(hr);
		}
		bool Check(bool ok, const char* step) { return Check(ok ? S_OK : E_FAIL, step); }
	};

	const char* ButtonKey(BarButtonPresetEnum preset)
	{
		switch (preset) {
		case BarButtonPresetEnum::Divider: return "Divider";
		case BarButtonPresetEnum::Select: return "Select";
		case BarButtonPresetEnum::Draw: return "pen";
		case BarButtonPresetEnum::Geometry: return "Shapes";
		case BarButtonPresetEnum::Eraser: return "Erase";
		case BarButtonPresetEnum::Recall: return "Undo";
		case BarButtonPresetEnum::Clean: return "Clear";
		case BarButtonPresetEnum::More: return "More";
		case BarButtonPresetEnum::Whiteboard: return "Board";
		case BarButtonPresetEnum::Freeze: return "Freeze";
		default: return "";
		}
	}

	void ExportUi(Context& context, const HeroScene::Scene& scene, const Path& directory)
	{
		// 主题由环境变量 INKEYS_HERO_THEME 指定：light = ThemeMode 2，dark = ThemeMode 1（与生产配置取值一致）。
		wchar_t themeText[16]{};
		GetEnvironmentVariableW(L"INKEYS_HERO_THEME", themeText, 16);
		const bool darkTheme = std::wstring(themeText) == L"dark";
		if (!context.Check(darkTheme || std::wstring(themeText) == L"light", "theme-valid")) return;
		const int themeMode = darkTheme ? 1 : 2;

		auto& owner = barUISet;
		owner.barState.fold = false;
		owner.barState.drawAttribute = owner.barState.moreExpanded = false;
		owner.barWindow.x = owner.barWindow.y = 0;
		owner.barWindow.w = 3840; owner.barWindow.h = 2160;
		(void)owner.InitializeStartupPlacement(Inkeys::UI::StartupPlacement::BottomLeftFloating);
		// 与正常启动一致：先发布主题目标与默认透明度（BackgroundOpacity=0 表示跟随主题，ContentOpacity=100），
		// 再初始化 UI，首帧直接采用该目标，不强制 darkStyle。
		owner.barStyle.requestedDarkStyle.store(darkTheme, std::memory_order_release);
		owner.barStyle.requestedBackgroundOpacity.store(0, std::memory_order_release);
		owner.barStyle.requestedContentOpacity.store(100, std::memory_order_release);
		InitializeUI(owner);
		owner.barStyle.dpiZoom = 1; owner.barStyle.configZoom = 3; owner.barStyle.zoom = 3;
		SetThemeStyleSource(&owner.barStyle);
		// 经生产 API 再次确认主题与透明度（值未变化时为空操作）。
		SetThemeMode(themeMode); SetResidentOpacity(0, 100);
		owner.barButtonSet.PresetInitialization(); owner.barButtonSet.RegisterBuiltInComponents();
		owner.barButtonSet.Load(); owner.barButtonSet.StateUpdate();
		const bool highlight = scene.state == "highlight";
		const bool freeze = scene.state == "soft-freeze";
		const auto tool = highlight ? PenToolSelectionEnum::Highlighter : PenToolSelectionEnum::SoftPen;
		const auto expectedPen = highlight ? PenModeSelectEnum::IdtPenHighlighter1 : PenModeSelectEnum::IdtPenSoftPen;
		const COLORREF color = highlight ? RGBA(255, 197, 16, 255) : RGBA(255, 16, 0, 255);
		const auto applyState = [&] {
			ChangeStateModeToPen(); ChangeStateModeToPenTool(tool); SetPenColor(color, false);
			// 离屏入口未启动 MagnifierThread，故无捕屏 observer；生产 Toggle 只发布状态/版本。
			Inkeys::UI::Freeze::SetPresentationActive(false);
			Inkeys::UI::Freeze::SetWhiteboardActive(false);
			if (Inkeys::UI::Freeze::IsActive() != freeze) Inkeys::UI::Freeze::Toggle();
		};
		applyState();
		owner.barMedia.LoadFormat(); owner.spec.ConfigureLocalizedTypography();
		owner.UpdateRendering(false);
		auto callback = CreateBarOffscreenRenderCallback(owner, [](const UPDATELAYEREDWINDOWINFO&) { return TRUE; });
		const auto origin = Clock::now();
		unsigned ordinal = 0;
		const auto tick = [&] {
			RenderPipeline::FrameContext frame;
			frame.epoch = RenderPipeline::GetDeviceEpoch();
			frame.frameTime = origin + std::chrono::microseconds(16667LL * ordinal++);
			return callback(frame);
		};
		for (int frame = 0; frame < 100; ++frame) tick();
		// 合并式：选择键内含穿透（SetSelectAndClickThroughMode(0)）。
		SetCurrentPageHasContent(true); SetSelectAndClickThroughMode(0);
		applyState();
		// 画面上已有墨迹：经 Draw3 历史通知的生产入口报告“可撤回、不可重做”（离屏无 Draw3 运行时，安装器让刷新保留该通知）。
		owner.NoteRecallHistoryAvailability(true, false);
		owner.barState.fold = false; owner.UpdateRendering(false);
		for (int frame = 0; frame < 240; ++frame) tick();
		// 记录实际生效的主题/透明度及最终布局的真实按钮文字与显隐，不把意图声明当作状态证据。
		std::ofstream state(directory / L"toolbar-state.json");
		state << std::setprecision(15);
		const auto actual = GetCommittedStateModeSnapshot();
		const auto actualColor = GetPenColor(actual);
		std::ostringstream rgb;
		rgb << std::uppercase << std::hex << std::setfill('0')
		    << std::setw(2) << int(GetRValue(actualColor)) << std::setw(2) << int(GetGValue(actualColor)) << std::setw(2) << int(GetBValue(actualColor));
		const auto frozen = Inkeys::UI::Freeze::Snapshot();
		context.Check(actual.StateModeSelect == StateModeSelectEnum::IdtPen && !actual.laserActive && actual.Pen.ModeSelect == expectedPen && actualColor == color, "actual-pen-state");
		context.Check(frozen.available && frozen.active == freeze && GetWorkspaceSceneSnapshot().committed == WorkspaceScene::Desktop && !WhiteboardActive() && !PptPresentationActive(), "actual-desktop-freeze-state");
		const auto recall = owner.RecallChromeView();
		state << "{\"theme\":\"" << (darkTheme ? "dark" : "light") << "\",\"theme_mode\":" << themeMode
		      << ",\"requested_dark\":" << (owner.barStyle.requestedDarkStyle.load() ? "true" : "false")
		      << ",\"applied_dark\":" << (owner.barStyle.darkStyle ? "true" : "false")
		      << ",\"requested_background_opacity\":" << owner.barStyle.requestedBackgroundOpacity.load()
		      << ",\"requested_content_opacity\":" << owner.barStyle.requestedContentOpacity.load()
		      << ",\"applied_background_opacity\":" << owner.barStyle.backgroundOpacity
		      << ",\"applied_content_opacity\":" << owner.barStyle.contentOpacity
		      << ",\"state\":\"" << scene.state << "\",\"pen_tool\":" << static_cast<int>(actual.Pen.ModeSelect)
		      << ",\"pen_rgb\":\"" << rgb.str() << "\",\"freeze\":" << (frozen.active ? "true" : "false")
		      << ",\"select_clickthrough_mode\":" << GetSelectAndClickThroughMode()
		      << ",\"undo\":" << (recall.undoEnabled ? "true" : "false")
		      << ",\"redo\":" << (recall.redoEnabled ? "true" : "false") << ",\"buttons\":[";
		bool comma = false, forbidden = false;
		int visibleButtons = 0;
		for (const auto& entry : owner.barButtonSet.MainLayoutSnapshot()) {
			const auto* button = entry.identity; if (!button) continue;
			const auto label = button->name.content.GetVal();
			const auto key = ButtonKey(button->preset.load());
			const bool selected = button->state->state.load() == BarWidgetState::Selected;
			if (entry.visible && key[0] && button->preset != BarButtonPresetEnum::Divider) {
				++visibleButtons;
				const bool expectedSelected = button->preset == BarButtonPresetEnum::Draw || (button->preset == BarButtonPresetEnum::Freeze && freeze);
				context.Check(selected == expectedSelected, "actual-button-selected");
				if (button->preset == BarButtonPresetEnum::Draw)
					context.Check(label == (highlight ? L"Highlight" : L"Soft Pen"), "actual-pen-label");
			}
			if (entry.visible && (button->preset == BarButtonPresetEnum::Pierce || (label.find(L"Select") != std::wstring::npos && label.find(L"Clear") != std::wstring::npos))) forbidden = true;
			if (comma) state << ','; comma = true;
			state << "{\"key\":\"" << key << "\",\"selected\":" << (selected ? "true" : "false") << ",\"visible\":" << (entry.visible ? "true" : "false") << ",\"label\":\"";
			for (wchar_t c : label) { if (c == '\n') state << "\\n"; else if (c == '\"' || c == '\\') state << '\\' << char(c); else if (c < 128) state << char(c); }
			state << "\"}";
		}
		state << "]}";
		context.Check(GetSelectAndClickThroughMode() == 0 && recall.undoEnabled && !recall.redoEnabled && !forbidden && visibleButtons == 9, "actual-merged-toolbar-state");
		context.Check(owner.barStyle.darkStyle == darkTheme, "actual-theme-applied");
		context.Check(HeroIo::SaveTarget(owner.spec.GetDeviceContext(), owner.spec.GetTargetBitmap(),
			directory / L"toolbar.png"), "toolbar");
		const auto body = owner.shapeMap[BarUISetShapeEnum::MainBar];
		const auto z = owner.barStyle.zoom;
		const auto grip = owner.superellipseMap[BarUISetSuperellipseEnum::MainButton];
		D2D1_MATRIX_3X2_F frameTransform{};
		owner.spec.GetDeviceContext()->GetTransform(&frameTransform);
		// 浮动布局映射恒等，最终设备变换含 capacityOrigin 平移。
		const double left = (std::min)(static_cast<double>(body->inhX), static_cast<double>(grip->inhX)) * z + frameTransform._31;
		const double top = (std::min)(static_cast<double>(body->inhY), static_cast<double>(grip->inhY)) * z + frameTransform._32;
		const double right = (std::max)(body->inhX + body->w.val, grip->inhX + grip->w.val) * z + frameTransform._31;
		const double bottom = (std::max)(body->inhY + body->h.val, grip->inhY + grip->h.val) * z + frameTransform._32;
		const auto bitmapSize = owner.spec.GetTargetBitmap()->GetPixelSize();
		std::ofstream meta(directory / L"toolbar-body.json");
		meta << std::setprecision(15);
		meta << "{\"canvas\":[" << bitmapSize.width << ',' << bitmapSize.height
		     << "],\"body_rect\":[" << left << ',' << top << ',' << right << ',' << bottom
		     << "],\"transform\":[" << frameTransform._11 << ',' << frameTransform._12 << ',' << frameTransform._21 << ',' << frameTransform._22 << ',' << frameTransform._31 << ',' << frameTransform._32
		     << "],\"pixels_per_logical_unit\":" << z
		     << ",\"locale\":\"" << scene.locale << "\",\"pen\":\"" << (highlight ? "highlight" : "soft")
		     << "\",\"mode\":\"drawing\",\"pen_rgb\":\"" << rgb.str() << "\",\"freeze\":" << (frozen.active ? "true" : "false")
		     << ",\"undo\":" << (recall.undoEnabled ? "true" : "false") << ",\"redo\":" << (recall.redoEnabled ? "true" : "false") << ",\"buttons\":{";
		// 使用生产最终继承坐标，原点为主按钮/主栏实体并集；不把阴影或透明画布当作主体。
		const double logicalLeft = (std::min)(static_cast<double>(body->inhX), static_cast<double>(grip->inhX));
		const double logicalTop = (std::min)(static_cast<double>(body->inhY), static_cast<double>(grip->inhY));
		comma = false;
		for (const auto& entry : owner.barButtonSet.MainLayoutSnapshot()) {
			const auto* button = entry.identity; if (!button || !entry.visible) continue;
			const auto key = ButtonKey(button->preset.load()); if (!key[0] || button->preset == BarButtonPresetEnum::Divider) continue;
			if (comma) meta << ','; comma = true;
			meta << '\"' << key << "\":[" << static_cast<double>(button->button.inhX) - logicalLeft
			     << ',' << static_cast<double>(button->button.inhY) - logicalTop
			     << ',' << button->button.w.val << ',' << button->button.h.val << ']';
		}
		meta << "}}";
		context.Check(frameTransform._11 == 1 && frameTransform._22 == 1 && frameTransform._12 == 0 && frameTransform._21 == 0, "translation-only-transform");
		state.flush(); meta.flush();
		context.Check(state.good() && meta.good(), "metadata-write");
		callback = {};
	}

	int Export(const Path& directory, bool)
	{
		std::filesystem::create_directories(directory);
		Context context;
		context.log.open(directory / L"export.log");
		const auto scene = HeroScene::Load(directory / L"native-scene.txt");
		if (!context.Check(scene.has_value(), "scene-load")) return 3;
		if (!context.Check(scene->locale == "en-US" && scene->pagers.empty() &&
			(scene->state == "soft" || scene->state == "highlight" || scene->state == "soft-freeze"), "fixture-valid")) return 3;
		globalPath = (std::filesystem::absolute(directory) / L"runtime-config").wstring() + L"\\";
		std::filesystem::create_directories(Path(globalPath) / L"Inkeys/Config");
		// 主栏文字和排版使用同一个 en-US 生产语言包。
		if (!context.Check(I18n::load(1, L"JSON", std::wstring(scene->locale.begin(), scene->locale.end())), "i18n-load")) return 4;
		BarUiAnimationEnabled = true; BarUiAnimationSpeedRate = 1;
		BarUiEdgeLightingEnabled = true; BarUiDynamicEdgeLightingEnabled = true;
		BarUiDebugModeEnabled = false;
		ExportUi(context, *scene, directory);
		barUISet.spec.DiscardDeviceResources();
		context.log << "failures=" << context.failures << '\n';
		return context.failures ? 1 : 0;
	}
}
