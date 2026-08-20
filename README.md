# 溯源质控码平台多页面版

本目录是从单文件 `app.js + features.js` 原型重构出的真正多页面项目。每个业务模块有独立 HTML 和独立页面入口 JS，公共状态、组件、视图和样式按职责复用。目录内不引用原 `prototype/app.js` 或 `prototype/features.js`。

当前主流程为：运营端先生成连续的库存码段批次，再从库存中按需分配给启用客户；客户只能查看运营端已分配给自己的码段，并基于这些码段发起产品绑定申请。客户不具备生成码段或向其他客户分配码段的能力。

完整状态流转：`平台库存批次（未分配/部分分配/已分配） → 客户订单（已分配） → 产品绑定申请（待提交/待审核/已驳回） → 运营审核并激活 → 客户发起码段撤回 → 运营审批后重置`。产品资料与绑定设置在同一审核中处理，分配和激活是两个独立步骤。

原型约束：单个库存批次最多生成 100,000 枚；浏览器端同步打包下载最多 5,000 枚，较大批次应按订单分批导出或由正式后端异步生成。

## 运行

在工作区根目录启动静态服务器，然后访问：

`http://127.0.0.1:4318/prototype-multipage/pages/ops/orders.html`

## 业务流程图

当前系统的全链路业务流程见 [`docs/end-to-end-business-flow.md`](docs/end-to-end-business-flow.md)，Mermaid 可编辑源文件见 [`docs/end-to-end-business-flow.mmd`](docs/end-to-end-business-flow.mmd)。

面向正式开发的业务流程、功能规则、数据字典、权限矩阵、状态流转和后端落地说明见 [`docs/development/README.md`](docs/development/README.md)。

## 目录结构

```text
prototype-multipage/
|-- index.html
|-- README.md
|-- PROJECT_STRUCTURE.md
|-- css/
|   |-- common.css
|   `-- features.css
|-- js/
|   |-- bootstrap.js
|   |-- core/
|   |   |-- config.js
|   |   |-- domain.js
|   |   |-- runtime.js
|   |   `-- enhanced-runtime.js
|   |-- components/
|   |   |-- ui.js
|   |   `-- application.js
|   |-- views/
|   |   |-- base.js
|   |   |-- business.js
|   |   `-- scan.js
|   `-- pages/
|       |-- ops/
|       |   |-- customers.js
|       |   |-- customer-detail.js
|       |   |-- create-order.js
|       |   |-- orders.js
|       |   |-- order-detail.js
|       |   |-- bind-request-detail.js
|       |   |-- bind-requests.js
|       |   |-- withdrawals.js
|       |   |-- operators.js
|       |   |-- messages.js
|       |   `-- settings.js
|       |-- customer/
|       |   |-- overview.js
|       |   |-- orders.js
|       |   |-- order-detail.js
|       |   |-- editor.js
|       |   |-- withdrawals.js
|       |   |-- messages.js
|       |   `-- settings.js
|       |-- scan/
|       |   |-- preview.js
|       |   |-- active.js
|       |   |-- inactive.js
|       |   `-- reset.js
|-- pages/
|   |-- ops/
|   |   |-- customers.html
|   |   |-- customer-detail.html
|   |   |-- create-order.html
|   |   |-- orders.html
|   |   |-- order-detail.html
|   |   |-- bind-request-detail.html
|   |   |-- bind-requests.html
|   |   |-- withdrawals.html
|   |   |-- operators.html
|   |   |-- messages.html
|   |   `-- settings.html
|   |-- customer/
|   |   |-- overview.html
|   |   |-- orders.html
|   |   |-- order-detail.html
|   |   |-- editor.html
|   |   |-- withdrawals.html
|   |   |-- messages.html
|   |   `-- settings.html
|   |-- scan/
|   |   |-- preview.html
|   |   |-- active.html
|   |   |-- inactive.html
|   |   `-- reset.html
|-- assets/
|-- vendor/
`-- prototype-annotator/
```

## 页面清单

| 端 | 页面 | HTML | 页面 JS |
|---|---|---|---|
| ops | 客户列表 | `pages/ops/customers.html` | `js/pages/ops/customers.js` |
| ops | 客户详情 | `pages/ops/customer-detail.html` | `js/pages/ops/customer-detail.js` |
| ops | 生成码段批次 | `pages/ops/create-order.html` | `js/pages/ops/create-order.js` |
| ops | 码段库存 | `pages/ops/orders.html` | `js/pages/ops/orders.js` |
| ops | 订单详情 | `pages/ops/order-detail.html` | `js/pages/ops/order-detail.js` |
| ops | 绑定审核详情 | `pages/ops/bind-request-detail.html` | `js/pages/ops/bind-request-detail.js` |
| ops | 绑定审核 | `pages/ops/bind-requests.html` | `js/pages/ops/bind-requests.js` |
| ops | 撤回审核 | `pages/ops/withdrawals.html` | `js/pages/ops/withdrawals.js` |
| ops | 运营账号管理 | `pages/ops/operators.html` | `js/pages/ops/operators.js` |
| ops | 站内信 | `pages/ops/messages.html` | `js/pages/ops/messages.js` |
| ops | 个人设置 | `pages/ops/settings.html` | `js/pages/ops/settings.js` |
| customer | 数据概览 | `pages/customer/overview.html` | `js/pages/customer/overview.js` |
| customer | 我的码段 | `pages/customer/orders.html` | `js/pages/customer/orders.js` |
| customer | 订单详情 | `pages/customer/order-detail.html` | `js/pages/customer/order-detail.js` |
| customer | 产品编辑与查看 | `pages/customer/editor.html` | `js/pages/customer/editor.js` |
| customer | 撤回申请 | `pages/customer/withdrawals.html` | `js/pages/customer/withdrawals.js` |
| customer | 站内信 | `pages/customer/messages.html` | `js/pages/customer/messages.js` |
| customer | 个人设置 | `pages/customer/settings.html` | `js/pages/customer/settings.js` |
| scan | 扫码预览 | `pages/scan/preview.html` | `js/pages/scan/preview.js` |
| scan | 已激活码 | `pages/scan/active.html` | `js/pages/scan/active.js` |
| scan | 未激活码 | `pages/scan/inactive.html` | `js/pages/scan/inactive.js` |
| scan | 已重置码 | `pages/scan/reset.html` | `js/pages/scan/reset.js` |

## 代码职责

- `js/core/config.js`：入口配置、共享状态和基础数据。
- `js/core/domain.js`：业务数据持久化、迁移、文件、二维码和领域工具。
- `js/core/runtime.js`：基础渲染、真实多页面路由和公共事件。
- `js/core/enhanced-runtime.js`：增强渲染、业务交互、上传和拖拽。
- `js/components/ui.js`：导航、页头、指标、分页等基础组件。
- `js/components/application.js`：登录、筛选、日期、产品选择等业务组件。
- `js/views/*.js`：基础业务页面、增强业务页面和扫码页面视图。
- `js/pages/**/*.js`：每个 HTML 对应的独立页面入口。
- `css/common.css` 与 `css/features.css`：公共基础样式与增强功能样式。
