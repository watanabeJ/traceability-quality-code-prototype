const projectRoot = new URL("../", import.meta.url);
let bootPromise = null;

function loadClassicScript(relativePath) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const scriptUrl = new URL(relativePath, projectRoot);
    scriptUrl.searchParams.set("v", "msh5m4wk");
    script.src = scriptUrl.href;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${relativePath}`));
    document.head.appendChild(script);
  });
}

export function bootstrapPage(config) {
  if (bootPromise) return bootPromise;
  document.body.dataset.entryPortal = config.portal;
  document.body.dataset.initialPage = config.page;
  if (config.scanStatus) document.body.dataset.scanStatus = config.scanStatus;
  document.title = `溯源质控码平台 · ${config.title}`;
  window.TRACE_PAGE_CONFIG = Object.freeze({ ...config });
  window.PROTOTYPE_ANNOTATOR_CONFIG = {
    ...(window.PROTOTYPE_ANNOTATOR_CONFIG || {}),
    dataUrl: new URL("prototype-annotator/annotations.json", projectRoot).href
  };

  const scripts = [
    "vendor/lucide.min.js",
    "vendor/qrcode-generator.min.js",
    "js/core/config.js",
    "js/components/ui.js",
    "js/views/base.js",
    "js/core/runtime.js",
    "js/core/domain.js",
    "js/components/application.js",
    "js/views/business.js",
    "js/views/scan.js",
    "js/core/enhanced-runtime.js",
    "prototype-annotator/runtime/markdown-renderer.js",
    "prototype-annotator/runtime/mermaid-loader.js",
    "prototype-annotator/runtime/prototype-annotator.js"
  ];
  bootPromise = scripts
    .reduce((promise, script) => promise.then(() => loadClassicScript(script)), Promise.resolve())
    .then(() => {
      window.TRACE_APP_READY = true;
      document.documentElement.dataset.appReady = "true";
      return config;
    });
  window.TRACE_APP_BOOT = bootPromise;
  return bootPromise;
}
