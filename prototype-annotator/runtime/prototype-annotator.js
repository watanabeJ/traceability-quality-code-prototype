(function () {
  "use strict";

  var CFG = Object.assign({
    dataScriptId: "prototype-annotations-data",
    dataUrl: null,
    apiEndpoint: "/.prototype-annotator/api/annotations",
    assetsEndpoint: "/.prototype-annotator/api/assets",
    specsEndpoint: "/.prototype-annotator/api/specs",
    rootClass: "pa-root",
    autoSave: true
  }, window.PROTOTYPE_ANNOTATOR_CONFIG || {});

  var state = {
    data: null,
    pageKey: null,
    visible: true,
    editMode: false,
    sidebarOpen: false,
    specBrowserOpen: false,
    specBrowserPageKey: null,
    specBrowserPosition: null,
    specBrowserSize: null,
    specBrowserEditorCollapsed: false,
    toolbarCollapsed: false,
    toolbarPosition: null,
    sidebarPosition: null,
    activeId: null,
    highlighted: null,
    dirty: false,
    specCache: {}
  };

  var root = null;
  var toolbar = null;
  var card = null;
  var sidebar = null;
  var specBrowser = null;
  var mutationObserver = null;
  var renderTimer = null;
  var toolbarDrag = null;
  var sidebarDrag = null;
  var specBrowserDrag = null;
  var specBrowserResize = null;
  var specBrowserResizeObserver = null;
  var specBrowserPreviewTimer = null;
  var toolbarPrefsKey = "prototype-annotator-toolbar";
  var sidebarPrefsKey = "prototype-annotator-sidebar";
  var specBrowserPrefsKey = "prototype-annotator-spec-window";
  var specBrowserReopenKey = "prototype-annotator-spec-reopen";
  // Keep route-aware annotation data isolated from drafts saved by the old path-only runtime.
  var draftStorageKey = "prototype-annotations-draft:route-aware-v3";
  var specDraftStoragePrefix = "prototype-annotator-spec-draft:v2:";
  var sidebarMinHeight = 260;

  function $(selector, base) {
    try { return (base || document).querySelector(selector); } catch (err) { return null; }
  }

  function $all(selector, base) {
    try { return Array.prototype.slice.call((base || document).querySelectorAll(selector)); } catch (err) { return []; }
  }

  function escapeHtml(value) {
    if (window.PrototypeAnnotatorMarkdown) return window.PrototypeAnnotatorMarkdown.escapeHtml(value);
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }

  function loadInlineData() {
    if (window.PROTOTYPE_ANNOTATIONS) return normalizeData(window.PROTOTYPE_ANNOTATIONS);
    var script = document.getElementById(CFG.dataScriptId);
    if (!script) return normalizeData(null);
    try {
      return normalizeData(JSON.parse(script.textContent || "{}"));
    } catch (err) {
      console.error("Prototype Annotator: invalid annotation JSON", err);
      return normalizeData(null);
    }
  }

  function withBrowserDraft(data) {
    if (!window.localStorage) return data;
    var raw = null;
    try {
      raw = window.localStorage.getItem(draftStorageKey);
    } catch (err) {
      return data;
    }
    if (!raw) return data;
    var draft = null;
    try {
      draft = JSON.parse(raw);
    } catch (err) {
      try { window.localStorage.removeItem(draftStorageKey); } catch (removeErr) {}
      return data;
    }
    var shouldLoad = window.confirm(
      "检测到尚未写入项目文件的浏览器草稿。是否加载这份草稿？\n\n选择“取消”会继续使用项目文件中的标注数据。"
    );
    if (!shouldLoad) return data;
    return normalizeData(draft);
  }

  function loadData() {
    if (!CFG.dataUrl || !window.fetch) return Promise.resolve(withBrowserDraft(loadInlineData()));
    return fetch(CFG.dataUrl, { cache: "no-store" }).then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    }).then(function (data) {
      return withBrowserDraft(normalizeData(data));
    }).catch(function () {
      return withBrowserDraft(loadInlineData());
    });
  }

  function normalizeData(data) {
    data = data || {};
    data.version = data.version || 1;
    data.project = data.project || { id: "prototype", name: document.title || "Prototype", source: "inline" };
    data.pages = Array.isArray(data.pages) ? data.pages : [];
    data.surfaces = Array.isArray(data.surfaces) ? data.surfaces : [];
    data.annotations = Array.isArray(data.annotations) ? data.annotations : [];
    if (!data.pages.length) {
      data.pages.push({
        pageKey: "P01",
        title: document.title || "Page",
        path: location.pathname.split("/").pop() || "index.html",
        route: location.pathname
      });
    }
    var idCounters = {};
    data.annotations.forEach(function (ann) {
      var inferredPageKey = ann.pageKey || data.pages[0].pageKey;
      ann.id = ann.id || nextIdFromAnnotations(inferredPageKey, data.annotations, idCounters);
      ann.pageKey = ann.pageKey || data.pages[0].pageKey;
      ann.target = ann.target || {};
      ann.target.selector = ann.target.selector || ann.selector || "body";
      ann.title = ann.title || "未命名标注";
      if (ann.annotationType === "P" && ann.specRef && !ann.contentSource) {
        ann.contentSource = { type: "markdown-file", ref: ann.specRef, format: "markdown" };
      }
      if (ann.annotationType === "P" && ann.contentSource) ann.maintenancePolicy = ann.maintenancePolicy || "spec-owned";
      if (ann.annotationType !== "P") ann.maintenancePolicy = ann.maintenancePolicy || "annotation-owned";
      if (isSpecOwnedAnnotation(ann)) {
        delete ann.contentMarkdown;
      } else {
        ann.contentMarkdown = ann.contentMarkdown || ann.content || "";
      }
      if (ann.visible !== false) ann.visible = true;
      ann.kind = ann.kind || "note";
      ann.priority = ann.priority || "medium";
      ann.createdBy = ann.createdBy || "ai";
      ann.order = ann.order || sequenceNumberFromId(ann.id, ann.pageKey) || nextOrderForPage(ann.pageKey, data.annotations);
    });
    return data;
  }

  function detectPageKey() {
    var meta = $('meta[name="prototype-page-key"]');
    if (meta && meta.content) return meta.content;
    var keyed = $("[data-page-key]");
    if (keyed) return keyed.getAttribute("data-page-key");

    var path = location.pathname.split("/").pop() || "index.html";
    var pathPages = state.data.pages.filter(function (page) {
      return page.path === path || page.path === location.pathname;
    });
    var hash = location.hash || "";
    var exactRoute = pathPages.find(function (page) {
      if (!page.route) return false;
      if (page.route === hash || page.route === location.pathname) return true;
      return page.route.charAt(0) === "#" && hash.indexOf(page.route + "/") === 0;
    });
    if (exactRoute) return exactRoute.pageKey;

    var exactPath = pathPages.find(function (page) {
      return !page.route || page.route === location.pathname;
    }) || pathPages[0];
    if (exactPath) return exactPath.pageKey;

    return state.data.pages[0] ? state.data.pages[0].pageKey : "P01";
  }

  function pageAnnotations() {
    return state.data.annotations
      .filter(function (ann) { return ann.pageKey === state.pageKey; })
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0) || a.id.localeCompare(b.id); });
  }

  function pageByKey(pageKey) {
    return (state.data.pages || []).find(function (page) { return page.pageKey === pageKey; }) || null;
  }

  function pageSpecAnnotation(pageKey) {
    return (state.data.annotations || []).find(function (ann) {
      return ann.pageKey === pageKey && isPageOverviewAnnotation(ann);
    }) || null;
  }

  function pagePortal(page) {
    var path = String(page && page.path || "");
    if (path.indexOf("/ops/") !== -1) return "运营端";
    if (path.indexOf("/customer/") !== -1) return "客户端";
    if (path.indexOf("/scan/") !== -1) return "扫码端";
    return "其他页面";
  }

  function contextAnnotations() {
    var anns = pageAnnotations();
    var openSurfaceIds = activeSurfaceIds();
    if (!openSurfaceIds.length) return anns;
    return anns.filter(function (ann) {
      return ann.surfaceId && openSurfaceIds.indexOf(ann.surfaceId) !== -1;
    });
  }

  function sequenceNumberFromId(id, pageKey) {
    var match = String(id || "").match(/^ANN-(.+)-(\d{3,})$/);
    if (!match) return 0;
    if (pageKey && match[1] !== pageKey) return 0;
    return Number(match[2]) || 0;
  }

  function nextOrderForPage(pageKey, annotations) {
    var max = 0;
    (annotations || []).forEach(function (ann) {
      if (ann.pageKey !== pageKey) return;
      var candidate = Number(ann.order) || sequenceNumberFromId(ann.id, pageKey) || 0;
      if (candidate > max) max = candidate;
    });
    return max + 1;
  }

  function annotationDisplayNumber(ann, fallbackIndex) {
    return Number(fallbackIndex) || Number(ann && ann.order) || sequenceNumberFromId(ann && ann.id, ann && ann.pageKey) || 1;
  }

  function annotationDisplayLabel(ann, fallbackIndex) {
    if (isPageOverviewAnnotation(ann)) return "P";
    return String(annotationDisplayNumber(ann, fallbackIndex));
  }

  function sidebarDisplayLabel(ann, fallbackIndex) {
    if (isPageOverviewAnnotation(ann)) return "[P]";
    return annotationDisplayLabel(ann, fallbackIndex);
  }

  function isPageOverviewAnnotation(ann) {
    return ann && ann.annotationType === "P" && !ann.surfaceId;
  }

  function isSpecOwnedAnnotation(ann) {
    return isPageOverviewAnnotation(ann) && (ann.contentSource || ann.specRef || ann.maintenancePolicy === "spec-owned");
  }

  function specRefFor(ann) {
    var source = ann && ann.contentSource && ann.contentSource.type === "markdown-file" ? ann.contentSource : null;
    return String((source && source.ref) || (ann && ann.specRef) || "").trim();
  }

  function normalizeSpecRef(ref) {
    ref = String(ref || "").trim().replace(/^\/+/, "");
    ref = ref.replace(/\\/g, "/");
    if (!ref) return "";
    if (ref.indexOf("..") !== -1 || /[\0<>"|?*]/.test(ref)) return "";
    return ref;
  }

  function dataUrlBase() {
    if (!CFG.dataUrl) return "";
    try {
      return new URL(CFG.dataUrl, window.location.href).href.replace(/[^/]*$/, "");
    } catch (err) {
      return "";
    }
  }

  // Page paths in annotations.json are project-relative. Resolve them from
  // the deployed project root so switching pages also works under a subpath
  // (for example a GitHub Pages project URL).
  function projectRootUrl() {
    var annotationBase = dataUrlBase();
    if (annotationBase) {
      try {
        return new URL("../", annotationBase).href;
      } catch (err) {}
    }
    try {
      var current = new URL(".", document.baseURI || window.location.href).href;
      var marker = "/prototype-multipage/";
      var markerIndex = current.indexOf(marker);
      if (markerIndex !== -1) return current.slice(0, markerIndex + marker.length);
      return new URL("../../", current).href;
    } catch (err) {
      return "";
    }
  }

  function pageTargetUrl(page) {
    if (!page) return "";
    var path = String(page.path || "").trim();
    var root = projectRootUrl();
    if (path && root) {
      try {
        return new URL(path.replace(/^\/+/, ""), root).href;
      } catch (err) {}
    }
    var route = String(page.route || "").trim();
    if (!route) return "";
    route = route.replace(/^\/+/, "").replace(/^prototype-multipage\//, "");
    try {
      return new URL(route, root || document.baseURI || window.location.href).href;
    } catch (err) {
      return "";
    }
  }

  function specFetchUrl(ref) {
    var raw = String(ref || "").trim();
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.charAt(0) === "/") return raw;
    ref = normalizeSpecRef(ref);
    if (!ref) return "";
    var base = dataUrlBase();
    if (ref.indexOf("prototype-annotator/") === 0) {
      if (base) {
        try {
          var relativeToAnnotationRoot = ref.replace(/^prototype-annotator\//, "");
          return new URL(relativeToAnnotationRoot, base).href;
        } catch (err) {}
      }
      return "/" + ref;
    }
    if (ref.indexOf(".prototype-annotations/") === 0) {
      if (base) {
        try {
          return new URL(ref, base).href;
        } catch (err) {}
      }
      return "/" + ref;
    }
    if (base) {
      try {
        return new URL(ref, base).href;
      } catch (err) {
        return ref;
      }
    }
    return ref;
  }

  function specApiUrl(ref) {
    if (!CFG.specsEndpoint) return "";
    try {
      return new URL(CFG.specsEndpoint, window.location.href).href + "?ref=" + encodeURIComponent(ref);
    } catch (err) {
      return CFG.specsEndpoint + "?ref=" + encodeURIComponent(ref);
    }
  }

  function specDraftKey(ref) {
    return specDraftStoragePrefix + normalizeSpecRef(ref);
  }

  function browserSpecDraft(ref) {
    if (!window.localStorage) return null;
    try {
      var raw = window.localStorage.getItem(specDraftKey(ref));
      if (!raw) return null;
      var payload = JSON.parse(raw);
      if (!payload || typeof payload.markdown !== "string") return null;
      return payload;
    } catch (err) {
      return null;
    }
  }

  function loadSpecMarkdown(ann) {
    var ref = specRefFor(ann);
    if (!ref) return Promise.resolve("");
    var draft = browserSpecDraft(ref);
    if (draft && !state.specCache[ref]) {
      var shouldLoad = window.confirm(
        "检测到页面说明 Markdown 的浏览器草稿，是否加载？\n\n选择“取消”会继续读取项目文件。"
      );
      if (shouldLoad) {
        state.specCache[ref] = draft.markdown;
        return Promise.resolve(draft.markdown);
      }
    }
    if (state.specCache[ref] != null) return Promise.resolve(state.specCache[ref]);
    var url = specFetchUrl(ref);
    if (!url || !window.fetch) return Promise.reject(new Error("无法读取页面说明文件：" + ref));
    return fetch(url, { cache: "no-store" }).then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.text();
    }).catch(function (err) {
      var apiUrl = specApiUrl(ref);
      if (!apiUrl || apiUrl === url) throw err;
      return fetch(apiUrl, { cache: "no-store" }).then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      }).then(function (payload) {
        if (!payload || typeof payload.markdown !== "string") throw new Error("页面说明 API 未返回 Markdown");
        return payload.markdown;
      });
    }).then(function (markdown) {
      state.specCache[ref] = markdown;
      return markdown;
    });
  }

  function persistSpecMarkdown(ann, markdown) {
    var ref = specRefFor(ann);
    if (!ref) return Promise.resolve({ persisted: false, draft: false, reason: "missing-spec-ref" });
    state.specCache[ref] = markdown;
    if (!CFG.autoSave || !window.fetch) {
      return persistSpecDraft(ref, markdown, "auto-save-disabled");
    }
    return fetch(CFG.specsEndpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref: ref, markdown: markdown, annotation: ann })
    }).then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    }).then(function (payload) {
      try { window.localStorage.removeItem(specDraftKey(ref)); } catch (err) {}
      return Object.assign({ persisted: true }, payload || {});
    }).catch(function (err) {
      return persistSpecDraft(ref, markdown, err && err.message ? err.message : String(err));
    });
  }

  function persistSpecDraft(ref, markdown, reason) {
    var drafted = false;
    try {
      window.localStorage.setItem(specDraftKey(ref), JSON.stringify({
        ref: normalizeSpecRef(ref),
        markdown: markdown,
        updatedAt: new Date().toISOString()
      }));
      drafted = true;
    } catch (err) {}
    return Promise.resolve({ persisted: false, draft: drafted, reason: reason });
  }

  function nextIdFromAnnotations(pageKey, annotations, counters) {
    var prefix = "ANN-" + pageKey + "-";
    if (!counters[pageKey]) {
      var max = 0;
      (annotations || []).forEach(function (ann) {
        if (ann.id && ann.id.indexOf(prefix) === 0) {
          var num = Number(ann.id.slice(prefix.length));
          if (num > max) max = num;
        }
      });
      counters[pageKey] = max;
    }
    counters[pageKey] += 1;
    return prefix + String(counters[pageKey]).padStart(3, "0");
  }

  var DEFAULT_SURFACE_OPEN_SELECTORS = [
    ".ant-modal",
    ".ant-drawer",
    ".el-dialog",
    ".el-drawer",
    ".arco-modal",
    ".arco-drawer",
    ".n-modal",
    ".n-drawer",
    ".van-popup",
    ".van-dialog",
    "[role='dialog']",
    "[role='alertdialog']",
    "[aria-modal='true']",
    ".drawer.open",
    ".modal.open",
    ".drawer",
    ".modal"
  ].join(", ");

  var DISPLAY_WHEN_CLOSED_OPTIONS = [
    { value: "", label: "默认（按标注类型）" },
    { value: "on-trigger", label: "on-trigger（挂在入口）" },
    { value: "sidebar-only", label: "sidebar-only（仅侧栏）" },
    { value: "hidden-until-open", label: "hidden-until-open（打开后显示）" }
  ];

  function pageSurfaces() {
    if (!state.data || !Array.isArray(state.data.surfaces)) return [];
    return state.data.surfaces.filter(function (surface) {
      return surface && surface.pageKey === state.pageKey;
    });
  }

  function surfaceById(surfaceId) {
    if (!surfaceId || !state.data || !Array.isArray(state.data.surfaces)) return null;
    return state.data.surfaces.find(function (surface) { return surface.id === surfaceId; }) || null;
  }

  function queryWithin(root, selector) {
    if (!root || !selector) return null;
    try {
      return root.querySelector(selector);
    } catch (err) {
      return null;
    }
  }

  function queryAllWithin(root, selector) {
    if (!root || !selector) return [];
    try {
      return Array.prototype.slice.call(root.querySelectorAll(selector));
    } catch (err) {
      return [];
    }
  }

  function rootMatchesOrContains(root, selector) {
    if (!root || !selector) return false;
    try {
      if (root.matches && root.matches(selector)) return true;
      return !!root.querySelector(selector);
    } catch (err) {
      return false;
    }
  }

  function findByDynamicHandler(selector, base) {
    if (!selector || selector.indexOf("${") === -1) return null;
    var match = selector.match(/^([a-z0-9_-]+)?\[onclick=(["'])([a-zA-Z_$][\w$]*)\(\$\{[^}]+\}\)\2\]$/);
    if (!match) return null;
    var tag = match[1] || "";
    var handler = match[3];
    return $all((tag || "*") + "[onclick]", base).find(function (candidate) {
      var value = candidate.getAttribute("onclick") || "";
      return value.indexOf(handler + "(") === 0 && isElementVisible(candidate);
    }) || null;
  }

  function visibleTextForMatching(candidate) {
    return [
      candidate.innerText,
      candidate.textContent,
      candidate.getAttribute("aria-label"),
      candidate.getAttribute("title"),
      candidate.getAttribute("placeholder"),
      candidate.getAttribute("alt"),
      candidate.value
    ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  }

  function normalizeTextMatcherValues(value) {
    if (Array.isArray(value)) {
      return value.reduce(function (items, item) {
        return items.concat(normalizeTextMatcherValues(item));
      }, []);
    }
    return String(value || "").trim() ? [String(value || "").trim()] : [];
  }

  function surfaceStrictExpectedTexts(surface) {
    return []
      .concat(normalizeTextMatcherValues(surface.textIncludes))
      .concat(normalizeTextMatcherValues(surface.matchText))
      .concat(normalizeTextMatcherValues(surface.stateText))
      .concat(normalizeTextMatcherValues(surface.expectedText));
  }

  function surfaceTitleExpectedTexts(surface) {
    return []
      .concat(normalizeTextMatcherValues(surface.titleText))
      .concat(normalizeTextMatcherValues(surface.activeTitle));
  }

  function textMatchesExpected(text, expected) {
    text = String(text || "");
    expected = String(expected || "").trim();
    if (!expected) return true;
    if (text.indexOf(expected) !== -1) return true;
    var alternatives = expected.split(/[\/／|｜]/).map(function (item) {
      return item.trim();
    }).filter(function (item) {
      return item.length >= 2;
    });
    if (!alternatives.length) return false;
    return alternatives.some(function (item) {
      return text.indexOf(item) !== -1;
    });
  }

  function annotationExpectedTexts(ann) {
    var target = ann.target || {};
    return []
      .concat(normalizeTextMatcherValues(target.fallbackText))
      .concat(normalizeTextMatcherValues(ann.title));
  }

  function pickBestMatchedElement(candidates, ann) {
    var visible = candidates.filter(function (candidate) {
      return isElementVisible(candidate);
    });
    if (!visible.length) return null;
    var expectedTexts = annotationExpectedTexts(ann).filter(function (text) {
      return text && text !== "×" && text.toLowerCase() !== "x";
    });
    if (!expectedTexts.length) return visible[0];
    var exact = visible.find(function (candidate) {
      var text = visibleTextForMatching(candidate);
      return expectedTexts.some(function (expected) {
        return text === expected;
      });
    });
    if (exact) return exact;
    return visible.find(function (candidate) {
      var text = visibleTextForMatching(candidate);
      return expectedTexts.some(function (expected) {
        return textMatchesExpected(text, expected);
      });
    }) || visible[0];
  }

  function isTechnicalSurfaceName(value) {
    var text = String(value || "").trim();
    if (!text) return true;
    if (/^(?:surface-)?(?:drawer|modal|dialog|popover|dropdown|confirm|popup)(?:[-_\w]*|\d*)$/i.test(text)) return true;
    return /^[a-z][a-z0-9]*(?:[-_][a-z0-9]+){1,}$/i.test(text);
  }

  function surfaceDisplayName(surface) {
    if (!surface) return "二级界面";
    if (surface.name && !isTechnicalSurfaceName(surface.name)) return surface.name;
    var titleTexts = surfaceTitleExpectedTexts(surface);
    if (titleTexts.length) return titleTexts[0];
    return surface.name || surface.id || "二级界面";
  }

  function surfaceOpenSelectorKey(surface) {
    return String(surface && surface.openSelector || DEFAULT_SURFACE_OPEN_SELECTORS)
      .split(",")
      .map(function (item) { return item.trim(); })
      .filter(Boolean)
      .join(",");
  }

  function surfaceSharesOpenSelector(surface) {
    if (!surface) return false;
    var key = surfaceOpenSelectorKey(surface);
    return pageSurfaces().some(function (candidate) {
      return candidate && candidate.id !== surface.id && surfaceOpenSelectorKey(candidate) === key;
    });
  }

  function collectVisibleSurfaceRoots(selectors) {
    var matches = [];
    selectors.forEach(function (selector) {
      if (!selector) return;
      $all(selector).forEach(function (el) {
        if (isElementVisible(el)) matches.push(el);
      });
    });
    return matches;
  }

  function pickTopmostSurface(matches) {
    if (!matches.length) return null;
    return matches.slice().sort(function (a, b) {
      var rectA = a.getBoundingClientRect();
      var rectB = b.getBoundingClientRect();
      var areaA = rectA.width * rectA.height;
      var areaB = rectB.width * rectB.height;
      if (areaB !== areaA) return areaB - areaA;
      var zA = Number(window.getComputedStyle(a).zIndex) || 0;
      var zB = Number(window.getComputedStyle(b).zIndex) || 0;
      return zB - zA;
    })[0];
  }

  function surfaceRootMatches(surface, root) {
    if (!root) return false;
    var selector = surface.contentSelector || surface.containerSelector || surface.activeSelector || surface.titleSelector;
    if (selector && !rootMatchesOrContains(root, selector)) return false;
    var strictTexts = surfaceStrictExpectedTexts(surface);
    var titleTexts = surfaceTitleExpectedTexts(surface);
    if (!strictTexts.length && !titleTexts.length) return true;
    var text = visibleTextForMatching(root);
    if (!strictTexts.every(function (expected) { return textMatchesExpected(text, expected); })) return false;
    if (!titleTexts.length) return true;
    if (!surfaceSharesOpenSelector(surface)) return true;
    return titleTexts.some(function (expected) { return textMatchesExpected(text, expected); });
  }

  function isSurfaceOpen(surface) {
    if (!surface) return { open: false, root: null };
    var selectors = String(surface.openSelector || DEFAULT_SURFACE_OPEN_SELECTORS)
      .split(",")
      .map(function (item) { return item.trim(); })
      .filter(Boolean);
    var roots = collectVisibleSurfaceRoots(selectors).filter(function (candidate) {
      return surfaceRootMatches(surface, candidate);
    });
    var root = pickTopmostSurface(roots);
    return { open: !!root, root: root };
  }

  function activeSurfaceStatuses() {
    return pageSurfaces().map(function (surface) {
      return { surface: surface, status: isSurfaceOpen(surface) };
    }).filter(function (item) {
      return item.status && item.status.open;
    });
  }

  function activeSurfaceIds() {
    return activeSurfaceStatuses().map(function (item) {
      return item.surface.id;
    });
  }

  function findTarget(ann) {
    var target = ann.target || {};
    var selector = target.selector || ann.selector;
    var surface = ann.surfaceId ? surfaceById(ann.surfaceId) : null;
    var displayWhenClosed = ann.displayWhenClosed || "";

    if (surface) {
      var status = isSurfaceOpen(surface);
      if (status.open) {
        if (status.root && selector) {
          var scoped = pickBestMatchedElement(queryAllWithin(status.root, selector), ann);
          if (scoped) return scoped;
          var handlerScoped = findByDynamicHandler(selector, status.root);
          if (handlerScoped) return handlerScoped;
          var globalScoped = pickBestMatchedElement($all(selector).filter(function (candidate) {
            return status.root.contains(candidate);
          }), ann);
          if (globalScoped) {
            return globalScoped;
          }
        }
        if (displayWhenClosed === "on-trigger") {
          if (status.root && isElementVisible(status.root)) return status.root;
          var openAnchorSelector = ann.fallbackAnchorSelector || surface.triggerSelector;
          if (openAnchorSelector) {
            var openAnchor = $(openAnchorSelector);
            if (openAnchor && isElementVisible(openAnchor)) return openAnchor;
          }
        }
        return null;
      }
      if (displayWhenClosed === "sidebar-only" || displayWhenClosed === "hidden-until-open") {
        return null;
      }
      var closedAnchorSelector = ann.fallbackAnchorSelector || surface.triggerSelector;
      if (closedAnchorSelector) {
        var closedAnchor = $(closedAnchorSelector);
        if (closedAnchor && isElementVisible(closedAnchor)) return closedAnchor;
      }
      return null;
    }

    var el = null;
    if (selector) {
      el = pickBestMatchedElement($all(selector), ann);
      if (el) return el;
      el = findByDynamicHandler(selector, document);
      if (el) return el;
    }

    var fallbackText = target.fallbackText || "";
    if (!fallbackText) return null;
    var tag = target.boundsHint && target.boundsHint.tag;
    var candidates = $all(tag || "body *").filter(function (candidate) {
      if (!isElementVisible(candidate)) return false;
      var text = visibleTextForMatching(candidate);
      return text && text.indexOf(fallbackText) !== -1;
    });
    return candidates[0] || null;
  }

  function inferSurfaceForTarget(target) {
    var surfaces = pageSurfaces();
    for (var i = 0; i < surfaces.length; i++) {
      var status = isSurfaceOpen(surfaces[i]);
      if (status.open && status.root && status.root.contains(target)) {
        return { surface: surfaces[i], root: status.root };
      }
    }
    return null;
  }

  function groupAnnotationsForSidebar(anns) {
    var pageItems = [];
    var surfaceGroups = {};
    var hiddenGroups = {};
    pageSurfaces().forEach(function (surface) {
      surfaceGroups[surface.id] = {
        surface: surface,
        items: [],
        open: isSurfaceOpen(surface).open
      };
    });
    anns.forEach(function (ann) {
      if (!ann.surfaceId) {
        pageItems.push(ann);
        return;
      }
      var group = surfaceGroups[ann.surfaceId];
      if (ann.displayWhenClosed === "hidden-until-open" && (!group || !group.open)) {
        if (!hiddenGroups[ann.surfaceId]) hiddenGroups[ann.surfaceId] = [];
        hiddenGroups[ann.surfaceId].push(ann);
        return;
      }
      if (group) {
        group.items.push(ann);
        return;
      }
      pageItems.push(ann);
    });
    return { pageItems: pageItems, surfaceGroups: surfaceGroups, hiddenGroups: hiddenGroups };
  }

  function openAnnotationFromSidebar(ann, item) {
    var surface = ann.surfaceId ? surfaceById(ann.surfaceId) : null;
    if (surface && (ann.displayWhenClosed === "sidebar-only" || ann.displayWhenClosed === "hidden-until-open")) {
      var status = isSurfaceOpen(surface);
      if (!status.open) {
        toast("请先点击「" + surfaceDisplayName(surface) + "」打开该二级界面后查看内部标注。");
        return;
      }
    }
    var target = findTarget(ann);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("pa-target-flash");
      setTimeout(function () { target.classList.remove("pa-target-flash"); }, 1500);
    }
    if (state.editMode) showEditor(ann, item, target);
    else showCard(ann, item);
  }

  function renderSurfaceOptions(selectedId) {
    var options = ['<option value="">无</option>'];
    pageSurfaces().forEach(function (surface) {
      var selected = surface.id === selectedId ? " selected" : "";
      options.push('<option value="' + escapeHtml(surface.id) + '"' + selected + ">" + escapeHtml(surfaceDisplayName(surface)) + "</option>");
    });
    return options.join("");
  }

  function isElementVisible(el) {
    if (!el || el === document.documentElement) return false;
    var rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    if (rect.right <= 0 || rect.bottom <= 0 || rect.left >= window.innerWidth || rect.top >= window.innerHeight) return false;
    var current = el;
    while (current && current !== document.body) {
      var style = window.getComputedStyle(current);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
      current = current.parentElement;
    }
    return true;
  }

  function render(options) {
    options = options || {};
    updatePageKeyFromLocation();
    ensureRoot();
    ensureToolbar();
    renderBadges();
    if (!options.skipSidebar) renderSidebar();
    renderSpecBrowser();
  }

  function scheduleRender(options) {
    if (renderTimer) clearTimeout(renderTimer);
    var renderOptions = options || {};
    renderTimer = setTimeout(function () {
      render(renderOptions);
    }, 120);
  }

  function ensureRoot() {
    if (root) return;
    root = document.createElement("div");
    root.className = "pa-ui " + CFG.rootClass;
    document.body.appendChild(root);
  }

  function ensureToolbar() {
    toolbar = toolbar || $(".pa-toolbar", root);
    if (toolbar) {
      updateToolbar();
      return;
    }
    toolbar = document.createElement("div");
    toolbar.className = "pa-toolbar";
    toolbar.innerHTML = [
      '<div class="pa-toolbar-grip" data-pa-drag-handle title="拖拽移动工具栏" aria-label="拖拽移动工具栏"><span></span><span></span><span></span></div>',
      '<div class="pa-toolbar-summary"><span class="pa-toolbar-dot"></span><span class="pa-toolbar-summary-text">标注工具</span></div>',
      '<div class="pa-toolbar-actions">',
      '<button type="button" data-pa-action="toggle-visible" title="显示或隐藏页面上的编号标注">显示标注</button>',
      '<button type="button" data-pa-action="toggle-edit" title="标注模式：点击已有编号编辑标注，点击页面元素新增标注">标注模式</button>',
      '<button type="button" data-pa-action="requirements" title="打开可编辑的页面需求说明窗口">需求说明</button>',
      '<button type="button" data-pa-action="sidebar" title="打开或关闭标注列表">列表</button>',
      '<button type="button" data-pa-action="export" title="导出 annotations.json">导出</button>',
      "</div>",
      '<button type="button" class="pa-toolbar-toggle" data-pa-action="collapse" aria-expanded="true" title="展开或收起工具栏">收起</button>'
    ].join("");
    toolbar.addEventListener("click", onToolbarClick);
    toolbar.addEventListener("pointerdown", onToolbarPointerDown);
    toolbar.addEventListener("mousedown", onToolbarMouseDown);
    root.appendChild(toolbar);
    applyToolbarPosition();
    updateToolbar();
  }

  function openRequirements(pageKey) {
    state.specBrowserOpen = true;
    state.specBrowserPageKey = pageByKey(pageKey) ? pageKey : state.pageKey;
    closeCard();
    render();
  }

  function updateToolbar() {
    root.classList.toggle("pa-annotations-hidden", !state.visible);
    var visibleBtn = $('[data-pa-action="toggle-visible"]', root);
    var editBtn = $('[data-pa-action="toggle-edit"]', root);
    var requirementsBtn = $('[data-pa-action="requirements"]', root);
    var sidebarBtn = $('[data-pa-action="sidebar"]', root);
    var toggleBtn = $('[data-pa-action="collapse"]', root);
    var summaryText = $(".pa-toolbar-summary-text", root);
    if (visibleBtn) {
      visibleBtn.textContent = state.visible ? "隐藏标注" : "显示标注";
      visibleBtn.classList.toggle("pa-active", state.visible);
      visibleBtn.setAttribute("aria-pressed", String(state.visible));
    }
    if (editBtn) {
      editBtn.textContent = state.editMode ? "退出标注" : "标注模式";
      editBtn.classList.toggle("pa-active", state.editMode);
      editBtn.setAttribute("aria-pressed", String(state.editMode));
    }
    if (requirementsBtn) {
      requirementsBtn.classList.toggle("pa-active", state.specBrowserOpen);
      requirementsBtn.setAttribute("aria-pressed", String(state.specBrowserOpen));
    }
    if (sidebarBtn) {
      sidebarBtn.textContent = state.sidebarOpen ? "关闭列表" : "列表";
      sidebarBtn.classList.toggle("pa-active", state.sidebarOpen);
      sidebarBtn.setAttribute("aria-pressed", String(state.sidebarOpen));
    }
    if (toolbar) toolbar.classList.toggle("pa-toolbar-collapsed", state.toolbarCollapsed);
    if (toggleBtn) {
      toggleBtn.textContent = state.toolbarCollapsed ? "展开" : "收起";
      toggleBtn.setAttribute("aria-expanded", String(!state.toolbarCollapsed));
    }
    if (summaryText) summaryText.textContent = "标注 " + pageAnnotations().length;
    if (state.toolbarPosition) {
      requestAnimationFrame(applyToolbarPosition);
    }
  }

  function onToolbarClick(event) {
    var button = event.target.closest("button[data-pa-action]");
    if (!button) return;
    var action = button.getAttribute("data-pa-action");
    if (action === "toggle-visible") {
      state.visible = !state.visible;
      closeCard();
      render();
    } else if (action === "toggle-edit") {
      var willEnable = !state.editMode;
      setEditMode(willEnable);
      toast(willEnable ? "标注模式：点击编号编辑，点击页面元素新增" : "标注模式已关闭");
    } else if (action === "sidebar") {
      state.sidebarOpen = !state.sidebarOpen;
      render();
    } else if (action === "requirements") {
      if (state.specBrowserOpen) closeSpecBrowser();
      else openRequirements(state.pageKey);
    } else if (action === "export") {
      exportData();
    } else if (action === "collapse") {
      state.toolbarCollapsed = !state.toolbarCollapsed;
      persistToolbarPreferences();
      updateToolbar();
    }
  }

  function loadToolbarPreferences() {
    try {
      var raw = window.localStorage.getItem(toolbarPrefsKey);
      if (!raw) return;
      var prefs = JSON.parse(raw);
      state.toolbarCollapsed = !!prefs.collapsed;
      if (prefs.position && typeof prefs.position.left === "number" && typeof prefs.position.top === "number") {
        state.toolbarPosition = { left: prefs.position.left, top: prefs.position.top };
      }
    } catch (err) {
      // Ignore storage failures.
    }
  }

  function loadSidebarPreferences() {
    try {
      var raw = window.localStorage.getItem(sidebarPrefsKey + ":" + location.pathname);
      if (!raw) return;
      var prefs = JSON.parse(raw);
      if (prefs.position && typeof prefs.position.left === "number" && typeof prefs.position.top === "number") {
        state.sidebarPosition = { left: prefs.position.left, top: prefs.position.top };
      }
    } catch (err) {
      // Ignore storage failures.
    }
  }

  function loadSpecBrowserPreferences() {
    try {
      var raw = window.localStorage.getItem(specBrowserPrefsKey);
      if (!raw) return;
      var prefs = JSON.parse(raw);
      if (prefs.position && typeof prefs.position.left === "number" && typeof prefs.position.top === "number") {
        state.specBrowserPosition = { left: prefs.position.left, top: prefs.position.top };
      }
      if (prefs.size && typeof prefs.size.width === "number" && typeof prefs.size.height === "number") {
        state.specBrowserSize = { width: prefs.size.width, height: prefs.size.height };
      }
      state.specBrowserEditorCollapsed = !!prefs.editorCollapsed;
    } catch (err) {
      // Ignore storage failures.
    }
  }

  function persistToolbarPreferences() {
    try {
      window.localStorage.setItem(toolbarPrefsKey, JSON.stringify({
        collapsed: state.toolbarCollapsed,
        position: state.toolbarPosition
      }));
    } catch (err) {
      // Ignore storage failures.
    }
  }

  function persistSidebarPreferences() {
    try {
      window.localStorage.setItem(sidebarPrefsKey + ":" + location.pathname, JSON.stringify({
        position: state.sidebarPosition
      }));
    } catch (err) {
      // Ignore storage failures.
    }
  }

  function persistSpecBrowserPreferences() {
    if (specBrowser && window.innerWidth > 720) {
      var rect = specBrowser.getBoundingClientRect();
      state.specBrowserPosition = { left: rect.left, top: rect.top };
      state.specBrowserSize = { width: rect.width, height: rect.height };
    }
    try {
      window.localStorage.setItem(specBrowserPrefsKey, JSON.stringify({
        position: state.specBrowserPosition,
        size: state.specBrowserSize,
        editorCollapsed: state.specBrowserEditorCollapsed
      }));
    } catch (err) {
      // Ignore storage failures.
    }
  }

  function applySpecBrowserGeometry() {
    if (!specBrowser) return;
    if (window.innerWidth <= 720) {
      specBrowser.style.left = "";
      specBrowser.style.top = "";
      specBrowser.style.width = "";
      specBrowser.style.height = "";
      return;
    }
    var width = state.specBrowserSize ? state.specBrowserSize.width : Math.min(920, window.innerWidth - 64);
    var height = state.specBrowserSize ? state.specBrowserSize.height : Math.min(760, window.innerHeight - 96);
    width = Math.max(640, width);
    height = Math.max(420, height);
    var left = state.specBrowserPosition ? state.specBrowserPosition.left : (window.innerWidth - width) / 2;
    var top = state.specBrowserPosition ? state.specBrowserPosition.top : (window.innerHeight - height) / 2;
    state.specBrowserPosition = { left: left, top: top };
    state.specBrowserSize = { width: width, height: height };
    specBrowser.style.left = left + "px";
    specBrowser.style.top = top + "px";
    specBrowser.style.width = width + "px";
    specBrowser.style.height = height + "px";
  }

  function canDragSpecBrowserFrom(target) {
    if (!specBrowser || !target) return false;
    if (target.closest("button, a, select, input, textarea")) return false;
    return !!target.closest("[data-pa-spec-drag-handle]");
  }

  function startSpecBrowserDrag(pointerId, clientX, clientY) {
    var rect = specBrowser.getBoundingClientRect();
    specBrowserDrag = {
      pointerId: pointerId,
      startX: clientX,
      startY: clientY,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    };
    specBrowser.classList.add("pa-spec-browser-dragging");
  }

  function moveSpecBrowserDrag(clientX, clientY) {
    if (!specBrowserDrag || !specBrowser) return;
    var left = specBrowserDrag.left + clientX - specBrowserDrag.startX;
    var top = specBrowserDrag.top + clientY - specBrowserDrag.startY;
    state.specBrowserPosition = { left: left, top: top };
    specBrowser.style.left = left + "px";
    specBrowser.style.top = top + "px";
  }

  function onSpecBrowserPointerDown(event) {
    if (!canDragSpecBrowserFrom(event.target) || window.innerWidth <= 720) return;
    if (event.button != null && event.button !== 0) return;
    startSpecBrowserDrag(event.pointerId, event.clientX, event.clientY);
    try { specBrowser.setPointerCapture(event.pointerId); } catch (err) { /* Ignore unsupported capture. */ }
    document.addEventListener("pointermove", onSpecBrowserPointerMove, true);
    document.addEventListener("pointerup", onSpecBrowserPointerEnd, true);
    document.addEventListener("pointercancel", onSpecBrowserPointerEnd, true);
    event.preventDefault();
  }

  function onSpecBrowserMouseDown(event) {
    if (specBrowserDrag || !canDragSpecBrowserFrom(event.target) || window.innerWidth <= 720) return;
    if (event.button != null && event.button !== 0) return;
    startSpecBrowserDrag("mouse", event.clientX, event.clientY);
    document.addEventListener("mousemove", onSpecBrowserMouseMove, true);
    document.addEventListener("mouseup", onSpecBrowserMouseEnd, true);
    event.preventDefault();
  }

  function onSpecBrowserPointerMove(event) {
    if (!specBrowserDrag || event.pointerId !== specBrowserDrag.pointerId) return;
    moveSpecBrowserDrag(event.clientX, event.clientY);
  }

  function onSpecBrowserMouseMove(event) {
    if (!specBrowserDrag || specBrowserDrag.pointerId !== "mouse") return;
    moveSpecBrowserDrag(event.clientX, event.clientY);
  }

  function finishSpecBrowserDrag() {
    if (!specBrowserDrag) return;
    if (specBrowser) specBrowser.classList.remove("pa-spec-browser-dragging");
    specBrowserDrag = null;
    persistSpecBrowserPreferences();
  }

  function onSpecBrowserPointerEnd(event) {
    if (!specBrowserDrag || event.pointerId !== specBrowserDrag.pointerId) return;
    document.removeEventListener("pointermove", onSpecBrowserPointerMove, true);
    document.removeEventListener("pointerup", onSpecBrowserPointerEnd, true);
    document.removeEventListener("pointercancel", onSpecBrowserPointerEnd, true);
    finishSpecBrowserDrag();
  }

  function onSpecBrowserMouseEnd() {
    if (!specBrowserDrag || specBrowserDrag.pointerId !== "mouse") return;
    document.removeEventListener("mousemove", onSpecBrowserMouseMove, true);
    document.removeEventListener("mouseup", onSpecBrowserMouseEnd, true);
    finishSpecBrowserDrag();
  }

  function startSpecBrowserResize(pointerId, clientX, clientY, direction) {
    var rect = specBrowser.getBoundingClientRect();
    specBrowserResize = {
      pointerId: pointerId,
      direction: direction,
      startX: clientX,
      startY: clientY,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    };
    specBrowser.classList.add("pa-spec-browser-resizing");
  }

  function moveSpecBrowserResize(clientX, clientY) {
    if (!specBrowserResize || !specBrowser) return;
    var direction = specBrowserResize.direction;
    var deltaX = clientX - specBrowserResize.startX;
    var deltaY = clientY - specBrowserResize.startY;
    var minWidth = 640;
    var minHeight = 420;
    var width = specBrowserResize.width;
    var height = specBrowserResize.height;
    var left = specBrowserResize.left;
    var top = specBrowserResize.top;
    if (direction.indexOf("e") !== -1) width = Math.max(minWidth, specBrowserResize.width + deltaX);
    if (direction.indexOf("s") !== -1) height = Math.max(minHeight, specBrowserResize.height + deltaY);
    if (direction.indexOf("w") !== -1) {
      width = Math.max(minWidth, specBrowserResize.width - deltaX);
      left = specBrowserResize.left + specBrowserResize.width - width;
    }
    if (direction.indexOf("n") !== -1) {
      height = Math.max(minHeight, specBrowserResize.height - deltaY);
      top = specBrowserResize.top + specBrowserResize.height - height;
    }
    state.specBrowserPosition = { left: left, top: top };
    state.specBrowserSize = { width: width, height: height };
    specBrowser.style.left = left + "px";
    specBrowser.style.top = top + "px";
    specBrowser.style.width = width + "px";
    specBrowser.style.height = height + "px";
  }

  function onSpecBrowserResizePointerDown(event) {
    if (window.innerWidth <= 720) return;
    if (event.button != null && event.button !== 0) return;
    startSpecBrowserResize(event.pointerId, event.clientX, event.clientY, event.currentTarget.getAttribute("data-pa-spec-resize-handle") || "se");
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch (err) { /* Ignore unsupported capture. */ }
    document.addEventListener("pointermove", onSpecBrowserResizePointerMove, true);
    document.addEventListener("pointerup", onSpecBrowserResizePointerEnd, true);
    document.addEventListener("pointercancel", onSpecBrowserResizePointerEnd, true);
    event.preventDefault();
    event.stopPropagation();
  }

  function onSpecBrowserResizeMouseDown(event) {
    if (specBrowserResize || window.innerWidth <= 720) return;
    if (event.button != null && event.button !== 0) return;
    startSpecBrowserResize("mouse", event.clientX, event.clientY, event.currentTarget.getAttribute("data-pa-spec-resize-handle") || "se");
    document.addEventListener("mousemove", onSpecBrowserResizeMouseMove, true);
    document.addEventListener("mouseup", onSpecBrowserResizeMouseEnd, true);
    event.preventDefault();
    event.stopPropagation();
  }

  function onSpecBrowserResizePointerMove(event) {
    if (!specBrowserResize || event.pointerId !== specBrowserResize.pointerId) return;
    moveSpecBrowserResize(event.clientX, event.clientY);
  }

  function onSpecBrowserResizeMouseMove(event) {
    if (!specBrowserResize || specBrowserResize.pointerId !== "mouse") return;
    moveSpecBrowserResize(event.clientX, event.clientY);
  }

  function finishSpecBrowserResize() {
    if (!specBrowserResize) return;
    if (specBrowser) specBrowser.classList.remove("pa-spec-browser-resizing");
    specBrowserResize = null;
    persistSpecBrowserPreferences();
  }

  function onSpecBrowserResizePointerEnd(event) {
    if (!specBrowserResize || event.pointerId !== specBrowserResize.pointerId) return;
    document.removeEventListener("pointermove", onSpecBrowserResizePointerMove, true);
    document.removeEventListener("pointerup", onSpecBrowserResizePointerEnd, true);
    document.removeEventListener("pointercancel", onSpecBrowserResizePointerEnd, true);
    finishSpecBrowserResize();
  }

  function onSpecBrowserResizeMouseEnd() {
    if (!specBrowserResize || specBrowserResize.pointerId !== "mouse") return;
    document.removeEventListener("mousemove", onSpecBrowserResizeMouseMove, true);
    document.removeEventListener("mouseup", onSpecBrowserResizeMouseEnd, true);
    finishSpecBrowserResize();
  }

  function resetSidebarPosition() {
    state.sidebarPosition = null;
    try { window.localStorage.removeItem(sidebarPrefsKey + ":" + location.pathname); } catch (err) {}
    if (!sidebar) return;
    sidebar.style.left = "";
    sidebar.style.top = "";
    sidebar.style.right = "";
    sidebar.style.bottom = "";
    sidebar.style.height = "";
    sidebar.style.maxHeight = "";
    sidebar.classList.remove("pa-sidebar-positioned");
    syncSidebarLayout();
  }

  function clampToolbarPosition(left, top) {
    if (!toolbar) return { left: left, top: top };
    var rect = toolbar.getBoundingClientRect();
    var width = rect.width || toolbar.offsetWidth || 180;
    var height = rect.height || toolbar.offsetHeight || 44;
    var margin = 8;
    var maxLeft = Math.max(margin, window.innerWidth - width - margin);
    var maxTop = Math.max(margin, window.innerHeight - height - margin);
    return {
      left: Math.min(Math.max(margin, left), maxLeft),
      top: Math.min(Math.max(margin, top), maxTop)
    };
  }

  function clampSidebarPosition(left, top) {
    if (!sidebar) return { left: left, top: top };
    var rect = sidebar.getBoundingClientRect();
    var width = rect.width || sidebar.offsetWidth || 360;
    var margin = 8;
    var minHeight = Math.min(sidebarMinHeight, Math.max(180, window.innerHeight - margin * 2));
    var maxLeft = Math.max(margin, window.innerWidth - width - margin);
    var maxTop = Math.max(margin, window.innerHeight - minHeight - margin);
    return {
      left: Math.min(Math.max(margin, left), maxLeft),
      top: Math.min(Math.max(margin, top), maxTop)
    };
  }

  function applyToolbarPosition() {
    if (!toolbar || !state.toolbarPosition) return;
    var next = clampToolbarPosition(state.toolbarPosition.left, state.toolbarPosition.top);
    state.toolbarPosition = next;
    toolbar.style.left = next.left + "px";
    toolbar.style.top = next.top + "px";
    toolbar.style.right = "auto";
  }

  function applySidebarPosition() {
    if (!sidebar || !state.sidebarPosition) return;
    var next = clampSidebarPosition(state.sidebarPosition.left, state.sidebarPosition.top);
    state.sidebarPosition = next;
    var bottomGap = 16;
    var availableHeight = Math.max(180, window.innerHeight - next.top - bottomGap);
    var viewportHeight = "calc(100vh - " + Math.max(24, next.top + bottomGap) + "px)";
    var dynamicViewportHeight = "calc(100dvh - " + Math.max(24, next.top + bottomGap) + "px)";
    sidebar.classList.add("pa-sidebar-positioned");
    sidebar.style.left = next.left + "px";
    sidebar.style.top = next.top + "px";
    sidebar.style.right = "auto";
    sidebar.style.bottom = "auto";
    sidebar.style.height = availableHeight + "px";
    sidebar.style.height = viewportHeight;
    sidebar.style.height = dynamicViewportHeight;
    sidebar.style.maxHeight = availableHeight + "px";
    sidebar.style.maxHeight = viewportHeight;
    sidebar.style.maxHeight = dynamicViewportHeight;
  }

  function canDragToolbarFrom(target) {
    if (!toolbar || !target || target.closest("button")) return false;
    return target === toolbar || !!target.closest("[data-pa-drag-handle], .pa-toolbar-summary");
  }

  function startToolbarDrag(pointerId, clientX, clientY) {
    var rect = toolbar.getBoundingClientRect();
    toolbarDrag = {
      pointerId: pointerId,
      startX: clientX,
      startY: clientY,
      left: rect.left,
      top: rect.top
    };
    toolbar.classList.add("pa-toolbar-dragging");
  }

  function onToolbarPointerDown(event) {
    if (!canDragToolbarFrom(event.target)) return;
    if (event.button != null && event.button !== 0) return;
    startToolbarDrag(event.pointerId, event.clientX, event.clientY);
    try { toolbar.setPointerCapture(event.pointerId); } catch (err) { /* Ignore unsupported capture. */ }
    document.addEventListener("pointermove", onToolbarPointerMove, true);
    document.addEventListener("pointerup", onToolbarPointerEnd, true);
    document.addEventListener("pointercancel", onToolbarPointerEnd, true);
    event.preventDefault();
  }

  function onToolbarMouseDown(event) {
    if (toolbarDrag || !canDragToolbarFrom(event.target)) return;
    if (event.button != null && event.button !== 0) return;
    startToolbarDrag("mouse", event.clientX, event.clientY);
    document.addEventListener("mousemove", onToolbarMouseMove, true);
    document.addEventListener("mouseup", onToolbarMouseEnd, true);
    event.preventDefault();
  }

  function onToolbarPointerMove(event) {
    if (!toolbarDrag || event.pointerId !== toolbarDrag.pointerId) return;
    moveToolbarDrag(event.clientX, event.clientY);
  }

  function onToolbarMouseMove(event) {
    if (!toolbarDrag || toolbarDrag.pointerId !== "mouse") return;
    moveToolbarDrag(event.clientX, event.clientY);
  }

  function moveToolbarDrag(clientX, clientY) {
    var next = clampToolbarPosition(
      toolbarDrag.left + clientX - toolbarDrag.startX,
      toolbarDrag.top + clientY - toolbarDrag.startY
    );
    state.toolbarPosition = next;
    toolbar.style.left = next.left + "px";
    toolbar.style.top = next.top + "px";
    toolbar.style.right = "auto";
  }

  function onToolbarPointerEnd(event) {
    if (!toolbarDrag || event.pointerId !== toolbarDrag.pointerId) return;
    toolbar.classList.remove("pa-toolbar-dragging");
    document.removeEventListener("pointermove", onToolbarPointerMove, true);
    document.removeEventListener("pointerup", onToolbarPointerEnd, true);
    document.removeEventListener("pointercancel", onToolbarPointerEnd, true);
    toolbarDrag = null;
    persistToolbarPreferences();
  }

  function onToolbarMouseEnd() {
    if (!toolbarDrag || toolbarDrag.pointerId !== "mouse") return;
    toolbar.classList.remove("pa-toolbar-dragging");
    document.removeEventListener("mousemove", onToolbarMouseMove, true);
    document.removeEventListener("mouseup", onToolbarMouseEnd, true);
    toolbarDrag = null;
    persistToolbarPreferences();
  }

  function canDragSidebarFrom(target) {
    if (!sidebar || !target || target.closest("button")) return false;
    return !!target.closest("[data-pa-sidebar-drag-handle], .pa-sidebar-title");
  }

  function startSidebarDrag(pointerId, clientX, clientY) {
    var rect = sidebar.getBoundingClientRect();
    sidebarDrag = {
      pointerId: pointerId,
      startX: clientX,
      startY: clientY,
      left: rect.left,
      top: rect.top
    };
    sidebar.classList.add("pa-sidebar-dragging");
  }

  function onSidebarPointerDown(event) {
    if (!canDragSidebarFrom(event.target)) return;
    if (event.button != null && event.button !== 0) return;
    startSidebarDrag(event.pointerId, event.clientX, event.clientY);
    try { sidebar.setPointerCapture(event.pointerId); } catch (err) { /* Ignore unsupported capture. */ }
    document.addEventListener("pointermove", onSidebarPointerMove, true);
    document.addEventListener("pointerup", onSidebarPointerEnd, true);
    document.addEventListener("pointercancel", onSidebarPointerEnd, true);
    event.preventDefault();
  }

  function onSidebarMouseDown(event) {
    if (sidebarDrag || !canDragSidebarFrom(event.target)) return;
    if (event.button != null && event.button !== 0) return;
    startSidebarDrag("mouse", event.clientX, event.clientY);
    document.addEventListener("mousemove", onSidebarMouseMove, true);
    document.addEventListener("mouseup", onSidebarMouseEnd, true);
    event.preventDefault();
  }

  function onSidebarPointerMove(event) {
    if (!sidebarDrag || event.pointerId !== sidebarDrag.pointerId) return;
    moveSidebarDrag(event.clientX, event.clientY);
  }

  function onSidebarMouseMove(event) {
    if (!sidebarDrag || sidebarDrag.pointerId !== "mouse") return;
    moveSidebarDrag(event.clientX, event.clientY);
  }

  function moveSidebarDrag(clientX, clientY) {
    var next = clampSidebarPosition(
      sidebarDrag.left + clientX - sidebarDrag.startX,
      sidebarDrag.top + clientY - sidebarDrag.startY
    );
    state.sidebarPosition = next;
    applySidebarPosition();
  }

  function onSidebarPointerEnd(event) {
    if (!sidebarDrag || event.pointerId !== sidebarDrag.pointerId) return;
    sidebar.classList.remove("pa-sidebar-dragging");
    document.removeEventListener("pointermove", onSidebarPointerMove, true);
    document.removeEventListener("pointerup", onSidebarPointerEnd, true);
    document.removeEventListener("pointercancel", onSidebarPointerEnd, true);
    sidebarDrag = null;
    persistSidebarPreferences();
  }

  function onSidebarMouseEnd() {
    if (!sidebarDrag || sidebarDrag.pointerId !== "mouse") return;
    sidebar.classList.remove("pa-sidebar-dragging");
    document.removeEventListener("mousemove", onSidebarMouseMove, true);
    document.removeEventListener("mouseup", onSidebarMouseEnd, true);
    sidebarDrag = null;
    persistSidebarPreferences();
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(min, value), max);
  }

  function badgeRectForPosition(position) {
    var size = 24;
    return {
      left: position.left,
      top: position.top,
      right: position.left + size,
      bottom: position.top + size
    };
  }

  function rectsOverlap(a, b, padding) {
    padding = padding || 0;
    return !(
      a.right + padding <= b.left ||
      a.left >= b.right + padding ||
      a.bottom + padding <= b.top ||
      a.top >= b.bottom + padding
    );
  }

  function overlapArea(a, b) {
    var width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    var height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    return width * height;
  }

  function badgeCollisionScore(position, placedRects) {
    var rect = badgeRectForPosition(position);
    return placedRects.reduce(function (score, placed) {
      var padded = {
        left: placed.left - 8,
        top: placed.top - 8,
        right: placed.right + 8,
        bottom: placed.bottom + 8
      };
      return score + overlapArea(rect, padded);
    }, 0);
  }

  function clampBadgePosition(position) {
    var size = 24;
    var margin = 18;
    var maxLeft = Math.max(window.scrollX + margin, window.scrollX + window.innerWidth - size - margin);
    var maxTop = Math.max(window.scrollY + margin, window.scrollY + window.innerHeight - size - margin);
    return {
      left: clamp(position.left, window.scrollX + margin, maxLeft),
      top: clamp(position.top, window.scrollY + margin, maxTop)
    };
  }

  function nudgeBadgeAwayFromRects(position, placedRects) {
    var size = 24;
    var gap = 8;
    var current = clampBadgePosition(position);
    placedRects.forEach(function (placed) {
      var rect = badgeRectForPosition(current);
      if (!rectsOverlap(rect, placed, gap)) return;
      var options = [
        { left: placed.right + gap, top: current.top },
        { left: placed.left - size - gap, top: current.top },
        { left: current.left, top: placed.bottom + gap },
        { left: current.left, top: placed.top - size - gap }
      ].map(clampBadgePosition).filter(function (candidate) {
        return !rectsOverlap(badgeRectForPosition(candidate), placed, gap);
      }).sort(function (a, b) {
        var moveA = Math.abs(a.left - current.left) + Math.abs(a.top - current.top);
        var moveB = Math.abs(b.left - current.left) + Math.abs(b.top - current.top);
        return moveA - moveB;
      });
      if (options.length) current = options[0];
    });
    return current;
  }

  function computeBadgePosition(targetRect, placedRects) {
    var sx = window.scrollX;
    var sy = window.scrollY;
    var centerX = sx + targetRect.left + targetRect.width / 2 - 12;
    var centerY = sy + targetRect.top + targetRect.height / 2 - 12;
    var candidates = [
      { left: sx + targetRect.right - 12, top: sy + targetRect.top - 12 },
      { left: sx + targetRect.left - 12, top: sy + targetRect.top - 12 },
      { left: sx + targetRect.right - 12, top: sy + targetRect.bottom - 12 },
      { left: sx + targetRect.left - 12, top: sy + targetRect.bottom - 12 },
      { left: centerX, top: sy + targetRect.top - 30 },
      { left: centerX, top: sy + targetRect.bottom + 6 },
      { left: sx + targetRect.right + 6, top: centerY },
      { left: sx + targetRect.left - 30, top: centerY },
      { left: centerX, top: centerY }
    ].map(clampBadgePosition).map(function (position) {
      return nudgeBadgeAwayFromRects(position, placedRects);
    });

    for (var i = 0; i < candidates.length; i++) {
      var rect = badgeRectForPosition(candidates[i]);
      var collides = placedRects.some(function (placed) {
        return rectsOverlap(rect, placed, 8);
      });
      if (!collides) return candidates[i];
    }

    return candidates.slice().sort(function (a, b) {
      return badgeCollisionScore(a, placedRects) - badgeCollisionScore(b, placedRects);
    })[0];
  }

  function elementDocumentRect(el) {
    var rect = el.getBoundingClientRect();
    return {
      left: window.scrollX + rect.left,
      top: window.scrollY + rect.top,
      right: window.scrollX + rect.right,
      bottom: window.scrollY + rect.bottom
    };
  }

  function getBadgeAvoidRects() {
    return [toolbar].filter(function (node) {
      return node && node.getClientRects && node.getClientRects().length;
    }).map(elementDocumentRect);
  }

  function renderBadges() {
    $all(".pa-badge", root).forEach(function (node) { node.remove(); });
    var placedRects = getBadgeAvoidRects();
    var badgeIndex = 0;
    contextAnnotations().forEach(function (ann) {
      if (ann.visible === false) return;
      var target = findTarget(ann);
      if (!target) return;
      var displayLabel = "";
      if (isPageOverviewAnnotation(ann)) {
        displayLabel = annotationDisplayLabel(ann);
      } else {
        badgeIndex += 1;
        displayLabel = annotationDisplayLabel(ann, badgeIndex);
      }
      var rect = target.getBoundingClientRect();
      var position = computeBadgePosition(rect, placedRects);
      var badge = document.createElement("button");
      badge.type = "button";
      badge.className = "pa-badge" + (isPageOverviewAnnotation(ann) ? " pa-badge-page-overview" : "");
      badge.textContent = displayLabel;
      badge.setAttribute("data-pa-ann-id", ann.id);
      if (isPageOverviewAnnotation(ann)) badge.setAttribute("aria-label", "页面级说明标注 " + badge.textContent);
      badge.style.left = position.left + "px";
      badge.style.top = position.top + "px";
      badge.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (state.editMode) showEditor(ann, badge, target);
        else showCard(ann, badge);
      });
      root.appendChild(badge);
      placedRects.push(badgeRectForPosition(position));
    });
  }

  var ANNOTATION_TYPE_OPTIONS = [
    { value: "P", label: "P 页面级说明" },
    { value: "E", label: "E 入口来源" },
    { value: "C", label: "C 组件说明" },
    { value: "A", label: "A 操作交互" },
    { value: "J", label: "J 页面跳转" },
    { value: "S", label: "S 状态说明" },
    { value: "R", label: "R 规则说明" },
    { value: "AI", label: "AI AI处理逻辑" },
    { value: "PROMPT", label: "PROMPT 提示词策略" },
    { value: "CTX", label: "CTX 上下文来源" },
    { value: "HITL", label: "HITL 人工确认" },
    { value: "FALLBACK", label: "FALLBACK 失败兜底" },
    { value: "PERM", label: "PERM 权限控制" },
    { value: "WF", label: "WF 工作流节点" },
    { value: "DATA", label: "DATA 数据来源" },
    { value: "TRACK", label: "TRACK 埋点事件" },
    { value: "CV", label: "CV 转化节点" },
    { value: "REC", label: "REC 推荐逻辑" },
    { value: "METRIC", label: "METRIC 指标口径" },
    { value: "SOURCE", label: "SOURCE 数据来源" },
    { value: "FILTER", label: "FILTER 筛选联动" },
    { value: "REFRESH", label: "REFRESH 刷新频率" },
    { value: "DRILL", label: "DRILL 下钻路径" },
    { value: "PLAN", label: "PLAN 套餐权益" },
    { value: "ROLE", label: "ROLE 角色权限" },
    { value: "TENANT", label: "TENANT 租户隔离" },
    { value: "CONTENT", label: "CONTENT 内容来源" },
    { value: "PUBLISH", label: "PUBLISH 发布流程" },
    { value: "MOD", label: "MOD 审核机制" }
  ];

  var AUDIENCE_MODE_OPTIONS = [
    { value: "product-review", label: "product-review 产品评审" },
    { value: "dev-handoff", label: "dev-handoff 研发交付" },
    { value: "qa-acceptance", label: "qa-acceptance 测试验收" },
    { value: "customer-demo", label: "customer-demo 客户演示" }
  ];

  function annotationAudienceMode(ann) {
    return (ann && ann.audienceMode) || (state.data && state.data.audienceMode) || "product-review";
  }

  function hasText(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function hasEvidence(ann, isEditing) {
    if (isEditing) return true;
    var items = Array.isArray(ann.evidence) ? ann.evidence.filter(Boolean) : [];
    if (items.length > 0) return true;
    var target = ann.target || {};
    if (hasText(target.sourceElementId) || hasText(target.sourcePath)) return true;
    var source = ann.source;
    if (source && typeof source === "object" && hasText(source.ref) && source.ref !== "页面内新增") return true;
    if (typeof source === "string" && hasText(source)) return true;
    return false;
  }

  function getVisibleTabs(ann, isEditing) {
    var tabs = [{ key: "product", label: "产品说明" }];
    if (isEditing || hasText(ann.devNotesMarkdown)) {
      tabs.push({ key: "dev", label: "研发说明" });
    }
    if (isEditing || hasEvidence(ann, false)) {
      tabs.push({ key: "evidence", label: "证据" });
    }
    return tabs;
  }

  function evidenceMarkdown(ann) {
    var items = Array.isArray(ann.evidence) ? ann.evidence.filter(Boolean) : [];
    var target = ann.target || {};
    var lines = [];
    if (target.selector) lines.push("- selector：`" + target.selector + "`");
    if (target.sourceElementId) lines.push("- sourceElementId：`" + target.sourceElementId + "`");
    if (target.sourcePath) lines.push("- sourcePath：`" + target.sourcePath + "`");
    items.forEach(function (item) { lines.push("- " + item); });
    return lines.length ? "### 证据\n\n" + lines.join("\n") : "";
  }

  function evidenceEditText(ann) {
    var items = Array.isArray(ann.evidence) ? ann.evidence.filter(Boolean) : [];
    return items.join("\n");
  }

  function defaultCardTab(ann) {
    return "product";
  }

  function cardTabPanels(ann) {
    return {
      product: isSpecOwnedAnnotation(ann)
        ? (state.specCache[specRefFor(ann)] || "正在加载页面说明 Markdown...")
        : (ann.contentMarkdown || ""),
      dev: ann.devNotesMarkdown || "",
      evidence: evidenceMarkdown(ann)
    };
  }

  function renderCardTabs(ann, activeTab, isEditing) {
    var tabs = getVisibleTabs(ann, isEditing);
    if (!tabs.some(function (item) { return item.key === activeTab; })) {
      activeTab = "product";
    }
    return tabs.map(function (item) {
      var activeClass = item.key === activeTab ? " pa-card-tab-active" : "";
      var selected = item.key === activeTab ? "true" : "false";
      return '<button type="button" class="pa-card-tab' + activeClass + '" data-pa-card-tab="' + item.key + '" role="tab" aria-selected="' + selected + '">' + escapeHtml(item.label) + "</button>";
    }).join("");
  }

  function renderCardTabBody(ann, activeTab, isEditing) {
    var panels = cardTabPanels(ann);
    var tabs = getVisibleTabs(ann, isEditing);
    if (!tabs.some(function (item) { return item.key === activeTab; })) {
      activeTab = "product";
    }
    var html = "";
    tabs.forEach(function (item) {
      var hidden = item.key !== activeTab ? ' hidden style="display:none"' : "";
      var content = panels[item.key] || "";
      html += '<div class="pa-card-tab-panel" data-pa-card-tab-panel="' + item.key + '"' + hidden + '><div class="pa-markdown">' + renderMarkdown(content) + "</div></div>";
    });
    return html;
  }

  function setCardTab(activeCard, ann, tab, isEditing) {
    var tabs = getVisibleTabs(ann, !!isEditing);
    if (!tabs.some(function (item) { return item.key === tab; })) {
      tab = "product";
    }
    var tabButtons = $all("[data-pa-card-tab]", activeCard);
    var panels = $all("[data-pa-card-tab-panel]", activeCard);
    tabButtons.forEach(function (button) {
      var isActive = button.getAttribute("data-pa-card-tab") === tab;
      button.classList.toggle("pa-card-tab-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    panels.forEach(function (panel) {
      var isActive = panel.getAttribute("data-pa-card-tab-panel") === tab;
      panel.hidden = !isActive;
      panel.style.display = isActive ? "" : "none";
    });
    activeCard.__activeTab = tab;
    renderMermaid(activeCard);
  }

  function renderSelectOptions(options, selected) {
    return options.map(function (item) {
      var selectedAttr = item.value === selected ? " selected" : "";
      return '<option value="' + escapeHtml(item.value) + '"' + selectedAttr + ">" + escapeHtml(item.label) + "</option>";
    }).join("");
  }

  function showCard(ann, anchor) {
    closeCard();
    state.activeId = ann.id;
    var initialTab = defaultCardTab(ann);
    card = document.createElement("div");
    card.className = "pa-ui pa-card";
    card.innerHTML = [
      '<div class="pa-card-header">',
      '<div><div class="pa-card-kicker">' + escapeHtml(ann.id) + " · " + escapeHtml(ann.kind || "note") + '</div>',
      '<div class="pa-card-title">' + escapeHtml(ann.title) + "</div></div>",
      '<div class="pa-card-actions">',
      '<button type="button" class="pa-icon-button" data-pa-card-action="fullscreen" title="全屏查看" aria-label="全屏查看">⛶</button>',
      '<button type="button" class="pa-icon-button" data-pa-card-action="edit" title="编辑">✎</button>',
      '<button type="button" class="pa-icon-button" data-pa-card-action="close" title="关闭">×</button>',
      "</div></div>",
      '<div class="pa-card-tabs" role="tablist">',
      renderCardTabs(ann, initialTab, false),
      "</div>",
      '<div class="pa-card-body">' + renderCardTabBody(ann, initialTab, false) + "</div>"
    ].join("");
    card.__activeTab = initialTab;
    setCardTab(card, ann, initialTab, false);
    card.addEventListener("click", onCardClick);
    document.body.appendChild(card);
    positionCard(card, anchor);
    renderMermaid(card);
    if (isSpecOwnedAnnotation(ann)) {
      loadSpecMarkdown(ann).then(function (markdown) {
        if (!card || state.activeId !== ann.id) return;
        var panel = $('[data-pa-card-tab-panel="product"] .pa-markdown', card);
        if (panel) {
          panel.innerHTML = renderMarkdown(markdown);
          renderMermaid(panel);
        }
      }).catch(function (err) {
        if (!card || state.activeId !== ann.id) return;
        var panel = $('[data-pa-card-tab-panel="product"] .pa-markdown', card);
        if (panel) {
          panel.innerHTML = renderMarkdown(
            "### 页面说明加载失败\n\n- 文件：" + specRefFor(ann) + "\n- 错误：" + (err && err.message ? err.message : String(err))
          );
        }
      });
    }
  }

  function renderEditorPanelContent(tab, ann) {
    if (tab === "basic") {
      return [
        '<div class="pa-basic-grid">',
        '<div class="pa-field pa-field-wide"><label><span>标题</span></label><input name="title" value="' + escapeHtml(ann.title) + '"></div>',
        '<div class="pa-field pa-field-wide"><label><span>Selector</span><small>定位页面元素</small></label><input name="selector" value="' + escapeHtml(ann.target.selector) + '"></div>',
        '<div class="pa-field"><label><span>标注类型</span></label><select name="annotationType">' + renderSelectOptions(ANNOTATION_TYPE_OPTIONS, ann.annotationType || "C") + "</select></div>",
        '<div class="pa-field"><label><span>受众模式</span></label><select name="audienceMode">' + renderSelectOptions(AUDIENCE_MODE_OPTIONS, annotationAudienceMode(ann)) + "</select></div>",
        '<details class="pa-advanced-fields pa-field-wide"><summary>高级定位字段</summary>',
        '<div class="pa-basic-grid">',
        '<div class="pa-field"><label><span>所属二级界面</span><small>surfaceId</small></label><select name="surfaceId">' + renderSurfaceOptions(ann.surfaceId || "") + "</select></div>",
        '<div class="pa-field"><label><span>未打开时展示</span><small>displayWhenClosed</small></label><select name="displayWhenClosed">' + renderSelectOptions(DISPLAY_WHEN_CLOSED_OPTIONS, ann.displayWhenClosed || "") + "</select></div>",
        '<div class="pa-field pa-field-wide"><label><span>入口锚点</span><small>fallbackAnchorSelector</small></label><input name="fallbackAnchorSelector" value="' + escapeHtml(ann.fallbackAnchorSelector || "") + '"></div>',
        "</div></details>",
        "</div>"
      ].join("");
    }
    if (tab === "dev") {
      return '<div class="pa-field pa-content-field"><label>研发说明 Markdown</label><textarea name="devNotesMarkdown" class="pa-markdown-editor">' + escapeHtml(ann.devNotesMarkdown || "") + "</textarea></div>";
    }
    if (tab === "evidence") {
      return [
        '<div class="pa-field"><label>sourceElementId</label><input name="sourceElementId" value="' + escapeHtml(ann.target.sourceElementId || "") + '"></div>',
        '<div class="pa-field"><label>sourcePath</label><input name="sourcePath" value="' + escapeHtml(ann.target.sourcePath || "") + '"></div>',
        '<div class="pa-field pa-content-field"><label>证据 evidence（每行一条）</label><textarea name="evidenceText" class="pa-markdown-editor">' + escapeHtml(evidenceEditText(ann)) + "</textarea></div>"
      ].join("");
    }
    if (isSpecOwnedAnnotation(ann)) {
      var specRef = specRefFor(ann);
      var markdown = state.specCache[specRef] || "";
      return [
        '<div class="pa-field pa-content-field">',
        '<label>页面说明 Markdown <small>' + escapeHtml(specRef || "缺少 specRef") + "</small></label>",
        '<textarea name="specMarkdown" class="pa-markdown-editor" data-pa-spec-ref="' + escapeHtml(specRef) + '">' + escapeHtml(markdown) + "</textarea>",
        '<small>该内容保存到 Markdown 文件，不写入 annotations.json 的 contentMarkdown。</small>',
        "</div>"
      ].join("");
    }
    return '<div class="pa-field pa-content-field"><label>产品说明 Markdown</label><textarea name="contentMarkdown" class="pa-markdown-editor">' + escapeHtml(ann.contentMarkdown || "") + "</textarea></div>";
  }

  function renderEditorBody(ann, activeTab) {
    var tabs = [
      { key: "basic", label: "基础信息" },
      { key: "product", label: "产品说明" },
      { key: "dev", label: "研发说明" },
      { key: "evidence", label: "证据" }
    ];
    if (!tabs.some(function (item) { return item.key === activeTab; })) {
      activeTab = "product";
    }
    var tabHtml = tabs.map(function (item) {
      var activeClass = item.key === activeTab ? " pa-card-tab-active" : "";
      return '<button type="button" class="pa-card-tab' + activeClass + '" data-pa-editor-tab="' + item.key + '">' + escapeHtml(item.label) + "</button>";
    }).join("");
    var panelHtml = tabs.map(function (item) {
      var hidden = item.key !== activeTab ? ' hidden style="display:none"' : "";
      return '<div class="pa-editor-panel" data-pa-editor-panel="' + item.key + '"' + hidden + ">" + renderEditorPanelContent(item.key, ann) + "</div>";
    }).join("");
    return { tabHtml: tabHtml, panelHtml: panelHtml, activeTab: activeTab };
  }

  function setEditorTab(editorCard, tab) {
    var tabs = $all("[data-pa-editor-tab]", editorCard);
    var panels = $all("[data-pa-editor-panel]", editorCard);
    tabs.forEach(function (button) {
      var isActive = button.getAttribute("data-pa-editor-tab") === tab;
      button.classList.toggle("pa-card-tab-active", isActive);
    });
    panels.forEach(function (panel) {
      var isActive = panel.getAttribute("data-pa-editor-panel") === tab;
      panel.hidden = !isActive;
      panel.style.display = isActive ? "" : "none";
    });
    editorCard.__editorTab = tab;
  }

  function closeCustomSelects(base, except) {
    $all(".pa-select.pa-select-open", base || document).forEach(function (node) {
      if (node !== except) node.classList.remove("pa-select-open");
    });
  }

  function enhanceEditorSelects(editorCard) {
    $all(".pa-field select", editorCard).forEach(function (select) {
      if (select.__paEnhanced) return;
      select.__paEnhanced = true;
      select.classList.add("pa-native-select");
      var wrapper = document.createElement("div");
      wrapper.className = "pa-select";
      var trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "pa-select-trigger";
      trigger.setAttribute("aria-haspopup", "listbox");
      trigger.setAttribute("aria-expanded", "false");
      var menu = document.createElement("div");
      menu.className = "pa-select-menu";
      menu.setAttribute("role", "listbox");

      function selectedLabel() {
        var option = select.options[select.selectedIndex];
        return option ? option.textContent : "";
      }

      function renderTrigger() {
        trigger.innerHTML = '<span>' + escapeHtml(selectedLabel()) + '</span><span class="pa-select-chevron">⌄</span>';
        trigger.setAttribute("aria-expanded", wrapper.classList.contains("pa-select-open") ? "true" : "false");
      }

      function renderMenu() {
        menu.innerHTML = "";
        Array.prototype.forEach.call(select.options, function (option) {
          var item = document.createElement("button");
          item.type = "button";
          item.className = "pa-select-option" + (option.selected ? " pa-select-option-selected" : "");
          item.setAttribute("role", "option");
          item.setAttribute("aria-selected", option.selected ? "true" : "false");
          item.setAttribute("data-pa-select-value", option.value);
          item.textContent = option.textContent;
          item.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            select.value = option.value;
            select.dispatchEvent(new Event("change", { bubbles: true }));
            wrapper.classList.remove("pa-select-open");
            renderMenu();
            renderTrigger();
          });
          menu.appendChild(item);
        });
      }

      trigger.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        var willOpen = !wrapper.classList.contains("pa-select-open");
        closeCustomSelects(editorCard, wrapper);
        wrapper.classList.toggle("pa-select-open", willOpen);
        renderMenu();
        renderTrigger();
      });
      select.addEventListener("change", function () {
        renderMenu();
        renderTrigger();
      });
      renderMenu();
      renderTrigger();
      wrapper.appendChild(trigger);
      wrapper.appendChild(menu);
      select.insertAdjacentElement("afterend", wrapper);
    });
  }

  function bindMarkdownImagePaste(editorCard) {
    $all("textarea.pa-markdown-editor", editorCard).forEach(function (textarea) {
      if (textarea.__paImagePasteBound) return;
      textarea.__paImagePasteBound = true;
      textarea.addEventListener("paste", function (event) {
        var file = clipboardImageFile(event);
        if (!file) return;
        event.preventDefault();
        handleMarkdownImagePaste(editorCard, textarea, file);
      });
    });
  }

  function clipboardImageFile(event) {
    var clipboard = event.clipboardData;
    if (!clipboard || !clipboard.items) return null;
    for (var i = 0; i < clipboard.items.length; i += 1) {
      var item = clipboard.items[i];
      if (item && item.kind === "file" && /^image\//i.test(item.type || "")) {
        return item.getAsFile();
      }
    }
    return null;
  }

  function handleMarkdownImagePaste(editorCard, textarea, file) {
    if (!file) return;
    if (!window.fetch || !window.FileReader) {
      toast("当前浏览器不支持粘贴图片上传");
      return;
    }
    textarea.disabled = true;
    toast("正在上传剪贴板图片...");
    readFileAsDataUrl(file).then(function (dataUrl) {
      var ann = editorCard.__annotation || {};
      return uploadAnnotationAsset({
        fileName: file.name || "",
        mimeType: file.type || "image/png",
        dataUrl: dataUrl,
        annotationId: ann.id || "",
        pageKey: ann.pageKey || state.pageKey || ""
      });
    }).then(function (asset) {
      insertMarkdownAtCursor(textarea, "![粘贴图片](" + asset.src + ")");
      trackAnnotationAsset(editorCard.__annotation, asset);
      toast(textarea.name === "specMarkdown" ? "图片已插入页面说明，保存后写入 Markdown 文件" : "图片已插入标注，保存后写入 annotations.json");
    }).catch(function (err) {
      toast("图片上传失败：" + (err && err.message ? err.message : String(err)));
    }).then(function () {
      textarea.disabled = false;
      textarea.focus();
    });
  }

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || "")); };
      reader.onerror = function () { reject(reader.error || new Error("读取剪贴板图片失败")); };
      reader.readAsDataURL(file);
    });
  }

  function uploadAnnotationAsset(payload) {
    return fetch(CFG.assetsEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    }).then(function (data) {
      if (!data || !data.src) throw new Error("上传接口未返回图片地址");
      return data;
    });
  }

  function insertMarkdownAtCursor(textarea, markdown) {
    var start = typeof textarea.selectionStart === "number" ? textarea.selectionStart : textarea.value.length;
    var end = typeof textarea.selectionEnd === "number" ? textarea.selectionEnd : start;
    var before = textarea.value.slice(0, start);
    var after = textarea.value.slice(end);
    var prefix = before && !/\n\n$/.test(before) ? (/\n$/.test(before) ? "\n" : "\n\n") : "";
    var suffix = after && !/^\n\n/.test(after) ? (after.charAt(0) === "\n" ? "\n" : "\n\n") : "";
    var next = prefix + markdown + suffix;
    textarea.value = before + next + after;
    var cursor = before.length + prefix.length + markdown.length;
    textarea.setSelectionRange(cursor, cursor);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function trackAnnotationAsset(ann, asset) {
    if (!ann || !asset || !asset.src) return;
    if (!Array.isArray(ann.assets)) ann.assets = [];
    if (ann.assets.some(function (item) { return item && item.src === asset.src; })) return;
    ann.assets.push({
      type: "image",
      src: asset.src,
      fileName: asset.fileName || "",
      mimeType: asset.mimeType || "",
      source: "clipboard",
      createdAt: new Date().toISOString()
    });
  }

  function showEditor(ann, anchor, target) {
    closeCard();
    var isNew = !ann;
    var next = ann || createAnnotationForTarget(target);
    var editorBody = renderEditorBody(next, "product");
    card = document.createElement("div");
    card.className = "pa-ui pa-card";
    card.innerHTML = [
      '<div class="pa-card-header">',
      '<div><div class="pa-card-kicker">' + (isNew ? "NEW" : escapeHtml(next.id)) + '</div>',
      '<div class="pa-card-title">' + (isNew ? "新增标注" : "编辑标注") + "</div></div>",
      '<div class="pa-card-actions">',
      '<button type="button" class="pa-icon-button" data-pa-card-action="fullscreen" title="全屏编辑" aria-label="全屏编辑">⛶</button>',
      '<button type="button" class="pa-icon-button" data-pa-card-action="close" title="关闭">×</button>',
      "</div>",
      "</div>",
      '<div class="pa-card-tabs pa-editor-tabs" role="tablist">',
      editorBody.tabHtml,
      "</div>",
      '<div class="pa-card-body"><form class="pa-editor">',
      editorBody.panelHtml,
      '<div class="pa-editor-actions">',
      '<div class="pa-editor-actions-group">',
      isNew ? "" : '<button type="button" class="pa-panel-button pa-danger" data-pa-card-action="delete">删除</button>',
      "</div>",
      '<div class="pa-editor-actions-group">',
      '<button type="button" class="pa-panel-button" data-pa-card-action="cancel">取消</button>',
      '<button type="submit" class="pa-panel-button pa-primary">保存</button>',
      "</div></div>",
      "</form></div>"
    ].join("");
    card.__annotation = next;
    card.__isNew = isNew;
    card.__editorTab = editorBody.activeTab;
    card.addEventListener("click", onCardClick);
    var form = $("form", card);
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      saveEditor(card);
    });
    document.body.appendChild(card);
    enhanceEditorSelects(card);
    bindMarkdownImagePaste(card);
    if (isSpecOwnedAnnotation(next)) {
      loadSpecMarkdown(next).then(function (markdown) {
        if (!card || card.__annotation !== next) return;
        var textarea = $('textarea[name="specMarkdown"]', card);
        if (textarea && !textarea.value) textarea.value = markdown;
      }).catch(function (err) {
        toast("页面说明加载失败：" + (err && err.message ? err.message : String(err)));
      });
    }
    positionCard(card, anchor || target || document.body);
    $("input[name='title']", card).focus();
  }

  function onCardClick(event) {
    if (card && !event.target.closest(".pa-select")) closeCustomSelects(card);
    var editorTabButton = event.target.closest("[data-pa-editor-tab]");
    if (editorTabButton && card) {
      setEditorTab(card, editorTabButton.getAttribute("data-pa-editor-tab"));
      closeCustomSelects(card);
      return;
    }
    var tabButton = event.target.closest("[data-pa-card-tab]");
    if (tabButton && card) {
      var ann = state.data.annotations.find(function (item) { return item.id === state.activeId; });
      if (ann) setCardTab(card, ann, tabButton.getAttribute("data-pa-card-tab"), false);
      return;
    }
    var button = event.target.closest("[data-pa-card-action]");
    if (!button) return;
    var action = button.getAttribute("data-pa-card-action");
    var ann = state.data.annotations.find(function (item) { return item.id === state.activeId; });
    if (action === "close" || action === "cancel") closeCard();
    if (action === "fullscreen" && card) toggleCardFullscreen(card);
    if (action === "edit" && ann) showEditor(ann, button, findTarget(ann));
    if (action === "delete" && card && card.__annotation) deleteAnnotation(card.__annotation.id);
  }

  function toggleCardFullscreen(activeCard) {
    activeCard.classList.toggle("pa-card-fullscreen");
    updateCardFullscreenButton(activeCard);
  }

  function updateCardFullscreenButton(activeCard) {
    var button = $('[data-pa-card-action="fullscreen"]', activeCard);
    if (!button) return;
    var isFullscreen = activeCard.classList.contains("pa-card-fullscreen");
    button.textContent = isFullscreen ? "↙" : "⛶";
    button.title = isFullscreen ? "还原卡片" : "全屏查看/编辑";
    button.setAttribute("aria-label", button.title);
  }

  function saveEditor(editorCard) {
    var ann = editorCard.__annotation;
    ann.title = $("input[name='title']", editorCard).value.trim() || "未命名标注";
    ann.target.selector = $("input[name='selector']", editorCard).value.trim() || ann.target.selector;
    ann.target.strategy = "manual";
    var sourceElementId = $("input[name='sourceElementId']", editorCard);
    var sourcePath = $("input[name='sourcePath']", editorCard);
    if (sourceElementId) ann.target.sourceElementId = sourceElementId.value.trim() || undefined;
    if (sourcePath) ann.target.sourcePath = sourcePath.value.trim() || undefined;
    var specMarkdown = $("textarea[name='specMarkdown']", editorCard);
    var contentMarkdown = $("textarea[name='contentMarkdown']", editorCard);
    if (!specMarkdown && contentMarkdown) {
      ann.contentMarkdown = contentMarkdown.value.trim();
    }
    var devNotes = $("textarea[name='devNotesMarkdown']", editorCard);
    ann.devNotesMarkdown = devNotes ? devNotes.value.trim() || null : ann.devNotesMarkdown || null;
    var annotationType = $("select[name='annotationType']", editorCard);
    if (annotationType) ann.annotationType = annotationType.value || ann.annotationType || "C";
    var audienceMode = $("select[name='audienceMode']", editorCard);
    if (audienceMode) ann.audienceMode = audienceMode.value || "product-review";
    var evidenceText = $("textarea[name='evidenceText']", editorCard);
    if (evidenceText) {
      ann.evidence = evidenceText.value.split("\n").map(function (line) { return line.trim(); }).filter(Boolean);
    }
    var surfaceId = $("select[name='surfaceId']", editorCard);
    if (surfaceId) {
      var nextSurfaceId = surfaceId.value.trim();
      if (nextSurfaceId) ann.surfaceId = nextSurfaceId;
      else delete ann.surfaceId;
    }
    var displayWhenClosed = $("select[name='displayWhenClosed']", editorCard);
    if (displayWhenClosed) {
      var nextDisplay = displayWhenClosed.value.trim();
      if (nextDisplay) ann.displayWhenClosed = nextDisplay;
      else delete ann.displayWhenClosed;
    }
    var fallbackAnchorSelector = $("input[name='fallbackAnchorSelector']", editorCard);
    if (fallbackAnchorSelector) {
      var nextFallback = fallbackAnchorSelector.value.trim();
      if (nextFallback) ann.fallbackAnchorSelector = nextFallback;
      else delete ann.fallbackAnchorSelector;
    }
    ann.updatedAt = new Date().toISOString();
    if (editorCard.__isNew) state.data.annotations.push(ann);
    state.dirty = true;
    var savePromise = specMarkdown
      ? persistSpecMarkdown(ann, specMarkdown.value).then(function (specResult) {
        delete ann.contentMarkdown;
        return persistData("save", ann).then(function (annotationResult) {
          return { spec: specResult, annotation: annotationResult, persisted: specResult && specResult.persisted && annotationResult && annotationResult.persisted };
        });
      })
      : persistData("save", ann);
    savePromise.then(function (result) {
      closeCard();
      render();
      if (specMarkdown) {
        toast(result && result.spec && result.spec.persisted ? "页面说明 Markdown 已保存" : "页面说明已暂存浏览器，未写入项目文件");
      } else if (result && result.persisted && result.reportRefreshRequired) {
        toast("标注已保存，请重新生成 annotation-report.md / annotation-checklist.md");
      } else {
        toast(result && result.persisted ? "标注已保存" : "标注已暂存浏览器，未写入项目文件");
      }
    });
  }

  function deleteAnnotation(id) {
    if (!window.confirm("确定要删除这条标注吗？")) return;
    var index = state.data.annotations.findIndex(function (item) { return item.id === id; });
    if (index >= 0) {
      var removed = state.data.annotations.splice(index, 1)[0];
      state.dirty = true;
      persistData("delete", removed).then(function (result) {
        closeCard();
        render();
        if (result && result.persisted && result.reportRefreshRequired) {
          toast("标注已删除，请重新生成 annotation-report.md / annotation-checklist.md");
        } else {
          toast(result && result.persisted ? "标注已删除" : "删除结果已暂存浏览器，未写入项目文件");
        }
      });
    }
  }

  function createAnnotationForTarget(target) {
    var selector = getOptimalSelector(target);
    var text = (target.innerText || target.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80);
    var ann = {
      id: nextId(state.pageKey),
      pageKey: state.pageKey,
      target: {
        selector: selector,
        fallbackText: text,
        strategy: selector.charAt(0) === "#" ? "id" : "manual",
        boundsHint: { tag: target.tagName ? target.tagName.toLowerCase() : "" }
      },
      title: text ? text.slice(0, 24) : "新增标注",
      contentMarkdown: "### 业务含义\n\n",
      devNotesMarkdown: null,
      annotationType: "C",
      audienceMode: "product-review",
      evidence: [],
      kind: "note",
      priority: "medium",
      order: nextOrderForPage(state.pageKey, state.data.annotations),
      visible: true,
      source: { type: "manual", ref: "页面内新增" },
      createdBy: "manual",
      updatedAt: new Date().toISOString()
    };
    var surfaceInfo = inferSurfaceForTarget(target);
    if (surfaceInfo && surfaceInfo.surface) {
      ann.surfaceId = surfaceInfo.surface.id;
      ann.displayWhenClosed = "sidebar-only";
      ann.fallbackAnchorSelector = surfaceInfo.surface.triggerSelector || "";
      ann.target.selector = getOptimalSelector(target, surfaceInfo.root);
      ann.kind = "form";
      ann.annotationType = "C";
      ann.topics = ["surface", "form", "field"];
    }
    return ann;
  }

  function nextId(pageKey) {
    return nextIdFromAnnotations(pageKey, state.data && state.data.annotations, {});
  }

  function getOptimalSelector(el, boundary) {
    if (!el || el === document.body || el === boundary) return "body";
    if (el.id) return "#" + cssEscape(el.id);
    var dataAnn = el.getAttribute("data-ann");
    if (dataAnn) return '[data-ann="' + attrEscape(dataAnn) + '"]';
    var testId = el.getAttribute("data-testid");
    if (testId) return '[data-testid="' + attrEscape(testId) + '"]';
    var aria = el.getAttribute("aria-label");
    if (aria) return '[aria-label="' + attrEscape(aria) + '"]';

    var path = [];
    var current = el;
    while (current && current.nodeType === 1 && current !== document.body && current !== boundary) {
      var tag = current.tagName.toLowerCase();
      var selector = tag;
      var siblings = Array.prototype.filter.call(current.parentElement ? current.parentElement.children : [], function (sibling) {
        return sibling.tagName === current.tagName;
      });
      if (siblings.length > 1) selector += ":nth-of-type(" + (siblings.indexOf(current) + 1) + ")";
      path.unshift(selector);
      if (path.length >= 5) break;
      current = current.parentElement;
    }
    return path.join(" > ");
  }

  function cssEscape(value) {
    if (window.CSS && window.CSS.escape) return window.CSS.escape(value);
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  function attrEscape(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  function positionCard(panel, anchor) {
    var rect = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: 16, right: 16, top: 76, bottom: 76 };
    var gap = 12;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var width = Math.min(520, vw - 32);
    var left = rect.right + gap;
    if (left + width > vw - 16) left = rect.left - width - gap;
    if (left < 16) left = 16;
    panel.style.left = left + "px";
    panel.style.width = width + "px";
    var height = Math.min(panel.offsetHeight || 360, Math.floor(vh * 0.7));
    var top = rect.top;
    if (top + height > vh - 16) top = vh - height - 16;
    if (top < 16) top = 16;
    panel.style.top = top + "px";
  }

  function closeCard() {
    if (card) card.remove();
    card = null;
    state.activeId = null;
  }

  function specBrowserGroups() {
    var groups = [];
    (state.data.pages || []).forEach(function (page) {
      var label = pagePortal(page);
      var group = groups.find(function (item) { return item.label === label; });
      if (!group) {
        group = { label: label, pages: [] };
        groups.push(group);
      }
      group.pages.push(page);
    });
    return groups;
  }

  function renderSpecBrowserOptions() {
    return specBrowserGroups().map(function (group) {
      return [
        '<optgroup label="' + escapeHtml(group.label) + '">',
        group.pages.map(function (page) {
          return '<option value="' + escapeHtml(page.pageKey) + '">' + escapeHtml(page.title) + ' · ' + escapeHtml(page.pageKey) + '</option>';
        }).join(""),
        '</optgroup>'
      ].join("");
    }).join("");
  }

  function closeSpecBrowser() {
    state.specBrowserOpen = false;
    state.specBrowserPageKey = null;
    if (specBrowserPreviewTimer) clearTimeout(specBrowserPreviewTimer);
    if (specBrowserResizeObserver) specBrowserResizeObserver.disconnect();
    specBrowserResizeObserver = null;
    if (specBrowser) specBrowser.remove();
    specBrowser = null;
    updateToolbar();
  }

  function selectSpecBrowserPage(pageKey) {
    var page = pageByKey(pageKey);
    if (!page) return;
    var currentAnnotation = specBrowser && specBrowser.__annotation;
    var markdown = captureSpecBrowserMarkdown();
    if (currentAnnotation && markdown !== specBrowser.__loadedMarkdown) {
      persistSpecDraft(specRefFor(currentAnnotation), markdown, "page-navigation");
    }
    state.specBrowserPageKey = pageKey;
    if (pageKey === state.pageKey) {
      updateSpecBrowser();
      return;
    }
    persistSpecBrowserPreferences();
    try { window.sessionStorage.setItem(specBrowserReopenKey, pageKey); } catch (err) {}
    var target = pageTargetUrl(page);
    if (!target) {
      updateSpecBrowser();
      return;
    }
    window.location.assign(target);
  }

  function captureSpecBrowserMarkdown() {
    if (!specBrowser || !specBrowser.__annotation) return "";
    var editor = $("[data-pa-spec-editor]", specBrowser);
    var markdown = editor ? editor.value : (specBrowser.__markdown || "");
    var ref = specRefFor(specBrowser.__annotation);
    specBrowser.__markdown = markdown;
    if (ref) state.specCache[ref] = markdown;
    return markdown;
  }

  function renderSpecBrowserMarkdown(markdown) {
    if (!specBrowser) return;
    var editor = $("[data-pa-spec-editor]", specBrowser);
    var content = $("[data-pa-spec-content]", specBrowser);
    specBrowser.__markdown = markdown;
    specBrowser.__loadedMarkdown = markdown;
    if (editor && editor.value !== markdown) editor.value = markdown;
    if (content) {
      content.innerHTML = renderMarkdown(markdown);
      content.scrollTop = 0;
      renderMermaid(content);
    }
  }

  function scheduleSpecBrowserPreview(markdown) {
    if (specBrowserPreviewTimer) clearTimeout(specBrowserPreviewTimer);
    specBrowserPreviewTimer = setTimeout(function () {
      if (!specBrowser) return;
      var content = $("[data-pa-spec-content]", specBrowser);
      if (!content) return;
      content.innerHTML = renderMarkdown(markdown);
      renderMermaid(content);
    }, 220);
  }

  function syncSpecBrowserEditorState() {
    if (!specBrowser) return;
    specBrowser.classList.toggle("pa-spec-editor-collapsed", state.specBrowserEditorCollapsed);
    var button = $("[data-pa-spec-toggle-editor]", specBrowser);
    if (!button) return;
    button.textContent = state.specBrowserEditorCollapsed ? "展开编辑" : "收起编辑";
    button.setAttribute("aria-expanded", String(!state.specBrowserEditorCollapsed));
    button.setAttribute("title", state.specBrowserEditorCollapsed ? "展开 Markdown 编辑区" : "收起 Markdown 编辑区");
  }

  function toggleSpecBrowserEditor() {
    captureSpecBrowserMarkdown();
    state.specBrowserEditorCollapsed = !state.specBrowserEditorCollapsed;
    syncSpecBrowserEditorState();
    persistSpecBrowserPreferences();
  }

  function saveSpecBrowserMarkdown() {
    if (!specBrowser || !specBrowser.__annotation) return;
    var annotation = specBrowser.__annotation;
    var markdown = captureSpecBrowserMarkdown();
    var saveButton = $("[data-pa-spec-save]", specBrowser);
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = "保存中...";
    }
    persistSpecMarkdown(annotation, markdown).then(function (result) {
      if (specBrowser) specBrowser.__loadedMarkdown = markdown;
      toast(result && result.persisted ? "页面说明已保存到 Markdown 文件" : "页面说明已保留为浏览器草稿");
    }).catch(function (err) {
      toast("保存失败，内容已保留在编辑器中：" + (err && err.message ? err.message : String(err)));
    }).finally(function () {
      if (!saveButton) return;
      saveButton.disabled = false;
      saveButton.textContent = "保存";
    });
  }

  function updateSpecBrowser() {
    if (!specBrowser || !state.specBrowserOpen) return;
    var selectedKey = state.specBrowserPageKey || state.pageKey;
    var page = pageByKey(selectedKey);
    if (!page) return;
    state.specBrowserPageKey = page.pageKey;
    specBrowser.__pageKey = page.pageKey;

    var pageSelect = $("[data-pa-spec-page-select]", specBrowser);
    var title = $("[data-pa-spec-title]", specBrowser);
    var meta = $("[data-pa-spec-meta]", specBrowser);
    var editor = $("[data-pa-spec-editor]", specBrowser);
    var content = $("[data-pa-spec-content]", specBrowser);
    if (pageSelect) pageSelect.value = page.pageKey;
    if (title) title.textContent = page.title + "需求说明";
    if (meta) meta.textContent = pagePortal(page) + " · " + page.pageKey;
    if (!content) return;

    var annotation = pageSpecAnnotation(page.pageKey);
    specBrowser.__annotation = annotation || null;
    if (!annotation) {
      renderSpecBrowserMarkdown("## 暂无需求说明\n\n该页面还没有关联独立 Markdown 文件。");
      if (editor) editor.disabled = true;
      return;
    }
    if (editor) editor.disabled = false;
    content.innerHTML = '<div class="pa-spec-browser-loading">正在加载需求说明...</div>';
    if (editor) editor.value = "正在加载需求说明...";
    var requestedKey = page.pageKey;
    loadSpecMarkdown(annotation).then(function (markdown) {
      if (!specBrowser || state.specBrowserPageKey !== requestedKey) return;
      renderSpecBrowserMarkdown(markdown);
    }).catch(function (err) {
      if (!specBrowser || state.specBrowserPageKey !== requestedKey) return;
      renderSpecBrowserMarkdown("## 页面说明加载失败\n\n- 文件：" + specRefFor(annotation) + "\n- 错误：" + (err && err.message ? err.message : String(err)));
    });
  }

  function renderSpecBrowser() {
    if (!state.specBrowserOpen) {
      if (specBrowser) specBrowser.remove();
      specBrowser = null;
      return;
    }
    if (specBrowser) {
      var selectedKey = state.specBrowserPageKey || state.pageKey;
      if (specBrowser.__pageKey !== selectedKey) updateSpecBrowser();
      return;
    }
    specBrowser = document.createElement("div");
    specBrowser.className = "pa-ui pa-spec-browser";
    specBrowser.innerHTML = [
      '<section class="pa-spec-browser-dialog" role="dialog" aria-modal="false" aria-label="页面需求说明编辑窗口">',
      '<header class="pa-spec-browser-header" data-pa-spec-drag-handle title="拖动需求说明窗口">',
      '<div><div class="pa-spec-browser-kicker">页面需求</div><h2 data-pa-spec-title>需求说明</h2><p data-pa-spec-meta></p></div>',
      '<div class="pa-spec-browser-actions"><button type="button" class="pa-icon-button" data-pa-spec-close title="关闭" aria-label="关闭">×</button></div>',
      '</header>',
      '<div class="pa-spec-browser-switcher"><select data-pa-spec-page-select aria-label="切换页面需求说明">' + renderSpecBrowserOptions() + '</select><button type="button" class="pa-panel-button pa-spec-editor-toggle" data-pa-spec-toggle-editor aria-expanded="true">收起编辑</button></div>',
      '<div class="pa-spec-browser-workspace">',
      '<section class="pa-spec-browser-editor"><div class="pa-spec-pane-title"><span>Markdown 编辑</span><button type="button" class="pa-panel-button pa-primary pa-spec-inline-save" data-pa-spec-save>保存</button></div><textarea data-pa-spec-editor aria-label="编辑页面需求说明"></textarea></section>',
      '<section class="pa-spec-browser-preview"><div class="pa-spec-pane-title">实时预览</div><article class="pa-spec-browser-content pa-markdown" data-pa-spec-content></article></section>',
      '</div>',
      '</section>',
      '<div class="pa-spec-resize-handle pa-spec-resize-n" data-pa-spec-resize-handle="n" title="向上缩放" aria-hidden="true"></div>',
      '<div class="pa-spec-resize-handle pa-spec-resize-e" data-pa-spec-resize-handle="e" title="向右缩放" aria-hidden="true"></div>',
      '<div class="pa-spec-resize-handle pa-spec-resize-s" data-pa-spec-resize-handle="s" title="向下缩放" aria-hidden="true"></div>',
      '<div class="pa-spec-resize-handle pa-spec-resize-w" data-pa-spec-resize-handle="w" title="向左缩放" aria-hidden="true"></div>',
      '<div class="pa-spec-resize-handle pa-spec-resize-ne" data-pa-spec-resize-handle="ne" title="向右上缩放" aria-hidden="true"></div>',
      '<div class="pa-spec-resize-handle pa-spec-resize-se" data-pa-spec-resize-handle="se" title="向右下缩放" aria-hidden="true"></div>',
      '<div class="pa-spec-resize-handle pa-spec-resize-sw" data-pa-spec-resize-handle="sw" title="向左下缩放" aria-hidden="true"></div>',
      '<div class="pa-spec-resize-handle pa-spec-resize-nw" data-pa-spec-resize-handle="nw" title="向左上缩放" aria-hidden="true"></div>'
    ].join("");
    specBrowser.addEventListener("click", function (event) {
      if (event.target.closest("[data-pa-spec-close]")) closeSpecBrowser();
      else if (event.target.closest("[data-pa-spec-save]")) saveSpecBrowserMarkdown();
      else if (event.target.closest("[data-pa-spec-toggle-editor]")) toggleSpecBrowserEditor();
    });
    specBrowser.addEventListener("change", function (event) {
      if (event.target.matches("[data-pa-spec-page-select]")) selectSpecBrowserPage(event.target.value);
    });
    specBrowser.addEventListener("input", function (event) {
      if (!event.target.matches("[data-pa-spec-editor]")) return;
      var markdown = event.target.value;
      specBrowser.__markdown = markdown;
      if (specBrowser.__annotation) {
        var ref = specRefFor(specBrowser.__annotation);
        if (ref) state.specCache[ref] = markdown;
      }
      scheduleSpecBrowserPreview(markdown);
    });
    specBrowser.addEventListener("pointerdown", onSpecBrowserPointerDown);
    specBrowser.addEventListener("mousedown", onSpecBrowserMouseDown);
    $all("[data-pa-spec-resize-handle]", specBrowser).forEach(function (resizeHandle) {
      resizeHandle.addEventListener("pointerdown", onSpecBrowserResizePointerDown);
      resizeHandle.addEventListener("mousedown", onSpecBrowserResizeMouseDown);
    });
    root.appendChild(specBrowser);
    applySpecBrowserGeometry();
    syncSpecBrowserEditorState();
    if (window.ResizeObserver) {
      specBrowserResizeObserver = new ResizeObserver(function () {
        if (!specBrowser || window.innerWidth <= 720 || specBrowserDrag || specBrowserResize) return;
        var rect = specBrowser.getBoundingClientRect();
        state.specBrowserSize = { width: rect.width, height: rect.height };
        state.specBrowserPosition = { left: rect.left, top: rect.top };
        persistSpecBrowserPreferences();
      });
      specBrowserResizeObserver.observe(specBrowser);
    }
    updateSpecBrowser();
  }

  function renderMarkdown(markdown) {
    if (window.PrototypeAnnotatorMarkdown) return window.PrototypeAnnotatorMarkdown.render(markdown);
    return "<p>" + escapeHtml(markdown) + "</p>";
  }

  function renderMermaid(container) {
    if (window.PrototypeAnnotatorMermaid) window.PrototypeAnnotatorMermaid.render(container);
  }

  function appendSidebarItem(list, ann, index) {
    var item = document.createElement("div");
    item.className = "pa-sidebar-item" + (ann.visible === false ? " pa-muted-item" : "") + (isPageOverviewAnnotation(ann) ? " pa-sidebar-item-page-overview" : "");
    var metaLabel = isPageOverviewAnnotation(ann) ? "页面级说明" : (ann.kind || "note");
    item.innerHTML = [
      '<div class="pa-sidebar-index">' + escapeHtml(index) + "</div>",
      "<div><div class=\"pa-sidebar-name\">" + escapeHtml(ann.title) + "</div>",
      '<div class="pa-sidebar-meta">' + escapeHtml(ann.id) + " · " + escapeHtml(metaLabel) + "</div></div>"
    ].join("");
    item.addEventListener("click", function () {
      openAnnotationFromSidebar(ann, item);
    });
    list.appendChild(item);
  }

  function syncSidebarLayout() {
    if (!sidebar) return;
    var body = $(".pa-sidebar-body", sidebar);
    var list = $(".pa-sidebar-list", sidebar);
    if (!body || !list) return;
    body.style.height = "";
    body.style.maxHeight = "";
    list.style.height = "";
    list.style.maxHeight = "";
  }

  function bindSidebarScrollGuards(list) {
    if (!list || list.__paScrollBound) return;
    list.__paScrollBound = true;
    list.addEventListener("wheel", function (event) {
      var maxScroll = Math.max(0, list.scrollHeight - list.clientHeight);
      if (maxScroll <= 0) return;
      var nextTop = list.scrollTop + event.deltaY;
      if ((event.deltaY > 0 && list.scrollTop < maxScroll) || (event.deltaY < 0 && list.scrollTop > 0)) {
        event.stopPropagation();
      }
      if (nextTop >= 0 && nextTop <= maxScroll) {
        event.preventDefault();
        list.scrollTop = nextTop;
      }
    }, { passive: false });
    list.addEventListener("scroll", function (event) {
      event.stopPropagation();
    }, true);
  }

  function renderSidebar() {
    var previousScrollTop = 0;
    if (sidebar) {
      var previousList = $(".pa-sidebar-list", sidebar);
      if (previousList) previousScrollTop = previousList.scrollTop || 0;
      sidebar.remove();
    }
    if (!state.sidebarOpen) return;
    var anns = pageAnnotations();
    var groups = groupAnnotationsForSidebar(anns);
    var pageOverviewItems = groups.pageItems.filter(function (ann) { return isPageOverviewAnnotation(ann); });
    var pageAnnotationItems = groups.pageItems.filter(function (ann) { return !isPageOverviewAnnotation(ann); });
    var pageOverviewCount = pageOverviewItems.length;
    var elementCount = pageAnnotationItems.length;
    pageSurfaces().forEach(function (surface) {
      var group = groups.surfaceGroups[surface.id];
      if (group && group.items) elementCount += group.items.length;
    });
    Object.keys(groups.hiddenGroups).forEach(function (surfaceId) {
      var hiddenItems = groups.hiddenGroups[surfaceId];
      if (hiddenItems) elementCount += hiddenItems.length;
    });
    var contextCount = pageOverviewCount + elementCount;
    sidebar = document.createElement("div");
    sidebar.className = "pa-ui pa-sidebar";
    sidebar.innerHTML = [
      '<div class="pa-sidebar-header">',
      '<div class="pa-sidebar-grip" data-pa-sidebar-drag-handle title="拖拽移动标注列表" aria-label="拖拽移动标注列表"><span></span><span></span><span></span></div>',
      '<div class="pa-sidebar-title">标注列表</div>',
      '<button type="button" class="pa-icon-button" data-pa-sidebar-reset title="复位标注列表位置">↺</button>',
      '<button type="button" class="pa-icon-button" data-pa-sidebar-close>×</button>',
      "</div>",
      '<div class="pa-sidebar-body"><div class="pa-sidebar-list"></div></div>'
    ].join("");
    var list = $(".pa-sidebar-list", sidebar);
    if (!contextCount) {
      list.innerHTML = '<div class="pa-empty">暂无标注</div>';
    } else {
      var badgeIndex = 0;
      if (pageOverviewItems.length) {
        var overviewHeader = document.createElement("div");
        overviewHeader.className = "pa-sidebar-group-header";
        overviewHeader.textContent = "页面说明";
        list.appendChild(overviewHeader);
        pageOverviewItems.forEach(function (ann) {
          appendSidebarItem(list, ann, sidebarDisplayLabel(ann));
        });
      }
      if (pageAnnotationItems.length) {
        var pageHeader = document.createElement("div");
        pageHeader.className = "pa-sidebar-group-header";
        pageHeader.textContent = "页面标注";
        list.appendChild(pageHeader);
        pageAnnotationItems.forEach(function (ann) {
          badgeIndex += 1;
          appendSidebarItem(list, ann, sidebarDisplayLabel(ann, badgeIndex));
        });
      }
      pageSurfaces().forEach(function (surface) {
        var group = groups.surfaceGroups[surface.id];
        if (!group || !group.items.length) return;
        var surfaceHeader = document.createElement("div");
        surfaceHeader.className = "pa-sidebar-group-header" + (group.open ? "" : " pa-sidebar-group-collapsed");
        surfaceHeader.innerHTML = [
          '<span class="pa-sidebar-group-title">' + escapeHtml(surfaceDisplayName(surface)) + "</span>",
          group.open ? "" : '<span class="pa-sidebar-badge">未打开</span>'
        ].join("");
        list.appendChild(surfaceHeader);
        group.items.forEach(function (ann) {
          badgeIndex += 1;
          appendSidebarItem(list, ann, sidebarDisplayLabel(ann, badgeIndex));
        });
      });
      Object.keys(groups.hiddenGroups).forEach(function (surfaceId) {
        var hiddenItems = groups.hiddenGroups[surfaceId];
        if (!hiddenItems || !hiddenItems.length) return;
        var surface = surfaceById(surfaceId);
        var hiddenHeader = document.createElement("div");
        hiddenHeader.className = "pa-sidebar-group-header pa-sidebar-group-hidden";
        hiddenHeader.innerHTML = [
          '<span class="pa-sidebar-group-title">' + escapeHtml(surfaceDisplayName(surface)) + "（打开后显示）</span>",
          '<span class="pa-sidebar-badge">未打开</span>'
        ].join("");
        list.appendChild(hiddenHeader);
        hiddenItems.forEach(function (ann) {
          badgeIndex += 1;
          appendSidebarItem(list, ann, sidebarDisplayLabel(ann, badgeIndex));
        });
      });
    }
    sidebar.addEventListener("click", function (event) {
      if (event.target.closest("[data-pa-sidebar-reset]")) {
        resetSidebarPosition();
        return;
      }
      if (event.target.closest("[data-pa-sidebar-close]")) {
        state.sidebarOpen = false;
        render();
      }
    });
    sidebar.addEventListener("pointerdown", onSidebarPointerDown);
    sidebar.addEventListener("mousedown", onSidebarMouseDown);
    document.body.appendChild(sidebar);
    if (state.sidebarPosition) requestAnimationFrame(applySidebarPosition);
    bindSidebarScrollGuards(list);
    syncSidebarLayout();
    if (previousScrollTop) list.scrollTop = previousScrollTop;
    requestAnimationFrame(function () {
      syncSidebarLayout();
      if (state.sidebarPosition) applySidebarPosition();
      if (previousScrollTop) list.scrollTop = previousScrollTop;
    });
    updateToolbar();
  }

  function setEditMode(enabled) {
    state.editMode = enabled;
    document.body.classList.toggle("pa-edit-mode", enabled);
    if (enabled) {
      document.addEventListener("mouseover", onEditMouseOver, true);
      document.addEventListener("mouseout", onEditMouseOut, true);
      document.addEventListener("click", onEditClick, true);
      state.visible = true;
    } else {
      document.removeEventListener("mouseover", onEditMouseOver, true);
      document.removeEventListener("mouseout", onEditMouseOut, true);
      document.removeEventListener("click", onEditClick, true);
      clearHighlight();
    }
    render();
  }

  function onEditMouseOver(event) {
    if (!state.editMode || event.target.closest(".pa-ui")) return;
    var target = event.target;
    if (target === document.body || target === document.documentElement) return;
    if (state.highlighted && state.highlighted !== target) state.highlighted.classList.remove("pa-highlight");
    state.highlighted = target;
    target.classList.add("pa-highlight");
  }

  function onEditMouseOut(event) {
    if (!state.editMode || !state.highlighted) return;
    var related = event.relatedTarget;
    if (related && (related === state.highlighted || state.highlighted.contains(related))) return;
    if (related && related.closest && related.closest(".pa-ui")) return;
    clearHighlight();
  }

  function onEditClick(event) {
    if (!state.editMode || event.target.closest(".pa-ui")) return;
    var existingBadge = event.target.closest(".pa-badge");
    if (existingBadge) return;
    event.preventDefault();
    event.stopPropagation();
    showEditor(null, event.target, event.target);
  }

  function clearHighlight() {
    if (state.highlighted) state.highlighted.classList.remove("pa-highlight");
    state.highlighted = null;
  }

  function persistData(action, ann) {
    if (!CFG.autoSave) return Promise.resolve({ persisted: false, draft: false, reason: "auto-save-disabled" });
    return fetch(CFG.apiEndpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: action, annotation: ann, data: state.data })
    }).then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    }).then(function (payload) {
      try {
        window.localStorage.removeItem(draftStorageKey);
      } catch (err) {
        // Ignore storage failures.
      }
      return Object.assign({ persisted: true }, payload || {});
    }).catch(function (err) {
      var drafted = false;
      try {
        window.localStorage.setItem(draftStorageKey, JSON.stringify(state.data));
        drafted = true;
      } catch (err) {
        // Ignore storage failures.
      }
      return { persisted: false, draft: drafted, error: err && err.message ? err.message : String(err) };
    });
  }

  function exportData() {
    var blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "annotations.json";
    link.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function toast(message) {
    var node = document.createElement("div");
    node.className = "pa-ui pa-toast";
    node.textContent = message;
    document.body.appendChild(node);
    setTimeout(function () { node.remove(); }, 2600);
  }

  function setupGlobalEvents() {
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeCard();
        if (state.specBrowserOpen) closeSpecBrowser();
        if (state.sidebarOpen) {
          state.sidebarOpen = false;
          render();
        }
      }
      if (event.altKey && (event.key === "n" || event.key === "N")) {
        state.visible = !state.visible;
        render();
      }
    });
    window.addEventListener("scroll", function () {
      scheduleRender({ skipSidebar: true });
    }, true);
    window.addEventListener("resize", function () {
      scheduleRender();
      syncSidebarLayout();
      if (state.specBrowserOpen) applySpecBrowserGeometry();
      if (state.toolbarPosition) {
        applyToolbarPosition();
        persistToolbarPreferences();
      }
    });
    window.addEventListener("hashchange", handleLocationChange);
    window.addEventListener("popstate", handleLocationChange);
    window.addEventListener("prototypeannotatorlocationchange", handleLocationChange);
    patchHistoryNavigation();
    document.addEventListener("click", function (event) {
      if (card && !event.target.closest(".pa-card") && !event.target.closest(".pa-badge")) closeCard();
      if (!event.target.closest(".pa-ui")) {
        setTimeout(scheduleRender, 80);
        setTimeout(scheduleRender, 360);
      }
    });
    document.addEventListener("transitionend", function (event) {
      if (event.target && event.target.closest && !event.target.closest(".pa-ui")) scheduleRender();
    });
    mutationObserver = new MutationObserver(function (mutations) {
      var shouldRender = mutations.some(function (mutation) {
        if (mutation.type === "attributes") {
          var target = mutation.target;
          return target && target.nodeType === 1 && !target.classList.contains("pa-ui") && !target.closest(".pa-ui");
        }
        return Array.prototype.some.call(mutation.addedNodes || [], function (node) {
          return node.nodeType === 1 && !node.classList.contains("pa-ui") && !node.closest(".pa-ui");
        });
      });
      if (shouldRender) scheduleRender();
    });
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden", "aria-hidden"]
    });
  }

  function updatePageKeyFromLocation() {
    if (!state.data) return false;
    var nextPageKey = detectPageKey();
    if (!nextPageKey || nextPageKey === state.pageKey) return false;
    state.pageKey = nextPageKey;
    if (state.specBrowserOpen) state.specBrowserPageKey = nextPageKey;
    closeCard();
    return true;
  }

  function handleLocationChange() {
    updatePageKeyFromLocation();
    render();
  }

  function patchHistoryNavigation() {
    if (window.__prototypeAnnotatorHistoryPatched) return;
    window.__prototypeAnnotatorHistoryPatched = true;
    ["pushState", "replaceState"].forEach(function (method) {
      var original = window.history && window.history[method];
      if (typeof original !== "function") return;
      window.history[method] = function () {
        var result = original.apply(this, arguments);
        window.dispatchEvent(new Event("prototypeannotatorlocationchange"));
        return result;
      };
    });
  }

  function init() {
    loadData().then(function (data) {
      state.data = data;
      state.pageKey = detectPageKey();
      loadToolbarPreferences();
      loadSidebarPreferences();
      loadSpecBrowserPreferences();
      try {
        if (window.sessionStorage.getItem(specBrowserReopenKey)) {
          window.sessionStorage.removeItem(specBrowserReopenKey);
          state.specBrowserOpen = true;
          state.specBrowserPageKey = state.pageKey;
        }
      } catch (err) {}
      render();
      setupGlobalEvents();
      window.PrototypeAnnotator = {
        getData: function () { return state.data; },
        setData: function (data) {
          state.data = normalizeData(data);
          state.pageKey = detectPageKey();
          render();
        },
        refresh: render,
        openRequirements: openRequirements,
        exportData: exportData
      };
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
