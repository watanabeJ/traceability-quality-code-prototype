"use strict";

const portalEntries = {
  ops: { label: "运营方后台", shortLabel: "运营端", path: "pages/ops/inventory.html" },
  customer: { label: "客户后台", shortLabel: "客户端", path: "pages/customer/overview.html" },
  scan: { label: "扫码展示端", shortLabel: "扫码端", path: "pages/scan/active.html" },
};

const pageFiles = {
  ops: { customers: "pages/ops/customers.html", "customer-detail": "pages/ops/customer-detail.html", codes: "pages/ops/create-order.html", inventory: "pages/ops/inventory.html", "inventory-detail": "pages/ops/inventory-detail.html", orders: "pages/ops/orders.html", "order-detail": "pages/ops/order-detail.html", "review-detail": "pages/ops/bind-request-detail.html", "bind-requests": "pages/ops/bind-requests.html", withdrawals: "pages/ops/withdrawals.html", operators: "pages/ops/operators.html", messages: "pages/ops/messages.html", settings: "pages/ops/settings.html" },
  customer: { overview: "pages/customer/overview.html", orders: "pages/customer/orders.html", "order-detail": "pages/customer/order-detail.html", editor: "pages/customer/editor.html", withdrawals: "pages/customer/withdrawals.html", messages: "pages/customer/messages.html", settings: "pages/customer/settings.html" },
};

const pageTitles = Object.fromEntries([["ops:customers","溯源质控码平台 · 客户列表"],["ops:customer-detail","溯源质控码平台 · 客户详情"],["ops:codes","溯源质控码平台 · 生成码段"],["ops:inventory","溯源质控码平台 · 码段库存"],["ops:inventory-detail","溯源质控码平台 · 库存码段详情"],["ops:orders","溯源质控码平台 · 订单台账"],["ops:order-detail","溯源质控码平台 · 订单详情"],["ops:review-detail","溯源质控码平台 · 绑定审核详情"],["ops:bind-requests","溯源质控码平台 · 绑定审核"],["ops:withdrawals","溯源质控码平台 · 撤回审核"],["ops:operators","溯源质控码平台 · 运营账号管理"],["ops:messages","溯源质控码平台 · 站内信"],["ops:settings","溯源质控码平台 · 个人设置"],["customer:overview","溯源质控码平台 · 数据概览"],["customer:orders","溯源质控码平台 · 订单台账"],["customer:order-detail","溯源质控码平台 · 订单详情"],["customer:editor","溯源质控码平台 · 产品编辑与查看"],["customer:withdrawals","溯源质控码平台 · 撤回申请"],["customer:messages","溯源质控码平台 · 站内信"],["customer:settings","溯源质控码平台 · 个人设置"]]);

const entryPortal = portalEntries[document.body.dataset.entryPortal] ? document.body.dataset.entryPortal : "ops";
const initialPage = document.body.dataset.initialPage || (entryPortal === "customer" ? "overview" : "inventory");

const state = {
  portal: entryPortal,
  opsPage: entryPortal === "ops" ? initialPage : "orders",
  customerPage: entryPortal === "customer" ? initialPage : "overview",
  filter: "",
  reviewStatus: "全部状态",
  drawerProductId: null,
  reviewEditing: false,
  modal: null,
  qrStep: 1,
  productStep: 0,
  scanStatus: "active",
  scanTab: "product",
  scanProductExpanded: false,
  pagination: {},
  sidebarCollapsed: localStorage.getItem("trace-sidebar-collapsed-v1") === "1",
};

const products = [
  { id: 1, demoCase: "pending-bind-review", name: "云岭高山绿茶", company: "云岭生态农业有限公司", category: "农产品", batch: "YL20260718", status: "待审核", submitted: "2026-07-26 16:42", amount: 0, applicationType: "新建产品并绑定", requestedOrderNo: "ORD-202607-031", requestedSourceRange: "YL00020001–YL00060000", requestedRange: "YL00020001–YL00030000", requestedAmount: 10000 },
  { id: 2, name: "有机稻花香米", company: "北辰农产有限公司", category: "农产品", batch: "BC20260705", status: "已激活", submitted: "2026-07-25 10:18", amount: 20000 },
  { id: 3, name: "低糖蓝莓果酱", company: "松野食品科技有限公司", category: "加工食品", batch: "SY20260712", status: "草稿", submitted: "2026-07-24 09:30", amount: 0 },
  { id: 4, name: "医用防护口罩", company: "安护医疗用品有限公司", category: "医疗卫生用品", batch: "AH20260628", status: "已驳回", submitted: "2026-07-23 14:06", amount: 0 },
];

const customers = [
  { name: "云岭生态农业有限公司", account: "yunling", phone: "138 9012 7788", status: "启用", total: 50000, active: 10000 },
  { name: "北辰农产有限公司", account: "beichen", phone: "139 2288 3106", status: "启用", total: 80000, active: 62000 },
  { name: "松野食品科技有限公司", account: "songye", phone: "137 5601 2088", status: "启用", total: 30000, active: 12000 },
  { name: "安护医疗用品有限公司", account: "anhu", phone: "136 8830 6799", status: "禁用", total: 20000, active: 8000 },
];

const orders = [
  { no: "ORD-202607-031", customer: "云岭生态农业有限公司", range: "YL00010001–YL00060000", total: 50000, active: 10000, created: "2026-07-22" },
  { no: "ORD-202607-028", customer: "北辰农产有限公司", range: "BC00150001–BC00230000", total: 80000, active: 62000, created: "2026-07-19" },
  { no: "ORD-202607-021", customer: "松野食品科技有限公司", range: "SY00030001–SY00060000", total: 30000, active: 12000, created: "2026-07-15" },
  { no: "ORD-202606-094", customer: "安护医疗用品有限公司", range: "AH00050001–AH00070000", total: 20000, active: 8000, created: "2026-06-28" },
];

// Platform inventory batches are generated first. Customer allocations remain in orders.
const codeBatches = [];

const bindRequests = [];

const withdrawals = [
  { no: "WD-202607-008", product: "有机稻花香米", customer: "北辰农产有限公司", reason: "包装规格调整，需重新发布", status: "待审批", time: "2026-07-27 09:18" },
  { no: "WD-202607-006", product: "云岭春芽红茶", customer: "云岭生态农业有限公司", reason: "批次质检资料更新", status: "已通过", time: "2026-07-24 15:06" },
  { no: "WD-202607-003", product: "低糖蓝莓果酱", customer: "松野食品科技有限公司", reason: "标签内容需要修订", status: "已驳回", time: "2026-07-20 10:22" },
];

const messages = [
  { type: "产品审核申请", title: "云岭高山绿茶等待审核", detail: "客户于 16:42 提交了产品资料。", time: "10 分钟前", unread: true },
  { type: "产品撤回申请", title: "有机稻花香米发起全量撤回", detail: "涉及 20,000 枚已激活码。", time: "1 小时前", unread: true },
  { type: "码段生成完成", title: "库存码段 YL00010001–YL00060000 已生成", detail: "已生成 50,000 枚二维码核心区块，等待运营分配。", time: "昨天", unread: false },
];

const nav = {
  ops: [
    ["customers", "building-2", "客户列表"],
    ["inventory", "qr-code", "码段库存"],
    ["orders", "receipt-text", "订单台账"],
    ["bind-requests", "clipboard-check", "绑定审核"],
    ["withdrawals", "rotate-ccw", "撤回审核"],
    ["operators", "users-round", "运营账号管理"],
    ["messages", "mail", "站内信"],
    ["settings", "settings", "个人设置"],
  ],
  customer: [
    ["overview", "layout-dashboard", "数据概览"],
    ["orders", "receipt-text", "订单台账"],
    ["withdrawals", "rotate-ccw", "撤回申请"],
    ["messages", "mail", "站内信"],
    ["settings", "settings", "个人设置"],
  ],
};

const portalLabels = { ops: "运营方后台", customer: "客户后台", scan: "扫码展示端" };
