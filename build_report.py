"""Build the Vietnamese lab report from the full-budget evidence, without running simulations."""
from __future__ import annotations

import json
from pathlib import Path
import statistics

ROOT = Path(__file__).resolve().parent
EVID = ROOT / "evidence"
MODES = ("bus_bypass", "cut_in", "crosswalk_block", "rear_ended")


def load(name):
    return json.loads((EVID / f"{name}.json").read_text(encoding="utf-8"))


def num(value):
    return f"{value:.8g}"


def table(headers, rows):
    return "\n".join(["| " + " | ".join(headers) + " |", "| " + " | ".join(["---"] * len(headers)) + " |"]
                     + ["| " + " | ".join(map(str, row)) + " |" for row in rows])


def main():
    sid = (ROOT / "REPORT.md").read_text(encoding="utf-8").splitlines()[0].split(":", 1)[1].strip()
    meta, replay, mc, hunt, est, fix, mine = [load(n) for n in ("meta", "replay", "mc", "hunt", "estimate", "fix", "mine")]
    for name, data in zip(("meta", "replay", "mc", "hunt", "estimate", "fix", "mine"),
                          (meta, replay, mc, hunt, est, fix, mine)):
        assert data["_run"]["mssv"] == sid and not data["_run"]["quick"], f"{name}: wrong MSSV or quick run"
    out = [f"MSSV: {sid}", "Họ và tên: Nguyễn Văn Tứ", "", "# Lab 11 · Scenario Forge — báo cáo", "",
           f"Thị trấn **{meta['_run']['town']}** (`evidence/meta.json: _run.town`). Ngân sách chính thức; mọi file dùng `quick=false`. "
           "MSSV có chữ A được truyền nguyên vẹn bằng `LAB11_MSSV`, không bỏ chữ hoặc đổi seed. "
           "Kiểm tra: 31 test TODO và 10 test Python/JavaScript đạt.", "",
           "## 1. Phát lại log có trung thực không?", "",
           f"`replay.json`: n={replay['n']}, bỏ {replay['dropped_human_crash_logs']} log vì người lái va chạm, "
           f"còn n_used={replay['n_used']}; crash_in_both={replay['crash_in_both']}.", "",
           table(["Cách chạy", "Va chạm", "front", "rear", "side"],
                 [[key, replay[key]["crashes"], *[replay[key]["contact"].get(t, 0) for t in ("front", "rear", "side")]]
                  for key in ("replay", "reactive")]), "",
           "Planner phanh khác thời điểm người lái trong log. Xe TG phía sau vẫn đi đúng quỹ đạo đã ghi, "
           "không biết planner phanh sớm nên đâm vào đuôi ego. Trong thế giới phản ứng, TG quan sát khoảng cách "
           "và phanh theo IDM. Vì vậy va chạm chỉ có ở replay là giả đối với phản ứng giao thông trong mô hình này; "
           "không thể dùng số đó làm xác suất tai nạn của planner trong thế giới phản ứng."]
    ex = next((x for x in replay["replay_only"] if x["contact"] == "rear"), replay["replay_only"][0])
    out += ["", f"Ví dụ `replay.json: replay_only[scenario={ex['scenario']}]`: loại {ex['contact']}; "
            f"min_ttc_reactive={num(ex['min_ttc_reactive'])} s. Cảnh này có cutT0={num(ex['params']['cutT0'])} s, "
            f"pedT0={num(ex['params']['pedT0'])} s và tgT={num(ex['params']['tgT'])} s. "
            "Planner giảm tốc để xử lý giao thông phía trước; TG trong log tiếp tục tiến lên, "
            "còn TG phản ứng giữ khoảng cách nên cùng cảnh không có va chạm ego.", "",
            "## 2. Kịch bản bất khả thi", "",
            table(["Luật loại", "Căn cứ"], [
                ["(π/cutDur)² × 3,5/2 > μg", "Gia tốc ngang cực đại của chuyển làn cosine vượt lực bám đường."],
                ["cutBrake > μg", "Giảm tốc sau nhập làn vượt giới hạn ma sát."],
                ["pedV > 2,5 m/s", "Vượt phạm vi đi bộ được lab cho phép; trở thành tình huống chạy."],
                ["cutV ≤ 0 hoặc cutV > 22 m/s", "Không phải chuyển làn tiến trong phạm vi tốc độ của mô hình."],
                ["cutDur ≤ 0", "Thời gian chuyển làn phải dương để quỹ đạo và gia tốc có nghĩa."]]), "",
            table(["Cuộc săn (`hunt.json`)", "infeasible", "found"],
                  [[m, hunt[m]["infeasible"], json.dumps(hunt[m]["found"], ensure_ascii=False)] for m in MODES])]
    if (EVID / "shots/replay-rear.png").exists():
        idx = out.index("## 2. Kịch bản bất khả thi")
        out[idx:idx] = ["![Replay scenario 1: TG chạm đuôi ego ở 19,55 s](evidence/shots/replay-rear.png)", ""]
    most = max(MODES, key=lambda m: hunt[m]["infeasible"])
    out += ["", f"Cuộc săn **{most}** loại nhiều nhất: {hunt[most]['infeasible']} mẫu (`hunt.json: {most}.infeasible`). "
            "CEM ưu tiên TTC/khoảng phanh thấp nên có xu hướng chọn chuyển làn quá nhanh hoặc hành vi cực đoan; "
            "các mẫu ấy nguy hiểm trên giấy nhưng có thể vượt lực bám hoặc giới hạn người đi đường. "
            "Chúng bị lọc trước mô phỏng và không được đếm là thất bại. Đếm chúng như va chạm làm tăng sai xác suất; "
            "ngược lại cũng không tự ý đổi mẫu số sang số mẫu khả thi: pipeline định nghĩa biến cố là thất bại trong mẫu tự nhiên có kiểm tra khả thi.", "",
            "## 3. Monte Carlo", "",
            f"`mc.json`: crashes={mc['crashes']}, n={mc['n']}, p={num(mc['p'])}; "
            f"Wilson 95% [lo={num(mc['lo'])}, hi={num(mc['hi'])}]. infeasible={mc['infeasible']}."]
    if mc["p"]:
        needed = 1.96 ** 2 * (1 - mc["p"]) / (0.2 ** 2 * mc["p"])
        out += ["", f"Độ rộng tương đối ±20% theo xấp xỉ nhị thức cần n≈1,96²(1−p)/(0,2²p)≈**{needed:,.0f}**; "
                f"dạng làm tròn 96/p≈{96 / mc['p']:,.0f} lần chạy. Đây là ước tính ngân sách từ p của mẫu hiện tại, "
                "không phải bảo đảm độ chính xác vì p thật còn chưa biết."]
    out += ["", table(["Kiểu (`mc.json: per_mode`)", "k", "Wilson lo", "Wilson hi"],
                       [[m, d["k"], num(d["lo"]), num(d["hi"])] for m, d in mc["per_mode"].items()]), "",
            "Kiểu có k=0 được báo bằng cận trên Wilson trong bảng, không kết luận xác suất bằng 0. "
            "Khoảng chuẩn ở k=0 sẽ co về [0,0] và tạo khẳng định sai rằng biến cố không thể xảy ra.", "",
            "## 4. Importance sampling, ESS và suy biến", "",
            "`estimate.json: seeds[s].per[m]`; p là mean(w·y), không chia cho sum(w). "
            "q=0,8·CEM+0,2·tự nhiên, log q tính bằng logaddexp.", "",
            table(["seed", "kiểu", "p", "hits", "ess", "top_share", "upper_zero_hits"],
                  [[s["seed"], m, num(d["p"]) if d["hits"] else "chưa thấy; dùng cận", d["hits"], num(d["ess"]),
                    num(d["top_share"]), num(d["upper_zero_hits"]) if "upper_zero_hits" in d else "—"]
                   for s in est["seeds"] for m, d in s["per"].items()]), "",
            table(["seed", "total", "lo", "hi"], [[s["seed"], num(s["total"]), num(s["lo"]), num(s["hi"])] for s in est["seeds"]])]
    totals = [s["total"] for s in est["seeds"]]
    median = statistics.median(totals)
    ratio = max(totals) / min(totals) if min(totals) > 0 else float("inf")
    out += ["", f"Trung vị total={num(median)}, max/min={num(ratio)} lần; "
            f"MC p={num(mc['p'])}. "
            "So sánh các con số phải giữ khoảng tin cậy: MC chỉ có vài thất bại, còn IS có thể bỏ sót vùng mà proposal không phủ tốt. "
            "Khoảng IS ±1,96·se là xấp xỉ; không đủ để chứng nhận xác suất hiếm khi trọng số tập trung."]
    out += ["", "Các kiểu không có hit vẫn chưa được xác nhận là không tồn tại. Các trường total/lo/hi của pipeline "
            "không cộng upper_zero_hits của các kiểu IS chưa thấy; vì vậy phải trình bày các cận ấy bên cạnh tổng, "
            "không đọc hi của tổng như chứng nhận rủi ro cho toàn bộ các kiểu. "
            "crosswalk_block có nhiều hit dưới q nhưng p nhỏ vì các hit có trọng số thấp; proposal tập trung vào một "
            "vùng rất hiếm không bảo đảm đã tìm vùng thất bại thường xảy ra nhất."]
    heavy = [(s["seed"], m, d["top_share"]) for s in est["seeds"] for m, d in s["per"].items() if d["top_share"] > 0.5]
    crosswalk_rates = [s["per"]["crosswalk_block"]["p"] for s in est["seeds"]]
    if min(crosswalk_rates) > 0:
        out += ["", f"Riêng crosswalk_block, max/min giữa seed={num(max(crosswalk_rates) / min(crosswalk_rates))} lần. "
                "Sự lệch này và cận MC cho kiểu chưa thấy không đủ để xác nhận point estimate nhỏ của IS là xác suất thật."]
    out += ["", "Các hàng top_share>0,5: " + (", ".join(f"seed {s}/{m}={num(v)}" for s, m, v in heavy) or "không có") + ". "
            "top_share=max(w·y)/sum(w·y): nếu vượt 0,5 thì một mẫu quyết định hơn nửa ước lượng. "
            "ESS=(sum w)²/sum(w²) đo sự lệch trọng số toàn bộ mẫu, không phải số lần thử độc lập cho biến cố. "
            "top_share thấp cũng không chứng minh proposal đã phủ tất cả kiểu va chạm.", "",
            f"`estimate.json: budget`={est['budget']} lần (gồm CEM và IS, không gồm phần MC lấy other); "
            + (f"so với khoảng {96 / mc['p']:,.0f} lần MC để nhắm sai số tương đối ±20% ở p hiện tại. " if mc['p'] else "") +
            "Các kiểu IS không có hit dùng upper_zero_hits=3/(0,2·n)=3/(0,2·600)=0,025, không dùng 3/ESS. "
            "Các kiểu chia nhau tập thất bại; other không có điểm nguy hiểm riêng để săn, nên lấy từ MC.", "",
            f"`estimate.json: other`: k={est['other']['k']}, n={est['other']['n']}, "
            f"hi={num(est['other']['hi'])}, source={est['other']['source']}. "
            "Không có hit other vẫn phải giữ cận trên khi diễn giải tổng.", "",
            "## 5. Các kiểu thất bại", ""]
    description = {
        "bus_bypass": "C2 gặp xe buýt đang dừng, chờ khe rồi lách vào làn ego ở tốc độ thấp; ego nhận diện/giảm tốc muộn và chạm C2 trước x=112 m.",
        "crosswalk_block": "P1 không ngó qua xe buýt nên không thấy ego đang tới; P1 bắt đầu qua đường, ego chỉ nhận ra khi hết che khuất và phanh muộn, dừng với thân xe trên vạch chặn P1. Đây là block, không nhất thiết là tiếp xúc cơ học.",
        "cut_in": "C2 nhận khe rồi nhập làn ở vị trí/tốc độ ngoài định nghĩa bus_bypass; ego va chạm với xe đang cắt vào.",
        "rear_ended": "Xe phía sau tiến vào đuôi ego khi ego giảm tốc; trong thế giới phản ứng cần kiểm tra cả hành vi bám đuôi và lực bám đường."
    }
    for m in MODES:
        hits = sum(hunt[q]["found"].get(m, 0) for q in MODES)
        out += [f"**{m}**: tổng found={hits} qua các cuộc săn (`hunt.json: *.found.{m}`). " +
                (description[m] if hits else "Không tìm thấy trong ngân sách này; không thể kết luận kiểu đó không tồn tại.")]
        shot = EVID / "shots" / f"{m}.png"
        if hits and shot.exists():
            out += ["", f"![{m} tại khung thất bại](evidence/shots/{m}.png)"]
        out += [""]
    out += ["Các ảnh CEM ở trên dùng run.policy gốc của cảnh đã xuất: xe chính là policy gốc, bóng mờ là bản sửa. "
            "Nhãn cố định trong panel của viewer vẫn ghi 'chính sách của bạn'/'chính sách gốc'; vai trò policy thực "
            "được xác định bởi run.policy và policy chung của file. Ảnh so bản sửa ở câu 6 dùng file bổ sung có vai trò đúng với nhãn.", "",
            "Mỗi cuộc săn cần điểm nguy hiểm riêng: một cuộc săn chung sẽ ưu tiên kiểu dễ tìm nhất và co proposal quanh kiểu đó, "
            "làm bỏ sót kiểu khác. Bảng found ở câu 2 cho biết một cuộc săn còn tìm nhầm kiểu nào; số found là hiệu quả tìm kiếm, "
            "không phải tần suất tự nhiên.", "", "## 6. Sửa planner", ""]
    chosen = fix["chosen"]
    rows = [("TRAIN gốc", fix["baseline_train"]), ("TRAIN chọn", chosen),
            ("TEST gốc", fix["baseline_test"]), ("TEST chọn", fix["chosen_test"])]
    out += [f"`fix.json: chosen.policy` = `{json.dumps(chosen['policy'], ensure_ascii=False)}`. "
            "Chọn trên TRAIN bằng fail_hi thấp nhất trong nhóm giữ ≥95% quãng đường gốc; hòa thì chọn progress cao hơn. "
            "TEST dùng seed mới và CEM săn lại dưới chính policy được chọn, không dùng TEST để chọn ứng viên.", "",
            table(["Tập (`fix.json`)", "fail", "fail_hi_seen", "fail_hi", "progress (m)", "harsh (khung)", "unseen"],
                  [[n, num(r["fail"]), num(r["fail_hi_seen"]), num(r["fail_hi"]), num(r["progress"]), num(r["harsh"]), ", ".join(r["unseen"]) or "—"] for n, r in rows]), ""]
    base, selected = fix["baseline_test"], fix["chosen_test"]
    loss = 1 - selected["progress"] / base["progress"]
    out += [f"Quãng đường TEST giảm {loss * 100:.5g}% so với gốc; tính đến khung va chạm, không tính đoạn chạy tiếp sau đó. "
            "harsh là số khung có a<−3 m/s² trung bình mỗi cảnh, không phải số đợt phanh riêng biệt. "
            "Mỗi khung dài 0,05 s; không nên gọi 20 khung phanh liên tục là 20 lần phanh.", "",
            "fail_hi_seen chỉ cộng kiểu có hit. fail_hi trên TEST còn giữ cận 3/(0,2·400)=0,0375 cho mỗi kiểu unseen "
            "và khoảng Wilson của va chạm ngoài các kiểu được săn trên 3.000 mẫu tự nhiên. "
            "Vì vậy fail_hi có thể lớn hơn fail của planner gốc dù bản sửa giảm các thất bại quan sát được. "
            "TRAIN không có hit chỉ dùng để sàng lọc; chưa đủ ngân sách chứng nhận rủi ro nhỏ. "
            "Các thành phần IS có hit vẫn dựa trên khoảng chuẩn xấp xỉ; việc cộng cận từng thành phần không tự động cho bảo đảm "
            "đồng thời 95% của tổng nếu chưa hiệu chỉnh đa kiểm định.", "",
            table(["Ứng viên TRAIN (`fix.json: table`)", "fail", "fail_hi", "progress"],
                  [[json.dumps(r["policy"]), num(r["fail"]), num(r["fail_hi"]), num(r["progress"])] for r in fix["table"]]), "",
            "Núm nghe an toàn hơn có thể gây phản tác dụng: hạ cautionV làm ego đến vạch muộn, thay đổi khe "
            "mà C2 chấp nhận và thời điểm P1 bắt đầu qua đường; tăng T làm ego chừa khe rộng hơn, có thể mời C2 "
            "lách vào. Bảng TRAIN ở trên là bằng chứng để so từng thay đổi; không thể giả định mọi giảm tốc đều giảm va chạm. "
            "Ảnh so policy dùng cùng cảnh và cùng thời điểm, bật bóng mờ để thấy sự khác nhau.", ""]
    slower = next(r for r in fix["table"] if r["policy"] == {"cautionV": 6.0})
    faster = next(r for r in fix["table"] if r["policy"] == {"cautionV": 6.5})
    out += [f"Ví dụ từ `fix.json: table`: hạ cautionV từ 6,5 xuống 6,0 m/s làm point estimate TRAIN "
            f"tăng từ {num(faster['fail'])} lên {num(slower['fail'])}; đây là quan sát trên TRAIN, không phải "
            "bảo đảm ý nghĩa thống kê hay lý do để chọn theo TEST. Việc đổi tốc độ cũng đổi thời điểm các tác nhân nhận khe và sang đường.", ""]
    if (EVID / "shots" / "policy-ghost.png").exists():
        out += ["![Bản sửa và bóng mờ policy gốc](evidence/shots/policy-ghost.png)", ""]
        manifest = json.loads((EVID / "shots/manifest.json").read_text(encoding="utf-8"))
        ghost = manifest["ghost"]
        out += [f"Ảnh dùng `viewer-ghost.json`, cảnh {ghost['id']} lấy nguyên tham số từ `viewer.json: {ghost['source_id']}`; "
                f"khung t={num(ghost['time'])} s, policy gốc thất bại kiểu {ghost['label']}, policy chọn không có thất bại ego. "
                "Xe chính là policy đã chọn, bóng mờ là policy gốc. Manifest lưu tham số/thời điểm và kết quả mô phỏng dùng chọn ảnh.", ""]
    nat_gap = 10 if meta["_run"]["town"] == "C" else 14 if meta["_run"]["town"] == "D" else 12
    out += ["## 7. Từ mô phỏng ra đường thật", "",
            "Các nguồn dưới đây là đề xuất thu thập dữ liệu, chưa được dùng để hiệu chuẩn lab.", "",
            table(["Giả định", "Dữ liệu thay thế và cách lấy", "Hướng sai lệch nếu giả định sai"], [
                [f"cutGap lognormal, trung vị {nat_gap} m (`space.py`)", "Camera cố định/LiDAR trên tuyến có điểm dừng buýt; dựng quỹ đạo và đo khe trước/sau lúc bắt đầu nhập làn, kể cả các khe bị từ chối.", "Nếu người thật chấp nhận khe nhỏ hơn, mô hình có thể đánh giá thấp bus_bypass; tương tác không đơn điệu nên phải đo lại bằng mô phỏng."],
                ["Tỷ lệ pedLook và chỉ bus che tầm nhìn người đi bộ", "Video bên đường kết hợp hướng đầu/người, hình học xe buýt và quỹ đạo trước khi sang đường; ghi cả người chờ, không chỉ người đã sang.", "Nếu người thật ngó ít hơn hoặc có thêm vật che, mô hình có thể đánh giá thấp crosswalk_block."],
                ["μ chỉ có 0,5 ướt và 0,8 khô; tỷ lệ wet cố định", "Đo giảm tốc/phanh tại đường thử trên các mặt đường và điều kiện mưa, ghép nhật ký thời tiết với tổng số chuyến của tuyến.", "Nếu μ thật thấp hơn hoặc chuyến đi ướt nhiều hơn, quãng phanh dài hơn và rủi ro có thể bị đánh giá thấp; phanh thực có trễ cũng làm sai lệch theo hướng này."]]), "",
            "Không được coi xác suất của thị trấn giả lập là xác suất tai nạn thực trước khi xác nhận các phân phối và "
            "phụ thuộc giữa mưa, hành vi người đi bộ, khe nhập làn và tuyến đường.", "",
            "## 8. Giới hạn", "",
            "1. Chỉ một phố, một điểm dừng buýt/vạch chính và horizon 24 s; không đại diện giao lộ, cao tốc, đường cong hoặc sự kiện sau giây 24.",
            "2. Xe khác theo IDM/gap acceptance; không có đầy đủ trễ phản ứng, mất tập trung, đa dạng người lái hoặc thương lượng ánh mắt.",
            "3. Cảm biến và trạng thái gần như hoàn hảo ngoài che khuất hình học; thiếu nhiễu phát hiện, sai phân loại, độ trễ, tracking mất mục tiêu và sai dự báo. Ego chỉ dùng điều khiển dọc, chưa so với tránh bằng đánh lái.", "",
            "Nếu có thêm một tuần: đo khe nhập làn và thời điểm sang đường từ video, hiệu chuẩn phân phối có phụ thuộc; "
            "thêm độ trễ cảm biến/phản ứng rồi đánh giá trên tập tuyến và seed giữ kín, tăng ngân sách cho kiểu không có hit.", "",
            "## 9. Rắc rối tự thiết kế", "",
            "**Người băng ngang ngoài vạch sau điểm dừng xe buýt**: H0 từ phía nam băng ngang ở x=185 m, "
            "v=2,2 m/s, kích hoạt khi ego còn cách 36 m. Cảnh được dựng trong chương 10. "
            "Ngoài đời tương ứng người đi nhanh sang đường ở đoạn không có vạch; ở đây tốc độ và phạm vi là thiết kế thử nghiệm. "
            "Logic dự báo sang đường đặc biệt của planner gắn với P1/vạch chính x=122 m; H0 chỉ được coi là vật cản "
            "khi lọt vào hành lang. Vì vậy xe có thể nhận ra xung đột ngang quá muộn.", "",
            f"`hazard.json: space` = `{json.dumps(mine['space'])}`; `exposure`={num(mine['exposure'])}. "
            "Đoạn 170–205 m nằm sau vạch chính; 1,8–2,4 m/s là đi nhanh dưới 2,5 m/s; "
            "28–44 m quét quanh khoảng cảnh gốc để có cả thời gian phanh dài và ngắn. Lấy đều độc lập là thiết kế stress test. "
            "Exposure=1 vì mỗi chuyến thử nghiệm được cài một tình huống, theo lựa chọn của người làm bài; "
            "không phải số liệu khảo sát rằng mọi chuyến ngoài đường đều gặp người băng ngang. Căn cứ đầy đủ ở `hazard.json: why`.", "",
            f"`mine.json: exact.planner` = `{json.dumps(mine['exact']['planner'], ensure_ascii=False)}`. "
            f"accepted={num(mine['accepted'])}, infeasible={mine['infeasible']}; world={mine['world']}.", "",
            table(["Policy (`mine.json`)", "n", "crashes", "avoidable", "unavoidable", "unattributed", "low_speed", "avoidable_foreknown", "p", "Wilson lo", "Wilson hi", "per_trip"],
                  [[name, r["n"], r["crashes"], r["avoidable"], r["unavoidable"], r["unattributed"], r["low_speed"], r["avoidable_foreknown"], num(r["p"]), num(r["lo"]), num(r["hi"]), num(r.get("per_trip", 0))]
                   for name in ("baseline", "chosen") if (r := mine.get(name))]), "",
            "avoidable: phanh cực đại ngay khung rắc rối đã bắt đầu và nhìn thấy sẽ không va chạm. unavoidable: "
            "phanh như vậy vẫn va chạm. unattributed: va chạm trước khi quy được cho rắc rối, không được tính lỗi H0. "
            "low_speed là cờ tốc độ ego<1 m/s, có thể nằm trong bất kỳ nhóm nào, không phải nhóm thứ tư để cộng thêm. "
            "avoidable_foreknown cho phanh ngay lúc kích hoạt dù bị che; chênh lệch với avoidable biểu thị ảnh hưởng che khuất.", "",
            "P(lỗi planner | rắc rối) chỉ đếm avoidable/n. Chuẩn này lạc quan vì người phanh biết chính xác sự kiện "
            "và phản ứng/phanh tối đa ngay khi thấy, nên có thể đếm nhiều lỗi tránh được hơn planner thực với cảm biến/trễ. "
            "Nhưng chỉ thử phanh, bỏ đánh lái, có thể làm đếm ít lỗi tránh được hơn một hệ thống có né ngang; hai tác động ngược chiều.", "",
            "Với exposure=1, per_trip bằng p trong chiến dịch có cài rắc rối. "
            f"Đặt cạnh bus_bypass tự nhiên từ MC: {num(mc['per_mode']['bus_bypass']['k'] / mc['n'])}/chuyến mô phỏng, "
            f"và IS trung vị {num(statistics.median(s['per']['bus_bypass']['p'] for s in est['seeds']))}/chuyến. "
            "Hai mức phơi nhiễm khác nhau; không suy ra H0 nguy hiểm hơn ngoài đời chỉ từ tỷ lệ này. "
            "Muốn tần suất thực phải đo exposure và hiệu chuẩn space trên đúng tuyến/ODD.", ""]
    if mine.get("chosen"):
        b, c = mine["baseline"], mine["chosen"]
        out += [f"So trên cùng phép quét: baseline avoidable={b['avoidable']}/{b['n']}, "
                f"chosen avoidable={c['avoidable']}/{c['n']}; chênh lệch p(chosen)−p(baseline)={num(c['p'] - b['p'])}. "
                + ("Bản sửa vẫn còn lỗi tránh được với H0; sửa kiểu cũ chưa bảo đảm khái quát sang người băng ngang ngoài vạch."
                   if c["avoidable"] else "Bản sửa chưa ghi nhận lỗi tránh được với H0 trong mẫu này; vẫn giữ cận trên Wilson trong bảng."), ""]
    if (EVID / "shots" / "hazard-studio.png").exists():
        out += ["![Chương 10 tại va chạm H0](evidence/shots/hazard-studio.png)", ""]
    out += ["**Tự lái:** chưa có phép thử người lái do Nguyễn Văn Tứ thực hiện; không có egoAcc và không báo kết quả "
            "oracle như thành tích tự lái. Có thể thử thêm bằng nút Bạn trong chương 10.", "",
            "**Cách sửa:** khái quát dự báo sang đường từ riêng P1 sang mọi người đi bộ: dự báo thời gian họ vào hành lang "
            "ego, so với thời gian ego tới điểm giao nhau, giữ khoảng phanh theo μ và buffer trước khi thân xe chắn lối. "
            "cautionV/pedBuffer hiện chủ yếu tác động vạch P1; cutinLat chỉ điều chỉnh hành lang nhận diện xe, "
            "không mở ngưỡng ngang 1,9 m cố định dành cho người đi bộ H0. Giảm v0 có thể thêm thời gian phanh "
            "nhưng phải đo lại mất quãng đường và không thay thế logic dự báo xung đột ngang. "
            "Sau thay đổi phải săn lại dưới policy mới và đánh giá trên holdout cho cả H0 và các kiểu cũ.", "",
            "## Tái lập và nộp bài", "",
            "Chạy `./run_lab.ps1 all` (PowerShell), hoặc đặt `$env:LAB11_MSSV='2A202602586'` rồi chạy "
            "`python run_all.py all`. Không dùng `--quick` cho bằng chứng nộp. "
            "Sau khi bằng chứng đầy đủ, `python build_report.py` tạo lại báo cáo từ JSON. "
            "Mọi ảnh chụp dùng trình xem đi kèm, không dùng ảnh mẫu trong README. "
            "Xem `HOW_TO_RUN.md` để chạy test và mở viewer.", ""]
    (ROOT / "REPORT.md").write_text("\n".join(out), encoding="utf-8")
    print("REPORT.md updated from full-budget evidence.")


if __name__ == "__main__":
    main()
