# 设计
- NewHome3.vue局部import FeatureSections，并在ReleaseSection后渲染。
- FeatureSections.vue局部类型和静态数据驱动三舞台，稳定占位区域与标题/介绍和低调辅助切换。
- 默认每项7秒；单一IntersectionObserver选择可见比例最高舞台，同值保留当前。后台/离屏/焦点/手动暂停保留累计时间，无追赶；SSR安全、卸载清理。沿用现有active-clock思想但不强迫抽象。
- CSS复用现有主题变量和视觉语言；转换动效仅本组件覆盖reduced-motion。不添加未来媒体抽象、依赖或全局注册。
- 媒体层和静态底板分离，以便后续挂接真实素材；本轮仅静态渐变占位，白板斜切三背景，不仿软件UI。
