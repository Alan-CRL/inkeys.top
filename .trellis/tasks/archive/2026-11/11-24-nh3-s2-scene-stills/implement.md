# 执行计划

分两个阶段，中间有一个必须停下来的评审点。

## 阶段一：“教室与白板”样张（浅色＋深色）

1. `node <CLI> describe`，确认 `text`、`path`、`ui` 可用，记录字形库是否有 `√ ² × ·` 等符号。
2. 建 `media/nh3-scenes/`：`build.py` 和 `board/` 下的场景模板；`out/` 加进 `.gitignore`。
3. 写墨迹场景（图形、推导、旁注），每个场景：
   - `validate`（退出码 0 才继续）→ `plan`（`totalMs` 小于 `durationMs`）→ `lint`（处理节奏类警告）
   - `still --at <durationMs> --bg light` 预览，调 `x / y / size`，直到排版像真实板书
   - `render --at <durationMs> --out <目录> --force`，取 `frames/f000000.png`
4. 写界面场景（主栏、白板翻页控件、形状面板），浅色、深色各渲染一次，按 `bodyRect` 裁剪。
5. 用深色配色重渲墨迹；`build.py` 转 WebP 写入 `docs/.vuepress/public/new-index3/s2/`，并生成一份 manifest（场景哈希、输出哈希）。
6. 接入页面：`SectionScenes.vue` 的第三张卡片换成层叠画面，`home.css` 加面板底色变量和“仅淡入”的出场取值；另外两张保持占位。
7. 验证：
   - `npx vuepress build docs`（用户可能开着 `pnpm start`，不带清缓存参数），检查退出码和警告
   - 无界面浏览器截图：浅色、深色各一张桌面宽度，另加一张窄屏；出场动画截取中途和结束两帧
   - 逐张目视检查：墨迹是否小而密且可读、数值是否正确、各层是否对齐、界面是否清晰
   - `git diff` 确认只动了计划内的文件，换行符和编码未变
8. **评审点：把截图发给用户，停下。** 样式通过前不做阶段二。

## 阶段二：另外两张卡片（样张通过后）

9. 按评审意见修订样张和 `design.md`。
10. “屏幕演示”：英文报告或网页内容层、多种墨迹、悬浮主栏与笔属性面板；浅色＋深色。
11. “会议与演讲”：英文幻灯片内容层、多种墨迹、PPT 翻页控件与主栏；浅色＋深色。
12. 三张卡片全部接入，去掉 `copy.ts` 里不再使用的 `placeholder.scene`（三种语言一并处理）。
13. 重复第 7 步的验证，覆盖三张卡片、三种语言页面。
14. 质量检查（`trellis-check`），提醒用户上传 `public/new-index3/s2/` 到 123pan；提交需用户另行授权。

## 回退点

- 第 5 步之前只有 `media/nh3-scenes/` 下的新文件，删除即可。
- 第 6 步之后回退 `SectionScenes.vue`、`home.css` 的改动并删除 `public/new-index3/s2/`。

## 约束

- 不构建、不修改 Inkeys 软件仓库和 InkeysRenderer 仓库。
- 不启动带界面的浏览器或应用窗口。
- 不提交、不推送。
