/**
 * さくら研修機構 訪問指導記録票 - Google Drive 保存 + メール送信スクリプト
 */

var ROOT_FOLDER_NAME = 'さくら研修機構_訪問記録';

function doOptions(e) {
  return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // ── 下書き保存 ──
    if (data.type === 'draft') {
      var drafts = getDraftsFolder();
      var draftName = '下書き_' + data.companyId + '.json';
      var existing = drafts.getFilesByName(draftName);
      if (existing.hasNext()) existing.next().setTrashed(true);
      var blob = Utilities.newBlob(JSON.stringify(data, null, 2), 'application/json', draftName);
      drafts.createFile(blob);
      return buildResponse({ status: 'ok', message: '下書きを保存しました' });
    }

    // ── Google Drive 保存 ──
    var root    = getOrCreateFolder(ROOT_FOLDER_NAME, DriveApp.getRootFolder());
    var company = getOrCreateFolder(data.company || '未設定企業', root);
    var ym      = getOrCreateFolder(getYearMonth(data.savedAt), company);

    var dateStr  = (data.savedAt || new Date().toISOString()).slice(0, 10);
    var fileName = '訪問記録_' + (data.company || '未設定') + '_' + dateStr + '.json';

    var existing = ym.getFilesByName(fileName);
    if (existing.hasNext()) existing.next().setTrashed(true);

    var blob = Utilities.newBlob(JSON.stringify(data, null, 2), 'application/json', fileName);
    var file = ym.createFile(blob);

    // 下書き削除
    if (data.companyId) {
      try {
        var drafts2 = getDraftsFolder();
        var draftFiles = drafts2.getFilesByName('下書き_' + data.companyId + '.json');
        if (draftFiles.hasNext()) draftFiles.next().setTrashed(true);
      } catch(de) {}
    }

    // ── メール送信 ──
    var mailResult = '';
    if (data.contactEmail && data.contactEmail.indexOf('@') > -1) {
      try {
        var visitDate = formatDateJp(data.savedAt);
        var nextVisit = data.nextVisit || '未設定';
        var staff     = data.staff || 'さくら研修機構';

        var subject = '訪問指導記録票のご送付（' + data.company + '）';

        var body =
          data.contactName + ' 様\n\n' +
          '平素よりお世話になっております。\n' +
          '公益社団法人さくら研修機構の' + staff + 'でございます。\n\n' +
          visitDate + 'に実施いたしました訪問指導の記録票をお送りいたします。\n' +
          '宜しくご査収・ご確認のほどお願いいたします。\n\n' +
          '【訪問日時】' + visitDate + '\n' +
          '【次回訪問予定】' + nextVisit + '\n\n' +
          '---\n' +
          '公益社団法人さくら研修機構\n' +
          staff;

        MailApp.sendEmail({
          to: data.contactEmail,
          bcc: 'miyatake@sakura-training.jp',
          subject: subject,
          body: body
        });
        mailResult = 'sent';
      } catch (mailErr) {
        mailResult = 'error: ' + mailErr.toString();
      }
    } else {
      mailResult = 'skipped (no email)';
    }

    return buildResponse({ status: 'ok', fileId: file.getId(), fileName: fileName, mail: mailResult });

  } catch (err) {
    return buildResponse({ status: 'error', message: err.toString() });
  }
}

function doGet(e) {
  var action = e.parameter.action;

  // 下書き取得
  if (action === 'getDraft') {
    var companyId = e.parameter.companyId;
    try {
      var drafts = getDraftsFolder();
      var files = drafts.getFilesByName('下書き_' + companyId + '.json');
      if (files.hasNext()) {
        var content = files.next().getBlob().getDataAsString();
        return buildResponse({ status: 'ok', draft: JSON.parse(content) });
      } else {
        return buildResponse({ status: 'not_found' });
      }
    } catch(err) {
      return buildResponse({ status: 'error', message: err.toString() });
    }
  }

  return buildResponse({ status: 'ok', message: 'さくら研修機構 訪問記録APIは正常に動作しています' });
}

function getDraftsFolder() {
  var root = getOrCreateFolder(ROOT_FOLDER_NAME, DriveApp.getRootFolder());
  return getOrCreateFolder('下書き', root);
}

function getOrCreateFolder(name, parent) {
  var folders = parent.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : parent.createFolder(name);
}

function getYearMonth(isoStr) {
  try {
    var d = new Date(isoStr);
    return d.getFullYear() + '年' + String(d.getMonth() + 1).padStart(2, '0') + '月';
  } catch(e) { return '年月不明'; }
}

function formatDateJp(isoStr) {
  try {
    var d = new Date(isoStr);
    var y = d.getFullYear() - 2018;
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return '令和' + y + '年' + m + '月' + day + '日';
  } catch(e) { return isoStr || ''; }
}

function buildResponse(obj) {
  var output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
