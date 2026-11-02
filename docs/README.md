# 项目文档

核对日期：2026-11-02。适用项目：`prototype-copy-20261022`。

## 当前文档

- [系统基线](./current-system-baseline.md)：当前规则、兼容入口与实现边界。
- [页面需求说明](../prototype-annotator/specs/README.md)：24 份页面 Markdown；页面内 P 标注直接读取。
- [完整产品说明书 V1.3](../输出/说明文件包/溯源质控码平台产品说明书_v1.1.md)：三端模块、流程、字段、状态、权限。
- [开发文档](./development/README.md)：业务、功能、字典、权限、状态和后端落地。
- [内置业务数据](./business-data.md)：账号、订单与产品资料，以及三端共享范围。

## 维护约定

当前业务为直接创建 16 位随机码订单。页面说明以 `prototype-annotator/specs/current/` 为唯一当前源。查码记录展示时间和 IP 地址，当前前端未接入真实 IP 采集。

交付目录只保留当前规则和业务文档。
