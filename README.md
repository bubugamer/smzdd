# SMZDD (什么值得调)

AI API中转服务对比平台 - 内部使用

## 项目简介

SMZDD是一个内部AI API中转服务对比平台，用于跟踪和比较各个中转站的价格、稳定性和评价，支持构建B2B中转服务的决策制定。

## 技术栈

- **前端**: Next.js 14+ (App Router) + TypeScript + Tailwind CSS
- **后端**: Next.js API Routes + Prisma ORM
- **数据库**: PostgreSQL
- **任务队列**: BullMQ + Redis (阶段3)
- **部署**: Docker Compose

## 快速开始

### 1. 启动数据库

```bash
docker-compose up -d
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 到 `.env` 并配置数据库连接：

```bash
cp .env.example .env
```

### 4. 运行数据库迁移

```bash
npx prisma migrate dev --name init
```

### 5. 校验并导入标准 JSON 数据

```bash
npm run data:validate
npm run data:seed
```

### 6. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 项目结构

```
smzdd/
├── prisma/              # Prisma schema和迁移
├── src/
│   ├── app/            # Next.js App Router页面
│   ├── components/     # React组件
│   ├── lib/            # 工具库
│   ├── services/       # 业务逻辑
│   ├── workers/        # 后台任务
│   └── types/          # TypeScript类型
├── docs/               # 文档
└── scripts/            # 脚本
```

## 开发计划

- [x] 阶段1: 基础搭建与手动数据录入（第1-2周）
- [ ] 阶段2: 数据收集与增强功能（第3-4周）
- [ ] 阶段3: 自动化探针与监控（第5-6周）

## 标准数据维护（JSON）

标准基础数据维护在 `data/` 目录：

- `data/providers.json`：供应商主数据（内嵌 `tags` 与 `models`）
- `data/model-catalog.json`：模型标准字典
- `data/scoring-config.json`：评分配置
- `data/seed-metadata.json`：数据版本与来源信息

建议流程：

1. 修改 `data/*.json`
2. 执行 `npm run data:validate`
3. 执行 `npm run data:seed`
4. 启动项目验证页面和接口

## License

内部使用项目
