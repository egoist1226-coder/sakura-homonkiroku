/**
 * さくら研修機構 訪問指導記録票 - Google Drive 保存 + PDF生成 + メール送信
 */

var ROOT_FOLDER_ID = '1GjarIC37LEN-kcRoxBiV3MELg1dWlrt-'; // さくら研修機構_訪問記録（egoist1226所有・共有フォルダ）

// ── 担当者権限設定（メールアドレス → role: 'admin' | 'staff'） ──
var STAFF_CONFIG = {
  'miyatake@sakura-training.jp':   { name: '宮武　薫',  role: 'admin' },
  'matsushima@sakura-training.jp': { name: '松島　妙子', role: 'admin' },
  'honbu.soumu@sakura-training.jp': { name: '総務部',    role: 'admin' },
  'philippine@sakura-training.jp': { name: '藤野　伸恵', role: 'staff', companies: ['tango_fukushikai', '社会福祉法人松寿苑'] }
};
var DB_FILE_NAME = 'sakura_db.json';

// さくら研修機構ロゴ（PDFヘッダー埋め込み用・index.htmlのログイン画面と同一データ）
var LOGO_BASE64 = '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';
var SYNC_SECRET  = 'sakura2026sync'; // sync_homonkiroku.py と共有

function doOptions(e) {
  return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // ── DB取得（Googleログイン認証・POSTで受け取る） ──
if (data.type === 'getDb') {
  var email = verifyGoogleToken(data.token);
  if (!email) return buildResponse({ status: 'error', code: 'INVALID_TOKEN' });
  var staff = STAFF_CONFIG[email];
  if (!staff) return buildResponse({ status: 'error', code: 'FORBIDDEN', email: email });
  var db = getStoredDb();
  if (!db) return buildResponse({ status: 'error', code: 'DB_NOT_FOUND' });
  return buildResponse({
    status: 'ok',
    db: filterDbForStaff(db, staff),
    user: { email: email, name: staff.name, role: staff.role }
  });
}
    // ── DB同期（sync_homonkiroku.py から呼ばれる） ──
    if (data.type === 'syncDb') {
      if (data.secret !== SYNC_SECRET) return buildResponse({ status: 'error', message: 'Unauthorized' });
      storeDb(data.db);
      return buildResponse({ status: 'ok', message: 'DB同期完了' });
    }

    // ── 下書き保存（総務部用 / 訪問担当者用） ──
    if (data.type === 'draft' || data.type === 'draft_staff') {
      var drafts = getDraftsFolder();
      var draftKey = data.type === 'draft_staff' ? 'staff_' + data.companyId : data.companyId;
      var draftName = '下書き_' + draftKey + '.json';
      var existing = drafts.getFilesByName(draftName);
      if (existing.hasNext()) {
        var currentFile = existing.next();
        // 楽観的ロック：読み込み時のbase値と現在のファイルを照合
        if (data.baseModified !== undefined && data.baseModified !== null) {
          var currentModified = currentFile.getLastUpdated().getTime();
          var currentSize     = currentFile.getSize();
          if (currentModified !== data.baseModified || currentSize !== data.baseSize) {
            return buildResponse({
              status: 'conflict',
              currentModified: currentModified,
              currentSize: currentSize,
              message: '他のユーザーが更新しています'
            });
          }
        }
        currentFile.setTrashed(true);
      }
      var saveData = JSON.parse(JSON.stringify(data));
      delete saveData.baseModified;
      delete saveData.baseSize;
      var blob = Utilities.newBlob(JSON.stringify(saveData, null, 2), 'application/json', draftName);
      var newFile = drafts.createFile(blob);
      return buildResponse({
        status: 'ok',
        message: '下書きを保存しました',
        newModified: newFile.getLastUpdated().getTime(),
        newSize: newFile.getSize()
      });
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

    // ── 下書き削除（総務部用・訪問担当者用の両方） ──
    if (data.companyId) {
      try {
        var drafts2 = getDraftsFolder();
        // 総務部用下書き
        var draftFiles = drafts2.getFilesByName('下書き_' + data.companyId + '.json');
        if (draftFiles.hasNext()) draftFiles.next().setTrashed(true);
        // 訪問担当者用下書き
        var staffDraftFiles = drafts2.getFilesByName('下書き_staff_' + data.companyId + '.json');
        if (staffDraftFiles.hasNext()) staffDraftFiles.next().setTrashed(true);
      } catch(de) {}
    }

    // ── メール送信（PDF添付） ──
    var mailResult = '';
    if (data.contactEmail && data.contactEmail.indexOf('@') > -1) {
      try {
        var visitDate = formatDateJp(data.savedAt);
        var nextVisit = data.nextVisit ? data.nextVisit.trim() : '未設定';
        var staff     = data.staff || 'さくら研修機構';

        // ── CC担当者（DB登録済み担当者2人目以降＋手動追加分）の厳密なNullチェック ──
        // 氏名・メールアドレスの両方が入力されている場合のみ有効なCC対象として扱う
        var ccList = [];
        (data.ccList || []).forEach(function(c) {
          var n = ((c && c.name)  || '').trim();
          var e = ((c && c.email) || '').trim();
          if (n && e && e.indexOf('@') > -1) ccList.push({ name: n, email: e });
        });

        // ── CC宛名テキストの生成（0名〜N名に対応、不自然な空白・カンマを出さない） ──
        var ccSalutation = '';
        if (ccList.length > 0) {
          var ccNames = ccList.map(function(c) { return c.name + 'さま'; }).join('、');
          ccSalutation = '（ＣＣ：' + ccNames + '）\n';
        }

        var subject = '訪問指導記録票のご送付（' + data.company + '）';
        var body =
          data.contactName + ' 様\n' +
          ccSalutation + '\n' +
          '平素よりお世話になっております。\n' +
          '公益社団法人さくら研修機構の' + staff + 'でございます。\n\n' +
          visitDate + 'に実施いたしました訪問指導の記録票を添付にてお送りいたします。\n' +
          '宜しくご査収・ご確認のほどお願いいたします。\n\n' +
          '【訪問日時】' + visitDate + '\n' +
          '【次回訪問予定】' + nextVisit + '\n\n' +
          '---\n' +
          '公益社団法人さくら研修機構\n' +
          staff;

        var mailOptions = {
          to: data.contactEmail,
          bcc: 'miyatake@sakura-training.jp,office@sakura-training.jp',
          name: 'さくら研修機構総務部',
          replyTo: 'honbu.soumu@sakura-training.jp',
          subject: subject,
          body: body,
          attachments: [pdfBlob]
        };
        if (ccList.length > 0) {
          mailOptions.cc = ccList.map(function(c) { return c.email; }).join(',');
        }

        MailApp.sendEmail(mailOptions);
        mailResult = 'sent' + (ccList.length > 0 ? ' (cc:' + ccList.length + ')' : '');
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

    // ── クロスデバイスフォームクリア用：保存イベント記録 ──
    try { recordSaveEvent(data.companyId || ''); } catch(re) {}

    return buildResponse({ status: 'ok', fileId: pdfFile.getId(), fileName: pdfName, mail: mailResult, calendar: calResult });

  } catch (err) {
    return buildResponse({ status: 'error', message: err.toString() });
  }
}

// ── カレンダー予定登録 ──
function createCalendarEvent(data) {
  var nextVisit = data.nextVisit ? data.nextVisit.trim() : '';
  if (!nextVisit || nextVisit.replace(/\s/g,'') === '') return 'skipped (no date)';
  if (nextVisit === '未定') return 'skipped (undecided)';

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
  var title = (data.company || '') + 'さま　往訪';
  var description =
    '【訪問先】' + (data.company || '') + '\n' +
    '【担当者】' + (data.staff || '') + '\n' +
    '【連絡先】' + (data.contactName || '') + '　' + (data.contactEmail || '');

  // 宮武薫のみカレンダー登録（共有済みのため直接登録可）
  if (data.staff === '宮武　薫' && staffEmail) {
    var cal = CalendarApp.getCalendarById(staffEmail);
    if (!cal) cal = CalendarApp.getDefaultCalendar();
    cal.createEvent(title, startDate, endDate, { description: description });
    return 'created on miyatake calendar';
  }

  return 'skipped (not applicable)';
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

  // ── タイトル（ロゴ＋見出しを横並びに配置したヘッダー） ──
  var logoInserted = false;
  try {
    var headerTable = body.appendTable([['', '']]);
    headerTable.setBorderWidth(0);
    var logoCell  = headerTable.getCell(0, 0);
    var titleCell = headerTable.getCell(0, 1);
    logoCell.setWidth(60);

    var logoBlob = Utilities.newBlob(Utilities.base64Decode(LOGO_BASE64), 'image/png', 'logo.png');
    var logoImg = logoCell.appendImage(logoBlob);
    logoImg.setWidth(50); logoImg.setHeight(50);
    logoCell.getChild(0).asParagraph().removeFromParent(); // セル既定の空段落を除去

    var titleP = titleCell.appendParagraph('訪問指導記録票');
    titleP.setAttributes({[BOLD]: true, [SIZE]: 18, [DocumentApp.Attribute.FOREGROUND_COLOR]: '#000000', [DocumentApp.Attribute.UNDERLINE]: false});
    var orgP = titleCell.appendParagraph('公益社団法人さくら研修機構　/　さくら中央法務事務所');
    orgP.setAttributes({[SIZE]: 10, [DocumentApp.Attribute.FOREGROUND_COLOR]: '#000000', [DocumentApp.Attribute.UNDERLINE]: false, [BOLD]: false});
    titleCell.getChild(0).asParagraph().removeFromParent(); // セル既定の空段落を除去
    logoInserted = true;
  } catch (logoErr) {
    // ロゴ埋め込みに失敗した場合は従来のテキストのみタイトルにフォールバック
  }

  if (!logoInserted) {
    var titleP2 = body.appendParagraph('訪問指導記録票');
    titleP2.setHeading(DocumentApp.ParagraphHeading.HEADING1);
    titleP2.setAlignment(CENTER);
    titleP2.setAttributes({[DocumentApp.Attribute.FOREGROUND_COLOR]: '#000000', [DocumentApp.Attribute.UNDERLINE]: false});
    var orgP2 = body.appendParagraph('公益社団法人さくら研修機構　/　さくら中央法務事務所');
    orgP2.setAlignment(CENTER);
    orgP2.setAttributes({[SIZE]: 10, [DocumentApp.Attribute.FOREGROUND_COLOR]: '#000000', [DocumentApp.Attribute.UNDERLINE]: false, [BOLD]: false});
  }

  addBodyText(body, '');

  // ── 基本情報 ──
  addSectionTitle(body, '■ 基本情報');
  var infoTable = body.appendTable([
    ['訪問日時',     visitDate],
    ['企業名',       (data.company || '') + 'さま'],
    ['訪問担当者',   data.staff || ''],
    ['次回訪問予定', nextVisit]
  ]);
  resetTableTextStyle(infoTable);

  addBodyText(body, '');

  // ── 面談 ──
  addSectionTitle(body, '■ 面談実施状況');
  addBodyText(body, '面談の有無：' + (data.interviewMode || 'なし'));

  if (data.trainees && data.trainees.length > 0) {
    var rows = [['氏名', '在留資格', '国籍', '性別', '生年月日']];
    data.trainees.forEach(function(t) {
      rows.push([t.name||'', t.grade||'', t.nationality||'', t.gender||'', t.birthDate||'']);
    });
    var traineeTable = body.appendTable(rows);
    resetTableTextStyle(traineeTable);
    // 列幅最適化：性別は文字が収まる最小幅に縮小、生年月日は折返しが起きない幅を確保、
    // その分氏名を最大限広く取る（単位はポイント／合計約450pt=A4想定の本文幅に収まる）
    var traineeColWidths = [150, 85, 65, 32, 118]; // 氏名/在留資格/国籍/性別/生年月日
    traineeColWidths.forEach(function(w, i) { traineeTable.setColumnWidth(i, w); });
  }

  addBodyText(body, '');

  // ── チェックリスト ──
  addSectionTitle(body, '■ 実地確認チェックリスト');
  if (data.checks && data.checks.length > 0) {
    data.checks.forEach(function(c) { addBodyText(body, '☑ ' + c); });
  } else {
    addBodyText(body, '（チェック項目なし）');
  }

  addBodyText(body, '');

  // ── 総務部要望事項 ──
  addSectionTitle(body, '■ さくら研修機構 総務部からの要望事項');
  addBodyText(body, data.somuNote || '（記載なし）');

  addBodyText(body, '');

  // ── 報告事項 ──
  addSectionTitle(body, '■ 受入企業さま責任者・指導者からのご報告事項');
  addBodyText(body, data.reportNote || '（記載なし）');

  addBodyText(body, '');

  // ── 総合所見 ──
  addSectionTitle(body, '■ 訪問担当者の総合所見');
  addBodyText(body, data.sokenText || '（記載なし）');

  addBodyText(body, '');

  // ── 添付写真 ──
  addSectionTitle(body, '■ 添付写真');
  if (data.photos && data.photos.length > 0) {
    var PER_ROW = 3;   // 1行あたりの枚数（横並びグリッド）
    var THUMB_W = 150; // サムネイル幅(px)
    var photoPara = addBodyText(body, '');
    var pcount = 0;
    data.photos.forEach(function(dataUrl) {
      if (!dataUrl || dataUrl.indexOf('data:image') !== 0) return;
      try {
        var parts = dataUrl.split(',');
        var mime  = 'image/png';
        var mm    = parts[0].match(/data:([^;]+)/);
        if (mm) mime = mm[1];
        var pblob = Utilities.newBlob(Utilities.base64Decode(parts[1]), mime, 'photo');
        // PER_ROW枚ごとに改段落して横並びグリッドにする
        if (pcount > 0 && pcount % PER_ROW === 0) {
          photoPara = addBodyText(body, '');
        }
        var pimg = photoPara.appendInlineImage(pblob);
        var ow = pimg.getWidth(), oh = pimg.getHeight();
        pimg.setWidth(THUMB_W);
        if (ow > 0) pimg.setHeight(Math.round(oh * THUMB_W / ow)); // 縦横比維持
        photoPara.appendText('  '); // 画像間の余白
        pcount++;
      } catch(pe) {}
    });
    if (pcount === 0) addBodyText(body, '（写真なし）');
  } else {
    addBodyText(body, '（写真なし）');
  }

  addBodyText(body, '');

  // ── 署名 ──
  addSectionTitle(body, '■ 受入企業ご担当者さま、または訪問担当者署名');
  if (data.signatureImage && data.signatureImage.indexOf('data:image') === 0) {
    try {
      var base64 = data.signatureImage.split(',')[1];
      var imgBlob = Utilities.newBlob(Utilities.base64Decode(base64), 'image/png', 'sig.png');
      var sigPara = addBodyText(body, '');
      sigPara.appendInlineImage(imgBlob).setWidth(200).setHeight(80);
    } catch(se) {
      addBodyText(body, '（署名あり）');
    }
  } else {
    addBodyText(body, '（署名なし）');
  }

  addBodyText(body, '');
  var footP = body.appendParagraph('記録日時：' + visitDate + '　担当：' + (data.staff || ''));
  footP.setAlignment(CENTER);
  footP.setAttributes({
    [SIZE]: 9,
    [DocumentApp.Attribute.FOREGROUND_COLOR]: '#000000',
    [DocumentApp.Attribute.UNDERLINE]: false,
    [DocumentApp.Attribute.BOLD]: false
  });

  doc.saveAndClose();

  var pdf = DriveApp.getFileById(doc.getId()).getAs('application/pdf');
  DriveApp.getFileById(doc.getId()).setTrashed(true);

  return pdf;
}

function addSectionTitle(body, title) {
  var p = body.appendParagraph(title);
  p.setAttributes({
    [DocumentApp.Attribute.BOLD]: true,
    [DocumentApp.Attribute.FONT_SIZE]: 11,
    [DocumentApp.Attribute.UNDERLINE]: true,
    [DocumentApp.Attribute.FOREGROUND_COLOR]: '#c0506e'
  });
  p.setSpacingAfter(10); // 見出し直下の本文との間に約1行分の余白を確保
  return p;
}

// 本文用の段落を追加する共通ヘルパー。
// DocumentAppは新規段落の文字スタイルを直前の段落の末尾スタイルから引き継ぐ仕様のため、
// 見出し(addSectionTitle)の装飾（下線・アクセント色）が本文へ連鎖して漏れてしまう。
// これを断ち切るため、本文として追加するすべての段落にここで明示的に
// 黒色・下線なし・非ボールドを強制する。
function addBodyText(container, text) {
  var p = container.appendParagraph(text);
  p.setAttributes({
    [DocumentApp.Attribute.FOREGROUND_COLOR]: '#000000',
    [DocumentApp.Attribute.UNDERLINE]: false,
    [DocumentApp.Attribute.BOLD]: false
  });
  return p;
}

// テーブル内の全セル・全段落にも黒色・下線なしを強制する（appendTable直後に呼ぶ）。
// DocumentAppは新規テーブルの既定文字スタイルも直前の段落から引き継ぐ場合があるため、
// 見出しの装飾がテーブル内に漏れるケースへの防御。
function resetTableTextStyle(table) {
  var attrs = {
    [DocumentApp.Attribute.FOREGROUND_COLOR]: '#000000',
    [DocumentApp.Attribute.UNDERLINE]: false
  };
  var numRows = table.getNumRows();
  for (var r = 0; r < numRows; r++) {
    var row = table.getRow(r);
    var numCells = row.getNumCells();
    for (var c = 0; c < numCells; c++) {
      var cell = row.getCell(c);
      var numChildren = cell.getNumChildren();
      for (var i = 0; i < numChildren; i++) {
        var child = cell.getChild(i);
        if (child.getType() === DocumentApp.ElementType.PARAGRAPH) {
          child.asParagraph().setAttributes(attrs);
        }
      }
    }
  }
}

function doGet(e) {
  var action = e.parameter.action;

  // ── クロスデバイスフォームクリア：保存イベント確認 ──
  if (action === 'checkSaveEvent') {
    var companyId = e.parameter.companyId;
    var since     = e.parameter.since;
    try {
      var root = DriveApp.getFolderById(ROOT_FOLDER_ID);
      var evFiles = root.getFilesByName('_save_events.json');
      if (!evFiles.hasNext()) return buildResponse({ status: 'ok', saved: false });
      var events = JSON.parse(evFiles.next().getBlob().getDataAsString());
      var savedAt = events[companyId];
      if (savedAt && savedAt > since) return buildResponse({ status: 'ok', saved: true, savedAt: savedAt });
      return buildResponse({ status: 'ok', saved: false });
    } catch(ex) { return buildResponse({ status: 'ok', saved: false }); }
  }

  // ── DB取得（Google認証後にフロントエンドから呼ばれる） ──
  if (action === 'getDb') {
    var token = e.parameter.token;
    var email = verifyGoogleToken(token);
    if (!email) return buildResponse({ status: 'error', code: 'INVALID_TOKEN' });
    var staff = STAFF_CONFIG[email];
    if (!staff) return buildResponse({ status: 'error', code: 'FORBIDDEN', email: email });
    var db = getStoredDb();
    if (!db) return buildResponse({ status: 'error', code: 'DB_NOT_FOUND' });
    return buildResponse({
      status: 'ok',
      db: filterDbForStaff(db, staff),
      user: { email: email, name: staff.name, role: staff.role }
    });
  }

  if (action === 'getDraft') {
    var companyId = e.parameter.companyId;
    try {
      var drafts = getDraftsFolder();
      var files = drafts.getFilesByName('下書き_' + companyId + '.json');
      if (files.hasNext()) {
        var f = files.next();
        var content = f.getBlob().getDataAsString();
        return buildResponse({
          status: 'ok',
          draft: JSON.parse(content),
          lastModified: f.getLastUpdated().getTime(),
          fileSize: f.getSize()
        });
      } else {
        return buildResponse({ status: 'not_found' });
      }
    } catch(err) {
      return buildResponse({ status: 'error', message: err.toString() });
    }
  }

  if (action === 'listPdfs') {
    var companyName = e.parameter.companyName;
    try {
      var root = DriveApp.getFolderById(ROOT_FOLDER_ID);
      var companyFolders = root.getFoldersByName(companyName);
      if (!companyFolders.hasNext()) return buildResponse({ status: 'ok', files: [] });
      var companyFolder = companyFolders.next();
      var result = [];
      var ymFolders = companyFolder.getFolders();
      while (ymFolders.hasNext()) {
        var ymFolder = ymFolders.next();
        var pdfs = ymFolder.getFilesByType('application/pdf');
        while (pdfs.hasNext()) {
          var f = pdfs.next();
          result.push({ id: f.getId(), name: f.getName(), date: f.getDateCreated().toISOString() });
        }
      }
      result.sort(function(a, b) { return b.date.localeCompare(a.date); });
      return buildResponse({ status: 'ok', files: result });
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

// ── クロスデバイス保存イベント記録 ──
function recordSaveEvent(companyId) {
  if (!companyId) return;
  var root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  var fname = '_save_events.json';
  var events = {};
  var existing = root.getFilesByName(fname);
  if (existing.hasNext()) {
    try { events = JSON.parse(existing.next().getBlob().getDataAsString()); } catch(e) {}
    var existing2 = root.getFilesByName(fname);
    if (existing2.hasNext()) existing2.next().setTrashed(true);
  }
  events[companyId] = new Date().toISOString();
  root.createFile(fname, JSON.stringify(events), 'application/json');
}

// ── 認証・DBヘルパー ──
function verifyGoogleToken(idToken) {
  if (!idToken) return null;
  try {
    var res = UrlFetchApp.fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + idToken,
      { muteHttpExceptions: true }
    );
    var code = res.getResponseCode();
    var body = res.getContentText();
    if (code !== 200) {
      Logger.log('tokeninfo error: ' + code + ' ' + body);
      return null;
    }
    var info = JSON.parse(body);
    return info.email || null;
  } catch(e) {
    Logger.log('verifyGoogleToken exception: ' + e.toString());
    return null;
  }
}
function getStoredDb() {
  try {
    var root = DriveApp.getFolderById(ROOT_FOLDER_ID);
    var files = root.getFilesByName(DB_FILE_NAME);
    if (!files.hasNext()) return null;
    return JSON.parse(files.next().getBlob().getDataAsString());
  } catch(e) { return null; }
}

function storeDb(db) {
  var root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  var existing = root.getFilesByName(DB_FILE_NAME);
  while (existing.hasNext()) existing.next().setTrashed(true);
  root.createFile(DB_FILE_NAME, JSON.stringify(db), 'application/json');
}

function filterDbForStaff(db, staff) {
  if (staff.role === 'admin') return db;
  // staffロールの場合は担当企業（staff.companies配列）のみ返す
  var allowedIds = staff.companies || [];
  return {
    companies: db.companies.filter(function(c) { return allowedIds.indexOf(c.id) !== -1; }),
    staff: db.staff
  };
}

function buildResponse(obj) {
  var output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
