# Hermes Agent 中文文档

[Hermes Agent](https://github.com/NousResearch/hermes-agent) 官方文档的中文翻译站，基于 [Docusaurus v3](https://docusaurus.io/) 构建。

🌐 **在线访问**：*部署后更新*  
📖 **英文原版**：https://hermes-agent.nousresearch.com/docs/

## 特性

- 与官方文档站一比一还原的金色/琥珀暗黑主题
- 已翻译文档显示中文，未翻译文档显示英文原文 + 待翻译提示
- 支持中文全文搜索
- Mermaid 图表、代码高亮、响应式布局

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm start

# 构建生产版本
npm run build
```

## 翻译数据同步

本项目的翻译数据来自 [hermes-docs-feishu-automation](https://github.com/your-org/hermes-docs-feishu-automation) 自动翻译流水线。

运行以下命令从上游同步翻译至 `docs/` 目录：

```bash
npm run sync
```

> 需要确保主项目的 `data/upstream/` 和 `data/batches/` 目录已存在（需先运行过 `hermes-docs run-daily`）。

## 翻译进度

| 分类 | 状态 |
|------|------|
| Getting Started | ✅ 全部完成 |
| Using Hermes | ✅ 全部完成 |
| Features | ⚠️ 部分完成 |
| Messaging Platforms | ❌ 待翻译 |
| Integrations | ❌ 待翻译 |
| Guides & Tutorials | ❌ 待翻译 |
| Developer Guide | ❌ 待翻译 |
| Reference | ❌ 待翻译 |

## 许可

文档内容版权属于 [Nous Research](https://nousresearch.com)，依据 MIT License 发布。中文翻译由社区维护。
