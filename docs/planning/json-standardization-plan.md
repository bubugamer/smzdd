# SMZDD JSON 标准数据专项（重整版）

## 你的思路（确认）
JSON 不按数据库表一一对应，而按“业务对象”组织：
- 以 `provider` 为中心
- `provider` 下直接内嵌 `models`（该供应商支持模型与价格）
- `provider` 下直接内嵌 `tags`

这比“表结构映射式 JSON”更好维护，编辑一家公司时只改一段。

## 重新整理后的建议

## 建议文件总数
- 建议：4 个 JSON 文件（最小可维护集）

## 文件清单

1. `data/providers.json`（核心主文件）
- 维护内容：供应商主信息 + tags + 供应商支持模型列表（含价格）
- 这是你说的“全部放一起”的落地文件

建议结构（示意）：
```json
[
  {
    "name": "Packy Code",
    "slug": "packy-code",
    "website": "https://www.packyapi.com",
    "country": "CN",
    "status": "ACTIVE",
    "description": "高可用中转服务",
    "tags": ["high-stability", "alipay", "wechat", "monthly-plan"],
    "models": [
      {
        "model": "claude-3-5-sonnet",
        "providerModelName": "claude-3-5-sonnet",
        "pricingType": "TOKEN_BASED",
        "inputPricePerMillion": 4.5,
        "outputPricePerMillion": 22.5,
        "currency": "CNY",
        "isAvailable": true,
        "notes": "baseline"
      }
    ]
  }
]
```

2. `data/model-catalog.json`（可选但推荐）
- 维护内容：模型标准字典（displayName/family/provider/contextWindow/modality）
- 作用：避免在多个 provider 内重复维护模型元数据

3. `data/scoring-config.json`
- 维护内容：评分权重与计算版本
- 示例：`priceWeight`、`uptimeWeight`、`reviewWeight`

4. `data/seed-metadata.json`
- 维护内容：数据版本、更新时间、维护人、变更说明

## 为什么不再需要单独 `provider-models.json` / `provider-tags.json`
- `provider-models` 已内嵌进 `providers[].models`
- `provider-tags` 已内嵌进 `providers[].tags`
- 编辑某供应商时只改一处，符合你要的维护体验

## 与数据库的关系（执行层）
- JSON 仅作为“标准数据源”
- 导入脚本负责拆分写入 DB：
  - `providers[]` -> Provider
  - `providers[].models[]` -> ProviderModel
  - `model-catalog` -> Model
- 业务查询仍从数据库读

## 不建议 JSON 化（保持数据库）
1. `PriceHistory`
2. `AvailabilityProbe`
3. `Review`
4. 运行日志/监控事件

## 改造实施顺序（等你批准后执行）
1. 新建 `data/providers.json`、`data/model-catalog.json`、`data/scoring-config.json`、`data/seed-metadata.json`
2. 改造 `prisma/seed.js`：从新结构读取并 upsert
3. 增加 `npm run data:validate`（JSON 结构校验）
4. 增加 `npm run data:seed`（按 JSON 导入）
5. 文档化“新增供应商”流程
