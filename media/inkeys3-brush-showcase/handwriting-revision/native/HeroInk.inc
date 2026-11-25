// dev 构建：软笔 / 硬笔 / 荧光笔 / 激光笔均按生产管线生成——输入采样经真实 stroke modeler、
// 速度估宽与收笔笔锋，完成后 FinalizeStoredStroke 成为持久 InkStroke，再按生产重放逐笔绘制。
namespace HeroExport
{
	using namespace Inkeys::Drawing::Draw3;

	// 画布对应 2 倍屏（192 DPI），与网页配图的“2 倍屏幕”一致。
	constexpr int kHeroDpi = 192;

	std::unique_ptr<ActiveStroke> RunModel(Context& context, const HeroScene::Free& free, StrokeWidthMode mode, bool highlighter)
	{
		using namespace ink::stroke_model;
		auto config = CreateStrokeModelConfiguration(kHeroDpi);
		ApplyPredictionMode(config.modelParams, config.kalmanPredictorParams);
		auto stroke = std::make_unique<ActiveStroke>(free.width, config.expectedSpeed, mode, highlighter);
		stroke->useDisplayTime = true;
		if (!context.Check(stroke->modeler.Reset(config.modelParams).ok(), "model-reset") || free.samples.empty()) return nullptr;
		const double frame = 1.0 / config.timingProfile.target_fps;
		const auto& first = free.samples.front();
		stroke->inputStartPoint = { first.x, first.y, free.width * 0.5f, 0 };
		stroke->hasInputStartPoint = true;
		double lastModelTime = 0, lastTime = 0;
		float filteredSpeed = -1;
		DirectX::XMFLOAT2 previous{ first.x, first.y }, endpoint = previous;
        // 与 DrawingController 的逐帧 idle settling 同步；静止不是输入位移。
        auto advanceIdle = [&](double physical) -> bool
        {
            stroke->logicalInputTime = physical;
            if (!stroke->endpointAdmission.active && !ShouldStartEndpointSettling(physical-stroke->lastMovementInputTime, frame)) return true;
            if (!stroke->endpointAdmission.active) BeginEndpointAdmission(*stroke, endpoint);
            if (IsModeledTipSettled(LatestModeledTip(*stroke), endpoint, frame))
            {
                stroke->modelClockStopped = true;
                if (stroke->endpointAdmission.recovering) { ClearEndpointAdmission(*stroke); BeginEndpointAdmission(*stroke, endpoint); }
                stroke->modelScratch.clear();
                RecordPenTailModelBoundary(*stroke, physical);
                AppendEndpointBoundedModeledPoints(*stroke, stroke->modelScratch, -1.0f, stroke->lastMovementInputTime, true);
                return true;
            }
            const double modelTime = physical - stroke->modelTimeOffset;
            if (modelTime < lastModelTime + 0.000001) return true;
            const Input stationary{ .event_type = Input::EventType::kMove, .position={endpoint.x,endpoint.y}, .time=Time(modelTime), .pressure=1, .tilt=1.5707963f, .orientation=0 };
            stroke->modelScratch.clear();
            if (!context.Check(stroke->modeler.Update(stationary, stroke->modelScratch).ok(), "model-idle")) return false;
            lastModelTime = modelTime;
            RecordPenTailModelBoundary(*stroke, physical);
            if (stroke->endpointAdmission.recovering) AppendRecoveryModeledPoints(*stroke, stroke->modelScratch, endpoint, -1.0f);
            else AppendEndpointBoundedModeledPoints(*stroke, stroke->modelScratch, -1.0f, stroke->lastMovementInputTime);
            return true;
        };

		for (size_t i = 0; i < free.samples.size(); ++i)
		{
			const auto& sample = free.samples[i];
			const double time = sample.t / 1000.0;
			endpoint = { sample.x, sample.y };
            if (free.upDelayMs >= 0 && i && std::hypot(endpoint.x-previous.x,endpoint.y-previous.y) <= 0.25f)
            {
                endpoint = previous;
                if (!advanceIdle(time)) return nullptr;
                continue; // 不更新真实速度的时间/位置基准。
            }
			// 与生产一致：速度取自原始输入，首样本直接使用，之后按 60ms 时间常数低通。
			if (i)
			{
				const double dt = (std::max)(1e-4, time - lastTime);
				const float measured = static_cast<float>(std::hypot(endpoint.x - previous.x, endpoint.y - previous.y) / dt);
				const float alpha = static_cast<float>(std::clamp(1.0 - std::exp(-dt / 0.060), 0.02, 0.35));
				filteredSpeed = filteredSpeed < 0 ? measured : filteredSpeed + (measured - filteredSpeed) * alpha;
			}
			stroke->logicalInputTime = time;
            // 新输入区分真实移动和静止快照；旧分支保留原导出行为作对照。
            if (free.upDelayMs < 0 || !i || endpoint.x != previous.x || endpoint.y != previous.y)
                { stroke->lastMovementInputTime = time; if (free.upDelayMs >= 0) stroke->liveTipLength.reset(); }
			RecordPenTailRawInput(*stroke, endpoint, time);
			const double modelTime = i ? ResolvePenModelInputTime(*stroke, time, lastModelTime, frame) : time;
			lastModelTime = modelTime;
			const Input input{ .event_type = i ? Input::EventType::kMove : Input::EventType::kDown,
				.position = { endpoint.x, endpoint.y }, .time = Time(modelTime), .pressure = 1, .tilt = 1.5707963f, .orientation = 0 };
			const bool bounded = free.upDelayMs >= 0 && stroke->endpointAdmission.active;
            if (bounded) stroke->modelScratch.clear();
            auto& output = bounded ? stroke->modelScratch : stroke->modeledResults;
            if (!context.Check(stroke->modeler.Update(input, output).ok(), "model-move")) return nullptr;
            if (bounded) AppendRecoveryModeledPoints(*stroke, output, endpoint, filteredSpeed);
            else AppendNewModeledPoints(*stroke, filteredSpeed);
			previous = endpoint; lastTime = time;
		}
		const double upTime = free.samples.back().t/1000.0 + (free.upDelayMs < 0 ? 0.0001 : free.upDelayMs / 1000.0);
        if (free.upDelayMs >= 0) for (double physical = free.samples.back().t/1000.0 + frame; physical < upTime; physical += frame)
            if (!advanceIdle(physical)) return nullptr;
        endpoint = {free.samples.back().x,free.samples.back().y};

		stroke->logicalInputTime = upTime;
		LockPenTerminalState(*stroke, upTime, free.upDelayMs < 0 ? endpoint : previous, endpoint);
		RecordPenTailRawInput(*stroke, endpoint, upTime);
		lastModelTime = ResolvePenModelInputTime(*stroke, upTime, lastModelTime, frame);
		stroke->modelScratch.clear();
		const Input up{ .event_type = Input::EventType::kUp, .position = { endpoint.x, endpoint.y },
			.time = Time(lastModelTime), .pressure = 1, .tilt = 1.5707963f, .orientation = 0 };
		if (!context.Check(stroke->modeler.Update(up, stroke->modelScratch).ok(), "model-up")) return nullptr;
		BeginEndpointAdmission(*stroke, endpoint);
		AppendEndpointBoundedModeledPoints(*stroke, stroke->modelScratch, -1, free.upDelayMs < 0 ? lastTime : stroke->lastMovementInputTime, true);
		return stroke;
	}

	bool DrawFree(Context& context, HeroCanvas::Target& target, const HeroScene::Free& free)
	{
		const bool soft = free.tool == "soft", highlighter = free.tool == "highlighter" || free.tool == "flat";
		// 普通笔（软笔）在鼠标/触摸下为模拟压感；硬笔与荧光笔固定宽度且不加笔锋。
		auto stroke = RunModel(context, free, soft ? StrokeWidthMode::SimulatedPressure : StrokeWidthMode::Fixed, highlighter);
		if (!stroke) return false;
		StoredInkStyle style;
		style.inkType = highlighter ? StoredInkType::Highlighter : StoredInkType::Pen;
		style.fallbackRgb = (static_cast<uint32_t>(free.r * 255 + 0.5f) << 16) | (static_cast<uint32_t>(free.g * 255 + 0.5f) << 8)
			| static_cast<uint32_t>(free.b * 255 + 0.5f);
		style.opacity = free.a; // 平头覆盖刷不透明。
		std::vector<InkPoint> scratch;
		const auto stored = FinalizeStoredStroke(*stroke, style, soft ? 0.055 : 0.0, scratch);
		if (!context.Check(stored.has_value(), "finalize-stroke")) return false;
		// 记录真实建模与存储宽度，不从最终图片反推半径。
        float wmin = 1e9f, wmax = 0; double vmin = 1e9, vmax = 0;
        for (size_t i=1;i<free.samples.size();++i) { const auto& a=free.samples[i-1]; const auto& b=free.samples[i]; const double dt=(b.t-a.t)/1000.0; if(dt>0) { const double v=std::hypot(b.x-a.x,b.y-a.y)/dt; vmin=(std::min)(vmin,v); vmax=(std::max)(vmax,v); } }
        for (size_t i=0;i<scratch.size();++i) { const auto& p=scratch[i]; wmin=(std::min)(wmin,2*p.r); wmax=(std::max)(wmax,2*p.r); context.geometry << context.layer << ',' << context.strokeIndex << ",stored," << i << ',' << p.x << ',' << p.y << ',' << 2*p.r << ',' << p.time << '\n'; }
        for (size_t i=0;i<stroke->realPoints.size();++i) { const auto& p=stroke->realPoints[i]; context.geometry << context.layer << ',' << context.strokeIndex << ",modeled," << i << ',' << p.x << ',' << p.y << ',' << 2*p.r << ',' << p.time << '\n'; }
        context.diagnostics << context.layer << ',' << context.strokeIndex++ << ',' << (free.upDelayMs<0?"legacy":"physical-hold") << ',' << free.samples.size() << ',' << free.width << ',' << free.samples.front().t << ',' << free.samples.back().t << ',' << stroke->lastMovementInputTime*1000 << ',' << ResolvePenDisplayTime(*stroke)*1000 << ',' << (ResolvePenDisplayTime(*stroke)-stroke->lastMovementInputTime)*1000 << ',' << vmin << ',' << vmax << ',' << stroke->realPoints.size() << ',' << scratch.size() << ',' << wmin << ',' << wmax << ',' << (scratch.empty()?0:2*scratch.back().r) << ",0.055\n";
        // 生产重放：逐笔清空 L1、绘制、再与恒等 L0 合成，保证荧光笔与普通笔的叠放次序。
		HighlighterGeometry highlighterScratch;
		target.ink.ClearOperatorLayer(target.ink.layerL1); target.ink.ClearOperatorLayer(target.ink.layerL0);
		const StoredStrokeRasterTarget raster{ &target.ink.layerL1, 0, 0, static_cast<int>(target.width), static_cast<int>(target.height) };
		const auto result = DrawStoredStroke(*stored, target.ink, raster, scratch, highlighterScratch);
		if (!context.Check(result.succeeded, "draw-stored-stroke")) return false;
		return context.Check(target.ink.ApplyOperatorLayers(target.ink.backBufferRTV.Get(), target.ink.layerL1, target.ink.layerL0,
			{ 0, 0, static_cast<LONG>(target.width), static_cast<LONG>(target.height) }), "stroke-apply");
	}

	bool DrawLaser(Context& context, HeroCanvas::Target& target, const HeroScene::Laser& laser)
	{
		// 默认激光色 RGBA(255,16,0)，5 DIP 实体宽度，鼠标下同样走模拟压感；画面取书写中的满不透明度。
		HeroScene::Free path; path.tool = "laser"; path.width = static_cast<float>(LaserSolidRadius(kHeroDpi / 96.0f) * 2);
		path.samples = laser.samples;
		auto stroke = RunModel(context, path, StrokeWidthMode::SimulatedPressure, false);
		if (!stroke || stroke->realPoints.size() < 2) return context.Check(false, "laser-model");
		target.ink.ConfigureLaserStyle(kHeroDpi / 96.0f, { 1, 16 / 255.f, 0, 1 });
		target.ink.ClearLaserCoverage(target.ink.laserStrokeCoverage);
		target.ink.SetLaserCoverageTarget(target.ink.laserStrokeCoverage);
		context.Check(target.ink.DrawLaserCoverage(std::span<const InkPoint>(stroke->realPoints)) >= 0, "laser-coverage");
		return context.Check(target.ink.ResolveLaserStrokeCoverage(target.ink.backBufferRTV.Get(),
			{ 0, 0, static_cast<LONG>(target.width), static_cast<LONG>(target.height) }, 1.0f), "laser-resolve");
	}

	bool ExportInkLayers(Context& context, const HeroScene::Scene& scene, const Path& directory,
		ID3D11Device* device, ID3D11DeviceContext* deviceContext)
	{
		HeroCanvas::Target target;
		if (!target.Init(context, device, deviceContext, scene.width, scene.height)) return false;
		for (const auto& layer : scene.layers)
		{
			if (layer.build != "dev") continue;
            context.layer = layer.name; context.strokeIndex = 0;
			target.ink.ClearRTV(target.ink.backBufferRTV.Get(), kTransparentLayerClearColor);
			for (const auto& item : layer.items)
			{
				if (item.free) DrawFree(context, target, *item.free);
				else if (item.laser) DrawLaser(context, target, *item.laser);
			}
			target.Save(context, directory / (std::wstring(layer.name.begin(), layer.name.end()) + L".png"));
		}
		return true;
	}
}
