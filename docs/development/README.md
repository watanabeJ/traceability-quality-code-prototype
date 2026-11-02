# 开发文档索引

核对日期：2026-11-02。适用项目：`prototype-copy-20261022`。以当前运行页面和代码为依据；浏览器原型、测试数据与正式后端能力分别说明。

## 阅读顺序

| 文档 | 当前内容 |
| --- | --- |
| [业务流程](./01-business-processes.md) | 直接创建随机码订单、绑定、审核、撤回与撤销 |
| [功能规则](./02-functional-rules.md) | 三端实际页面的功能及弹窗规则 |
| [数据字典](./03-data-dictionary.md) | 16 位码、序号、数据对象和码量口径 |
| [权限矩阵](./04-permission-matrix.md) | 当前入口、可见范围和服务端待补能力 |
| [状态流转](./05-state-transitions.md) | 订单、申请、产品关联和单码状态 |
| [后端落地](./06-backend-implementation-notes.md) | 实际技术、生产边界 |
| [品类管理](../../prototype-annotator/specs/current/P02A-品类管理.md) | 当前品类历史生成量及余额口径 |

## 维护约定

对业务做调整时，应同步对应页面 Markdown、局部标注、数据口径及状态矩阵。不要把本地浏览器检查写成已具备服务端鉴权、事务或审计。


## 关联依据

- [当前系统基线](../current-system-baseline.md)
- [页面需求说明](../../prototype-annotator/specs/README.md)
- [完整产品说明书](../../输出/说明文件包/溯源质控码平台产品说明书_v1.1.md)
