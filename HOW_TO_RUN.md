# Chạy bài lab của Nguyễn Văn Tứ

## Giao diện trên localhost

Nhấp đúp **start_ui.bat** để khởi động giao diện và mở trình duyệt. Hoặc chạy:

```powershell
python serve_ui.py --open
```

Địa chỉ mặc định: **http://127.0.0.1:8000/ui/**. Giữ terminal mở khi sử dụng; nhấn **Ctrl+C** để dừng server. Nếu cổng đang được sử dụng, chạy `python serve_ui.py --port 8001 --open`.

Nếu chính giao diện này đã chạy trên cổng 8000, nhấp đúp `start_ui.bat` chỉ mở lại trình duyệt, không tạo thêm server. Nếu một ứng dụng khác dùng cổng đó, chọn cổng 8001 như lệnh trên.

Server chạy ngầm do trợ lý khởi động có thể dừng bằng `./stop_ui.ps1`. Script chỉ dừng PID đã ghi nhận sau khi xác minh đúng đường dẫn server của dự án. Với server tự chạy trong terminal, dùng **Ctrl+C**.

Giao diện tự đọc kết quả trong `evidence/`, không cần npm, API key hoặc Internet:

- **Tổng quan:** chỉ số Monte Carlo, bản đồ mô phỏng, chọn kịch bản, phát/dừng, tua thời gian, đổi policy và bật bóng so sánh.
- **Kịch bản:** tìm kiếm, lọc nhóm và mở 17 cảnh đã xuất.
- **Đánh giá planner:** số liệu TEST, so sánh rắc rối mới và importance sampling theo seed.
- **Báo cáo:** đọc trực tiếp REPORT.md, xem bảng/ảnh và tải file.
- **Trình xem 3D:** tự nạp đúng kịch bản và policy đang chọn vào viewer gốc. Có liên kết mở xưởng dựng tình huống ở chương 10. Khi mở trực tiếp viewer gốc ngoài giao diện mới, nạp `evidence/viewer.json` như hướng dẫn phía dưới.

Phím tắt ở khu vực mô phỏng: **Space** phát/dừng; **← / →** lùi/tiến một khung. Nút **Lúc thất bại** chuyển đến khung sự kiện của policy đang xem. Bóng so sánh luôn dùng policy còn lại. Nếu chạy lại bài lab, bấm **Cập nhật dữ liệu** để nạp kết quả mới.

Trình xem 3D có nút chọn chất lượng cạnh thanh thời gian, mặc định **Mượt**: giới hạn 30 khung/giây, tối đa khoảng 800.000 điểm ảnh và tắt bóng đổ. **Cân bằng** thêm bóng 1.024 px; **Chi tiết** tăng độ phân giải và giới hạn 60 khung/giây. Lựa chọn được lưu trên trình duyệt. Khi dừng phát và camera đã đứng yên, cảnh ngừng render; hiệu ứng LiDAR/mưa vẫn được cập nhật nếu bật. Tab ẩn ngừng render và giữ nguyên thời gian cho đến khi quay lại. Các chế độ chỉ thay đổi phần hiển thị, không thay đổi kết quả mô phỏng của bài lab. Sau khi cập nhật mã nguồn, nhấn **Ctrl+F5** để nạp lại viewer.

## Chạy lại tính toán bài lab

MSSV `2A202602586` có chữ A. Giữ nguyên MSSV để kết quả và seed khớp bài nộp. `run_all.py` hỗ trợ MSSV này thông qua biến môi trường `LAB11_MSSV`; script dưới đây tự đọc dòng đầu `REPORT.md` và truyền biến đó.

```powershell
python -m pip install -r requirements.txt
.\run_lab.ps1 all
```

Chạy từng bước nếu cần:

```powershell
.\run_lab.ps1 world
.\run_lab.ps1 replay
.\run_lab.ps1 mc
.\run_lab.ps1 hunt
.\run_lab.ps1 estimate
.\run_lab.ps1 fix
.\run_lab.ps1 mine
.\run_lab.ps1 export
python prepare_shots.py
python build_report.py
python pack_lab.py
```

Hoặc gọi Python trực tiếp:

```powershell
$env:LAB11_MSSV = '2A202602586'
python -u run_all.py all
```

Trên Bash: `LAB11_MSSV=2A202602586 python -u run_all.py all`.

Không dùng `--quick` cho bài nộp. Không chỉnh `avsim/`, `run_all.py`, phân phối hoặc seed. `policy_candidates.json` giữ nguyên các ứng viên ban đầu; policy được chọn trên TRAIN.

Kiểm tra đầy đủ (cần Node cho parity):

```powershell
python -m pytest -q -p no:cacheprovider tests
```

Nếu sandbox Windows chặn tạo thư mục tạm của parity, chạy lệnh test trong terminal bình thường ngoài sandbox. Lỗi quyền tệp tạm không phải lỗi mô phỏng.

Mở `viewer/index.html`, chọn chương 9 và nạp `evidence/viewer.json`. Chọn một cảnh, dừng phát và kéo thanh thời gian tới thời điểm thất bại. Bật bóng mờ để so với policy khác. Chương 10 nạp `hazard.json` để xem người băng ngang, hoặc bấm **Bạn** để tự thử lái. Báo cáo hiện không khẳng định có phép thử người lái.

`prepare_shots.py` chọn khung thất bại thực từ `viewer.json` và ghi `evidence/shots/manifest.json`. `evidence/viewer-ghost.json` là file xem bổ sung: xe chính dùng policy đã chọn, bóng mờ dùng policy gốc, cùng tham số chính xác của một cảnh đã xuất. Các ảnh PNG được chụp trong trình xem tại thời gian ghi trong manifest; script này không tự chụp ảnh.

`exposure=1` trong phần G là định nghĩa chiến dịch thử nghiệm có một tình huống/chuyến, được người làm bài chọn. Kết quả không phải ước lượng tần suất tai nạn ngoài đời; cần dữ liệu thực để hiệu chuẩn.

Bộ nộp gồm `lab11/*.py`, `hazard.json`, `REPORT.md`, `evidence/*.json` và `evidence/shots/*.png`. Thư mục `evidence/` bị Git bỏ qua theo `.gitignore` gốc; phải kèm nó khi đóng gói/nộp bài.
