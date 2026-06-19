// ============================================================
//  The Bungalows — Visitor Management Portal
//  Google Apps Script — Supabase Webhook → Google Sheets
//
//  Deploy as: Web App → Execute as Me → Anyone can access
//  Paste the Web App URL into Supabase: Database → Webhooks
//  Table: registrations | Event: INSERT
// ============================================================

var SHEET_ID = '1_Ks979C9N94S-cCDlo-B7hnFj0WH8tgfT_ojCtgU_co';

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

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var record  = payload.record;

    var d = record.data;
    if (typeof d === 'string') d = JSON.parse(d);

    var ss   = SpreadsheetApp.openById(SHEET_ID);
    var type = record.type;

    var visitDate = formatDate(d.timestamp || record.timestamp);
    var config    = formatConfig(d.configuration);
    var intFor    = capitalize(d.interestedFor || '');

    // 1. CLIENT MIS tab (columns A–R)
    var misSh = ss.getSheetByName('Client MIS');
    if (misSh) {
      var misRow;
      if (type === 'channel_partner') {
        misRow = [
          visitDate,             // A  Date of Visit
          'CP Referral',         // B  Visit Type
          'Through CP',          // C  Source
          d.client_name  || '',  // D  Client Name
          '',                    // E  Client Contact No.
          d.phone        || '',  // F  CP Contact No.
          '',                    // G  Client Email
          d.cp_email     || '',  // H  CP Email
          d.company      || '',  // I  CP / Broker Firm
          d.name         || '',  // J  CP Contact Person
          d.line_of_work || '',  // K  Line of Work
          config,                // L  Configuration
          intFor,                // M  Interested For
          '', '', '', '', ''     // N–R  (fill manually)
        ];
      } else {
        misRow = [
          visitDate,                         // A  Date of Visit
          capitalize(d.visitType || 'new'),  // B  Visit Type
          'Direct',                          // C  Source
          d.name         || '',              // D  Client Name
          d.phone        || '',              // E  Client Contact No.
          '',                                // F  CP Contact No.
          d.email        || '',              // G  Client Email
          '', '', '',                        // H–J  CP fields (blank)
          d.line_of_work || '',              // K  Line of Work
          config,                            // L  Configuration
          intFor,                            // M  Interested For
          '', '', '', '', ''                 // N–R  (fill manually)
        ];
      }
      misSh.appendRow(misRow);
    }

    // 2. CLIENT PERSONAL INFORMATION tab (columns A–E)
    var piSh = ss.getSheetByName('Client Personal Information');
    if (piSh) {
      var piRow;
      if (type === 'channel_partner') {
        piRow = [
          d.client_name  || '',
          'Through Channel Partner',
          d.line_of_work || '',
          d.cp_region    || '',
          'Through Channel Partner'
        ];
      } else {
        piRow = [
          d.name         || '',
          'Direct',
          d.line_of_work || '',
          d.region       || '',
          ENQUIRY_LABELS[d.enquirySource] || d.enquirySource || ''
        ];
      }
      piSh.appendRow(piRow);
    }

} catch(err) {
    Logger.log('ERROR: ' + err.message);
  }

  return ContentService.createTextOutput('ok');
}

// Run this manually from the script editor to test before going live
function testPost() {
  var fakeEvent = {
    postData: {
      contents: JSON.stringify({
        type: 'INSERT',
        record: {
          id: 'TB-TEST-001',
          type: 'client',
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
