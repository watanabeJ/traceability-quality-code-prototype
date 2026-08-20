# 原型标注说明

本目录由 `prototype-annotator` skill 生成，用于保存原型页面的标注数据和运行时资源。

## 目录说明

- `annotations.json`：标注数据源。AI 生成和页面内手动编辑后的标注最终都应写入这里。
- `specs/`：每个实际页面各自的 Markdown 需求说明，页面级标注只保存文件引用。
- `page-map.json`：原型扫描结果，用于重新生成标注或校验 selector。
- `history.jsonl`：本地在线评审服务写入的编辑历史。
- `runtime/`：标注层所需的 JavaScript 和 CSS 运行时资源。

## 查看页面需求说明

打开任意原型页面后，点击右上角标注工具中的“需求说明”。面板左侧按运营端、客户端和扫码端列出全部页面，右侧可直接切换查看对应 Markdown；“打开实际页面”用于跳转核对当前说明对应的原型页面。

## 如何启动在线标注

请在 `prototype-annotator` skill 项目目录中运行本地评审服务，并把当前原型路径作为参数传入。下面命令里的路径均为占位示例，请替换为你本机的实际目录：

```bash
cd /path/to/prototype-annotator
python3 scripts/serve_annotation_review.py /path/to/your/prototype
```

如果不想切换目录，也可以直接使用脚本绝对路径：

```bash
python3 /path/to/prototype-annotator/scripts/serve_annotation_review.py /path/to/your/prototype
```

启动后终端会输出类似地址：

```text
Serving annotation review at http://127.0.0.1:8765/
```

在浏览器中打开该地址即可在线查看、编辑、新增、删除和导出标注。页面内保存的修改会通过本地评审服务回写到本目录的 `annotations.json`。

## 注意事项

- 不建议用普通静态服务（例如 `python3 -m http.server`）进行人工编辑，因为它不能处理回写请求；页面修改只能暂存在浏览器 `localStorage` 草稿中。
- 静态 HTML 中内嵌的标注 JSON 只是离线或读取失败时的兜底快照，正式数据源仍是本目录的 `annotations.json`。
- 如果更新了 skill 的运行时修复，需要重新执行注入命令，或刷新本目录 `runtime/` 下的运行时文件。
- 如需清空或删除标注结果，请运行 `python3 /path/to/prototype-annotator/scripts/clear_annotations.py /path/to/your/prototype`。该命令会移除标注数据和静态 HTML 注入块，但不会删除 React/Vue adapter 源码，以免破坏原型构建。
