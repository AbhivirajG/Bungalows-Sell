// ============================================================
//  The Bungalows — Visitor Management Portal
//  Google Apps Script — Supabase Webhook → Google Sheets
//
//  Deploy as: Web App → Execute as Me → Anyone can access
//  Paste the Web App URL into Supabase: Database → Webhooks
//  Table: registrations | Event: INSERT
// ============================================================

var SHEET_ID  = '1_Ks979C9N94S-cCDlo-B7hnFj0WH8tgfT_ojCtgU_co';
var RESEND_KEY = 'Bearer re_FoA5fNuo_3gnPee6Xsm4rgpcSXKeexBne';
var ALERT_EMAIL = 'enquiry.thebungalows@ecity.esselgroup.com';
var FROM_EMAIL  = 'sales@the-bungalows.com';

// ── Label maps (keep in sync with index.html) ──────────────
var CONFIG_LABELS = {
  '4bhk': '4 BHK',
  '5bhk_traditional': '5 BHK Traditional',
  '5bhk_modern': '5 BHK Modern',
  '6bhk': '6 BHK'
};
var ENQUIRY_LABELS = {
  'direct': 'Direct / Walk-In',
  'social_media': 'Social Media',
  'google_ads': 'Google Ads',
  'youtube': 'YouTube',
  'newspaper': 'Newspaper / Print',
  'hoarding': 'Hoarding / Billboard',
  'reference': 'Reference / Word of Mouth',
  'others': 'Others'
};

// ── Helpers ────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return ('0' + d.getDate()).slice(-2) + '-' + months[d.getMonth()] + '-' + d.getFullYear();
}

function formatConfig(cfg) {
  if (!cfg) return '';
  var arr = Array.isArray(cfg) ? cfg : [cfg];
  return arr.map(function(v){ return CONFIG_LABELS[v] || v; }).join(' | ');
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fmtEnquiry(src) {
  return ENQUIRY_LABELS[src] || src || '';
}

// ── Main webhook handler ───────────────────────────────────
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var record  = payload.record;

    // The full registration object lives in the `data` JSONB column
    var d = record.data;
    if (typeof d === 'string') d = JSON.parse(d);

    Logger.log('Received: ' + record.type + ' — ' + (d.name || d.client_name));

    var ss   = SpreadsheetApp.openById(SHEET_ID);
    var type = record.type; // 'client' or 'channel_partner'

    var visitDate  = formatDate(d.timestamp || record.timestamp);
    var config     = formatConfig(d.configuration);
    var intFor     = capitalize(d.interestedFor || '');

    // ── 1. CLIENT MIS tab (columns A–R) ───────────────────
    var misSh = ss.getSheetByName('Client MIS');
    if (misSh) {
      var misRow;
      if (type === 'channel_partner') {
        misRow = [
          visitDate,                    // A  Date of Visit
          'CP Referral',                // B  Visit Type
          'Through CP',                 // C  Source
          d.client_name  || '',         // D  Client Name
          '',                           // E  Client Contact No. (not collected)
          d.phone        || '',         // F  CP Contact No.
          '',                           // G  Client Email (not collected)
          d.cp_email     || '',         // H  CP Email
          d.company      || '',         // I  CP / Broker Firm
          d.name         || '',         // J  CP Contact Person
          d.line_of_work || '',         // K  Line of Work
          config,                       // L  Configuration
          intFor,                       // M  Interested For
          '', '', '', '', ''            // N–R  (filled manually)
        ];
      } else {
        var visitType = capitalize(d.visitType || 'new');
        misRow = [
          visitDate,                              // A  Date of Visit
          visitType,                              // B  Visit Type
          'Direct',                               // C  Source
          d.name         || '',                   // D  Client Name
          d.phone        || '',                   // E  Client Contact No.
          '',                                     // F  CP Contact No.
          d.email        || '',                   // G  Client Email
          '', '', '',                             // H–J  CP fields (blank for direct)
          d.line_of_work || '',                   // K  Line of Work
          config,                                 // L  Configuration
          intFor,                                 // M  Interested For
          '', '', '', '', ''                      // N–R  (filled manually)
        ];
      }
      misSh.appendRow(misRow);
      Logger.log('Client MIS updated');
    }

    // ── 2. CLIENT PERSONAL INFORMATION tab (columns A–E) ──
    var piSh = ss.getSheetByName('Client Personal Information');
    if (piSh) {
      var piRow;
      if (type === 'channel_partner') {
        piRow = [
          d.client_name  || '',            // A  Client Name
          'Through Channel Partner',        // B  Source
          d.line_of_work || '',            // C  Line of Work
          d.cp_region    || '',            // D  Location / Region
          'Through Channel Partner'         // E  How did you hear
        ];
      } else {
        piRow = [
          d.name         || '',            // A  Client Name
          'Direct',                         // B  Source
          d.line_of_work || '',            // C  Line of Work
          d.region       || '',            // D  Location / Region
          fmtEnquiry(d.enquirySource)      // E  How did you hear
        ];
      }
      piSh.appendRow(piRow);
      Logger.log('Client Personal Information updated');
    }

    // ── 3. FOLLOW-UP tab — seed client name only ──────────
    var fuSh = ss.getSheetByName('Follow-up');
    if (fuSh) {
      var clientName = type === 'channel_partner' ? (d.client_name || '') : (d.name || '');
      fuSh.appendRow([clientName]);
      Logger.log('Follow-up seeded');
    }

    // ── 4. Alert email to team ────────────────────────────
    var displayName  = type === 'channel_partner' ? (d.client_name || d.name) : d.name;
    var displayPhone = type === 'channel_partner' ? (d.phone + ' (CP)') : d.phone;
    var sourceLabel  = type === 'channel_partner'
      ? 'Through CP — ' + (d.name || '') + ', ' + (d.company || '')
      : 'Direct — ' + fmtEnquiry(d.enquirySource);

    var alertHtml =
      '<div style="font-family:Georgia,serif;color:#1a1a1a;max-width:600px;padding:40px 20px">' +
      '<h2 style="font-weight:normal;letter-spacing:1px">New visitor registered — The Bungalows</h2>' +
      '<p><strong>Name:</strong> ' + (displayName || '—') + '</p>' +
      '<p><strong>Phone:</strong> ' + (displayPhone || '—') + '</p>' +
      (d.email ? '<p><strong>Email:</strong> ' + d.email + '</p>' : '') +
      '<p><strong>Source:</strong> ' + sourceLabel + '</p>' +
      '<p><strong>Visit Type:</strong> ' + capitalize(d.visitType || 'new') + '</p>' +
      '<p><strong>Configuration:</strong> ' + (config || '—') + '</p>' +
      '<p><strong>Interested For:</strong> ' + (intFor || '—') + '</p>' +
      (d.line_of_work ? '<p><strong>Line of Work:</strong> ' + d.line_of_work + '</p>' : '') +
      '<p><strong>Region:</strong> ' + (d.region || d.cp_region || '—') + '</p>' +
      '<br><p style="color:#888;font-size:12px">Registration ID: ' + (d.id || record.id) + '</p>' +
      '</div>';

    UrlFetchApp.fetch('https://api.resend.com/emails', {
      method: 'post',
      headers: { 'Authorization': RESEND_KEY, 'Content-Type': 'application/json' },
      payload: JSON.stringify({
        from: FROM_EMAIL,
        to: ALERT_EMAIL,
        subject: '🏠 New visitor: ' + (displayName || 'Unknown') + ' (' + capitalize(d.visitType || 'new') + ')',
        html: alertHtml
      })
    });
    Logger.log('Alert email sent');

  } catch(err) {
    Logger.log('ERROR: ' + err.message);
  }

  return ContentService.createTextOutput('ok');
}

// ── Test function — run manually from script editor ────────
function testPost() {
  var fakeEvent = {
    postData: {
      contents: JSON.stringify({
        type: 'INSERT',
        record: {
          id: 'TB-TEST-001',
          type: 'client',
          name: 'Test User',
          phone: '9876543210',
          created_at: Date.now(),
          timestamp: new Date().toISOString(),
          data: {
            id: 'TB-TEST-001',
            type: 'client',
            name: 'Test User',
            email: 'test@example.com',
            phone: '9876543210',
            region: 'Satellite',
            line_of_work: 'Finance',
            enquirySource: 'google_ads',
            configuration: ['4bhk', '5bhk_modern'],
            interestedFor: 'sale',
            visitType: 'new',
            timestamp: new Date().toISOString()
          }
        }
      })
    }
  };
  doPost(fakeEvent);
}
