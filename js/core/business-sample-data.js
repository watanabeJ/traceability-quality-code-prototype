"use strict";

// Refresh supplied examples once, preserving identities, payloads and later user edits.
const traceBusinessSeedVersion = "business-catalog-20261102-v4";
const traceBusinessSeedKey = "trace-business-catalog-version";
async function traceRefreshBusinessSamples() {
  return omLock(async () => {
    const lists = { customers, orders, codeBatches, products, bindRequests, withdrawals, messages };
    for (const [name, list] of Object.entries(lists)) {
      const saved = fxStore.get(fxBusinessStorage[name], null);
      if (Array.isArray(saved)) list.splice(0, list.length, ...saved);
    }
    if (fxStore.get(traceBusinessSeedKey)?.version === traceBusinessSeedVersion) {
      window.TRACE_BUSINESS_DATA = fxStore.get(traceBusinessSeedKey);
      return;
    }
    const storageBefore = new Map();
    const save = (key, value) => {
      const fullKey = `copy-20261022:${key}`;
      if (!storageBefore.has(fullKey)) storageBefore.set(fullKey, localStorage.getItem(fullKey));
      localStorage.setItem(fullKey, JSON.stringify(value));
    };
    const before = Object.fromEntries(Object.entries(lists).map(([name, list]) => [name, fxClone(list)]));
    const addedPayloads = [];
    const profiles = {
      yunling: ["云栖山禾农业有限公司", "云栖山禾", "云南省临沧市双江县勐库镇", "0883-6271836", "13890127788"],
      beichen: ["禾川田园食品有限公司", "禾川田园", "四川省眉山市洪雅县洪川镇", "028-37468216", "13922883106"],
      songye: ["松涧食业有限公司", "松涧", "四川省成都市蒲江县寿安街道", "028-88631257", "13756012088"],
      anhu: ["瑞禾康健用品有限公司", "瑞禾康健", "浙江省湖州市德清县武康街道", "0572-8436172", "13688306799"],
      demo_shared: ["青岚茶业有限公司", "青岚", "云南省普洱市思茅区南屏镇", "0879-2836915", "13987926185", "qinglan"],
      demo_empty: ["竹里山集商贸有限公司", "竹里山集", "浙江省湖州市安吉县递铺街道", "0572-5216398", "13857216493", "zhuli"],
      demo_disabled: ["溪源茶业有限公司", "溪源", "福建省南平市武夷山市星村镇", "0599-5286319", "13695086372", "xiyuan"],
      demo_main: ["云溪茶业有限公司", "云溪", "云南省临沧市临翔区凤翔街道", "0883-2126398", "13988362157", "yunxi"],
    };
    const businessNames = ["秋季渠道补货", "门店常规补货", "礼盒渠道发货", "产地直供批次", "经销商订货", "电商仓备货"];
    const looksSample = value => /测试|演示|样例|样张|联调|DEMO|mock|跨品类隔离|多状态|刚创建|暂无绑定|主流程|用例/i.test(String(value || ""));
    const names = new Map();
    const references = new Map();
    const productRefs = new Map();
    const profileById = new Map();
    const oldAccounts = new Map();
    const operatorsBefore = fxClone(fxOperators);
    const operatorNames = new Map([["平台管理员", "陈启明"], ["审核专员", "林晓岚"], ["订单专员", "周文博"], ["订单专员（测试数据）", "周文博"]]);
    function text(value) {
      if (typeof value !== "string") return value;
      let result = value;
      for (const [oldName, name] of [...names].sort((a, b) => b[0].length - a[0].length)) {
        if (oldName) result = result.split(oldName).join(name);
      }
      for (const [oldName, name] of operatorNames) result = result.split(oldName).join(name);
      return result.replace(/【(?:测试|联通测试|测试产品|测试样张)】/g, "")
        .replace(/（测试数据）|（测试）|（模拟下载）/g, "")
        .replace(/测试批次/g, "生产批次");
    }
    function rewrite(row) {
      if (Array.isArray(row)) return row.map(rewrite);
      if (!row || typeof row !== "object") return text(row);
      return Object.fromEntries(Object.entries(row).map(([key, value]) =>
        [key, typeof value === "string" && /^(no|.*No)$/.test(key) && references.has(value) ? references.get(value) :
          /^(id|.*Id|.*ID|account|password|demoTag|demoKey|no|.*No|range|.*Range|src|scanBase)$/.test(key) ? value : rewrite(value)]));
    }
    function catalog(category, index) {
      if (/肉|腊|香肠/.test(category)) return {
        names: ["柏香五花腊肉", "山乡烟熏腊肉", "手作川味香肠"], subcategory: "传统腌腊制品",
        specification: "500 g / 袋", shelfLife: "180 天", storage: "0～4 ℃ 冷藏，开袋后尽快食用",
        standard: "GB 2730", intro: "选用分割猪肉，经修整、配料腌制、低温风干及柏木熏制，按批次分装。适合蒸制或切片炒食，食用前充分加热。",
        process: "原料验收 → 分割修整 → 配料腌制 → 风干 → 熏制 → 检验 → 真空包装",
        equipment: "冷藏库、滚揉机、控温风干房、真空包装机、金属检测仪",
        images: ["assets/business-catalog/cured-pork.jpg"], environment: "",
      };
      if (/工艺|竹|木|陶/.test(category)) return {
        names: ["竹编收纳篮", "手编茶席收纳篮", "竹编提篮"], subcategory: "竹编家居用品",
        specification: ["中号 / 28 × 20 × 12 cm", "小号 / 22 × 16 × 10 cm", "大号 / 32 × 24 × 16 cm"][index % 3],
        shelfLife: "长期使用", storage: "通风干燥保存，避免长时间浸水和暴晒",
        standard: "企业成品检验规程", intro: "选用竹材，经剖篾、打磨、手工编织和收口定型制作。适合茶具、干货及居家小物收纳，竹纹和色泽随材料自然变化。",
        process: "选竹 → 剖篾 → 晾干 → 打磨 → 手工编织 → 收口定型 → 成品检查",
        equipment: "开篾机、定宽刀具、打磨设备、定型模具",
        images: ["assets/business-catalog/bamboo-basket.jpg"], environment: "",
      };
      return {
        names: ["高山春芽绿茶", "明前毛峰绿茶", "高山翠芽绿茶", "春采嫩芽绿茶", "山岚清香绿茶"],
        subcategory: "绿茶", specification: ["100 g / 盒", "250 g / 袋", "50 g × 2 罐 / 盒"][index % 3],
        shelfLife: "18 个月", storage: "密封、避光、防潮、防异味保存",
        standard: "GB/T 14456.1", intro: "精选春季鲜叶，分级验收后经摊青、杀青、揉捻和低温干燥制成。条索匀整，茶汤清亮，滋味鲜爽。建议使用玻璃杯，以 85 ℃ 左右水温冲泡。",
        process: "鲜叶验收 → 摊青 → 杀青 → 揉捻 → 干燥 → 分级 → 检验 → 包装",
        equipment: "滚筒杀青机、揉捻机、热风干燥机、色选机、称量包装机",
        images: ["assets/demo-case/product-package-final.jpg", "assets/demo-case/product-brew-detail.jpg", "assets/demo-case/product-dry-leaves.jpg"],
        environment: "assets/tea-field.jpg",
      };
    }
    try {
      if (!fxStore.get("trace-business-catalog-backup-v1")) {
        save("trace-business-catalog-backup-v1", { savedAt: omNow(), lists: before,
          categories: fxCategories(), categoryAudit: fxStore.get(fxCategoryAuditKey, []), operators: operatorsBefore });
      }
      const categoryItems = fxCategories();
      let meat = categoryItems.find(row => row.name === "腊肉");
      if (!meat) {
        const occupied = new Set(categoryItems.map(row => row.productNumber));
        const productNumber = Array.from({ length: 99 }, (_, i) => String(i + 1).padStart(2, "0")).find(number => !occupied.has(number));
        if (productNumber) {
          meat = { id: crypto.randomUUID(), name: "腊肉", productNumber, status: "启用",
            remark: "传统腌腊制品", operator: "陈启明", createdAt: "2026-10-01 10:12:00" };
          categoryItems.push(meat);
        }
      }
      let nextProductId = Math.max(870000, ...products.map(row => Number(row.id) || 0));
      const numberPool = new Set();
      if (meat) for (const order of orders.filter(omOccupiesNumbers)) {
        const meatLines = (order.lines || []).filter(line => line.productNumber === meat.productNumber);
        if (!meatLines.length) continue;
        const payload = await omPayload(order.no);
        if (!payload) throw new Error(`订单 ${order.no} 的码包缺失，未更新业务资料`);
        meatLines.forEach(line => {
          const randoms = payload.lines.find(row => row.id === line.id)?.randoms;
          if (!randoms || randoms.length !== line.quantity) throw new Error(`订单 ${order.no} 的码包不完整`);
          randoms.forEach(value => numberPool.add(value));
        });
      }
      function addCatalogProduct(order, line, quantity, pending = false) {
        const id = ++nextProductId;
        const no = `BR-20261029-${String(id).padStart(8, "0")}`;
        const product = { id, catalogSeed: true, customerId: order.customerId, company: order.customer,
          name: `${order.customer}${line.category}${id}`, batch: `B20261028${id}`,
          categoryId: line.categoryId, category: line.category, productNumber: line.productNumber, orderLineId: line.id,
          status: "已激活", submitted: "2026-10-28 10:35:00", decidedAt: "2026-10-28 16:20:00", operator: "林晓岚", amount: 0 };
        products.push(product);
        bindRequests.push({ id, no, catalogSeed: true, orderNo: order.no, orderLineId: line.id,
          customerId: order.customerId, customer: order.customer, productId: id, product: product.name, batch: product.batch,
          categoryId: line.categoryId, applicationType: "已有产品追加绑定", range: omRange(line.first, line.first + quantity - 1),
          amount: quantity, status: pending ? "待审批" : "已通过", time: "2026-10-29 09:36:00",
          submittedBy: order.customer, decidedAt: pending ? "" : "2026-10-29 14:25:00", operator: pending ? "" : "林晓岚" });
        if (!pending) {
          order.activations.push({ activationId: crypto.randomUUID(), productId: id, customerId: order.customerId,
            product: product.name, batch: product.batch, range: omRange(line.first, line.first + quantity - 1),
            amount: quantity, time: "2026-10-29 14:25:00", operator: "林晓岚", status: "有效", bindRequestNo: no });
          messages.push({ id: 970000 + id, type: "绑定审核结果", title: `${product.name}绑定审核已通过`,
            productId: id, customerId: order.customerId, orderNo: order.no, bindRequestNo: no,
            recipient: order.customer, customer: order.customer, time: "2026-10-29 14:25:00", unread: true });
        }
      }
      for (const owner of customers.filter(row => ["yunling", "beichen", "songye"].includes(row.account))) {
        const key = `channel-delivery-${owner.id}`;
        if (meat && !orders.some(row => row.catalogKey === key)) {
          const no = `ORD-20261028-B${String(owner.id).padStart(7, "0")}`;
          if (!orders.some(row => row.no === no)) {
            const id = crypto.randomUUID(), quantity = 240;
            const line = { id: crypto.randomUUID(), categoryId: meat.id, category: meat.name, productNumber: meat.productNumber,
              categorySnapshot: { name: meat.name, productNumber: meat.productNumber }, first: 1, last: quantity, quantity, remark: "秋季渠道补货" };
            const order = { id, no, catalogKey: key, codeFormat: "random16", recordType: "random-order", customerId: owner.id,
              customer: owner.name, companyNumber: owner.companyNumber, version: "1", total: quantity, active: 0, lines: [line],
              customerSnapshot: { name: owner.name, companyNumber: owner.companyNumber, companyNumberType: owner.companyNumberType },
              range: omRange(1, quantity), allocationSegments: [{ range: omRange(1, quantity), amount: quantity }],
              allocationStatus: "已分配", created: "2026-10-28", createdAt: "2026-10-28 09:18:00",
              allocatedAt: "2026-10-28 09:18:00", allocatedBy: "周文博", note: "秋季渠道补货",
              activations: [], downloads: [], cancellationRecords: [], scanBase: new URL("pages/scan/active.html", document.baseURI).href };
            const randoms = new Uint32Array(quantity);
            for (let i = 0; i < quantity; i++) {
              let value;
              do { value = crypto.getRandomValues(new Uint32Array(1))[0] % 99999999 + 1; } while (numberPool.has(value));
              numberPool.add(value); randoms[i] = value;
            }
            addedPayloads.push({ no, lines: [{ id: line.id, randoms }] });
            orders.push(order);
            addCatalogProduct(order, line, 120, owner.account === "songye");
          }
        }
        const craftOrder = orders.find(row => row.demoKey === `${owner.account}:mixed`);
        const craftLine = craftOrder?.lines.find(line => /工艺|竹/.test(line.category));
        if (craftLine && !products.some(row => row.catalogSeed && row.orderLineId === craftLine.id))
          addCatalogProduct(craftOrder, craftLine, Math.min(12, craftLine.quantity));
      }
      [...bindRequests, ...withdrawals].forEach(row => {
        if (/-DEMO-/i.test(row.no)) references.set(row.no, row.no.replace(/-DEMO-/i, `-202610${row.no.startsWith("BR") ? "25" : "27"}-`));
      });
      customers.forEach((customer, index) => {
        const profile = profiles[customer.account] || Object.values(profiles).find(row => row[5] === customer.account) || (looksSample(customer.name)
          ? [`岚禾${["茶业", "食品", "农产", "商贸"][index % 4]}有限公司`, "岚禾", "云南省临沧市临翔区", "0883-2126398", "13988362157"] : null);
        if (!profile) return;
        names.set(customer.name, profile[0]);
        profileById.set(String(customer.id), profile);
        customer.name = profile[0];
        customer.phone = profile[4];
        if (profile[5]) {
          oldAccounts.set(customer.account, profile[5]);
          customer.account = profile[5];
        }
        if (typeof customer.license === "string" || looksSample(customer.license?.name))
          customer.license = "企业资料已归档";
        if (typeof customer.legalId === "string" || looksSample(customer.legalId?.name))
          customer.legalId = "身份资料已归档";
      });
      products.forEach((product, index) => {
        const owner = customers.find(row => fxSameId(row.id, product.customerId))
          || customers.find(row => row.name === text(product.company));
        const profile = profileById.get(String(owner?.id));
        const supplied = Boolean(product.demoTag || product.demoCase || product.catalogSeed || looksSample(product.name) || looksSample(product.batch)
          || looksSample(product.details?.intro));
        if (!supplied) return;
        const category = product.category || fxCategoryForRecord(product)?.name || "茶叶";
        const item = catalog(category, index);
        const brand = profile?.[1] || owner?.name?.replace(/有限公司$/, "") || "山禾";
        const name = `${brand}${item.names[index % item.names.length]}`;
        names.set(product.name, name);
        const batch = `${/肉|腊/.test(category) ? "LR" : /工艺|竹/.test(category) ? "ZB" : "CY"}20261001${String(index + 1).padStart(3, "0")}`;
        names.set(product.batch, batch);
        productRefs.set(String(product.id), { name, batch, company: owner?.name || text(product.company) });
        Object.assign(product, { name, batch, company: owner?.name || text(product.company), customerId: owner?.id || product.customerId });
        const media = src => ({ name: `${name}${src.includes("brew") ? "冲泡" : src.includes("dry") ? "干茶" : "产品"}.jpg`, type: "image/jpeg", src });
        const fieldMedia = { productImages: item.images.map(media) };
        if (item.environment) {
          fieldMedia.productionEnvironment = [{ name: "原料种植基地.jpg", type: "image/jpeg", src: item.environment }];
          fieldMedia.process = [{ name: "生产加工现场.jpg", type: "image/jpeg", src: "assets/demo-case/production-craft.jpg" }];
        }
        product.details = fxNormalizeDetails({
          productName: name, brand, trademark: "", category, subcategory: item.subcategory, batch,
          productImages: `${name}及包装图片`, intro: item.intro, specification: item.specification,
          origin: profile?.[2] || "云南省临沧市", productionDate: "2026-10-01",
          shelfLife: item.shelfLife, storage: item.storage, standard: item.standard,
          companyName: owner?.name || product.company, companyPhone: profile?.[3] || "",
          companyAddress: `${profile?.[2] || "云南省临沧市"}产业园区 18 号`,
          companyIntro: `${owner?.name || product.company}从事${/工艺|竹/.test(category) ? "竹木制品设计、加工与销售" : "农产品加工与销售"}，按批次管理原料验收、加工记录和成品出库资料。产品供应区域门店、经销渠道及线上零售。`,
          productionUnit: `${owner?.name || product.company}生产中心`,
          productionAddress: `${profile?.[2] || "云南省临沧市"}产业园区 18 号`,
          productionEnvironment: item.environment ? "原料种植基地及清洁加工车间" : "分区生产车间及成品库",
          productionSiteEnvironment: "原料区、加工区与成品区分区管理",
          process: item.process, equipment: item.equipment,
          productInspectionReport: `批次 ${batch} 已完成入库抽检，外观、包装完整性和净含量记录归入批次档案。`,
          trace: [
            { date: "2026-10-01 08:20", content: `原料验收：登记供货批次，完成外观及数量复核。生产批次 ${batch}。` },
            { date: "2026-10-01 10:40", content: `生产加工：${item.process}。当班负责人复核工艺记录。` },
            { date: "2026-10-02 14:30", content: "成品检查：核对外观、规格和包装，完成批次入库登记。" },
            { date: "2026-10-03 09:15", content: "包装入库：按渠道分装，成品转入 A-03 库位，待订单赋码出库。" },
          ],
          fieldMedia,
          custom: {
            product: [{ id: `catalog-spec-${product.id}`, name: "包装方式", type: "text", value: /工艺|竹/.test(category) ? "纸盒防护包装" : "独立密封包装" }],
            company: [], production: [{ name: "生产负责人", type: "text", value: ["李文清", "赵海林", "吴晓燕"][index % 3] }],
            quality: [{ name: "入库复核", type: "text", value: "包装、规格、批次标识已核对" }],
            trace: [{ name: "仓储库位", type: "text", value: `A-${String(index % 8 + 1).padStart(2, "0")}` }],
          },
          files: { product: [], company: [], production: [], quality: [], trace: [] },
        });
      });
      // Resolve embedded references after every product's replacement is known.
      products.forEach(product => {
        if (productRefs.has(String(product.id))) product.details = rewrite(product.details);
      });
      // Existing-product requests need an earlier successful publication to refer to.
      const pools = new Map(meat ? [[meat.productNumber, numberPool]] : []);
      async function poolFor(productNumber) {
        if (pools.has(productNumber)) return pools.get(productNumber);
        const used = new Set();
        for (const order of orders.filter(omOccupiesNumbers)) {
          const lines = (order.lines || []).filter(row => row.productNumber === productNumber);
          if (!lines.length) continue;
          const payload = addedPayloads.find(row => row.no === order.no) || await omPayload(order.no);
          for (const line of lines) {
            const randoms = payload?.lines.find(row => row.id === line.id)?.randoms;
            if (!randoms || randoms.length !== line.quantity) throw new Error(`订单 ${order.no} 的码包不完整`);
            randoms.forEach(value => used.add(value));
          }
        }
        pools.set(productNumber, used);
        return used;
      }
      for (const owner of customers) {
        const unpublished = products.filter(product => fxSameId(product.customerId, owner.id)
          && productRefs.has(String(product.id)) && product.status === "已激活"
          && !orders.some(order => order.activations?.some(row => fxSameId(row.productId, product.id))));
        if (!unpublished.length) continue;
        const no = `ORD-20261002-C${String(owner.id).padStart(7, "0")}`;
        if (orders.some(row => row.no === no)) continue;
        const order = { id: crypto.randomUUID(), no, catalogKey: `initial-publication-${owner.id}`,
          codeFormat: "random16", recordType: "random-order", customerId: owner.id, customer: owner.name,
          companyNumber: owner.companyNumber, version: "1", total: unpublished.length * 10, active: unpublished.length * 10,
          customerSnapshot: { name: owner.name, companyNumber: owner.companyNumber, companyNumberType: owner.companyNumberType },
          allocationStatus: "已分配", created: "2026-10-02", createdAt: "2026-10-02 09:18:00",
          allocatedAt: "2026-10-02 09:18:00", allocatedBy: "周文博", note: "首批门店产品建档",
          lines: [], activations: [], downloads: [], cancellationRecords: [],
          scanBase: new URL("pages/scan/active.html", document.baseURI).href };
        const payload = { no, lines: [] };
        const grouped = new Map();
        for (const product of unpublished) {
          if (!grouped.has(product.productNumber)) grouped.set(product.productNumber, []);
          grouped.get(product.productNumber).push(product);
        }
        let first = 1;
        for (const [productNumber, items] of grouped) {
          const category = categoryItems.find(row => row.productNumber === productNumber);
          if (!category) throw new Error("产品原品类不存在，无法补齐发布记录");
          const quantity = items.length * 10;
          const line = { id: crypto.randomUUID(), categoryId: category.id, category: category.name, productNumber,
            categorySnapshot: { name: category.name, productNumber }, first, last: first + quantity - 1,
            quantity, remark: "门店首批赋码" };
          order.lines.push(line);
          const used = await poolFor(productNumber);
          const randoms = new Uint32Array(quantity);
          for (let i = 0; i < quantity; i++) {
            let value;
            do { value = crypto.getRandomValues(new Uint32Array(1))[0] % 99999999 + 1; } while (used.has(value));
            used.add(value); randoms[i] = value;
          }
          payload.lines.push({ id: line.id, randoms });
          items.forEach((product, index) => {
            order.activations.push({ activationId: crypto.randomUUID(), productId: product.id, customerId: owner.id,
              product: product.name, batch: product.batch, range: omRange(first + index * 10, first + index * 10 + 9),
              amount: 10, time: "2026-10-03 10:26:00", operator: "林晓岚", status: "有效" });
          });
          first += quantity;
        }
        order.range = omRange(1, order.total);
        order.allocationSegments = [{ range: order.range, amount: order.total }];
        orders.push(order);
        addedPayloads.push(payload);
      }
      // Repair all dependent snapshots through stable IDs, including activation and reset history.
      function syncProduct(row) {
        const ref = productRefs.get(String(row.productId));
        if (ref) {
          if ("product" in row) row.product = ref.name;
          if ("batch" in row) row.batch = ref.batch;
        }
      }
      for (const [name, list] of Object.entries(lists)) {
        list.splice(0, list.length, ...list.map(rewrite));
        if (["bindRequests", "withdrawals", "messages"].includes(name)) list.forEach(syncProduct);
      }
      orders.forEach((order, index) => {
        if (order.demoTag || looksSample(order.note)) order.note = businessNames[index % businessNames.length];
        (order.lines || []).forEach((line, lineIndex) => {
          if (order.demoTag || looksSample(line.remark)) line.remark = ["常规装", "渠道礼盒", "门店补货", "节令上新"][(index + lineIndex) % 4];
        });
        (order.activations || []).forEach(syncProduct);
        (order.downloads || []).forEach(record => {
          if (order.demoTag || record.demoTag || record.simulated) {
            const line = order.lines?.find(item => item.first === record.first && item.last === record.last);
            record.scope = record.first === 1 && record.last === order.total ? `整单（${order.total}个码）`
              : line ? `${line.category}${line.remark ? ` · ${line.remark}` : ""}（${line.quantity}个码）`
              : record.first === 1 ? `前${record.amount}个码` : `序号 ${omRange(record.first, record.last)}`;
            record.format = /txt/i.test(record.format) ? "TXT" : "Excel（.xlsx）";
            delete record.simulated;
          }
        });
        if (looksSample(order.recallReason)) order.recallReason = "客户调整本批发货计划";
        (order.cancellationRecords || []).forEach(record => {
          if (order.demoTag || looksSample(record.reason)) record.reason = order.recallReason || "客户调整本批发货计划";
        });
      });
      products.forEach(product => {
        if (product.demoTag || looksSample(product.rejectionReason)) {
          if (product.rejectionReason) product.rejectionReason = "请补充同批次检验记录后重新提交";
        }
      });
      bindRequests.forEach(record => {
        if (record.demoTag || looksSample(record.rejectReason)) {
          if (record.rejectReason) record.rejectReason = "申请数量与本批包装计划不符，请核对后重新提交";
        }
      });
      withdrawals.forEach(record => {
        if (record.demoTag || looksSample(record.reason)) record.reason = "包装标签调整，撤回本批所选序号";
        if (record.rejectReason && (record.demoTag || looksSample(record.rejectReason))) record.rejectReason = "请补充调整内容及涉及批次后重新提交";
        (record.segments || []).forEach(syncProduct);
        (record.resetSegments || []).forEach(syncProduct);
      });
      messages.splice(0, messages.length, ...messages.filter(record => {
        if (!fxIsResultNotification(record)) return false;
        const request = bindRequests.find(row => row.no === record.bindRequestNo);
        return !request || ["已通过", "已驳回"].includes(request.status);
      }));
      messages.forEach(record => {
        const request = bindRequests.find(row => row.no === record.bindRequestNo);
        const withdrawal = withdrawals.find(row => row.no === record.withdrawalNo);
        const product = products.find(row => fxSameId(row.id, record.productId));
        const approved = !/驳回|拒绝/.test(record.title) && request?.status !== "已驳回" && product?.status !== "已驳回";
        if (record.type === "撤回审核结果" && withdrawal) Object.assign(record, fxWithdrawalResultMessage(withdrawal, withdrawal.status === "已通过"));
        else if (record.type === "绑定审核结果" && product) Object.assign(record, fxBindingResultMessage({
          productId: product.id, customerId: product.customerId, product: product.name, batch: product.batch,
          orderNo: request?.orderNo || record.orderNo || product.requestedOrderNo,
          amount: request?.amount || product.requestedAmount, range: request?.range || product.requestedRange,
          reason: request?.rejectReason || product.rejectionReason, bindRequestNo: request?.no,
        }, approved));
        const owner = customers.find(row => fxSameId(row.id, record.customerId));
        if (owner) { record.recipient = owner.name; record.customer = owner.name; }
      });
      const categories = categoryItems.map(rewrite);
      categories.forEach((category, index) => {
        if (looksSample(category.remark)) category.remark = ["常规渠道产品", "按批次管理", "区域特色产品"][index % 3];
      });
      const audit = fxStore.get(fxCategoryAuditKey, []).map(rewrite);
      fxOperators.forEach((operator, index) => {
        operator.name = operatorNames.get(operator.name) || operator.name;
        if (/2026-07/.test(operator.lastLogin || "")) operator.lastLogin = `2026-11-02 ${["08:46", "09:12", "08:35"][index % 3]}`;
      });
      fxReconcileActivationStatistics();
      for (const customer of customers) customer.total = orders
        .filter(order => fxRecordBelongsToCustomer(order, customer) && order.allocationStatus !== "已撤销")
        .reduce((sum, order) => sum + Number(order.total || 0), 0);
      for (const [name, list] of Object.entries(lists)) save(fxBusinessStorage[name], list);
      save(fxCategoryKey, categories);
      save(fxCategoryAuditKey, audit);
      save("trace-operators-v2", fxOperators);
      const scans = fxStore.get("trace-scan-records-v2", {});
      for (const entry of Object.values(scans)) {
        for (const record of entry.records || []) delete record.mock;
        delete entry.mock;
      }
      for (const payload of addedPayloads) await omPayload(payload.no, payload);
      const activeSample = fxStore.get(traceDemoMarker)?.samples?.active;
      if (activeSample && scans[activeSample.code]?.records?.length === 3) {
        const records = Array.from({ length: 16 }, (_, index) => ({
          time: `2026-10-${String(27 + Math.floor(index / 4)).padStart(2, "0")} ${String(8 + index % 4 * 3).padStart(2, "0")}:24:18`,
          ip: `192.0.2.${31 + index}`, region: "",
        }));
        scans[activeSample.code] = { count: records.length, times: records.map(row => row.time), records };
      }
      save("trace-scan-records-v2", scans);
      const account = fxStore.sessionGet("trace-account-customer", "");
      if (oldAccounts.has(account)) {
        fxStore.sessionSet("trace-account-customer", oldAccounts.get(account));
        if (state.portal === "customer") state.currentAccount = oldAccounts.get(account);
      }
      const samples = fxClone(fxStore.get(traceDemoMarker)?.samples || {});
      for (const sample of Object.values(samples)) {
        const owner = customers.find(row => fxSameId(row.id, sample.customerId));
        if (owner) sample.account = owner.account;
      }
      const report = { version: traceBusinessSeedVersion, updatedAt: omNow(),
        counts: Object.fromEntries(Object.entries(lists).map(([name, list]) => [name, list.length])),
        samples };
      save(traceBusinessSeedKey, report);
      window.TRACE_BUSINESS_DATA = report;
    } catch (error) {
      for (const [name, list] of Object.entries(lists)) list.splice(0, list.length, ...before[name]);
      fxOperators.splice(0, fxOperators.length, ...operatorsBefore);
      for (const [key, value] of [...storageBefore].reverse()) {
        if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value);
      }
      for (const payload of addedPayloads) await omPayload(payload.no, null, true).catch(() => {});
      throw error;
    }
  });
}
