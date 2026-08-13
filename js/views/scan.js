"use strict";

const fxScanParams = new URLSearchParams(location.search);
  const fxBodyScanStatus = document.body.dataset.scanStatus;
  const fxScanIsPreview = fxScanParams.get("preview") === "1" || fxBodyScanStatus === "preview";
  const fxPreviewPayload = fxStore.get("trace-preview-draft-v2", null);
  const fxRequestedSerial = String(fxScanParams.get("serial") || "").trim().toUpperCase();
  const fxRequestedStatus = fxScanParams.get("status");
  const fxForcedStatus = ["active", "inactive", "reset"].includes(fxRequestedStatus)
    ? fxRequestedStatus
    : !fxRequestedSerial && ["active", "inactive", "reset"].includes(fxBodyScanStatus)
      ? fxBodyScanStatus
      : null;
  const fxMatchedOrder = fxRequestedSerial ? orders.find(order => fxCodeInRange(fxRequestedSerial, order.range)) : null;
  const fxMatchedActivation = fxMatchedOrder?.activations?.find(row => row.status !== "已重置" && row.range && fxCodeInRange(fxRequestedSerial, row.range));
  const fxResetWithdrawal = fxRequestedSerial ? withdrawals.filter(item => item.status === "已通过" && (item.resetRanges || []).some(range => fxCodeInRange(fxRequestedSerial, range))).sort((a, b) => String(b.decidedAt || b.time || "").localeCompare(String(a.decidedAt || a.time || "")))[0] : null;
  function fxScanActivationProduct(activation, order) {
    if (!activation) return null;
    const hasProductId = activation.productId !== undefined && activation.productId !== null && activation.productId !== "";
    const hasCustomerId = activation.customerId !== undefined && activation.customerId !== null && activation.customerId !== "";
    const activationCustomer = hasCustomerId ? customers.find(item => Number(item.id) === Number(activation.customerId)) : null;
    const orderCustomer = order ? fxCustomerForRecord(order) : null;
    const matchesCustomer = product => {
      if (!product) return false;
      if (hasCustomerId) {
        if (order?.customerId !== undefined && order.customerId !== null && order.customerId !== "" && Number(order.customerId) !== Number(activation.customerId)) return false;
        if (product.customerId !== undefined && product.customerId !== null && product.customerId !== "" && Number(product.customerId) !== Number(activation.customerId)) return false;
        if (activationCustomer && !fxRecordBelongsToCustomer(product, activationCustomer)) return false;
      }
      return !orderCustomer || fxRecordBelongsToCustomer(product, orderCustomer);
    };
    if (hasProductId) {
      const product = products.find(item => Number(item.id) === Number(activation.productId));
      return matchesCustomer(product) ? product : null;
    }
    if (!activation.batch) return null;
    const candidates = products.filter(item => item.name === activation.product
      && item.batch === activation.batch
      && matchesCustomer(item));
    return candidates.length === 1 ? candidates[0] : null;
  }
  const fxActivatedProduct = fxScanActivationProduct(fxMatchedActivation, fxMatchedOrder);
  const fxActivationIsNewer = Boolean(fxActivatedProduct && (!fxResetWithdrawal || String(fxMatchedActivation.time || "") > String(fxResetWithdrawal.decidedAt || fxResetWithdrawal.time || "")));
  const fxResolvedScanStatus = fxScanIsPreview
    ? "active"
    : fxResetWithdrawal && !fxActivationIsNewer
      ? "reset"
      : fxForcedStatus === "reset" || fxForcedStatus === "inactive"
        ? fxForcedStatus
        : fxForcedStatus === "active"
          ? fxRequestedSerial && !fxActivationIsNewer ? "inactive" : "active"
          : fxActivationIsNewer
            ? "active"
            : fxRequestedSerial
              ? "inactive"
              : "active";
  const fxResetProduct = fxResetWithdrawal
    ? fxProductForRecord({
        productId: fxResetWithdrawal.productId,
        product: fxResetWithdrawal.product,
        batch: fxResetWithdrawal.batch,
        customerId: fxResetWithdrawal.customerId,
        customer: fxResetWithdrawal.customer,
      })
    : null;
  const fxScanProduct = fxScanIsPreview && fxPreviewPayload?.details
    ? { id: "preview", name: fxPreviewPayload.details.productName || "未命名产品", company: fxPreviewPayload.company || fxPreviewPayload.details.companyName || "", batch: fxPreviewPayload.details.batch || "PREVIEW", status: "预览", amount: 0, details: fxNormalizeDetails(fxPreviewPayload.details) }
    : fxActivatedProduct
      || fxResetProduct
      || (!fxRequestedSerial ? products.find(item => item.demoCase === "complete-tea" && item.status === "已激活") : null)
      || (!fxRequestedSerial ? products.find(item => item.status === "已激活") : null)
      || products[0];
  const fxScanDetails = fxNormalizeDetails(fxScanProduct?.details || fxNewDraft());
  const fxScanRecordKey = "trace-scan-records-v2";
  const fxScanRecords = fxStore.get(fxScanRecordKey, {});
  let fxCurrentScanRecord = fxRequestedSerial && fxScanRecords[fxRequestedSerial] && typeof fxScanRecords[fxRequestedSerial] === "object"
    ? fxScanRecords[fxRequestedSerial]
    : { count: 0, times: [] };
  if (entryPortal === "scan") {
    if (!fxScanIsPreview && fxResolvedScanStatus === "active" && fxRequestedSerial) {
      const time = fxNow();
      fxCurrentScanRecord = { count: Number(fxCurrentScanRecord.count || 0) + 1, times: [...(Array.isArray(fxCurrentScanRecord.times) ? fxCurrentScanRecord.times : []), time] };
      fxScanRecords[fxRequestedSerial] = fxCurrentScanRecord;
      fxStore.set(fxScanRecordKey, fxScanRecords);
      state.scanCount = fxCurrentScanRecord.count;
      state.scanLast = time;
    } else {
      state.scanCount = Number(fxCurrentScanRecord.count || 0);
      state.scanLast = fxCurrentScanRecord.times?.at?.(-1) || fxNow();
    }
    state.scanStatus = fxResolvedScanStatus;
  }
  function fxScanRows(base, custom = []) {
    return [...base, ...(custom || []).map(row => [row.name, row.value])].filter(([label, value]) => label && value);
  }
  function fxScanMediaItem(file, module) {
    const name = fxFileName(file); const type = fxFileType(file); const image = type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(name); const fallback = module === "product" || module === "quality" ? "assets/tea-product.jpg" : "assets/tea-field.jpg"; const src = fxFileSrc(file, image ? fallback : "");
    if (image) return `<button type="button" class="scan-inline-image" data-action="fx-scan-image" data-src="${fxEscape(src)}" aria-label="查看${fxEscape(name)}"><img src="${fxEscape(src)}" alt="${fxEscape(name)}"></button>`;
    return src ? `<iframe class="scan-inline-pdf-frame" src="${fxEscape(fxPdfDisplaySrc(src))}" title="${fxEscape(name)}" loading="lazy"></iframe>` : `<button type="button" class="scan-inline-document" data-action="fx-scan-pdf" data-name="${fxEscape(name)}"><span>${icon("file-text", "□", "icon-lg")}</span><strong>${fxEscape(name)}</strong></button>`;
  }
  function fxScanMediaGroup(title, files, module) {
    if (!files.length) return "";
    return `<div class="scan-media-group">${title ? `<h4>${title}</h4>` : ""}<div class="scan-media-list">${files.map(file => fxScanMediaItem(file, module)).join("")}</div></div>`;
  }
  function fxScanFieldsToggle(module, total) {
    if (total <= 5) return "";
    const expanded = Boolean(state.scanExpandedModules?.[module]);
    const label = expanded ? "收起完整信息" : `展开其余 ${total - 5} 项`;
    return `<button type="button" class="scan-fields-toggle" data-action="fx-toggle-scan-fields" data-module="${module}" aria-expanded="${expanded}" aria-label="${label}" title="${label}">${icon(expanded ? "chevron-up" : "chevron-down", expanded ? "⌃" : "⌄")}</button>`;
  }
  function fxModuleDisplayItems(details, module) {
    fxNormalizeDetails(details); const order = details.fieldOrder[module] || [];
    return order.flatMap(token => {
      if (token.startsWith("field:")) {
        const field = (fxStandardFieldDefs[module] || []).find(item => item.key === token.slice(6));
        if (!field || field.scan === false) return [];
        const items = []; const value = details[field.key]; const files = field.mediaKey ? details.fieldMedia?.[field.mediaKey] || [] : [];
        if (!field.mediaOnly && value) items.push({ type: "text", label: field.label, value });
        if (files.length) items.push({ type: "file", label: field.mediaLabel || `${field.label}图片`, files });
        return items;
      }
      if (token.startsWith("custom:")) { const row = details.custom[module].find(item => item.id === token.slice(7)); if (!row?.name) return []; const items = []; if (row.value) items.push({ type: "text", label: row.name, value: row.value }); if (row.files?.length) items.push({ type: "file", label: row.name, files: row.files }); return items; }
      if (token === "trace:timeline") { const rows = details.trace.filter(row => row?.date && row?.content).sort((a, b) => String(a.date).localeCompare(String(b.date))); return rows.length ? [{ type: "trace", rows }] : []; }
      return [];
    });
  }
  function fxScanDisplayItem(item, module, index) {
    if (item.type === "text") return `<dl class="info-list"><div><dt>${fxEscape(item.label)}</dt><dd>${fxEscape(item.value)}</dd></div></dl>`;
    if (item.type === "file") return `<div class="scan-custom-file-field"><h4>${fxEscape(item.label)}</h4>${fxScanMediaGroup("", item.files, module)}</div>`;
    return `<div class="trace-list"><div class="trace-field-label">追溯记录</div>${item.rows.map((row, rowIndex) => `<div class="trace-item" data-sequence="${rowIndex + 1}"><div class="trace-date">${fxEscape(row.date)}</div><div class="trace-title">${fxEscape(row.content)}</div></div>`).join("")}</div>`;
  }
  function fxScanOrderedSection(title, module) {
    const items = fxModuleDisplayItems(fxScanDetails, module); const expanded = Boolean(state.scanExpandedModules?.[module]); const textItems = items.filter(item => item.type !== "file"); const mediaItems = items.filter(item => item.type === "file"); const visibleText = expanded ? textItems : textItems.slice(0, 5);
    return `<section class="content-section"><h3>${title}</h3><div class="scan-ordered-fields">${visibleText.map(item => fxScanDisplayItem(item, module, 0)).join("")}</div>${fxScanFieldsToggle(module, textItems.length)}${mediaItems.length ? `<div class="scan-ordered-media">${mediaItems.map(item => fxScanDisplayItem(item, module, 0)).join("")}</div>` : ""}</section>`;
  }
  scanProductTab = function () { return fxScanOrderedSection("产品信息", "product"); };
  scanCompanyTab = function () { return fxScanOrderedSection("企业信息", "company"); };
  scanProductionTab = function () { return fxScanOrderedSection("生产单位", "production"); };
  scanQualityTab = function () { return fxScanOrderedSection("产品质量信息", "quality"); };
  scanTraceTab = function () { return fxScanOrderedSection("生产追溯信息", "trace"); };
  const fxScanModules = [
    ["product", "产品", scanProductTab, d => Boolean(fxModuleDisplayItems(d, "product").length || d.files?.product?.length)],
    ["company", "企业", scanCompanyTab, d => Boolean(fxModuleDisplayItems(d, "company").length || d.files?.company?.length)],
    ["production", "生产", scanProductionTab, d => Boolean(fxModuleDisplayItems(d, "production").length || d.files?.production?.length)],
    ["quality", "质量", scanQualityTab, d => Boolean(fxModuleDisplayItems(d, "quality").length || d.files?.quality?.length)],
    ["trace", "追溯", scanTraceTab, d => Boolean(fxModuleDisplayItems(d, "trace").length || d.files?.trace?.length)],
  ];
  function fxScanBrandBanner() {
    return `<div class="scan-brand-banner"><img src="assets/scan-brand-banner.png?v=v6q9x3cz" alt="溯源质控码追溯系统"></div>`;
  }
  scanActive = function () {
    const tabs = fxScanModules.filter(([, , , visible]) => visible(fxScanDetails));
    if (!tabs.some(([key]) => key === state.scanTab)) state.scanTab = tabs[0]?.[0] || "product";
    const active = tabs.find(([key]) => key === state.scanTab) || tabs[0];
    const statusMeta = fxScanIsPreview ? `<div class="verified-row"><span class="status warning">预览资料</span></div>` : "";
    const scanMeta = fxScanIsPreview
      ? `<div class="scan-preview-note">预览码不计入扫码次数，也不占用订单码量。</div>`
      : fxRequestedSerial
        ? `<div class="scan-meta"><div><span>总查询次数</span><strong>${formatNumber(state.scanCount || 1)}</strong></div><div><span>溯源质控码</span><strong class="mono">${fxEscape(fxRequestedSerial)}</strong></div></div>`
        : `<div class="scan-preview-note">当前为扫码端演示入口；扫描溯源质控码后将按单码记录查询次数。</div>`;
    return `<div class="scan-shell"><div class="mobile-topbar"><span></span><h1>溯源质控码</h1><span></span></div>${fxScanBrandBanner()}<div class="product-summary">${statusMeta}<h2>${fxEscape(fxScanDetails.productName || "未命名产品")}</h2>${scanMeta}</div><nav class="tabs" aria-label="溯源内容模块">${tabs.map(([key, label]) => `<button type="button" class="tab ${state.scanTab === key ? "active" : ""}" data-action="scan-tab" data-tab="${key}">${label}</button>`).join("")}</nav><div class="scan-content">${active ? active[2]() : `<section class="content-section"><div class="empty"><h3>暂无公开资料</h3><p>当前产品尚未配置可展示内容。</p></div></section>`}</div></div>`;
  };
  scanStateMarkup = function (type) {
    const inactive = type === "inactive";
    const serial = fxRequestedSerial || "DEMO00000001";
    const label = inactive ? "未激活码" : "已重置码";
    const title = inactive ? "该质控码尚未激活" : "该质控码信息已重置";
    const description = inactive ? "该码已生成，但尚未关联已激活的产品资料。请核对包装上的质控码，或稍后再次查询。" : "原关联产品信息已撤回，该质控码当前为空白状态。请联系产品提供方获取最新处理信息。";
    return `<div class="scan-shell"><div class="mobile-topbar"><span></span><h1>溯源质控码</h1><span></span></div><div class="scan-state ${inactive ? "is-inactive" : "is-reset"}"><div class="scan-state-card"><div class="scan-state-icon">${icon(inactive ? "qr-code" : "refresh-cw", inactive ? "▦" : "↻", "icon-lg")}</div><span class="scan-state-label">${label}</span><h2>${title}</h2><p>${description}</p><div class="scan-state-meta"><span>当前状态</span><strong>${inactive ? "未激活" : "已重置"}</strong><span>溯源质控码</span><strong class="mono">${fxEscape(serial)}</strong></div></div></div></div>`;
  };
  function fxScanPrototypeNav() {
    const current = fxScanIsPreview ? "preview" : fxResolvedScanStatus;
    const entries = [
      ["preview", "预览码", "pages/scan/preview.html?preview=1"],
      ["active", "已激活", "pages/scan/active.html?serial=YL00880001"],
      ["inactive", "未激活", "pages/scan/inactive.html?serial=YL00892001"],
      ["reset", "已重置", "pages/scan/reset.html?serial=YL00880001&status=reset"],
    ];
    return `<nav class="scan-prototype-nav" aria-label="扫码页面原型切换"><span>页面原型</span><div class="scan-prototype-links">${entries.map(([key, label, href]) => `<a href="${href}" ${current === key ? `class="active" aria-current="page"` : ""}>${label}</a>`).join("")}</div></nav>`;
  }
  renderScan = function () {
    const body = fxResolvedScanStatus === "active" ? scanActive() : scanStateMarkup(fxResolvedScanStatus);
    return `<main class="scan-stage">${fxScanPrototypeNav()}${body}</main>${portalSwitcher()}${modalMarkup()}`;
  };
