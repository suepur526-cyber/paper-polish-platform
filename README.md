# 论文润色平台

免费、公开访问、无需登录的论文润色平台 MVP。平台通过随机取件码保存任务空间，支持 DOCX 上传、结构解析、段落审阅、润色流程、DOCX 导出、修改报告和段落对照表。

解析完成后，任务会进入大纲审阅工作台。用户可以按章节查看段落，确认哪些正文和摘要段落参与润色，标题、关键词、参考文献等内容会显示为跳过。

## 本地启动

```powershell
npm.cmd install
$env:DATABASE_URL="file:./dev.db"
npm.cmd run prisma:generate
npm.cmd run prisma:migrate -- --name init
npm.cmd run dev
```

打开 `http://localhost:3000`。

## 模型配置

没有配置模型 key 时，系统会使用本地 mock 润色器，方便开发和测试。部署或本地联调真实模型时，按 `.env.example` 设置：

```powershell
$env:OPENAI_BASE_URL="https://allinai7.cloud/v1"
$env:OPENAI_REWRITE_MODEL="gpt-5.5"
$env:OPENAI_API_KEY="你的服务商 key"
```

`OPENAI_API_KEY` 不要提交到 GitHub。模型请求会带 `store: false`。

如果 Windows 环境中 Prisma 迁移出现空的 `Schema engine error`，可临时打开 engine 日志后重试：

```powershell
$env:RUST_BACKTRACE="full"
$env:RUST_LOG="debug"
$env:PRISMA_SCHEMA_ENGINE_LOG_LEVEL="debug"
npm.cmd run prisma:migrate -- --name init
```

## 测试

```powershell
npm.cmd test
npm.cmd run build
```

## 产品边界

平台不承诺任何第三方检测平台的具体分数，不针对检测系统做规避设计。第一版聚焦学术表达润色、格式保护、引用保护、结构审阅和可追溯记录。
