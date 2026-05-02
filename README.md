# 论文润色平台

免费、公开访问、无需登录的论文润色平台 MVP。平台通过随机取件码保存任务空间，支持 DOCX 上传、结构解析、段落审阅、润色流程、DOCX 导出、修改报告和段落对照表。

## 本地启动

```powershell
npm.cmd install
$env:DATABASE_URL="file:./dev.db"
npm.cmd run prisma:generate
npm.cmd run prisma:migrate -- --name init
npm.cmd run dev
```

打开 `http://localhost:3000`。

如果 Windows 环境下 Prisma 迁移出现空的 `Schema engine error`，可临时打开 engine 日志后重试：

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
