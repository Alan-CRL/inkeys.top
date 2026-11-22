// 放映离屏夹具将当前页和总页数独立保留；主题由导出进程环境指定。
namespace HeroScene
{
	struct Scene
	{
		std::string locale;
		std::string state;
		int currentPage = 0;
		int totalPages = 2;
	};

	inline std::optional<Scene> Load(const std::filesystem::path& path)
	{
		std::ifstream in(path);
		Scene scene;
		std::string localeKey, stateKey, extra;
		if (!(in >> localeKey >> scene.locale >> stateKey >> scene.state) ||
			localeKey != "locale" || stateKey != "state" || scene.locale != "en-US" || (in >> extra))
			return std::nullopt;
		if (scene.state == "pager-1of2") scene.currentPage = 1;
		else if (scene.state == "pager-2of2") scene.currentPage = 2;
		else return std::nullopt;
		return scene;
	}
}
