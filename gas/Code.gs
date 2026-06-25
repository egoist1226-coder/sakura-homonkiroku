/**
 * さくら研修機構 訪問指導記録票 - Google Drive 保存 + PDF生成 + メール送信
 */

var ROOT_FOLDER_ID = '1oVN_dV3qRh-6FPnxfAICxMDa4SZRfvkH'; // 訪問指導記録表（共有フォルダ）

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

    // ── フォルダ準備 ──
    var root    = DriveApp.getFolderById(ROOT_FOLDER_ID);
    var company = getOrCreateFolder(data.company || '未設定企業', root);
    var ym      = getOrCreateFolder(getYearMonth(data.savedAt), company);

    var dateStr  = (data.savedAt || new Date().toISOString()).slice(0, 10);
    var baseName = (data.company || '未設定') + 'さま_' + dateStr;

    // ── PDF生成・保存 ──
    var pdfBlob = createVisitPdf(data);
    var pdfName = '訪問記録_' + baseName + '.pdf';
    var existingPdf = ym.getFilesByName(pdfName);
    if (existingPdf.hasNext()) existingPdf.next().setTrashed(true);
    pdfBlob.setName(pdfName);
    var pdfFile = ym.createFile(pdfBlob);

    // ── 下書き削除 ──
    if (data.companyId) {
      try {
        var drafts2 = getDraftsFolder();
        var draftFiles = drafts2.getFilesByName('下書き_' + data.companyId + '.json');
        if (draftFiles.hasNext()) draftFiles.next().setTrashed(true);
      } catch(de) {}
    }

    // ── メール送信（PDF添付） ──
    var mailResult = '';
    if (data.contactEmail && data.contactEmail.indexOf('@') > -1) {
      try {
        var visitDate = formatDateJp(data.savedAt);
        var nextVisit = data.nextVisit ? data.nextVisit.trim() : '未設定';
        var staff     = data.staff || 'さくら研修機構';

        var subject = '訪問指導記録票のご送付（' + data.company + '）';
        var body =
          data.contactName + ' 様\n\n' +
          '平素よりお世話になっております。\n' +
          '公益社団法人さくら研修機構の' + staff + 'でございます。\n\n' +
          visitDate + 'に実施いたしました訪問指導の記録票を添付にてお送りいたします。\n' +
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
          body: body,
          attachments: [pdfBlob]
        });
        mailResult = 'sent';
      } catch (mailErr) {
        mailResult = 'error: ' + mailErr.toString();
      }
    } else {
      mailResult = 'skipped (no email)';
    }

    // ── カレンダー登録 ──
    var calResult = '';
    try {
      calResult = createCalendarEvent(data);
    } catch(calErr) {
      calResult = 'error: ' + calErr.toString();
    }

    return buildResponse({ status: 'ok', fileId: pdfFile.getId(), fileName: pdfName, mail: mailResult, calendar: calResult });

  } catch (err) {
    return buildResponse({ status: 'error', message: err.toString() });
  }
}

// ── カレンダー予定登録 ──
function createCalendarEvent(data) {
  var nextVisit = data.nextVisit ? data.nextVisit.trim() : '';
  if (!nextVisit || nextVisit.replace(/\s/g,'') === '') return 'skipped (no date)';

  // "2026-07-15 10:00" 形式をパース
  var parts = nextVisit.split(' ');
  var dateParts = parts[0].split('-');
  var timeParts = (parts[1] || '10:00').split(':');

  var startDate = new Date(
    parseInt(dateParts[0]),
    parseInt(dateParts[1]) - 1,
    parseInt(dateParts[2]),
    parseInt(timeParts[0]),
    parseInt(timeParts[1])
  );
  var endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1時間

  // スタッフ名→メールアドレス対応表
  var staffEmailMap = {
    '宮武　薫':   'miyatake@sakura-training.jp',
    '松島　妙子': 'matsushima@sakura-training.jp'
  };

  var staffEmail = staffEmailMap[data.staff] || '';
  var title = '訪問指導：' + (data.company || '');
  var description =
    '【訪問先】' + (data.company || '') + '\n' +
    '【担当者】' + (data.staff || '') + '\n' +
    '【連絡先】' + (data.contactName || '') + '　' + (data.contactEmail || '');

  // 担当者のカレンダーに直接登録
  var calendar = staffEmail
    ? CalendarApp.getCalendarById(staffEmail)
    : CalendarApp.getDefaultCalendar();
  if (!calendar) calendar = CalendarApp.getDefaultCalendar();

  calendar.createEvent(title, startDate, endDate, {
    description: description
  });

  return 'created: ' + (staffEmail || 'default');
}

// ── PDF生成（Google Docを一時作成してPDF化） ──
function createVisitPdf(data) {
  var visitDate = formatDateJp(data.savedAt);
  var nextVisit = data.nextVisit ? data.nextVisit.trim() : '未設定';

  var doc  = DocumentApp.create('__tmp_homonkiroku_' + Date.now());
  var body = doc.getBody();
  var BOLD = DocumentApp.Attribute.BOLD;
  var SIZE = DocumentApp.Attribute.FONT_SIZE;
  var CENTER = DocumentApp.HorizontalAlignment.CENTER;

  // ── タイトル ──
  var titleP = body.appendParagraph('訪問指導記録票');
  titleP.setHeading(DocumentApp.ParagraphHeading.HEADING1);
  titleP.setAlignment(CENTER);

  var orgP = body.appendParagraph('公益社団法人さくら研修機構　/　さくら中央法務事務所');
  orgP.setAlignment(CENTER);
  orgP.setAttributes({[SIZE]: 10});

  body.appendParagraph('');

  // ── 基本情報 ──
  addSectionTitle(body, '■ 基本情報');
  body.appendTable([
    ['訪問日時',     visitDate],
    ['企業名',       data.company || ''],
    ['訪問担当者',   data.staff || ''],
    ['次回訪問予定', nextVisit]
  ]);

  body.appendParagraph('');

  // ── 面談 ──
  addSectionTitle(body, '■ 面談実施状況');
  body.appendParagraph('面談の有無：' + (data.interviewMode || 'なし'));

  if (data.trainees && data.trainees.length > 0) {
    var rows = [['氏名', '在留資格', '国籍', '性別', '生年月日', '面談内容']];
    data.trainees.forEach(function(t) {
      var items = (t.interviewItems || []).join('、');
      if (t.otherText) items += (items ? '\n' : '') + t.otherText;
      rows.push([t.name||'', t.grade||'', t.nationality||'', t.gender||'', t.birthDate||'', items]);
    });
    body.appendTable(rows);
  }

  body.appendParagraph('');

  // ── チェックリスト ──
  addSectionTitle(body, '■ 実地確認チェックリスト');
  if (data.checks && data.checks.length > 0) {
    data.checks.forEach(function(c) { body.appendParagraph('☑ ' + c); });
  } else {
    body.appendParagraph('（チェック項目なし）');
  }

  body.appendParagraph('');

  // ── 総務部要望事項 ──
  addSectionTitle(body, '■ さくら研修機構 総務部からの要望事項');
  body.appendParagraph(data.somuNote || '（記載なし）');

  body.appendParagraph('');

  // ── 報告事項 ──
  addSectionTitle(body, '■ 受入企業さま責任者・指導者からのご報告事項');
  body.appendParagraph(data.reportNote || '（記載なし）');

  body.appendParagraph('');

  // ── 総合所見 ──
  addSectionTitle(body, '■ 訪問担当者の総合所見');
  body.appendParagraph(data.sokenText || '（記載なし）');

  body.appendParagraph('');

  // ── 署名 ──
  addSectionTitle(body, '■ 訪問担当者署名');
  if (data.signatureImage && data.signatureImage.indexOf('data:image') === 0) {
    try {
      var base64 = data.signatureImage.split(',')[1];
      var imgBlob = Utilities.newBlob(Utilities.base64Decode(base64), 'image/png', 'sig.png');
      var sigPara = body.appendParagraph('');
      sigPara.appendInlineImage(imgBlob).setWidth(200).setHeight(80);
    } catch(se) {
      body.appendParagraph('（署名あり）');
    }
  } else {
    body.appendParagraph('（署名なし）');
  }

  body.appendParagraph('');
  var footP = body.appendParagraph('記録日時：' + visitDate + '　担当：' + (data.staff || ''));
  footP.setAlignment(CENTER);
  footP.setAttributes({[SIZE]: 9});

  doc.saveAndClose();

  var pdf = DriveApp.getFileById(doc.getId()).getAs('application/pdf');
  DriveApp.getFileById(doc.getId()).setTrashed(true);

  return pdf;
}

function addSectionTitle(body, title) {
  var p = body.appendParagraph(title);
  p.setAttributes({
    [DocumentApp.Attribute.BOLD]: true,
    [DocumentApp.Attribute.FONT_SIZE]: 11
  });
  return p;
}

function doGet(e) {
  var action = e.parameter.action;

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
  var root = DriveApp.getFolderById(ROOT_FOLDER_ID);
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
