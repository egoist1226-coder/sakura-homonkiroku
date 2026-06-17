/**
 * さくら研修機構 訪問指導記録票 - Google Drive 保存スクリプト
 * Google Apps Script Web App として デプロイしてください
 */

// 保存先のルートフォルダ名
var ROOT_FOLDER_NAME = 'さくら研修機構_訪問記録';

/**
 * CORSプリフライト対応
 */
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * POSTリクエスト受信 → Google Driveに保存
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // フォルダ構成: ルート / 企業名 / 年月
    var root    = getOrCreateFolder(ROOT_FOLDER_NAME, DriveApp.getRootFolder());
    var company = getOrCreateFolder(data.company || '未設定企業', root);
    var ym      = getOrCreateFolder(getYearMonth(data.savedAt), company);

    // ファイル名: 訪問記録_企業名_日付.json
    var dateStr  = (data.savedAt || new Date().toISOString()).slice(0, 10);
    var fileName = '訪問記録_' + (data.company || '未設定') + '_' + dateStr + '.json';

    // 既存ファイルがあれば上書き
    var existing = ym.getFilesByName(fileName);
    if (existing.hasNext()) {
      existing.next().setTrashed(true);
    }

    // JSONファイル保存
    var blob = Utilities.newBlob(
      JSON.stringify(data, null, 2),
      'application/json',
      fileName
    );
    var file = ym.createFile(blob);

    return buildResponse({ status: 'ok', fileId: file.getId(), fileName: fileName });

  } catch (err) {
    return buildResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * GETリクエスト: 動作確認用
 */
function doGet(e) {
  return buildResponse({ status: 'ok', message: 'さくら研修機構 訪問記録APIは正常に動作しています' });
}

// ── ヘルパー関数 ──

function getOrCreateFolder(name, parent) {
  var folders = parent.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : parent.createFolder(name);
}

function getYearMonth(isoStr) {
  try {
    var d = new Date(isoStr);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    return y + '年' + m + '月';
  } catch(e) {
    return '年月不明';
  }
}

function buildResponse(obj) {
  var output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
