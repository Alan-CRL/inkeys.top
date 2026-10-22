# 实现结果

- FeatureSections.vue：三个完整半透明卡片，28px 圆角、桌面32px内边距、40px卡片间距；标题左/右/左，手机按标题、控件、舞台、说明顺序排列。舞台1134px宽（1200px卡片扣内边距与边框），高360–420px，手机230–280px。去除序号、居中占位标题和胶囊，保留角落提示与白板斜分背景。
- featureMotion.ts：挂载后 Fisher–Yates 洗牌三种不重复入场；左下轻倾、右下轻倾、垂直抬升，16–30px 位移和最大0.45度微倾，小幅回弹；内部90ms错峰，总时长1.05s。
- 复用 createActiveClock；静止外层观察，约80px可见高度触发（矮视口自适应），离屏/后台暂停，完成后无空转 RAF。键盘聚焦直接完整呈现。入场结束后才开始7秒轮播；原有焦点、暂停、最可见卡片独占逻辑保留。
- ReleaseSection.vue 仅底部 padding 从104px改40px。
- 本任务新增 verify-features.cjs；未改历史回归文件。

## 验证

- node .trellis/tasks/10-22-feature-cards-motion/verify-features.cjs：通过。覆盖SFC/样式编译、真实Vue SSR、挂载后随机且不重复、分层错峰、可见阈值、矮视口、隐藏/离屏续播、只入场一次、键盘呈现、轮播门控、原有轮播语义、无观察器、全部资源清理。
- pnpm docs:build：exit0，19.01秒，51页。仅既有PLUGIN_TIMINGS耗时提示。
- 三个源文件均UTF8无BOM、LF；ReleaseSection diff只有一行。
- 未运行GUI或视觉测试；手机布局为源码约束检查，不能替代实际浏览器验收。
- 未提交或推送；父代理处理spec与任务归档。
