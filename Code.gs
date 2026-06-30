/**
 * THE VAGABOND PÂTISSERIE — Dashboard Ads Meta
 * Apps Script: đọc Google Sheet (giữ nguyên cấu trúc file Excel báo cáo)
 * và trả về JSON cho dashboard index.html.
 *
 * CÁCH DÙNG:
 *   1. Mở Google Sheet chứa báo cáo (sheet "Theo dõi theo ngày").
 *   2. Menu Extensions → Apps Script, dán toàn bộ file này vào.
 *   3. Deploy → New deployment → Web app:
 *        - Execute as: Me
 *        - Who has access: Anyone
 *      Copy link /exec, dán vào biến SHEET_URL trong index.html.
 *   4. Mỗi lần sửa số trong Sheet, web tự cập nhật (bấm "Tải lại" / refresh trang).
 *
 * Sửa số liệu ở đâu? → Ngay trong Google Sheet. Không cần đụng vào code này nữa.
 */

// Tên sheet dữ liệu theo ngày. Đổi nếu bạn đặt tên khác.
var SHEET_NAME = 'Theo dõi theo ngày';

// Nhãn ở cột B (cột "Ngày") ↔ key dùng trong dashboard.
// Chỉ 8 chỉ số này được dashboard dùng; các dòng khác (CR, AOV, SET UP, NHẬN XÉT) bỏ qua.
var LABEL_MAP = {
  'SPENT': 'spend',
  'CPM':   'cpm',
  'CPC':   'cpc',
  'CTR':   'ctr',
  'MESS':  'mess',
  'MUA':   'mua',
  'DT':    'dt',
  'ROAS':  'roas'
};

function doGet(e) {
  var out;
  try {
    out = buildData();
  } catch (err) {
    out = { error: String(err) };
  }
  return ContentService
    .createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Đọc Sheet và dựng object {days, campaigns, all, data} */
function buildData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) throw new Error('Không tìm thấy sheet "' + SHEET_NAME + '"');

  var values = sh.getDataRange().getValues(); // mảng 2 chiều, 0-based
  if (values.length < 2) throw new Error('Sheet rỗng');

  var header = values[0]; // dòng 1: STT | Ngày | 01/06 | 02/06 | ... | TỔNG THÁNG

  // 1) Tìm các cột ngày: từ cột index 2 (cột thứ 3) cho tới khi gặp "TỔNG"
  var dayCols = [];
  var days = [];
  for (var c = 2; c < header.length; c++) {
    var h = header[c];
    if (h === '' || h === null) continue;
    if (String(h).toUpperCase().indexOf('TỔNG') !== -1 ||
        String(h).toUpperCase().indexOf('TONG') !== -1) break; // cột tổng → dừng
    dayCols.push(c);
    days.push(formatDay(h));
  }
  if (dayCols.length === 0) throw new Error('Không nhận diện được cột ngày ở dòng 1');

  // 2) Duyệt từng block. Mỗi block bắt đầu ở dòng có cột B = "TÊN ADS".
  var campaigns = [];
  var data = {};
  var curName = null;

  for (var r = 0; r < values.length; r++) {
    var label = String(values[r][1] || '').trim().toUpperCase(); // cột B (index 1)

    if (label === 'TÊN ADS' || label === 'TEN ADS') {
      // tên chiến dịch = giá trị đầu tiên không rỗng trên dòng này (ưu tiên các cột ngày, rồi cột tổng)
      curName = firstNonEmpty(values[r], dayCols);
      if (curName === null) curName = firstNonEmpty(values[r], range(2, header.length));
      if (curName !== null) {
        curName = String(curName).trim();
        if (!data[curName]) {
          campaigns.push(curName);
          data[curName] = blankMetrics(dayCols.length);
        }
      }
      continue;
    }

    if (curName === null) continue;
    var key = LABEL_MAP[label];
    if (!key) continue; // dòng không phải chỉ số cần dùng

    var arr = [];
    for (var i = 0; i < dayCols.length; i++) {
      var v = values[r][dayCols[i]];
      arr.push(cleanNumber(v, key));
    }
    data[curName][key] = arr;
  }

  // Bỏ qua chiến dịch không có ô SPENT nào (block trống)
  campaigns = campaigns.filter(function (name) {
    var sp = data[name].spend;
    for (var i = 0; i < sp.length; i++) if (sp[i] != null) return true;
    delete data[name];
    return false;
  });

  if (campaigns.length === 0) throw new Error('Không tìm thấy chiến dịch nào (dòng "TÊN ADS")');

  // 3) Dòng "Tổng (tất cả chiến dịch)" theo từng ngày
  var all = buildAll(campaigns, data, dayCols.length);

  return { days: days, campaigns: campaigns, all: all, data: data };
}

/** Khung 8 mảng rỗng cho 1 chiến dịch */
function blankMetrics(n) {
  return {
    spend: nulls(n), dt: nulls(n), cpm: nulls(n), cpc: nulls(n),
    ctr: nulls(n), mess: nulls(n), mua: nulls(n), roas: nulls(n)
  };
}

/** Tổng tất cả chiến dịch: spend/dt/mess/mua = cộng dồn; cpm/cpc/ctr = trung bình; roas = tổngDT/tổngSpend */
function buildAll(campaigns, data, n) {
  var all = blankMetrics(n);
  for (var d = 0; d < n; d++) {
    var sumSpend = 0, sumDt = 0, sumMess = 0, sumMua = 0;
    var cpm = [], cpc = [], ctr = [];
    for (var k = 0; k < campaigns.length; k++) {
      var m = data[campaigns[k]];
      sumSpend += num(m.spend[d]);
      sumDt    += num(m.dt[d]);
      sumMess  += num(m.mess[d]);
      sumMua   += num(m.mua[d]);
      if (m.cpm[d] != null) cpm.push(m.cpm[d]);
      if (m.cpc[d] != null) cpc.push(m.cpc[d]);
      if (m.ctr[d] != null) ctr.push(m.ctr[d]);
    }
    all.spend[d] = sumSpend;
    all.dt[d]    = round2(sumDt);
    all.mess[d]  = sumMess;
    all.mua[d]   = sumMua;
    all.cpm[d]   = mean(cpm);
    all.cpc[d]   = mean(cpc);
    all.ctr[d]   = mean(ctr);
    all.roas[d]  = sumSpend > 0 ? round2(sumDt / sumSpend) : null;
  }
  return all;
}

/* ---------- tiện ích ---------- */

function nulls(n) { var a = []; for (var i = 0; i < n; i++) a.push(null); return a; }
function range(a, b) { var r = []; for (var i = a; i < b; i++) r.push(i); return r; }
function num(v) { return (typeof v === 'number' && !isNaN(v)) ? v : 0; }
function round2(v) { return v == null ? null : Math.round(v * 100) / 100; }

function mean(arr) {
  if (!arr.length) return null;
  var s = 0; for (var i = 0; i < arr.length; i++) s += arr[i];
  return round2(s / arr.length);
}

function firstNonEmpty(row, cols) {
  for (var i = 0; i < cols.length; i++) {
    var v = row[cols[i]];
    if (v !== '' && v !== null && v !== undefined) return v;
  }
  return null;
}

/**
 * Chuẩn hoá ô số:
 *  - ô rỗng → null (để dashboard hiểu "không có dữ liệu")
 *  - CTR lưu dạng phần trăm (0.0527) → đổi thành 5.27. Nếu đã là số >1 thì giữ nguyên.
 *  - các số khác giữ nguyên, làm tròn 2 chữ số.
 */
function cleanNumber(v, key) {
  if (v === '' || v === null || v === undefined) return null;
  var x = (typeof v === 'number') ? v : parseFloat(String(v).replace(/[, %]/g, ''));
  if (isNaN(x)) return null;
  if (key === 'ctr' && Math.abs(x) <= 1) x = x * 100; // 0.0527 → 5.27
  return round2(x);
}

/** Định dạng ô ngày ở dòng 1 thành "dd/mm" */
function formatDay(h) {
  if (Object.prototype.toString.call(h) === '[object Date]') {
    var dd = ('0' + h.getDate()).slice(-2);
    var mm = ('0' + (h.getMonth() + 1)).slice(-2);
    return dd + '/' + mm;
  }
  var s = String(h).trim();
  // "01/06/2026" → "01/06"
  var m = s.match(/^(\d{1,2})[\/\-](\d{1,2})/);
  if (m) return ('0' + m[1]).slice(-2) + '/' + ('0' + m[2]).slice(-2);
  return s;
}
