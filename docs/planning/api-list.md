# SMZDD 接口清单（全量规划）

> 说明：接口按 REST 风格规划，覆盖前台查询、后台运营、自动化采集与监控。
> 统计口径为业务 API，不含 Next.js 静态资源与框架内部接口。

## 接口总数

- 总计：34 个接口
- MVP（优先实现）：18 个接口
- 增强与运维：16 个接口

## 1) Auth（3）

| 方法 | 路径 | 用途 | 阶段 |
|---|---|---|---|
| POST | `/api/auth/login` | 管理员登录 | 增强 |
| POST | `/api/auth/logout` | 退出登录 | 增强 |
| GET | `/api/auth/me` | 当前登录态与权限 | 增强 |

## 2) Providers（6）

| 方法 | 路径 | 用途 | 阶段 |
|---|---|---|---|
| GET | `/api/providers` | 服务商列表（支持筛选/排序/分页） | MVP |
| POST | `/api/providers` | 新增服务商 | 增强 |
| GET | `/api/providers/:id` | 服务商详情 | MVP |
| PATCH | `/api/providers/:id` | 更新服务商信息 | 增强 |
| DELETE | `/api/providers/:id` | 下线/删除服务商 | 增强 |
| GET | `/api/providers/:id/overview` | 服务商概览聚合（评分、可用率、价格摘要） | MVP |

## 3) Models（5）

| 方法 | 路径 | 用途 | 阶段 |
|---|---|---|---|
| GET | `/api/models` | 模型列表（家族/供应商筛选） | MVP |
| POST | `/api/models` | 新增模型 | 增强 |
| GET | `/api/models/:id` | 模型详情 | MVP |
| PATCH | `/api/models/:id` | 更新模型信息 | 增强 |
| GET | `/api/models/:id/providers` | 查询该模型在各服务商的可用与定价信息 | MVP |

## 4) Provider-Model Pricing（6）

| 方法 | 路径 | 用途 | 阶段 |
|---|---|---|---|
| GET | `/api/provider-models` | 关联列表查询 | MVP |
| POST | `/api/provider-models` | 新增服务商-模型关联 | 增强 |
| PATCH | `/api/provider-models/:id` | 更新当前价格与状态 | MVP |
| GET | `/api/provider-models/:id` | 关联详情 | MVP |
| GET | `/api/provider-models/:id/price-history` | 该关联的价格历史 | MVP |
| POST | `/api/provider-models/:id/price-snapshots` | 记录一次价格快照（写入历史） | 增强 |

## 5) Price History & Trends（3）

| 方法 | 路径 | 用途 | 阶段 |
|---|---|---|---|
| GET | `/api/price-history` | 全局价格历史查询（按模型/服务商/时间） | MVP |
| GET | `/api/price-trends/summary` | 趋势汇总（涨跌数量、波动率） | MVP |
| GET | `/api/price-alerts` | 价格异常提醒列表 | 增强 |

## 6) Probes & Monitoring（6）

| 方法 | 路径 | 用途 | 阶段 |
|---|---|---|---|
| GET | `/api/probes` | 探针记录列表 | MVP |
| POST | `/api/probes` | 写入探针结果（手动/调度） | MVP |
| GET | `/api/probes/uptime` | 可用率统计（1d/3d/7d） | MVP |
| GET | `/api/probes/latency` | 响应时间统计 | MVP |
| POST | `/api/probes/run` | 触发一次即时探测 | 增强 |
| GET | `/api/monitoring/incidents` | 异常事件流 | 增强 |

## 7) Reviews（4）

| 方法 | 路径 | 用途 | 阶段 |
|---|---|---|---|
| GET | `/api/reviews` | 评价列表（按服务商/评分过滤） | MVP |
| POST | `/api/reviews` | 新增评价 | MVP |
| PATCH | `/api/reviews/:id` | 编辑评价/审核状态 | 增强 |
| DELETE | `/api/reviews/:id` | 删除评价 | 增强 |

## 8) Rankings & Compare（3）

| 方法 | 路径 | 用途 | 阶段 |
|---|---|---|---|
| GET | `/api/rankings/providers` | 服务商综合排名 | MVP |
| GET | `/api/rankings/models` | 模型性价比排名 | 增强 |
| POST | `/api/compare/providers` | 多服务商对比计算 | MVP |

## 9) Admin Ops（4）

| 方法 | 路径 | 用途 | 阶段 |
|---|---|---|---|
| POST | `/api/admin/import/csv` | 导入服务商/模型/价格 CSV | 增强 |
| GET | `/api/admin/jobs` | 任务队列状态（采集/探针） | 增强 |
| POST | `/api/admin/jobs/:id/retry` | 重试失败任务 | 增强 |
| GET | `/api/admin/system/health` | 系统健康检查（DB/Redis） | 增强 |

## MVP 18 接口（建议先做）

1. `GET /api/providers`
2. `GET /api/providers/:id`
3. `GET /api/providers/:id/overview`
4. `GET /api/models`
5. `GET /api/models/:id`
6. `GET /api/models/:id/providers`
7. `GET /api/provider-models`
8. `GET /api/provider-models/:id`
9. `PATCH /api/provider-models/:id`
10. `GET /api/provider-models/:id/price-history`
11. `GET /api/price-history`
12. `GET /api/price-trends/summary`
13. `GET /api/probes`
14. `POST /api/probes`
15. `GET /api/probes/uptime`
16. `GET /api/probes/latency`
17. `GET /api/rankings/providers`
18. `POST /api/compare/providers`
