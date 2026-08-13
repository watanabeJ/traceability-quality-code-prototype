"use strict";

function fxLoginPage(portal) {
    const isCustomer = portal === "customer";
    return `<main class="login-page"><section class="login-card"><div class="login-brand"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span><div><strong>溯源质控码平台</strong><span>${isCustomer ? "客户后台" : "运营方后台"}</span></div></div><div class="login-copy"><h1>账号密码登录</h1><p>${isCustomer ? "使用运营方分配的客户账号登录。" : "仅限运营方内部账号登录。"}</p></div><div class="form-grid"><div class="field full"><label class="required">登录账号</label><input id="fx-login-account" autocomplete="username" value="${isCustomer ? "yunling" : "operator_01"}"></div><div class="field full"><label class="required">登录密码</label><input id="fx-login-password" type="password" autocomplete="current-password" value="Trace@2026"></div><div class="field full"><button class="button primary login-submit" data-action="fx-login">登录${isCustomer ? "客户" : "运营"}后台</button></div></div></section>${portalSwitcher()}</main>`;
  }

  globalBar = function () {
    const currentUser = state.portal === "customer" ? fxCurrentCustomer() : fxCurrentOperator();
    const accountName = currentUser.name.slice(0, 2);
    const unread = fxUnreadMessageCount();
    const unreadBadge = unread ? `<span class="notification-badge" aria-label="${unread} 条未读消息">${unread > 99 ? "99+" : unread}</span>` : "";
    const accountActions = state.portal === "scan" ? "" : `<button class="icon-button notification-button" type="button" title="${unread ? `${unread} 条未读消息` : "暂无未读消息"}" aria-label="${unread ? `通知，${unread} 条未读消息` : "通知，无未读消息"}" data-action="show-notifications">${icon("bell", "!")}${unreadBadge}</button><button class="avatar avatar-button" type="button" data-nav="settings" title="个人设置" aria-label="打开个人设置">${fxEscape(accountName)}</button><button class="button small" type="button" data-action="fx-logout">退出登录</button>`;
    return `<header class="global-bar"><div class="brand"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span><span class="brand-name">溯源质控码平台</span></div><div class="top-actions">${accountActions}</div></header>`;
  };

  sidebar = function (portal) {
    const pageKey = portal === "ops" ? state.opsPage : state.customerPage;
    const navPageKey = pageKey === "review-detail" ? "bind-requests" : pageKey === "customer-detail" ? "customers" : pageKey === "order-detail" ? "orders" : ["codes", "inventory-detail"].includes(pageKey) ? "inventory" : pageKey;
    const navButton = ([key, iconName, label]) => `<button type="button" class="nav-item ${navPageKey === key ? "active" : ""}" data-nav="${key}" title="${label}">${icon(iconName, "·")}<span>${label}</span></button>`;
    const navMarkup = nav[portal].map(item => navButton(item)).join("");
    return `<aside class="sidebar ${state.sidebarCollapsed ? "is-collapsed" : ""}" aria-label="${portalLabels[portal]}导航"><div class="sidebar-head"><div class="nav-label">工作台</div><button type="button" class="sidebar-toggle" data-action="toggle-sidebar" aria-label="${state.sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}" title="${state.sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}">${icon(state.sidebarCollapsed ? "panel-left-open" : "panel-left-close", state.sidebarCollapsed ? "›" : "‹")}</button></div><nav class="nav-list">${navMarkup}</nav></aside>`;
  };

  function fxOverviewMetricStrip(items) {
    return `<section class="metric-strip metric-strip-${items.length}" aria-label="数据概览">${items.map(item => `<button type="button" class="metric metric-link" ${item.nav ? `data-nav="${item.nav}"` : `data-action="${item.action}"`} ${item.status ? `data-status="${item.status}"` : ""} aria-label="${fxEscape(item.label)}，点击查看详情"><div class="metric-label">${item.icon ? icon(item.icon, "·") : ""}${fxEscape(item.label)}</div><div class="metric-value">${item.value}</div></button>`).join("")}</section>`;
  }
  opsOverview = function () {
    const totalCodes = codeBatches.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const allocatedCodes = codeBatches.reduce((sum, item) => sum + fxCodeBatchAllocatedAmount(item), 0);
    const inventoryCodes = codeBatches.reduce((sum, item) => sum + fxCodeBatchAvailableAmount(item), 0);
    const pendingReviews = fxAllBindingReviewRequests().filter(item => item.status === "待审批");
    const pendingWithdrawals = withdrawals.filter(item => item.status === "待审批");
    const todoItems = [
      ...pendingReviews.slice(0, 3).map(item => `<button class="list-item list-button" data-nav="bind-requests"><span class="list-icon">${icon("clipboard-check", "✓")}</span><div class="list-content"><div class="list-title">${fxEscape(item.product)}</div><div class="list-meta">${fxEscape(item.customer)} · 绑定待审核</div></div></button>`),
      ...pendingWithdrawals.slice(0, 2).map(item => `<button class="list-item list-button" data-nav="withdrawals"><span class="list-icon">${icon("rotate-ccw", "↻")}</span><div class="list-content"><div class="list-title">${fxEscape(item.product)}</div><div class="list-meta">${fxEscape(item.customer)} · 撤回待审批</div></div></button>`),
    ].join("") || `<div class="empty"><p>暂无待处理事项</p></div>`;
    const recentBatches = [...codeBatches].sort((left, right) => String(right.createdAt || right.created || "").localeCompare(String(left.createdAt || left.created || ""))).slice(0, 6).map(item => `<tr><td><button class="text-action mono" data-action="fx-open-code-batch-detail" data-no="${fxEscape(item.no)}">${fxEscape(item.range || "—")}</button></td><td>${formatNumber(item.total)}</td><td>${formatNumber(fxCodeBatchAllocatedAmount(item))}</td><td>${status(fxCodeBatchAllocationStatus(item))}</td></tr>`).join("") || fxEmpty(4, "暂无库存码段");
    return `<div class="page">${pageHeader("运营概览", `${fxToday} · 平台实时业务状态`, `<button class="button primary" data-action="go-reviews">${icon("clipboard-check", "✓")}处理待审核</button>`)}${fxOverviewMetricStrip([{ label: "库存码段", value: formatNumber(codeBatches.length), note: "平台生成记录", icon: "receipt-text", nav: "inventory" }, { label: "生成码量", value: formatNumber(totalCodes), note: "全部库存码段", icon: "qr-code", nav: "inventory" }, { label: "已分配", value: formatNumber(allocatedCodes), note: totalCodes ? `${Math.round(allocatedCodes / totalCodes * 100)}%` : "0%", icon: "send", up: true, nav: "orders" }, { label: "剩余库存", value: formatNumber(inventoryCodes), note: "待运营分配", icon: "circle-dashed", nav: "inventory" }])}<div class="section-row"><section class="panel"><div class="panel-header"><h2>最近生成码段</h2><button class="button small" data-nav="inventory">查看全部</button></div><div class="table-scroll"><table><thead><tr><th>序列号范围</th><th>生成数量</th><th>已分配</th><th>状态</th></tr></thead><tbody>${recentBatches}</tbody></table></div></section><section class="panel"><div class="panel-header"><h2>待办事项</h2></div><div class="panel-body list">${todoItems}</div></section></div></div>`;
  };

  qrMarkup = function (seed = "preview", options = {}) {
    const target = new URL("pages/scan/preview.html?preview=1", document.baseURI).href;
    return `<div class="qr-preview qr-svg-preview">${fxQrSvg(seed, target, options)}</div>`;
  };

  function fxFilterInput(id, value, placeholder, resetContext = "") {
    const context = resetContext || ({ "fx-customer-search": "customers", "fx-review-search": "reviews", "fx-customer-product-search": "customer-products" })[id] || "";
    const label = String(placeholder || "").replace(/^搜索/, "");
    return `<div class="search-field"><label class="filter-field-label" for="${id}">${fxEscape(label)}</label><input id="${id}" value="${fxEscape(value)}" placeholder="请输入" aria-label="${fxEscape(label)}"></div>${context ? `<button type="button" class="button small list-reset-button" data-action="fx-reset-list" data-reset-context="${context}">${icon("rotate-ccw", "↻")}重置</button>` : ""}`;
  }
  function fxEmpty(colspan, text) { return `<tr><td colspan="${colspan}"><div class="empty"><div><div class="empty-icon">${icon("search-x", "×")}</div><h3>${text}</h3><p>调整筛选条件后重试。</p></div></div></td></tr>`; }

  function fxTableSelectHeader(label, filter, options, current) {
    const optionMarkup = options.map(value => `<option value="${fxEscape(value)}" ${current === value ? "selected" : ""}>${fxEscape(value)}</option>`).join("");
    const active = !String(current).startsWith("全部");
    return `<div class="table-heading"><span>${label}</span><label class="header-filter-control ${active ? "active" : ""}" title="筛选${label}">${icon("list-filter", "≡")}<select data-table-filter="${filter}" aria-label="筛选${label}">${optionMarkup}</select></label></div>`;
  }
  function fxCombinedPendingProducts(orderNo, excludeProductId = null) {
    return products.filter(product =>
      product.status === "待审核" &&
      product.applicationType === "新建产品并绑定" &&
      product.requestedOrderNo === orderNo &&
      Number(product.id) !== Number(excludeProductId)
    );
  }
  function fxCombinedProductRequest(product) {
    const statusMap = { "草稿": "草稿", "待审核": "待审批", "已激活": "已通过", "已驳回": "已驳回" };
    return {
      id: `product-${product.id}`,
      source: "product-review",
      applicationType: "新建产品并绑定",
      productId: product.id,
      customerId: fxCustomerForRecord(product)?.id || null,
      orderNo: product.requestedOrderNo,
      customer: product.company,
      product: product.name,
      batch: product.batch,
      range: product.requestedRange || "",
      amount: Number(product.requestedAmount || 0),
      status: statusMap[product.status] || product.status,
      time: product.submitted || "",
      decidedAt: product.decidedAt || "",
      operator: product.operator || "",
      rejectReason: product.rejectionReason || "",
    };
  }
  function fxAllBindingReviewRequests(includeDrafts = false) {
    const existingRequests = bindRequests
      .filter(request => includeDrafts || request.status !== "草稿")
      .map(request => ({ ...request, source: "binding", applicationType: "已有产品追加绑定" }));
    const combinedRequests = products
      .filter(product => product.applicationType === "新建产品并绑定" && product.requestedOrderNo && (includeDrafts || product.status !== "草稿"))
      .map(fxCombinedProductRequest);
    return [...existingRequests, ...combinedRequests];
  }
  function fxOrderPendingRequests(orderNo, excludeProductId = null) {
    return fxAllBindingReviewRequests().filter(request =>
      request.orderNo === orderNo &&
      request.status === "待审批" &&
      !(request.source === "product-review" && Number(request.productId) === Number(excludeProductId))
    );
  }
  function fxOrderPendingAmount(orderOrNo, excludeProductId = null) {
    const orderNo = typeof orderOrNo === "string" ? orderOrNo : orderOrNo?.no;
    return fxOrderPendingRequests(orderNo, excludeProductId).reduce((sum, request) => sum + Number(request.amount || 0), 0);
  }
  function fxOrderAvailableAmount(order, excludeProductId = null) {
    if (!order || order.allocationStatus === "已撤销") return 0;
    return Math.max(0, Number(order?.total || 0) - Number(order?.active || 0) - fxOrderPendingAmount(order, excludeProductId));
  }
  function fxSortValue(item, key) {
    if (key === "allocatedTime") {
      const value = item?.allocatedAt || item?.createdAt || item?.created || "";
      return Date.parse(String(value).replace(" ", "T")) || 0;
    }
    if (key === "orderNo") return String(item?.no || "");
    if (Object.prototype.hasOwnProperty.call(item, key)) return Number(item[key] || 0);
    if (key === "pending") return fxOrderPendingAmount(item);
    if (key === "remaining") return fxOrderAvailableAmount(item);
    return Number(item[key] || 0);
  }
  function fxNewestRows(rows, getTime) {
    return rows.map((item, index) => ({ item, index, time: /^\d{4}-\d{2}-\d{2}/.test(String(getTime(item) || "")) ? String(getTime(item)) : "" })).sort((left, right) => right.time.localeCompare(left.time) || left.index - right.index).map(entry => entry.item);
  }
  function fxSortedRows(rows, scope, defaultTime) {
    const key = state[`${scope}SortKey`]; const direction = state[`${scope}SortDirection`];
    if (!key) return defaultTime ? fxNewestRows(rows, defaultTime) : rows;
    return [...rows].sort((left, right) => {
      const leftValue = fxSortValue(left, key); const rightValue = fxSortValue(right, key);
      const comparison = typeof leftValue === "number" && typeof rightValue === "number"
        ? leftValue - rightValue
        : String(leftValue).localeCompare(String(rightValue), "zh-CN", { numeric: true });
      return comparison * (direction === "desc" ? -1 : 1);
    });
  }
  function fxSortHeader(label, scope, key, options = {}) {
    const active = state[`${scope}SortKey`] === key; const direction = state[`${scope}SortDirection`];
    const iconName = active ? direction === "desc" ? "arrow-down" : "arrow-up" : "arrow-up-down";
    const directionText = active ? direction === "desc" ? "倒序" : "正序" : "未排序";
    return `<div class="table-heading ${options.className || ""}"><span>${options.labelMarkup || label}</span><button type="button" class="header-filter-control header-sort-button ${active ? "active" : ""}" data-action="fx-sort-${scope}s" data-sort="${key}" aria-label="${label}${directionText}" aria-pressed="${active}" title="${label}：${directionText}">${icon(iconName, active ? direction === "desc" ? "↓" : "↑" : "↕")}</button></div>`;
  }
  function fxToggleSort(scope, key) {
    const sortKey = `${scope}SortKey`; const directionKey = `${scope}SortDirection`;
    if (state[sortKey] !== key) { state[sortKey] = key; state[directionKey] = "asc"; return; }
    if (state[directionKey] === "asc") { state[directionKey] = "desc"; return; }
    state[sortKey] = ""; state[directionKey] = "asc";
  }

  function fxOperatorStatusHeader() {
    return fxTableSelectHeader("状态", "operatorStatus", ["全部状态", "启用", "禁用"], state.operatorStatus);
  }
  function fxOperatorLoginHeader() {
    const active = Boolean(state.operatorDateFrom || state.operatorDateTo);
    return `<div class="table-heading"><span>最近登录</span><button type="button" class="header-filter-control operator-date-trigger date-filter-trigger ${active ? "active" : ""}" data-action="fx-open-operator-calendar" aria-label="筛选最近登录时间" aria-expanded="${state.operatorCalendarOpen}" title="筛选最近登录时间">${icon("calendar-range", "▦")}</button></div>`;
  }
  function fxOrderCreatedHeader() {
    const active = Boolean(state.orderFrom || state.orderTo);
    const label = state.portal === "ops" && state.opsPage === "inventory" ? "生成时间" : "分配时间";
    return `<div class="table-heading"><span>${label}</span><button type="button" class="header-filter-control order-date-trigger date-filter-trigger ${active ? "active" : ""}" data-action="fx-open-order-calendar" aria-label="筛选${label}" aria-expanded="${state.orderCalendarOpen}" title="筛选${label}">${icon("calendar-range", "▦")}</button></div>`;
  }

  function fxOpsOperators() {
    const rows = fxFilteredOperators();
    return `<div class="page">${pageHeader("运营账号管理", "所有运营账号权限一致，可维护登录状态与密码", `<button class="button primary" data-action="fx-new-operator">${icon("plus", "+")}新建运营账号</button>`)}<div class="toolbar"><div class="filters operator-search-filters">${fxFilterInput("fx-operator-name-search", state.operatorNameFilter, "搜索姓名")}${fxFilterInput("fx-operator-account-search", state.operatorAccountFilter, "搜索账号")}<button type="button" class="button small list-reset-button" data-action="fx-reset-list" data-reset-context="operators">${icon("rotate-ccw", "↻")}重置</button></div></div><div class="table-shell"><div class="table-scroll"><table><thead><tr><th>姓名</th><th>账号</th><th>${fxOperatorStatusHeader()}</th><th>操作</th></tr></thead><tbody>${rows.length ? rows.map(item => `<tr><td><div class="cell-main">${fxEscape(item.name)}</div></td><td class="mono">${fxEscape(item.account)}</td><td>${status(item.status)}</td><td><div class="table-actions"><button class="text-action" data-action="fx-edit-operator" data-id="${item.id}">编辑</button>${fxIsCurrentOperator(item) ? `<span class="status neutral current-account-label" title="当前账号请在个人设置中修改密码，且不能更改自身状态">当前账号</span>` : `<button class="text-action ${item.status === "启用" ? "danger-text" : "success-text"}" data-action="fx-toggle-operator" data-id="${item.id}">${item.status === "启用" ? "禁用" : "启用"}</button>`}</div></td></tr>`).join("") : fxEmpty(4, "未找到运营账号")}</tbody></table></div>${pagination(rows.length)}</div></div>`;
  }

  function fxCustomerCodeSummary(customerOrName) {
    const customer = typeof customerOrName === "object" ? customerOrName : customers.find(item => item.name === customerOrName);
    const customerOrders = customer ? orders.filter(order => fxRecordBelongsToCustomer(order, customer) && order.allocationStatus !== "已撤销") : [];
    return {
      total: customerOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
      active: customerOrders.reduce((sum, order) => sum + Number(order.active || 0), 0),
      pending: customerOrders.reduce((sum, order) => sum + fxOrderPendingAmount(order), 0),
      available: customerOrders.reduce((sum, order) => sum + fxOrderAvailableAmount(order), 0),
    };
  }

  opsCustomers = function () {
    const nameTerm = state.customerNameFilter.trim().toLowerCase();
    const accountTerm = state.customerAccountFilter.trim().toLowerCase();
    const phoneTerm = state.customerPhoneFilter.trim().toLowerCase();
    let rows = customers
      .filter(item => (!nameTerm || String(item.name || "").toLowerCase().includes(nameTerm))
        && (!accountTerm || String(item.account || "").toLowerCase().includes(accountTerm))
        && (!phoneTerm || String(item.phone || "").toLowerCase().includes(phoneTerm))
        && (state.customerStatus === "全部状态" || item.status === state.customerStatus))
      .map(item => ({ ...item, ...fxCustomerCodeSummary(item) }));
    rows = fxSortedRows(rows, "customer");
    return `<div class="page">${pageHeader("客户列表", "管理客户资料、账号状态与码段使用概况", `<button class="button primary" data-action="fx-new-customer">${icon("plus", "+")}新建客户</button><button class="button" data-action="fx-export-customers">${icon("download", "↓")}导出列表</button>`)}<div class="toolbar"><div class="filters customer-search-filters">${fxFilterInput("fx-customer-name-search", state.customerNameFilter, "搜索客户名称")}${fxFilterInput("fx-customer-account-search", state.customerAccountFilter, "搜索账号")}${fxFilterInput("fx-customer-phone-search", state.customerPhoneFilter, "搜索联系电话")}<button type="button" class="button small list-reset-button" data-action="fx-reset-list" data-reset-context="customers">${icon("rotate-ccw", "↻")}重置</button></div></div><div class="table-shell"><div class="table-scroll"><table class="customer-account-table"><thead><tr><th>客户名称</th><th>账号</th><th>联系电话</th><th>${fxTableSelectHeader("状态", "customerStatus", ["全部状态", "启用", "禁用"], state.customerStatus)}</th><th>${fxSortHeader("订单码量", "customer", "total")}</th><th>${fxSortHeader("已激活", "customer", "active")}</th><th>${fxSortHeader("绑定申请中", "customer", "pending")}</th><th>${fxSortHeader("剩余可用", "customer", "available")}</th><th class="action-column">账号操作</th></tr></thead><tbody>${rows.length ? rows.map(item => `<tr><td><div class="cell-main">${fxEscape(item.name)}</div></td><td class="mono">${fxEscape(item.account)}</td><td>${fxEscape(item.phone)}</td><td>${status(item.status)}</td><td>${formatNumber(item.total)}</td><td>${formatNumber(item.active)}</td><td>${formatNumber(item.pending)}</td><td>${formatNumber(item.available)}</td><td class="action-column"><div class="table-actions"><button class="text-action" data-action="fx-view-customer-detail" data-id="${item.id}">详情</button><button class="text-action" data-action="fx-edit-customer" data-id="${item.id}">编辑</button><button class="text-action" data-action="fx-choose-allocation-batch" data-customer-id="${item.id}" ${item.status === "启用" ? "" : `disabled title="客户账号已禁用"`}>分配码段</button><button class="text-action ${item.status === "启用" ? "danger-text" : "success-text"}" data-action="fx-toggle-customer" data-id="${item.id}">${item.status === "启用" ? "禁用" : "启用"}</button></div></td></tr>`).join("") : fxEmpty(9, "未找到客户")}</tbody></table></div>${pagination(rows.length)}</div></div>`;
  };

  function fxCustomerPickerLabel(item) { return item.name; }
  function fxRecentCustomers(limit = 5) {
    const seen = new Set();
    const recent = [];
    [...orders].sort((left, right) => String(right.createdAt || right.created || "").localeCompare(String(left.createdAt || left.created || ""))).forEach(order => {
      const customer = fxCustomerForRecord(order);
      if (customer && !seen.has(customer.id)) { seen.add(customer.id); recent.push(customer); }
    });
    return recent.slice(0, limit);
  }
  function fxCustomerPickerOptions(prefix, rawTerm = "") {
    const term = String(rawTerm || "").trim().toLowerCase();
    const matches = term
      ? customers.filter(item => item.status === "启用" && `${item.name} ${item.account}`.toLowerCase().includes(term)).slice(0, 10)
      : fxRecentCustomers();
    if (!matches.length) return `<div class="customer-picker-empty">${term ? "未找到客户账号" : "暂无最近使用的客户账号"}</div>`;
    const caption = term ? "搜索结果" : "最近使用";
    return `<div class="customer-picker-caption">${caption}</div>${matches.map(item => `<button type="button" class="customer-picker-option" role="option" data-action="fx-select-customer" data-prefix="${prefix}" data-id="${item.id}"><span class="customer-picker-option-copy"><strong>${fxEscape(item.name)}</strong></span><span class="customer-picker-account mono">${fxEscape(item.account)}</span></button>`).join("")}`;
  }
  function fxCustomerPicker(prefix, selectedId = null) {
    const selected = customers.find(item => item.id === Number(selectedId) && item.status === "启用");
    return `<div class="field full customer-picker"><label class="required" for="${prefix}-search">客户名称</label><div class="customer-picker-control"><input id="${prefix}-search" class="customer-picker-search" type="search" value="${fxEscape(selected ? fxCustomerPickerLabel(selected) : "")}" placeholder="请输入客户名称" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="${prefix}-options" aria-expanded="false"><div id="${prefix}-options" class="customer-picker-options" role="listbox">${fxCustomerPickerOptions(prefix)}</div></div><input id="${prefix}" type="hidden" value="${selected?.id || ""}"></div>`;
  }

  function fxInventoryBatches() {
    if (typeof codeBatches !== "undefined" && Array.isArray(codeBatches)) return codeBatches;
    return orders.filter(item => item.recordType === "inventory" || item.allocationStatus === "库存中" || !item.customer || item.customer === "未分配");
  }

  function fxCodeBatchRemainingAmount(batch) {
    return typeof fxCodeBatchAvailableAmount === "function"
      ? fxCodeBatchAvailableAmount(batch)
      : Math.max(0, Number(batch?.total || 0) - Number(batch?.allocatedAmount || 0));
  }

  function fxCodeBatchStatus(batch) {
    return typeof fxCodeBatchAllocationStatus === "function" ? fxCodeBatchAllocationStatus(batch) : "未分配";
  }

  function fxGeneratedCodeBatchNo() {
    return state.generatedCodeBatchNo || state.generatedOrderNo || "";
  }
  function fxQrRangeData(rawAmount = state.qrDraft.amount) {
    const amount = Math.max(1, Math.trunc(Number(rawAmount) || 1));
    const prefix = state.qrDraft.prefix || "QR";
    const first = typeof fxNextCodeSerialNumber === "function" ? fxNextCodeSerialNumber(prefix) : 1;
    return { amount, range: `${fxSerial(prefix, first)} – ${fxSerial(prefix, first + amount - 1)}` };
  }

  function fxQrOutputSize() {
    const width = Math.max(8, Number(state.qrDraft.customWidth) || 25);
    const height = Math.max(8, Number(state.qrDraft.customHeight) || 25);
    return { label: `${width} × ${height} mm`, width, height };
  }

  function fxQrCorePreviewContent() {
    const size = fxQrOutputSize();
    return `${qrMarkup("serial-batch-preview", { size: size.label, width: size.width, height: size.height })}<div class="qr-style-preview-meta"><span>${fxEscape(size.label)}</span></div>`;
  }

  function fxRefreshQrCorePreview() {
    const preview = document.getElementById("fx-qr-core-preview");
    if (preview) preview.innerHTML = fxQrCorePreviewContent();
  }

  qrStepContent = function () {
    const data = fxQrRangeData();
    const amount = data.amount;
    const range = data.range;
    const generatedBatchNo = fxGeneratedCodeBatchNo();
    if (generatedBatchNo) {
      const batch = fxInventoryBatches().find(item => item.no === generatedBatchNo);
      return `<div class="result-center"><div class="success-mark">${icon("check", "✓", "icon-lg")}</div><h2>码段已生成</h2><p class="muted">序列号范围 ${fxEscape(batch?.range || "—")}，共 ${formatNumber(batch?.total || 0)} 枚。</p></div>`;
    }
    return `<div class="order-create-form"><section class="order-create-section"><h2>生成信息</h2><div class="form-grid"><div class="field qr-order-field"><label class="required" for="fx-qr-amount">生成数量</label><input id="fx-qr-amount" type="number" min="1" max="100000" step="1" value="${amount}"></div><div class="field qr-order-field"><label for="fx-qr-note">备注</label><input id="fx-qr-note" value="${fxEscape(state.qrDraft.note)}" placeholder="例如：8 月备货码段"></div><div class="field full"><label for="fx-qr-range-preview">序列号预览</label><input id="fx-qr-range-preview" class="mono immutable-input" value="${range}" readonly aria-readonly="true" aria-live="polite"></div></div></section><section class="order-create-section"><div class="form-grid"><div class="field full"><label class="required" for="fx-qr-width">尺寸</label><div class="qr-size-inputs"><input id="fx-qr-width" type="number" min="8" max="300" step="0.1" value="${state.qrDraft.customWidth || 25}" placeholder="宽度" aria-label="尺寸宽度，单位毫米"><span aria-hidden="true">×</span><input id="fx-qr-height" type="number" min="8" max="300" step="0.1" value="${state.qrDraft.customHeight || 25}" placeholder="高度" aria-label="尺寸高度，单位毫米"><span>mm</span></div></div><div class="field full"><label>二维码预览</label><div id="fx-qr-core-preview" class="qr-style-preview" aria-live="polite">${fxQrCorePreviewContent()}</div></div></div></section></div>`;
  };

  opsCodes = function () {
    const generatedBatchNo = fxGeneratedCodeBatchNo();
    return `<div class="page">${pageHeader("生成码段", "批量生成带唯一序列号的二维码核心区块", `<button class="button" data-action="go-inventory">${icon("arrow-left", "←")}返回码段库存</button>`)}<section class="wizard-shell"><div class="wizard-content">${qrStepContent()}</div><div class="wizard-actions"><div></div><div>${generatedBatchNo ? `<button class="button" data-action="fx-new-qr">${icon("plus", "+")}继续生成</button><button class="button" data-action="fx-open-code-batch-detail" data-no="${fxEscape(generatedBatchNo)}">查看该码段</button><button class="button" data-action="fx-download-qr">${icon("download", "↓")}下载压缩包</button><button class="button primary" data-action="fx-open-code-allocation" data-no="${fxEscape(generatedBatchNo)}">${icon("send", "→")}分配给客户</button>` : `<button class="button primary" data-action="fx-create-order">${icon("qr-code", "▦")}生成码段</button>`}</div></div></section></div>`;
  };

  opsInventory = function () {
    const rangeTerm = state.inventoryRangeFilter.trim().toLowerCase();
    let rows = fxInventoryBatches()
      .map(item => ({ ...item, allocated: fxCodeBatchAllocatedAmount(item), remaining: fxCodeBatchRemainingAmount(item) }))
      .filter(item => {
        const created = item.created || String(item.createdAt || "").slice(0, 10);
        return (!rangeTerm || String(item.range || "").toLowerCase().includes(rangeTerm))
          && (state.inventoryStatus === "全部状态" || fxCodeBatchStatus(item) === state.inventoryStatus)
          && (!state.orderFrom || created >= state.orderFrom)
          && (!state.orderTo || created <= state.orderTo);
      });
    rows = fxSortedRows(rows, "order", item => item.createdAt || item.created);
    const allocationTarget = customers.find(item => item.id === Number(state.allocationCustomerId) && item.status === "启用");
    const body = rows.length ? rows.map(item => {
      const batchStatus = fxCodeBatchStatus(item);
      const canAllocate = item.remaining > 0;
      const allocateLabel = allocationTarget ? `分配给${allocationTarget.name}` : "分配客户";
      const targetAttribute = allocationTarget ? ` data-customer-id="${allocationTarget.id}"` : "";
      return `<tr data-code-range="${fxEscape(item.range || "")}"><td class="mono">${fxEscape(item.range || "—")}</td><td>${fxEscape(item.createdAt || item.created || "—")}</td><td>${formatNumber(item.total)}</td><td>${formatNumber(item.allocated)}</td><td>${formatNumber(item.remaining)}</td><td>${status(batchStatus)}</td><td>${fxEscape(item.size || "—")}</td><td class="action-column"><div class="table-actions">${canAllocate ? `<button class="text-action" data-action="fx-open-code-allocation" data-no="${fxEscape(item.no)}"${targetAttribute}>${fxEscape(allocateLabel)}</button>` : ""}<button class="text-action" data-action="fx-open-code-batch-detail" data-no="${fxEscape(item.no)}">详情</button></div></td></tr>`;
    }).join("") : fxEmpty(8, "未找到库存码段");
    const allocationBanner = allocationTarget ? `<div class="allocation-target-banner"><div><strong>正在为 ${fxEscape(allocationTarget.name)} 选择库存码段</strong><span>请在下方码段中选择“分配给该客户”。</span></div><button class="button small" data-action="fx-cancel-allocation-target">取消选择</button></div>` : "";
    return `<div class="page">${pageHeader("码段库存", "查看平台已生成码段并按需分配给客户", `<button class="button primary" data-action="go-codes">${icon("qr-code", "▦")}生成码段</button><button class="button" data-action="fx-export-orders">${icon("download", "↓")}导出列表</button>`)}${allocationBanner}<div class="toolbar"><div class="filters order-search-filters">${fxFilterInput("fx-inventory-range-search", state.inventoryRangeFilter, "搜索序列号范围")}<button type="button" class="button small list-reset-button" data-action="fx-reset-list" data-reset-context="inventory">${icon("rotate-ccw", "↻")}重置</button></div></div><div class="table-shell"><div class="table-scroll"><table class="order-table"><thead><tr><th>序列号范围</th><th>${fxOrderCreatedHeader()}</th><th>${fxSortHeader("生成数量", "order", "total")}</th><th>${fxSortHeader("已分配", "order", "allocated")}</th><th>${fxSortHeader("剩余库存", "order", "remaining")}</th><th>${fxTableSelectHeader("状态", "inventoryStatus", ["全部状态", "未分配", "部分分配", "已分配"], state.inventoryStatus)}</th><th>尺寸</th><th class="action-column">操作</th></tr></thead><tbody>${body}</tbody></table></div>${pagination(rows.length)}</div></div>`;
  };

  opsOrders = function () {
    const customerTerm = state.orderCustomerFilter.trim().toLowerCase();
    const numberTerm = state.orderNumberFilter.trim().toLowerCase();
    let rows = orders.filter(item => item.allocationStatus !== "已撤销" && (!customerTerm || String(item.customer || "").toLowerCase().includes(customerTerm)) && (!numberTerm || String(item.no || "").toLowerCase().includes(numberTerm)) && (!state.orderFrom || String(item.createdAt || item.created || "").slice(0, 10) >= state.orderFrom) && (!state.orderTo || String(item.createdAt || item.created || "").slice(0, 10) <= state.orderTo));
    rows = fxSortedRows(rows, "order", item => item.createdAt || item.created);
    const body = rows.length ? rows.map(item => {
      const pending = fxOrderPendingAmount(item);
      const remaining = fxOrderAvailableAmount(item);
      return `<tr><td class="mono">${fxEscape(item.no)}</td><td>${fxEscape(item.customer || "—")}</td><td>${fxEscape(item.allocatedAt || item.createdAt || item.created || "—")}</td><td class="mono">${fxEscape(item.range || "—")}</td><td>${formatNumber(item.total)}</td><td>${formatNumber(item.active)}</td><td>${formatNumber(pending)}</td><td>${formatNumber(remaining)}</td><td class="action-column"><div class="table-actions">${remaining > 0 ? `<button class="text-action" data-action="fx-ops-bind-order" data-no="${fxEscape(item.no)}">绑定产品</button>` : ""}<button class="text-action" data-action="fx-order-detail" data-no="${fxEscape(item.no)}">详情</button></div></td></tr>`;
    }).join("") : fxEmpty(9, "未找到订单记录");
    return `<div class="page">${pageHeader("订单台账", "查看运营端向客户分配码段形成的订单及使用情况", `<button class="button" data-action="fx-export-order-ledger">${icon("download", "↓")}导出台账</button>`)}<div class="toolbar"><div class="filters order-search-filters">${fxFilterInput("fx-order-customer-search", state.orderCustomerFilter, "搜索客户名称")}${fxFilterInput("fx-order-number-search", state.orderNumberFilter, "搜索订单号")}<button type="button" class="button small list-reset-button" data-action="fx-reset-list" data-reset-context="orders">${icon("rotate-ccw", "↻")}重置</button></div></div><div class="table-shell"><div class="table-scroll"><table class="order-table"><thead><tr><th>订单号</th><th>客户名称</th><th>${fxOrderCreatedHeader()}</th><th>序列号范围</th><th>${fxSortHeader("订单码量", "order", "total")}</th><th>${fxSortHeader("已激活", "order", "active")}</th><th>${fxSortHeader("绑定申请中", "order", "pending")}</th><th>${fxSortHeader("剩余可用", "order", "remaining")}</th><th class="action-column">操作</th></tr></thead><tbody>${body}</tbody></table></div>${pagination(rows.length)}</div></div>`;
  };

  function fxBindingReviewStatus(value) {
    return value === "待审批" ? "待审核" : value === "已通过" ? "已激活" : value;
  }

  function fxBindingReviewProduct(request) {
    return fxProductForRecord(request);
  }

  function fxBindingReviewActions(request, product, statusValue = request.status) {
    if (!product) return "";
    const reviewStatus = fxBindingReviewStatus(statusValue);
    const context = `data-source="${fxEscape(request.source || "activation")}" data-request-id="${fxEscape(request.id || "")}" data-product-id="${product.id}" data-product-name="${fxEscape(product.name || request.product || "")}" data-product-batch="${fxEscape(product.batch || request.batch || "")}" data-customer-id="${fxEscape(product.customerId || request.customerId || "")}"`;
    const reviewAction = `<button class="text-action" data-action="fx-open-binding-review-product" ${context}>${reviewStatus === "待审核" ? "审核" : "查看"}</button>`;
    const editAction = ["待审核", "已激活"].includes(reviewStatus)
      ? `<button class="text-action" data-action="fx-edit-binding-review-product" ${context}>编辑</button>`
      : "";
    return `${reviewAction}${editAction}`;
  }

  function opsBindRequests() {
    state.bindRequestStatus = fxBindingReviewStatus(state.bindRequestStatus);
    const customerTerm = state.bindRequestCustomerFilter.trim().toLowerCase();
    const orderTerm = state.bindRequestOrderFilter.trim().toLowerCase();
    const productTerm = state.bindRequestProductFilter.trim().toLowerCase();
    const batchTerm = state.bindRequestBatchFilter.trim().toLowerCase();
    const preparedRows = fxAllBindingReviewRequests().map(item => {
      const product = fxBindingReviewProduct(item);
      return { ...item, category: product?.category || "—" };
    });
    const rows = fxSortedRows(preparedRows.filter(item =>
      (!customerTerm || String(item.customer || "").toLowerCase().includes(customerTerm)) &&
      (!orderTerm || String(item.orderNo || "").toLowerCase().includes(orderTerm)) &&
      (!productTerm || String(item.product || "").toLowerCase().includes(productTerm)) &&
      (!batchTerm || String(item.batch || "").toLowerCase().includes(batchTerm)) &&
      (state.bindRequestStatus === "全部状态" || fxBindingReviewStatus(item.status) === state.bindRequestStatus) &&
      (state.bindRequestCategory === "全部大类" || item.category === state.bindRequestCategory) &&
      fxMatchesCustomerDate(item.time, "bindRequest")
    ), "bindRequest", item => item.time);
    const body = rows.length
      ? rows.map(request => {
        const order = orders.find(item => item.no === request.orderNo);
        const activation = order?.activations?.find(item => item.bindRequestNo === request.no);
        const range = request.range || activation?.range || (order ? fxActivationRange(order, request.amount, null, request.id) : "");
        const product = fxBindingReviewProduct(request);
        const reviewStatus = fxBindingReviewStatus(request.status);
        const actions = fxBindingReviewActions(request, product, reviewStatus);
        return `<tr><td>${fxEscape(request.product)}</td><td class="mono">${fxEscape(request.batch || "—")}</td><td>${fxEscape(product?.category || "—")}</td><td>${fxEscape(request.customer)}</td><td><button class="text-action mono" data-action="fx-order-detail" data-no="${fxEscape(request.orderNo)}">${fxEscape(request.orderNo)}</button></td><td class="mono">${fxEscape(range || "—")}</td><td>${formatNumber(request.amount)}</td><td>${fxEscape(request.time || "—")}</td><td>${status(reviewStatus)}</td><td class="action-column"><div class="table-actions">${actions}</div></td></tr>`;
      }).join("")
      : fxEmpty(10, "未找到绑定申请");
    return `<div class="page">${pageHeader("绑定审核", "统一审核产品资料、关联订单、申请数量与绑定码段")}<div class="toolbar"><div class="filters bind-request-search-filters">${fxFilterInput("fx-bind-request-customer-search", state.bindRequestCustomerFilter, "搜索客户名称")}${fxFilterInput("fx-bind-request-order-search", state.bindRequestOrderFilter, "搜索订单号")}${fxFilterInput("fx-bind-request-product-search", state.bindRequestProductFilter, "搜索产品名称")}${fxFilterInput("fx-bind-request-batch-search", state.bindRequestBatchFilter, "搜索产品批次")}<button type="button" class="button small list-reset-button" data-action="fx-reset-list" data-reset-context="bind-requests">${icon("rotate-ccw", "↻")}重置</button></div></div><div class="table-shell"><div class="table-scroll"><table><thead><tr><th>产品名称</th><th>产品批次</th><th>${fxTableSelectHeader("产品大类", "bindRequestCategory", ["全部大类", "农产品", "养殖品", "加工食品", "工业品", "医疗卫生用品"], state.bindRequestCategory)}</th><th>客户名称</th><th>订单号</th><th>申请码段</th><th>${fxSortHeader("申请数量", "bindRequest", "amount")}</th><th>${fxCustomerDateHeader("申请时间", "bindRequest")}</th><th>${fxTableSelectHeader("状态", "bindRequestStatus", ["全部状态", "待审核", "已激活", "已驳回"], state.bindRequestStatus)}</th><th>操作</th></tr></thead><tbody>${body}</tbody></table></div>${pagination(rows.length)}</div></div>`;
  }

  function fxFilteredReviews() {
    const term = state.filter.trim().toLowerCase();
    return fxNewestRows(products.filter(item => ["待审核", "已激活", "已驳回"].includes(item.status) && (!term || `${item.name} ${item.company} ${item.batch}`.toLowerCase().includes(term)) && (state.reviewStatus === "全部状态" || item.status === state.reviewStatus) && (state.productCategory === "全部大类" || item.category === state.productCategory) && fxMatchesCustomerDate(item.submitted, "review")), item => item.submitted);
  }
  function fxBindProductPicker(prefix, activated, allowCreate = false, selectedId = null) {
    const selected = activated.find(item => item.id === Number(selectedId));
    return `<div class="field full bind-product-picker" data-allow-create="${allowCreate}"><label class="required" for="${prefix}-search">产品名称</label><input id="${prefix}-search" class="bind-product-search" type="search" value="${fxEscape(selected?.name || "")}" placeholder="请输入产品名称或产品批次" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="${prefix}-options" aria-expanded="false"><div id="${prefix}-options" class="bind-product-options" role="listbox">${fxBindProductPickerOptions(prefix, activated, "", allowCreate)}</div><input id="${prefix}" type="hidden" value="${selected?.id || ""}"></div><div class="field full"><label for="${prefix}-batch">产品批次</label><input id="${prefix}-batch" class="immutable-input" value="${fxEscape(selected?.batch || "")}" placeholder="选择产品后自动获取" readonly aria-readonly="true"></div>`;
  }
  function fxBindProductPickerOptions(prefix, activated, rawTerm = "", allowCreate = false) {
    const term = String(rawTerm || "").trim().toLowerCase();
    const matches = (term ? activated.filter(item => `${item.name} ${item.batch || ""}`.toLowerCase().includes(term)) : activated).slice(0, term ? 10 : 5);
    const caption = matches.length ? `<div class="bind-product-caption">${term ? "搜索结果" : "可选产品"}</div>` : `<div class="bind-product-empty">${term ? "未找到匹配产品" : "暂无可选产品"}</div>`;
    const options = matches.map(item => `<button type="button" class="bind-product-option" role="option" data-action="fx-select-bind-product" data-prefix="${prefix}" data-id="${item.id}" data-name="${fxEscape(item.name)}" data-batch="${fxEscape(item.batch || "—")}"><span>${fxEscape(item.name)}</span><small>${fxEscape(item.batch || "—")}</small></button>`).join("");
    const createOption = allowCreate ? `<button type="button" class="bind-product-option create-option" role="option" data-action="fx-customer-new-product-for-order"><span>＋ 新建产品并绑定</span></button>` : "";
    return `${caption}${options}${createOption}`;
  }
  function fxWithdrawalSegmentKey(order, activation) {
    return activation?.activationId || `${order?.no || ""}::${activation?.range || ""}::${activation?.time || ""}`;
  }
  function fxProductMatchesActivation(product, activation) {
    return Boolean(product && activation && activation.status !== "已重置" && fxActivationBelongsToProduct(activation, product));
  }
  function fxWithdrawalMatchesProduct(item, product) {
    if (!item || !product) return false;
    if (item.productId !== undefined && item.productId !== null && item.productId !== "") {
      return Number(item.productId) === Number(product.id);
    }
    const customer = fxCustomerForRecord(product);
    return (!customer || fxRecordBelongsToCustomer(item, customer))
      && item.product === product.name
      && (product.batch ? item.batch === product.batch : !item.batch);
  }
  function fxProductHasPendingFullWithdrawal(product) {
    return withdrawals.some(item => item.status === "待审批" && fxWithdrawalMatchesProduct(item, product) && (!Array.isArray(item.segments) || !item.segments.length));
  }
  function fxProductActiveSegments(product, includePending = false) {
    if (!product || (!includePending && fxProductHasPendingFullWithdrawal(product))) return [];
    const customer = fxCustomerForRecord(product);
    const pendingKeys = includePending ? new Set() : new Set(withdrawals
      .filter(item => item.status === "待审批" && fxWithdrawalMatchesProduct(item, product))
      .flatMap(item => Array.isArray(item.segments) ? item.segments : [])
      .map(item => item.key || `${item.orderNo || ""}::${item.range || ""}::${item.time || ""}`));
    return orders.filter(order => order.allocationStatus !== "已撤销" && (!customer || fxRecordBelongsToCustomer(order, customer))).flatMap(order => (order.activations || [])
      .filter(activation => fxProductMatchesActivation(product, activation))
      .map(activation => ({
        key: fxWithdrawalSegmentKey(order, activation),
        activationId: activation.activationId || "",
        orderNo: order.no,
        range: activation.range || "—",
        amount: Number(activation.amount || 0),
        time: activation.time || "",
      })))
      .filter(segment => includePending || !pendingKeys.has(segment.key));
  }
  function fxWithdrawalSegments(item) {
    if (Array.isArray(item?.segments) && item.segments.length) return item.segments;
    if (Array.isArray(item?.resetRanges) && item.resetRanges.length) return item.resetRanges.map(range => ({ range }));
    return [];
  }
  function fxResolvedWithdrawalSegments(item) {
    const stored = fxWithdrawalSegments(item);
    if (stored.length) return stored;
    const product = fxProductForRecord(item);
    if (!product) return [];
    const customer = fxCustomerForRecord(item) || fxCustomerForRecord(product);
    const candidates = orders.filter(order => order.allocationStatus !== "已撤销" && (!customer || fxRecordBelongsToCustomer(order, customer))).flatMap(order => (order.activations || [])
      .filter(activation => fxActivationBelongsToProduct(activation, product))
      .map(activation => ({
        key: fxWithdrawalSegmentKey(order, activation),
        activationId: activation.activationId || "",
        orderNo: order.no,
        range: activation.range || "",
        amount: Number(activation.amount || 0),
        time: activation.time || "",
        status: activation.status || "有效",
        withdrawalNo: activation.withdrawalNo || "",
        resetTime: activation.resetTime || "",
      })))
      .filter(segment => segment.range);
    const linked = candidates.filter(segment => segment.withdrawalNo === item?.no || (item?.decidedAt && segment.resetTime === item.decidedAt));
    if (linked.length) return linked;
    if (["待审批", "已驳回"].includes(item?.status)) return candidates.filter(segment => segment.status !== "已重置");
    return candidates;
  }
  function fxWithdrawalRangeMarkup(item) {
    const ranges = [...new Set(fxResolvedWithdrawalSegments(item).map(segment => segment.range).filter(Boolean))];
    if (!ranges.length) return `<span class="muted">未记录具体码段</span>`;
    return `<div class="withdrawal-range-list">${ranges.map(range => `<span class="mono">${fxEscape(range)}</span>`).join("")}</div>`;
  }
  function fxWithdrawalSegmentPicker(product) {
    if (!product) return `<div class="field full withdrawal-segment-field"><label class="required">已绑码段</label><div class="withdrawal-segment-empty">请先选择产品</div></div>`;
    const segments = fxProductActiveSegments(product);
    if (!segments.length) return `<div class="field full withdrawal-segment-field"><label class="required">已绑码段</label><div class="withdrawal-segment-empty">该产品暂无可撤回的已绑码段</div></div>`;
    const rows = segments.map(segment => `<label class="withdrawal-segment-option"><input type="checkbox" data-withdraw-segment data-amount="${segment.amount}" value="${fxEscape(segment.key)}"><span class="withdrawal-segment-copy"><strong class="mono">${fxEscape(segment.range)}</strong><small>订单号 ${fxEscape(segment.orderNo)} · ${formatNumber(segment.amount)} 枚</small></span></label>`).join("");
    return `<div class="field full withdrawal-segment-field"><div class="withdrawal-segment-head"><label class="required">已绑码段</label><label class="withdrawal-select-all"><input id="fx-withdraw-select-all" type="checkbox">全选</label></div><div class="withdrawal-segment-list">${rows}</div><span id="fx-withdraw-selection-summary" class="field-help">已选择 0 个码段</span></div>`;
  }
  function fxSyncWithdrawalSegmentSelection() {
    const boxes = [...document.querySelectorAll("[data-withdraw-segment]")];
    const selected = boxes.filter(box => box.checked);
    const selectAll = document.getElementById("fx-withdraw-select-all");
    if (selectAll) {
      selectAll.checked = boxes.length > 0 && selected.length === boxes.length;
      selectAll.indeterminate = selected.length > 0 && selected.length < boxes.length;
    }
    const summary = document.getElementById("fx-withdraw-selection-summary");
    if (summary) summary.textContent = `已选择 ${selected.length} 个码段，共 ${formatNumber(selected.reduce((sum, box) => sum + Number(box.dataset.amount || 0), 0))} 枚`;
  }
  opsReviews = function () {
    const rows = fxFilteredReviews();
    return `<div class="page">${pageHeader("产品审核", "审核客户已提交的产品资料，并维护已激活产品内容")}<div class="toolbar"><div class="filters">${fxFilterInput("fx-review-search", state.filter, "产品、客户或批次")}</div><button class="button" data-action="fx-export-products">${icon("download", "↓")}导出</button></div><div class="table-shell"><div class="table-scroll"><table><thead><tr><th>产品名称</th><th>产品批次</th><th>${fxTableSelectHeader("产品大类", "productCategory", ["全部大类", "农产品", "养殖品", "加工食品", "工业品", "医疗卫生用品"], state.productCategory)}</th><th>客户名称</th><th>${fxCustomerDateHeader("产品提交时间", "review")}</th><th>${fxTableSelectHeader("状态", "reviewStatus", ["全部状态", "待审核", "已激活", "已驳回"], state.reviewStatus)}</th><th>操作</th></tr></thead><tbody>${rows.length ? rows.map(item => { const reviewAction = `<button class="text-action" data-action="open-review" data-id="${item.id}">${item.status === "待审核" ? "审核" : "查看"}</button>`; const editAction = ["待审核", "已激活"].includes(item.status) ? `<button class="text-action" data-action="fx-ops-edit-product" data-id="${item.id}">编辑</button>` : ""; return `<tr><td><div class="cell-main">${fxEscape(item.name)}</div></td><td class="mono">${item.batch}</td><td>${item.category}</td><td>${fxEscape(item.company)}</td><td>${fxEscape(item.submitted || "—")}</td><td>${status(item.status)}</td><td class="action-column"><div class="table-actions">${reviewAction}${editAction}</div></td></tr>`; }).join("") : fxEmpty(7, "未找到产品")}</tbody></table></div>${pagination(rows.length)}</div></div>`;
  };

  opsWithdrawals = function () {
    const noTerm = state.withdrawalNoFilter.trim().toLowerCase();
    const productTerm = state.withdrawalProductFilter.trim().toLowerCase();
    const customerTerm = state.withdrawalCustomerFilter.trim().toLowerCase();
    const rows = fxNewestRows(withdrawals.map((item, index) => ({ ...item, index })).filter(item => (!noTerm || String(item.no || "").toLowerCase().includes(noTerm)) && (!productTerm || String(item.product || "").toLowerCase().includes(productTerm)) && (!customerTerm || String(item.customer || "").toLowerCase().includes(customerTerm)) && (state.withdrawalStatus === "全部状态" || item.status === state.withdrawalStatus) && fxMatchesCustomerDate(item.time, "opsWithdrawal")), item => item.time);
    return `<div class="page">${pageHeader("撤回审核", "审批已激活产品的码段撤回或整产品撤回，处理结果自动通知客户")}<div class="toolbar"><div class="filters withdrawal-search-filters">${fxFilterInput("fx-withdrawal-no-search", state.withdrawalNoFilter, "搜索申请编号")}${fxFilterInput("fx-withdrawal-product-search", state.withdrawalProductFilter, "搜索产品名称")}${fxFilterInput("fx-withdrawal-customer-search", state.withdrawalCustomerFilter, "搜索客户名称")}<button type="button" class="button small list-reset-button" data-action="fx-reset-list" data-reset-context="withdrawals">${icon("rotate-ccw", "↻")}重置</button></div></div><div class="table-shell"><div class="table-scroll"><table><thead><tr><th>申请编号</th><th>产品名称</th><th>产品批次</th><th>撤回码段</th><th>客户名称</th><th>撤回原因</th><th>${fxCustomerDateHeader("申请时间", "opsWithdrawal")}</th><th>${fxTableSelectHeader("状态", "withdrawalStatus", ["全部状态", "待审批", "已通过", "已驳回"], state.withdrawalStatus)}</th><th>操作</th></tr></thead><tbody>${rows.length ? rows.map(item => { const product = fxProductForRecord(item); return `<tr><td class="mono">${item.no}</td><td>${fxEscape(item.product)}</td><td class="mono">${fxEscape(item.batch || product?.batch || "—")}</td><td>${fxWithdrawalRangeMarkup(item)}</td><td>${fxEscape(item.customer)}</td><td>${fxEscape(item.reason)}</td><td>${fxEscape(item.time || "—")}</td><td>${status(item.status)}</td><td>${item.status === "待审批" ? `<button class="text-action success-text" data-action="fx-approve-withdrawal" data-index="${item.index}">通过</button><button class="text-action danger-text" data-action="fx-reject-withdrawal" data-index="${item.index}">驳回</button>` : `<button class="text-action" data-action="fx-view-withdrawal" data-index="${item.index}">查看</button>`}</td></tr>`; }).join("") : fxEmpty(9, "未找到撤回申请")}</tbody></table></div>${pagination(rows.length)}</div></div>`;
  };

  function fxMessageHeader(label, filter, customerScope = false) {
    const current = fxMessageFilterValue(filter);
    const active = !String(current).startsWith("全部");
    if (filter === "time") return `<div class="table-heading"><span>${label}</span><button type="button" class="header-filter-control message-date-trigger date-filter-trigger ${active ? "active" : ""}" data-action="fx-open-message-calendar" aria-label="筛选${label}" aria-expanded="${state.messageCalendarOpen}" title="筛选${label}">${icon("calendar-range", "▦")}</button></div>`;
    const options = fxMessageFilterOptions(filter, customerScope).map(value => `<option value="${fxEscape(value)}" ${value === current ? "selected" : ""}>${fxEscape(value)}</option>`).join("");
    return `<div class="table-heading"><span>${label}</span><label class="header-filter-control ${active ? "active" : ""}" title="筛选${label}">${icon("list-filter", "≡")}<select data-message-filter="${filter}" aria-label="筛选${label}">${options}</select></label></div>`;
  }
  function fxCustomerDatePrefix(context) {
    return { order: "customerOrder", product: "customerProduct", review: "review", withdrawal: "customerWithdrawal", opsWithdrawal: "withdrawal", bindRequest: "bindRequest", orderBindingRequested: "orderBindingRequested", orderBindingProcessed: "orderBindingProcessed", inventoryAllocation: "inventoryAllocation" }[context] || "customerOrder";
  }
  function fxCustomerDateRange(context, draft = false) {
    const prefix = fxCustomerDatePrefix(context); const infix = draft ? "DateDraft" : "Date";
    return { from: state[`${prefix}${infix}From`] || "", to: state[`${prefix}${infix}To`] || "" };
  }
  function fxSetCustomerDateRange(context, draft, from, to) {
    const prefix = fxCustomerDatePrefix(context); const infix = draft ? "DateDraft" : "Date";
    state[`${prefix}${infix}From`] = from; state[`${prefix}${infix}To`] = to;
  }
  function fxCustomerDateHeader(label, context) {
    const range = fxCustomerDateRange(context); const active = Boolean(range.from || range.to); const open = state.customerCalendarOpen && state.customerCalendarContext === context;
    return `<div class="table-heading"><span>${label}</span><button type="button" class="header-filter-control date-filter-trigger ${active ? "active" : ""}" data-action="fx-open-customer-calendar" data-date-context="${context}" aria-label="筛选${label}" aria-expanded="${open}" title="筛选${label}">${icon("calendar-range", "▦")}</button></div>`;
  }
  function fxMatchesCustomerDate(value, context) {
    const date = String(value || "").slice(0, 10); const range = fxCustomerDateRange(context);
    return (!range.from || date >= range.from) && (!range.to || date <= range.to);
  }
  function fxDateValue(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
  function fxMonthValue(value) { return `${String(value).slice(0, 7)}-01`; }
  function fxShiftMonth(value, amount) {
    const date = new Date(`${fxMonthValue(value)}T00:00:00`); date.setMonth(date.getMonth() + amount);
    return fxDateValue(new Date(date.getFullYear(), date.getMonth(), 1));
  }
  function fxMonthDistance(left, right) {
    const start = new Date(`${fxMonthValue(left)}T00:00:00`); const end = new Date(`${fxMonthValue(right)}T00:00:00`);
    return (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
  }
  function fxCalendarMonthKeys(scope) {
    if (scope === "operator") return ["operatorCalendarLeftMonth", "operatorCalendarRightMonth"];
    if (scope === "order") return ["orderCalendarLeftMonth", "orderCalendarRightMonth"];
    if (scope === "customer") return ["customerCalendarLeftMonth", "customerCalendarRightMonth"];
    return ["messageCalendarLeftMonth", "messageCalendarRightMonth"];
  }
  function fxSetCalendarMonthsFromRange(scope, from, to) {
    const [leftKey, rightKey] = fxCalendarMonthKeys(scope); const left = from ? fxMonthValue(from) : "2026-06-01";
    const endMonth = to ? fxMonthValue(to) : ""; state[leftKey] = left; state[rightKey] = endMonth > left ? endMonth : fxShiftMonth(left, 1);
  }
  function fxMoveCalendarPanel(scope, side, amount) {
    const [leftKey, rightKey] = fxCalendarMonthKeys(scope); let left = state[leftKey]; let right = state[rightKey];
    if (side === "left") { left = fxShiftMonth(left, amount); if (left >= right) right = fxShiftMonth(left, 1); }
    else { right = fxShiftMonth(right, amount); if (right <= left) left = fxShiftMonth(right, -1); }
    state[leftKey] = left; state[rightKey] = right;
  }
  function fxFocusCalendarCurrentMonth(scope, side) {
    const [leftKey, rightKey] = fxCalendarMonthKeys(scope); let left = state[leftKey]; let right = state[rightKey];
    const current = "2026-07-01"; const gap = Math.max(1, fxMonthDistance(left, right));
    if (side === "left") { if (left === current) return; left = current; if (right <= left) right = fxShiftMonth(left, gap); }
    else { if (right === current) return; right = current; if (left >= right) left = fxShiftMonth(right, -gap); }
    state[leftKey] = left; state[rightKey] = right;
  }
  function fxCalendarMonthMarkup(monthDate, scope = "message", side = "left") {
    const year = monthDate.getFullYear(); const month = monthDate.getMonth();
    const currentMonth = year === 2026 && month === 6;
    const operator = scope === "operator"; const order = scope === "order"; const customer = scope === "customer"; const actionPrefix = operator ? "fx-operator-calendar" : order ? "fx-order-calendar" : customer ? "fx-customer-calendar" : "fx-message-calendar";
    const first = new Date(year, month, 1); const gridStart = new Date(year, month, 1 - first.getDay());
    const days = Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart); date.setDate(gridStart.getDate() + index);
      const value = fxDateValue(date); const outside = date.getMonth() !== month; const today = value === "2026-07-29";
      const customerRange = customer ? fxCustomerDateRange(state.customerCalendarContext, true) : null;
      const from = operator ? state.operatorDateDraftFrom : order ? state.orderDateDraftFrom : customer ? customerRange.from : state.messageDateDraftFrom;
      const to = operator ? state.operatorDateDraftTo : order ? state.orderDateDraftTo : customer ? customerRange.to : state.messageDateDraftTo;
      const selectedStart = value === from; const selectedEnd = value === (to || from);
      const inRange = Boolean(from && to && value > from && value < to);
      return `<button type="button" class="calendar-day ${outside ? "outside" : ""} ${today ? "today" : ""} ${inRange ? "in-range" : ""} ${selectedStart ? "range-start" : ""} ${selectedEnd ? "range-end" : ""}" data-action="${actionPrefix}-day" data-date="${value}" aria-label="${value}" aria-pressed="${selectedStart || selectedEnd}">${date.getDate()}</button>`;
    }).join("");
    return `<section class="calendar-month" data-calendar-side="${side}"><header class="calendar-month-header"><h3>${year} 年 ${month + 1} 月</h3><div><button type="button" data-action="${actionPrefix}-prev" data-calendar-side="${side}" aria-label="上一个月">${icon("chevron-left", "‹")}</button><button type="button" class="calendar-current-button ${currentMonth ? "active" : ""}" data-action="${actionPrefix}-current" data-calendar-side="${side}" aria-label="回到当前月份" aria-pressed="${currentMonth}">${currentMonth ? "●" : "○"}</button><button type="button" data-action="${actionPrefix}-next" data-calendar-side="${side}" aria-label="下一个月">${icon("chevron-right", "›")}</button></div></header><div class="calendar-weekdays">${["日", "一", "二", "三", "四", "五", "六"].map(day => `<span>${day}</span>`).join("")}</div><div class="calendar-days">${days}</div></section>`;
  }
  function fxMessageCalendar() {
    if (!state.messageCalendarOpen) return "";
    const left = new Date(`${state.messageCalendarLeftMonth}T00:00:00`); const right = new Date(`${state.messageCalendarRightMonth}T00:00:00`);
    const rangeText = state.messageDateDraftFrom ? `${state.messageDateDraftFrom}${state.messageDateDraftTo ? ` — ${state.messageDateDraftTo}` : ""}` : "请选择日期范围";
    return `<div class="message-calendar-layer date-calendar-layer" data-action="fx-close-message-calendar"><section class="message-date-popover date-filter-popover" role="dialog" aria-label="发送时间筛选" data-action="fx-calendar-panel"><div class="calendar-months">${fxCalendarMonthMarkup(left, "message", "left")}${fxCalendarMonthMarkup(right, "message", "right")}</div><footer class="calendar-footer"><span class="calendar-range-text">${rangeText}</span><div><button type="button" class="button" data-action="fx-clear-message-calendar">清除</button><button type="button" class="button primary" data-action="fx-apply-message-calendar" ${state.messageDateDraftFrom ? "" : "disabled"}>确定</button></div></footer></section></div>`;
  }
  function fxOperatorCalendar() {
    if (!state.operatorCalendarOpen) return "";
    const left = new Date(`${state.operatorCalendarLeftMonth}T00:00:00`); const right = new Date(`${state.operatorCalendarRightMonth}T00:00:00`);
    const rangeText = state.operatorDateDraftFrom ? `${state.operatorDateDraftFrom}${state.operatorDateDraftTo ? ` — ${state.operatorDateDraftTo}` : ""}` : "请选择日期范围";
    return `<div class="message-calendar-layer date-calendar-layer" data-action="fx-close-operator-calendar"><section class="message-date-popover date-filter-popover" role="dialog" aria-label="最近登录时间筛选" data-action="fx-operator-calendar-panel"><div class="calendar-months">${fxCalendarMonthMarkup(left, "operator", "left")}${fxCalendarMonthMarkup(right, "operator", "right")}</div><footer class="calendar-footer"><span class="calendar-range-text">${rangeText}</span><div><button type="button" class="button" data-action="fx-clear-operator-calendar">清除</button><button type="button" class="button primary" data-action="fx-apply-operator-calendar" ${state.operatorDateDraftFrom ? "" : "disabled"}>确定</button></div></footer></section></div>`;
  }
  function fxOrderCalendar() {
    if (!state.orderCalendarOpen) return "";
    const left = new Date(`${state.orderCalendarLeftMonth}T00:00:00`); const right = new Date(`${state.orderCalendarRightMonth}T00:00:00`);
    const rangeText = state.orderDateDraftFrom ? `${state.orderDateDraftFrom}${state.orderDateDraftTo ? ` — ${state.orderDateDraftTo}` : ""}` : "请选择日期范围";
    return `<div class="message-calendar-layer date-calendar-layer" data-action="fx-close-order-calendar"><section class="message-date-popover date-filter-popover" role="dialog" aria-label="创建时间筛选" data-action="fx-order-calendar-panel"><div class="calendar-months">${fxCalendarMonthMarkup(left, "order", "left")}${fxCalendarMonthMarkup(right, "order", "right")}</div><footer class="calendar-footer"><span class="calendar-range-text">${rangeText}</span><div><button type="button" class="button" data-action="fx-clear-order-calendar">清除</button><button type="button" class="button primary" data-action="fx-apply-order-calendar" ${state.orderDateDraftFrom ? "" : "disabled"}>确定</button></div></footer></section></div>`;
  }
  function fxCustomerCalendar() {
    if (!state.customerCalendarOpen) return "";
    const context = state.customerCalendarContext; const range = fxCustomerDateRange(context, true);
    const left = new Date(`${state.customerCalendarLeftMonth}T00:00:00`); const right = new Date(`${state.customerCalendarRightMonth}T00:00:00`);
    const rangeText = range.from ? `${range.from}${range.to ? ` — ${range.to}` : ""}` : "请选择日期范围";
    const label = { order: "创建时间筛选", product: "提交时间筛选", review: "产品提交时间筛选", withdrawal: "申请时间筛选", opsWithdrawal: "申请时间筛选", bindRequest: "申请时间筛选", orderBindingRequested: "申请时间筛选", orderBindingProcessed: "处理时间筛选", inventoryAllocation: "分配时间筛选" }[context] || "时间筛选";
    return `<div class="message-calendar-layer date-calendar-layer" data-action="fx-close-customer-calendar"><section class="message-date-popover date-filter-popover" role="dialog" aria-label="${label}" data-action="fx-customer-calendar-panel"><div class="calendar-months">${fxCalendarMonthMarkup(left, "customer", "left")}${fxCalendarMonthMarkup(right, "customer", "right")}</div><footer class="calendar-footer"><span class="calendar-range-text">${rangeText}</span><div><button type="button" class="button" data-action="fx-clear-customer-calendar">清除</button><button type="button" class="button primary" data-action="fx-apply-customer-calendar" ${range.from ? "" : "disabled"}>确定</button></div></footer></section></div>`;
  }
  function fxSyncMessageSelection(root) {
    const selectAll = root.querySelector("#fx-message-select-all");
    if (!selectAll) return;
    const visibleIds = (state.portal === "customer" ? fxFilteredCustomerMessages() : fxFilteredOpsMessages()).map(item => item.id);
    const selected = new Set(state.selectedMessageIds.map(Number));
    const selectedVisible = visibleIds.filter(id => selected.has(Number(id))).length;
    selectAll.checked = visibleIds.length > 0 && selectedVisible === visibleIds.length;
    selectAll.indeterminate = selectedVisible > 0 && selectedVisible < visibleIds.length;
  }
  function fxPositionDateCalendar(root) {
    const dateTriggers = [...root.querySelectorAll(".date-filter-trigger")];
    const trigger = state.customerCalendarOpen
      ? dateTriggers.find(item => item.dataset.dateContext === state.customerCalendarContext) || dateTriggers[0]
      : dateTriggers[0];
    const popover = root.querySelector(".date-filter-popover");
    if (!trigger || !popover || !trigger.getBoundingClientRect) return;
    const rect = trigger.getBoundingClientRect(); const width = Math.min(580, Math.max(320, window.innerWidth - 24));
    const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.right - width));
    popover.style.left = `${left}px`; popover.style.top = `${Math.min(window.innerHeight - 24, rect.bottom + 6)}px`;
  }

  messagesPage = function (isCustomer = false) {
    const rows = isCustomer ? fxFilteredCustomerMessages() : fxFilteredOpsMessages();
    const selected = new Set(state.selectedMessageIds.map(Number));
    const customerReadFilter = isCustomer ? `<label class="message-toolbar-filter" aria-label="阅读状态筛选"><select data-message-filter="read" aria-label="阅读状态筛选"><option value="全部阅读状态" ${state.messageReadFilter === "全部阅读状态" ? "selected" : ""}>全部</option><option value="未读" ${state.messageReadFilter === "未读" ? "selected" : ""}>未读</option><option value="已读" ${state.messageReadFilter === "已读" ? "selected" : ""}>已读</option></select></label>` : "";
    const customerReadActions = isCustomer ? `<button type="button" class="button" data-action="fx-mark-selected-read" ${state.selectedMessageIds.length ? "" : "disabled"}>${icon("mail-check", "✓")}标记为已读</button><button type="button" class="button" data-action="fx-mark-read" ${messages.some(item => fxRecordBelongsToCustomer(item, fxCurrentCustomer()) && item.unread) ? "" : "disabled"}>${icon("check-check", "✓")}全部标为已读</button>` : "";
    const recipientHeader = isCustomer ? "" : `<th>${fxMessageHeader("接收方", "recipient")}</th>`;
    const recipientCell = item => isCustomer ? "" : `<td>${fxEscape(item.recipient)}</td>`;
    const tableColumns = isCustomer ? 5 : 7;
    const colgroup = `<col class="message-checkbox-column"><col><col>${isCustomer ? "" : "<col>"}<col><col>${isCustomer ? "" : "<col>"}`;
    return `<div class="page">${pageHeader("站内信", isCustomer ? "查看审核、激活与撤回处理结果" : "查看系统向客户发送的通知记录")}<div class="toolbar message-toolbar">${customerReadFilter}<div class="message-toolbar-actions"><div class="filters message-search-fields">${fxFilterInput("fx-message-title-search", state.messageTitleSearch, "搜索消息标题")}${fxFilterInput("fx-message-content-search", state.messageContentSearch, "搜索内容摘要")}<button type="button" class="button small list-reset-button" data-action="fx-reset-list" data-reset-context="messages">${icon("rotate-ccw", "↻")}重置</button></div><button type="button" class="button danger" data-action="fx-delete-selected-messages" ${state.selectedMessageIds.length ? "" : "disabled"}>${icon("trash-2", "×")}删除${state.selectedMessageIds.length ? ` (${state.selectedMessageIds.length})` : ""}</button>${customerReadActions}</div></div><section class="panel"><div class="table-scroll"><table class="message-table" data-sequence="off"><colgroup>${colgroup}</colgroup><thead><tr><th class="message-checkbox-cell"><input id="fx-message-select-all" type="checkbox" aria-label="勾选当前筛选的全部消息"></th><th>消息标题</th><th>内容摘要</th>${recipientHeader}<th>${fxMessageHeader(isCustomer ? "接收时间" : "发送时间", "time", isCustomer)}</th><th>${fxMessageHeader("消息类型", "type", isCustomer)}</th>${isCustomer ? "" : `<th>${fxMessageHeader("客户阅读状态", "read")}</th>`}</tr></thead><tbody>${rows.length ? rows.map(item => `<tr class="${item.unread ? "unread-row" : ""}"><td class="message-checkbox-cell"><input type="checkbox" data-message-select value="${item.id}" aria-label="勾选消息：${fxEscape(item.title)}" ${selected.has(Number(item.id)) ? "checked" : ""}></td><td><button class="message-link message-title-link ${isCustomer ? `message-title-with-state${item.unread ? "" : " is-read"}` : ""}" data-action="fx-read-message" data-id="${item.id}" title="${fxEscape(item.title)}" ${isCustomer ? `aria-label="${item.unread ? "未读" : "已读"}消息：${fxEscape(item.title)}"` : ""}>${isCustomer ? `<span class="message-state-icon ${item.unread ? "unread" : "read"}">${icon(item.unread ? "mail" : "mail-open", item.unread ? "✉" : "▱")}</span>` : ""}<span>${fxEscape(item.title)}</span></button></td><td><button class="message-link message-summary-link" data-action="fx-read-message" data-id="${item.id}" title="${fxEscape(item.detail)}">${fxEscape(item.detail)}</button></td>${recipientCell(item)}<td>${item.time}</td><td>${fxEscape(item.type)}</td>${isCustomer ? "" : `<td>${item.unread ? `<span class="unread-dot"></span>未读` : "已读"}</td>`}</tr>`).join("") : fxEmpty(tableColumns, "未找到匹配消息")}</tbody></table></div></section></div>`;
  };

  settingsPage = function (isCustomer = false) {
    const user = isCustomer ? fxCurrentCustomer() : fxCurrentOperator();
    return `<div class="page">${pageHeader("个人设置", isCustomer ? "客户账号安全设置" : "运营账号安全设置")}<div class="section-row"><section class="panel"><div class="panel-header"><h2>修改登录密码</h2></div><div class="panel-body"><div class="form-grid"><div class="field full"><label class="required">当前密码</label><input id="fx-current-password" type="password" placeholder="输入当前密码"></div><div class="field"><label class="required">新密码</label><input id="fx-new-password" type="password" placeholder="至少 8 位，包含字母与数字"></div><div class="field"><label class="required">确认新密码</label><input id="fx-confirm-password" type="password" placeholder="再次输入新密码"></div><div class="field full"><button class="button primary" data-action="fx-save-password">保存密码</button></div></div></div></section><aside class="panel"><div class="panel-header"><h2>当前账号</h2></div><div class="panel-body"><div class="list-item"><span class="avatar">${fxEscape(user.name.slice(0, 2))}</span><div class="list-content"><div class="list-title">${fxEscape(user.name)}</div><div class="list-meta">${fxEscape(user.account)} · ${fxEscape(user.status)}</div></div></div><p class="field-help">修改成功后将用于下一次登录验证。</p></div></aside></div></div>`;
  };

  function fxCustomerOrders() { return orders.filter(item => fxRecordBelongsToCustomer(item, fxCurrentCustomer()) && item.allocationStatus !== "已撤销"); }
  const fxBindRequests = bindRequests;
  function fxPendingBindRequest(orderNo, productId, batch) {
    return bindRequests.find(item => item.status === "待审批" && item.orderNo === orderNo && Number(item.productId) === Number(productId) && item.batch === batch);
  }
  function fxNextBindRequestNo() {
    const max = bindRequests.reduce((value, item) => Math.max(value, Number(String(item.no || "").split("-").pop()) || 0), 0);
    return `BR-202608-${String(max + 1).padStart(3, "0")}`;
  }
  function fxBindRequestLabel(statusValue) {
    return statusValue === "待审批" ? "待审批" : statusValue === "已通过" ? "已通过" : "已驳回";
  }
  function fxCustomerProductStatus(value) { return value; }
