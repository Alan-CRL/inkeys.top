// 白板离屏夹具只接收语言和捕获状态；主题由导出进程环境指定。
namespace HeroScene
{
	struct Scene
	{
		std::string locale;
		std::string state;

		int PageCount() const noexcept
		{
			if (state == "pager-1of1") return 1;
			if (state == "pager-2of2") return 2;
			return 0;
		}
	};

	inline std::optional<Scene> Load(const std::filesystem::path& path)
	{
		std::ifstream in(path);
		Scene scene;
		std::string localeKey, stateKey, extra;
		if (!(in >> localeKey >> scene.locale >> stateKey >> scene.state) ||
			localeKey != "locale" || stateKey != "state" || (in >> extra))
			return std::nullopt;
		if (scene.locale != "en-US" || (scene.state != "toolbar" && !scene.PageCount()))
			return std::nullopt;
		return scene;
	}
}
