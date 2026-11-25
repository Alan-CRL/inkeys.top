// 仅 feature/shape 构建：箭头、矩形、椭圆、直线与长方体由生产 shape 工厂生成并经 CreationTransaction 提交。
namespace HeroExport
{
	bool ExportShapeLayers(Context& context, const HeroScene::Scene& scene, const Path& directory,
		ID3D11Device* device, ID3D11DeviceContext* deviceContext)
	{
		using namespace ::draw3::shapes;
		using namespace Inkeys::Drawing::Draw3;
		HeroCanvas::Target target;
		if (!target.Init(context, device, deviceContext, scene.width, scene.height)) return false;
		unsigned serial = 0;
		for (const auto& layer : scene.layers)
		{
			if (layer.build != "shape") continue;
			InkPage page(InkGuid({ 7 }));
			auto* canvas = page.GetOrCreateCanvas(kDefaultDeviceKey);
			if (!context.Check(canvas != nullptr, "shape-document")) continue;
			for (const auto& item : layer.items)
			{
				if (!item.shape) continue;
				const auto& spec = *item.shape;
				ShapeStyle style; style.strokeRgb = spec.rgb; style.width = spec.width;
				style.linePattern = spec.dashed ? LinePattern::Dashed : LinePattern::Solid;
				ObjectId id{}; id[0] = 0x48; id[1] = static_cast<uint8_t>(++serial); id[15] = 1;
				const auto& v = spec.values;
				const Vec2 start{ v.size() > 1 ? v[0] : 0, v.size() > 1 ? v[1] : 0 };
				const Vec2 end{ v.size() > 3 ? v[2] : 0, v.size() > 3 ? v[3] : 0 };
				std::optional<ShapeObject> shape;
				if (spec.preset == "cuboid")
				{
					Construction construction;
					construction.tool.preset = PresetKind::Cuboid; construction.tool.creationMode = CreationMode::MultiStage;
					construction.start = start; construction.end = end;
					construction.parameters = SolidConstruction{ { v.size() > 5 ? v[4] : 0, v.size() > 5 ? v[5] : 0 }, 0 };
					shape = MakeConstructedShape(construction, style, id);
				}
				else
				{
					ToolSpec tool;
					tool.preset = spec.preset == "arrow" ? PresetKind::Arrow : spec.preset == "rectangle" ? PresetKind::Rectangle
						: spec.preset == "ellipse" ? PresetKind::Ellipse : PresetKind::Line;
					shape = MakePresetShape(tool, start, end, style, id);
				}
				CreationTransaction transaction;
				const bool previewed = context.Check(shape.has_value() && transaction.Preview(*shape), "shape-preview");
				const auto command = previewed ? transaction.Commit() : std::nullopt;
				context.Check(command && canvas->AppendShape(*command).has_value(), "shape-commit");
			}
			target.Begin();
			for (const auto& stroke : canvas->Strokes())
				if (stroke.Shape()) context.Check(target.ink.DrawShapeObject(*stroke.Shape()), "shape-draw");
			target.Resolve(context);
			target.Save(context, directory / (std::wstring(layer.name.begin(), layer.name.end()) + L".png"));
		}
		return true;
	}
}
