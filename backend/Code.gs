/**
 * Money Base - Backend (Google Apps Script)
 *
 * Đọc/ghi trực tiếp vào sheet dữ liệu thật của người dùng:
 * "DATA MONEY BASE (KHÔNG XÓA)" — tab "Sổ giao dịch" (5173+ giao dịch Money Lover
 * đồng bộ từ 2018 tới nay). KHÔNG được xoá hay ghi đè dữ liệu cũ.
 *
 * Cấu trúc cột (Sổ giao dịch), hàng 1 là header:
 *   A: Id                       — số nguyên duy nhất. Quy ước có sẵn trong sheet:
 *                                  1 = giao dịch MỚI NHẤT, số tăng dần về quá khứ.
 *   B: Ngày                     — ngày giao dịch (Date)
 *   C: Nhóm                     — danh mục (text tự do, vd "Bữa tối", "Lương"...)
 *   D: Số tiền                  — số âm = chi, số dương = thu
 *   E: Đơn vị tiền tệ           — vd "VND"
 *   F: Ví                       — vd "Tiền mặt", "Tiết Kiệm"
 *   G: Ghi chú
 *   H: Với
 *   I: Sự kiện
 *   J: Không tính vào báo cáo   — TRUE/FALSE
 *   K: Thành viên
 *
 * Vì cột A của toàn bộ dữ liệu cũ tuân theo quy ước "Id nhỏ = mới nhất", khi có
 * giao dịch mới ta CHÈN Ở ĐẦU (ngay dưới header) thay vì nối cuối, rồi dịch toàn
 * bộ Id cũ lên (+k, với k = số giao dịch mới) để giữ đúng quy ước đó thay vì đánh
 * số lộn xộn ở cuối sheet.
 *
 * Deploy: Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone
 */

const SPREADSHEET_ID = '1LsvUbnRB9Cd1UcwigR6g7pTc0TQgfn92xqsRxGhsfJ0';
const SHEET_NAME = 'Sổ giao dịch';
const HEADERS = ['Id', 'Ngày', 'Nhóm', 'Số tiền', 'Đơn vị tiền tệ', 'Ví', 'Ghi chú', 'Với', 'Sự kiện', 'Không tính vào báo cáo', 'Thành viên'];
const DEFAULT_CURRENCY = 'VND';
const DEFAULT_WALLET = 'Tiền mặt';

function getSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error('Không tìm thấy sheet "' + SHEET_NAME + '"');
  }
  return sheet;
}

function jsonOutput_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function rowToTransaction_(row) {
  const dateValue = row[1];
  return {
    id: row[0],
    date: dateValue instanceof Date ? dateValue.toISOString() : dateValue,
    category: row[2],
    amount: Number(row[3]) || 0,
    currency: row[4] || DEFAULT_CURRENCY,
    wallet: row[5] || DEFAULT_WALLET,
    note: row[6] || '',
    withWhom: row[7] || '',
    event: row[8] || '',
    excludedFromReport: row[9] === true || row[9] === 'TRUE',
    member: row[10] || ''
  };
}

/**
 * GET /exec               -> 50 giao dịch mới nhất
 * GET /exec?limit=200     -> 200 giao dịch mới nhất
 * GET /exec?full=1        -> TOÀN BỘ giao dịch (dùng để đồng bộ về local 1 lần)
 */
function doGet(e) {
  try {
    const sheet = getSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return jsonOutput_({ success: true, data: [] });
    }

    const totalRows = lastRow - 1;
    const params = (e && e.parameter) || {};
    const numRows = params.full ? totalRows : Math.min(totalRows, Number(params.limit) || 50);

    // Dữ liệu đã được sắp xếp sẵn: hàng 2 = mới nhất. Lấy numRows hàng đầu tiên.
    const values = sheet.getRange(2, 1, numRows, HEADERS.length).getValues();
    const data = values.map(rowToTransaction_);

    return jsonOutput_({ success: true, total: totalRows, data: data });
  } catch (err) {
    return jsonOutput_({ success: false, error: err.message });
  }
}

/**
 * POST /exec  — body: mảng JSON các giao dịch mới từ app (offline queue).
 * Chèn ở đầu bảng (ngay dưới header), dịch Id cũ lên để giữ quy ước
 * "Id nhỏ nhất = giao dịch mới nhất".
 */
function doPost(e) {
  try {
    const sheet = getSheet_();
    const body = JSON.parse(e.postData.contents);
    const incoming = Array.isArray(body) ? body : [body];
    if (incoming.length === 0) {
      return jsonOutput_({ success: true, inserted: 0 });
    }

    // Giao dịch mới nhất (ngày lớn nhất) sẽ nhận Id nhỏ nhất (Id = 1).
    incoming.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

    const k = incoming.length;
    const lastRow = sheet.getLastRow();
    const totalRows = Math.max(0, lastRow - 1);

    sheet.insertRowsBefore(2, k);

    // Dịch Id của toàn bộ giao dịch cũ lên +k để nhường chỗ cho lô mới.
    if (totalRows > 0) {
      const idRange = sheet.getRange(2 + k, 1, totalRows, 1);
      const oldIds = idRange.getValues();
      const shiftedIds = oldIds.map(function (r) { return [Number(r[0]) + k]; });
      idRange.setValues(shiftedIds);
    }

    const rows = incoming.map(function (tx, index) {
      const newId = index + 1; // hàng đầu tiên (mới nhất trong lô) = 1, tăng dần
      return [
        newId,
        tx.date ? new Date(tx.date) : new Date(),
        tx.category || '',
        Number(tx.amount) || 0,
        tx.currency || DEFAULT_CURRENCY,
        tx.wallet || DEFAULT_WALLET,
        tx.note || '',
        tx.withWhom || '',
        tx.event || '',
        !!tx.excludedFromReport,
        tx.member || ''
      ];
    });

    sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);

    return jsonOutput_({ success: true, inserted: rows.length });
  } catch (err) {
    return jsonOutput_({ success: false, error: err.message });
  }
}
