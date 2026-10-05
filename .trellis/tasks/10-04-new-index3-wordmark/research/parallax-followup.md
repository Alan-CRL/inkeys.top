# 视差仍不可见：第二轮诊断

日期：2026-10-05。代码基线：`5f04588`。本轮先诊断，不把可疑条件当作已经证实的根因。

## 源码与历史核对

- 对照最初 `10a4dfd`，指针归一化、120px 作用范围、0.16秒平滑追随、最大4度/6px、生命周期条件没有实质改变。
- 当前通过共同 `.nh3-surface` 模板绑定变换；`.nh3-plane` 仅负责居中、显式尺寸与1200px透视，作为稳定测距外框。
- Plume `VPContent.vue` 的自定义 pageLayout 分支直接渲染组件；没有额外的 VPDoc 容器、transform覆盖或鼠标阻挡层。
- `resize()` 确实重置指针目标，但 CSS transform 本身不会触发 ResizeObserver。没有证据支持把每帧 observer 反馈作为故障原因。
- 外框 `planeStyle` 是 Vue ref；mounted/resize 赋值明确的宽高，内层100%尺寸可解析。未发现必现零尺寸路径。

## 主会话无窗口 Edge 实测

主会话使用当前本地构建、隔离临时配置的 headless Edge 测试，没有读取用户浏览器配置或打开交互窗口。该测试与先前纯 VNode host 检查不同，实际测量浏览器布局、媒体查询与CSS矩阵。

- 1440×900视口；root 为1440×836，顶部64。
- 外框 x=316.805、y=233.172、width=806.391、height=363.875。
- reduced-motion=false，fine-pointer=true。
- 鼠标移到外框归一化位置约(0.93,0.82)，等待1.2秒后：实际CSS出现matrix3d，平移约(5.157px,3.838px)，rotateX约-2.559度、rotateY约3.438度。
- 外框测量保持不变；pointermove计数增加1；ResizeObserver计数前后均为3，没有重复尺寸反馈；页面错误数组为空。

这证明当前本地构建在该Edge环境能够执行视差，不能据此推断用户实际访问的页面、构建版本或系统偏好完全相同。当前未复现用户描述的“完全没有视差”。本地HEAD领先origin三次提交；是否访问了尚未更新的远端页面需要用户URL确认。主会话已询问实际URL，以及书写是否正常循环或只显示静态成品。

## 处理边界

本轮不凭猜测改写指针门控、放大旋转或移除减少动态效果设置。等待实际访问版本/状态证据后，针对可复现原因修复；现有产品文件未因此改动。无新增commit或push。

## 用户明确地址后的补充排查

用户确认地址为 `http://localhost:8080/new-index3.html`，书写正常循环。HTTP读取确认这是Vite开发服务，返回的 NewHome3 编译模块确实包含当前共同 surface 及 any-hover/any-pointer 门控，并非旧远端页面。主会话随后直接对该URL运行无窗口Edge，同样测得有效matrix3d、稳定外框和没有ResizeObserver反馈。因此“访问旧远端构建”已经不适用于该反馈，开发/生产编译差异也没有在隔离浏览器复现。

### 可复现的输入兼容性缺陷及最小修复

- 当前门控在收到 `pointerType='mouse'` 的真实事件后，仍要求 `matchMedia('(any-hover: hover) and (any-pointer: fine)').matches` 为true。能力查询为false会直接丢弃有效鼠标事件。
- 负对照：仅把 `verify-lifecycle.cjs` 的pointer媒体能力模拟改为false，事件、尺寸、暂停状态和动画时钟不变；未修改的5f04588实现失败于 `state.tiltX > 0.9`，目标保持0。
- 最小修复：用实际事件 `pointerType === 'mouse'` 判断输入，移除冗余pointer媒体查询及其监听。减少动态、隐藏页、离屏仍禁止视差；触摸与笔事件不触发鼠标视差。位移、旋转、距离、平滑和布局均不变。
- 修复后同一负对照场景通过；额外检查触摸/笔、reduced、hidden、offscreen禁用，暂停和艺术字鼠标视差及离开回正；既有真实编译Vue模板host补丁测试通过。

这是已证明并修复的输入兼容性缺陷，但尚没有用户当前浏览器媒体查询值或事件流证据，不能声称它已经被证实为用户实际问题的根因。最终以主会话对开发页面的真实浏览器回归和用户复测为准。

## 最终回归与用户确认

用户在本次输入门控修复后确认“现在正常了”。主会话无窗口 Edge 直接访问 localhost:8080，强制 hover/pointer 查询为 false 时仍测得有效 matrix3d（位移 5.16px/3.84px）；外框不变，触摸不改变目标，离开后矩阵回到单位矩阵，减少动态效果时保持回正。lifecycle、toolbar 及真实 Vue 模板 host 检查通过，独立 trellis-check 无新增问题。

浏览器测试阻止外站请求，页面导航外链插件报出 ithub/ilibili/q 错误，属于此次隔离请求限制；未将其当作视差错误修改。没有访问用户 Edge 配置或打开交互窗口。pnpm docs:build 通过：退出码 0，50 页 SSR，13.36 秒。

本轮不提交或推送。
