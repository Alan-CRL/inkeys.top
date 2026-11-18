# nh3-remotion：new-index3 的 Remotion 视频

官网 `/new-index3` 里循环播放的小视频。目前有一支：S1“屏幕批注”卡片（约 8.0 秒循环，浅色、深色各一版）。
设计与分镜见 `.trellis/tasks/11-16-new-index3-s1-card-motion/design.md`，制作约定见 `.trellis/spec/frontend/remotion-video-guidelines.md`。

## 预览

```bash
node scripts/run.mjs studio --port=3123
```

打开 `http://localhost:3123`。左侧的合成：

| 合成 | 用途 |
| --- | --- |
| `S1-ScreenAnnotation-Light` / `-Dark` | 成片，不带文字（网页自己叠加标题） |
| `Preview-Light-zh` / `Preview-Dark-en` | 叠上网页的标题和一句话，检查文字与画面的关系；不用于导出 |
| `InkTest-Light` / `InkTest-Dark` | 只有软笔，放大 3 倍、四分之一速，用来看实时笔锋和粗细变化 |

在 Claude 桌面应用里也可以用预览配置 `remotion-studio`（`.claude/launch.json`）启动。

## 抽帧与导出

```bash
# 某一帧
node scripts/run.mjs still Preview-Light-zh out/stills/120.png --frame=120

# 成片（用户确认预览后再导出）
node scripts/run.mjs render S1-ScreenAnnotation-Light out/s1-screen-annotation-light.mp4
node scripts/run.mjs render S1-ScreenAnnotation-Dark out/s1-screen-annotation-dark.mp4
```

## 改哪里

| 想改什么 | 文件 |
| --- | --- |
| 各段的起止时间 | `src/cards/screen-annotation/Card.tsx`（也可以在 Studio 的时间线里拖动） |
| 示例内容和墨迹的位置 | `src/cards/screen-annotation/layout.ts`（墨迹的位置由这里的常量算出，改内容位置后墨迹自动跟着走） |
| 三道笔迹的形状、时长 | `src/cards/screen-annotation/strokes.ts` |
| 软笔的粗细与笔锋规则 | `src/ink/softPen.ts` |
| 书写速度的规律 | `src/ink/path.ts` |
| 颜色、字体 | `src/theme/tokens.ts`（与官网 `home.css` 保持一致） |
| 主栏的按下、水波、换内容动画 | `src/components/ToolbarStrip.tsx` |
| 指针的路线、每一步的起止帧和停顿 | `src/cards/screen-annotation/Card.tsx` 里的 `POINTER`、`CLICK_PEN`、`CLICK_FREEZE` |
| 指针的样子（画笔光标、箭头）和移动的缓动 | `src/components/Pointer.tsx` |
| 主栏状态图 | `public/toolbar/`，由 `native/` 重新导出，见 `native/README.md` |

卡片按 384×576 的 1 倍坐标设计，渲染时整体放大 2 倍（768×1152）。

## 目录

```
scripts/run.mjs          统一入口（studio / still / render）
native/                  主栏状态图的离屏导出适配（构建软件并导出，见其中的 README）
public/toolbar/          六张原生主栏图 + layout.json
src/theme/               令牌与缓动
src/ink/                 墨迹：书写速度、软笔模型、荧光笔、渲染
src/components/          可复用部件：屏幕框、内容切换、主栏、预览用的文字
src/cards/<卡片>/        每张卡片一个目录
out/                     抽帧和成片（不入库）
```

之后的卡片在 `src/cards/` 下各加一个目录，复用 `ink/`、`components/`、`theme/`。

## 环境

- 依赖独立安装：在本目录运行 `pnpm install`（有自己的 `pnpm-workspace.yaml`，不属于官网的安装）。
- **Windows ARM64**：Remotion 的合成器只有 x64 版本。`scripts/run.mjs` 在 ARM64 上会改用 `.cache/node-x64/node.exe`。
  这个文件不入库，需要自己放：下载 Node.js 的 `win-x64` 版，只取其中的 `node.exe` 放到该路径即可（本机是从 `media/inkeys3-remotion/.cache/` 复制的 v24.16.0）。
  `pnpm-workspace.yaml` 里的 `supportedArchitectures` 让 pnpm 同时安装 x64 的可选依赖。
- 字体用系统自带的 Segoe UI Variable 和 Georgia，没有随工程分发；换机器渲染前先确认这两款字体存在。
- 渲染是确定性的：不使用 `Date.now()`、`Math.random()`。
