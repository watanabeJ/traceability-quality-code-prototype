# 项目目录说明

当前项目只保留运行资源、当前文档和启动导出脚本。

| 路径 | 用途 |
| --- | --- |
| `启动原型.cmd` | Windows 启动入口，打开本地服务和浏览器 |
| `index.html` | 三端导航入口 |
| `pages/` | 运营端、客户端及扫码端页面，含少量旧地址跳转兼容 |
| `js/` | 公共业务逻辑、页面入口和内置资料初始化 |
| `css/` | 公共与业务样式 |
| `assets/` | 本地产品、企业和追溯图片及相关附件 |
| `vendor/` | 页面所需第三方脚本及随附许可说明 |
| `prototype-annotator/runtime/` | 批注与需求说明展示组件 |
| `prototype-annotator/annotations.json` | 当前批注数据 |
| `prototype-annotator/page-map.json` | 当前页面映射 |
| `prototype-annotator/specs/current/` | 24 份“页面编号-中文页面名称.md”需求说明 |
| `prototype-annotator/specs/registry.json` | 页面与说明文件的对应关系 |
| `docs/` | 当前业务规则、账号资料及开发说明 |
| `输出/说明文件包/` | 完整产品说明书 |
| `scripts/serve-system-docs.py` | 本地运行及批注保存服务 |
| `scripts/server_support/` | 随包提供的评审服务组件，来自项目现用标注工具 |
| `scripts/export-prototype.py` | 可重复执行的原型打包脚本 |

数据初始化仍需 `js/core/demo-fixtures.js` 与 `js/core/business-sample-data.js`。前者准备关联与码载荷，后者写入当前业务资料；两者均为启动依赖。

旧版说明、迁移文档、探查脚本和截图不在交付目录中。Git 元数据不进入原型压缩包。
