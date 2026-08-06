"use strict";

function customerOrders() {
    const allRows = fxCustomerOrders(); let rows = allRows.filter(item => fxMatchesCustomerDate(item.createdAt || item.created, "order")); rows = fxSortedRows(rows, "customerOrder", item => item.createdAt || item.created);
    const body = rows.length ? rows.map(item => {
      const pendingRequests = fxOrderPendingRequests(item.no);
      const pendingAmount = fxOrderPendingAmount(item);
      const availableAmount = fxOrderAvailableAmount(item);
      const pendingCell = pendingRequests.length
        ? `<button class="text-action" data-action="fx-view-order-bind-requests" data-no="${fxEscape(item.no)}" aria-label="查看绑定申请中数量 ${formatNumber(pendingAmount)}">${formatNumber(pendingAmount)}</button>`
        : "0";
      const requestAction = availableAmount > 0
        ? `<button class="text-action" data-action="fx-customer-bind-order" data-no="${fxEscape(item.no)}">申请绑定产品</button>`
        : "";
      return `<tr class="${state.highlightOrderNo === item.no ? "order-focus-row" : ""}" data-order-no="${fxEscape(item.no)}"><td class="mono">${fxEscape(item.no)}</td><td>${fxEscape(item.createdAt || item.created || "—")}</td><td class="mono">${fxEscape(item.range)}</td><td>${formatNumber(item.total)}</td><td>${formatNumber(item.active)}</td><td>${pendingCell}</td><td>${formatNumber(availableAmount)}</td><td class="action-column"><div class="table-actions">${requestAction}<button class="text-action" data-action="fx-order-detail" data-no="${fxEscape(item.no)}">详情</button></div></td></tr>`;
    }).join("") : fxEmpty(8, "暂无订单");
    return `<div class="page">${pageHeader("订单台账", "查看订单码段与激活记录", `<button class="button" data-action="fx-export-customer-orders">${icon("download", "↓")}导出台账</button>`)}<div class="table-shell"><div class="table-scroll"><table><thead><tr><th>订单号</th><th>${fxCustomerDateHeader("创建时间", "order")}</th><th>序列号范围</th><th>${fxSortHeader("总量", "customerOrder", "total")}</th><th>${fxSortHeader("已激活", "customerOrder", "active")}</th><th>${fxSortHeader("绑定申请中", "customerOrder", "pending")}</th><th>${fxSortHeader("剩余可用", "customerOrder", "remaining")}</th><th class="action-column">操作</th></tr></thead><tbody>${body}</tbody></table></div>${pagination(rows.length)}</div></div>`;
  }
  customerOverview = function () {
    const ownOrders = fxCustomerOrders(); const recentOrders = [...ownOrders].sort((left, right) => String(right.createdAt || right.created || "").localeCompare(String(left.createdAt || left.created || ""))).slice(0, 6); const sortedOrders = fxSortedRows(recentOrders, "customerOrder"); const total = ownOrders.reduce((sum, item) => sum + item.total, 0); const active = ownOrders.reduce((sum, item) => sum + item.active, 0); const pending = ownOrders.reduce((sum, item) => sum + fxOrderPendingAmount(item), 0); const available = ownOrders.reduce((sum, item) => sum + fxOrderAvailableAmount(item), 0); const ownProducts = products.filter(item => item.company === fxCurrentCustomer().name); const productStatuses = ["待审核", "已激活", "草稿", "已退回"].map(value => ({ value, count: ownProducts.filter(item => fxCustomerProductStatus(item.status) === value).length })).filter(item => item.count > 0);
    return `<div class="page">${pageHeader("数据概览", fxEscape(fxCurrentCustomer().name))}${fxOverviewMetricStrip([{ label: "订单总量", value: ownOrders.length, note: `最近订单 ${ownOrders[0]?.created || "-"}`, icon: "receipt-text", nav: "orders" }, { label: "码段总量", value: formatNumber(total), note: `${ownOrders.length} 个连续码段`, icon: "qr-code", nav: "orders" }, { label: "已激活", value: formatNumber(active), note: total ? `${Math.round(active / total * 100)}%` : "0%", icon: "circle-check", up: true, action: "fx-customer-product-status", status: "已激活" }, { label: "绑定申请中", value: formatNumber(pending), note: "等待运营端审批", icon: "clock-3", nav: "orders" }, { label: "剩余可用", value: formatNumber(available), note: "未被申请占用", icon: "circle-dashed", nav: "orders" }])}<div class="section-row"><section class="panel"><div class="panel-header"><h2>最近订单</h2><button class="button small" data-nav="orders">查看全部</button></div><div class="table-scroll"><table><thead><tr><th>订单号</th><th>${fxSortHeader("总量", "customerOrder", "total")}</th><th>${fxSortHeader("已激活", "customerOrder", "active")}</th><th>${fxSortHeader("绑定申请中", "customerOrder", "pending")}</th><th>${fxSortHeader("剩余可用", "customerOrder", "remaining")}</th></tr></thead><tbody>${sortedOrders.map(item => `<tr class="clickable-table-row" data-action="fx-focus-customer-order" data-no="${fxEscape(item.no)}" tabindex="0" role="link" aria-label="在订单台账中查看订单 ${fxEscape(item.no)}"><td class="mono">${fxEscape(item.no)}</td><td>${formatNumber(item.total)}</td><td>${formatNumber(item.active)}</td><td>${formatNumber(fxOrderPendingAmount(item))}</td><td>${formatNumber(fxOrderAvailableAmount(item))}</td></tr>`).join("")}</tbody></table></div></section><section class="panel"><div class="panel-header"><h2>产品状态</h2></div><div class="panel-body list" data-sequence="off">${productStatuses.length ? productStatuses.map(item => `<button class="list-item list-button" data-action="fx-customer-product-status" data-status="${item.value}"><span class="list-icon">${icon(item.value === "已激活" ? "circle-check" : item.value === "待审核" ? "clock-3" : "file-pen-line", "·")}</span><div class="list-content"><div class="list-title">${item.value}</div><div class="list-meta">点击查看对应产品</div></div><strong>${item.count}</strong></button>`).join("") : `<div class="empty"><p>暂无产品</p></div>`}</div></section></div></div>`;
  };

  customerProducts = function () {
    const term = state.customerProductFilter.trim().toLowerCase(); let rows = products.filter(item => item.company === fxCurrentCustomer().name && (!term || `${item.name} ${item.batch}`.toLowerCase().includes(term)) && (state.customerProductCategory === "全部大类" || item.category === state.customerProductCategory) && (state.customerProductStatus === "全部状态" || fxCustomerProductStatus(item.status) === state.customerProductStatus) && fxMatchesCustomerDate(item.submitted, "product")); rows = fxSortedRows(rows, "customerProduct", item => item.submitted);
    return `<div class="page">${pageHeader("产品信息", "维护资料、生成预览码、提交审核并查看状态", `<button class="button primary" data-action="fx-new-product">${icon("plus", "+")}新建产品</button>`)}<div class="toolbar"><div class="filters">${fxFilterInput("fx-customer-product-search", state.customerProductFilter, "搜索产品名称或批次")}</div></div><div class="table-shell"><div class="table-scroll"><table class="customer-product-table"><thead><tr><th>产品名称</th><th>${fxTableSelectHeader("产品大类", "customerProductCategory", ["全部大类", "农产品", "养殖品", "加工食品", "工业品", "医疗卫生用品"], state.customerProductCategory)}</th><th>批次</th><th>${fxTableSelectHeader("状态", "customerProductStatus", ["全部状态", "草稿", "待审核", "已激活", "已退回"], state.customerProductStatus)}</th><th>${fxCustomerDateHeader("提交时间", "product")}</th><th>操作</th></tr></thead><tbody>${rows.length ? rows.map(item => `<tr><td><div class="cell-main">${fxEscape(item.name)}</div></td><td>${fxEscape(item.category)}</td><td class="mono">${fxEscape(item.batch)}</td><td>${status(fxCustomerProductStatus(item.status))}</td><td>${fxEscape(item.status === "草稿" ? "—" : item.submitted || "—")}</td><td><div class="table-actions"><button class="text-action" data-action="fx-edit-product" data-id="${item.id}">${item.status === "待审核" || item.status === "已激活" ? "查看" : "编辑"}</button><button class="text-action" data-action="fx-preview-product" data-id="${item.id}">预览码</button>${item.status === "待审核" ? `<button class="text-action" data-action="fx-withdraw-review-edit" data-id="${item.id}">撤回申请</button>` : ""}${item.status === "已激活" ? `<button class="text-action danger-text" data-action="fx-customer-withdraw" data-id="${item.id}">撤回产品</button>` : ""}</div></td></tr>`).join("") : fxEmpty(6, "未找到产品")}</tbody></table></div>${pagination(rows.length)}</div></div>`;
  };

  const fxBaseCustomerProducts = customerProducts;
  customerProducts = function () {
    let markup = fxBaseCustomerProducts();
    products.filter(item => item.company === fxCurrentCustomer().name && item.status === "草稿").forEach(item => {
      const previewAction = `<button class="text-action" data-action="fx-preview-product" data-id="${item.id}">预览码</button>`;
      const submitAction = `<button class="text-action success-text" data-action="fx-submit-product-row" data-id="${item.id}">提交审核</button>`;
      markup = markup.replace(previewAction, `${previewAction}${submitAction}`);
    });
    return markup;
  };

  function fxNewDraft() {
    return fxNormalizeDetails({ productName: "", brand: "", category: "农产品", subcategory: "", trademark: "", productImages: "", intro: "", specification: "", origin: "", batch: "", productionDate: "", shelfLife: "", storage: "", standard: "", companyName: fxCurrentCustomer().name, companyAddress: "", companyIntro: "", companyPhone: "", businessLicense: "", qualificationProof: "", productionEnvironment: "", productionUnit: "", productionAddress: "", productionSiteEnvironment: "", qualificationDocuments: "", process: "", equipment: "", productionLicense: "", productHonorCertificate: "", productCertificationCertificate: "", onSiteVerificationCertificate: "", productInspectionReport: "", trace: [], fieldMedia: { brand: [], trademark: [], productImages: [], businessLicense: [], qualificationProof: [], productionEnvironment: [], productionSiteEnvironment: [], qualificationDocuments: [], process: [], equipment: [], productionLicense: [], productHonorCertificate: [], productCertificationCertificate: [], onSiteVerificationCertificate: [], productInspectionReport: [] }, custom: { product: [], company: [], production: [], quality: [], trace: [] }, files: { product: [], company: [], production: [], quality: [], trace: [] } });
  }
  const fxStepKeys = ["product", "company", "production", "quality", "trace"];
  function fxEditorSteps() {
    return state.editorTargetOrderNo ? [...productSteps, "绑定设置"] : [...productSteps];
  }
  productStepper = function () {
    const steps = fxEditorSteps();
    return `<div class="stepper" style="grid-template-columns:repeat(${steps.length},minmax(0,1fr))">${steps.map((label, index) => `<button type="button" class="step ${state.productStep === index ? "active" : ""} ${state.productStep > index ? "done" : ""}" data-action="product-step" data-step="${index}"><span class="step-number">${state.productStep > index ? icon("check", "✓") : index + 1}</span><span class="step-label">${label}</span></button>`).join("")}</div>`;
  };
  function fxInitializeEditorBinding(product = null) {
    const order = orders.find(item => item.no === state.editorTargetOrderNo);
    if (!order) {
      state.editorRequestedSourceRange = "";
      state.editorRequestedRange = "";
      state.editorRequestedAmount = 0;
      return;
    }
    const excludeProductId = product?.id || state.editorProductId;
    const ranges = fxOrderFreeRanges(order, excludeProductId);
    const storedRange = state.editorRequestedRange || product?.requestedRange;
    const storedSource = state.editorRequestedSourceRange || product?.requestedSourceRange;
    const source = ranges.find(item => item.range === storedSource) || ranges.find(item => {
      const [requestedStart, requestedEnd] = String(storedRange || "").split("–");
      return requestedStart && requestedEnd && fxCodeInRange(requestedStart, item.range) && fxCodeInRange(requestedEnd, item.range);
    }) || ranges[0];
    const maximum = source ? Math.min(source.amount, fxOrderAvailableAmount(order, excludeProductId)) : 0;
    const storedAmount = Number(state.editorRequestedAmount || product?.requestedAmount || 0);
    const amount = maximum ? Math.max(1, Math.min(storedAmount || Math.min(1000, maximum), maximum)) : 0;
    state.editorRequestedSourceRange = source?.range || "";
    state.editorRequestedAmount = amount;
    state.editorRequestedRange = source ? fxRequestedRange(source.range, amount) : "";
  }
  function fxBindingSettingsPanel() {
    const order = orders.find(item => item.no === state.editorTargetOrderNo);
    if (!order) return `<div class="empty"><div><h3>目标订单不可用</h3><p>请返回订单台账重新发起组合申请。</p></div></div>`;
    const product = products.find(item => item.id === state.editorProductId);
    if (!state.editorRequestedSourceRange || !state.editorRequestedAmount) fxInitializeEditorBinding(product);
    const ranges = fxOrderFreeRanges(order, product?.id || state.editorProductId);
    const selected = ranges.find(item => item.range === state.editorRequestedSourceRange);
    const availableAmount = fxOrderAvailableAmount(order, product?.id || state.editorProductId);
    const maximum = selected ? Math.min(selected.amount, availableAmount) : 0;
    const readonly = state.editorReadonly || state.editorOwner === "ops";
    const rangeHelp = selected ? `可用码段区间 ${selected.range} · 可选 ${formatNumber(maximum)} 枚` : "暂无连续可用码段";
    return `<div class="binding-settings"><div class="form-grid"><div class="field full"><label class="required" for="fx-editor-bind-amount">申请绑定数量</label><input id="fx-editor-bind-amount" type="number" min="1" max="${maximum}" step="1" value="${state.editorRequestedAmount || ""}" ${readonly ? "disabled" : ""}><span id="fx-editor-range-help" class="field-help">${fxEscape(rangeHelp)}</span></div><div class="field full"><label for="fx-editor-bind-range-preview">本次申请码段</label><input id="fx-editor-bind-range-preview" class="mono immutable-input" value="${fxEscape(state.editorRequestedRange || "暂无可用码段")}" readonly aria-readonly="true"></div></div></div>`;
  }
  function fxSyncEditorBindingPreview() {
    const range = fxRequestedRange(state.editorRequestedSourceRange, Number(state.editorRequestedAmount));
    state.editorRequestedRange = range;
    const input = document.getElementById("fx-editor-bind-range-preview");
    if (input) input.value = range || "请输入有效数量";
  }
  function fxSyncCustomerBindRangePreview() {
    const order = orders.find(item => item.no === state.selectedOrderNo);
    const amount = Number(document.getElementById("fx-customer-bind-amount")?.value || 0);
    const range = order ? fxActivationRange(order, amount) : "";
    const preview = document.getElementById("fx-customer-bind-range-preview");
    if (preview) preview.value = range || "暂无可分配码段";
  }
  function fxSyncActivationRangePreview() {
    const order = orders.find(item => item.no === document.getElementById("fx-activation-order")?.value);
    const amount = Number(document.getElementById("fx-activation-amount")?.value || 0);
    const product = products.find(item => item.id === state.drawerProductId);
    const range = order ? fxReviewActivationRange(order, amount, product) : "";
    const preview = document.getElementById("fx-activation-range-preview");
    if (preview) preview.value = range || "暂无可分配码段";
  }
  function fxStandardFieldMediaRows(module, field) {
    const files = state.editorDraft?.fieldMedia?.[field.mediaKey] || [];
    const previews = files.map((file, fileIndex) => `<div class="editor-inline-media-item" ${state.editorReadonly ? "" : `draggable="true"`} data-fx-media-module="${module}" data-fx-media-field="${field.mediaKey}" data-fx-media-index="${fileIndex}">${fxScanMediaItem(file, module)}${state.editorReadonly ? "" : `<button type="button" class="icon-button custom-field-file-remove" data-action="fx-remove-standard-file" data-media-key="${field.mediaKey}" data-file-index="${fileIndex}" aria-label="删除${fxEscape(fxFileName(file))}" title="删除图片">${icon("x", "×")}</button>`}</div>`).join("");
    const acceptsPdf = field.mediaTypes?.includes("pdf"); const accept = acceptsPdf ? "image/*,.pdf" : "image/*"; const noun = acceptsPdf ? "图片/PDF" : "图片";
    const limit = fxStandardMediaLimit(field.mediaKey); const limitReached = files.length >= limit; const disabled = limitReached ? "disabled" : ""; const disabledClass = limitReached ? " is-disabled" : ""; const multiple = limit > 1 ? "multiple" : "";
    const upload = state.editorReadonly ? "" : `<label class="button custom-field-upload${disabledClass}" aria-disabled="${limitReached}">${icon(acceptsPdf ? "paperclip" : "image-plus", "+")}${limitReached ? "已达上传上限" : `选择${noun}`}<input type="file" data-fx-standard-upload="${field.mediaKey}" data-fx-standard-types="${acceptsPdf ? "image,pdf" : "image"}" accept="${accept}" ${multiple} ${disabled}></label>`;
    const append = state.editorReadonly ? "" : `<label class="editor-inline-media-add${disabledClass}" aria-disabled="${limitReached}">${icon("plus", "+")}<span>${limitReached ? "已达上限" : "添加"}</span><input type="file" data-fx-standard-upload="${field.mediaKey}" data-fx-standard-types="${acceptsPdf ? "image,pdf" : "image"}" accept="${accept}" ${multiple} ${disabled}></label>`;
    const limitText = limit === 1 ? "最多上传 1 个文件" : acceptsPdf ? "图片与 PDF 合计最多上传 10 个" : "最多上传 10 张图片";
    if (state.editorReadonly && !files.length) return "";
    return `<div class="custom-field-files standard-field-media" aria-label="${fxEscape(field.mediaLabel || `${field.label}${noun}`)}">${files.length ? `<div class="scan-media-list editor-inline-media-list">${previews}${append}</div>` : `${upload}<div class="custom-field-file-empty">尚未添加${noun}</div>`}${state.editorReadonly ? "" : `<div class="field-help custom-field-file-limit">${limitText}，已上传 ${files.length} 个</div>`}</div>`;
  }
  function fxStandardFieldControl(field, module) {
    const value = state.editorDraft?.[field.key] || ""; const disabled = state.editorReadonly ? "disabled" : "";
    const control = field.type === "select"
      ? `<select data-fx-field="${field.key}" ${disabled}>${field.options.map(option => `<option ${value === option ? "selected" : ""}>${option}</option>`).join("")}</select>`
      : field.type === "textarea"
        ? `<textarea data-fx-field="${field.key}" ${disabled}>${fxEscape(value)}</textarea>`
        : `<input data-fx-field="${field.key}" type="${field.type || "text"}" value="${fxEscape(value)}" ${disabled}>`;
    const textControl = field.mediaOnly || (state.editorReadonly && !value) ? "" : `<div class="standard-field-text">${control}</div>`;
    return field.mediaKey ? `<div class="standard-field-mixed">${textControl}${fxStandardFieldMediaRows(module, field)}</div>` : control;
  }
  function fxCustomFileRows(module, row, rowIndex, nameReady = true) {
    const files = row.files || [];
    const previews = files.map((file, fileIndex) => `<div class="editor-inline-media-item" ${state.editorReadonly ? "" : `draggable="true"`} data-fx-media-module="${module}" data-fx-media-row="${rowIndex}" data-fx-media-index="${fileIndex}">${fxScanMediaItem(file, module)}${state.editorReadonly ? "" : `<button type="button" class="icon-button custom-field-file-remove" data-action="fx-remove-custom-file" data-module="${module}" data-index="${rowIndex}" data-file-index="${fileIndex}" aria-label="删除${fxEscape(fxFileName(file))}" title="删除附件">${icon("x", "×")}</button>`}</div>`).join("");
    const limitReached = files.length >= fxCustomMediaLimit; const uploadDisabled = !nameReady || limitReached; const disabled = uploadDisabled ? "disabled" : ""; const disabledClass = uploadDisabled ? " is-disabled" : "";
    const upload = state.editorReadonly ? "" : `<label class="button custom-field-upload${disabledClass}" aria-disabled="${uploadDisabled}">${icon("paperclip", "□")}${limitReached ? "已达上传上限" : "选择图片/附件"}<input type="file" data-fx-custom-upload="${module}:${rowIndex}" accept="image/*,.pdf" multiple ${disabled}></label>`;
    const append = state.editorReadonly ? "" : `<label class="editor-inline-media-add${disabledClass}" aria-disabled="${uploadDisabled}">${icon("plus", "+")}<span>${limitReached ? "已达上限" : "添加"}</span><input type="file" data-fx-custom-upload="${module}:${rowIndex}" accept="image/*,.pdf" multiple ${disabled}></label>`;
    if (state.editorReadonly && !files.length) return "";
    return `<div class="custom-field-files">${files.length ? `<div class="scan-media-list editor-inline-media-list">${previews}${append}</div>` : `${upload}<div class="custom-field-file-empty">${nameReady ? "尚未添加图片或附件" : "填写字段名称后可添加图片或附件"}</div>`}${state.editorReadonly ? "" : `<div class="field-help custom-field-file-limit">图片与 PDF 合计最多上传 ${fxCustomMediaLimit} 个，已上传 ${files.length} 个</div>`}</div>`;
  }
  function fxDateTimeInputValue(value) {
    const normalized = String(value || "").trim().replace(" ", "T");
    return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? `${normalized}T00:00` : normalized.slice(0, 16);
  }
  function fxEditorFieldRow(module, token) {
    const readonly = state.editorReadonly; const drag = readonly ? "disabled" : `draggable="true"`;
    const handle = `<button type="button" class="editor-drag-handle" ${drag} aria-label="拖动调整字段顺序" title="拖动调整顺序">${icon("grip-vertical", "⋮")}</button>`;
    if (token.startsWith("field:")) {
      const field = (fxStandardFieldDefs[module] || []).find(item => item.key === token.slice(6)); if (!field) return "";
      return `<div class="editor-field-row ${field.mediaKey ? "is-file-field has-standard-media" : ""}" data-fx-field-row="${token}" data-module="${module}">${handle}<div class="editor-field-name ${field.required ? "required" : ""}">${field.label}</div><div class="editor-field-content">${fxStandardFieldControl(field, module)}</div><span></span></div>`;
    }
    if (token.startsWith("custom:")) {
      const index = state.editorDraft.custom[module].findIndex(item => item.id === token.slice(7)); const row = state.editorDraft.custom[module][index]; if (!row) return "";
      const nameReady = Boolean(String(row.name || "").trim()); const contentDisabled = readonly || !nameReady ? "disabled" : "";
      const textControl = readonly && !String(row.value || "").trim() ? "" : `<div class="custom-field-text"><input data-fx-custom-value="${module}:${index}" value="${fxEscape(row.value)}" placeholder="${nameReady ? "字段文字内容" : "请先填写字段名称"}" ${contentDisabled}></div>`;
      const content = `<div class="custom-field-mixed">${textControl}${fxCustomFileRows(module, row, index, nameReady)}</div>`;
      return `<div class="editor-field-row is-custom is-file-field ${nameReady ? "" : "needs-name"}" data-fx-field-row="${token}" data-module="${module}">${handle}<div class="editor-field-name custom-field-name required"><input data-fx-custom-name="${module}:${index}" value="${fxEscape(row.name)}" placeholder="字段名称" aria-label="字段名称（必填）" required ${readonly ? "disabled" : ""}></div><div class="editor-field-content">${content}</div>${readonly ? "<span></span>" : `<button class="icon-button" data-action="fx-remove-custom" data-module="${module}" data-index="${index}" title="删除字段">${icon("trash-2", "×")}</button>`}</div>`;
    }
    if (token === "trace:timeline") {
      const traceRows = state.editorDraft.trace.map((row, index) => ({ row, index })).filter(({ row }) => !readonly || String(row.date || "").trim() || String(row.content || "").trim()).sort((a, b) => String(a.row.date || "").localeCompare(String(b.row.date || "")));
      const nodes = traceRows.map(({ row, index }, displayIndex) => {
        const dateControl = !readonly || String(row.date || "").trim() ? `<input type="datetime-local" data-fx-trace-date="${index}" value="${fxEscape(fxDateTimeInputValue(row.date))}" aria-label="时间节点 ${displayIndex + 1}" ${readonly ? "disabled" : ""}>` : "";
        const contentControl = !readonly || String(row.content || "").trim() ? `<input data-fx-trace-content="${index}" value="${fxEscape(row.content)}" placeholder="填写该时间节点的追溯内容" aria-label="节点内容 ${displayIndex + 1}" ${readonly ? "disabled" : ""}>` : "";
        return `<div class="trace-edit-row">${dateControl}${contentControl}${readonly ? "<span></span>" : `<button type="button" class="icon-button" data-action="fx-remove-trace" data-index="${index}" aria-label="删除时间节点 ${displayIndex + 1}" title="删除时间节点">${icon("trash-2", "×")}</button>`}</div>`;
      }).join("");
      const addNode = readonly ? "" : `<button type="button" class="button small trace-node-add" data-action="fx-add-trace">${icon("plus", "+")}添加时间节点</button>`;
      return `<div class="editor-field-row is-trace" data-fx-field-row="${token}" data-module="${module}">${handle}<div class="editor-field-name">追溯记录</div><div class="editor-field-content trace-field-content"><div class="trace-node-list">${nodes || `<div class="trace-node-empty">暂未添加时间节点</div>`}</div>${addNode}</div><span></span></div>`;
    }
    return "";
  }
  function fxEditorTokenHasContent(module, token) {
    if (token.startsWith("field:")) {
      const field = (fxStandardFieldDefs[module] || []).find(item => item.key === token.slice(6));
      if (!field) return false;
      const value = String(state.editorDraft?.[field.key] || "").trim();
      const files = field.mediaKey ? state.editorDraft?.fieldMedia?.[field.mediaKey] || [] : [];
      return Boolean(value || files.length);
    }
    if (token.startsWith("custom:")) {
      const row = state.editorDraft?.custom?.[module]?.find(item => item.id === token.slice(7));
      return Boolean(String(row?.name || "").trim() && (String(row?.value || "").trim() || row?.files?.length));
    }
    if (token === "trace:timeline") return Boolean(state.editorDraft?.trace?.some(row => String(row?.date || "").trim() || String(row?.content || "").trim()));
    return false;
  }
  productForm = function () {
    if (!state.editorDraft) state.editorDraft = fxNewDraft(); fxNormalizeDetails(state.editorDraft);
    if (state.editorTargetOrderNo && state.productStep === fxEditorSteps().length - 1) return fxBindingSettingsPanel();
    const module = fxStepKeys[state.productStep]; const order = state.editorDraft.fieldOrder[module] || [];
    const reviewReadonly = state.editorReadonly && state.editorOwner === "ops";
    const visibleOrder = state.editorReadonly ? order.filter(token => fxEditorTokenHasContent(module, token)) : order;
    const addField = state.editorReadonly ? "" : `<div class="editor-add-field-footer"><button type="button" class="editor-add-field-trigger" data-action="fx-add-custom" data-module="${module}">${icon("plus", "+")}新增字段</button></div>`;
    const fieldSummary = reviewReadonly ? "" : state.editorReadonly ? "客户提交字段及展示顺序" : "拖动左侧手柄调整小程序展示顺序";
    return `<div class="editor-fields"><div class="editor-fields-toolbar"><div><strong>字段内容</strong>${fieldSummary ? `<span>${fieldSummary}</span>` : ""}</div></div><div class="editor-fields-head"><span></span><span>字段名</span><span>字段内容</span><span></span></div><div class="editor-field-list" data-module="${module}">${visibleOrder.map(token => fxEditorFieldRow(module, token)).join("") || `<div class="editor-fields-empty">当前模块暂无已填写字段</div>`}</div>${addField}</div>`;
  };

  function fxEditorWorkspace() {
    const steps = fxEditorSteps();
    const targetOrder = orders.find(item => item.no === state.editorTargetOrderNo);
    const orderContext = targetOrder ? `<div class="editor-order-context">${icon("link", "·")}<div><strong>新建产品并绑定至订单 ${fxEscape(targetOrder.no)}</strong><span>在“绑定设置”中选择连续码段并填写数量，提交后码量将计入绑定申请中。</span></div>${state.editorReadonly || state.editorOwner === "ops" ? "" : `<button class="text-action" data-action="fx-clear-editor-order">取消组合申请</button>`}</div>` : "";
    const previousModuleAction = state.productStep > 0 ? `<button class="button" data-action="product-prev">上一步</button>` : "";
    const nextModuleAction = state.productStep < steps.length - 1 ? `<button class="button primary" data-action="fx-editor-next">继续</button>` : "";
    return `${orderContext}${productStepper()}<div class="editor-layout"><section class="form-section"><h2>${steps[state.productStep]}</h2>${productForm()}</section><aside class="panel sticky-side"><div class="panel-header"><h2>模块进度</h2><strong>${state.productStep + 1} / ${steps.length}</strong></div><div class="panel-body"><div class="check-list">${steps.map((label, index) => `<div class="check-row ${index <= state.productStep ? "done" : ""}">${icon(index <= state.productStep ? "circle-check" : "circle", index <= state.productStep ? "✓" : "○")}<span>${label}</span></div>`).join("")}</div></div><div class="drawer-foot">${previousModuleAction}${nextModuleAction}</div></aside></div>`;
  }

  customerEditor = function () {
    const combined = Boolean(state.editorTargetOrderNo);
    const title = combined ? (state.editorReadonly ? "查看产品与绑定申请" : "新建产品并申请绑定") : (state.editorReadonly ? "查看产品" : "编辑产品");
    const backAction = `<button class="button" data-action="fx-back-customer-products">${icon("arrow-left", "←")}返回</button>`;
    const actions = state.editorReadonly ? `${backAction}<span class="save-state">提交后只读</span><button class="button" data-action="fx-preview-current">${icon("qr-code", "▦")}预览码</button>` : `${backAction}<span class="save-state">本地草稿</span><button class="button" data-action="fx-save-draft">保存草稿</button><button class="button" data-action="fx-preview-current">${icon("qr-code", "▦")}预览码</button>${state.editorOwner === "customer" ? `<button class="button primary" data-action="fx-open-submit">提交审核</button>` : `<button class="button primary" data-action="fx-save-ops-product">保存修改</button>`}`;
    return `<div class="page">${pageHeader(title, "已填写字段会展示在扫码端；空字段自动隐藏。", actions)}${fxEditorWorkspace()}</div>`;
  };

  customerWithdrawals = function () {
    const rows = fxNewestRows(withdrawals.filter(item => item.customer === fxCurrentCustomer().name && (state.customerWithdrawalStatus === "全部状态" || item.status === state.customerWithdrawalStatus) && fxMatchesCustomerDate(item.time, "withdrawal")), item => item.time);
    return `<div class="page">${pageHeader("撤回申请", "可对已激活产品的一个或多个已绑码段发起撤回", `<button class="button primary" data-action="fx-open-withdraw">${icon("plus", "+")}发起申请</button>`)}<div class="table-shell"><div class="table-scroll"><table><thead><tr><th>申请编号</th><th>产品名称</th><th>产品批次</th><th>撤回码段</th><th>撤回原因</th><th>${fxCustomerDateHeader("申请时间", "withdrawal")}</th><th>${fxTableSelectHeader("申请状态", "customerWithdrawalStatus", ["全部状态", "待审批", "已通过", "已驳回"], state.customerWithdrawalStatus)}</th><th>处理说明</th></tr></thead><tbody>${rows.length ? rows.map(item => { const product = products.find(row => row.name === item.product && row.company === item.customer && (!item.batch || row.batch === item.batch)); const rangeSummary = fxWithdrawalRangeSummary(item); return `<tr><td class="mono">${fxEscape(item.no)}</td><td>${fxEscape(item.product)}</td><td class="mono">${fxEscape(item.batch || product?.batch || "—")}</td><td><div class="cell-main mono" title="${fxEscape(fxWithdrawalSegments(item).map(segment => segment.range).filter(Boolean).join("、") || rangeSummary)}">${fxEscape(rangeSummary)}</div></td><td>${fxEscape(item.reason)}</td><td>${fxEscape(item.time)}</td><td>${status(item.status)}</td><td>${fxEscape(item.rejectReason || (item.status === "已通过" ? (item.scope === "segments" ? "已选码段已重置" : "全部关联码已重置") : "等待运营方审批"))}</td></tr>`; }).join("") : fxEmpty(8, "暂无撤回申请")}</tbody></table></div>${pagination(rows.length)}</div></div>`;
  };

  function fxCustomerDetailPage() {
    const item = customers.find(row => row.id === state.selectedCustomerId);
    if (!item) {
      return `<div class="page">${pageHeader("客户详情", "", `<button class="button" data-action="fx-back-customers">${icon("arrow-left", "←")}返回客户列表</button>`)}<div class="empty"><div><div class="empty-icon">${icon("user-round-x", "×")}</div><h3>客户账号不存在</h3></div></div></div>`;
    }
    const ownOrders = fxNewestRows(orders.filter(order => order.customer === item.name), order => order.createdAt || order.created);
    const activeProducts = products.filter(product => product.company === item.name && product.status === "已激活");
    const orderRows = ownOrders.map(order => {
      const pendingRequests = fxOrderPendingRequests(order.no);
      const pending = fxOrderPendingAmount(order);
      const remaining = fxOrderAvailableAmount(order);
      const pendingCell = pendingRequests.length ? `<button class="text-action" data-action="fx-view-order-bind-requests" data-no="${fxEscape(order.no)}" aria-label="查看绑定申请中数量 ${formatNumber(pending)}">${formatNumber(pending)}</button>` : "0";
      return `<tr><td><button class="text-action mono" data-action="fx-focus-order" data-no="${fxEscape(order.no)}">${fxEscape(order.no)}</button></td><td>${fxEscape(order.createdAt || order.created || "—")}</td><td>${formatNumber(order.total)}</td><td>${formatNumber(order.active)}</td><td>${pendingCell}</td><td>${formatNumber(remaining)}</td><td class="action-column"><div class="table-actions">${remaining > 0 ? `<button class="text-action" data-action="fx-ops-bind-order" data-no="${fxEscape(order.no)}">绑定产品</button>` : "—"}</div></td></tr>`;
    }).join("") || `<tr><td colspan="7">暂无订单</td></tr>`;
    const actions = `<button class="button" data-action="fx-back-customers">${icon("arrow-left", "←")}返回客户列表</button>${item.status === "启用" ? `<button class="button primary" data-action="fx-customer-create-order" data-id="${item.id}">${icon("qr-code", "▦")}创建订单</button>` : ""}`;
    return `<div class="page customer-detail-page">${pageHeader("客户详情", "", actions)}<section class="detail-section"><h3>客户完整资料</h3><dl class="detail-grid"><div class="detail-item"><dt>客户名称</dt><dd>${fxEscape(item.name)}</dd></div><div class="detail-item"><dt>登录账号</dt><dd class="mono">${fxEscape(item.account)}</dd></div><div class="detail-item"><dt>联系电话</dt><dd>${fxEscape(item.phone)}</dd></div><div class="detail-item"><dt>账号状态</dt><dd>${status(item.status)}</dd></div><div class="detail-item"><dt>营业执照</dt><dd>${fxEscape(fxFileName(item.license) || "未上传")}</dd></div><div class="detail-item"><dt>法人身份证</dt><dd>${fxEscape(fxFileName(item.legalId) || "未上传")}</dd></div><div class="detail-item"><button type="button" class="detail-item-button" data-action="fx-view-customer-products" data-customer="${fxEscape(item.name)}"><span>已激活产品</span><strong>${formatNumber(activeProducts.length)}</strong></button></div></dl></section><section class="detail-section"><div class="detail-title-row"><h3>全部订单</h3></div><div class="table-scroll"><table><thead><tr><th>订单号</th><th>创建时间</th><th>总量</th><th>已激活</th><th>绑定申请中</th><th>剩余可用</th><th class="action-column">操作</th></tr></thead><tbody>${orderRows}</tbody></table></div></section></div>`;
  }

  renderOps = function () {
    const pages = { operators: fxOpsOperators, customers: opsCustomers, "customer-detail": fxCustomerDetailPage, codes: opsCodes, orders: opsOrders, "order-detail": fxOrderDetailPage, "bind-requests": opsBindRequests, reviews: opsReviews, "review-detail": fxReviewDetailPage, withdrawals: opsWithdrawals, messages: () => messagesPage(false), settings: () => settingsPage(false) };
    return shell("ops", pages[state.opsPage] ? pages[state.opsPage]() : opsOrders());
  };
  renderCustomer = function () {
    const pages = { overview: customerOverview, orders: customerOrders, "order-detail": fxOrderDetailPage, products: customerProducts, editor: customerEditor, withdrawals: customerWithdrawals, messages: () => messagesPage(true), settings: () => settingsPage(true) };
    return shell("customer", pages[state.customerPage] ? pages[state.customerPage]() : customerOverview());
  };

  function fxReviewDetailPage() {
    const product = products.find(item => item.id === state.drawerProductId);
    if (!product) return `<div class="page">${pageHeader("产品审核详情", "", `<button class="button" data-action="fx-back-reviews">${icon("arrow-left", "←")}返回</button>`)}<div class="empty"><div><div class="empty-icon">${icon("package-x", "×")}</div><h3>产品记录不存在</h3></div></div></div>`;
    if (state.editorOwner !== "ops" || state.editorProductId !== product.id || !state.editorDraft) {
      state.editorProductId = product.id;
      state.editorDraft = fxNormalizeDetails(fxClone(product.details || fxDefaultDetails(product)));
      state.editorOwner = "ops";
      state.editorTargetOrderNo = null;
      state.editorRequestedSourceRange = product.requestedSourceRange || "";
      state.editorRequestedRange = product.requestedRange || "";
      state.editorRequestedAmount = Number(product.requestedAmount || 0);
      fxInitializeEditorBinding(product);
      state.editorAddingField = null;
      state.productStep = Math.min(fxEditorSteps().length - 1, Math.max(0, Number(state.productStep) || 0));
    }
    const editing = Boolean(state.reviewEditing);
    state.editorReadonly = !editing;
    const actions = editing
      ? `<button class="button" data-action="fx-cancel-ops-edit">${icon("arrow-left", "←")}取消编辑</button><button class="button" data-action="fx-preview-current">${icon("qr-code", "▦")}预览码</button><button class="button primary" data-action="fx-save-ops-product">保存修改</button>`
      : `<button class="button" data-action="fx-back-reviews">${icon("arrow-left", "←")}返回</button><button class="button" data-action="fx-preview-current">${icon("qr-code", "▦")}预览码</button>${["待审核", "已激活"].includes(product.status) ? `<button class="button" data-action="fx-ops-edit-product" data-id="${product.id}">编辑材料</button>` : ""}${product.status === "待审核" ? `<button class="button danger" data-action="fx-open-reject" data-id="${product.id}">驳回</button><button class="button primary" data-action="fx-open-activation" data-id="${product.id}">通过并激活</button>` : ""}`;
    const body = `${fxEditorWorkspace()}${product.rejectionReason ? `<section class="detail-section danger-panel"><h3>驳回原因</h3><p>${fxEscape(product.rejectionReason)}</p></section>` : ""}`;
    return `<div class="page review-detail-page">${pageHeader("产品审核详情", "", actions)}<div class="review-detail-content">${body}</div></div>`;
  }

  drawerMarkup = function () { return ""; };

  function fxOrderDetailPage() {
    const order = orders.find(item => item.no === state.selectedOrderNo);
    const canView = order && (state.portal === "ops" || order.customer === fxCurrentCustomer().name);
    const backAction = `<button class="button" data-action="fx-back-orders">${icon("arrow-left", "←")}返回订单台账</button>`;
    if (!canView) return `<div class="page order-detail-page">${pageHeader("订单详情", "", backAction)}<div class="empty"><div><div class="empty-icon">${icon("receipt-text", "·")}</div><h3>订单记录不存在</h3><p>请返回订单台账重新选择订单。</p></div></div></div>`;
    const pendingAmount = fxOrderPendingAmount(order);
    const availableAmount = fxOrderAvailableAmount(order);
    const activations = fxNewestRows(order.activations || [], item => item.time);
    const rows = activations.length ? activations.map((row, index) => `<tr><td class="sequence-cell">${index + 1}</td><td class="mono">${fxEscape(row.range || row.batch || "—")}</td><td>${row.product ? `<button class="text-action" data-action="fx-open-activation-product" data-product="${fxEscape(row.product)}">${fxEscape(row.product)}</button>` : "—"}</td><td>${fxEscape(products.find(product => product.name === row.product)?.batch || "—")}</td><td>${formatNumber(row.amount)}</td><td>${fxEscape(row.time || "—")}</td><td>${fxEscape(row.operator || "—")}</td><td>${row.status === "已重置" && row.withdrawalNo ? `<button class="text-action" data-action="fx-view-activation-withdrawal" data-withdrawal-no="${fxEscape(row.withdrawalNo)}">已重置</button>` : status(row.status || "有效")}</td><td>${fxEscape(row.resetTime || "—")}</td></tr>`).join("") : `<tr><td colspan="9">暂无激活记录</td></tr>`;
    const bindAction = availableAmount > 0 ? state.portal === "customer"
      ? `<button class="button primary" data-action="fx-customer-bind-order" data-no="${fxEscape(order.no)}">申请绑定产品</button>`
      : `<button class="button primary" data-action="fx-ops-bind-order" data-no="${fxEscape(order.no)}">绑定产品</button>` : "";
    const actions = `${backAction}${bindAction}`;
    return `<div class="page order-detail-page">${pageHeader("订单详情", "", actions)}<section class="detail-section"><h3>订单信息</h3><dl class="detail-grid"><div class="detail-item"><dt>订单号</dt><dd class="mono">${fxEscape(order.no)}</dd></div><div class="detail-item"><dt>客户名称</dt><dd>${fxEscape(order.customer)}</dd></div><div class="detail-item"><dt>创建时间</dt><dd>${fxEscape(order.createdAt || order.created || "—")}</dd></div><div class="detail-item"><dt>序列号范围</dt><dd class="mono">${fxEscape(order.range)}</dd></div><div class="detail-item"><dt>订单码量</dt><dd>${formatNumber(order.total)}</dd></div><div class="detail-item"><dt>已激活</dt><dd>${formatNumber(order.active)}</dd></div><div class="detail-item"><dt>绑定申请中</dt><dd>${formatNumber(pendingAmount)}</dd></div><div class="detail-item"><dt>剩余可用</dt><dd>${formatNumber(availableAmount)}</dd></div><div class="detail-item"><dt>订单备注</dt><dd class="order-note-detail">${fxEscape(order.note || "—")}</dd></div></dl></section><section class="detail-section"><div class="detail-title-row"><h3>激活记录</h3></div><div class="table-shell"><div class="table-scroll"><table data-sequence="off"><thead><tr><th class="sequence-col">序号</th><th>激活码段</th><th>关联产品</th><th>产品批次</th><th>数量</th><th>激活时间</th><th>激活操作人</th><th>当前状态</th><th>重置时间</th></tr></thead><tbody>${rows}</tbody></table></div></div></section></div>`;
  }

  function fxCustomerFileField(id, label, item, key) {
    const storedFile = item?.[key];
    const fileName = storedFile && (typeof storedFile === "string" ? storedFile.trim() : storedFile.name) ? fxFileName(storedFile) : "";
    const helpId = `${id}-help`;
    const content = `<div class="attachment-existing ${fileName ? "" : "is-empty"}"><span class="attachment-existing-name">${icon(fileName ? "file-check-2" : "file-plus-2", fileName ? "✓" : "+")}${fxEscape(fileName || "尚未选择")}</span><button type="button" class="button small" data-action="fx-replace-customer-file" data-target="${id}">${fileName ? "更换" : "选择文件"}</button></div><input id="${id}" class="file-input-hidden" type="file" accept="image/*,.pdf" aria-describedby="${helpId}">`;
    return `<div class="field"><label class="required">${label}</label>${content}<span id="${helpId}" class="field-help">支持图片或 PDF，单个文件不超过 10 MB</span></div>`;
  }
  function fxModalShell(title, subtitle, body, foot, wide = false) { return `<div class="modal-backdrop"><section class="modal ${wide ? "modal-wide" : ""}" role="dialog" aria-modal="true" aria-label="${fxEscape(title)}"><div class="modal-head"><div><h2>${fxEscape(title)}</h2>${subtitle ? `<p>${fxEscape(subtitle)}</p>` : ""}</div><button class="icon-button" data-action="close-modal">${icon("x", "×")}</button></div><div class="modal-body">${body}</div><div class="modal-foot">${foot}</div></section></div>`; }
  modalMarkup = function () {
    if (!state.modal) return "";
    if (state.modal === "fx-order-bind-requests") {
      const requests = fxOrderPendingRequests(state.selectedOrderNo);
      const order = orders.find(item => item.no === state.selectedOrderNo);
      const rows = requests.length
        ? requests.map(request => { const range = request.range || (order ? fxActivationRange(order, request.amount, null, request.id) : ""); return `<tr><td>${request.source === "product-review" ? "新建产品并绑定" : "已有产品绑定"}</td><td>${fxEscape(request.product)}</td><td class="mono">${fxEscape(request.batch || "—")}</td><td class="mono">${fxEscape(range || "—")}</td><td>${formatNumber(request.amount)}</td><td>${fxEscape(request.time || "—")}</td><td class="action-column"><button class="text-action" data-action="${request.source === "product-review" ? "fx-open-combined-product" : "fx-view-bind-request"}" data-id="${request.source === "product-review" ? request.productId : request.id}">${state.portal === "ops" && request.source === "product-review" ? "审核" : "详情"}</button></td></tr>`; }).join("")
        : `<tr><td colspan="7">当前订单暂无待审批绑定申请</td></tr>`;
      const body = `<div class="table-scroll"><table data-sequence="off"><thead><tr><th>申请类型</th><th>产品名称</th><th>产品批次</th><th>申请码段</th><th>申请数量</th><th>申请时间</th><th class="action-column">操作</th></tr></thead><tbody>${rows}</tbody></table></div>`;
      return fxModalShell("绑定申请中明细", state.selectedOrderNo || "", body, `<button class="button primary" data-action="close-modal">关闭</button>`, true);
    }
    if (state.modal === "fx-bind-request-detail") {
      const request = bindRequests.find(item => item.id === state.selectedBindRequestId);
      if (!request) return "";
      const order = orders.find(item => item.no === request.orderNo);
      const requestedRange = request.range || (order ? fxActivationRange(order, request.amount, null, request.id) : "");
      const result = request.status === "已驳回" ? request.rejectReason : request.decisionNote;
      return fxModalShell("绑定申请详情", "", `<div class="confirm-list"><div class="confirm-row"><span>申请时间</span><strong>${fxEscape(request.time || "—")}</strong></div><div class="confirm-row"><span>申请状态</span><strong>${status(request.status)}</strong></div><div class="confirm-row"><span>客户名称</span><strong>${fxEscape(request.customer)}</strong></div><div class="confirm-row"><span>订单号</span><strong class="mono">${fxEscape(request.orderNo)}</strong></div><div class="confirm-row"><span>产品名称</span><strong>${fxEscape(request.product)}</strong></div><div class="confirm-row"><span>产品批次</span><strong class="mono">${fxEscape(request.batch || "—")}</strong></div><div class="confirm-row"><span>申请码段</span><strong class="mono">${fxEscape(requestedRange || "—")}</strong></div><div class="confirm-row"><span>申请数量</span><strong>${formatNumber(request.amount)}</strong></div><div class="confirm-row"><span>处理时间</span><strong>${fxEscape(request.decidedAt || "—")}</strong></div><div class="confirm-row"><span>处理说明</span><strong>${fxEscape(result || "等待运营端审批")}</strong></div></div>`, `<button class="button primary" data-action="close-modal">关闭</button>`);
    }
    if (state.modal === "fx-bind-request-reject") {
      const request = bindRequests.find(item => item.id === state.selectedBindRequestId);
      return fxModalShell("驳回绑定申请", request?.product || "", `<div class="field"><label class="required">驳回原因</label><textarea id="fx-bind-request-reason" placeholder="请说明驳回原因"></textarea></div>`, `<button class="button" data-action="close-modal">取消</button><button class="button danger" data-action="fx-confirm-bind-request-reject">确认驳回</button>`);
    }
    if (state.modal === "fx-customer-bind-choice") {
      const order = orders.find(item => item.no === state.selectedOrderNo && item.customer === fxCurrentCustomer().name);
      const remaining = order ? fxOrderAvailableAmount(order) : 0;
      if (!order || remaining < 1) return fxModalShell("申请绑定产品", "当前订单不存在或已无可用码量。", `<div class="empty"><p>没有可申请的可用码量</p></div>`, `<button class="button primary" data-action="close-modal">关闭</button>`);
      const body = `<div class="bind-choice-grid"><button type="button" class="bind-choice-card" data-action="fx-customer-select-existing-binding"><span class="bind-choice-icon">${icon("package-check", "✓")}</span><strong>选择已激活产品绑定</strong><span>为已有已激活产品追加绑定码量，提交后进入绑定审批。</span></button><button type="button" class="bind-choice-card" data-action="fx-customer-new-product-for-order" data-no="${fxEscape(order.no)}"><span class="bind-choice-icon">${icon("package-plus", "+")}</span><strong>新建产品审核并绑定</strong><span>新建产品资料并选择码段，审核通过后直接激活。</span></button></div>`;
      return fxModalShell("申请绑定产品", order.no, body, `<button class="button" data-action="close-modal">取消</button>`, true);
    }
    if (state.modal === "fx-customer-bind-order") {
      const order = orders.find(item => item.no === state.selectedOrderNo && item.customer === fxCurrentCustomer().name);
      const remaining = order ? fxOrderAvailableAmount(order) : 0;
      const activated = products.filter(item => item.company === fxCurrentCustomer().name && item.status === "已激活");
      if (!order || remaining < 1) return fxModalShell("申请绑定产品", "当前订单不存在或已无可用码量。", `<div class="empty"><p>没有可申请的可用码量</p></div>`, `<button class="button primary" data-action="close-modal">关闭</button>`);
      if (!activated.length) return fxModalShell("选择已有产品绑定", `${order.no} 当前可用 ${formatNumber(remaining)} 枚`, `<div class="empty"><div><div class="empty-icon">${icon("package-search", "·")}</div><h3>暂无已激活产品</h3><p>请返回上一步选择“新建产品审核并绑定”。</p></div></div>`, `<button class="button" data-action="fx-customer-back-bind-choice">返回选择</button>`);
      const initialAmount = Math.min(1000, remaining);
      const previewRange = fxActivationRange(order, initialAmount);
      return fxModalShell("选择已有产品绑定", order.no, `<div class="form-grid">${fxBindProductPicker("fx-customer-bind-product", activated, false)}<div class="field full"><label class="required">申请绑定数量</label><input id="fx-customer-bind-amount" type="number" min="1" max="${remaining}" value="${initialAmount}"><span class="field-help">剩余可用码量：${formatNumber(remaining)} 枚。审核通过后才会正式分配码段并计入激活量。</span></div><div class="field full"><label for="fx-customer-bind-range-preview">绑定码段预览</label><input id="fx-customer-bind-range-preview" class="mono immutable-input" value="${fxEscape(previewRange || "暂无可分配码段")}" readonly aria-readonly="true"><span class="field-help">预览当前可分配的连续码段，提交后由运营端审核确认。</span></div></div>`, `<button class="button" data-action="fx-customer-back-bind-choice">返回选择</button><button class="button primary" data-action="fx-confirm-customer-bind">提交绑定申请</button>`);
    }
    if (state.modal === "fx-scan-image") { const data = state.modalData || {}; return `<div class="scan-lightbox" role="dialog" aria-modal="true" aria-label="图片预览" data-action="close-modal"><img src="${fxEscape(data.src || "assets/tea-product.jpg")}" alt="${fxEscape(data.name || "产品图片")}" data-action="fx-lightbox-content"><button type="button" class="scan-lightbox-close" data-action="close-modal" aria-label="关闭图片预览" title="关闭">${icon("x", "×")}</button></div>`; }
    if (state.modal === "fx-operator") {
      const item = fxOperators.find(row => row.id === state.selectedOperatorId);
      const isCurrent = fxIsCurrentOperator(item);
      const statusControl = item
        ? `<select id="fx-operator-edit-status" ${isCurrent ? `disabled aria-disabled="true" title="当前登录账号不能更改自身状态"` : ""}><option ${item.status === "启用" ? "selected" : ""}>启用</option><option ${item.status === "禁用" ? "selected" : ""}>禁用</option></select>${isCurrent ? `<span class="field-help">当前登录账号不能禁用自身</span>` : ""}`
        : `<div class="password-control"><input id="fx-operator-password" type="password" value="Trace@2026" autocomplete="new-password"><button type="button" class="icon-button password-toggle" data-action="toggle-password" data-target="fx-operator-password" aria-controls="fx-operator-password" aria-pressed="false" aria-label="显示密码" title="显示密码">${icon("eye", "○")}</button></div>`;
      const resetPasswordAction = item && !isCurrent ? `<div class="field full"><label>登录密码</label><div class="field-action-row"><button class="button danger" data-action="fx-reset-operator-password" data-id="${item.id}">重置密码</button></div></div>` : "";
      return fxModalShell(item ? "编辑运营账号" : "新建运营账号", "", `<div class="form-grid"><div class="field"><label class="required">姓名</label><input id="fx-operator-name" value="${fxEscape(item?.name || "")}"></div><div class="field"><label class="required">登录账号</label>${item ? `<input id="fx-operator-account" class="immutable-input" value="${fxEscape(item.account)}" disabled aria-readonly="true" title="登录账号创建后不可修改">` : `<input id="fx-operator-account" value="">`}</div><div class="field full"><label class="required">${item ? "当前状态" : "初始密码"}</label>${statusControl}</div>${resetPasswordAction}</div>`, `<button class="button" data-action="close-modal">取消</button><button class="button primary" data-action="fx-confirm-operator">保存</button>`);
    }
    if (state.modal === "fx-customer-detail") {
      const item = customers.find(row => row.id === state.selectedCustomerId);
      if (!item) return "";
      const ownOrders = fxNewestRows(orders.filter(order => order.customer === item.name), order => order.createdAt || order.created);
      const ownProducts = products.filter(product => product.company === item.name);
      const orderRows = ownOrders.map(order => { const pending = fxOrderPendingAmount(order); const remaining = fxOrderAvailableAmount(order); return `<tr><td><button class="text-action mono" data-action="fx-focus-order" data-no="${fxEscape(order.no)}">${fxEscape(order.no)}</button></td><td>${fxEscape(order.createdAt || order.created || "—")}</td><td>${formatNumber(order.total)}</td><td>${formatNumber(order.active)}</td><td>${formatNumber(pending)}</td><td>${formatNumber(remaining)}</td><td><div class="table-actions">${remaining > 0 ? `<button class="text-action" data-action="fx-ops-bind-order" data-no="${fxEscape(order.no)}">绑定产品</button>` : "—"}</div></td></tr>`; }).join("") || `<tr><td colspan="7">暂无订单</td></tr>`;
      const body = `<section class="detail-section"><h3>客户完整资料</h3><dl class="detail-grid"><div class="detail-item"><dt>客户名称</dt><dd>${fxEscape(item.name)}</dd></div><div class="detail-item"><dt>登录账号</dt><dd class="mono">${fxEscape(item.account)}</dd></div><div class="detail-item"><dt>联系电话</dt><dd>${fxEscape(item.phone)}</dd></div><div class="detail-item"><dt>账号状态</dt><dd>${status(item.status)}</dd></div><div class="detail-item"><dt>营业执照</dt><dd>${fxEscape(fxFileName(item.license) || "未上传")}</dd></div><div class="detail-item"><dt>法人身份证</dt><dd>${fxEscape(fxFileName(item.legalId) || "未上传")}</dd></div><div class="detail-item"><button type="button" class="detail-item-button" data-action="fx-view-customer-products" data-customer="${fxEscape(item.name)}"><span>已激活产品</span><strong>${formatNumber(ownProducts.filter(product => product.status === "已激活").length)}</strong></button></div></dl></section><section class="detail-section"><div class="detail-title-row"><h3>全部订单</h3></div><div class="table-scroll"><table><thead><tr><th>订单号</th><th>创建时间</th><th>总量</th><th>已激活</th><th>绑定申请中</th><th>剩余可用</th><th>操作</th></tr></thead><tbody>${orderRows}</tbody></table></div></section>`;
      const foot = item.status === "启用" ? `<button class="button primary" data-action="fx-customer-create-order" data-id="${item.id}">${icon("qr-code", "▦")}创建订单</button>` : "";
      return fxModalShell("客户详情", `${item.name} · ${item.account}`, body, foot, true);
    }
    if (state.modal === "fx-customer") { const item = customers.find(row => row.id === state.selectedCustomerId); const resetPasswordAction = item ? `<div class="field full"><label>登录密码</label><div class="field-action-row"><button class="button danger" data-action="fx-reset-customer-password" data-id="${item.id}">重置密码</button></div></div>` : ""; return fxModalShell(item ? "编辑客户账号" : "新建客户账号", "", `<div class="form-grid"><div class="field full"><label class="required">客户名称</label><input id="fx-customer-name" value="${fxEscape(item?.name || "")}"></div><div class="field"><label class="required">登录账号</label>${item ? `<input id="fx-customer-account" class="immutable-input" value="${fxEscape(item.account)}" disabled aria-readonly="true" title="登录账号创建后不可修改">` : `<input id="fx-customer-account" value="">`}</div><div class="field"><label class="required">联系电话</label><input id="fx-customer-phone" value="${fxEscape(item?.phone || "")}"></div>${item ? "" : `<div class="field full"><label class="required">初始密码</label><div class="password-control"><input id="fx-customer-password" type="password" value="Trace@2026" autocomplete="new-password"><button type="button" class="icon-button password-toggle" data-action="toggle-password" data-target="fx-customer-password" aria-controls="fx-customer-password" aria-pressed="false" aria-label="显示密码" title="显示密码">${icon("eye", "○")}</button></div></div>`}${fxCustomerFileField("fx-customer-license", "营业执照", item, "license")}${fxCustomerFileField("fx-customer-legal", "法人身份证", item, "legalId")}${resetPasswordAction}</div>`, `<button class="button" data-action="close-modal">取消</button><button class="button primary" data-action="fx-confirm-customer">保存</button>`, true); }
    if (state.modal === "fx-withdrawal-detail") {
      const item = withdrawals[state.selectedWithdrawalIndex];
      const product = products.find(row => row.name === item?.product && row.company === item?.customer && (!item?.batch || row.batch === item.batch));
      const description = item?.rejectReason || (item?.status === "已通过" ? "关联码已重置为空白状态" : "等待运营方审批");
      const storedSegments = fxWithdrawalSegments(item);
      const segments = storedSegments.length || item?.status !== "待审批" ? storedSegments : fxProductActiveSegments(product, true);
      const body = `<div class="confirm-list"><div class="confirm-row"><span>申请编号</span><strong class="mono">${fxEscape(item?.no || "—")}</strong></div><div class="confirm-row"><span>申请时间</span><strong>${fxEscape(item?.time || "—")}</strong></div><div class="confirm-row"><span>申请状态</span><strong>${fxEscape(item?.status || "—")}</strong></div><div class="confirm-row"><span>客户名称</span><strong>${fxEscape(item?.customer || "—")}</strong></div><div class="confirm-row"><span>产品名称</span><strong>${fxEscape(item?.product || "—")}</strong></div><div class="confirm-row"><span>产品批次</span><strong class="mono">${fxEscape(item?.batch || product?.batch || "—")}</strong></div><div class="confirm-row"><span>撤回范围</span><strong>${item?.scope === "segments" ? "选定已绑码段" : "整产品全部已绑码段"}</strong></div><div class="confirm-row"><span>撤回码段</span><strong class="mono">${fxEscape(segments.map(segment => segment.range).filter(Boolean).join("、") || "全部已绑码段")}</strong></div><div class="confirm-row"><span>撤回数量</span><strong>${formatNumber(item?.requestedAmount || item?.rollbackAmount || segments.reduce((sum, segment) => sum + Number(segment.amount || 0), 0))} 枚</strong></div><div class="confirm-row"><span>撤回原因</span><strong>${fxEscape(item?.reason || "—")}</strong></div><div class="confirm-row"><span>处理说明</span><strong>${fxEscape(description)}</strong></div></div>`;
      return fxModalShell("撤回申请详情", "", body, `<button class="button primary" data-action="close-modal">关闭</button>`);
    }
    if (state.modal === "fx-confirm") {
      const data = state.modalData || {};
      const passwordCheck = data.requiresPassword ? `<div class="field modal-field operator-confirm-password"><label class="required" for="fx-operator-action-password">当前登录密码</label><div class="password-control"><input id="fx-operator-action-password" type="password" autocomplete="current-password" placeholder="输入当前账号的登录密码"><button type="button" class="icon-button password-toggle" data-action="toggle-password" data-target="fx-operator-action-password" aria-controls="fx-operator-action-password" aria-pressed="false" aria-label="显示密码" title="显示密码">${icon("eye", "○")}</button></div><span class="field-help">用于确认当前登录人本人执行敏感操作</span></div>` : "";
      return fxModalShell(data.title || "请确认", data.subtitle || "此操作需要二次确认。", `<div class="confirm-list"><div class="confirm-row"><span>对象</span><strong>${fxEscape(data.subject || "-")}</strong></div><div class="confirm-row"><span>操作</span><strong>${fxEscape(data.operation || "-")}</strong></div></div>${passwordCheck}`, `<button class="button" data-action="close-modal">取消</button><button class="button ${data.danger ? "danger" : "primary"}" data-action="fx-confirm-generic">确认</button>`);
    }
    if (state.modal === "fx-customer-bind-order") {
      const order = orders.find(item => item.no === state.selectedOrderNo && item.customer === fxCurrentCustomer().name);
      const remaining = order ? Number(order.total || 0) - Number(order.active || 0) : 0;
      const activated = products.filter(item => item.company === fxCurrentCustomer().name && item.status === "已激活");
      if (!order || remaining < 1) return fxModalShell("绑定产品", "当前订单不存在或已无可用码量。", `<div class="empty"><p>没有可绑定的未激活码量</p></div>`, `<button class="button primary" data-action="close-modal">关闭</button>`);
      if (!activated.length) return fxModalShell("绑定产品", `${order.no} 当前可用 ${formatNumber(remaining)} 枚`, `<div class="empty"><div><div class="empty-icon">${icon("package-plus", "+")}</div><h3>暂无已激活产品</h3><p>先新建产品并提交审核，审核通过后将优先关联该订单。</p></div></div>`, `<button class="button" data-action="close-modal">取消</button><button class="button primary" data-action="fx-customer-new-product-for-order" data-no="${fxEscape(order.no)}">新建产品并关联</button>`);
      return fxModalShell("绑定已激活产品", order.no, `<div class="form-grid">${fxBindProductPicker("fx-customer-bind-product", activated, true)}<div class="field full"><label class="required">本次绑定数量</label><input id="fx-customer-bind-amount" type="number" min="1" max="${remaining}" value="${Math.min(1000, remaining)}"><span class="field-help">剩余可用码段：${formatNumber(remaining)} 枚。绑定后对应连续码段立即激活，并写入订单激活记录。</span></div></div>`, `<button class="button" data-action="close-modal">取消</button><button class="button primary" data-action="fx-confirm-customer-bind">确认绑定</button>`);
    }
    if (state.modal === "fx-ops-bind-order") {
      const order = orders.find(item => item.no === state.selectedOrderNo);
      const remaining = order ? fxOrderAvailableAmount(order) : 0;
      const activated = order ? products.filter(item => item.company === order.customer && item.status === "已激活") : [];
      if (!order || remaining < 1) return fxModalShell("绑定产品", "当前订单不存在或已无可用码量。", `<div class="empty"><p>没有可绑定的未激活码量</p></div>`, `<button class="button primary" data-action="close-modal">关闭</button>`);
      if (!activated.length) return fxModalShell("绑定产品", `${order.no} · ${order.customer}`, `<div class="empty"><div><div class="empty-icon">${icon("package-search", "·")}</div><h3>暂无已激活产品</h3><p>该客户当前没有已激活产品，暂时无法绑定码量。</p></div></div>`, `<button class="button primary" data-action="close-modal">关闭</button>`);
      return fxModalShell("绑定产品", `${order.no} · ${order.customer}`, `<div class="form-grid">${fxBindProductPicker("fx-ops-bind-product", activated)}<div class="field full"><label class="required">本次绑定数量</label><input id="fx-ops-bind-amount" type="number" min="1" max="${remaining}" value="${Math.min(1000, remaining)}"><span class="field-help">剩余可用码段：${formatNumber(remaining)} 枚。绑定后对应连续码段立即激活，并写入订单激活记录。</span></div></div>`, `<button class="button" data-action="close-modal">取消</button><button class="button primary" data-action="fx-confirm-ops-bind">确认绑定</button>`);
    }
    if (state.modal === "fx-reset-history") { const item = withdrawals.find(row => row.no === state.modalData?.withdrawalNo); const record = orders.flatMap(order => order.activations || []).find(row => row.withdrawalNo === item?.no); return fxModalShell("撤回申请详情", item ? `${item.no} · ${item.product}` : "撤回记录不存在", `<div class="confirm-list"><div class="confirm-row"><span>撤回申请编号</span><strong class="mono">${fxEscape(item?.no || "—")}</strong></div><div class="confirm-row"><span>撤回原因</span><strong>${fxEscape(item?.reason || record?.withdrawalReason || "—")}</strong></div><div class="confirm-row"><span>审批结果</span><strong>${fxEscape(item?.status || "—")}</strong></div><div class="confirm-row"><span>审批时间</span><strong>${fxEscape(item?.decidedAt || record?.resetTime || "—")}</strong></div><div class="confirm-row"><span>操作人</span><strong>${fxEscape(record?.resetOperator || "—")}</strong></div><div class="confirm-row"><span>重置码段</span><strong class="mono">${fxEscape(item?.resetRanges?.join("、") || record?.range || "—")}</strong></div><div class="confirm-row"><span>重置数量</span><strong>${formatNumber(item?.rollbackAmount || record?.amount || 0)} 枚</strong></div></div>`, `<button class="button primary" data-action="fx-back-order-detail">返回订单详情</button>`); }
    if (state.modal === "fx-activation") {
      const product = products.find(item => item.id === state.drawerProductId);
      const combined = product?.applicationType === "新建产品并绑定";
      const excludeProductId = combined ? product.id : null;
      const preferredOrderNo = combined ? product.requestedOrderNo : product.preferredOrderNo;
      const available = orders
        .filter(item => item.customer === product.company && fxOrderAvailableAmount(item, excludeProductId) > 0)
        .sort((left, right) => Number(right.no === preferredOrderNo) - Number(left.no === preferredOrderNo));
      const preferred = available.find(item => item.no === preferredOrderNo) || available[0];
      const preferredAvailable = preferred ? fxOrderAvailableAmount(preferred, excludeProductId) : 0;
      const requestedAmount = Number(product.requestedAmount || 0);
      const initialAmount = combined && requestedAmount
        ? Math.min(requestedAmount, preferredAvailable)
        : preferredAvailable;
      const previewRange = preferred ? fxReviewActivationRange(preferred, initialAmount, product) : "";
      const note = combined
        ? `<p class="modal-note">以上订单、激活数量和码段由客户预填，运营端仍可根据审核情况进行调整。</p>`
        : "";
      const subtitle = combined
        ? "确认产品资料和绑定设置均符合要求。"
        : product.preferredOrderNo
          ? `客户已指定订单 ${product.preferredOrderNo}，仍可在审核时调整。`
          : "选择订单和本次激活数量，一步完成审核与码段关联。";
      const body = `<div class="form-grid"><div class="field full bind-product-picker activation-order-picker"><label class="required" for="fx-activation-order-search">激活订单</label><input id="fx-activation-order-search" class="bind-product-search activation-order-search" type="text" value="${fxEscape(preferred?.no || "")}" placeholder="选择激活订单" readonly role="combobox" aria-controls="fx-activation-order-options" aria-expanded="false"><div id="fx-activation-order-options" class="bind-product-options activation-order-options" role="listbox">${available.map(item => { const availableAmount = fxOrderAvailableAmount(item, excludeProductId); return `<button type="button" class="bind-product-option activation-order-option" role="option" data-action="fx-select-activation-order" data-no="${fxEscape(item.no)}" data-available="${availableAmount}"><span class="mono">${fxEscape(item.no)}</span><small>可用 ${formatNumber(availableAmount)} 枚</small></button>`; }).join("")}</div><input id="fx-activation-order" type="hidden" value="${fxEscape(preferred?.no || "")}"></div><div class="field full"><label class="required" for="fx-activation-amount">本次激活数量</label><input id="fx-activation-amount" type="number" min="1" max="${preferredAvailable}" value="${initialAmount}"><span id="fx-activation-available" class="field-help">可用码量：${formatNumber(preferredAvailable)} 枚</span></div><div class="field full"><label for="fx-activation-range-preview">绑定码段预览</label><input id="fx-activation-range-preview" class="mono immutable-input" value="${fxEscape(previewRange || "暂无可分配码段")}" readonly aria-readonly="true" aria-live="polite"></div></div>${note}`;
      return fxModalShell("审核通过并激活", subtitle, body, `<button class="button" data-action="close-modal">取消</button><button class="button primary" data-action="fx-confirm-activation">通过并激活</button>`);
    }
    if (state.modal === "fx-reject") { const product = products.find(item => item.id === state.drawerProductId); return fxModalShell("驳回产品资料", `${product.name} 驳回后将在客户端显示为已退回。`, `<div class="field"><label class="required">驳回原因</label><textarea id="fx-reject-reason" placeholder="明确说明需要补充或修改的内容"></textarea></div>`, `<button class="button" data-action="close-modal">取消</button><button class="button danger" data-action="fx-confirm-reject">确认驳回</button>`); }
    if (state.modal === "fx-withdraw-decision") { const item = withdrawals[state.selectedWithdrawalIndex]; const reject = state.modalData?.decision === "reject"; const product = products.find(row => row.name === item?.product && row.company === item?.customer && (!item?.batch || row.batch === item.batch)); const storedSegments = fxWithdrawalSegments(item); const segments = storedSegments.length ? storedSegments : fxProductActiveSegments(product, true); const ranges = segments.map(segment => segment.range).filter(Boolean).join("、") || "全部已绑码段"; const amount = item.requestedAmount || segments.reduce((sum, segment) => sum + Number(segment.amount || 0), 0); return fxModalShell(reject ? "驳回撤回申请" : "通过撤回申请", reject ? "填写驳回原因并通知客户。" : "通过后仅重置本次申请撤回的已绑码段。", `<div class="confirm-list"><div class="confirm-row"><span>产品</span><strong>${fxEscape(item.product)}</strong></div><div class="confirm-row"><span>客户</span><strong>${fxEscape(item.customer)}</strong></div><div class="confirm-row"><span>撤回范围</span><strong>${item.scope === "segments" ? "选定已绑码段" : "整产品全部已绑码段"}</strong></div><div class="confirm-row"><span>撤回码段</span><strong class="mono">${fxEscape(ranges)}</strong></div><div class="confirm-row"><span>撤回数量</span><strong>${formatNumber(amount)} 枚</strong></div><div class="confirm-row"><span>申请原因</span><strong>${fxEscape(item.reason)}</strong></div></div>${reject ? `<div class="field modal-field"><label class="required">驳回原因</label><textarea id="fx-withdraw-reject-reason"></textarea></div>` : ""}`, `<button class="button" data-action="close-modal">取消</button><button class="button ${reject ? "danger" : "primary"}" data-action="fx-confirm-withdraw-decision">确认${reject ? "驳回" : "通过并重置"}</button>`); }
    if (state.modal === "fx-message") { const item = messages.find(row => row.id === state.selectedMessageId); return fxModalShell(item.title, item.time, `<article class="message-letter" aria-label="消息信件正文"><p class="message-letter-recipient">${fxEscape(item.recipient)}，您好：</p><p class="message-letter-content"><strong>${fxEscape(item.title)}。</strong>${fxEscape(item.detail)}</p><footer class="message-letter-signature"><strong>溯源质控码平台</strong></footer></article>`, `<button class="button primary" data-action="close-modal">知道了</button>`); }
    if (state.modal === "fx-preview") { const draft = state.editorDraft || products.find(item => item.id === state.editorProductId)?.details || fxNewDraft(); const previewProduct = products.find(item => item.id === state.editorProductId); fxStore.set("trace-preview-draft-v2", { details: fxClone(draft), company: previewProduct?.company || fxCurrentCustomer().name, version: state.previewVersion, savedAt: fxNow() }); return fxModalShell("扫码预览码", "", `<div class="preview-layout"><div class="preview-code">${qrMarkup(`preview-${state.previewVersion}-${draft.batch || "new"}`)}</div><div class="preview-product-copy"><h3>产品名称：${fxEscape(draft.productName || "未填写")}</h3><p>产品品牌：${fxEscape(draft.brand || "未填写")}</p><p>产品批次：${fxEscape(draft.batch || "未填写")}</p></div></div>`, `<a class="button primary" href="pages/scan/preview.html?preview=1" target="_blank" rel="noopener">${icon("external-link", "↗")}打开扫码效果</a>`); }
    if (state.modal === "fx-submit") { const combined = Boolean(state.editorTargetOrderNo); return fxModalShell(combined ? "提交产品与绑定申请" : "提交产品审核", "提交后全部字段变为只读，等待运营方审核结果。", `<div class="confirm-list"><div class="confirm-row"><span>产品</span><strong>${fxEscape(state.editorDraft.productName)}</strong></div><div class="confirm-row"><span>批次</span><strong>${fxEscape(state.editorDraft.batch)}</strong></div>${combined ? `<div class="confirm-row"><span>申请类型</span><strong>新建产品并绑定</strong></div><div class="confirm-row"><span>关联订单</span><strong class="mono">${fxEscape(state.editorTargetOrderNo)}</strong></div><div class="confirm-row"><span>申请码段</span><strong class="mono">${fxEscape(state.editorRequestedRange || "—")}</strong></div><div class="confirm-row"><span>申请数量</span><strong>${formatNumber(state.editorRequestedAmount || 0)} 枚</strong></div>` : ""}<div class="confirm-row"><span>资料模块</span><strong>${fxEditorSteps().length} / ${fxEditorSteps().length}</strong></div></div>`, `<button class="button" data-action="close-modal">返回检查</button><button class="button primary" data-action="fx-confirm-submit">确认提交</button>`); }
    if (state.modal === "fx-customer-withdraw") {
      const segmentMode = state.modalData?.withdrawalMode === "segments";
      const activated = products.filter(item => item.company === fxCurrentCustomer().name && item.status === "已激活" && fxProductActiveSegments(item).length && (segmentMode || !withdrawals.some(withdrawal => withdrawal.status === "待审批" && withdrawal.customer === item.company && withdrawal.product === item.name && (!withdrawal.batch || withdrawal.batch === item.batch))));
      const title = segmentMode ? "发起码段撤回申请" : "发起全量撤回申请";
      if (!activated.length) return fxModalShell(title, "当前账号没有可撤回的已绑码段。", `<div class="empty"><div><div class="empty-icon">${icon("package-x", "×")}</div><h3>暂无可撤回码段</h3><p>产品完成码段绑定并激活后，才可发起撤回申请。</p></div></div>`, `<button class="button primary" data-action="close-modal">知道了</button>`);
      const selectedId = Number(state.modalData?.withdrawalProductId || state.editorProductId) || null;
      const selectedProduct = activated.find(item => item.id === selectedId);
      const segmentPicker = segmentMode ? fxWithdrawalSegmentPicker(selectedProduct) : "";
      return fxModalShell(title, "", `<div class="form-grid">${fxBindProductPicker("fx-withdraw-product", activated, false, selectedId)}${segmentPicker}<div class="field full"><label class="required">撤回原因</label><textarea id="fx-withdraw-reason"></textarea></div></div>`, `<button class="button" data-action="close-modal">取消</button><button class="button danger" data-action="fx-confirm-customer-withdraw">提交申请</button>`);
    }
    if (state.modal === "fx-file") { const data = state.modalData || {}; const isImage = String(data.type || "").startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(data.name || ""); const hasSource = Boolean(data.src); const content = isImage ? `<img class="image-preview" src="${fxEscape(data.src || "assets/tea-field.jpg")}" alt="${fxEscape(data.name || "图片")}">` : hasSource ? `<iframe class="pdf-frame" src="${fxEscape(fxPdfDisplaySrc(data.src))}" title="${fxEscape(data.name || "PDF 附件")}"></iframe>` : `<div class="pdf-preview"><div class="pdf-page"><div class="pdf-logo">TRACE QUALITY</div><h2>${fxEscape(data.name || "质量检测报告")}</h2><p>该演示附件仅保存了文件名；重新上传后即可预览真实 PDF 内容。</p></div></div>`; return fxModalShell(isImage ? "图片预览" : "PDF 在线预览", data.name || "附件", content, `<button class="button primary" data-action="close-modal">关闭预览</button>`, true); }
    return "";
  };
