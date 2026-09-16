/**
 * Money Base - Backend (Google Apps Script)
 * Sheet "Chi Tieu" columns: ID | Ngay | So tien | Danh muc | Ghi chu
 *
 * Deploy: Extensions > Apps Script > paste this file > Deploy > New deployment
 *         Type: Web app, Execute as: Me, Who has access: Anyone
 */

const SHEET_NAME = 'Chi Tieu';
const HEADERS = ['ID', 'Ngay', 'So tien', 'Danh muc', 'Ghi chu'];

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  }
  return sheet;
}

function jsonOutput_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    const sheet = getSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return jsonOutput_({ success: true, data: [] });
    }

    const startRow = Math.max(2, lastRow - 49);
    const numRows = lastRow - startRow + 1;
    const values = sheet.getRange(startRow, 1, numRows, HEADERS.length).getValues();

    const data = values
      .map(function (row) {
        return {
          id: row[0],
          date: row[1] instanceof Date ? row[1].toISOString() : row[1],
          amount: row[2],
          category: row[3],
          note: row[4]
        };
      })
      .reverse();

    return jsonOutput_({ success: true, data: data });
  } catch (err) {
    return jsonOutput_({ success: false, error: err.message });
  }
}

function doPost(e) {
  try {
    const sheet = getSheet_();
    const body = JSON.parse(e.postData.contents);
    const transactions = Array.isArray(body) ? body : [body];

    const rows = transactions.map(function (tx) {
      return [
        tx.id || Utilities.getUuid(),
        tx.date || new Date().toISOString(),
        tx.amount || 0,
        tx.category || '',
        tx.note || ''
      ];
    });

    if (rows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, HEADERS.length).setValues(rows);
    }

    return jsonOutput_({ success: true, inserted: rows.length });
  } catch (err) {
    return jsonOutput_({ success: false, error: err.message });
  }
}
