// native-scene.txt 解析：由 media/inkeys3-hero/tools/scene_native.py 生成。
namespace HeroScene
{
	struct Sample { float x = 0, y = 0, t = 0; };
	struct Free { std::string tool; float r = 0, g = 0, b = 0, a = 1; float width = 4; std::vector<Sample> samples; };
	struct Laser { std::vector<Sample> samples; };
	struct Shape { std::string preset; uint32_t rgb = 0; float width = 4; bool dashed = false; std::vector<float> values; };
	struct Item { std::optional<Free> free; std::optional<Laser> laser; std::optional<Shape> shape; };
	struct Layer { std::string name; std::string build; std::vector<Item> items; };
	struct Pager { std::string kind; int current = 1; int total = 1; };
	struct Scene
	{
		std::string locale = "zh-CN";
		int width = 2880, height = 1620;
		uint32_t boardColor = 0x123B32; int boardPattern = 1;
		uint32_t toolbarColor = 0xE53935;
		std::vector<Pager> pagers;
		std::vector<Layer> layers;
	};

	inline std::vector<Sample> ReadSamples(std::istream& in, size_t count)
	{
		std::vector<Sample> samples(count);
		for (auto& sample : samples) in >> sample.x >> sample.y >> sample.t;
		return samples;
	}

	inline std::optional<Scene> Load(const std::filesystem::path& path)
	{
		std::ifstream in(path);
		if (!in) return std::nullopt;
		Scene scene;
		Layer* layer = nullptr;
		std::string word;
		while (in >> word)
		{
			if (word == "locale") in >> scene.locale;
			else if (word == "canvas") in >> scene.width >> scene.height;
			else if (word == "board") { std::string hex; in >> hex >> scene.boardPattern; scene.boardColor = std::stoul(hex, nullptr, 16); }
			else if (word == "toolbar") { std::string hex; in >> hex; scene.toolbarColor = std::stoul(hex, nullptr, 16); }
			else if (word == "pager") { Pager pager; in >> pager.kind >> pager.current >> pager.total; scene.pagers.push_back(pager); }
			else if (word == "layer") { scene.layers.emplace_back(); layer = &scene.layers.back(); in >> layer->name >> layer->build; }
			else if (word == "end") layer = nullptr;
			else if (word == "free" && layer)
			{
				Free free; size_t count = 0;
				in >> free.tool >> free.r >> free.g >> free.b >> free.a >> free.width >> count;
				free.r /= 255; free.g /= 255; free.b /= 255; free.a /= 255;
				free.samples = ReadSamples(in, count);
				layer->items.push_back({ std::move(free), std::nullopt, std::nullopt });
			}
			else if (word == "laser" && layer)
			{
				size_t count = 0; in >> count;
				layer->items.push_back({ std::nullopt, Laser{ ReadSamples(in, count) }, std::nullopt });
			}
			else if (word == "shape" && layer)
			{
				Shape shape; std::string hex; int dashed = 0;
				in >> shape.preset >> hex >> shape.width >> dashed;
				shape.rgb = std::stoul(hex, nullptr, 16); shape.dashed = dashed != 0;
				// 余下坐标读到行尾。
				std::string rest; std::getline(in, rest);
				std::istringstream values(rest); float value;
				while (values >> value) shape.values.push_back(value);
				layer->items.push_back({ std::nullopt, std::nullopt, std::move(shape) });
			}
			else return std::nullopt;
		}
		return scene;
	}
}
