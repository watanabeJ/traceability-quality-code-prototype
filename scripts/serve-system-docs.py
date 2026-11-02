"""Run the existing annotation reviewer with project bootstrap and spec history."""
import importlib.util
import re
import sys
import threading
import webbrowser
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKILL_SCRIPTS = ROOT / "scripts/server_support"
sys.path.insert(0, str(SKILL_SCRIPTS))
spec = importlib.util.spec_from_file_location("annotation_review", SKILL_SCRIPTS / "serve_annotation_review.py")
review = importlib.util.module_from_spec(spec)
spec.loader.exec_module(review)
original_inject = review.inject_html
original_write = review.ReviewServer.write_spec


def project_inject(html, data):
    # These pages already load the project's customized runtime via bootstrap.js.
    if 'type="module"' in html and "js/pages/" in html:
        return html
    return original_inject(html, data)


def write_with_history(self, payload):
    ref = str(payload.get("ref") or "")
    markdown = payload.get("markdown")
    target = self.resolve_spec_ref(ref)
    if not isinstance(markdown, str):
        raise ValueError("Payload must include markdown")
    if target.exists():
        now = datetime.now().astimezone()
        history = target.parent.parent / "history" / target.stem
        history.mkdir(parents=True, exist_ok=True)
        snapshot = history / (now.strftime("%Y%m%dT%H%M%S%f") + ".before-manual-save.md")
        snapshot.write_bytes(target.read_bytes())
        if markdown.startswith("---\n"):
            markdown = re.sub(r"(?m)^lastManualEditedAt:.*$", 'lastManualEditedAt: "' + now.isoformat() + '"', markdown, count=1)
        payload = {**payload, "markdown": markdown}
    return original_write(self, payload)


review.inject_html = project_inject
review.ReviewServer.write_spec = write_with_history

if __name__ == "__main__":
    open_browser = "--open" in sys.argv
    if open_browser:
        sys.argv.remove("--open")
    if len(sys.argv) == 1 or sys.argv[1].startswith("-"):
        sys.argv.insert(1, str(ROOT))
    if "--port" not in sys.argv:
        sys.argv.extend(["--port", "4322"])
    if open_browser:
        port = sys.argv[sys.argv.index("--port") + 1]
        threading.Timer(1, lambda: webbrowser.open(f"http://127.0.0.1:{port}/")).start()
    raise SystemExit(review.main())
