// 第一页配图的原生图层导出（media/inkeys3-hero）。仅在 INKEYS_HERO_OUTPUT 存在时由
// --bar-eraser-offscreen-test 入口调用；不创建窗口、不 Present、不写用户配置。
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
        std::ofstream diagnostics, geometry;
        std::string layer; unsigned strokeIndex = 0;
		bool Check(HRESULT hr, const char* step)
		{
			log << step << " hr=" << std::hex << hr << std::dec << '\n'; log.flush();
			if (FAILED(hr)) ++failures;
			return SUCCEEDED(hr);
		}
		bool Check(bool ok, const char* step) { return Check(ok ? S_OK : E_FAIL, step); }
	};

}

#include "HeroCanvas.inc"
// shape 构建只导出形状图层（feature/shape 工厂）；dev 构建导出主栏、分页、白板与全部手写墨迹。
#if HERO_SHAPE_BUILD
#include "HeroShapes.inc"
#else
#include "HeroInk.inc"
#endif

namespace HeroExport
{

#if !HERO_SHAPE_BUILD
	void ExportUi(Context& context, const HeroScene::Scene& scene, const Path& directory)
	{
		auto& owner = barUISet;
		owner.barState.fold = false;
		owner.barState.drawAttribute = owner.barState.moreExpanded = false;
		owner.barWindow.x = owner.barWindow.y = 0;
		owner.barWindow.w = 3840; owner.barWindow.h = 2160;
		(void)owner.InitializeStartupPlacement(Inkeys::UI::StartupPlacement::BottomLeftFloating);
		InitializeUI(owner);
		owner.barStyle.dpiZoom = 1; owner.barStyle.configZoom = 3; owner.barStyle.zoom = 3;
		owner.barStyle.darkStyle = true; SetThemeStyleSource(&owner.barStyle);
		owner.barButtonSet.PresetInitialization(); owner.barButtonSet.RegisterBuiltInComponents();
		owner.barButtonSet.Load(); owner.barButtonSet.StateUpdate();
		// 红色软笔：颜色指示与边缘光均由生产状态机按当前笔色渲染。
		// 生产色板以 RGBA（不透明 alpha）写入笔色；红色为内置 ColorSelect6 = (255,16,0)。
		const COLORREF red = RGBA((scene.toolbarColor >> 16) & 0xFF, (scene.toolbarColor >> 8) & 0xFF, scene.toolbarColor & 0xFF, 255);
		ChangeStateModeToPen(); ChangeStateModeToPenTool(PenToolSelectionEnum::SoftPen); SetPenColor(red, false);
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
		SetCurrentPageHasContent(true); SetSelectAndClickThroughMode(0);
		ChangeStateModeToPen(); ChangeStateModeToPenTool(PenToolSelectionEnum::SoftPen); SetPenColor(red, false);
		// 画面上已有墨迹：经 Draw3 历史通知的生产入口报告“可撤回、不可重做”。离屏没有 Draw3 运行时，
		// 安装器在导出期间让刷新保留该通知（见 install.py），否则每帧会被重新查询为不可撤回。
		owner.NoteRecallHistoryAvailability(true, false);
		owner.barState.fold = false; owner.UpdateRendering(false);
		for (int frame = 0; frame < 180; ++frame) tick();
        // 记录最终布局的真实按钮文字/显隐及撤销投影，不把意图声明当作状态证据。
        std::ofstream state(directory / L"toolbar-state.json");
        const auto recall = owner.RecallChromeView();
        state << "{\"select_clickthrough_mode\":" << GetSelectAndClickThroughMode()
              << ",\"undo\":" << (recall.undoEnabled ? "true" : "false")
              << ",\"redo\":" << (recall.redoEnabled ? "true" : "false") << ",\"buttons\":[";
        bool comma=false, forbidden=false;
        for (const auto& entry : owner.barButtonSet.MainLayoutSnapshot()) {
            const auto* button=entry.identity; if (!button) continue;
            const auto label=button->name.content.GetVal();
            if (entry.visible && (button->preset == BarButtonPresetEnum::Pierce || (label.find(L"Select") != std::wstring::npos && label.find(L"Clear") != std::wstring::npos))) forbidden=true;
            if (comma) state << ','; comma=true;
            state << "{\"visible\":" << (entry.visible?"true":"false") << ",\"label\":\"";
            for (wchar_t c:label) { if(c=='\n') state << "\\n"; else if(c=='\"' || c=='\\') state << '\\' << char(c); else if(c<128) state << char(c); }
            state << "\"}";
        }
        state << "]}";
        context.Check(GetSelectAndClickThroughMode()==0 && recall.undoEnabled && !recall.redoEnabled && !forbidden, "actual-merged-toolbar-state");
		context.Check(HeroIo::SaveTarget(owner.spec.GetDeviceContext(), owner.spec.GetTargetBitmap(),
			directory / L"toolbar.png"), "toolbar");
		const auto body = owner.shapeMap[BarUISetShapeEnum::MainBar];
        const auto z = owner.barStyle.zoom;
        const auto grip = owner.superellipseMap[BarUISetSuperellipseEnum::MainButton];
        D2D1_MATRIX_3X2_F frameTransform{};
        owner.spec.GetDeviceContext()->GetTransform(&frameTransform);
        // 浮动布局映射恒等，最终设备变换含 capacityOrigin 平移。
        const double left = (std::min)(static_cast<double>(body->inhX),static_cast<double>(grip->inhX))*z + frameTransform._31;
        const double top = (std::min)(static_cast<double>(body->inhY),static_cast<double>(grip->inhY))*z + frameTransform._32;
        const double right = (std::max)(body->inhX+body->w.val,grip->inhX+grip->w.val)*z + frameTransform._31;
        const double bottom = (std::max)(body->inhY+body->h.val,grip->inhY+grip->h.val)*z + frameTransform._32;
        const auto bitmapSize = owner.spec.GetTargetBitmap()->GetPixelSize();
        std::ofstream meta(directory / L"toolbar-body.json");
        meta << "{\"canvas\":[" << bitmapSize.width << ',' << bitmapSize.height
             << "],\"body_rect\":[" << left << ',' << top << ',' << right << ',' << bottom
             << "],\"transform\":[" << frameTransform._11 << ',' << frameTransform._12 << ',' << frameTransform._21 << ',' << frameTransform._22 << ',' << frameTransform._31 << ',' << frameTransform._32
             << "],\"locale\":\"en-US\",\"pen\":\"soft\",\"mode\":\"drawing\",\"pen_rgb\":\"FF1000\",\"undo\":true,\"redo\":false}";
        callback = {};

		for (const auto& pager : scene.pagers)
		{
			const bool board = pager.kind == "board";
			BarPageSurface surface; BarPageSurfaceContent content;
			// 白板使用右侧分页（surface 1），不含“更多”；PPT 使用左侧分页。
			content.surface = board ? 1 : 0; content.whiteboard = board; content.pptActive = !board;
			content.currentPage = std::to_wstring(pager.current);
			content.totalPage = L"/" + std::to_wstring(pager.total);
			content.previousLabel = IW(I18nKey.UI.Bar.MainButtons.WhiteboardPreviousLabel);
			content.nextLabel = IW(I18nKey.UI.Bar.MainButtons.WhiteboardNextLabel);
			content.moreLabel = IW(I18nKey.UI.Bar.MainButtons.MoreLabel);
			content.backgroundRgb = scene.boardColor; content.pattern = scene.boardPattern;
			content.enabled = { pager.current > 1, true, true };
			surface.ConfigurePagination(content);
			const LONG width = static_cast<LONG>((board ? BarWhiteboardPaginationWidthDip : BarPptPaginationLongSideDip) * 3);
			const LONG height = static_cast<LONG>((board ? BarWhiteboardPaginationHeightDip : BarPptPaginationShortSideDip) * 3);
			surface.SetBounds({ 0, 0, width, height }, 3); surface.SetOpacity(1, 0);
			for (int frame = 0; frame <= 60; ++frame)
			{
				const auto time = origin + std::chrono::microseconds(16667LL * frame);
				(void)surface.Advance(time); const auto bounds = surface.PresentationBounds();
				const UINT w = bounds.right - bounds.left, h = bounds.bottom - bounds.top;
				if (!context.Check(surface.EnsureDeviceResources(RenderPipeline::GetDeviceEpoch(), w, h), "pager-resources")) break;
				auto* dc = surface.DeviceContext(); auto& renderer = surface.Renderer();
				renderer.BeginFrameDraw(dc, D2D1::RectF(0, 0, static_cast<FLOAT>(w), static_cast<FLOAT>(h)));
				(void)surface.Render(dc, time); renderer.FinishFrameDrawCommands(dc);
				if (!context.Check(renderer.EndFrameDraw(dc), "pager-render")) break;
				surface.CommitPresented(); (void)surface.ConsumeDamage();
				if (frame == 60) context.Check(HeroIo::SaveTarget(dc, renderer.GetTargetBitmap(),
					directory / (board ? L"board-pager.png" : L"ppt-pager.png")), "pager-save");
			}
		}

		BarUIRendering board(nullptr);
		if (context.Check(board.EnsureDeviceResources(RenderPipeline::GetDeviceEpoch(), scene.width, scene.height), "board-resource"))
		{
			auto* dc = board.GetDeviceContext();
			dc->BeginDraw(); dc->SetTransform(D2D1::IdentityMatrix());
			Inkeys::UI::WhiteboardVisual::DrawTheme(dc, D2D1::RectF(0, 0, static_cast<FLOAT>(scene.width), static_cast<FLOAT>(scene.height)),
				scene.boardColor, scene.boardPattern);
			context.Check(dc->EndDraw(), "board-render");
            dc->BeginDraw(); dc->Clear(D2D1::ColorF(0,0.0f));
            // 未来纹理刷演示：原生 D2D 三角点阵，合成阶段仅按真实平头刷覆盖裁切一次。
            ComPtr<ID2D1SolidColorBrush> dots;
            context.Check(dc->CreateSolidColorBrush(D2D1::ColorF(scene.patternR/255,scene.patternG/255,scene.patternB/255,scene.patternA/255), &dots), "pattern-brush");
            if (dots) for(int row=-100;row<100;++row) {
                float y=scene.patternY+row*scene.patternRow;
                if(y<0 || y>scene.height) continue;
                for(int col=-100;col<100;++col) {
                    float x=scene.patternX+(col+(row%2?0.5f:0.f))*scene.patternStep;
                    if(x>=0 && x<=scene.width) dc->FillEllipse(D2D1::Ellipse(D2D1::Point2F(x,y),scene.patternRadius,scene.patternRadius),dots.Get());
                }
            }
            std::ofstream patternMeta(directory / L"pattern.json");
            patternMeta << "{\"source_origin\":[" << scene.patternX << ',' << scene.patternY << "],\"spacing\":" << scene.patternStep << ",\"row_height\":" << scene.patternRow << ",\"radius\":" << scene.patternRadius << ",\"renderer\":\"native D2D triangular prototype\"}";
            context.Check(dc->EndDraw(), "pattern-render");
            context.Check(HeroIo::SaveTarget(dc, board.GetTargetBitmap(), directory / L"pattern.png"), "pattern-save");
			context.Check(HeroIo::SaveTarget(dc, board.GetTargetBitmap(), directory / L"board.png"), "board-save");
		}
	}

#endif

	int Export(const Path& directory, bool)
	{
		std::filesystem::create_directories(directory);
		Context context;
		context.log.open(directory / L"export.log");
        context.diagnostics.open(directory / L"stroke-diagnostics.csv");
        context.diagnostics << "layer,index,mode,samples,base_width,first_ms,last_sample_ms,movement_end_ms,physical_up_ms,hold_ms,raw_speed_min,raw_speed_max,modeled_points,stored_points,width_min,width_max,end_width,taper_seconds\n";
        context.geometry.open(directory / L"stroke-geometry.csv");
        context.geometry << "layer,index,source,point,x,y,width,time\n";
		const auto scene = HeroScene::Load(directory / L"native-scene.txt");
		if (!context.Check(scene.has_value(), "scene-load")) return 3;
		globalPath = (std::filesystem::absolute(directory) / L"runtime-config").wstring() + L"\\";
		std::filesystem::create_directories(Path(globalPath) / L"Inkeys/Config");
		// 主栏与分页的文字和排版 locale 均随所载语言包切换（zh-CN / en-US）。
		if (!context.Check(I18n::load(1, L"JSON", std::wstring(scene->locale.begin(), scene->locale.end())), "i18n-load")) return 4;
		BarUiAnimationEnabled = true; BarUiAnimationSpeedRate = 1;
		BarUiEdgeLightingEnabled = true; BarUiDynamicEdgeLightingEnabled = true;
		BarUiDebugModeEnabled = false;
#if !HERO_SHAPE_BUILD
		ExportUi(context, *scene, directory);
#endif

		ComPtr<ID3D11Device> device; ComPtr<ID3D11DeviceContext> deviceContext;
		const D3D_FEATURE_LEVEL level = D3D_FEATURE_LEVEL_11_0;
		if (context.Check(D3D11CreateDevice(nullptr, D3D_DRIVER_TYPE_WARP, nullptr, D3D11_CREATE_DEVICE_BGRA_SUPPORT,
			&level, 1, D3D11_SDK_VERSION, &device, nullptr, &deviceContext), "draw3-device"))
		{
#if HERO_SHAPE_BUILD
			ExportShapeLayers(context, *scene, directory, device.Get(), deviceContext.Get());
#else
			ExportInkLayers(context, *scene, directory, device.Get(), deviceContext.Get());
#endif
		}
#if !HERO_SHAPE_BUILD
		barUISet.spec.DiscardDeviceResources();
#endif
		context.log << "failures=" << context.failures << '\n';
		return context.failures ? 1 : 0;
	}
}
