# 台风路径实时可视化平台

一个面向杭州影响研判的台风可视化 Web 平台，聚合真实地图、公开台风路径、杭州实时风速与未来数小时天气变化。

## 主要能力

- 实时总览：展示活跃台风、杭州实时风速/阵风/气压、预警焦点
- 实时地图：真实底图切换、台风路径、风圈、风场箭头
- 台风详情：时间轴回放、强度变化、影响区域与最新预警
- 历史对比：基于内置历史样本做筛选和对比复盘
- 静态部署：前端直接请求公开数据源，可部署到 GitHub Pages

## 数据来源

- 台风路径：`Panahon`
- 杭州实时天气与风场采样：`Open-Meteo`

当外部接口不可用时，页面会自动回退到内置兜底数据，避免 GitHub Pages 页面空白。

## 本地开发

```bash
npm install
npm run dev
```

默认会启动前端开发环境。当前页面已改为浏览器直连公开数据源，不再依赖本地 `/api` 代理才能运行。

## 构建

```bash
npm run build
```

构建产物位于 `dist/`，已兼容 GitHub Pages 静态托管。

## 部署到 GitHub Pages

仓库内已包含 GitHub Actions 工作流 [`.github/workflows/deploy-pages.yml`](file:///c:/Users/ZhuanZ.DESKTOP-PH97BKO/Desktop/typhoon-live-platform/.github/workflows/deploy-pages.yml)。

部署步骤：

1. 将当前项目推送到 GitHub 仓库的 `main` 分支
2. 在 GitHub 仓库设置中打开 `Settings -> Pages`
3. 将 `Build and deployment` 设为 `GitHub Actions`
4. 之后每次推送到 `main`，都会自动构建并发布

## 技术栈

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Leaflet
- Recharts
- Zustand
