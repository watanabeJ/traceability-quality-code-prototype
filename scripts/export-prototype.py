"""Export the current prototype without workspace metadata or edit history."""
import argparse
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parent.parent
DIRECTORIES = ("assets", "css", "docs", "js", "pages", "prototype-annotator", "scripts", "vendor", "输出")
FILES = ("index.html", "README.md", "PROJECT_STRUCTURE.md", "启动原型.cmd")
SKIP_PARTS = {"__pycache__", "history", ".git", ".playwright-cli", ".work", "output"}


def export(destination):
    destination = destination.resolve()
    if destination.exists():
        raise FileExistsError(f"Archive already exists: {destination}")
    files = [ROOT / name for name in FILES]
    for directory in DIRECTORIES:
        files.extend(file for file in (ROOT / directory).rglob("*")
                     if file.is_file() and not (set(file.relative_to(ROOT).parts) & SKIP_PARTS)
                     and file.suffix not in {".pyc", ".tmp", ".log"}
                     and file.name != "history.jsonl")
    if any(not file.is_file() for file in files):
        raise FileNotFoundError("Required prototype entry file is missing")
    destination.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(destination, "x", ZIP_DEFLATED) as archive:
        for file in sorted(set(files)):
            archive.write(file, "溯源质控码平台/" + file.relative_to(ROOT).as_posix())
    print(f"Exported {len(set(files))} files, {destination.stat().st_size / 1024 / 1024:.2f} MB")
    print(destination)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("destination", type=Path)
    export(parser.parse_args().destination)
