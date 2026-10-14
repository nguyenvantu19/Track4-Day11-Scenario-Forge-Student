MSSV: 2A202602586
Họ và tên: Nguyễn Văn Tứ

# Lab 11 · Scenario Forge — báo cáo

Thị trấn **C** (`evidence/meta.json: _run.town`). Ngân sách chính thức; mọi file dùng `quick=false`. MSSV có chữ A được truyền nguyên vẹn bằng `LAB11_MSSV`, không bỏ chữ hoặc đổi seed. Kiểm tra: 31 test TODO và 10 test Python/JavaScript đạt.

## 1. Phát lại log có trung thực không?

`replay.json`: n=400, bỏ 1 log vì người lái va chạm, còn n_used=399; crash_in_both=0.

| Cách chạy | Va chạm | front | rear | side |
| --- | --- | --- | --- | --- |
| replay | 127 | 0 | 113 | 14 |
| reactive | 0 | 0 | 0 | 0 |

Planner phanh khác thời điểm người lái trong log. Xe TG phía sau vẫn đi đúng quỹ đạo đã ghi, không biết planner phanh sớm nên đâm vào đuôi ego. Trong thế giới phản ứng, TG quan sát khoảng cách và phanh theo IDM. Vì vậy va chạm chỉ có ở replay là giả đối với phản ứng giao thông trong mô hình này; không thể dùng số đó làm xác suất tai nạn của planner trong thế giới phản ứng.

Ví dụ `replay.json: replay_only[scenario=1]`: loại rear; min_ttc_reactive=2.1918333 s. Cảnh này có cutT0=8.4726423 s, pedT0=12.625836 s và tgT=1.064791 s. Planner giảm tốc để xử lý giao thông phía trước; TG trong log tiếp tục tiến lên, còn TG phản ứng giữ khoảng cách nên cùng cảnh không có va chạm ego.

![Replay scenario 1: TG chạm đuôi ego ở 19,55 s](evidence/shots/replay-rear.png)

## 2. Kịch bản bất khả thi

| Luật loại | Căn cứ |
| --- | --- |
| (π/cutDur)² × 3,5/2 > μg | Gia tốc ngang cực đại của chuyển làn cosine vượt lực bám đường. |
| cutBrake > μg | Giảm tốc sau nhập làn vượt giới hạn ma sát. |
| pedV > 2,5 m/s | Vượt phạm vi đi bộ được lab cho phép; trở thành tình huống chạy. |
| cutV ≤ 0 hoặc cutV > 22 m/s | Không phải chuyển làn tiến trong phạm vi tốc độ của mô hình. |
| cutDur ≤ 0 | Thời gian chuyển làn phải dương để quỹ đạo và gia tốc có nghĩa. |

| Cuộc săn (`hunt.json`) | infeasible | found |
| --- | --- | --- |
| bus_bypass | 5 | {"bus_bypass": 203} |
| cut_in | 5 | {"bus_bypass": 35} |
| crosswalk_block | 9 | {"bus_bypass": 5, "crosswalk_block": 19} |
| rear_ended | 7 | {"bus_bypass": 10, "crosswalk_block": 13} |

Cuộc săn **crosswalk_block** loại nhiều nhất: 9 mẫu (`hunt.json: crosswalk_block.infeasible`). CEM ưu tiên TTC/khoảng phanh thấp nên có xu hướng chọn chuyển làn quá nhanh hoặc hành vi cực đoan; các mẫu ấy nguy hiểm trên giấy nhưng có thể vượt lực bám hoặc giới hạn người đi đường. Chúng bị lọc trước mô phỏng và không được đếm là thất bại. Đếm chúng như va chạm làm tăng sai xác suất; ngược lại cũng không tự ý đổi mẫu số sang số mẫu khả thi: pipeline định nghĩa biến cố là thất bại trong mẫu tự nhiên có kiểm tra khả thi.

## 3. Monte Carlo

`mc.json`: crashes=5, n=3000, p=0.0016666667; Wilson 95% [lo=0.00071209344, hi=0.0038958726]. infeasible=13.

Độ rộng tương đối ±20% theo xấp xỉ nhị thức cần n≈1,96²(1−p)/(0,2²p)≈**57,528**; dạng làm tròn 96/p≈57,600 lần chạy. Đây là ước tính ngân sách từ p của mẫu hiện tại, không phải bảo đảm độ chính xác vì p thật còn chưa biết.

| Kiểu (`mc.json: per_mode`) | k | Wilson lo | Wilson hi |
| --- | --- | --- | --- |
| bus_bypass | 5 | 0.00071209344 | 0.0038958726 |
| cut_in | 0 | 0 | 0.0012788957 |
| crosswalk_block | 0 | 0 | 0.0012788957 |
| rear_ended | 0 | 0 | 0.0012788957 |
| other | 0 | 0 | 0.0012788957 |

Kiểu có k=0 được báo bằng cận trên Wilson trong bảng, không kết luận xác suất bằng 0. Khoảng chuẩn ở k=0 sẽ co về [0,0] và tạo khẳng định sai rằng biến cố không thể xảy ra.

## 4. Importance sampling, ESS và suy biến

`estimate.json: seeds[s].per[m]`; p là mean(w·y), không chia cho sum(w). q=0,8·CEM+0,2·tự nhiên, log q tính bằng logaddexp.

| seed | kiểu | p | hits | ess | top_share | upper_zero_hits |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | bus_bypass | 0.0012249892 | 42 | 139.54696 | 0.41812687 | — |
| 0 | cut_in | chưa thấy; dùng cận | 0 | 115.21366 | 0 | 0.025 |
| 0 | crosswalk_block | 2.0571587e-07 | 41 | 127.30143 | 0.35983572 | — |
| 0 | rear_ended | chưa thấy; dùng cận | 0 | 116.92301 | 0 | 0.025 |
| 1 | bus_bypass | 0.0010638286 | 52 | 124.12586 | 0.12896872 | — |
| 1 | cut_in | chưa thấy; dùng cận | 0 | 115.78612 | 0 | 0.025 |
| 1 | crosswalk_block | 7.1195048e-07 | 34 | 113.36056 | 0.43249742 | — |
| 1 | rear_ended | chưa thấy; dùng cận | 0 | 122.71008 | 0 | 0.025 |
| 2 | bus_bypass | 0.00064125776 | 44 | 150.34674 | 0.15384536 | — |
| 2 | cut_in | chưa thấy; dùng cận | 0 | 142.3668 | 0 | 0.025 |
| 2 | crosswalk_block | 2.2705525e-07 | 34 | 111.26128 | 0.28253724 | — |
| 2 | rear_ended | chưa thấy; dùng cận | 0 | 127.1894 | 0 | 0.025 |

| seed | total | lo | hi |
| --- | --- | --- | --- |
| 0 | 0.0012251949 | 0.0001143231 | 0.0036149624 |
| 1 | 0.0010645405 | 0.00054899985 | 0.0028589769 |
| 2 | 0.00064148481 | 0.00025566573 | 0.0023061996 |

Trung vị total=0.0010645405, max/min=1.9099359 lần; MC p=0.0016666667. So sánh các con số phải giữ khoảng tin cậy: MC chỉ có vài thất bại, còn IS có thể bỏ sót vùng mà proposal không phủ tốt. Khoảng IS ±1,96·se là xấp xỉ; không đủ để chứng nhận xác suất hiếm khi trọng số tập trung.

Các kiểu không có hit vẫn chưa được xác nhận là không tồn tại. Các trường total/lo/hi của pipeline không cộng upper_zero_hits của các kiểu IS chưa thấy; vì vậy phải trình bày các cận ấy bên cạnh tổng, không đọc hi của tổng như chứng nhận rủi ro cho toàn bộ các kiểu. crosswalk_block có nhiều hit dưới q nhưng p nhỏ vì các hit có trọng số thấp; proposal tập trung vào một vùng rất hiếm không bảo đảm đã tìm vùng thất bại thường xảy ra nhất.

Riêng crosswalk_block, max/min giữa seed=3.4608437 lần. Sự lệch này và cận MC cho kiểu chưa thấy không đủ để xác nhận point estimate nhỏ của IS là xác suất thật.

Các hàng top_share>0,5: không có. top_share=max(w·y)/sum(w·y): nếu vượt 0,5 thì một mẫu quyết định hơn nửa ước lượng. ESS=(sum w)²/sum(w²) đo sự lệch trọng số toàn bộ mẫu, không phải số lần thử độc lập cho biến cố. top_share thấp cũng không chứng minh proposal đã phủ tất cả kiểu va chạm.

`estimate.json: budget`=16800 lần (gồm CEM và IS, không gồm phần MC lấy other); so với khoảng 57,600 lần MC để nhắm sai số tương đối ±20% ở p hiện tại. Các kiểu IS không có hit dùng upper_zero_hits=3/(0,2·n)=3/(0,2·600)=0,025, không dùng 3/ESS. Các kiểu chia nhau tập thất bại; other không có điểm nguy hiểm riêng để săn, nên lấy từ MC.

`estimate.json: other`: k=0, n=3000, hi=0.0012788957, source=mc.json. Không có hit other vẫn phải giữ cận trên khi diễn giải tổng.

## 5. Các kiểu thất bại

**bus_bypass**: tổng found=253 qua các cuộc săn (`hunt.json: *.found.bus_bypass`). C2 gặp xe buýt đang dừng, chờ khe rồi lách vào làn ego ở tốc độ thấp; ego nhận diện/giảm tốc muộn và chạm C2 trước x=112 m.

![bus_bypass tại khung thất bại](evidence/shots/bus_bypass.png)

**cut_in**: tổng found=0 qua các cuộc săn (`hunt.json: *.found.cut_in`). Không tìm thấy trong ngân sách này; không thể kết luận kiểu đó không tồn tại.

**crosswalk_block**: tổng found=32 qua các cuộc săn (`hunt.json: *.found.crosswalk_block`). P1 không ngó qua xe buýt nên không thấy ego đang tới; P1 bắt đầu qua đường, ego chỉ nhận ra khi hết che khuất và phanh muộn, dừng với thân xe trên vạch chặn P1. Đây là block, không nhất thiết là tiếp xúc cơ học.

![crosswalk_block tại khung thất bại](evidence/shots/crosswalk_block.png)

**rear_ended**: tổng found=0 qua các cuộc săn (`hunt.json: *.found.rear_ended`). Không tìm thấy trong ngân sách này; không thể kết luận kiểu đó không tồn tại.

Các ảnh CEM ở trên dùng run.policy gốc của cảnh đã xuất: xe chính là policy gốc, bóng mờ là bản sửa. Nhãn cố định trong panel của viewer vẫn ghi 'chính sách của bạn'/'chính sách gốc'; vai trò policy thực được xác định bởi run.policy và policy chung của file. Ảnh so bản sửa ở câu 6 dùng file bổ sung có vai trò đúng với nhãn.

Mỗi cuộc săn cần điểm nguy hiểm riêng: một cuộc săn chung sẽ ưu tiên kiểu dễ tìm nhất và co proposal quanh kiểu đó, làm bỏ sót kiểu khác. Bảng found ở câu 2 cho biết một cuộc săn còn tìm nhầm kiểu nào; số found là hiệu quả tìm kiếm, không phải tần suất tự nhiên.

## 6. Sửa planner

`fix.json: chosen.policy` = `{"cutinLat": 3.0}`. Chọn trên TRAIN bằng fail_hi thấp nhất trong nhóm giữ ≥95% quãng đường gốc; hòa thì chọn progress cao hơn. TEST dùng seed mới và CEM săn lại dưới chính policy được chọn, không dùng TEST để chọn ứng viên.

| Tập (`fix.json`) | fail | fail_hi_seen | fail_hi | progress (m) | harsh (khung) | unseen |
| --- | --- | --- | --- | --- | --- | --- |
| TRAIN gốc | 0.0015600952 | 0.0026017405 | 0.0026017405 | 212.79405 | 7.9882812 | — |
| TRAIN chọn | 1.0553822e-06 | 2.2925497e-06 | 2.2925497e-06 | 212.85586 | 7.4609375 | bus_bypass |
| TEST gốc | 0.0018739039 | 0.0031544584 | 0.0044333541 | 211.5632 | 9.109 | — |
| TEST chọn | 3.0917011e-08 | 5.216918e-08 | 0.038778948 | 211.41951 | 8.253 | bus_bypass |

Quãng đường TEST giảm 0.067919% so với gốc; tính đến khung va chạm, không tính đoạn chạy tiếp sau đó. harsh là số khung có a<−3 m/s² trung bình mỗi cảnh, không phải số đợt phanh riêng biệt. Mỗi khung dài 0,05 s; không nên gọi 20 khung phanh liên tục là 20 lần phanh.

fail_hi_seen chỉ cộng kiểu có hit. fail_hi trên TEST còn giữ cận 3/(0,2·400)=0,0375 cho mỗi kiểu unseen và khoảng Wilson của va chạm ngoài các kiểu được săn trên 3.000 mẫu tự nhiên. Vì vậy fail_hi có thể lớn hơn fail của planner gốc dù bản sửa giảm các thất bại quan sát được. TRAIN không có hit chỉ dùng để sàng lọc; chưa đủ ngân sách chứng nhận rủi ro nhỏ. Các thành phần IS có hit vẫn dựa trên khoảng chuẩn xấp xỉ; việc cộng cận từng thành phần không tự động cho bảo đảm đồng thời 95% của tổng nếu chưa hiệu chỉnh đa kiểm định.

| Ứng viên TRAIN (`fix.json: table`) | fail | fail_hi | progress |
| --- | --- | --- | --- |
| {"cautionV": 5.0} | 0.00029009755 | 0.00073077464 | 171.15881 |
| {"cautionV": 6.5} | 0.00080717389 | 0.0014217308 | 196.17546 |
| {"cautionV": 6.0} | 0.0029953109 | 0.0072083917 | 186.90233 |
| {"cautionV": 9.0} | 0.0055647888 | 0.014561163 | 223.08535 |
| {"cautionV": 8.5} | 0.0053161358 | 0.014310617 | 221.15064 |
| {"cutinLat": 2.6} | 5.2734113e-05 | 0.00011327864 | 212.86388 |
| {"cutinLat": 3.0} | 1.0553822e-06 | 2.2925497e-06 | 212.85586 |
| {"cutinLat": 3.3} | 1.0553822e-06 | 2.2925497e-06 | 212.84546 |
| {"T": 2.0} | 0.00062663895 | 0.00099316918 | 201.00991 |
| {"cutinLat": 3.0, "cautionV": 6.5} | 9.2769921e-07 | 2.1474736e-06 | 196.13277 |
| {"cutinLat": 3.0, "cautionV": 7.0} | 1.0893655e-06 | 2.3270841e-06 | 204.33118 |
| {"cutinLat": 2.6, "cautionV": 7.0, "pedBuffer": 3.5} | 1.9971411e-05 | 4.7812454e-05 | 204.34624 |

Núm nghe an toàn hơn có thể gây phản tác dụng: hạ cautionV làm ego đến vạch muộn, thay đổi khe mà C2 chấp nhận và thời điểm P1 bắt đầu qua đường; tăng T làm ego chừa khe rộng hơn, có thể mời C2 lách vào. Bảng TRAIN ở trên là bằng chứng để so từng thay đổi; không thể giả định mọi giảm tốc đều giảm va chạm. Ảnh so policy dùng cùng cảnh và cùng thời điểm, bật bóng mờ để thấy sự khác nhau.

Ví dụ từ `fix.json: table`: hạ cautionV từ 6,5 xuống 6,0 m/s làm point estimate TRAIN tăng từ 0.00080717389 lên 0.0029953109; đây là quan sát trên TRAIN, không phải bảo đảm ý nghĩa thống kê hay lý do để chọn theo TEST. Việc đổi tốc độ cũng đổi thời điểm các tác nhân nhận khe và sang đường.

![Bản sửa và bóng mờ policy gốc](evidence/shots/policy-ghost.png)

Ảnh dùng `viewer-ghost.json`, cảnh FIX-B-01 lấy nguyên tham số từ `viewer.json: B-01`; khung t=12.95 s, policy gốc thất bại kiểu bus_bypass, policy chọn không có thất bại ego. Xe chính là policy đã chọn, bóng mờ là policy gốc. Manifest lưu tham số/thời điểm và kết quả mô phỏng dùng chọn ảnh.

## 7. Từ mô phỏng ra đường thật

Các nguồn dưới đây là đề xuất thu thập dữ liệu, chưa được dùng để hiệu chuẩn lab.

| Giả định | Dữ liệu thay thế và cách lấy | Hướng sai lệch nếu giả định sai |
| --- | --- | --- |
| cutGap lognormal, trung vị 10 m (`space.py`) | Camera cố định/LiDAR trên tuyến có điểm dừng buýt; dựng quỹ đạo và đo khe trước/sau lúc bắt đầu nhập làn, kể cả các khe bị từ chối. | Nếu người thật chấp nhận khe nhỏ hơn, mô hình có thể đánh giá thấp bus_bypass; tương tác không đơn điệu nên phải đo lại bằng mô phỏng. |
| Tỷ lệ pedLook và chỉ bus che tầm nhìn người đi bộ | Video bên đường kết hợp hướng đầu/người, hình học xe buýt và quỹ đạo trước khi sang đường; ghi cả người chờ, không chỉ người đã sang. | Nếu người thật ngó ít hơn hoặc có thêm vật che, mô hình có thể đánh giá thấp crosswalk_block. |
| μ chỉ có 0,5 ướt và 0,8 khô; tỷ lệ wet cố định | Đo giảm tốc/phanh tại đường thử trên các mặt đường và điều kiện mưa, ghép nhật ký thời tiết với tổng số chuyến của tuyến. | Nếu μ thật thấp hơn hoặc chuyến đi ướt nhiều hơn, quãng phanh dài hơn và rủi ro có thể bị đánh giá thấp; phanh thực có trễ cũng làm sai lệch theo hướng này. |

Không được coi xác suất của thị trấn giả lập là xác suất tai nạn thực trước khi xác nhận các phân phối và phụ thuộc giữa mưa, hành vi người đi bộ, khe nhập làn và tuyến đường.

## 8. Giới hạn

1. Chỉ một phố, một điểm dừng buýt/vạch chính và horizon 24 s; không đại diện giao lộ, cao tốc, đường cong hoặc sự kiện sau giây 24.
2. Xe khác theo IDM/gap acceptance; không có đầy đủ trễ phản ứng, mất tập trung, đa dạng người lái hoặc thương lượng ánh mắt.
3. Cảm biến và trạng thái gần như hoàn hảo ngoài che khuất hình học; thiếu nhiễu phát hiện, sai phân loại, độ trễ, tracking mất mục tiêu và sai dự báo. Ego chỉ dùng điều khiển dọc, chưa so với tránh bằng đánh lái.

Nếu có thêm một tuần: đo khe nhập làn và thời điểm sang đường từ video, hiệu chuẩn phân phối có phụ thuộc; thêm độ trễ cảm biến/phản ứng rồi đánh giá trên tập tuyến và seed giữ kín, tăng ngân sách cho kiểu không có hit.

## 9. Rắc rối tự thiết kế

**Người băng ngang ngoài vạch sau điểm dừng xe buýt**: H0 từ phía nam băng ngang ở x=185 m, v=2,2 m/s, kích hoạt khi ego còn cách 36 m. Cảnh được dựng trong chương 10. Ngoài đời tương ứng người đi nhanh sang đường ở đoạn không có vạch; ở đây tốc độ và phạm vi là thiết kế thử nghiệm. Logic dự báo sang đường đặc biệt của planner gắn với P1/vạch chính x=122 m; H0 chỉ được coi là vật cản khi lọt vào hành lang. Vì vậy xe có thể nhận ra xung đột ngang quá muộn.

`hazard.json: space` = `{"h0_x": [170.0, 205.0], "h0_v": [1.8, 2.4], "h0_trig": [28.0, 44.0]}`; `exposure`=1. Đoạn 170–205 m nằm sau vạch chính; 1,8–2,4 m/s là đi nhanh dưới 2,5 m/s; 28–44 m quét quanh khoảng cảnh gốc để có cả thời gian phanh dài và ngắn. Lấy đều độc lập là thiết kế stress test. Exposure=1 vì mỗi chuyến thử nghiệm được cài một tình huống, theo lựa chọn của người làm bài; không phải số liệu khảo sát rằng mọi chuyến ngoài đường đều gặp người băng ngang. Căn cứ đầy đủ ở `hazard.json: why`.

`mine.json: exact.planner` = `[["ego", "H0", 22.2]]`. accepted=0.99666667, infeasible=5; world=town.

| Policy (`mine.json`) | n | crashes | avoidable | unavoidable | unattributed | low_speed | avoidable_foreknown | p | Wilson lo | Wilson hi | per_trip |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| baseline | 1495 | 256 | 253 | 0 | 3 | 0 | 253 | 0.16923077 | 0.15107692 | 0.18908017 | 0.16923077 |
| chosen | 1495 | 255 | 255 | 0 | 0 | 0 | 255 | 0.17056856 | 0.15235196 | 0.19047386 | 0.17056856 |

avoidable: phanh cực đại ngay khung rắc rối đã bắt đầu và nhìn thấy sẽ không va chạm. unavoidable: phanh như vậy vẫn va chạm. unattributed: va chạm trước khi quy được cho rắc rối, không được tính lỗi H0. low_speed là cờ tốc độ ego<1 m/s, có thể nằm trong bất kỳ nhóm nào, không phải nhóm thứ tư để cộng thêm. avoidable_foreknown cho phanh ngay lúc kích hoạt dù bị che; chênh lệch với avoidable biểu thị ảnh hưởng che khuất.

P(lỗi planner | rắc rối) chỉ đếm avoidable/n. Chuẩn này lạc quan vì người phanh biết chính xác sự kiện và phản ứng/phanh tối đa ngay khi thấy, nên có thể đếm nhiều lỗi tránh được hơn planner thực với cảm biến/trễ. Nhưng chỉ thử phanh, bỏ đánh lái, có thể làm đếm ít lỗi tránh được hơn một hệ thống có né ngang; hai tác động ngược chiều.

Với exposure=1, per_trip bằng p trong chiến dịch có cài rắc rối. Đặt cạnh bus_bypass tự nhiên từ MC: 0.0016666667/chuyến mô phỏng, và IS trung vị 0.0010638286/chuyến. Hai mức phơi nhiễm khác nhau; không suy ra H0 nguy hiểm hơn ngoài đời chỉ từ tỷ lệ này. Muốn tần suất thực phải đo exposure và hiệu chuẩn space trên đúng tuyến/ODD.

So trên cùng phép quét: baseline avoidable=253/1495, chosen avoidable=255/1495; chênh lệch p(chosen)−p(baseline)=0.0013377926. Bản sửa vẫn còn lỗi tránh được với H0; sửa kiểu cũ chưa bảo đảm khái quát sang người băng ngang ngoài vạch.

![Chương 10 tại va chạm H0](evidence/shots/hazard-studio.png)

**Tự lái:** chưa có phép thử người lái do Nguyễn Văn Tứ thực hiện; không có egoAcc và không báo kết quả oracle như thành tích tự lái. Có thể thử thêm bằng nút Bạn trong chương 10.

**Cách sửa:** khái quát dự báo sang đường từ riêng P1 sang mọi người đi bộ: dự báo thời gian họ vào hành lang ego, so với thời gian ego tới điểm giao nhau, giữ khoảng phanh theo μ và buffer trước khi thân xe chắn lối. cautionV/pedBuffer hiện chủ yếu tác động vạch P1; cutinLat chỉ điều chỉnh hành lang nhận diện xe, không mở ngưỡng ngang 1,9 m cố định dành cho người đi bộ H0. Giảm v0 có thể thêm thời gian phanh nhưng phải đo lại mất quãng đường và không thay thế logic dự báo xung đột ngang. Sau thay đổi phải săn lại dưới policy mới và đánh giá trên holdout cho cả H0 và các kiểu cũ.

## Tái lập và nộp bài

Chạy `./run_lab.ps1 all` (PowerShell), hoặc đặt `$env:LAB11_MSSV='2A202602586'` rồi chạy `python run_all.py all`. Không dùng `--quick` cho bằng chứng nộp. Sau khi bằng chứng đầy đủ, `python build_report.py` tạo lại báo cáo từ JSON. Mọi ảnh chụp dùng trình xem đi kèm, không dùng ảnh mẫu trong README. Xem `HOW_TO_RUN.md` để chạy test và mở viewer.
