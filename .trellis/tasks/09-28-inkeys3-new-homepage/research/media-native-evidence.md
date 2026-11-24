# 功能素材来源与制作边界

2026-10-22 用户要求延续主页任务并开始实现真实软件动态素材，保留模板，采用非线性镜头与局部特写。

## 已确认来源

- 软件仓库：`D:/Project/Inkeys/Repo/Inkeys-draw`。
- `Inkeys/IdtMain.cpp` 的 `--bar-eraser-offscreen-test` 在普通产品窗口初始化之前直接返回实际无窗口测试入口。
- `Inkeys/Inkeys/UI/Bar/Bar.EraserAttribute.Test.cpp` 已有真实 UI3 owner、WIC PNG readback、原生动画采样；`PageControl` 有真实分页表面。
- 原生 `InkeysRepo.sln Debug|ARM64` 已由 native_media 构建成功，需保留具体命令、版本与导出输入到制作目录 provenance。
- 旧 PPTCOM3 介绍 `docs/version/introduction/pptcom3.md` / https://www.inkeys.top/version/introduction/pptcom3.html 描述优先绑定前台放映、动态切换与部分 COM 注册异常的兼容。宣传片可说明这些能力，离屏产品控件合成不等于执行了真实 Office/COM 故障验收。

## 制作合同

软件像素（主栏、分页控件、笔迹、白板背景）与自创教学场景/字幕/镜头分层。镜头可剪辑放大，不改变软件控件外形、宽高比或把选择态冒充穿透态。真实软件交互序列使用固定画布与 anchor，避免逐帧裁切带来的漂移。透明图层导出须处理 D2D 预乘 alpha，成片不出现暗边。

制作模板位于 `media/inkeys3-features/`，媒体输出位于 `docs/.vuepress/public/feature-media/`。保留原生导出适配与来源记录，不依赖一次性的临时素材。网页与 README 共用分镜，手机重新构图而非把完整桌面缩成小图。
