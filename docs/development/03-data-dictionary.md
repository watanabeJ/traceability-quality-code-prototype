# 数据字典

核对日期：2026-10-29。适用项目：`prototype-copy-20261022`。以当前运行页面和代码为依据；浏览器原型、测试数据与正式后端能力分别说明。

## 编码与范围

| 字段 / 对象 | 当前实现与约束 |
| --- | --- |
| 完整溯源码 | 16 位字符串：版本 1 位 + 公司号 5 位 + 产品号 2 位 + 随机码 8 位。 |
| 版本号 | 字符串 1～9。 |
| 公司号 | 字符串 00001～99999，分专属/共享；首个订单后号码和类型锁定。 |
| 产品号 | 字符串 01～99，对应品类；首次生成订单后锁定。 |
| 随机码 | 整数 1～99,999,999，拼接时补足 8 位；00000000 不参与抽取。 |
| 号码池 | 以产品号为键，全局去重，不因公司或版本变化重复抽取占用中的尾码。 |
| 序号 | 从 1 按明细数量累计的位置；每行 first / last 为闭区间。 |
| 序号范围 | 绑定、撤回和码包范围依据；不等同于随机尾码或实际 16 位码的连续区间。 |
| 订单号 | ORD-日期-随机标识，作为字符串保存。 |
| 品类数量 | 订单中不同产品号/品类的数量，不是明细行数或具体产品 SKU 数。 |

## 核心业务对象

| 对象 | 关键字段 | 关联与说明 |
| --- | --- | --- |
| 客户 | id、name、account、phone、status、companyNumber、companyNumberType、证照 | 公司号有专属/共享规则；原型还保留演示密码，正式系统不得照搬明文存储。 |
| 品类 | id、name、productNumber、status、remark、hasCreatedOrder | 修改记录独立保留；停用不回收产品号。 |
| 订单 | no、customerId、companyNumber、version、codeFormat、lines、total、createdAt、activations、downloads、cancellationRecords | 当前 codeFormat=random16；保存客户与品类快照。 |
| 品类明细 | id、categoryId、category、productNumber、quantity、remark、first、last | 同品类允许多行，但共享同一个产品号池。 |
| 码载荷 | no、lines[{id, randoms}] | IndexedDB；randoms 为 Uint32Array，与序号按位置对应。 |
| 产品资料 | id、customerId、name、categoryId、batch、status、details | 五模块资料、媒体、字段顺序和申请上下文。 |
| 绑定申请 | id/no、orderNo、orderLineId、productId、range、amount、status、time、decidedAt、operator、rejectReason | 新建产品申请与已有产品绑定在统一审核视图汇合。 |
| 激活记录 | productId、range、amount、time、status、bindRequestNo、resetTime | 属于订单；保留成功绑定历史。 |
| 撤回申请 | no、productId、segments、requestedAmount、reason、status、time、decidedAt | segments 逐项保留 orderNo、range、amount；审核通过重置选中范围。 |
| 消息 | 归属主体、类型、标题、摘要、时间、已读状态及关联对象 | 随业务操作产生；不代表外部邮件或短信已经接入。 |
| 客户/品类修改记录 | 对象、修改时间、操作人、字段、before、after | 当前浏览器数据，非不可篡改服务端审计。 |

## 数量口径

- 订单码量是本订单全部品类明细的数量之和；已绑定是当前有效产品关联覆盖的数量。
- 绑定申请中只统计待审批申请占用；草稿、已驳回和已撤回申请不占用待审批码量。
- 有效订单的待绑定 = 订单码量 − 已绑定 − 绑定申请中，最低为 0；撤销订单的待绑定为 0。
- 品类明细的序号按行数量累计编排，与 8 位随机尾码不是同一字段。

| 指标 | 计算口径 |
| --- | --- |
| 品类管理已生成码量 | 匹配该品类的历史订单明细 quantity 合计，包含撤销订单。 |
| 品类管理剩余可用码量 | max(0, 99,999,999 − 历史已生成码量)。 |
| 数据统计码量 | 有效 random16 订单 + 曾下载码包的已撤销订单，按匹配明细 quantity 累计。 |
| 公司统计 | 按客户身份聚合，公司号相同的共享客户不会因此合并。 |
| 产品统计 | 按产品号/品类聚合，不是按产品名称排行。 |
| 筛选品类后的订单数 | 统计满足当前品类条件的唯一订单号，不按明细行重复计数。 |
| 客户端汇总 | 本客户有效订单；排除已撤销订单。 |

## 扫码记录

```json
{
  "count": 2,
  "times": ["2026-10-29 10:00:00", "2026-10-29 10:05:00"],
  "records": [
    {"time": "2026-10-29 10:00:00", "ip": "", "region": ""},
    {"time": "2026-10-29 10:05:00", "ip": "192.0.2.18", "region": "模拟地区", "mock": true}
  ]
}
```

- 此结构是格式示例；示例 IP 属测试数据，不表示实时采集。
- count 为累计次数；times 兼容旧版本；records 承载逐条记录和可选网络元数据。
- 列表列序为序号、扫码时间、IP地址，最新在前，支持分页；IP 缺失显示 —，不展示 IP归属地。累计扫码次数放在二维码信息区。
- 真实已激活码访问/刷新计数，预览及 demo 样例不计数；当前不是用户去重或防刷后的独立访客数。
- 当前存储键是 trace-scan-records-v2，经业务存储适配使用 copy-20261022 命名空间。


## 关联依据

- [当前系统基线](../current-system-baseline.md)
- [页面需求说明](../../prototype-annotator/specs/README.md)
- [完整产品说明书](../../输出/说明文件包/溯源质控码平台产品说明书_v1.1.md)
- [系统规则说明](../current-system-baseline.md)
