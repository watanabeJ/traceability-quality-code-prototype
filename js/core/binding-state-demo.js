"use strict";

// Explicit test-data import; ordinary application entry points do not load this file.
async function omImportBindingStateDemoData() {
  if (!fxEnabledOperatorSession()) throw new Error("请先登录运营账号");
  const tag = "binding-states-demo-20261029";
  const owner = customers.find(row => row.account === "yunling" && row.status === "启用")
    || customers.find(row => row.status === "启用" && /^\d{5}$/.test(row.companyNumber || ""));
  const categories = fxCategories().filter(row => row.status === "启用");
  if (!owner || !categories.length) throw new Error("需要启用的客户及产品品类");
  const primary = categories.find(row => row.name === "茶叶") || categories[0];
  const secondary = categories.find(row => row.id !== primary.id) || primary;
  const now = omNow();
  const operator = fxCurrentOperator().name;
  const scenarios = [
    ["empty", "刚生成，暂无绑定记录"],
    ["new-draft", "新建产品，待提交"],
    ["new-pending", "新建产品，待审批"],
    ["new-rejected", "新建产品，已驳回"],
    ["existing-draft", "已有产品追加绑定，待提交"],
    ["existing-pending", "已有产品追加绑定，待审批"],
    ["existing-rejected", "已有产品追加绑定，已驳回"],
    ["active", "新建产品绑定已通过，部分已绑定"],
    ["approved", "已有产品追加绑定已通过"],
    ["full", "整单全部已绑定"],
    ["reset", "绑定后已撤回重置"],
    ["cancel-free", "未下载后撤销，号码已释放"],
    ["cancel-locked", "下载后撤销，号码保留锁定"],
    ["cancel-rejected", "申请被驳回后撤销，保留驳回记录"],
    ["mixed", "同品类多状态记录及跨品类隔离"],
  ];
  const result = [];
  let created = 0;
  function makeProduct(order, line, key, status, source, first, amount) {
    const name = `状态测试-${key}`;
    const batch = `MOCK-${order.no.slice(-8)}-${key}`;
    const details = Object.assign(fxNewDraft(), {
      productName: name, companyName: owner.name, category: line.category, batch,
    });
    const item = {
      id: Math.max(0, ...products.map(row => Number(row.id) || 0)) + 1,
      demoTag: tag, demoKey: `${order.demoKey}:${key}`, customerId: owner.id,
      company: owner.name, name, batch, categoryId: line.categoryId,
      category: line.category, productNumber: line.productNumber, orderLineId: line.id,
      status, amount: 0, details, submitted: status === "草稿" ? "" : now,
      decidedAt: ["已激活", "已驳回"].includes(status) ? now : "",
      operator: ["已激活", "已驳回"].includes(status) ? operator : "",
    };
    if (source === "product-review") Object.assign(item, {
      applicationType: "新建产品并绑定", requestedOrderNo: order.no, preferredOrderNo: order.no,
      requestedSourceRange: omRange(line.first, line.last),
      requestedRange: omRange(first, first + amount - 1), requestedAmount: amount,
      rejectionReason: status === "已驳回" ? "【测试】产品资料不完整，请补充后重新提交" : "",
    });
    products.unshift(item);
    return item;
  }
  function makeRequest(order, line, key, status, first = line.first, amount = 5) {
    const product = makeProduct(order, line, key, "已激活", "binding", first, amount);
    const request = {
      id: Math.max(Date.now(), ...bindRequests.map(row => Number(row.id) || 0)) + 1,
      no: fxNextBindRequestNo(), demoTag: tag, demoKey: `${order.demoKey}:${key}`,
      orderNo: order.no, orderLineId: line.id, customerId: owner.id, customer: owner.name,
      categoryId: line.categoryId, productId: product.id, product: product.name, batch: product.batch,
      applicationType: "已有产品追加绑定", range: omRange(first, first + amount - 1), amount,
      status, time: status === "草稿" ? "" : now, submittedBy: owner.name,
      decidedAt: ["已通过", "已驳回"].includes(status) ? now : "",
      operator: ["已通过", "已驳回"].includes(status) ? operator : "",
      rejectReason: status === "已驳回" ? "【测试】绑定数量需核实，请调整后重新提交" : "",
    };
    bindRequests.unshift(request);
    return { product, request };
  }
  function makeActivation(order, product, first, amount, request = null) {
    const activation = {
      productId: product.id, customerId: owner.id, product: product.name, batch: product.batch,
      range: omRange(first, first + amount - 1), amount, time: now, operator, status: "有效",
      demoTag: tag, bindRequestNo: request?.no || "",
    };
    fxEnsureActivationId(order, activation, `${order.demoKey}:${first}`);
    order.activations.push(activation);
    return activation;
  }
  function makeReset(order, line, first = line.first, amount = 5) {
    const { product, request } = makeRequest(order, line, "已撤回重置", "已通过", first, amount);
    const activation = makeActivation(order, product, first, amount, request);
    const no = `WD-MOCK-${order.no.slice(-8)}`;
    Object.assign(activation, { status: "已重置", resetTime: now, resetOperator: operator, withdrawalNo: no });
    withdrawals.unshift({
      id: Math.max(Date.now(), ...withdrawals.map(row => Number(row.id) || 0)) + 1,
      no, demoTag: tag, customerId: owner.id, customer: owner.name, productId: product.id,
      product: product.name, batch: product.batch, status: "已通过", scope: "segments",
      segments: [{ activationId: activation.activationId, key: activation.activationId,
        orderNo: order.no, range: activation.range, amount, time: now }],
      resetRanges: [activation.range], requestedAmount: amount, rollbackAmount: amount,
      time: now, decidedAt: now, operator, reason: "【测试】产品资料调整，申请撤回",
      rejectReason: `已重置 ${amount} 个码，恢复订单内可用数量`,
    });
  }
  for (const [key, label] of scenarios) {
    let order = orders.find(row => row.demoTag === tag && row.demoKey === key);
    if (order?.demoBindingsImported) {
      result.push({ key, label, no: order.no });
      continue;
    }
    const note = `【状态测试】${label}`;
    order ||= orders.find(row => row.note === note) || await omGenerate({
      customerId: owner.id, version: "1",
      lines: [{ categoryId: primary.id, quantity: 20, remark: label },
        ...(key === "mixed" ? [{ categoryId: secondary.id, quantity: 10, remark: "跨品类隔离测试" }] : [])],
      note,
    });
    order.demoTag = tag;
    order.demoKey = key;
    const line = order.lines[0];
    if (!products.some(row => row.demoTag === tag && row.demoKey.startsWith(`${key}:`))) {
      if (key.startsWith("new-")) {
        const status = { "new-draft": "草稿", "new-pending": "待审核", "new-rejected": "已驳回" }[key];
        makeProduct(order, line, label, status, "product-review", line.first, 5);
      } else if (key.startsWith("existing-") || key === "cancel-rejected") {
        const status = { "existing-draft": "草稿", "existing-pending": "待审批" }[key] || "已驳回";
        makeRequest(order, line, label, status);
      } else if (key === "active") {
        const product = makeProduct(order, line, label, "已激活", "product-review", line.first, 5);
        makeActivation(order, product, line.first, 5);
      } else if (key === "approved" || key === "full") {
        const amount = key === "full" ? line.quantity : 5;
        const { product, request } = makeRequest(order, line, label, "已通过", line.first, amount);
        makeActivation(order, product, line.first, amount, request);
      } else if (key === "reset") {
        makeReset(order, line);
      } else if (key === "mixed") {
        makeRequest(order, line, "待提交", "草稿", 1, 2);
        makeRequest(order, line, "待审批", "待审批", 3, 2);
        makeRequest(order, line, "已驳回", "已驳回", 5, 2);
        const { product, request } = makeRequest(order, line, "已绑定", "已通过", 7, 2);
        makeActivation(order, product, 7, 2, request);
        makeReset(order, line, 9, 2);
        makeProduct(order, order.lines[1], "其他品类草稿", "草稿", "product-review", 21, 2);
      }
    }
    if (key === "cancel-locked" && !order.downloads.length) {
      order.downloads.push({
        id: crypto.randomUUID(), demoTag: tag, simulated: true, orderNo: order.no,
        scope: "前 1 个码（模拟下载）", first: 1, last: 1, amount: 1,
        operator: `${operator}（测试数据）`, time: now,
      });
    }
    fxReconcileActivationStatistics();
    fxSaveBusiness();
    if (key.startsWith("cancel-") && !omCancelled(order)) {
      await omCancel(order.no, `【测试】${label}`);
      order = orders.find(row => row.no === order.no);
    }
    order.demoBindingsImported = true;
    fxSaveBusiness();
    result.push({ key, label, no: order.no });
    created += 1;
  }
  return { created, customer: owner.name, rows: result };
}
