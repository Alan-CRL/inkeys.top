// 仅由离屏测试入口显式包含；使用生产 UI3 / Draw3 渲染器，不创建窗口。
namespace FeatureMedia
{
	using Path = std::filesystem::path;
	using Clock = std::chrono::steady_clock;
	HRESULT SavePixels(const Path& path, UINT width, UINT height, UINT pitch, const BYTE* pixels)
	{
		// D2D / Draw3 读回是预乘 BGRA；PNG 存直通 alpha，避免网页合成暗边。
		std::vector<BYTE> straight(width * height * 4);
		for (UINT y = 0; y < height; ++y) for (UINT x = 0; x < width; ++x)
		{
			const auto* src = pixels + y * pitch + x * 4;
			auto* dst = straight.data() + (y * width + x) * 4;
			dst[3] = src[3];
			for (int c = 0; c < 3; ++c) dst[c] = src[3] ? static_cast<BYTE>((std::min)(255U, (src[c] * 255U + src[3] / 2U) / src[3])) : 0;
		}
		ComPtr<IWICImagingFactory> factory; ComPtr<IWICStream> stream;
		ComPtr<IWICBitmapEncoder> encoder; ComPtr<IWICBitmapFrameEncode> frame; ComPtr<IPropertyBag2> options;
		HRESULT hr = CoCreateInstance(CLSID_WICImagingFactory, nullptr, CLSCTX_INPROC_SERVER, IID_PPV_ARGS(&factory));
		if (SUCCEEDED(hr)) hr = factory->CreateStream(&stream);
		if (SUCCEEDED(hr)) hr = stream->InitializeFromFilename(path.c_str(), GENERIC_WRITE);
		if (SUCCEEDED(hr)) hr = factory->CreateEncoder(GUID_ContainerFormatPng, nullptr, &encoder);
		if (SUCCEEDED(hr)) hr = encoder->Initialize(stream.Get(), WICBitmapEncoderNoCache);
		if (SUCCEEDED(hr)) hr = encoder->CreateNewFrame(&frame, &options);
		if (SUCCEEDED(hr)) hr = frame->Initialize(options.Get());
		if (SUCCEEDED(hr)) hr = frame->SetSize(width, height);
		WICPixelFormatGUID format = GUID_WICPixelFormat32bppBGRA;
		if (SUCCEEDED(hr)) hr = frame->SetPixelFormat(&format);
		if (SUCCEEDED(hr)) hr = frame->WritePixels(height, width * 4, static_cast<UINT>(straight.size()), straight.data());
		if (SUCCEEDED(hr)) hr = frame->Commit();
		if (SUCCEEDED(hr)) hr = encoder->Commit();
		return hr;
	}
	HRESULT SaveTarget(ID2D1DeviceContext* dc, ID2D1Bitmap1* source, const Path& path)
	{
		if (!source) return E_POINTER;
		ComPtr<ID2D1Bitmap1> readable;
		const auto props = D2D1::BitmapProperties1(D2D1_BITMAP_OPTIONS_CPU_READ | D2D1_BITMAP_OPTIONS_CANNOT_DRAW, source->GetPixelFormat());
		HRESULT hr = dc->CreateBitmap(source->GetPixelSize(), nullptr, 0, &props, &readable);
		if (SUCCEEDED(hr)) hr = readable->CopyFromBitmap(nullptr, source, nullptr);
		D2D1_MAPPED_RECT map{};
		if (SUCCEEDED(hr)) hr = readable->Map(D2D1_MAP_OPTIONS_READ, &map);
		if (FAILED(hr)) return hr;
		const auto size = source->GetPixelSize();
		hr = SavePixels(path, size.width, size.height, map.pitch, map.bits);
		readable->Unmap(); return hr;
	}
}
#include "FeatureMediaRedesign.inc"
namespace FeatureMedia
{
	int Export(const Path& directory)
	{
		wchar_t redesign[2]{};
		if (GetEnvironmentVariableW(L"INKEYS_FEATURE_MEDIA_REDESIGN", redesign, 2) == 1 && redesign[0] == L'1')
			return FeatureMediaRedesign::Export(directory);
		std::filesystem::create_directories(directory);
		std::ofstream log(directory / L"export.log");
		int failures = 0;
		const auto check = [&](HRESULT hr, const char* step) { log << step << " hr=" << std::hex << hr << std::dec << '\n'; log.flush(); if (FAILED(hr)) ++failures; return SUCCEEDED(hr); };
		if (!I18n::load(1, L"JSON", L"zh-CN")) return 4;
		// Load 可能规范化配置；限定在此次导出目录，绝不读写用户配置。
		globalPath = (std::filesystem::absolute(directory) / L"runtime-config").wstring() + L"\\";
		std::filesystem::create_directories(Path(globalPath) / L"Inkeys/Config");
		BarUiAnimationEnabled = true; BarUiAnimationSpeedRate = 1;
		BarUiEdgeLightingEnabled = true; BarUiDynamicEdgeLightingEnabled = true;
		BarUiDebugModeEnabled = false;
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
		ChangeStateModeToPen(); SetPenColor(RGB(45, 117, 230), false); owner.barMedia.LoadFormat(); owner.spec.ConfigureLocalizedTypography();
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
		for (int f = 0; f < 100; ++f) { if (f == 2) { owner.barState.fold = false; owner.UpdateRendering(false); } tick(); }
		check(SaveTarget(owner.spec.GetDeviceContext(), owner.spec.GetTargetBitmap(), directory / L"toolbar-draw.png"), "toolbar-draw");
		wchar_t smoke[2]{};
		if (GetEnvironmentVariableW(L"INKEYS_FEATURE_MEDIA_SMOKE", smoke, 2) == 1 && smoke[0] == L'1')
		{
			callback = {}; owner.spec.DiscardDeviceResources();
			log << "failures=" << failures << '\n';
			return failures ? 1 : 0;
		}
		auto* draw = owner.barButtonSet.preset[static_cast<int>(BarButtonPresetEnum::Draw)];
		(void)StartBarButtonHoverVisual(*draw);
		std::filesystem::create_directories(directory / L"toolbar-press");
		for (int f = 0; f < 36; ++f) {
			if (f == 8) SetBarButtonPressedVisual(*draw, true);
			if (f == 15) SetBarButtonPressedVisual(*draw, false);
			if (f == 24) (void)StopBarButtonHoverVisual(*draw, false);
			tick(); tick();
			check(SaveTarget(owner.spec.GetDeviceContext(), owner.spec.GetTargetBitmap(), directory / L"toolbar-press" / (std::to_wstring(f) + L".png")), "toolbar-press");
		}
		SetCurrentPageHasContent(true); SetSelectAndClickThroughMode(1); ChangeStateModeToClickThrough(); owner.UpdateRendering(false);
		for (int f = 0; f < 90; ++f) tick();
		check(GetStateModeSnapshot().StateModeSelect == StateModeSelectEnum::IdtClickThrough ? S_OK : E_FAIL, "pierce-state");
		check(SaveTarget(owner.spec.GetDeviceContext(), owner.spec.GetTargetBitmap(), directory / L"toolbar-pierce.png"), "toolbar-pierce");
		ChangeStateModeToPen(); Inkeys::UI::Freeze::Toggle(); owner.UpdateRendering(false);
		for (int f = 0; f < 90; ++f) tick();
		check(SaveTarget(owner.spec.GetDeviceContext(), owner.spec.GetTargetBitmap(), directory / L"toolbar-freeze.png"), "toolbar-freeze");
		Inkeys::UI::Freeze::Toggle();
		ChangeStateModeToPen(); SetWhiteboardActive(true); owner.UpdateRendering(false);
		for (int f = 0; f < 90; ++f) tick();
		check(SaveTarget(owner.spec.GetDeviceContext(), owner.spec.GetTargetBitmap(), directory / L"toolbar-whiteboard.png"), "toolbar-whiteboard");
		SetWhiteboardActive(false);
		callback = {};
		// 与 PageControl 相同的 BarPageSurface、生产按钮、字体和动画，仅注入演示页码。
		for (bool board : { false, true }) for (int page = 1; page <= (board ? 2 : 3); ++page)
		{
			BarPageSurface scene; BarPageSurfaceContent content;
			content.surface = 0; content.whiteboard = board; content.pptActive = !board;
			content.currentPage = std::to_wstring(page); content.totalPage = board ? L"/2" : L"/12";
			content.nextIsAdd = board && page == 2;
			content.previousLabel = IW(I18nKey.UI.Bar.MainButtons.WhiteboardPreviousLabel);
			content.nextLabel = IW(content.nextIsAdd ? I18nKey.UI.Bar.MainButtons.WhiteboardAddPageLabel : I18nKey.UI.Bar.MainButtons.WhiteboardNextLabel);
			content.moreLabel = IW(I18nKey.UI.Bar.MainButtons.MoreLabel);
			content.enabled = { !board || page > 1, true, true };
			scene.ConfigurePagination(content);
			const LONG width = static_cast<LONG>((board ? BarWhiteboardPaginationLeftWidthDip : BarPptPaginationLongSideDip) * 3);
			scene.SetBounds({ 0, 0, width, 240 }, 3); scene.SetOpacity(1, 0);
			const auto render = [&](int f, const Path& output) {
				const auto time = origin + std::chrono::microseconds(33333LL * f);
				(void)scene.Advance(time); const auto bounds = scene.PresentationBounds();
				const UINT w = bounds.right - bounds.left, h = bounds.bottom - bounds.top;
				if (!check(scene.EnsureDeviceResources(RenderPipeline::GetDeviceEpoch(), w, h), "page-resources")) return;
				auto* dc = scene.DeviceContext(); auto& renderer = scene.Renderer();
				renderer.BeginFrameDraw(dc, D2D1::RectF(0, 0, static_cast<FLOAT>(w), static_cast<FLOAT>(h)));
				(void)scene.Render(dc, time); renderer.FinishFrameDrawCommands(dc);
				if (!check(renderer.EndFrameDraw(dc), "page-render")) return;
				scene.CommitPresented(); (void)scene.ConsumeDamage();
				if (!output.empty()) check(SaveTarget(dc, renderer.GetTargetBitmap(), output), "page-save");
			};
			for (int f = 0; f < 45; ++f) render(f, {});
			const auto name = (board ? L"board-page" : L"ppt-page-") + std::to_wstring(page);
			render(45, directory / (name + L".png"));
			{
				const auto sequence = name + L"-press";
				std::filesystem::create_directories(directory / sequence);
				for (int f = 0; f < 36; ++f) {
					if (f == 0) scene.ApplyPointer(BarSurfacePointerEventKind::Move, 4);
					if (f == 8) scene.ApplyPointer(BarSurfacePointerEventKind::Down, 4);
					if (f == 15) scene.ApplyPointer(BarSurfacePointerEventKind::Up, 4);
					if (f == 24) scene.ApplyPointer(BarSurfacePointerEventKind::Leave, 0);
					render(46 + f, directory / sequence / (std::to_wstring(f) + L".png"));
				}
			}
		}
		// 白板背景直接复用软件的 DrawTheme，包括点阵和网格纹理的相位与透明度。
		for (int pattern = 0; pattern < 3; ++pattern) {
			BarUIRendering renderer(nullptr);
			if (!check(renderer.EnsureDeviceResources(RenderPipeline::GetDeviceEpoch(), 1440, 720), "board-background-resource")) continue;
			auto* dc = renderer.GetDeviceContext();
			dc->BeginDraw(); dc->SetTransform(D2D1::IdentityMatrix());
			Inkeys::UI::WhiteboardVisual::DrawTheme(dc, D2D1::RectF(0, 0, 1440, 720), pattern == 1 ? 0xF5F1E6 : pattern == 2 ? 0x123B32 : 0xFFFFFF, pattern);
			check(dc->EndDraw(), "board-background-render");
			const wchar_t* names[] = { L"board-blank.png", L"board-dots.png", L"board-grid.png" };
			check(SaveTarget(dc, renderer.GetTargetBitmap(), directory / names[pattern]), "board-background-save");
		}
		// 独立无 HWND 交换链供正式 Draw3 shader 使用；不连接 DComp，不 Present。
		{
			using namespace Inkeys::Drawing::Draw3;
			ComPtr<ID3D11Device> device; ComPtr<ID3D11DeviceContext> context;
			D3D_FEATURE_LEVEL level;
			if (check(D3D11CreateDevice(nullptr, D3D_DRIVER_TYPE_WARP, nullptr, D3D11_CREATE_DEVICE_BGRA_SUPPORT,
				nullptr, 0, D3D11_SDK_VERSION, &device, &level, &context), "ink-device")) {
				ComPtr<IDXGIDevice> dxgi; ComPtr<IDXGIAdapter> adapter; ComPtr<IDXGIFactory2> factory; ComPtr<IDXGISwapChain1> swapChain;
				check(device.As(&dxgi), "ink-dxgi"); check(dxgi->GetAdapter(&adapter), "ink-adapter");
				check(adapter->GetParent(IID_PPV_ARGS(&factory)), "ink-factory");
				DXGI_SWAP_CHAIN_DESC1 desc{}; desc.Width = 1440; desc.Height = 720;
				desc.Format = DXGI_FORMAT_B8G8R8A8_UNORM; desc.SampleDesc.Count = 1;
				desc.BufferUsage = DXGI_USAGE_RENDER_TARGET_OUTPUT; desc.BufferCount = 2;
				desc.Scaling = DXGI_SCALING_STRETCH; desc.SwapEffect = DXGI_SWAP_EFFECT_FLIP_SEQUENTIAL;
				desc.AlphaMode = DXGI_ALPHA_MODE_PREMULTIPLIED;
				if (check(factory->CreateSwapChainForComposition(device.Get(), &desc, nullptr, &swapChain), "ink-offscreen-swapchain")) {
					InkRenderer ink;
					if (check(ink.Init(device.Get(), context.Get(), swapChain.Get(), 1440, 720, D3D_DRIVER_TYPE_WARP, true) ? S_OK : E_FAIL, "ink-renderer")) {
						D3D11_TEXTURE2D_DESC readDesc{}; ink.backBufferTexture->GetDesc(&readDesc);
						readDesc.Usage = D3D11_USAGE_STAGING; readDesc.BindFlags = 0; readDesc.CPUAccessFlags = D3D11_CPU_ACCESS_READ; readDesc.MiscFlags = 0;
						ComPtr<ID3D11Texture2D> readable;
						if (check(device->CreateTexture2D(&readDesc, nullptr, &readable), "ink-readback")) {
							for (int kind = 0; kind < 2; ++kind) {
								const std::wstring name = kind ? L"ink-underline" : L"ink-circle";
								std::filesystem::create_directories(directory / name);
								std::vector<InkPoint> points;
								for (int i = 0; i <= 240; ++i) {
									const float u = i / 240.0f;
									const float angle = -0.7f + u * 6.45f;
									const float x = kind ? 420 + 600 * u : 720 + 260 * std::cos(angle);
									const float y = kind ? 428 + 9 * std::sin(u * 4) : 342 + 160 * std::sin(angle);
									const float pressure = 0.6f + 0.4f * std::sin(3.14159f * u);
									points.push_back({ x, y, 3.7f * pressure, u });
								}
								for (int frame = 0; frame < 36; ++frame) {
									ink.ClearRTV(ink.backBufferRTV.Get(), kTransparentLayerClearColor);
									ink.ClearOperatorLayer(ink.layerL0); ink.ClearOperatorLayer(ink.layerL1);
									ink.SetOperatorTarget(ink.layerL0);
									const size_t count = 2 + static_cast<size_t>(239.0 * (frame + 1) / 36);
									check(ink.DrawStrokeOrDot(std::span<const InkPoint>(points.data(), count), DirectX::XMFLOAT4(45 / 255.f, 117 / 255.f, 230 / 255.f, 1)) >= 0 ? S_OK : E_FAIL, "ink-draw");
									check(ink.ApplyOperatorLayers(ink.backBufferRTV.Get(), ink.layerL1, ink.layerL0, { 0, 0, 1440, 720 }) ? S_OK : E_FAIL, "ink-resolve");
									context->OMSetRenderTargets(0, nullptr, nullptr); context->CopyResource(readable.Get(), ink.backBufferTexture.Get());
									D3D11_MAPPED_SUBRESOURCE map{};
									if (check(context->Map(readable.Get(), 0, D3D11_MAP_READ, 0, &map), "ink-map")) {
										check(SavePixels(directory / name / (std::to_wstring(frame) + L".png"), 1440, 720, map.RowPitch, static_cast<const BYTE*>(map.pData)), "ink-save");
										if (frame == 35) check(SavePixels(directory / (name + L".png"), 1440, 720, map.RowPitch, static_cast<const BYTE*>(map.pData)), "ink-final");
										context->Unmap(readable.Get(), 0);
									}
								}
							}
						}
						ink.ReleaseResources();
					}
				}
			}
		}
		owner.spec.DiscardDeviceResources();
		log << "failures=" << failures << '\n';
		return failures ? 1 : 0;
	}
}
