# SMZDD 实施计划（从原型到可用 MVP）

## 目标
在现有原型确认基础上，交付可运行的 MVP：
- 8 个前台页面可用
- 18 个 MVP 接口可用（优先核心查询链路）
- PostgreSQL + Prisma 数据可初始化、可查询、可更新

## 阶段 1：工程与数据基线（Day 1-2）
1. 建立路由骨架
- 创建 8 个前台页面路由（先静态页面 + 占位数据）
- 建立公共 Layout、导航、筛选组件、表格组件

2. Prisma 落地
- 生成首个 migration
- 创建 seed 脚本（Provider/Model/ProviderModel/PriceHistory/Probe/Review 样例数据）
- 增加数据字典文档（字段含义 + 枚举约束）

3. 开发规范
- 目录标准化：`src/app`、`src/components`、`src/services`、`src/types`
- API 响应格式统一（`{ code, message, data }`）
- 错误处理中间层（参数错误/DB错误/未知错误）

## 阶段 2：核心查询接口（Day 3-4）
优先完成前台依赖最强的 10 个接口：
1. `GET /api/providers`
2. `GET /api/providers/:id`
3. `GET /api/providers/:id/overview`
4. `GET /api/models`
5. `GET /api/models/:id`
6. `GET /api/models/:id/providers`
7. `GET /api/provider-models`
8. `GET /api/provider-models/:id/price-history`
9. `GET /api/rankings/providers`
10. `GET /api/probes/uptime`

实现要点：
- 支持分页、过滤、排序
- 必要索引验证（providerId/modelId/recordedAt/probedAt）
- 使用 Prisma 查询聚合计算排名和可用率

## 阶段 3：前台 8 页接入真实数据（Day 5-7）
1. 页面优先顺序
- `/`
- `/providers`
- `/providers/[slug]`
- `/models/[id]`
- `/rankings`
- `/monitoring`
- `/price-trends`
- `/models`

2. 交互能力
- 筛选器与查询参数联动
- 表格排序与空状态处理
- 趋势图用轻量图表库（或 SVG）

3. 体验要求
- 移动端断点适配
- 骨架屏/加载态/错误态
- 文案与单位统一（CNY、每百万 token）

## 阶段 4：写接口与后台最小管理（Day 8-9）
1. 写接口（先最小闭环）
- `PATCH /api/provider-models/:id`
- `POST /api/probes`
- `POST /api/compare/providers`
- `POST /api/reviews`

2. 后台最小页
- `/admin`
- `/admin/pricing`
- `/admin/providers`
- `/admin/models`

3. 数据回写闭环
- 修改价格后自动写 `PriceHistory`
- 写入探针后可立即反映到监控页

## 阶段 5：验证与发布准备（Day 10）
1. 测试
- API 基本集成测试（关键查询 + 关键写入）
- 页面冒烟测试（8 个前台路由）

2. 发布前检查
- 环境变量检查
- 数据库连接/迁移脚本检查
- Docker Compose 一键启动验证

3. 交付物
- MVP 演示账号与测试数据
- 接口文档（含示例请求响应）
- 已知问题清单与阶段 2 计划

## 立即执行建议（下一步）
先执行“阶段 1”并产出以下可见结果：
1. 8 个页面路由全部可访问
2. migration + seed 成功执行
3. 首页、服务商列表、服务商详情 3 页接入真实数据
