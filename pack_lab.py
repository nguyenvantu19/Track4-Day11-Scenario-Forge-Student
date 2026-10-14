"""Validate the full-budget evidence and package the reproducible project for submission."""
import json
from pathlib import Path
import re
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parent
EXPECTED_BUDGETS = dict(replay_n=400, mc_n=3000, iters=8, per_iter=300, final_n=600,
                        seeds=3, fix_n=400, progress_n=256, mine_n=1500)


def main():
    report = (ROOT / "REPORT.md").read_text(encoding="utf-8")
    sid = report.splitlines()[0].split(":", 1)[1].strip()
    assert re.fullmatch(r"[A-Za-z0-9]+", sid), "Invalid MSSV"
    required = ("meta", "world", "replay", "mc", "hunt", "estimate", "fix", "mine")
    evidence = {}
    for name in required:
        d = json.loads((ROOT / "evidence" / f"{name}.json").read_text(encoding="utf-8"))
        assert d["_run"]["mssv"] == sid, f"{name}: different MSSV"
        assert not d["_run"]["quick"] and not d["_run"]["salted"], f"{name}: debug or salted run"
        assert d["_run"]["budgets"] == EXPECTED_BUDGETS, f"{name}: wrong budgets"
        evidence[name] = d
    assert evidence["mc"]["n"] == 3000
    assert len(evidence["estimate"]["seeds"]) == 3
    assert all(len(evidence["hunt"][m]["trace"]) == 8 for m in ("bus_bypass", "cut_in", "crosswalk_block", "rear_ended"))
    assert "chosen_test" in evidence["fix"] and "baseline_test" in evidence["fix"]
    for name in ("baseline", "chosen"):
        r = evidence["mine"][name]
        assert r["crashes"] == r["avoidable"] + r["unavoidable"] + r["unattributed"]
    viewer = json.loads((ROOT / "evidence/viewer.json").read_text(encoding="utf-8"))
    assert viewer["format"] == "avsim-viewer/1" and viewer["runs"]
    for image in ("bus_bypass.png", "crosswalk_block.png", "policy-ghost.png", "hazard-studio.png"):
        assert (ROOT / "evidence/shots" / image).is_file(), f"Missing image {image}"
        assert image in report, f"Image {image} missing from report"
    root_files = (".gitignore", "README.md", "RUBRIC.md", "REPORT.md", "requirements.txt", "run_all.py",
                  "policy_candidates.json", "hazard.json", "run_lab.ps1", "build_report.py", "pack_lab.py", "prepare_shots.py", "HOW_TO_RUN.md", "serve_ui.py", "start_ui.bat", "stop_ui.ps1")
    files = [ROOT / name for name in root_files]
    for folder in ("avsim", "lab11", "viewer", "ui", "tests", "images", "evidence"):
        files.extend(p for p in (ROOT / folder).rglob("*")
                     if p.is_file() and "__pycache__" not in p.parts and p.suffix != ".pyc")
    output = ROOT / f"Lab11_NguyenVanTu_{sid}.zip"
    with ZipFile(output, "w", compression=ZIP_DEFLATED, compresslevel=6) as archive:
        for p in sorted(files):
            archive.write(p, p.relative_to(ROOT).as_posix())
    with ZipFile(output) as archive:
        assert archive.testzip() is None, "Archive integrity check failed"
        assert len(archive.namelist()) == len(files)
    print(f"Validated full-budget evidence. Packaged {len(files)} files: {output.name} ({output.stat().st_size:,} bytes).")


if __name__ == "__main__":
    main()
