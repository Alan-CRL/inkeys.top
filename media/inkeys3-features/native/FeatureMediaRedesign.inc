namespace FeatureMediaRedesign
{
	using Path = std::filesystem::path;
	using Clock = std::chrono::steady_clock;
	using namespace Inkeys::Drawing::Draw3;
	using namespace ::draw3::shapes;
	using Microsoft::WRL::ComPtr;
	constexpr int kWidth = 1440;
	constexpr int kHeight = 720;
	constexpr float kPi = 3.14159265358979323846f;

	struct ExportContext
	{
		std::ofstream log;
		std::ofstream events;
		int failures = 0;
		bool Check(HRESULT hr, const char* step)
		{
			log << step << " hr=" << std::hex << hr << std::dec << '\n'; log.flush();
			if (FAILED(hr)) ++failures;
			return SUCCEEDED(hr);
		}
		bool Check(bool ok, const char* step) { return Check(ok ? S_OK : E_FAIL, step); }
	};

	void Emit(ExportContext& context, const char* asset, int frame, const char* phase,
		bool committed, const char* input, int commandCount = -1, int documentStrokes = -1,
		double opacity = -1, bool laser = false)
	{
		context.events << "{\"asset\":\"" << asset << "\",\"frame\":" << frame
			<< ",\"phase\":\"" << phase << "\",\"businessCommitted\":" << (committed ? "true" : "false")
			<< ",\"input\":\"" << input << '"';
		if (commandCount >= 0) context.events << ",\"commandCount\":" << commandCount;
		if (documentStrokes >= 0) context.events << ",\"documentStrokes\":" << documentStrokes;
		if (laser) context.events << ",\"contactId\":1,\"particles\":false,\"opacity\":"
			<< std::fixed << std::setprecision(6) << opacity << std::defaultfloat;
		context.events << "}\n";
	}

	Path FramePath(const Path& directory, const char* asset, int frame)
	{
		std::wostringstream name;
		name << std::setw(6) << std::setfill(L'0') << frame << L".png";
		return directory / asset / name.str();
	}

	ObjectId MakeId(unsigned asset, unsigned shape)
	{
		ObjectId id{};
		id[0] = static_cast<uint8_t>(asset);
		id[1] = static_cast<uint8_t>(shape);
		id[15] = 1;
		return id;
	}

	ShapeStyle MakeStyle(uint32_t rgb, float width = 4, LinePattern pattern = LinePattern::Solid)
	{
		ShapeStyle style;
		style.strokeRgb = rgb;
		style.width = width;
		style.linePattern = pattern;
		return style;
	}

	Vec2 Lerp(Vec2 a, Vec2 b, double progress)
	{
		const float t = static_cast<float>(progress);
		return { a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t };
	}

	std::optional<ShapeObject> MakeSimple(PresetKind preset, Vec2 start, Vec2 end,
		const ShapeStyle& style, const ObjectId& id)
	{
		ToolSpec tool; tool.preset = preset;
		return MakePresetShape(tool, start, end, style, id);
	}

	std::optional<ShapeObject> MakeAdvanced(PresetKind preset, Vec2 start, Vec2 end,
		const ConstructionParameters& parameters, const ShapeStyle& style, const ObjectId& id)
	{
		Construction construction;
		construction.tool.preset = preset;
		construction.tool.creationMode = preset == PresetKind::Polyline || preset == PresetKind::Polygon
			? CreationMode::Points : CreationMode::MultiStage;
		construction.start = start; construction.end = end; construction.parameters = parameters;
		return MakeConstructedShape(construction, style, id);
	}

	std::optional<ShapeObject> MakePolyline(const std::vector<Vec2>& points,
		const ShapeStyle& style, const ObjectId& id, bool closed = false)
	{
		return MakeAdvanced(closed ? PresetKind::Polygon : PresetKind::Polyline,
			points.front(), points.back(), VertexConstruction{ points }, style, id);
	}

	std::vector<Vec2> Reveal(const std::vector<Vec2>& points, double progress)
	{
		if (points.size() < 2) return points;
		const double scaled = std::clamp(progress, 0.0001, 1.0) * (points.size() - 1);
		const size_t complete = (std::min)(points.size() - 1, static_cast<size_t>(scaled));
		std::vector<Vec2> result(points.begin(), points.begin() + complete + 1);
		if (complete + 1 < points.size() && scaled - complete > 1e-6)
			result.push_back(Lerp(points[complete], points[complete + 1], scaled - complete));
		return result;
	}

	ShapeObject VisibleBase(ShapeObject shape)
	{
		shape.parts.erase(std::remove_if(shape.parts.begin(), shape.parts.end(), [](const ShapePart& part)
			{ return part.style && part.style->linePattern == LinePattern::Dashed; }), shape.parts.end());
		shape.construction.reset();
		return shape;
	}

	bool CommitShape(InkCanvas& canvas, const ShapeObject& shape)
	{
		CreationTransaction transaction;
		if (!transaction.Preview(shape)) return false;
		const auto command = transaction.Commit();
		return command && canvas.AppendShape(*command).has_value();
	}

	struct ShapeGesture
	{
		int start = 0;
		int commit = 0;
		std::function<std::optional<ShapeObject>(double)> make;
	};

	struct FreeStroke
	{
		std::vector<InkPoint> points;
		DirectX::XMFLOAT4 color;
	};

	std::vector<InkPoint> FreeLine(Vec2 a, Vec2 b, int count = 90, float radius = 3.2f, float wobble = 0)
	{
		std::vector<InkPoint> points;
		for (int i = 0; i < count; ++i)
		{
			const float u = static_cast<float>(i) / (count - 1);
			const auto p = Lerp(a, b, u);
			points.push_back({ p.x + wobble * std::sin(u * 7.0f), p.y + wobble * std::sin(u * 11.0f),
				radius * (0.72f + 0.28f * std::sin(kPi * u)), static_cast<float>(u) });
		}
		return points;
	}

	std::vector<InkPoint> FreeEllipse(Vec2 center, Vec2 radii, int count = 120, float radius = 3.2f)
	{
		std::vector<InkPoint> points;
		for (int i = 0; i <= count; ++i)
		{
			const float u = static_cast<float>(i) / count;
			const float angle = static_cast<float>(-0.35 + u * 2 * kPi);
			points.push_back({ center.x + radii.x * std::cos(angle), center.y + radii.y * std::sin(angle),
				radius * (0.78f + 0.22f * std::sin(kPi * u)), static_cast<float>(u) });
		}
		return points;
	}

	void AppendPoints(std::vector<InkPoint>& target, const std::vector<InkPoint>& source)
	{
		target.insert(target.end(), source.begin(), source.end());
	}

	int Export(const Path& directory)
	{
		std::filesystem::create_directories(directory);
		ExportContext context;
		context.log.open(directory / L"export.log");
		context.events.open(directory / L"export-events.jsonl");
		globalPath = (std::filesystem::absolute(directory) / L"runtime-config").wstring() + L"\\";
		std::filesystem::create_directories(Path(globalPath) / L"Inkeys/Config");
		if (!I18n::load(1, L"JSON", L"zh-CN")) return 4;
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
		ChangeStateModeToPen(); SetPenColor(RGB(45, 117, 230), false);
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
		for (int frame = 0; frame < 100; ++frame)
		{
			if (frame == 2) { owner.barState.fold = false; owner.UpdateRendering(false); }
			tick();
		}
		const auto settle = [&](int frames = 90) { for (int frame = 0; frame < frames; ++frame) tick(); };
		enum class SceneKind { Desktop, Ppt, Whiteboard };
		const auto prepare = [&](SceneKind scene, PenToolSelectionEnum tool, bool frozen)
		{
			if (Inkeys::UI::Freeze::IsActive()) Inkeys::UI::Freeze::Toggle();
			SetWhiteboardActive(false); Inkeys::UI::Freeze::SetWhiteboardActive(false);
			SetPptPresentationActive(false); Inkeys::UI::Freeze::SetPresentationActive(false);
			if (scene == SceneKind::Ppt)
			{
				SetPptPresentationActive(true); Inkeys::UI::Freeze::SetPresentationActive(true);
			}
			else if (scene == SceneKind::Whiteboard)
			{
				SetWhiteboardActive(true); Inkeys::UI::Freeze::SetWhiteboardActive(true);
			}
			SetCurrentPageHasContent(true); SetSelectAndClickThroughMode(1);
			ChangeStateModeToPen(); ChangeStateModeToPenTool(tool);
			if (frozen && !Inkeys::UI::Freeze::IsActive()) Inkeys::UI::Freeze::Toggle();
			owner.barState.fold = false;
			owner.barState.drawAttribute = owner.barState.geometryAttribute = false;
			owner.barState.moreExpanded = false;
			owner.UpdateRendering(false); settle();
		};
		const auto saveToolbar = [&](const char* name)
		{
			context.Check(FeatureMedia::SaveTarget(owner.spec.GetDeviceContext(), owner.spec.GetTargetBitmap(),
				directory / (std::string(name) + ".png")), name);
		};
		const auto captureToolbar = [&](const char* name, BarButtonPresetEnum preset,
			const std::function<void()>& commit)
		{
			auto* button = owner.barButtonSet.preset[static_cast<int>(preset)];
			if (!context.Check(button != nullptr, "toolbar-button-present")) return;
			std::filesystem::create_directories(directory / name);
			(void)StartBarButtonHoverVisual(*button);
			for (int frame = 0; frame < 72; ++frame)
			{
				if (frame == 24) SetBarButtonPressedVisual(*button, true);
				if (frame == 36)
				{
					SetBarButtonPressedVisual(*button, false);
					commit(); owner.UpdateRendering(false);
				}
				if (frame == 54) (void)StopBarButtonHoverVisual(*button, false);
				tick();
				context.Check(FeatureMedia::SaveTarget(owner.spec.GetDeviceContext(), owner.spec.GetTargetBitmap(),
					FramePath(directory, name, frame)), "toolbar-sequence-save");
				const char* phase = frame < 24 ? "Hover" : frame < 36 ? "Down" : frame == 36 ? "Up" : "Hold";
				Emit(context, name, frame, phase, frame >= 36, phase);
			}
			saveToolbar(name);
		};

		prepare(SceneKind::Desktop, PenToolSelectionEnum::SoftPen, false);
		captureToolbar("toolbar-draw", BarButtonPresetEnum::Draw, [] { ChangeStateModeToPen(); });
		prepare(SceneKind::Desktop, PenToolSelectionEnum::SoftPen, false);
		captureToolbar("toolbar-pierce", BarButtonPresetEnum::Pierce, []
			{ SetCurrentPageHasContent(true); ChangeStateModeToClickThrough(); });
		prepare(SceneKind::Desktop, PenToolSelectionEnum::SoftPen, false);
		captureToolbar("toolbar-freeze", BarButtonPresetEnum::Freeze, []
			{ if (!Inkeys::UI::Freeze::IsActive()) Inkeys::UI::Freeze::Toggle(); });
		prepare(SceneKind::Desktop, PenToolSelectionEnum::SoftPen, true);
		captureToolbar("toolbar-shape", BarButtonPresetEnum::Geometry, [] { ChangeStateModeToShape(); });
		prepare(SceneKind::Ppt, PenToolSelectionEnum::SoftPen, false);
		saveToolbar("toolbar-ppt");
		captureToolbar("toolbar-ppt-shape", BarButtonPresetEnum::Geometry, [] { ChangeStateModeToShape(); });
		prepare(SceneKind::Whiteboard, PenToolSelectionEnum::SoftPen, false);
		saveToolbar("toolbar-whiteboard");
		prepare(SceneKind::Whiteboard, PenToolSelectionEnum::Laser, false);
		saveToolbar("toolbar-whiteboard-laser");
		callback = {};

		const auto exportPage = [&](const char* name, bool board, int initialPage, bool next)
		{
			BarPageSurface scene; BarPageSurfaceContent content;
			content.surface = 0; content.whiteboard = board; content.pptActive = !board;
			content.totalPage = L"/2";
			const auto configure = [&](int page)
			{
				content.currentPage = std::to_wstring(page);
				content.nextIsAdd = board && page == 2;
				content.previousLabel = IW(I18nKey.UI.Bar.MainButtons.WhiteboardPreviousLabel);
				content.nextLabel = IW(content.nextIsAdd
					? I18nKey.UI.Bar.MainButtons.WhiteboardAddPageLabel
					: I18nKey.UI.Bar.MainButtons.WhiteboardNextLabel);
				content.moreLabel = IW(I18nKey.UI.Bar.MainButtons.MoreLabel);
				content.enabled = { !board || page > 1, true, true };
				scene.ConfigurePagination(content);
			};
			configure(initialPage);
			const LONG width = static_cast<LONG>((board ? BarWhiteboardPaginationLeftWidthDip : BarPptPaginationLongSideDip) * 3);
			scene.SetBounds({ 0, 0, width, 240 }, 3); scene.SetOpacity(1, 0);
			const auto render = [&](int frame, const Path& output)
			{
				const auto time = origin + std::chrono::microseconds(16667LL * frame);
				(void)scene.Advance(time); const auto bounds = scene.PresentationBounds();
				const UINT w = bounds.right - bounds.left, h = bounds.bottom - bounds.top;
				if (!context.Check(scene.EnsureDeviceResources(RenderPipeline::GetDeviceEpoch(), w, h), "page-resources")) return;
				auto* dc = scene.DeviceContext(); auto& renderer = scene.Renderer();
				renderer.BeginFrameDraw(dc, D2D1::RectF(0, 0, static_cast<FLOAT>(w), static_cast<FLOAT>(h)));
				(void)scene.Render(dc, time); renderer.FinishFrameDrawCommands(dc);
				if (!context.Check(renderer.EndFrameDraw(dc), "page-render")) return;
				scene.CommitPresented(); (void)scene.ConsumeDamage();
				if (!output.empty()) context.Check(FeatureMedia::SaveTarget(dc, renderer.GetTargetBitmap(), output), "page-save");
			};
			for (int frame = 0; frame < 45; ++frame) render(frame, {});
			render(45, directory / (std::string(name) + ".png"));
			std::filesystem::create_directories(directory / name);
			int commands = 0;
			const int targetPage = next ? initialPage + 1 : initialPage - 1;
			const auto policy = Inkeys::UI::PageControl::ResolvePptDirectionPressPolicy(
				board ? Inkeys::UI::PageControl::WorkspaceMode::WhiteboardExpanded
					: Inkeys::UI::PageControl::WorkspaceMode::PptCompact, true);
			context.Check(policy.invokeOnPointerDown == !board, "direction-commit-policy");
			for (int frame = 0; frame < 72; ++frame)
			{
				if (frame == 0) scene.ApplyPointer(BarSurfacePointerEventKind::Move, next ? 4 : 2);
				if (frame == 24)
				{
					scene.ApplyPointer(BarSurfacePointerEventKind::Down, next ? 4 : 2);
					if (!board) { ++commands; configure(targetPage); }
				}
				if (frame == 36)
				{
					scene.ApplyPointer(BarSurfacePointerEventKind::Up, next ? 4 : 2);
					if (board) { ++commands; configure(targetPage); }
				}
				if (frame == 54) scene.ApplyPointer(BarSurfacePointerEventKind::Leave, 0);
				render(46 + frame, FramePath(directory, name, frame));
				const bool committed = board ? frame >= 36 : frame >= 24;
				const char* phase = frame < 24 ? "Hover" : frame < 36 ? "Down" : frame == 36 ? "Up" : "Hold";
				Emit(context, name, frame, phase, committed, phase, board ? -1 : commands);
			}
		};
		exportPage("ppt-page-1", false, 1, true);
		exportPage("ppt-page-2", false, 2, false);
		exportPage("board-page1", true, 1, true);
		exportPage("board-page2", true, 2, false);

		for (int pattern = 0; pattern < 3; ++pattern)
		{
			BarUIRendering renderer(nullptr);
			if (!context.Check(renderer.EnsureDeviceResources(RenderPipeline::GetDeviceEpoch(), 1440, 720), "board-resource")) continue;
			auto* dc = renderer.GetDeviceContext();
			dc->BeginDraw(); dc->SetTransform(D2D1::IdentityMatrix());
			Inkeys::UI::WhiteboardVisual::DrawTheme(dc, D2D1::RectF(0, 0, 1440, 720),
				pattern == 1 ? 0xF5F1E6 : pattern == 2 ? 0x123B32 : 0xFFFFFF, pattern);
			context.Check(dc->EndDraw(), "board-render");
			const wchar_t* names[] = { L"board-blank.png", L"board-dots.png", L"board-grid.png" };
			context.Check(FeatureMedia::SaveTarget(dc, renderer.GetTargetBitmap(), directory / names[pattern]), "board-save");
		}

		ComPtr<ID3D11Device> device; ComPtr<ID3D11DeviceContext> deviceContext;
		const D3D_FEATURE_LEVEL level = D3D_FEATURE_LEVEL_11_0;
		if (context.Check(D3D11CreateDevice(nullptr, D3D_DRIVER_TYPE_WARP, nullptr,
			D3D11_CREATE_DEVICE_BGRA_SUPPORT, &level, 1, D3D11_SDK_VERSION,
			&device, nullptr, &deviceContext), "draw3-device"))
		{
			InkRenderer ink;
			if (context.Check(ink.Init(device.Get(), deviceContext.Get(), nullptr, kWidth, kHeight,
				D3D_DRIVER_TYPE_WARP, false), "draw3-renderer"))
			{
				D3D11_TEXTURE2D_DESC readDescription{};
				ink.backBufferTexture->GetDesc(&readDescription);
				readDescription.Usage = D3D11_USAGE_STAGING; readDescription.BindFlags = 0;
				readDescription.CPUAccessFlags = D3D11_CPU_ACCESS_READ; readDescription.MiscFlags = 0;
				ComPtr<ID3D11Texture2D> readable;
				if (context.Check(device->CreateTexture2D(&readDescription, nullptr, &readable), "draw3-readback"))
				{
					const auto save = [&](const Path& path)
					{
						deviceContext->OMSetRenderTargets(0, nullptr, nullptr);
						deviceContext->CopyResource(readable.Get(), ink.backBufferTexture.Get());
						D3D11_MAPPED_SUBRESOURCE map{};
						const HRESULT hr = deviceContext->Map(readable.Get(), 0, D3D11_MAP_READ, 0, &map);
						if (FAILED(hr)) return context.Check(hr, "draw3-map");
						const HRESULT saved = FeatureMedia::SavePixels(path, kWidth, kHeight, map.RowPitch,
							static_cast<const BYTE*>(map.pData));
						deviceContext->Unmap(readable.Get(), 0);
						return context.Check(saved, "draw3-save");
					};
					const auto begin = [&]
					{
						ink.ClearRTV(ink.backBufferRTV.Get(), kTransparentLayerClearColor);
						ink.ClearOperatorLayer(ink.layerL0); ink.ClearOperatorLayer(ink.layerL1);
					};
					const auto exportFree = [&](const char* name, const std::vector<FreeStroke>& strokes)
					{
						std::filesystem::create_directories(directory / name);
						size_t total = 0; for (const auto& stroke : strokes) total += stroke.points.size();
						for (int frame = 0; frame < 96; ++frame)
						{
							begin(); ink.SetOperatorTarget(ink.layerL0);
							const size_t visible = (std::min)(total, static_cast<size_t>(std::max(2,
								static_cast<int>(std::ceil(total * static_cast<double>((std::min)(frame + 1, 73)) / 73.0)))));
							size_t remaining = visible;
							for (const auto& stroke : strokes)
							{
								const size_t count = (std::min)(remaining, stroke.points.size());
								if (count)
								{
									context.Check(ink.DrawStrokeOrDot(std::span<const InkPoint>(stroke.points.data(), count),
										stroke.color) >= 0, "free-draw");
									remaining -= count;
								}
							}
							context.Check(ink.ApplyOperatorLayers(ink.backBufferRTV.Get(), ink.layerL0,
								ink.layerL1, { 0, 0, kWidth, kHeight }), "free-resolve");
							context.Check(save(FramePath(directory, name, frame)), "free-frame");
							const char* phase = frame == 0 ? "Down" : frame < 72 ? "Move" : frame == 72 ? "Up" : "Hold";
							Emit(context, name, frame, phase, false, phase);
						}
						context.Check(save(directory / (std::string(name) + ".png")), "free-final");
					};
					const auto exportShapes = [&](const char* name, const std::vector<ShapeObject>& persistent,
						const std::vector<ShapeGesture>& gestures, int frameCount)
					{
						std::filesystem::create_directories(directory / name);
						InkPage page(InkGuid({ 1 }));
						auto* canvas = page.GetOrCreateCanvas(kDefaultDeviceKey);
						if (!context.Check(canvas != nullptr, "shape-document")) return;
						for (const auto& shape : persistent) context.Check(CommitShape(*canvas, shape), "shape-base-commit");
						std::vector<bool> committed(gestures.size(), false);
						const int lastCommit = gestures.empty() ? 0 : gestures.back().commit;
						for (int frame = 0; frame < frameCount; ++frame)
						{
							for (size_t index = 0; index < gestures.size(); ++index)
							{
								if (committed[index] || gestures[index].commit != frame) continue;
								const auto shape = gestures[index].make(1.0);
								context.Check(shape && CommitShape(*canvas, *shape), "shape-up-commit");
								committed[index] = true;
							}
							begin(); ink.SetOperatorTarget(ink.layerL0);
							for (const auto& stroke : canvas->Strokes())
								if (stroke.Shape()) context.Check(ink.DrawShapeObject(*stroke.Shape()), "shape-document-draw");
							const char* input = "Hold";
							for (size_t index = 0; index < gestures.size(); ++index)
							{
								const auto& gesture = gestures[index];
								if (committed[index] || frame < gesture.start || frame >= gesture.commit) continue;
								const double progress = static_cast<double>(frame - gesture.start + 1) / (gesture.commit - gesture.start);
								const auto candidate = gesture.make(progress);
								CreationTransaction preview;
								if (context.Check(candidate && preview.Preview(*candidate), "shape-preview"))
								{
									RenderData data;
									if (context.Check(BuildRenderData(*preview.Candidate(), data), "shape-preview-data"))
										context.Check(ink.DrawShapeRenderData(data), "shape-preview-draw");
								}
								input = frame == 0 ? "Down" : "Move";
							}
							context.Check(ink.ApplyOperatorLayers(ink.backBufferRTV.Get(), ink.layerL0,
								ink.layerL1, { 0, 0, kWidth, kHeight }), "shape-resolve");
							context.Check(save(FramePath(directory, name, frame)), "shape-frame");
							const bool complete = frame >= lastCommit;
							if (complete) input = "Hold";
							else
							{
								for (const auto& gesture : gestures) if (gesture.commit == frame) input = "Up";
							}
							Emit(context, name, frame, complete ? "Committed" : "Preview", complete, input,
								-1, static_cast<int>(canvas->Strokes().size()));
						}
						context.Check(save(directory / (std::string(name) + ".png")), "shape-final");
					};

					const DirectX::XMFLOAT4 blue(45 / 255.f, 117 / 255.f, 230 / 255.f, 1);
					const DirectX::XMFLOAT4 light(220 / 255.f, 245 / 255.f, 236 / 255.f, 1);
					const DirectX::XMFLOAT4 teal(0 / 255.f, 100 / 255.f, 85 / 255.f, 1);
					{
						std::vector<FreeStroke> strokes;
						strokes.push_back({ FreeLine({ 560, 480 }, { 690, 480 }), blue });
						std::vector<InkPoint> arrow;
						AppendPoints(arrow, FreeLine({ 610, 452 }, { 738, 420 }));
						AppendPoints(arrow, FreeLine({ 738, 420 }, { 716, 417 }, 25));
						AppendPoints(arrow, FreeLine({ 738, 420 }, { 726, 441 }, 25));
						strokes.push_back({ std::move(arrow), blue });
						exportFree("pendulum-mark", strokes);
					}
					{
						std::vector<InkPoint> points;
						for (int i = 0; i <= 160; ++i)
						{
							const float u = i / 160.0f;
							points.push_back({ 420 + 560 * u, 450 + 10 * std::sin(u * 4 * kPi), 3.4f, u });
						}
						exportFree("binding-ink", { { std::move(points), blue } });
					}
					exportFree("ready-ink", { { FreeLine({ 500, 450 }, { 720, 270 }, 120, 3.5f, 1.2f), blue } });
					{
						std::vector<FreeStroke> strokes;
						strokes.push_back({ FreeEllipse({ 500, 360 }, { 58, 58 }), light });
						std::vector<InkPoint> branch;
						AppendPoints(branch, FreeLine({ 565, 360 }, { 830, 360 }));
						AppendPoints(branch, FreeLine({ 830, 360 }, { 808, 344 }, 25));
						AppendPoints(branch, FreeLine({ 830, 360 }, { 808, 376 }, 25));
						strokes.push_back({ std::move(branch), light });
						strokes.push_back({ FreeEllipse({ 900, 360 }, { 58, 58 }), light });
						exportFree("board-page1-ink", strokes);
					}
					{
						std::vector<FreeStroke> strokes;
						strokes.push_back({ FreeEllipse({ 460, 310 }, { 52, 52 }), teal });
						std::vector<InkPoint> branch;
						AppendPoints(branch, FreeLine({ 505, 335 }, { 790, 430 }));
						AppendPoints(branch, FreeLine({ 790, 430 }, { 772, 409 }, 25));
						AppendPoints(branch, FreeLine({ 790, 430 }, { 766, 434 }, 25));
						strokes.push_back({ std::move(branch), teal });
						strokes.push_back({ FreeEllipse({ 855, 450 }, { 52, 52 }), teal });
						exportFree("board-page2-ink", strokes);
					}

					const ShapeStyle cyan = MakeStyle(0x20AFCF);
					const ShapeStyle orange = MakeStyle(0xE9A23B, 4, LinePattern::Dashed);
					const ShapeStyle gray = MakeStyle(0x3F464D);
					const ShapeStyle mgStyle = MakeStyle(0x2D75E6);
					{
						// 最高点 |T|=160cos55°；平行四边形表达 mg 的径向/切向分解。
						const Vec2 ball{ 900, 260 }, mgEnd{ 900, 420 };
						const Vec2 tEnd{ 824.824590f, 207.361611f }, ftEnd{ 824.824590f, 367.361611f };
						const Vec2 radialEnd{ 975.175410f, 312.638389f };
						const auto arrow = [](Vec2 a, Vec2 b, const ShapeStyle& style, const ObjectId& id, double progress)
						{ return MakeSimple(PresetKind::Arrow, a, Lerp(a, b, progress), style, id); };
						exportShapes("force-solids", {}, {
							{ 0, 48, [&](double p) { return arrow(ball, mgEnd, mgStyle, MakeId(20, 1), p); } },
							{ 48, 96, [&](double p) { return arrow(ball, tEnd, cyan, MakeId(20, 2), p); } },
							{ 96, 144, [&](double p) { return arrow(ball, ftEnd, MakeStyle(0xE9A23B), MakeId(20, 3), p); } },
						}, 180);
						const std::vector<Vec2> parallelogram{ ball, radialEnd, mgEnd, ftEnd };
						exportShapes("force-dashed", {}, {
							{ 0, 84, [&](double p) -> std::optional<ShapeObject>
							{
								if (p >= 1.0) return MakePolyline(parallelogram, orange, MakeId(21, 1), true);
								return MakePolyline(Reveal(parallelogram, p), orange, MakeId(21, 1));
							} },
						}, 120);
					}
					{
						exportShapes("cuboid-solid", {}, {
							{ 0, 84, [&](double p) { return MakeSimple(PresetKind::Line, Vec2{ 480, 430 },
								Lerp(Vec2{ 480, 430 }, Vec2{ 700, 260 }, p), cyan, MakeId(22, 1)); } },
						}, 120);
						auto base = MakeAdvanced(PresetKind::Cuboid, { 480, 260 }, { 700, 430 },
							SolidConstruction{ { 110, -70 }, 0 }, gray, MakeId(23, 1));
						context.Check(base.has_value(), "solid-base-factory");
						std::vector<ShapeObject> persistent;
						if (base) persistent.push_back(VisibleBase(*base));
						const std::vector<Vec2> hiddenPath{ { 480, 430 }, { 590, 360 }, { 810, 360 } };
						exportShapes("cuboid-dashed", persistent, {
							{ 0, 42, [&](double p) { return MakePolyline(Reveal(hiddenPath, p), orange, MakeId(23, 2)); } },
							{ 42, 84, [&](double p) { return MakeSimple(PresetKind::Line, Vec2{ 590, 190 },
								Lerp(Vec2{ 590, 190 }, Vec2{ 590, 360 }, p), orange, MakeId(23, 3)); } },
						}, 120);
					}
					{
						exportShapes("cone-solid", {}, {
							{ 0, 42, [&](double p) { return MakeSimple(PresetKind::Line, Vec2{ 960, 450 },
								Lerp(Vec2{ 960, 450 }, Vec2{ 1120, 450 }, p), cyan, MakeId(24, 1)); } },
							{ 42, 84, [&](double p) { return MakePolyline(Reveal(
								std::vector<Vec2>{ { 960, 430 }, { 980, 430 }, { 980, 450 } }, p), cyan, MakeId(24, 2)); } },
						}, 120);
						auto base = MakeAdvanced(PresetKind::Cone, { 800, 450 }, { 1120, 505 },
							SolidConstruction{ { 0, 0 }, -240 }, gray, MakeId(25, 1));
						context.Check(base.has_value(), "solid-base-factory");
						std::vector<ShapeObject> persistent;
						if (base) persistent.push_back(VisibleBase(*base));
						exportShapes("cone-dashed", persistent, {
							{ 0, 42, [&](double p) { return MakeSimple(PresetKind::Line, Vec2{ 960, 210 },
								Lerp(Vec2{ 960, 210 }, Vec2{ 960, 450 }, p), orange, MakeId(25, 2)); } },
							{ 42, 84, [&](double p) { return MakeAdvanced(PresetKind::Arc, Vec2{ 960, 450 },
								Vec2{ 1120, 450 }, ArcConstruction{ static_cast<float>(kPi * p) }, orange, MakeId(25, 3)); } },
						}, 120);
					}

					{
						std::vector<InkPoint> wave;
						for (int i = 0; i <= 240; ++i)
						{
							const float u = i / 240.0f;
							wave.push_back({ 80 + 1280 * u, 360 + 70 * std::sin(u * 5 * kPi),
								LaserSolidRadius(1), u });
						}
						ink.ConfigureLaserStyle(1, { 1, 0.125f, 0.2f, 1 });
						LaserTrailLifecycle lifecycle;
						BeginLaserContact(lifecycle);
						std::filesystem::create_directories(directory / "laser-wave");
						for (int frame = 0; frame < 192; ++frame)
						{
							if (frame == 72) EndLaserContact(lifecycle, 72);
							const float opacity = EvaluateLaserTrailOpacity(lifecycle, frame, 60, 1.0);
							begin(); ink.ClearLaserCoverage(ink.laserStrokeCoverage);
							ink.SetLaserCoverageTarget(ink.laserStrokeCoverage);
							const size_t count = frame < 72 ? 2 + static_cast<size_t>(238.0 * (frame + 1) / 72) : wave.size();
							context.Check(ink.DrawLaserCoverage(std::span<const InkPoint>(wave.data(), count)) >= 0, "laser-coverage");
							context.Check(ink.ResolveLaserStrokeCoverage(ink.backBufferRTV.Get(), { 0, 0, kWidth, kHeight }, opacity), "laser-resolve");
							context.Check(save(FramePath(directory, "laser-wave", frame)), "laser-frame");
							const char* phase = frame < 72 ? "Active" : frame < 132 ? "Hold" : frame < 180 ? "Fade" : "Inactive";
							const char* input = frame == 0 ? "Down" : frame < 72 ? "Move" : frame == 72 ? "Up" : "Hold";
							Emit(context, "laser-wave", frame, phase, false, input, -1, -1, opacity, true);
							if (frame == 131) context.Check(save(directory / L"laser-wave.png"), "laser-final");
						}
					}
					ink.ReleaseResources();
				}
			}
		}

		{
			InkRenderer cursor;
			if (device && context.Check(cursor.Init(device.Get(), deviceContext.Get(), nullptr, 192, 192,
				D3D_DRIVER_TYPE_WARP, false), "cursor-renderer"))
			{
				D3D11_TEXTURE2D_DESC description{};
				cursor.backBufferTexture->GetDesc(&description);
				description.Usage = D3D11_USAGE_STAGING; description.BindFlags = 0;
				description.CPUAccessFlags = D3D11_CPU_ACCESS_READ; description.MiscFlags = 0;
				ComPtr<ID3D11Texture2D> readable;
				if (context.Check(device->CreateTexture2D(&description, nullptr, &readable), "cursor-readback"))
				{
					for (bool light : { true, false })
					{
						DrawingCursorAppearance selected;
						selected.red = 45 / 255.f; selected.green = 117 / 255.f; selected.blue = 230 / 255.f;
						selected.width = selected.height = 24;
						DrawingCursorAppearance eraser;
						DrawingCursorSample mouse; mouse.x = mouse.y = 64; mouse.valid = mouse.inContact = true;
						DrawingCursorSample pen;
						CursorSettings settings; settings.mouseStyle = MouseCursorStyle::Drawing;
						settings.penStyle = PenCursorStyle::PenIcon;
						auto visual = ResolvePrimaryDrawingCursorVisual(pen, mouse,
							DrawingCursorPointerAuthority::Mouse, selected, eraser, false, true,
							false, false, &settings, true, 3);
						visual.appearance.outlineRed = visual.appearance.outlineGreen = visual.appearance.outlineBlue = light ? 0.08f : 0.96f;
						visual.appearance.outlineOpacity = 1;
						cursor.ClearRTV(cursor.backBufferRTV.Get(), kTransparentLayerClearColor);
						cursor.DrawTransientDrawingCursor(visual);
						deviceContext->OMSetRenderTargets(0, nullptr, nullptr);
						deviceContext->CopyResource(readable.Get(), cursor.backBufferTexture.Get());
						D3D11_MAPPED_SUBRESOURCE map{};
						const HRESULT hr = deviceContext->Map(readable.Get(), 0, D3D11_MAP_READ, 0, &map);
						if (context.Check(SUCCEEDED(hr), "cursor-map"))
						{
							const Path path = directory / (light ? L"pen-icon-light.png" : L"pen-icon-dark.png");
							context.Check(FeatureMedia::SavePixels(path, 192, 192, map.RowPitch,
								static_cast<const BYTE*>(map.pData)), "cursor-save");
							deviceContext->Unmap(readable.Get(), 0);
						}
					}
				}
				cursor.ReleaseResources();
			}
		}
		owner.spec.DiscardDeviceResources();
		context.log << "failures=" << context.failures << '\n';
		return context.failures ? 1 : 0;
	}
}
