# Implement: Inkeys3 新主页

## Checklist

1. [ ] 脚手架：`docs/new-index.md`（`pageLayout: NewHome`、noindex）；`NewHome/NewHome.vue`；`client.ts` 注册 `NewHome`；`shim.d.ts` 增加 `*.svg?raw` 声明。
2. [ ] Token 与图标：`NewHome.vue` 中定义浅/深色 token；从 `D:\Project\Inkeys\Repo\Inkeys\Inkeys\src\UI` 复制所需 SVG 到 `NewHome/icons/` 并把 `rgba(10,0,7,0)` 替换为 `currentColor`；`icons.ts` 导出映射。
3. [ ] 主栏：`Ui3Bar.vue` + `Ui3BarButton.vue`（超椭圆主按钮、A1/扩展/A2、selected/active、按压缓动、指针边缘光、a11y）。
4. [ ] 首屏：`HeroSection.vue` + `FeatureStage.vue` + `MediaSlot.vue`（轮播状态机与暂停规则、了解更多、下载）。
5. [ ] 详细介绍：`Ui3Section.vue`、`Draw3Section.vue`、`StrokeDemo.vue`、`MoreFeatures.vue`、`DownloadCta.vue`、`useReveal.ts`；数据集中在 `newHome.data.ts`。
6. [ ] 性能与无障碍：reduced-motion、可见性暂停、懒加载媒体、768 px / 375 px 响应式。
7. [ ] 验证：`pnpm docs:build`；`pnpm docs:dev` 下浏览器检查 `/new-index` 浅色 / 深色 / 375 px；确认 `/` 不受影响。
8. [ ] 规范：把 NewHome 目录、`?raw` 图标、`pageLayout: <组件名>` 模式写入 `.trellis/spec/frontend/directory-structure.md` / `component-guidelines.md`。

## Validation Commands

```bash
pnpm docs:build
pnpm docs:dev   # 打开 http://localhost:8080/new-index
```

## Risk / Rollback Points

- `client.ts` 是唯一修改的既有源码文件；回滚时删除注册行。
- `custom.css` 的全局 `.item:hover` 会影响同名类，新组件不使用 `.item`。
- 不新增 `docs/.vuepress/public/` 文件（图标以 `?raw` 内联），无需上传 123pan。
