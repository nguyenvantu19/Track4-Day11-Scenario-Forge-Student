"""Find real exported failure frames and prepare a view with the original policy as a ghost."""
import json
from pathlib import Path

from avsim import core, viewer
from lab11 import metrics, modes

ROOT = Path(__file__).resolve().parent


def main():
    data = json.loads((ROOT / "evidence/viewer.json").read_text(encoding="utf-8"))
    fix = json.loads((ROOT / "evidence/fix.json").read_text(encoding="utf-8"))
    chosen = fix["chosen"]["policy"]
    gallery = [r for r in data["runs"] if r["label"] in ("bus_bypass", "crosswalk_block")]
    params = [r["params"] for r in gallery]
    baseline = core.rollout(params, policy=[r["policy"] or {} for r in gallery])
    selected = core.rollout(params, policy=chosen)
    manifest = dict(source="viewer.json and fix.json; derived solely to select screenshot frames", modes={})
    ghost_index = None
    for k, run in enumerate(gallery):
        events = metrics.ego_events(baseline, k)
        if not events:
            continue
        event = events[0]
        label = modes.label_mode(baseline, k, event, metrics.contact_type)
        assert label == run["label"], f"Exported mode mismatch: {run['id']}"
        if label not in manifest["modes"]:
            manifest["modes"][label] = dict(id=run["id"], event=event, params=run["params"],
                                           c2_at_failure=baseline.F[k, event["f"], core.IX["C2"]].tolist(),
                                           policy=run["policy"])
        if ghost_index is None and not metrics.ego_events(selected, k):
            ghost_index = k
    assert ghost_index is not None, "No exported scenario where the selected policy avoids the baseline's failure"
    run = gallery[ghost_index]
    event = metrics.ego_events(baseline, ghost_index)[0]
    manifest["ghost"] = dict(id="FIX-" + run["id"], source_id=run["id"], label=run["label"],
                             time=event["t"], baseline_event=event, selected_events=selected.events[ghost_index],
                             policy=chosen, params=run["params"])
    viewer.export(str(ROOT / "evidence/viewer-ghost.json"),
                  [dict(id="FIX-" + run["id"], label=run["label"], outcome="safe", params=run["params"], policy=None)],
                  policy=chosen, baseline_policy=dict(core.POLICY), title=data["title"] + " · selected policy and baseline ghost")
    (ROOT / "evidence/shots/manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
