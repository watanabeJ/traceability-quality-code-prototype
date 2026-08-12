"use strict";

function opsOverview() {
  return `<div class="page">
    ${pageHeader("运营概览", "2026 年 7 月 27 日 · 平台实时业务状态", `<button class="button primary" data-action="go-reviews">${icon("clipboard-check", "✓")}处理待审核</button>`)}
    ${metricStrip([
      { label: "客户账号", value: "42", note: "本月新增 6 个", icon: "building-2", up: true },
      { label: "码段库存", value: "680,000", note: "31 个批次", icon: "qr-code" },
      { label: "已激活码", value: "462,800", note: "激活率 68.1%", icon: "circle-check", up: true },
      { label: "待处理事项", value: "4", note: "3 项审核 · 1 项撤回", icon: "inbox" },
    ])}
    <div class="section-row">
      <section class="panel"><div class="panel-header"><h2>最近订单</h2><button class="button small" data-action="go-orders">查看全部</button></div><div class="table-scroll"><table><colgroup><col style="width:30%"><col style="width:34%"><col style="width:18%"><col style="width:18%"></colgroup><thead><tr><th>订单号</th><th>客户</th><th>码量</th><th>已激活</th></tr></thead><tbody>${orders.slice(0,6).map(o => `<tr><td class="mono">${o.no}</td><td>${o.customer}</td><td>${formatNumber(o.total)}</td><td>${formatNumber(o.active)}</td></tr>`).join("")}</tbody></table></div></section>
      <section class="panel"><div class="panel-header"><h2>业务动态</h2><button class="icon-button" title="刷新" aria-label="刷新" data-action="refresh">${icon("refresh-cw", "↻")}</button></div><div class="panel-body list">${messages.map(m => `<div class="list-item"><span class="list-icon">${icon(m.unread ? "bell-ring" : "circle-check", "·")}</span><div class="list-content"><div class="list-title">${m.title}</div><div class="list-meta">${m.time} · ${m.type}</div></div></div>`).join("")}</div></section>
    </div>
  </div>`;
}

function opsCustomers() {
  return `<div class="page">
    ${pageHeader("客户列表", "管理客户资料、账号状态与码段使用概况", `<button class="button primary" data-action="new-customer">${icon("plus", "+")}新建客户</button>`)}
    <div class="toolbar"><div class="filters"><div class="search-field"><label class="filter-field-label" for="customer-search">客户名称或账号</label><input id="customer-search" placeholder="请输入" aria-label="客户名称或账号"></div><select aria-label="账号状态"><option>全部状态</option><option>启用</option><option>禁用</option></select><button class="button small" data-action="refresh">重置</button></div><button class="button" data-action="export">${icon("download", "↓")}导出</button></div>
    <div class="table-shell"><div class="table-scroll"><table><colgroup><col style="width:25%"><col style="width:13%"><col style="width:16%"><col style="width:10%"><col style="width:12%"><col style="width:12%"><col style="width:12%"></colgroup><thead><tr><th>客户</th><th>账号</th><th>联系电话</th><th>状态</th><th>总量</th><th>已激活</th><th>操作</th></tr></thead><tbody>${customers.map(c => `<tr><td><div class="cell-main">${c.name}</div><div class="cell-sub">${c.total / 10000} 个码段批次</div></td><td class="mono">${c.account}</td><td>${c.phone}</td><td>${status(c.status)}</td><td>${formatNumber(c.total)}</td><td>${formatNumber(c.active)}</td><td><div class="table-actions"><button class="text-action" data-action="edit-customer">编辑</button><button class="icon-button" title="更多" aria-label="更多">${icon("ellipsis", "⋯")}</button></div></td></tr>`).join("")}</tbody></table></div>${pagination(customers.length)}</div>
  </div>`;
}

function qrStepper() {
  const steps = ["批次信息", "输出尺寸", "确认生成", "生成结果"];
  return `<div class="stepper" style="grid-template-columns:repeat(4,minmax(0,1fr))">${steps.map((label, idx) => `<div class="step ${state.qrStep === idx + 1 ? "active" : ""} ${state.qrStep > idx + 1 ? "done" : ""}"><span class="step-number">${state.qrStep > idx + 1 ? icon("check", "✓") : idx + 1}</span><span class="step-label">${label}</span></div>`).join("")}</div>`;
}

function qrStepContent() {
  if (state.qrStep === 1) return `<div class="form-grid"><div class="field"><label class="required">生成数量</label><input id="qr-amount" type="number" min="1" value="50000"></div><div class="field"><label>批次备注</label><input placeholder="例如：8 月备货码段"></div><div class="field full"><label>序列号预览</label><input class="mono" value="QR00060001 – QR00110000" readonly><span class="field-help">生成后进入平台码段库存，后续再按需分配。</span></div></div>`;
  if (state.qrStep === 2) return `<div class="form-grid"><div class="field"><label class="required">输出尺寸</label><select><option>20 × 20 mm</option><option>25 × 25 mm</option><option>30 × 30 mm</option><option>自定义宽高</option></select></div><div class="field"><label>自定义宽度 mm</label><input type="number" min="8" value="25"></div><div class="field"><label>自定义高度 mm</label><input type="number" min="8" value="25"></div><div class="field full"><span class="field-help">仅输出二维码核心区块，不包含标签模板或额外样式选择。</span></div></div>`;
  if (state.qrStep === 3) return `<div class="confirm-list"><div class="confirm-row"><span>分配状态</span><strong>未分配</strong></div><div class="confirm-row"><span>输出内容</span><strong>二维码核心区块 · 25 × 25 mm</strong></div><div class="confirm-row"><span>生成数量</span><strong>50,000 枚</strong></div><div class="confirm-row"><span>批次号</span><strong class="mono">BATCH-202608-032</strong></div><div class="confirm-row"><span>预计文件</span><strong>50,000 张 SVG · ZIP 压缩包</strong></div></div>`;
  return `<div style="text-align:center;padding:12px 0 4px"><div class="success-mark">${icon("check", "✓", "icon-lg")}</div><h2 style="margin:0;font-size:18px">码段批次已生成</h2><p class="muted" style="margin:6px 0 0">批次 BATCH-202608-032 已进入库存，共 50,000 枚。</p>${qrMarkup("generated")}</div>`;
}

function opsCodes() {
  return `<div class="page">
    ${pageHeader("生成码段批次", "先生成带序列号的二维码核心区块，进入平台库存后再按需分配")}
    <section class="wizard-shell">${qrStepper()}<div class="wizard-content">${qrStepContent()}</div><div class="wizard-actions"><div>${state.qrStep > 1 && state.qrStep < 4 ? `<button class="button" data-action="qr-prev">${icon("arrow-left", "‹")}上一步</button>` : ""}</div><div>${state.qrStep === 4 ? `<button class="button" data-action="go-orders">查看码段台账</button><button class="button primary" data-action="download">${icon("download", "↓")}下载核心区块</button>` : `<button class="button primary" data-action="qr-next">${state.qrStep === 3 ? `${icon("sparkles", "·")}确认生成` : `下一步${icon("arrow-right", "›")}`}</button>`}</div></div></section>
  </div>`;
}

function opsOrders() {
  return `<div class="page">
    ${pageHeader("码段台账", "核对平台库存码段、分配对象与激活进度", `<button class="button primary" data-action="go-codes">${icon("qr-code", "▦")}生成码段批次</button><button class="button" data-action="export">${icon("download", "↓")}导出台账</button>`)}
    ${metricStrip([{label:"码段批次",value:"31",note:"2026 年累计",icon:"receipt-text"},{label:"码段总量",value:"680,000",note:"平台库存与已分配",icon:"qr-code"},{label:"已激活",value:"462,800",note:"68.1%",icon:"circle-check",up:true},{label:"剩余可用",value:"217,200",note:"待分配或待绑定",icon:"circle-dashed"}])}
    <div class="toolbar"><div class="filters"><div class="search-field">${icon("search", "⌕")}<input placeholder="分配对象或批次号"></div><input type="date" value="2026-07-01" aria-label="开始日期"><input type="date" value="2026-07-27" aria-label="结束日期"></div></div>
    <div class="table-shell"><div class="table-scroll"><table><colgroup><col style="width:17%"><col style="width:22%"><col style="width:23%"><col style="width:10%"><col style="width:10%"><col style="width:10%"><col style="width:8%"></colgroup><thead><tr><th>批次号</th><th>分配对象</th><th>序列号范围</th><th>总量</th><th>已激活</th><th>剩余可用</th><th>操作</th></tr></thead><tbody>${orders.map(o => `<tr><td class="mono">${o.no}</td><td>${o.customer || "未分配"}</td><td class="mono">${o.range}</td><td>${formatNumber(o.total)}</td><td>${formatNumber(o.active)}</td><td>${formatNumber(o.total-o.active)}</td><td><button class="text-action" data-action="order-detail">详情</button></td></tr>`).join("")}</tbody></table></div>${pagination(orders.length)}</div>
  </div>`;
}

function opsInventory() {
  return opsOrders();
}

function filteredProducts() {
  return products.filter(p => {
    const query = state.filter.trim().toLowerCase();
    const queryMatch = !query || `${p.name}${p.company}${p.batch}`.toLowerCase().includes(query);
    const statusMatch = state.reviewStatus === "全部状态" || p.status === state.reviewStatus;
    return queryMatch && statusMatch;
  });
}

function opsReviews() {
  const rows = filteredProducts();
  return `<div class="page">
    ${pageHeader("产品信息审核", "审核客户提交的资料，并在通过时同步激活订单码段", `<button class="button" data-action="refresh">${icon("refresh-cw", "↻")}刷新</button><button class="button primary" data-action="open-first-pending">${icon("clipboard-check", "✓")}处理待审核</button>`)}
    ${metricStrip([{label:"待审核",value:"3",note:"最早等待 2 小时",icon:"clock-3"},{label:"今日已通过",value:"8",note:"激活 84,000 枚",icon:"circle-check",up:true},{label:"今日已驳回",value:"1",note:"资料不完整",icon:"circle-x"},{label:"平均处理时长",value:"18 分钟",note:"较昨日减少 4 分钟",icon:"timer",up:true}])}
    <div class="toolbar"><div class="filters"><div class="search-field">${icon("search", "⌕")}<input id="product-search" value="${state.filter}" placeholder="产品、客户或批次"></div><select id="review-status" aria-label="审核状态"><option ${state.reviewStatus==="全部状态"?"selected":""}>全部状态</option><option ${state.reviewStatus==="待审核"?"selected":""}>待审核</option><option ${state.reviewStatus==="已激活"?"selected":""}>已激活</option><option ${state.reviewStatus==="已驳回"?"selected":""}>已驳回</option><option ${state.reviewStatus==="草稿"?"selected":""}>草稿</option></select><select aria-label="产品大类"><option>全部大类</option><option>农产品</option><option>加工食品</option><option>医疗卫生用品</option></select><button class="button small" data-action="clear-filters">重置</button></div><button class="button" data-action="export">${icon("download", "↓")}导出</button></div>
    <div class="table-shell"><div class="table-scroll"><table><colgroup><col style="width:24%"><col style="width:22%"><col style="width:12%"><col style="width:13%"><col style="width:11%"><col style="width:11%"><col style="width:7%"></colgroup><thead><tr><th>产品名称</th><th>客户</th><th>产品大类</th><th>批次</th><th>状态</th><th>提交时间</th><th>操作</th></tr></thead><tbody>${rows.length ? rows.map(p => `<tr><td><div class="cell-main">${p.name}</div><div class="cell-sub">${p.amount ? `${formatNumber(p.amount)} 枚码` : "未激活码段"}</div></td><td>${p.company}</td><td>${p.category}</td><td class="mono">${p.batch}</td><td>${status(p.status)}</td><td>${p.submitted}</td><td><button class="text-action" data-action="open-review" data-id="${p.id}">${p.status === "待审核" ? "审核" : "查看"}</button></td></tr>`).join("") : `<tr><td colspan="7"><div class="empty" style="min-height:210px"><div><div class="empty-icon">${icon("search-x", "×")}</div><h3>未找到匹配记录</h3><p>调整筛选条件后重试。</p><button class="button" data-action="clear-filters">清除筛选</button></div></div></td></tr>`}</tbody></table></div>${pagination(rows.length)}</div>
  </div>`;
}

function opsWithdrawals() {
  return `<div class="page">
    ${pageHeader("撤回审核", "审批已激活产品的码段或整产品撤回申请")}
    <div class="toolbar"><div class="filters"><div class="search-field">${icon("search", "⌕")}<input placeholder="申请编号、产品或客户"></div><select><option>全部状态</option><option>待审批</option><option>已通过</option><option>已驳回</option></select></div></div>
    <div class="table-shell"><div class="table-scroll"><table><colgroup><col style="width:15%"><col style="width:20%"><col style="width:21%"><col style="width:20%"><col style="width:10%"><col style="width:14%"></colgroup><thead><tr><th>申请编号</th><th>产品名称</th><th>客户</th><th>撤回原因</th><th>状态</th><th>操作</th></tr></thead><tbody>${withdrawals.map((w, idx) => `<tr><td class="mono">${w.no}</td><td>${w.product}</td><td>${w.customer}</td><td><div class="cell-main" title="${w.reason}">${w.reason}</div></td><td>${status(w.status)}</td><td>${w.status === "待审批" ? `<button class="text-action success-text" data-action="approve-withdrawal" data-index="${idx}">通过</button><button class="text-action danger-text" data-action="reject-withdrawal" data-index="${idx}">驳回</button>` : `<button class="text-action">查看</button>`}</td></tr>`).join("")}</tbody></table></div>${pagination(withdrawals.length)}</div>
  </div>`;
}

function messagesPage(isCustomer = false) {
  return `<div class="page">${pageHeader("站内信", isCustomer ? "查看审核、激活与撤回处理结果" : "查看系统向客户发送的业务通知", `<button class="button" data-action="mark-read">${icon("check-check", "✓")}全部已读</button>`)}<section class="panel"><div class="list" style="padding:0 16px">${messages.map(m => `<button type="button" class="list-item" style="width:100%;border-left:0;border-right:0;border-top:0;background:transparent;text-align:left" data-action="read-message"><span class="list-icon">${icon(m.unread ? "mail" : "mail-open", "·")}</span><div class="list-content"><div class="list-title">${m.title}${m.unread ? `<span style="display:inline-block;width:6px;height:6px;margin-left:7px;border-radius:50%;background:var(--info);vertical-align:middle"></span>` : ""}</div><div class="list-meta">${m.detail}</div></div><span class="muted nowrap" style="font-size:11px">${m.time}</span></button>`).join("")}</div></section></div>`;
}

function settingsPage(isCustomer = false) {
  return `<div class="page">${pageHeader("个人设置", isCustomer ? "客户账号安全设置" : "运营账号安全设置")}<div class="section-row"><section class="panel"><div class="panel-header"><h2>修改登录密码</h2></div><div class="panel-body"><div class="form-grid"><div class="field full"><label class="required">当前密码</label><input type="password" placeholder="输入当前密码"></div><div class="field"><label class="required">新密码</label><input type="password" placeholder="至少 8 位字符"></div><div class="field"><label class="required">确认新密码</label><input type="password" placeholder="再次输入新密码"></div><div class="field full"><div><button class="button primary" data-action="save-password">保存密码</button></div></div></div></div></section><aside class="panel"><div class="panel-header"><h2>当前账号</h2></div><div class="panel-body"><div class="list-item"><span class="avatar">${isCustomer ? "云岭" : "运营"}</span><div class="list-content"><div class="list-title">${isCustomer ? "云岭生态农业" : "平台运营中心"}</div><div class="list-meta">${isCustomer ? "yunling" : "operator_01"}</div></div></div></div></aside></div></div>`;
}

function renderOps() {
  const pages = { customers: opsCustomers, codes: opsCodes, orders: opsOrders, reviews: opsReviews, withdrawals: opsWithdrawals, messages: () => messagesPage(false), settings: () => settingsPage(false) };
  return shell("ops", pages[state.opsPage] ? pages[state.opsPage]() : opsOrders());
}

function customerOverview() {
  return `<div class="page">${pageHeader("数据概览", "云岭生态农业有限公司")}${metricStrip([{label:"订单总量",value:"2",note:"最近订单 7 月 22 日",icon:"receipt-text"},{label:"码段总量",value:"80,000",note:"2 个连续码段",icon:"qr-code"},{label:"已激活",value:"28,000",note:"35%",icon:"circle-check",up:true},{label:"未激活",value:"52,000",note:"可用余额",icon:"circle-dashed"}])}<div class="section-row"><section class="panel"><div class="panel-header"><h2>最近订单</h2><button class="button small" data-action="customer-products">查看全部</button></div><div class="table-scroll"><table><thead><tr><th>订单号</th><th>总量</th><th>已激活</th><th>剩余</th></tr></thead><tbody><tr><td class="mono">ORD-202607-031</td><td>50,000</td><td>10,000</td><td>40,000</td></tr><tr><td class="mono">ORD-202606-072</td><td>30,000</td><td>18,000</td><td>12,000</td></tr></tbody></table></div></section><section class="panel"><div class="panel-header"><h2>产品状态</h2></div><div class="panel-body list"><div class="list-item"><span class="list-icon">${icon("clock-3", "·")}</span><div class="list-content"><div class="list-title">待审核</div><div class="list-meta">云岭高山绿茶</div></div><strong>1</strong></div><div class="list-item"><span class="list-icon">${icon("circle-check", "✓")}</span><div class="list-content"><div class="list-title">已激活</div><div class="list-meta">春芽红茶、古树晒青</div></div><strong>2</strong></div><div class="list-item"><span class="list-icon">${icon("file-pen-line", "·")}</span><div class="list-content"><div class="list-title">草稿</div><div class="list-meta">等待继续编辑</div></div><strong>1</strong></div></div></section></div></div>`;
}

function customerProducts() {
  const customerProductsData = products.filter(p => p.company.includes("云岭") || p.id === 3);
  return `<div class="page">${pageHeader("产品信息", "维护产品资料、预览扫码效果并提交审核", `<button class="button primary" data-action="customer-new-product">${icon("plus", "+")}新建产品</button>`)}<div class="toolbar"><div class="filters"><div class="search-field"><label class="filter-field-label">产品名称或批次</label><input placeholder="请输入" aria-label="产品名称或批次"></div><select><option>全部状态</option><option>草稿</option><option>待审核</option><option>已激活</option></select></div></div><div class="table-shell"><div class="table-scroll"><table><thead><tr><th>产品名称</th><th>产品大类</th><th>批次</th><th>状态</th><th>已激活码量</th><th>操作</th></tr></thead><tbody>${customerProductsData.map(p => `<tr><td><div class="cell-main">${p.name}</div></td><td>${p.category}</td><td class="mono">${p.batch}</td><td>${status(p.status)}</td><td>${formatNumber(p.amount)}</td><td><div class="table-actions">${p.status === "已激活" ? `<button class="text-action" data-action="customer-preview">查看</button>` : `<button class="text-action" data-action="customer-edit-product">编辑</button><button class="text-action" data-action="customer-preview">预览码</button>`}</div></td></tr>`).join("")}</tbody></table></div>${pagination(customerProductsData.length)}</div></div>`;
}

const productSteps = ["产品信息", "企业信息", "生产单位", "质量信息", "生产追溯"];

function productStepper() {
  return `<div class="stepper">${productSteps.map((label, index) => `<button type="button" class="step ${state.productStep === index ? "active" : ""} ${state.productStep > index ? "done" : ""}" data-action="product-step" data-step="${index}" style="border-top:0;border-left:0;border-bottom:${index===productSteps.length-1?0:""}"><span class="step-number">${state.productStep > index ? icon("check", "✓") : index + 1}</span><span class="step-label">${label}</span></button>`).join("")}</div>`;
}

function productForm() {
  if (state.productStep === 0) return `<div class="form-grid"><div class="field"><label class="required">产品名称</label><input value="云岭高山绿茶"></div><div class="field"><label class="required">产品品牌</label><input value="云岭春芽"></div><div class="field"><label>产品大类</label><select><option>农产品</option><option>养殖品</option><option>加工食品</option></select></div><div class="field"><label>产品子类</label><input value="茶叶"></div><div class="field"><label class="required">产品批次</label><input value="YL20260718"></div><div class="field"><label>产品产地</label><input value="云南省临沧市双江县"></div><div class="field"><label>生产日期</label><input type="date" value="2026-07-18"></div><div class="field"><label>保质期</label><input value="18 个月"></div><div class="field full"><label>产品介绍</label><textarea>精选海拔 1,800 米以上春季嫩芽，经摊青、杀青、揉捻和低温干燥制成，汤色清亮，清香持久。</textarea></div><div class="field full"><label>产品主图</label><div class="upload-box">${icon("image-plus", "+", "icon-lg")}<strong>拖拽或选择产品图片</strong><span>JPG / PNG · 示例已上传 1 张</span></div></div></div>`;
  if (state.productStep === 1) return `<div class="form-grid"><div class="field"><label class="required">公司名称</label><input value="云岭生态农业有限公司"></div><div class="field"><label>公司电话</label><input value="0883-661 2098"></div><div class="field full"><label>公司地址</label><input value="云南省临沧市双江县勐库镇茶山路 18 号"></div><div class="field full"><label>公司介绍</label><textarea>专注高山生态茶园种植、初制加工与品质管理，建立从茶园地块到成品批次的全流程记录。</textarea></div><div class="field full"><label>营业执照与资质</label><div class="file-row">${icon("file-text", "□")}<span class="file-name">营业执照_云岭生态农业.pdf</span><span class="muted">2.4 MB</span><button class="icon-button" title="删除" aria-label="删除">${icon("x", "×")}</button></div><div class="file-row">${icon("badge-check", "✓")}<span class="file-name">有机产品认证证书.pdf</span><span class="muted">1.8 MB</span><button class="icon-button" title="删除" aria-label="删除">${icon("x", "×")}</button></div></div></div>`;
  if (state.productStep === 2) return `<div class="form-grid"><div class="field"><label class="required">生产单位</label><input value="云岭生态农业茶叶初制所"></div><div class="field"><label>生产地址</label><input value="双江县勐库镇大雪山村"></div><div class="field full"><label>独特工艺流程</label><textarea>鲜叶验收 → 自然摊青 → 高温杀青 → 揉捻成形 → 低温干燥 → 分级包装。</textarea></div><div class="field"><label>关键生产设备</label><input value="6CST-80 滚筒杀青机"></div><div class="field"><label>生产许可证</label><input value="SC11453092501826"></div><div class="field full"><label>生产环境图片</label><div class="upload-box">${icon("image-plus", "+", "icon-lg")}<strong>已上传茶园环境图片</strong><span>tea-field.jpg · 324 KB</span></div></div></div>`;
  if (state.productStep === 3) return `<div class="form-grid"><div class="field full"><label>产品检测报告</label><div class="file-row">${icon("file-check-2", "✓")}<span class="file-name">YL20260718_产品检测报告.pdf</span><span class="muted">检测日期 2026-07-20</span><button class="icon-button" title="预览" aria-label="预览">${icon("eye", "○")}</button></div></div><div class="field"><label>认证名称</label><input value="有机产品认证"></div><div class="field"><label>证书编号</label><input value="ORG-CN-2026-1886"></div><div class="field full"><label>质量说明</label><textarea>本批次水分、灰分、农残等检测项目均符合 GB/T 14456.1-2017 要求。</textarea></div><div class="field full"><label>自由新增项</label><div style="display:flex;gap:8px"><input style="flex:.7" value="茶多酚含量"><input style="flex:1" value="18.6%"><button class="icon-button bordered" title="删除字段" aria-label="删除字段">${icon("trash-2", "×")}</button></div></div></div>`;
  return `<div class="form-grid"><div class="field full"><label>追溯记录 1</label><div style="display:grid;grid-template-columns:150px 1fr;gap:8px"><input type="date" value="2026-03-12"><input value="春季茶园有机肥施用完成"></div></div><div class="field full"><label>追溯记录 2</label><div style="display:grid;grid-template-columns:150px 1fr;gap:8px"><input type="date" value="2026-07-18"><input value="鲜叶采摘并送达初制所"></div></div><div class="field full"><label>追溯记录 3</label><div style="display:grid;grid-template-columns:150px 1fr;gap:8px"><input type="date" value="2026-07-20"><input value="批次检测合格，完成分级包装"></div></div><div class="field full"><button class="button" type="button">${icon("plus", "+")}新增追溯条目</button></div></div>`;
}

function customerEditor() {
  return `<div class="page">${pageHeader("编辑产品 · 云岭高山绿茶", "草稿已于 10:24 自动保存", `<span class="save-state">已保存</span><button class="button" data-action="customer-preview">${icon("qr-code", "▦")}预览码</button><button class="button primary" data-action="submit-product">提交审核</button>`)}${productStepper()}<div class="editor-layout"><section class="form-section"><h2>${productSteps[state.productStep]}</h2>${productForm()}</section><aside class="panel sticky-side"><div class="panel-header"><h2>资料完整度</h2><strong>${[92,88,84,96,76][state.productStep]}%</strong></div><div class="panel-body"><div style="height:8px;background:var(--surface-muted);border-radius:var(--r-lg);overflow:hidden"><div style="height:100%;width:${[92,88,84,96,76][state.productStep]}%;background:var(--primary)"></div></div><div class="list" style="margin-top:12px"><div class="list-item"><span class="list-icon">${icon("check", "✓")}</span><div class="list-content"><div class="list-title">标准字段</div><div class="list-meta">必填项已完成</div></div></div><div class="list-item"><span class="list-icon">${icon("image", "□")}</span><div class="list-content"><div class="list-title">图片与 PDF</div><div class="list-meta">共 5 个附件</div></div></div></div></div><div class="drawer-foot" style="border-top:1px solid var(--border-light)"><button class="button" data-action="product-prev" ${state.productStep===0?"disabled":""}>上一步</button><button class="button primary" data-action="product-next">${state.productStep===4?"保存草稿":"保存并继续"}</button></div></aside></div></div>`;
}

function customerWithdrawals() {
  return `<div class="page">${pageHeader("撤回申请", "选择产品的一个或多个已绑码段发起撤回申请", `<button class="button primary" data-action="fx-open-withdraw">${icon("plus", "+")}发起申请</button>`)}<div class="table-shell"><div class="table-scroll"><table><thead><tr><th>申请编号</th><th>产品名称</th><th>撤回码段</th><th>撤回原因</th><th>申请时间</th><th>状态</th><th>处理说明</th></tr></thead><tbody><tr><td class="mono">WD-202607-006</td><td>云岭春芽红茶</td><td class="mono">YL00880001–YL00892000</td><td>批次质检资料更新</td><td>2026-07-24 15:06</td><td>${status("已通过")}</td><td>选定码段已重置</td></tr><tr><td class="mono">WD-202606-011</td><td>古树晒青毛茶</td><td class="mono">YL00893001–YL00909000</td><td>生产单位信息更正</td><td>2026-06-18 11:30</td><td>${status("已驳回")}</td><td>请联系运营方直接修改</td></tr></tbody></table></div>${pagination(2)}</div></div>`;
}

function renderCustomer() {
  const pages = { overview: customerOverview, products: customerProducts, editor: customerEditor, withdrawals: customerWithdrawals, messages: () => messagesPage(true), settings: () => settingsPage(true) };
  return shell("customer", pages[state.customerPage] ? pages[state.customerPage]() : customerProducts());
}

function qrMarkup(seed = "preview") {
  let value = 0;
  for (const char of seed) value += char.charCodeAt(0);
  const cells = [];
  for (let row = 0; row < 21; row += 1) {
    for (let col = 0; col < 21; col += 1) {
      const finder = (row < 7 && col < 7) || (row < 7 && col > 13) || (row > 13 && col < 7);
      const finderOn = finder && ((row % 6 === 0) || (col % 6 === 0) || ((row % 6 > 1 && row % 6 < 5) && (col % 6 > 1 && col % 6 < 5)));
      const dataOn = ((row * 17 + col * 29 + value) % 7) < 3;
      cells.push(`<i class="${finder ? (finderOn ? "on" : "") : (dataOn ? "on" : "")}"></i>`);
    }
  }
  return `<div class="qr-preview"><div class="qr-grid" aria-label="二维码预览">${cells.join("")}</div></div>`;
}

function scanProductTab() {
  const expanded = state.scanProductExpanded;
  return `<section class="content-section"><div class="content-section-heading"><h3>产品信息</h3><button type="button" class="icon-button scan-section-toggle" data-action="fx-toggle-product-details" aria-expanded="${expanded}" aria-controls="scan-product-extra" title="${expanded ? "收起产品描述" : "展开产品描述"}">${icon(expanded ? "chevron-up" : "chevron-down", expanded ? "⌃" : "⌄")}</button></div><dl class="info-list"><div class="info-line"><dt>产品名称</dt><dd>云岭高山绿茶</dd></div><div class="info-line"><dt>产品品牌</dt><dd>云岭春芽</dd></div><div class="info-line"><dt>产品大类</dt><dd>农产品</dd></div><div class="info-line"><dt>产品小类</dt><dd>茶叶</dd></div><div class="info-line"><dt>产品批次</dt><dd class="mono">YL20260718</dd></div>${expanded ? `<div id="scan-product-extra"><dt>产品产地</dt><dd>云南省临沧市双江县</dd></div><div><dt>生产日期</dt><dd>2026-07-18</dd></div><div><dt>保质期</dt><dd>18 个月</dd></div><div><dt>储存条件</dt><dd>密封、避光、防潮、无异味环境</dd></div><div><dt>执行标准</dt><dd>GB/T 14456.1-2017</dd></div><div><dt>产品介绍</dt><dd>精选海拔 1,800 米以上春季嫩芽，经摊青、杀青、揉捻和低温干燥制成。</dd></div>` : ""}</dl></section>`;
}

function scanCompanyTab() {
  return `<section class="content-section"><h3>企业信息</h3><p>云岭生态农业有限公司专注高山生态茶园种植、初制加工与品质管理，建立从茶园地块到成品批次的全流程记录。</p><dl class="info-list"><div class="info-line"><dt>公司名称</dt><dd>云岭生态农业有限公司</dd></div><div class="info-line"><dt>公司地址</dt><dd>云南省临沧市双江县勐库镇茶山路 18 号</dd></div><div class="info-line"><dt>联系电话</dt><dd>0883-661 2098</dd></div></dl></section><section class="content-section"><h3>企业证照</h3><div class="doc-grid"><div class="doc-tile"><div class="doc-preview">${icon("file-text", "PDF", "icon-lg")}</div><strong>营业执照</strong><span>PDF · 在线预览</span></div><div class="doc-tile"><div class="doc-preview">${icon("badge-check", "✓", "icon-lg")}</div><strong>有机产品认证</strong><span>PDF · 有效期内</span></div></div></section>`;
}

function scanProductionTab() {
  return `<section class="content-section"><h3>生产环境</h3><div class="detail-media"><img src="assets/tea-field.jpg" alt="高山茶园生产环境"></div><p>茶园位于云南高海拔山地，采用人工除草与生态防控，鲜叶采摘后 2 小时内送达初制所。</p></section><section class="content-section"><h3>工艺流程</h3><div class="trace-list"><div class="trace-item"><div class="trace-date">鲜叶验收</div><div class="trace-title">分级检查与摊青</div><div class="trace-note">按嫩度和完整度分级，室内自然摊青。</div></div><div class="trace-item"><div class="trace-date">初制加工</div><div class="trace-title">杀青、揉捻与干燥</div><div class="trace-note">关键温度与时长均形成批次记录。</div></div><div class="trace-item"><div class="trace-date">成品包装</div><div class="trace-title">分级、复检与密封</div><div class="trace-note">包装前完成水分与感官复检。</div></div></div></section>`;
}

function scanQualityTab() {
  return `<section class="content-section"><h3>质量检测</h3><p>本批次水分、灰分、农残等检测项目符合 GB/T 14456.1-2017 要求，报告日期在同批次六个月范围内。</p><div class="doc-grid" style="margin-top:14px"><div class="doc-tile"><div class="doc-preview">${icon("file-check-2", "✓", "icon-lg")}</div><strong>产品检测报告</strong><span>2026-07-20</span></div><div class="doc-tile"><div class="doc-preview">${icon("award", "◇", "icon-lg")}</div><strong>有机产品认证</strong><span>2026-01-18</span></div><div class="doc-tile"><div class="doc-preview">${icon("shield-check", "✓", "icon-lg")}</div><strong>实地验证证书</strong><span>2026-03-08</span></div><div class="doc-tile"><div class="doc-preview">${icon("medal", "◇", "icon-lg")}</div><strong>高山生态茶奖</strong><span>2025 年度</span></div></div></section>`;
}

function scanTraceTab() {
  return `<section class="content-section"><h3>生产追溯</h3><div class="trace-list"><div class="trace-item"><div class="trace-date">2026-03-12</div><div class="trace-title">春季茶园管护</div><div class="trace-note">完成有机肥施用，地块编号 YL-CY-07。</div></div><div class="trace-item"><div class="trace-date">2026-07-18 · 07:20</div><div class="trace-title">鲜叶采摘</div><div class="trace-note">采摘人 12 名，当日温度 21°C。</div></div><div class="trace-item"><div class="trace-date">2026-07-18 · 10:10</div><div class="trace-title">鲜叶入厂</div><div class="trace-note">验收重量 286 kg，嫩度与洁净度合格。</div></div><div class="trace-item"><div class="trace-date">2026-07-19</div><div class="trace-title">初制与分级</div><div class="trace-note">完成杀青、揉捻、干燥和等级筛分。</div></div><div class="trace-item"><div class="trace-date">2026-07-20</div><div class="trace-title">检验与包装</div><div class="trace-note">抽样检测合格，完成密封包装并入库。</div></div></div></section>`;
}

function scanActive() {
  const tabs = [["product","产品"],["company","企业"],["production","生产"],["quality","质量"],["trace","追溯"]];
  const contents = { product: scanProductTab, company: scanCompanyTab, production: scanProductionTab, quality: scanQualityTab, trace: scanTraceTab };
  return `<div class="scan-shell"><div class="mobile-topbar"><button class="icon-button" title="返回" aria-label="返回">${icon("chevron-left", "‹")}</button><h1>溯源质控码</h1><button class="icon-button" title="更多" aria-label="更多">${icon("ellipsis", "⋯")}</button></div><div class="product-hero"><img src="assets/tea-product.jpg" alt="云岭高山绿茶冲泡展示"></div><div class="product-summary"><div class="verified-row"><span class="status success">信息已激活</span><span class="mono muted">YL00018642</span></div><h2>云岭高山绿茶</h2><p>云岭春芽 · 2026 夏季高山茶批次</p><div class="scan-meta"><div><span>扫码查询</span><strong>第 186 次</strong></div><div><span>最近查询</span><strong>刚刚</strong></div></div></div><nav class="tabs" aria-label="溯源内容模块">${tabs.map(([key,label]) => `<button type="button" class="tab ${state.scanTab===key?"active":""}" data-action="scan-tab" data-tab="${key}">${label}</button>`).join("")}</nav><div class="scan-content">${contents[state.scanTab]()}</div></div>`;
}

function scanStateMarkup(type) {
  const inactive = type === "inactive";
  return `<div class="scan-shell"><div class="mobile-topbar"><button class="icon-button" title="返回" aria-label="返回">${icon("chevron-left", "‹")}</button><h1>溯源质控码</h1><button class="icon-button" title="更多" aria-label="更多">${icon("ellipsis", "⋯")}</button></div><div class="scan-state"><div><div class="scan-state-icon">${icon(inactive ? "qr-code" : "refresh-cw", inactive ? "▦" : "↻", "icon-lg")}</div><h2>${inactive ? "该码暂未激活" : "信息已更新"}</h2><p>${inactive ? "当前溯源码尚未关联产品信息，请确认包装上的码是否完整。" : "该产品的原展示信息已撤回。如需了解最新信息，请联系产品提供方。"}</p><div class="scan-code mono">码号 ${inactive ? "YL00108216" : "YL00072801"}</div></div></div></div>`;
}

function renderScan() {
  return `${globalBar()}<div class="shell"><main class="scan-stage"><div class="scan-toolbar"><span class="scan-toolbar-label">扫码状态</span><div class="segmented" role="tablist" aria-label="扫码状态切换"><button data-action="scan-status" data-status="active" aria-selected="${state.scanStatus === "active"}">已激活</button><button data-action="scan-status" data-status="inactive" aria-selected="${state.scanStatus === "inactive"}">未激活</button><button data-action="scan-status" data-status="reset" aria-selected="${state.scanStatus === "reset"}">已重置</button></div></div>${state.scanStatus === "active" ? scanActive() : scanStateMarkup(state.scanStatus)}<div class="asset-credit">示例图片：Unsplash 与 Wikimedia Commons，仅用于原型展示</div></main></div>${portalSwitcher()}${modalMarkup()}`;
}

function drawerMarkup() {
  if (!state.drawerProductId) return "";
  const product = products.find(p => p.id === state.drawerProductId);
  if (!product) return "";
  return `<div class="drawer-backdrop" data-action="close-drawer"><aside class="drawer" role="dialog" aria-modal="true" aria-label="产品审核详情" onclick="event.stopPropagation()"><div class="drawer-head"><div><h2>${product.name}</h2><p>${product.company} · ${product.batch}</p></div><button class="icon-button" type="button" title="关闭" aria-label="关闭" data-action="close-drawer">${icon("x", "×")}</button></div><div class="drawer-body"><div class="detail-section"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px"><h3 style="margin:0">审核状态</h3>${status(product.status)}</div></div><section class="detail-section"><h3>产品信息</h3><dl class="detail-grid"><div class="detail-item"><dt>产品品牌</dt><dd>云岭春芽</dd></div><div class="detail-item"><dt>产品大类</dt><dd>${product.category}</dd></div><div class="detail-item"><dt>产品产地</dt><dd>云南省临沧市双江县</dd></div><div class="detail-item"><dt>生产日期</dt><dd>2026-07-18</dd></div><div class="detail-item"><dt>保质期</dt><dd>18 个月</dd></div><div class="detail-item"><dt>执行标准</dt><dd>GB/T 14456.1-2017</dd></div></dl></section><section class="detail-section"><h3>企业与生产单位</h3><dl class="detail-grid"><div class="detail-item"><dt>公司名称</dt><dd>${product.company}</dd></div><div class="detail-item"><dt>生产单位</dt><dd>云岭生态农业茶叶初制所</dd></div><div class="detail-item"><dt>生产许可证书及认证证书</dt><dd class="mono">SC11453092501826</dd></div><div class="detail-item"><dt>附件</dt><dd>营业执照、认证证书等 5 项</dd></div></dl></section><section class="detail-section"><h3>质量与追溯</h3><div class="file-row">${icon("file-check-2", "✓")}<span class="file-name">YL20260718_产品检测报告.pdf</span><button class="button small">预览</button></div><div class="file-row">${icon("badge-check", "✓")}<span class="file-name">有机产品认证证书.pdf</span><button class="button small">预览</button></div><div class="audit-line"><span class="audit-dot"></span><div><div class="list-title">2026-07-18 · 鲜叶采摘并送达初制所</div><div class="list-meta">地块编号 YL-CY-07</div></div></div><div class="audit-line"><span class="audit-dot"></span><div><div class="list-title">2026-07-20 · 批次检测合格并完成包装</div><div class="list-meta">检测报告在六个月有效范围内</div></div></div></section><section class="detail-section"><h3>提交记录</h3><div class="audit-line"><span class="audit-dot"></span><div><div class="list-title">客户提交审核</div><div class="list-meta">2026-07-26 16:42 · 操作人 张婧</div></div></div></section></div><div class="drawer-foot">${product.status === "待审核" ? `<button class="button danger" data-action="reject-review">驳回</button><button class="button primary" data-action="approve-review">通过并激活</button>` : `<button class="button" data-action="close-drawer">关闭</button>`}</div></aside></div>`;
}

function modalMarkup() {
  if (!state.modal) return "";
  let title = "";
  let subtitle = "";
  let body = "";
  let foot = "";
  if (state.modal === "activation") {
    title = "审核通过并激活码段";
    subtitle = "审核和码段激活将作为同一业务动作完成。";
    body = `<div class="form-grid"><div class="field full"><label>产品</label><input value="云岭高山绿茶 · YL20260718" readonly></div><div class="field full"><label class="required">选择订单</label><select><option>ORD-202607-031 · 可用 40,000 枚</option><option>ORD-202606-072 · 可用 12,000 枚</option></select></div><div class="field"><label class="required">本次激活数量</label><input id="activation-amount" type="number" min="1" max="40000" value="10000"></div><div class="field"><label>激活后剩余</label><input value="30,000 枚" readonly></div></div>`;
    foot = `<button class="button" data-action="close-modal">取消</button><button class="button primary" data-action="confirm-activation">确认通过并激活</button>`;
  } else if (state.modal === "reject") {
    title = "驳回产品资料";
    subtitle = "产品将退回草稿，客户会收到驳回原因。";
    body = `<div class="field"><label class="required">驳回原因</label><textarea id="reject-reason" placeholder="请具体说明需要修改的字段">检测报告未填写报告日期，请补充后重新提交。</textarea></div>`;
    foot = `<button class="button" data-action="close-modal">取消</button><button class="button danger" data-action="confirm-reject">确认驳回</button>`;
  } else if (state.modal === "new-customer") {
    title = "新建客户账号";
    subtitle = "账号创建后可由客户登录独立后台。";
    body = `<div class="form-grid"><div class="field full"><label class="required">客户名称</label><input id="new-customer-name" placeholder="输入营业执照上的企业名称"></div><div class="field"><label class="required">登录账号</label><input placeholder="例如 company_admin"></div><div class="field"><label class="required">初始密码</label><input type="password" value="Trace@2026"></div><div class="field"><label class="required">联系电话</label><input placeholder="手机号或座机"></div><div class="field"><label>账号状态</label><select><option>启用</option><option>禁用</option></select></div><div class="field full"><label class="required">企业证照</label><div class="upload-box">${icon("upload", "↑", "icon-lg")}<strong>上传营业执照与法人身份证</strong><span>支持 JPG / PNG</span></div></div></div>`;
    foot = `<button class="button" data-action="close-modal">取消</button><button class="button primary" data-action="confirm-new-customer">创建账号</button>`;
  } else if (state.modal === "preview") {
    title = "扫码预览";
    subtitle = "预览码不占订单额度，展示最新已保存内容。";
    body = `${qrMarkup("cloud-tea-preview")}<div style="text-align:center"><strong>云岭高山绿茶</strong><div class="muted" style="font-size:12px;margin-top:3px">预览码 · 无有效期</div></div>`;
    foot = `<button class="button" data-action="regenerate-preview">${icon("refresh-cw", "↻")}重新生成</button><button class="button primary" data-action="close-modal">完成</button>`;
  } else if (state.modal === "submit-product") {
    title = "提交产品审核";
    subtitle = "提交后资料将变为只读，审核结果通过站内信通知。";
    body = `<div class="confirm-list"><div class="confirm-row"><span>产品</span><strong>云岭高山绿茶</strong></div><div class="confirm-row"><span>完整度</span><strong>87%</strong></div></div>`;
    foot = `<button class="button" data-action="close-modal">返回检查</button><button class="button primary" data-action="confirm-submit-product">确认提交</button>`;
  } else if (state.modal === "withdraw-approve") {
    title = "确认通过撤回申请";
    subtitle = "此操作将重置申请中选定的已绑码段。";
    body = `<div class="confirm-list"><div class="confirm-row"><span>产品</span><strong>有机稻花香米</strong></div><div class="confirm-row"><span>影响码量</span><strong>20,000 枚</strong></div><div class="confirm-row"><span>结果</span><strong>扫码端显示“信息已更新”</strong></div></div>`;
    foot = `<button class="button" data-action="close-modal">取消</button><button class="button danger" data-action="confirm-withdraw-approve">确认通过并重置</button>`;
  } else if (state.modal === "message") {
    title = "消息详情";
    subtitle = "审核提醒 · 2026-07-27 10:32";
    body = `<div class="detail-section"><h3>云岭高山绿茶等待审核</h3><p style="margin:0">客户已提交产品信息，包含产品、企业、生产单位、产品质量和生产追溯五个模块，共 5 个附件。</p></div><div class="confirm-list"><div class="confirm-row"><span>客户</span><strong>云岭生态农业有限公司</strong></div><div class="confirm-row"><span>批次</span><strong class="mono">YL20260718</strong></div></div>`;
    foot = `<button class="button primary" data-action="close-modal">知道了</button>`;
  } else return "";
  return `<div class="modal-backdrop" data-action="close-modal"><section class="modal" role="dialog" aria-modal="true" aria-label="${title}" onclick="event.stopPropagation()"><div class="modal-head"><div><h2>${title}</h2><p>${subtitle}</p></div><button class="icon-button" type="button" title="关闭" aria-label="关闭" data-action="close-modal">${icon("x", "×")}</button></div><div class="modal-body">${body}</div><div class="modal-foot">${foot}</div></section></div>`;
}
