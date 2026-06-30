# Dashboard Ads Meta — The Vagabond Pâtisserie
## Hướng dẫn cài đặt (làm 1 lần, ~10 phút)

Bạn có 3 file:
- **index.html** — trang dashboard đẹp (đã có sẵn dữ liệu mẫu để xem thử).
- **Code.gs** — code Apps Script đọc số liệu từ Google Sheet.
- **HUONG_DAN_CAI_DAT.md** — file này.

Cách hoạt động: bạn sửa số trong **Google Sheet** → Apps Script biến số đó thành dữ liệu → **index.html** đọc về và vẽ lại biểu đồ. Sửa số xong chỉ cần **refresh trang** là web đổi theo.

---

## BƯỚC 1 — Đưa báo cáo lên Google Sheet
1. Vào [drive.google.com](https://drive.google.com) → **New / Mới** → **File upload** → chọn file `BaoCao_Ads_Meta_2026-06-30_1624.xlsx`.
2. Bấm chuột phải file vừa lên → **Open with / Mở bằng** → **Google Sheets**.
3. Quan trọng: giữ **nguyên cấu trúc** — sheet tên `Theo dõi theo ngày`, cột B là tên chỉ số (SPENT, CPM, CPC, CTR, MESS, MUA, DT, ROAS…), dòng 1 là các ngày. Mỗi chiến dịch bắt đầu bằng dòng **TÊN ADS**.
   - Sau này muốn cập nhật số: cứ sửa thẳng trong các ô của Google Sheet này.

## BƯỚC 2 — Gắn Apps Script
1. Trong Google Sheet vừa mở: menu **Extensions / Tiện ích mở rộng** → **Apps Script**.
2. Xoá hết code mẫu trong cửa sổ hiện ra.
3. Mở file `Code.gs` (kèm theo), copy **toàn bộ** rồi dán vào.
4. Bấm **biểu tượng đĩa mềm (Save)**.
   - Nếu sheet của bạn đặt tên khác `Theo dõi theo ngày`, sửa dòng `var SHEET_NAME = '...'` ở đầu Code.gs cho khớp.

## BƯỚC 3 — Xuất bản (Deploy) thành Web App
1. Góc trên bên phải bấm **Deploy / Triển khai** → **New deployment / Bản triển khai mới**.
2. Bấm bánh răng ⚙ cạnh "Select type" → chọn **Web app**.
3. Điền:
   - **Execute as / Chạy với tư cách:** `Me` (chính bạn).
   - **Who has access / Ai có quyền:** `Anyone` (Bất kỳ ai).
4. Bấm **Deploy**. Google sẽ hỏi quyền → **Authorize / Cho phép** (chọn tài khoản, bấm Advanced → Go to project nếu có cảnh báo, rồi Allow).
5. Copy đường link kết thúc bằng **/exec**. Đây là link dữ liệu của bạn.

> Thử nhanh: dán link /exec đó vào trình duyệt. Nếu hiện ra một đống chữ JSON (days, campaigns, data…) là **đã chạy đúng**.

## BƯỚC 4 — Nối link vào dashboard
1. Mở file `index.html` bằng **Notepad** (chuột phải → Open with → Notepad) hoặc bất kỳ trình soạn thảo nào.
2. Tìm dòng (gần đầu file, dùng Ctrl+F gõ `SHEET_URL`):
   ```
   const SHEET_URL='';
   ```
3. Dán link /exec vào giữa 2 dấu nháy:
   ```
   const SHEET_URL='https://script.google.com/macros/s/XXXX.../exec';
   ```
4. **Save**. Mở `index.html` bằng trình duyệt (Chrome) → dashboard sẽ tải số liệu thật từ Google Sheet.

---

## Dùng hằng ngày
- Cập nhật số: sửa trong **Google Sheet** → quay lại trang web bấm **Tải lại / refresh (F5)**.
- Không cần đụng lại Code.gs hay index.html, trừ khi đổi tên sheet.
- Nếu sau này thêm/bớt chiến dịch hoặc thêm ngày: cứ thêm trong Sheet theo đúng kiểu cũ (block TÊN ADS + các dòng chỉ số), web tự nhận.

## Một số lưu ý kỹ thuật
- **CTR**: trong Sheet để dạng phần trăm (vd 0.0527 = 5.27%) — Code.gs tự đổi sang 5.27. Nếu bạn gõ thẳng `5.27` cũng được.
- **Dòng "Tổng (tất cả chiến dịch)"** trên dashboard được tính tự động: Chi tiêu/Doanh thu/MESS/Mua = cộng dồn; CPM/CPC/CTR = trung bình; ROAS = tổng Doanh thu ÷ tổng Chi tiêu.
- Chiến dịch không có ô SPENT nào sẽ tự bị bỏ qua (không hiện).
- Nếu deploy lại sau khi sửa Code.gs: **Deploy → Manage deployments → bút chì ✎ → Version: New version → Deploy** (giữ nguyên link /exec cũ).

## Khắc phục sự cố
- Web báo "Không tải được Google Sheet": kiểm tra (a) đã đặt **Anyone** ở bước 3 chưa; (b) link dán có đuôi `/exec` không (không phải `/dev`); (c) mở link /exec trực tiếp xem có ra JSON không.
- JSON báo `error: Không tìm thấy sheet`: tên sheet trong file không khớp `SHEET_NAME` trong Code.gs.
