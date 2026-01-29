/***************
 * EMS Resource Board - CAD Style v2.0
 *
 * NEW FEATURES:
 *  - Role-based auth (STA1-6, SUPV, MGR, TCRN, PLRN, IT) + initials
 *  - Messaging system (MSG, HTMSG, DEL MSG)
 *  - Smart incident linking (LINK command)
 *  - Enhanced commands (LUI, TRANSFER, CLOSE, RQ, INFO, STATUS, MASS)
 *  - Performance optimizations
 *  - Stale incident tracking
 ***************/

const CONFIG = {
  SPREADSHEET_ID: '', // bound to sheet => leave blank

  AUTH: {
    ROLES: ['STA1', 'STA2', 'STA3', 'STA4', 'STA5', 'STA6', 'SUPV1', 'SUPV2', 'MGR1', 'MGR2', 'EMS', 'TCRN', 'PLRN', 'IT', 'UNIT'],
    TOKEN_TTL_SECONDS: 12 * 60 * 60,
    IT_USERS: ['holdenc'] // Only these users can login as IT role
  },

  STALE_MINUTES: { 
    WARN: 10, 
    ALERT: 20, 
    CRITICAL: 30,
    INCIDENT_STALE: 30 // incidents with no updates
  },

  STATUSES: [
    { code: 'D',   label: 'PENDING DISPATCH' },
    { code: 'DE',  label: 'ENROUTE' },
    { code: 'OS',  label: 'ON SCENE / ARRIVED' },
    { code: 'F',   label: 'FOLLOW UP' },
    { code: 'FD',  label: 'FLAGGED DOWN' },
    { code: 'T',   label: 'TRANSPORTING' },
    { code: 'AV',  label: 'AVAILABLE' },
    { code: 'UV',  label: 'UNAVAILABLE' },
    { code: 'BRK', label: 'BREAK / LUNCH' },
    { code: 'OOS', label: 'OUT OF SERVICE' }
  ],

  AV_CLEARS_INCIDENT: true
};

const SHEETS = {
  UNITS: 'Units',
  AUDIT: 'Audit',
  INCIDENTS: 'Incidents',
  INCIDENT_AUDIT: 'IncidentAudit',
  DESTS: 'Destinations',
  META: 'Meta',
  MESSAGES: 'Messages',
  USERS: 'Users',
  SESSIONS: 'Sessions',
  ADDRESSES: 'Addresses'
};

function doGet(e) {
  // If action param exists, treat as API call from external frontend
  if (e && e.parameter && e.parameter.action) {
    const output = _handleApiRequest(e);
    return ContentService
      .createTextOutput(JSON.stringify(output))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // No action param — return simple landing page
  return HtmlService.createHtmlOutput(
    '<html><body style="font-family:monospace;background:#070a0f;color:#e0e0e0;padding:40px;">' +
    '<h1>SCMC HOSCAD/EMS TRACKING</h1>' +
    '<p>BACKEND API IS RUNNING.</p>' +
    '<p>ACCESS THE FRONTEND AT: <a href="https://holdenportal.com/tccad" style="color:#4fc3f7;">holdenportal.com/tccad</a></p>' +
    '</body></html>'
  ).setTitle('SCMC HOSCAD/EMS TRACKING')
   .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  // Handle POST requests as API calls
  const output = _handleApiRequest(e);
  return ContentService
    .createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Route external API requests to appropriate handler functions
 * This enables the frontend hosted at holdenportal.com/hoscad to call the backend
 */
function _handleApiRequest(e) {
  try {
    const action = e.parameter.action;
    const params = JSON.parse(e.parameter.params || '[]');

    switch(action) {
      // Authentication
      case 'init': return apiInit();
      case 'login': return apiLogin(...params);
      case 'logout': return apiLogout(...params);

      // State & Data
      case 'getState': return apiGetState(...params);
      case 'getMetrics': return apiGetMetrics(...params);
      case 'getSystemStatus': return apiGetSystemStatus(...params);

      // Unit Operations
      case 'upsertUnit': return apiUpsertUnit(...params);
      case 'logoffUnit': return apiLogoffUnit(...params);
      case 'ridoffUnit': return apiRidoffUnit(...params);
      case 'touchUnit': return apiTouchUnit(...params);
      case 'touchAllOS': return apiTouchAllOS(...params);
      case 'undoUnit': return apiUndoUnit(...params);
      case 'getUnitInfo': return apiGetUnitInfo(...params);
      case 'getUnitHistory': return apiGetUnitHistory(...params);
      case 'massDispatch': return apiMassDispatch(...params);

      // Incident Operations
      case 'createQueuedIncident': return apiCreateQueuedIncident(...params);
      case 'getIncident': return apiGetIncident(...params);
      case 'updateIncident': return apiUpdateIncident(...params);
      case 'appendIncidentNote': return apiAppendIncidentNote(...params);
      case 'touchIncident': return apiTouchIncident(...params);
      case 'linkUnits': return apiLinkUnits(...params);
      case 'transferIncident': return apiTransferIncident(...params);
      case 'closeIncident': return apiCloseIncident(...params);
      case 'reopenIncident': return apiReopenIncident(...params);

      // Messaging
      case 'sendMessage': return apiSendMessage(...params);
      case 'sendBroadcast': return apiSendBroadcast(...params);
      case 'getMessages': return apiGetMessages(...params);
      case 'readMessage': return apiReadMessage(...params);
      case 'deleteMessage': return apiDeleteMessage(...params);
      case 'deleteAllMessages': return apiDeleteAllMessages(...params);

      // Banners
      case 'setBanner': return apiSetBanner(...params);

      // User Management
      case 'newUser': return apiNewUser(...params);
      case 'delUser': return apiDelUser(...params);
      case 'listUsers': return apiListUsers(...params);
      case 'listUsersAdmin': return apiListUsersAdmin(...params);
      case 'changePassword': return apiChangePassword(...params);

      // Session Management
      case 'who': return apiWho(...params);
      case 'clearSessions': return apiClearSessions(...params);

      // Reports & Export
      case 'reportOOS': return apiReportOOS(...params);
      case 'exportAuditCsv': return apiExportAuditCsv(...params);

      // Search & Data Management
      case 'search': return apiSearch(...params);
      case 'clearData': return apiClearData(...params);

      // Addresses
      case 'getAddresses': return apiGetAddresses(...params);

      default:
        return { ok: false, error: 'Unknown action: ' + action };
    }
  } catch (err) {
    return { ok: false, error: err.message || 'Server error' };
  }
}

/** ====== Public API ====== */

function apiInit() {
  _ensureSheets_();
  return { ok: true, roles: CONFIG.AUTH.ROLES };
}

function apiLogin(role, username, password) {
  _ensureSheets_();

  const r = String(role || '').trim().toUpperCase();
  const u = String(username || '').trim().toLowerCase();
  const p = String(password || '').trim();

  if (!CONFIG.AUTH.ROLES.includes(r)) {
    return { ok: false, error: 'INVALID ROLE.' };
  }

  // IT role restricted to specific users
  if (r === 'IT' && !CONFIG.AUTH.IT_USERS.includes(u)) {
    return { ok: false, error: 'IT ROLE ACCESS DENIED.' };
  }

  // For UNIT role, username is the unit ID, no password required
  if (r === 'UNIT') {
    if (!u || u.length < 2) {
      return { ok: false, error: 'UNIT ID REQUIRED (E.G. EMS2121, CC1, WC1)' };
    }
    const token = Utilities.getUuid();
    const actor = `${r}/${u.toUpperCase()}`;
    
    CacheService.getScriptCache().put(
      `token:${token}`,
      JSON.stringify({ role: r, username: u, actor, ts: Date.now() }),
      CONFIG.AUTH.TOKEN_TTL_SECONDS
    );
    
    // Track session in Sessions sheet
    const ss = _ss_();
    const sessionsSheet = ss.getSheetByName(SHEETS.SESSIONS);
    sessionsSheet.appendRow([token, u.toUpperCase(), u.toUpperCase(), r, new Date(), new Date()]);

    return { ok: true, token, actor, serverTime: new Date().toISOString() };
  }

  // For dispatcher roles, validate username and password
  if (!u || u.length < 2) {
    return { ok: false, error: 'USERNAME REQUIRED' };
  }

  if (!p) {
    return { ok: false, error: 'PASSWORD REQUIRED' };
  }

  // Look up user in Users sheet
  const ss = _ss_();
  const usersSheet = ss.getSheetByName(SHEETS.USERS);
  const data = usersSheet.getDataRange().getValues();
  const headers = data[0].map(String);
  const idx = _indexMap_(headers);

  let userRow = null;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idx.username] || '').toLowerCase() === u) {
      userRow = data[i];
      break;
    }
  }

  if (!userRow) {
    return { ok: false, error: 'USERNAME NOT FOUND' };
  }

  // Check password
  if (String(userRow[idx.password] || '') !== p) {
    return { ok: false, error: 'INCORRECT PASSWORD' };
  }

  const firstName = String(userRow[idx.first_name] || '').toUpperCase();
  const lastName = String(userRow[idx.last_name] || '').toUpperCase();
  const fullName = `${firstName} ${lastName}`;

  const token = Utilities.getUuid();
  const actor = `${r}/${u.toUpperCase()}`;
  
  CacheService.getScriptCache().put(
    `token:${token}`,
    JSON.stringify({ role: r, username: u, actor, fullName, ts: Date.now() }),
    CONFIG.AUTH.TOKEN_TTL_SECONDS
  );
  
  // Track session in Sessions sheet
  const sessionsSheet = ss.getSheetByName(SHEETS.SESSIONS);
  sessionsSheet.appendRow([token, u, fullName, r, new Date(), new Date()]);

  return { ok: true, token, actor, serverTime: new Date().toISOString() };
}

function apiGetState(token) {
  const auth = _requireAuth_(token);
  const ss = _ss_();

  return {
    ok: true,
    serverTime: new Date().toISOString(),
    staleThresholds: CONFIG.STALE_MINUTES,
    statuses: CONFIG.STATUSES,
    units: _readUnits_(ss),
    incidents: _readIncidents_(ss),
    destinations: _readDestinations_(ss),
    metrics: _computeMetrics_(ss, 24),
    banners: _readBanner_(ss),
    messages: _readMessages_(ss, auth.role, auth.username),
    actor: auth.actor
  };
}

function apiUpsertUnit(token, unitId, patch, expectedUpdatedAt) {
  const auth = _requireAuth_(token);
  const ss = _ss_();

  unitId = String(unitId || '').trim().toUpperCase();
  if (!unitId) return { ok: false, error: 'MISSING UNIT.' };

  const nowIso = new Date().toISOString();

  const unitsSheet = ss.getSheetByName(SHEETS.UNITS);
  const uData = unitsSheet.getDataRange().getValues();
  const uHeaders = uData[0].map(String);
  const uIdx = _indexMap_(uHeaders);

  const rowIndex = _findRowBy_(uData, uIdx.unit_id, unitId);
  const unitBefore = rowIndex > 0 ? _rowToUnit_(uData[rowIndex], uIdx) : null;

  // Concurrency guard
  if (unitBefore && expectedUpdatedAt) {
    const currentUpdatedAt = unitBefore.updated_at || '';
    if (currentUpdatedAt !== expectedUpdatedAt) {
      return { ok: false, conflict: true, error: 'CONFLICT: UNIT UPDATED BY SOMEONE ELSE.', current: unitBefore };
    }
  }

  const base = unitBefore || {
    unit_id: unitId,
    display_name: unitId,
    type: '',
    active: true,
    status: 'AV',
    note: '',
    unit_info: '',
    incident: '',
    destination: '',
    updated_at: '',
    updated_by: '',
    fcm_token: ''
  };

  const next = Object.assign({}, base);

  if (patch && typeof patch === 'object') {
    if (patch.displayName != null) next.display_name = String(patch.displayName).trim() || next.display_name;
    if (patch.type != null) next.type = String(patch.type).trim();
    if (patch.active != null) next.active = !!patch.active;
    if (patch.status != null) next.status = String(patch.status).trim().toUpperCase();
    if (patch.note != null) next.note = String(patch.note);
    if (patch.unitInfo != null) next.unit_info = String(patch.unitInfo);
    if (patch.destination != null) next.destination = String(patch.destination);
    if (patch.incident != null) next.incident = String(patch.incident).trim();
    if (patch.fcmToken != null) next.fcm_token = String(patch.fcmToken);
  }

  // Normalize CAD style storage (uppercase)
  next.display_name = String(next.display_name || '').toUpperCase();
  next.type = String(next.type || '').toUpperCase();
  next.status = String(next.status || 'AV').toUpperCase();
  next.note = String(next.note || '').toUpperCase();
  next.unit_info = String(next.unit_info || '').toUpperCase();
  next.destination = String(next.destination || '').toUpperCase();
  next.incident = String(next.incident || '').toUpperCase();

  if (!_isValidStatus_(next.status)) return { ok: false, error: `INVALID STATUS: ${next.status}` };

  // Incident logic
  if (next.status === 'D' && !next.incident) {
    next.incident = _generateIncidentId_(ss);
  }
  if (next.status === 'AV' && CONFIG.AV_CLEARS_INCIDENT) {
    // When unit goes AV, close the incident
    if (next.incident) {
      const sh = ss.getSheetByName(SHEETS.INCIDENTS);
      const data = sh.getDataRange().getValues();
      const headers = data[0].map(String);
      const idx = _indexMap_(headers);
      const r = _findRowBy_(data, idx.incident_id, next.incident);
      if (r > 0) {
        sh.getRange(r + 1, idx.status + 1).setValue('CLOSED');
        sh.getRange(r + 1, idx.last_update + 1).setValue(new Date());
        sh.getRange(r + 1, idx.updated_by + 1).setValue(auth.actor);
      }
    }
    next.incident = '';
    // Only clear note if it wasn't explicitly provided in patch
    if (patch && patch.note === undefined) {
      next.note = '';
    }
  }
  
  // If assigning a QUEUED incident to a unit, change it to ACTIVE
  if (next.incident && patch && patch.incident) {
    const sh = ss.getSheetByName(SHEETS.INCIDENTS);
    const data = sh.getDataRange().getValues();
    const headers = data[0].map(String);
    const idx = _indexMap_(headers);
    const r = _findRowBy_(data, idx.incident_id, next.incident);
    if (r > 0) {
      const currentStatus = String(data[r][idx.status] || '').toUpperCase();
      if (currentStatus === 'QUEUED') {
        sh.getRange(r + 1, idx.status + 1).setValue('ACTIVE');
        sh.getRange(r + 1, idx.last_update + 1).setValue(new Date());
        sh.getRange(r + 1, idx.updated_by + 1).setValue(auth.actor);
      }
    }
  }

  next.updated_at = nowIso;
  next.updated_by = auth.actor;

  if (!unitBefore) {
    unitsSheet.appendRow(_unitToRow_(next, uIdx));
  } else {
    unitsSheet.getRange(rowIndex + 1, 1, 1, uHeaders.length).setValues([_unitToRow_(next, uIdx)]);
  }

  _syncIncidents_(ss, unitBefore, next, auth.actor);
  _appendAudit_(ss, auth.actor, unitBefore, next);

  return { ok: true, unit: next };
}

function apiLogoffUnit(token, unitId, expectedUpdatedAt) {
  return apiUpsertUnit(token, unitId, { active: false }, expectedUpdatedAt);
}

function apiRidoffUnit(token, unitId, expectedUpdatedAt) {
  return apiUpsertUnit(
    token,
    unitId,
    { status: 'AV', note: '', incident: '', destination: '' },
    expectedUpdatedAt
  );
}

function apiTouchUnit(token, unitId, expectedUpdatedAt) {
  const auth = _requireAuth_(token);
  const ss = _ss_();

  unitId = String(unitId || '').trim().toUpperCase();
  if (!unitId) return { ok: false, error: 'MISSING UNIT.' };

  const unitsSheet = ss.getSheetByName(SHEETS.UNITS);
  const uData = unitsSheet.getDataRange().getValues();
  const uHeaders = uData[0].map(String);
  const uIdx = _indexMap_(uHeaders);

  const rowIndex = _findRowBy_(uData, uIdx.unit_id, unitId);
  if (rowIndex < 1) return { ok: false, error: 'UNIT NOT FOUND.' };

  const unitBefore = _rowToUnit_(uData[rowIndex], uIdx);

  // Concurrency guard
  if (expectedUpdatedAt) {
    const currentUpdatedAt = unitBefore.updated_at || '';
    if (currentUpdatedAt !== expectedUpdatedAt) {
      return { ok: false, conflict: true, error: 'CONFLICT: UNIT UPDATED BY SOMEONE ELSE.', current: unitBefore };
    }
  }

  const nowIso = new Date().toISOString();

  const next = Object.assign({}, unitBefore, {
    updated_at: nowIso,
    updated_by: auth.actor
  });

  unitsSheet.getRange(rowIndex + 1, 1, 1, uHeaders.length).setValues([_unitToRow_(next, uIdx)]);
  _appendAudit_(ss, auth.actor, unitBefore, next, 'TOUCH');

  return { ok: true, unit: next };
}

function apiTouchAllOS(token) {
  const auth = _requireAuth_(token);
  const ss = _ss_();

  const unitsSheet = ss.getSheetByName(SHEETS.UNITS);
  const uData = unitsSheet.getDataRange().getValues();
  if (uData.length < 2) return { ok: true, touched: [] };

  const uHeaders = uData[0].map(String);
  const uIdx = _indexMap_(uHeaders);

  const nowIso = new Date().toISOString();
  const touched = [];

  for (let r = 1; r < uData.length; r++) {
    const unit = _rowToUnit_(uData[r], uIdx);
    if (!unit.unit_id) continue;

    if (unit.active && String(unit.status || '').toUpperCase() === 'OS') {
      const before = unit;
      const next = Object.assign({}, before, { updated_at: nowIso, updated_by: auth.actor });

      unitsSheet.getRange(r + 1, 1, 1, uHeaders.length).setValues([_unitToRow_(next, uIdx)]);
      _appendAudit_(ss, auth.actor, before, next, 'TOUCH');
      touched.push(unit.unit_id);
    }
  }

  return { ok: true, touched };
}

function apiUndoUnit(token, unitId) {
  const auth = _requireAuth_(token);
  const ss = _ss_();

  unitId = String(unitId || '').trim().toUpperCase();
  if (!unitId) return { ok: false, error: 'MISSING UNIT.' };

  const auditSheet = ss.getSheetByName(SHEETS.AUDIT);
  const aData = auditSheet.getDataRange().getValues();
  if (aData.length < 2) return { ok: false, error: 'NO AUDIT HISTORY.' };

  const aHeaders = aData[0].map(String);
  const aIdx = _indexMap_(aHeaders);

  for (let r = aData.length - 1; r >= 1; r--) {
    const row = aData[r];
    const aUnit = String(row[aIdx.unit_id] || '').toUpperCase();
    if (aUnit !== unitId) continue;

    const restored = {
      unit_id: unitId,
      display_name: String(row[aIdx.prev_display_name] || unitId).toUpperCase(),
      type: String(row[aIdx.prev_type] || '').toUpperCase(),
      active: row[aIdx.prev_active] === true || row[aIdx.prev_active] === 'TRUE',
      status: String(row[aIdx.prev_status] || 'AV').toUpperCase(),
      note: String(row[aIdx.prev_note] || '').toUpperCase(),
      unit_info: String(row[aIdx.prev_unit_info] || '').toUpperCase(),
      incident: String(row[aIdx.prev_incident] || '').toUpperCase(),
      destination: String(row[aIdx.prev_destination] || '').toUpperCase(),
      updated_at: new Date().toISOString(),
      updated_by: auth.actor
    };

    const unitsSheet = ss.getSheetByName(SHEETS.UNITS);
    const uData = unitsSheet.getDataRange().getValues();
    const uHeaders = uData[0].map(String);
    const uIdx = _indexMap_(uHeaders);

    const rowIndex = _findRowBy_(uData, uIdx.unit_id, unitId);
    const unitBefore = rowIndex > 0 ? _rowToUnit_(uData[rowIndex], uIdx) : null;
    if (rowIndex < 1) return { ok: false, error: 'UNIT NOT FOUND.' };

    unitsSheet.getRange(rowIndex + 1, 1, 1, uHeaders.length).setValues([_unitToRow_(restored, uIdx)]);

    _syncIncidents_(ss, unitBefore, restored, auth.actor);
    _appendAudit_(ss, auth.actor, unitBefore, restored, 'UNDO');

    return { ok: true, unit: restored };
  }

  return { ok: false, error: `NO AUDIT RECORD FOR ${unitId}.` };
}

function apiSetBanner(token, kind, message) {
  const auth = _requireAuth_(token);
  _ensureSheets_();
  const ss = _ss_();

  kind = String(kind || '').toUpperCase();
  message = String(message || '').trim();

  const meta = ss.getSheetByName(SHEETS.META);
  const vals = meta.getDataRange().getValues();

  function setKey(key, value) {
    for (let r = 1; r < vals.length; r++) {
      if (vals[r][0] === key) {
        meta.getRange(r + 1, 2).setValue(value);
        return;
      }
    }
    meta.appendRow([key, value]);
  }

  const stamp = `${new Date().toISOString()}|${auth.actor}`;

  if (message.toUpperCase() === 'CLEAR') {
    if (kind === 'NOTE') setKey('banner_note', '');
    if (kind === 'ALERT') setKey('banner_alert', '');
    return { ok: true };
  }

  const msg = message.toUpperCase();
  if (kind === 'NOTE') setKey('banner_note', `${stamp}|${msg}`);
  if (kind === 'ALERT') setKey('banner_alert', `${stamp}|${msg}`);

  return { ok: true };
}

function apiUpdateIncident(token, incidentId, message, incidentType, destination) {
  const auth = _requireAuth_(token);
  _ensureSheets_();
  const ss = _ss_();

  const norm = _normalizeIncidentId_(incidentId);
  if (!norm.ok) return norm;
  const inc = norm.value;

  const msg = String(message || '').trim().toUpperCase();
  const newType = String(incidentType || '').trim().toUpperCase();
  const newDest = destination !== undefined ? String(destination || '').trim().toUpperCase() : null;
  if (!msg && !newType && newDest === null) return { ok: false, error: 'MISSING INCIDENT NOTE MESSAGE.' };

  const sh = ss.getSheetByName(SHEETS.INCIDENTS);
  const data = sh.getDataRange().getValues();
  const headers = data[0].map(String);
  const idx = _indexMap_(headers);

  const r = _findRowBy_(data, idx.incident_id, inc);
  if (r < 1) return { ok: false, error: `INCIDENT NOT FOUND: ${inc}` };

  if (msg) sh.getRange(r + 1, idx.incident_note + 1).setValue(msg);
  if (newType) sh.getRange(r + 1, idx.incident_type + 1).setValue(newType);
  if (newDest !== null) sh.getRange(r + 1, idx.destination + 1).setValue(newDest);
  sh.getRange(r + 1, idx.last_update + 1).setValue(new Date());
  sh.getRange(r + 1, idx.updated_by + 1).setValue(auth.actor);

  const ia = ss.getSheetByName(SHEETS.INCIDENT_AUDIT);
  let auditParts = [];
  if (msg) auditParts.push(msg);
  if (newType) auditParts.push('[TYPE: ' + newType + ']');
  if (newDest !== null) auditParts.push('[DEST: ' + (newDest || 'CLEARED') + ']');
  const auditMsg = auditParts.join(' ');
  ia.appendRow([new Date(), inc, auditMsg, auth.actor]);

  return { ok: true };
}

function apiGetIncident(token, incidentId) {
  _requireAuth_(token);
  _ensureSheets_();
  const ss = _ss_();

  const norm = _normalizeIncidentId_(incidentId);
  if (!norm.ok) return norm;
  const inc = norm.value;

  const sh = ss.getSheetByName(SHEETS.INCIDENTS);
  const data = sh.getDataRange().getValues();
  const headers = data[0].map(String);
  const idx = _indexMap_(headers);

  const r = _findRowBy_(data, idx.incident_id, inc);
  if (r < 1) return { ok: false, error: `INCIDENT NOT FOUND: ${inc}` };

  const row = data[r];
  const incident = {
    incident_id: String(row[idx.incident_id] || '').toUpperCase(),
    created_at: row[idx.created_at] instanceof Date ? row[idx.created_at].toISOString() : String(row[idx.created_at] || ''),
    created_by: String(row[idx.created_by] || ''),
    status: String(row[idx.status] || 'ACTIVE'),
    units: String(row[idx.units] || ''),
    destination: String(row[idx.destination] || ''),
    incident_note: String(row[idx.incident_note] || ''),
    last_update: row[idx.last_update] instanceof Date ? row[idx.last_update].toISOString() : String(row[idx.last_update] || ''),
    updated_by: String(row[idx.updated_by] || ''),
    incident_type: String(row[idx.incident_type] || '')
  };

  const ia = ss.getSheetByName(SHEETS.INCIDENT_AUDIT);
  const iaVals = ia.getDataRange().getValues();
  const out = [];
  for (let i = iaVals.length - 1; i >= 1; i--) {
    const iid = String(iaVals[i][1] || '').toUpperCase();
    if (iid !== inc) continue;
    out.push({
      ts: iaVals[i][0] instanceof Date ? iaVals[i][0].toISOString() : String(iaVals[i][0] || ''),
      message: String(iaVals[i][2] || ''),
      actor: String(iaVals[i][3] || '')
    });
    if (out.length >= 25) break;
  }
  out.reverse();

  return { ok: true, incident, audit: out };
}

function apiAppendIncidentNote(token, incidentId, message) {
  const auth = _requireAuth_(token);
  _ensureSheets_();
  const ss = _ss_();

  const norm = _normalizeIncidentId_(incidentId);
  if (!norm.ok) return norm;
  const inc = norm.value;

  const msg = String(message || '').trim().toUpperCase();
  if (!msg) return { ok: false, error: 'MISSING NOTE MESSAGE.' };

  const sh = ss.getSheetByName(SHEETS.INCIDENTS);
  const data = sh.getDataRange().getValues();
  const headers = data[0].map(String);
  const idx = _indexMap_(headers);

  const r = _findRowBy_(data, idx.incident_id, inc);
  if (r < 1) return { ok: false, error: `INCIDENT NOT FOUND: ${inc}` };

  sh.getRange(r + 1, idx.incident_note + 1).setValue(msg);
  sh.getRange(r + 1, idx.last_update + 1).setValue(new Date());
  sh.getRange(r + 1, idx.updated_by + 1).setValue(auth.actor);

  const ia = ss.getSheetByName(SHEETS.INCIDENT_AUDIT);
  ia.appendRow([new Date(), inc, msg, auth.actor]);

  return { ok: true };
}

function apiTouchIncident(token, incidentId) {
  const auth = _requireAuth_(token);
  _ensureSheets_();
  const ss = _ss_();

  const norm = _normalizeIncidentId_(incidentId);
  if (!norm.ok) return norm;
  const inc = norm.value;

  const sh = ss.getSheetByName(SHEETS.INCIDENTS);
  const data = sh.getDataRange().getValues();
  const headers = data[0].map(String);
  const idx = _indexMap_(headers);

  const r = _findRowBy_(data, idx.incident_id, inc);
  if (r < 1) return { ok: false, error: `INCIDENT NOT FOUND: ${inc}` };

  sh.getRange(r + 1, idx.last_update + 1).setValue(new Date());
  sh.getRange(r + 1, idx.updated_by + 1).setValue(auth.actor);

  return { ok: true };
}

function apiLinkUnits(token, unit1Id, unit2Id, incidentId) {
  const auth = _requireAuth_(token);
  const ss = _ss_();

  const norm = _normalizeIncidentId_(incidentId);
  if (!norm.ok) return norm;
  const inc = norm.value;

  const u1 = String(unit1Id || '').trim().toUpperCase();
  const u2 = String(unit2Id || '').trim().toUpperCase();
  if (!u1 || !u2) return { ok: false, error: 'BOTH UNITS REQUIRED.' };

  // Get both units
  const unitsSheet = ss.getSheetByName(SHEETS.UNITS);
  const uData = unitsSheet.getDataRange().getValues();
  const uHeaders = uData[0].map(String);
  const uIdx = _indexMap_(uHeaders);

  const r1 = _findRowBy_(uData, uIdx.unit_id, u1);
  const r2 = _findRowBy_(uData, uIdx.unit_id, u2);

  if (r1 < 1) return { ok: false, error: `UNIT NOT FOUND: ${u1}` };
  if (r2 < 1) return { ok: false, error: `UNIT NOT FOUND: ${u2}` };

  const unit1 = _rowToUnit_(uData[r1], uIdx);
  const unit2 = _rowToUnit_(uData[r2], uIdx);

  // Update both units to have same incident (preserve status)
  const nowIso = new Date().toISOString();

  const next1 = Object.assign({}, unit1, { incident: inc, updated_at: nowIso, updated_by: auth.actor });
  const next2 = Object.assign({}, unit2, { incident: inc, updated_at: nowIso, updated_by: auth.actor });

  unitsSheet.getRange(r1 + 1, 1, 1, uHeaders.length).setValues([_unitToRow_(next1, uIdx)]);
  unitsSheet.getRange(r2 + 1, 1, 1, uHeaders.length).setValues([_unitToRow_(next2, uIdx)]);

  _syncIncidents_(ss, unit1, next1, auth.actor);
  _syncIncidents_(ss, unit2, next2, auth.actor);

  _appendAudit_(ss, auth.actor, unit1, next1, 'LINK');
  _appendAudit_(ss, auth.actor, unit2, next2, 'LINK');

  return { ok: true, units: [next1, next2] };
}

function apiTransferIncident(token, fromUnitId, toUnitId, incidentId) {
  const auth = _requireAuth_(token);
  const ss = _ss_();

  const norm = _normalizeIncidentId_(incidentId);
  if (!norm.ok) return norm;
  const inc = norm.value;

  const uFrom = String(fromUnitId || '').trim().toUpperCase();
  const uTo = String(toUnitId || '').trim().toUpperCase();
  if (!uFrom || !uTo) return { ok: false, error: 'BOTH UNITS REQUIRED.' };

  const unitsSheet = ss.getSheetByName(SHEETS.UNITS);
  const uData = unitsSheet.getDataRange().getValues();
  const uHeaders = uData[0].map(String);
  const uIdx = _indexMap_(uHeaders);

  const rFrom = _findRowBy_(uData, uIdx.unit_id, uFrom);
  const rTo = _findRowBy_(uData, uIdx.unit_id, uTo);

  if (rFrom < 1) return { ok: false, error: `UNIT NOT FOUND: ${uFrom}` };
  if (rTo < 1) return { ok: false, error: `UNIT NOT FOUND: ${uTo}` };

  const unitFrom = _rowToUnit_(uData[rFrom], uIdx);
  const unitTo = _rowToUnit_(uData[rTo], uIdx);

  const nowIso = new Date().toISOString();

  // Clear incident from FROM unit, set to AV
  const nextFrom = Object.assign({}, unitFrom, { 
    incident: '', 
    status: 'AV',
    updated_at: nowIso, 
    updated_by: auth.actor 
  });

  // Assign incident to TO unit (preserve status)
  const nextTo = Object.assign({}, unitTo, { 
    incident: inc, 
    updated_at: nowIso, 
    updated_by: auth.actor 
  });

  unitsSheet.getRange(rFrom + 1, 1, 1, uHeaders.length).setValues([_unitToRow_(nextFrom, uIdx)]);
  unitsSheet.getRange(rTo + 1, 1, 1, uHeaders.length).setValues([_unitToRow_(nextTo, uIdx)]);

  _syncIncidents_(ss, unitFrom, nextFrom, auth.actor);
  _syncIncidents_(ss, unitTo, nextTo, auth.actor);

  _appendAudit_(ss, auth.actor, unitFrom, nextFrom, 'TRANSFER');
  _appendAudit_(ss, auth.actor, unitTo, nextTo, 'TRANSFER');

  const ia = ss.getSheetByName(SHEETS.INCIDENT_AUDIT);
  ia.appendRow([new Date(), inc, `TRANSFERRED FROM ${uFrom} TO ${uTo}`, auth.actor]);

  return { ok: true, from: nextFrom, to: nextTo };
}

function apiCloseIncident(token, incidentId) {
  const auth = _requireAuth_(token);
  _ensureSheets_();
  const ss = _ss_();

  const norm = _normalizeIncidentId_(incidentId);
  if (!norm.ok) return norm;
  const inc = norm.value;

  const sh = ss.getSheetByName(SHEETS.INCIDENTS);
  const data = sh.getDataRange().getValues();
  const headers = data[0].map(String);
  const idx = _indexMap_(headers);

  const r = _findRowBy_(data, idx.incident_id, inc);
  if (r < 1) return { ok: false, error: `INCIDENT NOT FOUND: ${inc}` };

  sh.getRange(r + 1, idx.status + 1).setValue('CLOSED');
  sh.getRange(r + 1, idx.last_update + 1).setValue(new Date());
  sh.getRange(r + 1, idx.updated_by + 1).setValue(auth.actor);

  const ia = ss.getSheetByName(SHEETS.INCIDENT_AUDIT);
  ia.appendRow([new Date(), inc, 'INCIDENT MANUALLY CLOSED', auth.actor]);

  return { ok: true };
}

function apiReopenIncident(token, incidentId) {
  const auth = _requireAuth_(token);
  _ensureSheets_();
  const ss = _ss_();

  const norm = _normalizeIncidentId_(incidentId);
  if (!norm.ok) return norm;
  const inc = norm.value;

  const sh = ss.getSheetByName(SHEETS.INCIDENTS);
  const data = sh.getDataRange().getValues();
  const headers = data[0].map(String);
  const idx = _indexMap_(headers);

  const r = _findRowBy_(data, idx.incident_id, inc);
  if (r < 1) return { ok: false, error: `INCIDENT NOT FOUND: ${inc}` };

  sh.getRange(r + 1, idx.status + 1).setValue('ACTIVE');
  sh.getRange(r + 1, idx.last_update + 1).setValue(new Date());
  sh.getRange(r + 1, idx.updated_by + 1).setValue(auth.actor);

  const ia = ss.getSheetByName(SHEETS.INCIDENT_AUDIT);
  ia.appendRow([new Date(), inc, 'INCIDENT REOPENED', auth.actor]);

  return { ok: true };
}

function apiGetUnitInfo(token, unitId) {
  _requireAuth_(token);
  const ss = _ss_();

  unitId = String(unitId || '').trim().toUpperCase();
  if (!unitId) return { ok: false, error: 'MISSING UNIT.' };

  const unitsSheet = ss.getSheetByName(SHEETS.UNITS);
  const uData = unitsSheet.getDataRange().getValues();
  const uHeaders = uData[0].map(String);
  const uIdx = _indexMap_(uHeaders);

  const r = _findRowBy_(uData, uIdx.unit_id, unitId);
  if (r < 1) return { ok: false, error: `UNIT NOT FOUND: ${unitId}` };

  const unit = _rowToUnit_(uData[r], uIdx);
  return { ok: true, unit };
}

function apiCreateQueuedIncident(token, destination, note, urgent, assignUnitId, incidentType) {
  const auth = _requireAuth_(token);
  _ensureSheets_();
  const ss = _ss_();

  const dest = String(destination || '').trim().toUpperCase();
  if (!dest) return { ok: false, error: 'DESTINATION REQUIRED.' };

  const incidentId = _generateIncidentId_(ss);
  const msg = String(note || '').trim().toUpperCase();
  const isUrgent = !!urgent;
  const unitId = String(assignUnitId || '').trim().toUpperCase();
  const incType = String(incidentType || '').trim().toUpperCase();

  // Create incident record
  const sh = ss.getSheetByName(SHEETS.INCIDENTS);
  sh.appendRow([
    incidentId,
    new Date(),
    auth.actor,
    'QUEUED',
    unitId || '',
    dest,
    msg,
    new Date(),
    auth.actor,
    incType
  ]);

  // Add to incident audit
  const ia = ss.getSheetByName(SHEETS.INCIDENT_AUDIT);
  ia.appendRow([
    new Date(),
    incidentId,
    'INCIDENT CREATED IN QUEUE' + (isUrgent ? ' [URGENT]' : ''),
    auth.actor
  ]);

  // If unit assigned, update the unit
  if (unitId) {
    const unitsSheet = ss.getSheetByName(SHEETS.UNITS);
    const uData = unitsSheet.getDataRange().getValues();
    const uHeaders = uData[0].map(String);
    const uIdx = _indexMap_(uHeaders);
    const r = _findRowBy_(uData, uIdx.unit_id, unitId);
    
    if (r > 0) {
      const unit = _rowToUnit_(uData[r], uIdx);
      const nowIso = new Date().toISOString();
      const next = Object.assign({}, unit, {
        status: 'DE',
        incident: incidentId,
        destination: dest,
        updated_at: nowIso,
        updated_by: auth.actor
      });
      unitsSheet.getRange(r + 1, 1, 1, uHeaders.length).setValues([_unitToRow_(next, uIdx)]);
      _appendAudit_(ss, auth.actor, unit, next, 'ASSIGN');
      
      // Update incident to ACTIVE
      const incData = sh.getDataRange().getValues();
      const incHeaders = incData[0].map(String);
      const incIdx = _indexMap_(incHeaders);
      const incRow = _findRowBy_(incData, incIdx.incident_id, incidentId);
      if (incRow > 0) {
        sh.getRange(incRow + 1, incIdx.status + 1).setValue('ACTIVE');
        sh.getRange(incRow + 1, incIdx.units + 1).setValue(unitId);
      }
    }
  }

  return { ok: true, incidentId, urgent: isUrgent };
}

function apiNewUser(token, lastName, firstName) {
  const auth = _requireAuth_(token);
  _ensureSheets_();
  const ss = _ss_();
  
  const ln = String(lastName || '').trim().toUpperCase();
  const fn = String(firstName || '').trim().toUpperCase();
  
  if (!ln || !fn) {
    return { ok: false, error: 'USAGE: NEWUSER lastname,firstname' };
  }
  
  // Generate username: lastname + first initial
  let baseUsername = (ln + fn.charAt(0)).toLowerCase();
  let username = baseUsername;
  
  // Check for collisions and add number if needed
  const usersSheet = ss.getSheetByName(SHEETS.USERS);
  const data = usersSheet.getDataRange().getValues();
  const headers = data[0].map(String);
  const idx = _indexMap_(headers);
  
  const existingUsernames = new Set();
  for (let i = 1; i < data.length; i++) {
    existingUsernames.add(String(data[i][idx.username] || '').toLowerCase());
  }
  
  let counter = 2;
  while (existingUsernames.has(username)) {
    username = baseUsername + counter;
    counter++;
  }
  
  // Create user with default password
  const password = '12345';
  usersSheet.appendRow([username, fn, ln, password, new Date(), auth.actor]);
  
  return { 
    ok: true, 
    username, 
    firstName: fn, 
    lastName: ln, 
    password,
    collision: username !== baseUsername
  };
}

function apiDelUser(token, username) {
  const auth = _requireAuth_(token);
  _ensureSheets_();
  const ss = _ss_();
  
  const u = String(username || '').trim().toLowerCase();
  if (!u) {
    return { ok: false, error: 'USAGE: DELUSER username' };
  }
  
  const usersSheet = ss.getSheetByName(SHEETS.USERS);
  const data = usersSheet.getDataRange().getValues();
  const headers = data[0].map(String);
  const idx = _indexMap_(headers);
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idx.username] || '').toLowerCase() === u) {
      usersSheet.deleteRow(i + 1);
      return { ok: true, username: u };
    }
  }
  
  return { ok: false, error: 'USER NOT FOUND: ' + u };
}

function apiListUsersAdmin(token) {
  const auth = _requireAuth_(token);
  _ensureSheets_();
  const ss = _ss_();
  
  const usersSheet = ss.getSheetByName(SHEETS.USERS);
  const data = usersSheet.getDataRange().getValues();
  if (data.length < 2) {
    return { ok: true, users: [] };
  }
  
  const headers = data[0].map(String);
  const idx = _indexMap_(headers);
  
  const users = [];
  for (let i = 1; i < data.length; i++) {
    users.push({
      username: String(data[i][idx.username] || ''),
      firstName: String(data[i][idx.first_name] || ''),
      lastName: String(data[i][idx.last_name] || ''),
      password: String(data[i][idx.password] || ''),
      createdAt: data[i][idx.created_at] instanceof Date ? data[i][idx.created_at].toISOString() : String(data[i][idx.created_at] || ''),
      createdBy: String(data[i][idx.created_by] || '')
    });
  }
  
  return { ok: true, users };
}

function apiListUsers(token) {
  const auth = _requireAuth_(token);
  _ensureSheets_();
  const ss = _ss_();
  
  const usersSheet = ss.getSheetByName(SHEETS.USERS);
  const data = usersSheet.getDataRange().getValues();
  if (data.length < 2) {
    return { ok: true, users: [] };
  }
  
  const headers = data[0].map(String);
  const idx = _indexMap_(headers);
  
  const users = [];
  for (let i = 1; i < data.length; i++) {
    users.push({
      username: String(data[i][idx.username] || ''),
      firstName: String(data[i][idx.first_name] || ''),
      lastName: String(data[i][idx.last_name] || ''),
      createdAt: data[i][idx.created_at] instanceof Date ? data[i][idx.created_at].toISOString() : String(data[i][idx.created_at] || ''),
      createdBy: String(data[i][idx.created_by] || '')
    });
  }
  
  return { ok: true, users };
}

function apiChangePassword(token, oldPassword, newPassword) {
  const auth = _requireAuth_(token);
  _ensureSheets_();
  const ss = _ss_();
  
  // Extract username from token
  const cache = CacheService.getScriptCache();
  const sessionData = cache.get(`token:${token}`);
  if (!sessionData) {
    return { ok: false, error: 'SESSION EXPIRED' };
  }
  
  const session = JSON.parse(sessionData);
  const username = session.username;
  
  if (!username) {
    return { ok: false, error: 'UNIT ROLES CANNOT CHANGE PASSWORD' };
  }
  
  const usersSheet = ss.getSheetByName(SHEETS.USERS);
  const data = usersSheet.getDataRange().getValues();
  const headers = data[0].map(String);
  const idx = _indexMap_(headers);
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idx.username] || '').toLowerCase() === username.toLowerCase()) {
      // Verify old password
      if (String(data[i][idx.password] || '') !== oldPassword) {
        return { ok: false, error: 'INCORRECT OLD PASSWORD' };
      }
      
      // Update to new password
      usersSheet.getRange(i + 1, idx.password + 1).setValue(newPassword);
      return { ok: true };
    }
  }
  
  return { ok: false, error: 'USER NOT FOUND' };
}

function apiSearch(token, query) {
  const auth = _requireAuth_(token);
  _ensureSheets_();
  const ss = _ss_();
  
  const q = String(query || '').trim().toUpperCase();
  if (q.length < 2) {
    return { ok: false, error: 'QUERY TOO SHORT (MIN 2 CHARS)' };
  }
  
  const results = [];
  
  // Search Audit
  const auditSheet = ss.getSheetByName(SHEETS.AUDIT);
  const auditData = auditSheet.getDataRange().getValues();
  for (let i = 1; i < auditData.length && results.length < 50; i++) {
    const row = auditData[i];
    const rowStr = row.join(' ').toUpperCase();
    if (rowStr.includes(q)) {
      results.push({
        type: 'AUDIT',
        summary: `${row[0]} ${row[1]} ${row[2]}`.substring(0, 80)
      });
    }
  }
  
  // Search Incidents
  const incSheet = ss.getSheetByName(SHEETS.INCIDENTS);
  const incData = incSheet.getDataRange().getValues();
  for (let i = 1; i < incData.length && results.length < 50; i++) {
    const row = incData[i];
    const rowStr = row.join(' ').toUpperCase();
    if (rowStr.includes(q)) {
      results.push({
        type: 'INCIDENT',
        summary: `${row[0]} ${row[5]} ${row[6]}`.substring(0, 80)
      });
    }
  }
  
  // Search Incident Audit
  const incAuditSheet = ss.getSheetByName(SHEETS.INCIDENT_AUDIT);
  const incAuditData = incAuditSheet.getDataRange().getValues();
  for (let i = 1; i < incAuditData.length && results.length < 50; i++) {
    const row = incAuditData[i];
    const rowStr = row.join(' ').toUpperCase();
    if (rowStr.includes(q)) {
      results.push({
        type: 'INC AUDIT',
        summary: `${row[1]} ${row[2]}`.substring(0, 80)
      });
    }
  }
  
  return { ok: true, results, query: q };
}

function apiClearData(token, what) {
  const auth = _requireAuth_(token);

  // Restrict to SUPV roles only
  const role = (auth.role || '').toUpperCase();
  if (!role.startsWith('SUPV')) {
    return { ok: false, error: 'CLEARDATA REQUIRES SUPERVISOR ACCESS (SUPV1/SUPV2).' };
  }

  _ensureSheets_();
  const ss = _ss_();

  const target = String(what || '').trim().toUpperCase();
  let deleted = 0;
  
  if (target === 'UNITS' || target === 'ALL') {
    const sh = ss.getSheetByName(SHEETS.UNITS);
    const rows = sh.getMaxRows();
    if (rows > 1) {
      sh.deleteRows(2, rows - 1);
      deleted += rows - 1;
    }
  }

  if (target === 'INACTIVE') {
    const sh = ss.getSheetByName(SHEETS.UNITS);
    const data = sh.getDataRange().getValues();
    if (data.length < 2) return { ok: true, deleted: 0, target };
    const headers = data[0].map(String);
    const idx = _indexMap_(headers);
    // Delete inactive units in reverse order
    for (let i = data.length - 1; i >= 1; i--) {
      const isActive = data[i][idx.active] === true || data[i][idx.active] === 'TRUE';
      if (!isActive) {
        sh.deleteRow(i + 1);
        deleted++;
      }
    }
  }

  if (target === 'AUDIT' || target === 'ALL') {
    const sh = ss.getSheetByName(SHEETS.AUDIT);
    const rows = sh.getMaxRows();
    if (rows > 1) {
      sh.deleteRows(2, rows - 1);
      deleted += rows - 1;
    }
  }
  
  if (target === 'INCIDENTS' || target === 'ALL') {
    const incSh = ss.getSheetByName(SHEETS.INCIDENTS);
    const incRows = incSh.getMaxRows();
    if (incRows > 1) {
      incSh.deleteRows(2, incRows - 1);
      deleted += incRows - 1;
    }

    const incAuditSh = ss.getSheetByName(SHEETS.INCIDENT_AUDIT);
    const incAuditRows = incAuditSh.getMaxRows();
    if (incAuditRows > 1) {
      incAuditSh.deleteRows(2, incAuditRows - 1);
      deleted += incAuditRows - 1;
    }
  }

  if (target === 'MESSAGES' || target === 'ALL') {
    const sh = ss.getSheetByName(SHEETS.MESSAGES);
    const rows = sh.getMaxRows();
    if (rows > 1) {
      sh.deleteRows(2, rows - 1);
      deleted += rows - 1;
    }
  }

  return { ok: true, deleted, target };
}

function apiWho(token) {
  const auth = _requireAuth_(token);
  _ensureSheets_();
  const ss = _ss_();

  // Clean stale sessions first
  _cleanStaleSessions_(ss);

  const sessionsSheet = ss.getSheetByName(SHEETS.SESSIONS);
  const data = sessionsSheet.getDataRange().getValues();
  if (data.length < 2) {
    return { ok: true, users: [] };
  }

  const headers = data[0].map(String);
  const idx = _indexMap_(headers);
  const now = new Date();
  const ACTIVE_THRESHOLD_MINUTES = 30; // Only show users active in last 30 minutes

  const users = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const fullName = String(row[idx.full_name] || '');
    const role = String(row[idx.role] || '');
    const lastActivity = row[idx.last_activity];

    let minutesAgo = 999;
    if (lastActivity instanceof Date) {
      minutesAgo = Math.floor((now - lastActivity) / 60000);
    }

    // Only include users active within threshold (skip UNIT roles - they show via WHO on field)
    if (minutesAgo <= ACTIVE_THRESHOLD_MINUTES && role !== 'UNIT') {
      users.push({
        actor: `${fullName}@${role}`,
        role: role,
        minutesAgo: minutesAgo
      });
    }
  }

  users.sort((a, b) => a.minutesAgo - b.minutesAgo);

  return { ok: true, users };
}

function apiGetSystemStatus(token) {
  const auth = _requireAuth_(token);
  const ss = _ss_();

  const units = _readUnits_(ss);
  const incidents = _readIncidents_(ss);

  const active = units.filter(u => u.active);
  const byStatus = {};
  CONFIG.STATUSES.forEach(s => byStatus[s.code] = 0);
  active.forEach(u => {
    const st = String(u.status || 'AV').toUpperCase();
    if (byStatus[st] !== undefined) byStatus[st]++;
  });

  const activeInc = incidents.filter(i => (i.status || '').toUpperCase() === 'ACTIVE');
  const staleInc = activeInc.filter(i => {
    const mins = _minutesSince_(i.last_update);
    return mins != null && mins >= CONFIG.STALE_MINUTES.INCIDENT_STALE;
  });

  return {
    ok: true,
    status: {
      totalUnits: units.length,
      activeUnits: active.length,
      byStatus,
      activeIncidents: activeInc.length,
      staleIncidents: staleInc.length,
      actor: auth.actor
    }
  };
}

function apiMassDispatch(token, destination) {
  const auth = _requireAuth_(token);
  const ss = _ss_();

  const dest = String(destination || '').trim().toUpperCase();
  if (!dest) return { ok: false, error: 'DESTINATION REQUIRED.' };

  const unitsSheet = ss.getSheetByName(SHEETS.UNITS);
  const uData = unitsSheet.getDataRange().getValues();
  const uHeaders = uData[0].map(String);
  const uIdx = _indexMap_(uHeaders);

  const nowIso = new Date().toISOString();
  const updated = [];

  for (let r = 1; r < uData.length; r++) {
    const unit = _rowToUnit_(uData[r], uIdx);
    if (!unit.unit_id) continue;
    if (!unit.active) continue;
    if (String(unit.status || '').toUpperCase() !== 'AV') continue;

    const before = unit;
    const incidentId = _generateIncidentId_(ss);
    const next = Object.assign({}, before, {
      status: 'D',
      destination: dest,
      incident: incidentId,
      updated_at: nowIso,
      updated_by: auth.actor
    });

    unitsSheet.getRange(r + 1, 1, 1, uHeaders.length).setValues([_unitToRow_(next, uIdx)]);
    _syncIncidents_(ss, before, next, auth.actor);
    _appendAudit_(ss, auth.actor, before, next, 'MASS');
    updated.push(unit.unit_id);
  }

  return { ok: true, updated };
}

function apiReportOOS(token, hours) {
  const auth = _requireAuth_(token);
  _ensureSheets_();
  const ss = _ss_();
  
  const hrs = Number(hours) || 24;
  const now = new Date();
  const startTime = new Date(now.getTime() - (hrs * 60 * 60 * 1000));
  
  // Read audit log
  const auditSheet = ss.getSheetByName(SHEETS.AUDIT);
  const auditData = auditSheet.getDataRange().getValues();
  if (auditData.length < 2) {
    return {
      ok: true,
      report: {
        startTime: _formatDateTime_(startTime),
        endTime: _formatDateTime_(now),
        totalOOSMinutes: 0,
        totalOOSHours: '0.0',
        unitCount: 0,
        units: []
      }
    };
  }
  
  const headers = auditData[0].map(String);
  const idx = _indexMap_(headers);
  
  // Track OOS periods per unit
  const unitOOSPeriods = {};
  
  for (let i = 1; i < auditData.length; i++) {
    const row = auditData[i];
    const ts = row[idx.ts];
    if (!(ts instanceof Date) || ts < startTime) continue;
    
    const unitId = String(row[idx.unit_id] || '').toUpperCase();
    if (!unitId) continue;
    
    const newStatus = String(row[idx.new_status] || '').toUpperCase();
    const prevStatus = String(row[idx.prev_status] || '').toUpperCase();
    
    if (!unitOOSPeriods[unitId]) {
      unitOOSPeriods[unitId] = {
        unit: unitId,
        oosStart: null,
        periods: [],
        totalMinutes: 0
      };
    }
    
    const unit = unitOOSPeriods[unitId];
    
    // Unit went OOS
    if (newStatus === 'OOS' && prevStatus !== 'OOS') {
      unit.oosStart = ts;
    }
    
    // Unit came back from OOS
    if (prevStatus === 'OOS' && newStatus !== 'OOS' && unit.oosStart) {
      const durationMs = ts - unit.oosStart;
      const durationMin = Math.floor(durationMs / 60000);
      unit.periods.push({
        start: _formatDateTime_(unit.oosStart),
        end: _formatDateTime_(ts),
        duration: durationMin
      });
      unit.totalMinutes += durationMin;
      unit.oosStart = null;
    }
  }
  
  // Close any ongoing OOS periods
  Object.keys(unitOOSPeriods).forEach(unitId => {
    const unit = unitOOSPeriods[unitId];
    if (unit.oosStart) {
      const durationMs = now - unit.oosStart;
      const durationMin = Math.floor(durationMs / 60000);
      unit.periods.push({
        start: _formatDateTime_(unit.oosStart),
        end: _formatDateTime_(now) + ' (ONGOING)',
        duration: durationMin
      });
      unit.totalMinutes += durationMin;
    }
  });
  
  // Build report
  const units = Object.values(unitOOSPeriods)
    .filter(u => u.totalMinutes > 0)
    .map(u => ({
      unit: u.unit,
      oosMinutes: u.totalMinutes,
      oosHours: (u.totalMinutes / 60).toFixed(1),
      periods: u.periods
    }))
    .sort((a, b) => b.oosMinutes - a.oosMinutes);
  
  const totalMinutes = units.reduce((sum, u) => sum + u.oosMinutes, 0);
  
  return {
    ok: true,
    report: {
      startTime: _formatDateTime_(startTime),
      endTime: _formatDateTime_(now),
      totalOOSMinutes: totalMinutes,
      totalOOSHours: (totalMinutes / 60).toFixed(1),
      unitCount: units.length,
      units
    }
  };
}

function _formatDateTime_(date) {
  if (!(date instanceof Date)) return '';
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${m}/${d} ${h}:${min}`;
}

function apiClearSessions(token) {
  const auth = _requireAuth_(token);
  _ensureSheets_();
  const ss = _ss_();
  
  const sessionsSheet = ss.getSheetByName(SHEETS.SESSIONS);
  const rows = sessionsSheet.getMaxRows();
  let deleted = 0;
  
  if (rows > 1) {
    sessionsSheet.deleteRows(2, rows - 1);
    deleted = rows - 1;
  }
  
  return { ok: true, deleted };
}

function apiLogout(token) {
  // No auth check needed - we're logging out
  _ensureSheets_();
  const ss = _ss_();

  // Invalidate cache token first
  try {
    CacheService.getScriptCache().remove(`token:${token}`);
  } catch (e) {}

  const sessionsSheet = ss.getSheetByName(SHEETS.SESSIONS);
  const data = sessionsSheet.getDataRange().getValues();
  const headers = data[0].map(String);
  const idx = _indexMap_(headers);

  // Find and delete the session
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][idx.session_id] || '') === token) {
      sessionsSheet.deleteRow(i + 1);
      break;
    }
  }

  return { ok: true };
}

function apiSendBroadcast(token, message, urgent) {
  const auth = _requireAuth_(token);
  _ensureSheets_();
  const ss = _ss_();
  
  const msg = String(message || '').trim().toUpperCase();
  if (!msg) {
    return { ok: false, error: 'MESSAGE REQUIRED' };
  }
  
  const isUrgent = !!urgent;
  
  // Get all active sessions
  _cleanStaleSessions_(ss);
  const sessionsSheet = ss.getSheetByName(SHEETS.SESSIONS);
  const sessionsData = sessionsSheet.getDataRange().getValues();
  
  if (sessionsData.length < 2) {
    return { ok: false, error: 'NO ACTIVE SESSIONS TO MESSAGE' };
  }
  
  const sessionsHeaders = sessionsData[0].map(String);
  const sessionsIdx = _indexMap_(sessionsHeaders);
  
  // Collect unique roles from active sessions
  const activeRoles = new Set();
  for (let i = 1; i < sessionsData.length; i++) {
    const role = String(sessionsData[i][sessionsIdx.role] || '').toUpperCase();
    if (role && role !== 'UNIT') { // Don't send to UNIT logins
      activeRoles.add(role);
    }
  }
  
  if (activeRoles.size === 0) {
    return { ok: false, error: 'NO DISPATCHER SESSIONS ACTIVE' };
  }
  
  // Send message to each active role
  const messagesSheet = ss.getSheetByName(SHEETS.MESSAGES);
  const fromRole = auth.role || '';
  const fromInitials = auth.username || auth.fullName || '';
  let count = 0;
  
  activeRoles.forEach(role => {
    const messageId = _generateMessageId_(ss);
    messagesSheet.appendRow([
      messageId,
      new Date(),
      fromRole,
      fromInitials,
      role,
      msg,
      isUrgent,
      false
    ]);
    count++;
  });
  
  return { ok: true, recipients: count, urgent: isUrgent };
}

// ── FCM Push Notification ──────────────────────────────────────────
function _sendFCMPush_(fcmToken, title, body, urgent) {
  if (!fcmToken) return;
  try {
    const accessToken = ScriptApp.getOAuthToken();
    const payload = {
      message: {
        token: fcmToken,
        data: {
          title: title,
          body: body,
          urgent: urgent ? 'true' : 'false',
          icon: '/cadradio/icon-cadradio.svg',
          tag: 'cad-msg-' + Date.now()
        },
        webpush: {
          headers: { Urgency: urgent ? 'high' : 'normal', TTL: '300' }
        }
      }
    };
    UrlFetchApp.fetch('https://fcm.googleapis.com/v1/projects/holdenptt-ce145/messages:send', {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + accessToken },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (e) {
    console.error('[FCM] Push failed:', e);
  }
}

function apiSendMessage(token, toRole, message, urgent) {
  const auth = _requireAuth_(token);
  _ensureSheets_();
  const ss = _ss_();

  const to = String(toRole || '').trim().toUpperCase();
  const msg = String(message || '').trim().toUpperCase();
  const isUrgent = !!urgent;

  if (!msg) return { ok: false, error: 'MESSAGE REQUIRED.' };

  // Accept dispatcher roles, 'ALL', or valid unit callsigns
  let isUnitRecipient = false;
  if (to !== 'ALL' && !CONFIG.AUTH.ROLES.includes(to)) {
    // Check if recipient is a valid unit_id in the Units sheet
    const unitsSheet = ss.getSheetByName(SHEETS.UNITS);
    const uData = unitsSheet.getDataRange().getValues();
    const uHeaders = uData[0].map(String);
    const uIdx = _indexMap_(uHeaders);
    const unitRow = _findRowBy_(uData, uIdx.unit_id, to);
    if (unitRow < 1) {
      return { ok: false, error: 'INVALID RECIPIENT: ' + to + '. USE A ROLE (STA1, SUPV1) OR UNIT CALLSIGN.' };
    }
    isUnitRecipient = true;
  }

  const msgSheet = ss.getSheetByName(SHEETS.MESSAGES);
  const data = msgSheet.getDataRange().getValues();

  let nextId = 1;
  if (data.length > 1) {
    const lastId = String(data[data.length - 1][0] || '').replace(/^MSG/, '');
    if (/^\d+$/.test(lastId)) nextId = parseInt(lastId, 10) + 1;
  }

  // When sender is UNIT role, use their callsign as from_role so recipients see "EMS12" not "UNIT"
  const fromRole = (auth.role === 'UNIT') ? String(auth.username || '').toUpperCase() : auth.role;
  const fromInitials = auth.initials || auth.username || '';

  const msgId = `MSG${nextId}`;
  msgSheet.appendRow([
    msgId,
    new Date(),
    fromRole,
    fromInitials,
    to,
    msg,
    isUrgent,
    false
  ]);

  // FCM push notification to recipient unit(s)
  try {
    const unitsSheet = ss.getSheetByName(SHEETS.UNITS);
    const uData = unitsSheet.getDataRange().getValues();
    const uHeaders = uData[0].map(String);
    const uIdx = _indexMap_(uHeaders);
    const pushTitle = isUrgent ? 'URGENT MSG from ' + fromRole : 'MSG from ' + fromRole;

    if (isUnitRecipient) {
      // Single unit recipient — look up their FCM token
      const uRow = _findRowBy_(uData, uIdx.unit_id, to);
      if (uRow > 0) {
        const fcm = String(uData[uRow][uIdx.fcm_token] || '');
        if (fcm) _sendFCMPush_(fcm, pushTitle, msg, isUrgent);
      }
    } else if (to === 'ALL') {
      // Broadcast — push to all active units with FCM tokens
      for (let r = 1; r < uData.length; r++) {
        const active = uData[r][uIdx.active] === true || uData[r][uIdx.active] === 'TRUE';
        const fcm = String(uData[r][uIdx.fcm_token] || '');
        if (active && fcm) _sendFCMPush_(fcm, pushTitle, msg, isUrgent);
      }
    }
  } catch (fcmErr) {
    console.error('[FCM] Push in apiSendMessage failed:', fcmErr);
  }

  return { ok: true, messageId: msgId };
}

function apiGetMessages(token) {
  const auth = _requireAuth_(token);
  _ensureSheets_();
  const ss = _ss_();

  return { ok: true, messages: _readMessages_(ss, auth.role, auth.username) };
}

function apiReadMessage(token, messageId) {
  const auth = _requireAuth_(token);
  _ensureSheets_();
  const ss = _ss_();

  const msgId = String(messageId || '').trim().toUpperCase();
  if (!msgId) return { ok: false, error: 'MESSAGE ID REQUIRED.' };

  const msgSheet = ss.getSheetByName(SHEETS.MESSAGES);
  const data = msgSheet.getDataRange().getValues();
  const headers = data[0].map(String);
  const idx = _indexMap_(headers);

  const r = _findRowBy_(data, idx.message_id, msgId);
  if (r < 1) return { ok: false, error: `MESSAGE NOT FOUND: ${msgId}` };

  const toRole = String(data[r][idx.to_role] || '').toUpperCase();
  const callsign = (auth.role === 'UNIT' && auth.username) ? String(auth.username).toUpperCase() : '';
  if (toRole !== auth.role && toRole !== 'ALL' && !(callsign && toRole === callsign)) {
    return { ok: false, error: 'NOT YOUR MESSAGE.' };
  }

  msgSheet.getRange(r + 1, idx.read_flag + 1).setValue(true);

  const msg = {
    message_id: msgId,
    ts: data[r][idx.ts] instanceof Date ? data[r][idx.ts].toISOString() : String(data[r][idx.ts] || ''),
    from_role: String(data[r][idx.from_role] || ''),
    from_initials: String(data[r][idx.from_initials] || ''),
    to_role: toRole,
    message: String(data[r][idx.message] || ''),
    urgent: data[r][idx.urgent] === true || data[r][idx.urgent] === 'TRUE',
    read: true
  };

  return { ok: true, message: msg };
}

function apiDeleteMessage(token, messageId) {
  const auth = _requireAuth_(token);
  _ensureSheets_();
  const ss = _ss_();

  const msgId = String(messageId || '').trim().toUpperCase();
  if (!msgId) return { ok: false, error: 'MESSAGE ID REQUIRED.' };

  const msgSheet = ss.getSheetByName(SHEETS.MESSAGES);
  const data = msgSheet.getDataRange().getValues();
  const headers = data[0].map(String);
  const idx = _indexMap_(headers);

  const r = _findRowBy_(data, idx.message_id, msgId);
  if (r < 1) return { ok: false, error: `MESSAGE NOT FOUND: ${msgId}` };

  // Verify ownership: message must be addressed to this user's role, callsign, or ALL
  const toRole = String(data[r][idx.to_role] || '').toUpperCase();
  const callsign = (auth.role === 'UNIT' && auth.username) ? String(auth.username).toUpperCase() : '';
  if (toRole !== auth.role && toRole !== 'ALL' && !(callsign && toRole === callsign)) {
    return { ok: false, error: 'NOT YOUR MESSAGE.' };
  }

  msgSheet.deleteRow(r + 1);
  return { ok: true };
}

function apiDeleteAllMessages(token) {
  const auth = _requireAuth_(token);
  _ensureSheets_();
  const ss = _ss_();

  const msgSheet = ss.getSheetByName(SHEETS.MESSAGES);
  const data = msgSheet.getDataRange().getValues();
  if (data.length < 2) return { ok: true, deleted: 0 };

  const headers = data[0].map(String);
  const idx = _indexMap_(headers);

  const callsign = (auth.role === 'UNIT' && auth.username) ? String(auth.username).toUpperCase() : '';

  let deleted = 0;
  for (let r = data.length - 1; r >= 1; r--) {
    const toRole = String(data[r][idx.to_role] || '').toUpperCase();
    if (toRole === auth.role || toRole === 'ALL' || (callsign && toRole === callsign)) {
      msgSheet.deleteRow(r + 1);
      deleted++;
    }
  }

  return { ok: true, deleted };
}

function apiGetUnitHistory(token, unitId, hours) {
  _requireAuth_(token);
  const ss = _ss_();

  unitId = String(unitId || '').trim().toUpperCase();
  const h = Math.max(1, Math.min(168, Number(hours || 12)));
  const since = Date.now() - h * 60 * 60 * 1000;

  const sh = ss.getSheetByName(SHEETS.AUDIT);
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return { ok: true, unitId, hours: h, rows: [] };

  const headers = data[0].map(String);
  const idx = _indexMap_(headers);

  const out = [];
  for (let r = data.length - 1; r >= 1; r--) {
    const row = data[r];
    const u = String(row[idx.unit_id] || '').toUpperCase();
    if (u !== unitId) continue;

    const tsCell = row[idx.ts];
    const t = tsCell instanceof Date ? tsCell.getTime() : new Date(tsCell).getTime();
    if (!isFinite(t) || t < since) continue;

    out.push({
      ts: tsCell instanceof Date ? tsCell.toISOString() : String(tsCell || ''),
      action: String(row[idx.action] || ''),
      prev: {
        display_name: row[idx.prev_display_name] || '',
        type: row[idx.prev_type] || '',
        active: row[idx.prev_active],
        status: row[idx.prev_status] || '',
        note: row[idx.prev_note] || '',
        unit_info: row[idx.prev_unit_info] || '',
        incident: row[idx.prev_incident] || '',
        destination: row[idx.prev_destination] || ''
      },
      next: {
        display_name: row[idx.new_display_name] || '',
        type: row[idx.new_type] || '',
        active: row[idx.new_active],
        status: row[idx.new_status] || '',
        note: row[idx.new_note] || '',
        unit_info: row[idx.new_unit_info] || '',
        incident: row[idx.new_incident] || '',
        destination: row[idx.new_destination] || ''
      },
      actor: String(row[idx.actor] || '')
    });
  }

  return { ok: true, unitId, hours: h, rows: out };
}

function apiExportAuditCsv(token, hours) {
  _requireAuth_(token);
  const ss = _ss_();
  const h = Math.max(1, Number(hours || 12));
  const since = Date.now() - h * 60 * 60 * 1000;

  const auditSheet = ss.getSheetByName(SHEETS.AUDIT);
  const vals = auditSheet.getDataRange().getValues();

  const headers = vals[0];
  const rows = [headers];

  const tsIdx = headers.map(String).indexOf('ts');
  for (let i = 1; i < vals.length; i++) {
    const ts = vals[i][tsIdx];
    const t = ts instanceof Date ? ts.getTime() : new Date(ts).getTime();
    if (t >= since) rows.push(vals[i]);
  }

  return { ok: true, filename: `EMS_AUDIT_LAST_${h}H.csv`, csv: _toCsv_(rows) };
}

function apiGetMetrics(token, hours) {
  _requireAuth_(token);
  const ss = _ss_();
  const h = Math.max(1, Number(hours || 24));
  return { ok: true, metrics: _computeMetrics_(ss, h) };
}

/** ====== Internals ====== */

function _ss_() {
  if (CONFIG.SPREADSHEET_ID) return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  return SpreadsheetApp.getActiveSpreadsheet();
}

function _updateSessionActivity_(token) {
  const ss = _ss_();
  const sessionsSheet = ss.getSheetByName(SHEETS.SESSIONS);
  const data = sessionsSheet.getDataRange().getValues();
  const headers = data[0].map(String);
  const idx = _indexMap_(headers);
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idx.session_id] || '') === token) {
      sessionsSheet.getRange(i + 1, idx.last_activity + 1).setValue(new Date());
      break;
    }
  }
}

function _cleanStaleSessions_(ss) {
  const sessionsSheet = ss.getSheetByName(SHEETS.SESSIONS);
  const data = sessionsSheet.getDataRange().getValues();
  if (data.length < 2) return;
  
  const headers = data[0].map(String);
  const idx = _indexMap_(headers);
  const now = new Date();
  const staleThreshold = 12 * 60 * 60 * 1000; // 12 hours in ms
  
  // Delete rows in reverse order to avoid index issues
  for (let i = data.length - 1; i >= 1; i--) {
    const lastActivity = data[i][idx.last_activity];
    if (lastActivity instanceof Date) {
      const age = now - lastActivity;
      if (age > staleThreshold) {
        sessionsSheet.deleteRow(i + 1);
      }
    }
  }
}

function _requireAuth_(token) {
  const cache = CacheService.getScriptCache();
  const raw = cache.get(`token:${token}`);
  if (!raw) throw new Error('NOT AUTHENTICATED (TOKEN EXPIRED).');
  const data = JSON.parse(raw);

  // Refresh the cache token to extend session (prevents 6-hour expiry during active use)
  try {
    cache.put(`token:${token}`, raw, CONFIG.AUTH.TOKEN_TTL_SECONDS);
  } catch (e) {
    // Silently fail if cache refresh fails
  }

  // Update session activity in Sessions sheet
  try {
    _updateSessionActivity_(token);
  } catch (e) {
    // Silently fail if session update fails
  }

  return data;
}

function _normalizeIncidentId_(incidentIdRaw) {
  let inc = String(incidentIdRaw || '').trim().toUpperCase();
  if (!inc) return { ok: false, error: 'MISSING INCIDENT.' };

  // Remove INC prefix
  inc = inc.replace(/^INC\s*/i, '').replace(/^INC/i, '');
  
  // If just 4 digits, auto-add current year
  if (/^\d{4}$/.test(inc)) {
    const year = new Date().getFullYear();
    const yy = String(year).slice(-2);
    inc = `${yy}-${inc}`;
  }
  
  if (!/^\d{2}-\d{4}$/.test(inc)) {
    return { ok: false, error: 'INCIDENT FORMAT MUST BE 26-0001, INC26-0001, OR 0001 (AUTO-YEAR).' };
  }
  return { ok: true, value: inc };
}

function _minutesSince_(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!isFinite(t)) return null;
  return (Date.now() - t) / 60000;
}

function _ensureSheets_() {
  const ss = _ss_();

  if (!ss.getSheetByName(SHEETS.UNITS)) {
    const sh = ss.insertSheet(SHEETS.UNITS);
    sh.appendRow(['unit_id','display_name','type','active','status','note','unit_info','incident','destination','updated_at','updated_by','fcm_token']);
  } else {
    _ensureColumns_(ss.getSheetByName(SHEETS.UNITS), [
      'unit_id','display_name','type','active','status','note','unit_info','incident','destination','updated_at','updated_by','fcm_token'
    ]);
  }

  if (!ss.getSheetByName(SHEETS.AUDIT)) {
    const sh = ss.insertSheet(SHEETS.AUDIT);
    sh.appendRow([
      'ts','unit_id','action',
      'prev_display_name','prev_type','prev_active','prev_status','prev_note','prev_unit_info','prev_incident','prev_destination','prev_updated_at','prev_updated_by',
      'new_display_name','new_type','new_active','new_status','new_note','new_unit_info','new_incident','new_destination','new_updated_at','new_updated_by',
      'actor'
    ]);
  } else {
    _ensureColumns_(ss.getSheetByName(SHEETS.AUDIT), [
      'ts','unit_id','action',
      'prev_display_name','prev_type','prev_active','prev_status','prev_note','prev_unit_info','prev_incident','prev_destination','prev_updated_at','prev_updated_by',
      'new_display_name','new_type','new_active','new_status','new_note','new_unit_info','new_incident','new_destination','new_updated_at','new_updated_by',
      'actor'
    ]);
  }

  if (!ss.getSheetByName(SHEETS.INCIDENTS)) {
    const sh = ss.insertSheet(SHEETS.INCIDENTS);
    sh.appendRow(['incident_id','created_at','created_by','status','units','destination','incident_note','last_update','updated_by','incident_type']);
  } else {
    _ensureColumns_(ss.getSheetByName(SHEETS.INCIDENTS), [
      'incident_id','created_at','created_by','status','units','destination','incident_note','last_update','updated_by','incident_type'
    ]);
  }

  if (!ss.getSheetByName(SHEETS.INCIDENT_AUDIT)) {
    const sh = ss.insertSheet(SHEETS.INCIDENT_AUDIT);
    sh.appendRow(['ts','incident_id','message','actor']);
  }

  if (!ss.getSheetByName(SHEETS.DESTS)) {
    const sh = ss.insertSheet(SHEETS.DESTS);
    sh.appendRow(['code','name']);
    sh.appendRow(['MADRAS ED','MADRAS ED']);
    sh.appendRow(['RD ED','REDMOND ED']);
    sh.appendRow(['BEND ED','BEND ED']);
    sh.appendRow(['ST CH','ST CHARLES']);
  }

  if (!ss.getSheetByName(SHEETS.META)) {
    const sh = ss.insertSheet(SHEETS.META);
    sh.appendRow(['key','value']);
    sh.appendRow(['incident_counter_year','']);
    sh.appendRow(['incident_counter_value','0']);
    sh.appendRow(['banner_note','']);
    sh.appendRow(['banner_alert','']);
  } else {
    const sh = ss.getSheetByName(SHEETS.META);
    const vals = sh.getDataRange().getValues();
    const keys = new Set(vals.slice(1).map(r => String(r[0] || '')));
    if (!keys.has('banner_note')) sh.appendRow(['banner_note','']);
    if (!keys.has('banner_alert')) sh.appendRow(['banner_alert','']);
  }

  if (!ss.getSheetByName(SHEETS.MESSAGES)) {
    const sh = ss.insertSheet(SHEETS.MESSAGES);
    sh.appendRow(['message_id','ts','from_role','from_initials','to_role','message','urgent','read']);
  } else {
    _ensureColumns_(ss.getSheetByName(SHEETS.MESSAGES), [
      'message_id','ts','from_role','from_initials','to_role','message','urgent','read'
    ]);
  }
  
  if (!ss.getSheetByName(SHEETS.USERS)) {
    const sh = ss.insertSheet(SHEETS.USERS);
    sh.appendRow(['username','first_name','last_name','password','created_at','created_by']);
    // Pre-load initial users (password: 12345)
    const initialUsers = [
      ['holdenc', 'CHRISTIAN', 'HOLDEN', '12345'],
      ['holdenc2', 'CHRIS', 'HOLDEN', '12345'],
      ['lawsonm', 'MARGARET', 'LAWSON', '12345'],
      ['ginabrede', 'ELISA', 'GINABREDA', '12345'],
      ['magnusonm', 'MICHELE', 'MAGNUSON', '12345'],
      ['smileya', 'AMANDA', 'SMILEY', '12345'],
      ['peterse', 'ERIKA', 'PETERS', '12345'],
      ['test1', 'TEST', 'USER1', '12345'],
      ['test2', 'TEST', 'USER2', '12345'],
      ['test3', 'TEST', 'USER3', '12345']
    ];
    initialUsers.forEach(u => {
      sh.appendRow([u[0], u[1], u[2], u[3], new Date(), 'SYSTEM']);
    });
  } else {
    _ensureColumns_(ss.getSheetByName(SHEETS.USERS), [
      'username','first_name','last_name','password','created_at','created_by'
    ]);
  }
  
  if (!ss.getSheetByName(SHEETS.SESSIONS)) {
    const sh = ss.insertSheet(SHEETS.SESSIONS);
    sh.appendRow(['session_id','username','full_name','role','login_time','last_activity']);
  } else {
    _ensureColumns_(ss.getSheetByName(SHEETS.SESSIONS), [
      'session_id','username','full_name','role','login_time','last_activity'
    ]);
  }

  if (!ss.getSheetByName(SHEETS.ADDRESSES)) {
    const sh = ss.insertSheet(SHEETS.ADDRESSES);
    sh.appendRow(['addr_id','name','address','city','state','zip','category','aliases','phone','notes']);
    _seedAddresses_(sh);
  } else {
    _ensureColumns_(ss.getSheetByName(SHEETS.ADDRESSES), [
      'addr_id','name','address','city','state','zip','category','aliases','phone','notes'
    ]);
  }
}

function _ensureColumns_(sheet, requiredHeaders) {
  const range = sheet.getDataRange();
  const values = range.getValues();
  if (!values.length) {
    sheet.appendRow(requiredHeaders);
    return;
  }
  const headers = values[0].map(h => String(h || '').trim());
  const existing = new Set(headers);

  const missing = requiredHeaders.filter(h => !existing.has(h));
  if (missing.length) {
    sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
  }
}

function _seedAddresses_(sh) {
  var data = [
    ['SCB','ST. CHARLES BEND','2500 NE NEFF RD','BEND','OR','97701','HOSPITAL','scb|st charles bend|sc bend|stcb','541-382-4321','LEVEL 2 TRAUMA CENTER'],
    ['SCR','ST. CHARLES REDMOND','1253 NW CANAL BLVD','REDMOND','OR','97756','HOSPITAL','scr|st charles redmond|sc redmond|stcr','541-548-8131','LEVEL 3 TRAUMA CENTER'],
    ['SCP','ST. CHARLES PRINEVILLE','384 SE COMBS FLAT RD','PRINEVILLE','OR','97754','HOSPITAL','scp|st charles prineville|sc prineville|stcp','541-447-6254','CRITICAL ACCESS HOSPITAL'],
    ['SCM','ST. CHARLES MADRAS','470 NE A ST','MADRAS','OR','97741','HOSPITAL','scm|st charles madras|sc madras|stcm','541-475-3882','CRITICAL ACCESS HOSPITAL'],
    ['LEM','LEGACY EMANUEL MEDICAL CENTER','2801 N GANTENBEIN AVE','PORTLAND','OR','97227','HOSPITAL','lem|legacy emanuel|emanuel|leg em','503-413-2200','LEVEL 1 TRAUMA, BURN CENTER'],
    ['LGS','LEGACY GOOD SAMARITAN MEDICAL CENTER','1015 NW 22ND AVE','PORTLAND','OR','97210','HOSPITAL','lgs|legacy good sam|good sam|leg gs','503-413-7711',''],
    ['LMP','LEGACY MERIDIAN PARK MEDICAL CENTER','19300 SW 65TH AVE','TUALATIN','OR','97062','HOSPITAL','lmp|legacy meridian|meridian park|leg mp','503-692-1212',''],
    ['LMH','LEGACY MOUNT HOOD MEDICAL CENTER','24800 SE STARK ST','GRESHAM','OR','97030','HOSPITAL','lmh|legacy mt hood|mount hood|leg mh','503-674-1122',''],
    ['LSM','LEGACY SILVERTON MEDICAL CENTER','342 FAIRVIEW ST','SILVERTON','OR','97381','HOSPITAL','lsm|legacy silverton|leg sil','503-873-1500',''],
    ['OHSU','OHSU HOSPITAL AND CLINICS','3181 SW SAM JACKSON PARK RD','PORTLAND','OR','97239','HOSPITAL','ohsu|oregon health science|ohsu hospital','503-494-8311','LEVEL 1 TRAUMA, ACADEMIC MEDICAL CENTER'],
    ['KS','KAISER SUNNYSIDE MEDICAL CENTER','10180 SE SUNNYSIDE RD','CLACKAMAS','OR','97015','HOSPITAL','ks|kaiser sunnyside|kaiser sunny','503-652-2880',''],
    ['KW','KAISER WESTSIDE MEDICAL CENTER','2875 NE STUCKI AVE','HILLSBORO','OR','97124','HOSPITAL','kw|kaiser westside|kaiser west','971-310-1000',''],
    ['PSVMC','PROVIDENCE ST. VINCENT MEDICAL CENTER','9205 SW BARNES RD','PORTLAND','OR','97225','HOSPITAL','psvmc|st vincent|providence st vincent|prov sv','503-216-1234',''],
    ['PPMC','PROVIDENCE PORTLAND MEDICAL CENTER','4805 NE GLISAN ST','PORTLAND','OR','97213','HOSPITAL','ppmc|providence portland|prov pdx','503-215-1111',''],
    ['PMIL','PROVIDENCE MILWAUKIE HOSPITAL','10150 SE 32ND AVE','MILWAUKIE','OR','97222','HOSPITAL','pmil|providence milwaukie|prov mil','503-513-8300',''],
    ['PWFMC','PROVIDENCE WILLAMETTE FALLS MEDICAL CENTER','1500 DIVISION ST','OREGON CITY','OR','97045','HOSPITAL','pwfmc|willamette falls|prov wf','503-656-1631',''],
    ['PNMC','PROVIDENCE NEWBERG MEDICAL CENTER','1001 PROVIDENCE DR','NEWBERG','OR','97132','HOSPITAL','pnmc|providence newberg|prov newberg','503-537-1555',''],
    ['PSEA','PROVIDENCE SEASIDE HOSPITAL','725 S WAHANNA RD','SEASIDE','OR','97138','HOSPITAL','psea|providence seaside|prov seaside','503-717-7000',''],
    ['PHRMH','PROVIDENCE HOOD RIVER MEMORIAL HOSPITAL','810 12TH ST','HOOD RIVER','OR','97031','HOSPITAL','phrmh|providence hood river|prov hr','541-386-3911',''],
    ['PMMC','PROVIDENCE MEDFORD MEDICAL CENTER','1111 CRATER LAKE AVE','MEDFORD','OR','97504','HOSPITAL','pmmc|providence medford|prov medford','541-732-5000',''],
    ['SHRB','SACRED HEART RIVERBEND','3333 RIVERBEND DR','SPRINGFIELD','OR','97477','HOSPITAL','shrb|sacred heart|riverbend|sh riverbend','541-222-7300','LEVEL 2 TRAUMA CENTER'],
    ['MWMC','MCKENZIE-WILLAMETTE MEDICAL CENTER','1460 G ST','SPRINGFIELD','OR','97477','HOSPITAL','mwmc|mckenzie willamette|mck wil','541-726-4400',''],
    ['PHMC','PEACE HARBOR MEDICAL CENTER','400 9TH ST','FLORENCE','OR','97439','HOSPITAL','phmc|peace harbor|peace harbor florence','541-997-8412',''],
    ['CGCMC','PEACEHEALTH COTTAGE GROVE COMMUNITY MEDICAL CENTER','1515 VILLAGE DR','COTTAGE GROVE','OR','97424','HOSPITAL','cgcmc|cottage grove|peacehealth cg','541-942-0511',''],
    ['GSRMC','GOOD SAMARITAN REGIONAL MEDICAL CENTER','3600 NW SAMARITAN DR','CORVALLIS','OR','97330','HOSPITAL','gsrmc|good sam corvallis|sam corvallis','541-768-5111',''],
    ['SAGH','SAMARITAN ALBANY GENERAL HOSPITAL','1046 6TH AVE SW','ALBANY','OR','97321','HOSPITAL','sagh|albany general|sam albany','541-812-4000',''],
    ['SLCH','SAMARITAN LEBANON COMMUNITY HOSPITAL','525 N SANTIAM HWY','LEBANON','OR','97355','HOSPITAL','slch|lebanon community|sam lebanon','541-258-2101',''],
    ['SNLH','SAMARITAN NORTH LINCOLN HOSPITAL','3043 NE 28TH ST','LINCOLN CITY','OR','97367','HOSPITAL','snlh|north lincoln|sam lincoln','541-994-3661',''],
    ['SPCH','SAMARITAN PACIFIC COMMUNITY HOSPITAL','930 SW ABBEY ST','NEWPORT','OR','97365','HOSPITAL','spch|pacific community|sam newport','541-265-2244',''],
    ['SH','SALEM HOSPITAL','890 OAK ST SE','SALEM','OR','97301','HOSPITAL','sh|salem hospital|salem health','503-561-5200',''],
    ['SHWV','SALEM HEALTH WEST VALLEY','525 SE WASHINGTON ST','DALLAS','OR','97338','HOSPITAL','shwv|west valley|salem west valley','503-623-8301',''],
    ['STHC','SANTIAM HOSPITAL & CLINICS','1401 N 10TH AVE','STAYTON','OR','97383','HOSPITAL','sthc|santiam hospital|santiam stayton','503-769-2175',''],
    ['HMC','HILLSBORO MEDICAL CENTER','335 SE 8TH AVE','HILLSBORO','OR','97123','HOSPITAL','hmc|hillsboro medical|hillsboro hospital','503-681-1111',''],
    ['WVMC','WILLAMETTE VALLEY MEDICAL CENTER','2700 SE STRATUS AVE','MCMINNVILLE','OR','97128','HOSPITAL','wvmc|willamette valley mc|wvmc mcminnville','503-472-6131',''],
    ['AACH','ASANTE ASHLAND COMMUNITY HOSPITAL','280 MAPLE ST','ASHLAND','OR','97520','HOSPITAL','aach|asante ashland|ashland hospital','541-201-4000',''],
    ['ARRMC','ASANTE ROGUE REGIONAL MEDICAL CENTER','2825 E BARNETT RD','MEDFORD','OR','97504','HOSPITAL','arrmc|rogue regional|asante medford','541-789-7000',''],
    ['ATRMC','ASANTE THREE RIVERS MEDICAL CENTER','500 SW RAMSEY AVE','GRANTS PASS','OR','97527','HOSPITAL','atrmc|three rivers|asante grants pass','541-472-7000',''],
    ['MMC','MERCY MEDICAL CENTER','2700 NW STEWART PKWY','ROSEBURG','OR','97471','HOSPITAL','mmc|mercy roseburg|mercy medical','541-673-0611',''],
    ['SKY','SKY LAKES MEDICAL CENTER','2865 DAGGETT AVE','KLAMATH FALLS','OR','97601','HOSPITAL','sky|sky lakes|sky lakes kf','541-882-6311',''],
    ['BAH','BAY AREA HOSPITAL','1775 THOMPSON RD','COOS BAY','OR','97420','HOSPITAL','bah|bay area hospital|bay area coos bay','541-269-8111',''],
    ['CVH','COQUILLE VALLEY HOSPITAL','940 E 5TH ST','COQUILLE','OR','97423','HOSPITAL','cvh|coquille valley|coquille hospital','541-396-3101',''],
    ['SCHHC','SOUTHERN COOS HOSPITAL & HEALTH CENTER','900 11TH ST SE','BANDON','OR','97411','HOSPITAL','schhc|southern coos|bandon hospital','541-347-2426',''],
    ['CGH','CURRY GENERAL HOSPITAL','94220 FOURTH ST','GOLD BEACH','OR','97444','HOSPITAL','cgh|curry general|gold beach hospital','541-247-3000',''],
    ['SCH','SUTTER COAST HOSPITAL','555 5TH ST','BROOKINGS','OR','97415','HOSPITAL','sch|sutter coast|brookings hospital','541-469-4626',''],
    ['LUHD','LOWER UMPQUA HOSPITAL DISTRICT','600 RANCH RD','REEDSPORT','OR','97467','HOSPITAL','luhd|lower umpqua|reedsport hospital','541-271-2171',''],
    ['CMH','COLUMBIA MEMORIAL HOSPITAL','2111 EXCHANGE ST','ASTORIA','OR','97103','HOSPITAL','cmh|columbia memorial|astoria hospital','503-325-4321',''],
    ['AHT','ADVENTIST HEALTH TILLAMOOK','1000 THIRD ST','TILLAMOOK','OR','97141','HOSPITAL','aht|adventist tillamook|tillamook hospital','503-842-4444',''],
    ['AHCG','ADVENTIST HEALTH COLUMBIA GORGE','1700 E 19TH ST','THE DALLES','OR','97058','HOSPITAL','ahcg|adventist columbia gorge|the dalles hospital','541-296-1111',''],
    ['AHP','ADVENTIST HEALTH PORTLAND','10123 SE MARKET ST','PORTLAND','OR','97216','HOSPITAL','ahp|adventist portland|adv portland','503-257-2500',''],
    ['SAH','ST. ANTHONY HOSPITAL','2801 ST ANTHONY WAY','PENDLETON','OR','97801','HOSPITAL','sah|st anthony|pendleton hospital','541-276-5121',''],
    ['GSMC','GOOD SHEPHERD MEDICAL CENTER','610 NW 11TH ST','HERMISTON','OR','97838','HOSPITAL','gsmc|good shepherd|hermiston hospital','541-667-3400',''],
    ['GRH','GRANDE RONDE HOSPITAL','900 SUNSET DR','LA GRANDE','OR','97850','HOSPITAL','grh|grande ronde|la grande hospital','541-963-8421',''],
    ['WMH','WALLOWA MEMORIAL HOSPITAL','601 MEDICAL PKWY','ENTERPRISE','OR','97828','HOSPITAL','wmh|wallowa memorial|enterprise hospital','541-426-3111',''],
    ['PMH','PIONEER MEMORIAL HOSPITAL','564 E PIONEER DR','HEPPNER','OR','97836','HOSPITAL','pmh|pioneer memorial|heppner hospital','541-676-9133',''],
    ['SAMCBC','SAINT ALPHONSUS MEDICAL CENTER BAKER CITY','3325 POCAHONTAS RD','BAKER CITY','OR','97814','HOSPITAL','samcbc|st alphonsus baker|baker city hospital','541-523-6461',''],
    ['SAMCO','SAINT ALPHONSUS MEDICAL CENTER ONTARIO','351 SW 9TH ST','ONTARIO','OR','97914','HOSPITAL','samco|st alphonsus ontario|ontario hospital','541-881-7000',''],
    ['BMH','BLUE MOUNTAIN HOSPITAL','170 FORD RD','JOHN DAY','OR','97845','HOSPITAL','bmh|blue mountain|john day hospital','541-575-1311',''],
    ['HDH','HARNEY DISTRICT HOSPITAL','557 W WASHINGTON ST','BURNS','OR','97720','HOSPITAL','hdh|harney district|burns hospital','541-573-7281',''],
    ['LDH','LAKE DISTRICT HOSPITAL','700 S J ST','LAKEVIEW','OR','97630','HOSPITAL','ldh|lake district|lakeview hospital','541-947-2114',''],
    ['UCB-E','SUMMIT HEALTH URGENT CARE EASTSIDE','1501 NE MEDICAL CENTER DR','BEND','OR','97701','URGENT_CARE','ucbe|summit eastside|summit urgent bend','541-382-2811',''],
    ['UCB-OM','SUMMIT HEALTH URGENT CARE OLD MILL','815 SW BOND ST','BEND','OR','97702','URGENT_CARE','ucbom|summit old mill|summit urgent old mill','541-749-4900',''],
    ['UCR-BM','BESTMED URGENT CARE REDMOND','1555 S HWY 97 #101','REDMOND','OR','97756','URGENT_CARE','ucrbm|bestmed redmond|bestmed urgent redmond','541-548-1125',''],
    ['UCB-BM','BESTMED URGENT CARE BEND','108 NW SISEMORE ST #120','BEND','OR','97703','URGENT_CARE','ucbbm|bestmed bend|bestmed urgent bend','541-549-2588',''],
    ['UCB-HL','HIGH LAKES URGENT CARE BEND','2175 NW SHEVLIN PARK RD','BEND','OR','97703','URGENT_CARE','ucbhl|high lakes bend|high lakes urgent bend','541-389-7741',''],
    ['UCR-HL','HIGH LAKES URGENT CARE REDMOND','645 NW 4TH ST','REDMOND','OR','97756','URGENT_CARE','ucrhl|high lakes redmond|high lakes urgent redmond','541-504-1048',''],
    ['BTC','BEND TRANSITIONAL CARE','900 NE 27TH ST','BEND','OR','97701','SNF','btc|bend transitional|bend trans care','541-382-0479','60 BEDS'],
    ['PBR','PILOT BUTTE REHABILITATION CENTER','1876 NE HWY 20','BEND','OR','97701','SNF','pbr|pilot butte rehab|pilot butte','541-382-5882','74 BEDS'],
    ['RCO','REGENCY CARE OF CENTRAL OREGON','119 SE WILSON AVE','BEND','OR','97702','SNF','rco|regency bend|regency care bend','541-382-0832','87 BEDS'],
    ['RRR','REGENCY REDMOND REHABILITATION','3025 SW RESERVOIR DR','REDMOND','OR','97756','SNF','rrr|regency redmond|regency rehab redmond','541-548-8766','50 BEDS'],
    ['BF301','BEND FIRE STATION 301 HQ','1212 SW SIMPSON AVE','BEND','OR','97702','FIRE_STATION','bf301|bend fire 301|bend station 1','541-322-6300','HQ'],
    ['BF302','BEND FIRE STATION 302','63030 OB RILEY RD','BEND','OR','97703','FIRE_STATION','bf302|bend fire 302|bend station 2','541-322-6300',''],
    ['BF303','BEND FIRE STATION 303','21475 BEAR CREEK RD','BEND','OR','97701','FIRE_STATION','bf303|bend fire 303|bend station 3','541-322-6300',''],
    ['BF304','BEND FIRE STATION 304','255 SE 15TH ST','BEND','OR','97702','FIRE_STATION','bf304|bend fire 304|bend station 4','541-322-6300',''],
    ['BF305','BEND FIRE STATION 305','62620 HAMBY RD','BEND','OR','97701','FIRE_STATION','bf305|bend fire 305|bend station 5','541-322-6300',''],
    ['BF306','BEND FIRE STATION 306','60363 BROOKSWOOD BLVD','BEND','OR','97702','FIRE_STATION','bf306|bend fire 306|bend station 6','541-322-6300',''],
    ['RF401','REDMOND FIRE STATION 401 HQ','341 NW DOGWOOD AVE','REDMOND','OR','97756','FIRE_STATION','rf401|redmond fire 401|redmond station 1','541-504-5000','HQ'],
    ['RF403','REDMOND FIRE STATION 403','2000 SW CANAL BLVD','REDMOND','OR','97756','FIRE_STATION','rf403|redmond fire 403|redmond station 3','541-504-5000',''],
    ['CCF1201','CROOK COUNTY FIRE STATION 1201','500 NE BELKNAP ST','PRINEVILLE','OR','97754','FIRE_STATION','ccf1201|crook fire 1201|prineville fire','541-447-5011','HQ'],
    ['CCF1202','CROOK COUNTY FIRE STATION 1202','12699 SW POWELL BUTTE HWY','POWELL BUTTE','OR','97753','FIRE_STATION','ccf1202|crook fire 1202|powell butte fire','541-447-5011',''],
    ['CCF1203','CROOK COUNTY FIRE STATION 1203','10255 SE JUNIPER CANYON RD','PRINEVILLE','OR','97754','FIRE_STATION','ccf1203|crook fire 1203|juniper canyon fire','541-447-5011',''],
    ['JCF1','JEFFERSON COUNTY FIRE STATION 1 HQ','777 SW BUFF ST','MADRAS','OR','97741','FIRE_STATION','jcf1|jefferson fire 1|madras fire','541-475-7274','HQ'],
    ['JCF2','JEFFERSON COUNTY FIRE STATION 2','405 1ST AVE','CULVER','OR','97734','FIRE_STATION','jcf2|jefferson fire 2|culver fire','541-475-7274',''],
    ['DCSO','DESCHUTES COUNTY SHERIFF','63333 W HWY 20','BEND','OR','97703','LAW_ENFORCEMENT','dcso|deschutes sheriff|deschutes county so','541-388-6655',''],
    ['DCJ','DESCHUTES COUNTY ADULT JAIL','63333 W HWY 20','BEND','OR','97703','JAIL','dcj|deschutes jail|deschutes county jail','541-388-6661',''],
    ['CCSO','CROOK COUNTY SHERIFF','260 NW 2ND ST #100','PRINEVILLE','OR','97754','LAW_ENFORCEMENT','ccso|crook sheriff|crook county so','541-447-6398',''],
    ['CCJ','CROOK COUNTY JAIL','308 NE 2ND ST','PRINEVILLE','OR','97754','JAIL','ccj|crook jail|crook county jail','541-447-4151',''],
    ['JCSO','JEFFERSON COUNTY SHERIFF','675 NW CHERRY LN','MADRAS','OR','97741','LAW_ENFORCEMENT','jcso|jefferson sheriff|jefferson county so','541-475-6520',''],
    ['JCJ','JEFFERSON COUNTY JAIL','675 NW CHERRY LN','MADRAS','OR','97741','JAIL','jcj|jefferson jail|jefferson county jail','541-475-6520',''],
    ['PPD','PRINEVILLE POLICE DEPARTMENT','1251 NE ELM ST','PRINEVILLE','OR','97754','LAW_ENFORCEMENT','ppd|prineville police|prineville pd','541-447-4168',''],
    ['RDM-AP','ROBERTS FIELD REDMOND MUNICIPAL AIRPORT','2522 SE JESSE BUTLER CIR','REDMOND','OR','97756','AIRPORT','rdmap|roberts field|redmond airport|rdm airport','541-548-0646',''],
    ['BDN-AP','BEND MUNICIPAL AIRPORT','63132 POWELL BUTTE RD','BEND','OR','97701','AIRPORT','bdnap|bend airport|bend municipal airport','541-388-6211',''],
    ['AL-B','AIRLINK BEND HELICOPTER','2500 NE NEFF RD','BEND','OR','97701','AIR_AMBULANCE','alb|airlink bend|airlink helicopter|al bend','541-382-4321','EC-135 HELICOPTER'],
    ['AL-BMA','AIRLINK BEND FIXED WING','63132 POWELL BUTTE RD','BEND','OR','97701','AIR_AMBULANCE','albma|airlink fixed wing|airlink fw|al fw','541-382-4321','PILATUS PC-12 FIXED WING'],
    ['LF-R','LIFE FLIGHT NETWORK REDMOND','2522 SE JESSE BUTLER CIR','REDMOND','OR','97756','AIR_AMBULANCE','lfr|life flight redmond|life flight|lifeflight','541-548-0646','AGUSTA A-119 HELICOPTER'],
    ['DLY-R','FRESENIUS KIDNEY CARE REDMOND','916 SW 17TH ST #100','REDMOND','OR','97756','DIALYSIS','dlyr|fresenius redmond|dialysis redmond','541-548-0848',''],
    ['DLY-B','DAVITA DESCHUTES RIVER DIALYSIS','61280 SE COOMBS PL','BEND','OR','97702','DIALYSIS','dlyb|davita bend|dialysis bend|davita deschutes','541-617-4747','']
  ];
  sh.getRange(2, 1, data.length, 10).setValues(data);
}

function _readAddresses_(ss) {
  var sh = ss.getSheetByName(SHEETS.ADDRESSES);
  if (!sh) return [];
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0].map(String);
  var idx = _indexMap_(headers);
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var id = String(row[idx.addr_id] || '').trim().toUpperCase();
    if (!id) continue;
    var aliasStr = String(row[idx.aliases] || '');
    result.push({
      id: id,
      name: String(row[idx.name] || '').trim().toUpperCase(),
      address: String(row[idx.address] || '').trim().toUpperCase(),
      city: String(row[idx.city] || '').trim().toUpperCase(),
      state: String(row[idx.state] || '').trim().toUpperCase(),
      zip: String(row[idx.zip] || '').trim(),
      category: String(row[idx.category] || '').trim().toUpperCase(),
      aliases: aliasStr ? aliasStr.toLowerCase().split('|').map(function(a) { return a.trim(); }).filter(Boolean) : [],
      phone: String(row[idx.phone] || '').trim(),
      notes: String(row[idx.notes] || '').trim().toUpperCase()
    });
  }
  return result;
}

function apiGetAddresses(token) {
  _requireAuth_(token);
  var ss = _ss_();
  return { ok: true, addresses: _readAddresses_(ss) };
}

function _indexMap_(headers) {
  const map = {};
  headers.forEach((h, i) => {
    const key = String(h).trim().toLowerCase();
    if (key) map[key] = i;
  });
  return map;
}

function _findRowBy_(values, colIndex, needle) {
  if (colIndex === undefined || colIndex === null || colIndex < 0) return -1;
  const n = String(needle).toUpperCase();
  for (let r = 1; r < values.length; r++) {
    const v = String(values[r][colIndex] || '').toUpperCase();
    if (v === n) return r;
  }
  return -1;
}

function _isValidStatus_(code) {
  return CONFIG.STATUSES.some(s => s.code === code);
}

function _rowToUnit_(row, idx) {
  return {
    unit_id: String(row[idx.unit_id] || '').toUpperCase(),
    display_name: String(row[idx.display_name] || '').trim(),
    type: String(row[idx.type] || '').trim(),
    active: row[idx.active] === true || row[idx.active] === 'TRUE',
    status: String(row[idx.status] || 'AV').toUpperCase(),
    note: String(row[idx.note] || ''),
    unit_info: String(row[idx.unit_info] || ''),
    incident: String(row[idx.incident] || '').trim(),
    destination: String(row[idx.destination] || '').trim(),
    updated_at: String(row[idx.updated_at] || ''),
    updated_by: String(row[idx.updated_by] || ''),
    fcm_token: String(row[idx.fcm_token] || '')
  };
}

function _unitToRow_(u, idx) {
  const row = [];
  const keys = ['unit_id','display_name','type','active','status','note','unit_info','incident','destination','updated_at','updated_by','fcm_token'];
  const maxIdx = Math.max(...keys.map(k => idx[k] || 0));

  for (let i = 0; i <= maxIdx; i++) row[i] = '';

  row[idx.unit_id] = u.unit_id;
  row[idx.display_name] = u.display_name;
  row[idx.type] = u.type;
  row[idx.active] = u.active;
  row[idx.status] = u.status;
  row[idx.note] = u.note;
  row[idx.unit_info] = u.unit_info;
  row[idx.incident] = u.incident;
  row[idx.destination] = u.destination;
  row[idx.updated_at] = u.updated_at;
  row[idx.updated_by] = u.updated_by;
  row[idx.fcm_token] = u.fcm_token || '';

  return row;
}

function _readUnits_(ss) {
  const sh = ss.getSheetByName(SHEETS.UNITS);
  const vals = sh.getDataRange().getValues();
  if (vals.length < 2) return [];

  const headers = vals[0].map(String);
  const idx = _indexMap_(headers);

  const out = [];
  for (let r = 1; r < vals.length; r++) {
    const u = _rowToUnit_(vals[r], idx);
    if (!u.unit_id) continue;
    delete u.fcm_token; // strip sensitive token from public API response
    out.push(u);
  }
  out.sort((a,b) => (b.active - a.active) || a.unit_id.localeCompare(b.unit_id));
  return out;
}

function _readIncidents_(ss) {
  const sh = ss.getSheetByName(SHEETS.INCIDENTS);
  const vals = sh.getDataRange().getValues();
  if (vals.length < 2) return [];

  const headers = vals[0].map(String);
  const idx = _indexMap_(headers);

  const out = [];
  for (let r = 1; r < vals.length; r++) {
    const row = vals[r];
    const id = String(row[idx.incident_id] || '').trim();
    if (!id) continue;

    out.push({
      incident_id: id,
      created_at: row[idx.created_at] instanceof Date ? row[idx.created_at].toISOString() : String(row[idx.created_at] || ''),
      created_by: String(row[idx.created_by] || ''),
      status: String(row[idx.status] || 'ACTIVE'),
      units: String(row[idx.units] || ''),
      destination: String(row[idx.destination] || ''),
      incident_note: String(row[idx.incident_note] || ''),
      last_update: row[idx.last_update] instanceof Date ? row[idx.last_update].toISOString() : String(row[idx.last_update] || ''),
      updated_by: String(row[idx.updated_by] || ''),
      incident_type: String(row[idx.incident_type] || '')
    });
  }
  return out;
}

function _readDestinations_(ss) {
  const sh = ss.getSheetByName(SHEETS.DESTS);
  const vals = sh.getDataRange().getValues();
  const out = [];
  for (let r = 1; r < vals.length; r++) {
    const code = String(vals[r][0] || '').trim().toUpperCase();
    const name = String(vals[r][1] || '').trim().toUpperCase();
    if (!code) continue;
    out.push({ code, name: name || code });
  }
  return out;
}

function _readMessages_(ss, userRole, username) {
  const sh = ss.getSheetByName(SHEETS.MESSAGES);
  const vals = sh.getDataRange().getValues();
  if (vals.length < 2) return [];

  const headers = vals[0].map(String);
  const idx = _indexMap_(headers);

  // For UNIT-role users, also match messages where to_role equals their callsign (username)
  const callsign = (userRole === 'UNIT' && username) ? String(username).toUpperCase() : '';

  const out = [];
  for (let r = 1; r < vals.length; r++) {
    const row = vals[r];
    const toRole = String(row[idx.to_role] || '').toUpperCase();

    if (toRole !== userRole && toRole !== 'ALL' && !(callsign && toRole === callsign)) continue;

    out.push({
      message_id: String(row[idx.message_id] || ''),
      ts: row[idx.ts] instanceof Date ? row[idx.ts].toISOString() : String(row[idx.ts] || ''),
      from_role: String(row[idx.from_role] || ''),
      from_initials: String(row[idx.from_initials] || ''),
      to_role: toRole,
      message: String(row[idx.message] || ''),
      urgent: row[idx.urgent] === true || row[idx.urgent] === 'TRUE',
      read: row[idx.read] === true || row[idx.read] === 'TRUE'
    });
  }

  out.sort((a,b) => new Date(b.ts) - new Date(a.ts));
  return out;
}

function _appendAudit_(ss, actor, before, after, actionOverride) {
  const sh = ss.getSheetByName(SHEETS.AUDIT);
  const data = sh.getDataRange().getValues();
  const headers = data[0].map(String);
  const idx = _indexMap_(headers);

  const action =
    actionOverride ||
    (!before ? 'CREATE' :
      (before.active && !after.active ? 'LOGOFF' :
        (!before.active && after.active ? 'LOGON' : 'UPDATE')));

  const prev = before || {
    display_name: '', type: '', active: '', status: '', note: '', unit_info: '',
    incident: '', destination: '', updated_at: '', updated_by: ''
  };

  const row = new Array(headers.length).fill('');

  function set(col, val) {
    const i = idx[col];
    if (typeof i === 'number' && i >= 0) row[i] = val;
  }

  set('ts', new Date());
  set('unit_id', after.unit_id);
  set('action', action);

  set('prev_display_name', prev.display_name);
  set('prev_type', prev.type);
  set('prev_active', prev.active);
  set('prev_status', prev.status);
  set('prev_note', prev.note);
  set('prev_unit_info', prev.unit_info);
  set('prev_incident', prev.incident);
  set('prev_destination', prev.destination);
  set('prev_updated_at', prev.updated_at);
  set('prev_updated_by', prev.updated_by);

  set('new_display_name', after.display_name);
  set('new_type', after.type);
  set('new_active', after.active);
  set('new_status', after.status);
  set('new_note', after.note);
  set('new_unit_info', after.unit_info);
  set('new_incident', after.incident);
  set('new_destination', after.destination);
  set('new_updated_at', after.updated_at);
  set('new_updated_by', after.updated_by);

  set('actor', actor);

  sh.appendRow(row);
}

function _generateIncidentId_(ss) {
  const year = new Date().getFullYear();
  const yy = String(year).slice(-2);

  const meta = ss.getSheetByName(SHEETS.META);
  const vals = meta.getDataRange().getValues();

  let rowYear = -1, rowVal = -1;
  for (let r = 1; r < vals.length; r++) {
    if (vals[r][0] === 'incident_counter_year') rowYear = r;
    if (vals[r][0] === 'incident_counter_value') rowVal = r;
  }

  let storedYear = rowYear > 0 ? String(vals[rowYear][1] || '') : '';
  let counter = rowVal > 0 ? Number(vals[rowVal][1] || 0) : 0;

  if (storedYear !== String(year)) {
    storedYear = String(year);
    counter = 0;
  }
  counter += 1;

  if (rowYear > 0) meta.getRange(rowYear + 1, 2).setValue(storedYear);
  if (rowVal > 0) meta.getRange(rowVal + 1, 2).setValue(String(counter));

  return `${yy}-${String(counter).padStart(4,'0')}`;
}

function _syncIncidents_(ss, before, after, actorStr) {
  const sh = ss.getSheetByName(SHEETS.INCIDENTS);
  const data = sh.getDataRange().getValues();
  const headers = data[0].map(String);
  const idx = _indexMap_(headers);

  const unitId = after.unit_id;

  // If incident changed, remove unit from old incident
  if (before && String(before.incident || '') !== String(after.incident || '')) {
    const oldInc = String(before.incident || '').trim();
    if (oldInc) {
      const r = _findRowBy_(data, idx.incident_id, oldInc);
      if (r > 0) {
        const units = String(data[r][idx.units] || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
          .filter(u => u.toUpperCase() !== unitId.toUpperCase());

        sh.getRange(r + 1, idx.units + 1).setValue(units.join(', '));
        sh.getRange(r + 1, idx.last_update + 1).setValue(new Date());
        sh.getRange(r + 1, idx.updated_by + 1).setValue(actorStr);
        if (units.length === 0) sh.getRange(r + 1, idx.status + 1).setValue('CLOSED');
      }
    }
  }

  if (!after.incident) return;

  const incidentId = String(after.incident).trim();
  if (!incidentId) return;

  let incidentRow = _findRowBy_(data, idx.incident_id, incidentId);

  if (incidentRow < 1) {
    const row = new Array(headers.length).fill('');
    row[idx.incident_id] = incidentId;
    row[idx.created_at] = new Date();
    row[idx.created_by] = actorStr;
    row[idx.status] = 'ACTIVE';
    row[idx.units] = unitId;
    row[idx.destination] = after.destination || '';
    row[idx.incident_note] = '';
    row[idx.last_update] = new Date();
    row[idx.updated_by] = actorStr;
    sh.appendRow(row);
    return;
  }

  const units = String(data[incidentRow][idx.units] || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  if (!units.some(u => u.toUpperCase() === unitId.toUpperCase())) units.push(unitId);

  sh.getRange(incidentRow + 1, idx.status + 1).setValue('ACTIVE');
  sh.getRange(incidentRow + 1, idx.units + 1).setValue(units.join(', '));
  if (after.destination) sh.getRange(incidentRow + 1, idx.destination + 1).setValue(after.destination);
  sh.getRange(incidentRow + 1, idx.last_update + 1).setValue(new Date());
  sh.getRange(incidentRow + 1, idx.updated_by + 1).setValue(actorStr);
}

function _toCsv_(rows) {
  return rows.map(r =>
    r.map(v => {
      const s = (v instanceof Date) ? v.toISOString() : String(v ?? '');
      return `"${s.replace(/"/g,'""')}"`;
    }).join(',')
  ).join('\n');
}

function _computeMetrics_(ss, hours) {
  const audit = ss.getSheetByName(SHEETS.AUDIT);
  const vals = audit.getDataRange().getValues();
  if (vals.length < 2) return { windowHours: hours, averagesMinutes: {}, notes: 'NO AUDIT DATA.' };

  const headers = vals[0].map(String);
  const idx = _indexMap_(headers);

  const since = Date.now() - hours * 60 * 60 * 1000;

  const eventsByUnit = {};
  for (let i = 1; i < vals.length; i++) {
    const ts = vals[i][idx.ts];
    const t = ts instanceof Date ? ts.getTime() : new Date(ts).getTime();
    if (t < since) continue;

    const unit = String(vals[i][idx.unit_id] || '').toUpperCase();
    const newStatus = String(vals[i][idx.new_status] || '').toUpperCase();
    if (!unit || !newStatus) continue;

    if (!eventsByUnit[unit]) eventsByUnit[unit] = [];
    eventsByUnit[unit].push({ t, status: newStatus });
  }

  const pairs = [['D','DE'],['DE','OS'],['OS','T'],['T','AV']];
  const sums = {}, counts = {};
  pairs.forEach(p => { sums[p.join('→')] = 0; counts[p.join('→')] = 0; });

  Object.keys(eventsByUnit).forEach(unit => {
    const ev = eventsByUnit[unit].sort((a,b) => a.t - b.t);
    for (let j = 0; j < ev.length - 1; j++) {
      const a = ev[j], b = ev[j+1];
      const key = `${a.status}→${b.status}`;
      if (sums[key] != null) {
        const mins = (b.t - a.t) / 60000;
        if (mins >= 0 && mins <= 24*60) {
          sums[key] += mins;
          counts[key] += 1;
        }
      }
    }
  });

  const averagesMinutes = {};
  Object.keys(sums).forEach(k => {
    averagesMinutes[k] = counts[k] ? Math.round((sums[k] / counts[k]) * 10) / 10 : null;
  });

  const units = _readUnits_(ss);
  let longest = null;
  units.forEach(u => {
    if (u.active && u.status === 'OS' && u.updated_at) {
      const mins = (Date.now() - new Date(u.updated_at).getTime()) / 60000;
      if (!longest || mins > longest.minutes) longest = { unit: u.unit_id, minutes: Math.floor(mins) };
    }
  });

  return { windowHours: hours, averagesMinutes, longestCurrentlyOnScene: longest };
}

function _readBanner_(ss) {
  const meta = ss.getSheetByName(SHEETS.META);
  const vals = meta.getDataRange().getValues();
  let note = '', alert = '';
  for (let r = 1; r < vals.length; r++) {
    if (vals[r][0] === 'banner_note') note = String(vals[r][1] || '');
    if (vals[r][0] === 'banner_alert') alert = String(vals[r][1] || '');
  }

  function parse(v) {
    if (!v) return null;
    const parts = v.split('|');
    return { ts: parts[0] || '', actor: parts[1] || '', message: parts.slice(2).join('|') || '' };
  }

  return { note: parse(note), alert: parse(alert) };
}

// ============================================================
// AUTO-PURGE: Remove old data to keep Sheets fast
// ============================================================
// Run manually once: setupDailyPurge() to install the daily trigger.
// The trigger runs purgeOldData() every night automatically.

function purgeOldData() {
  const ss = _ss_();
  _ensureSheets_();

  const now = Date.now();
  const DAYS_7  = 7  * 24 * 60 * 60 * 1000;
  const DAYS_30 = 30 * 24 * 60 * 60 * 1000;
  let totalDeleted = 0;

  // Helper: parse a cell value to epoch ms
  function toMs(v) {
    if (v instanceof Date) return v.getTime();
    const d = new Date(v);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }

  // Helper: delete rows matching a condition (iterate in reverse)
  function purgeSheet(sheetName, tsColumn, maxAge, extraCheck) {
    const sh = ss.getSheetByName(sheetName);
    if (!sh) return 0;
    const data = sh.getDataRange().getValues();
    if (data.length < 2) return 0;

    const headers = data[0].map(String);
    const tsIdx = headers.indexOf(tsColumn);
    if (tsIdx < 0) return 0;

    let deleted = 0;
    for (let r = data.length - 1; r >= 1; r--) {
      const t = toMs(data[r][tsIdx]);
      if (t > 0 && (now - t) > maxAge) {
        if (extraCheck && !extraCheck(data[r], headers)) continue;
        sh.deleteRow(r + 1);
        deleted++;
      }
    }
    return deleted;
  }

  // 1. Messages older than 7 days
  totalDeleted += purgeSheet(SHEETS.MESSAGES, 'ts', DAYS_7);

  // 2. Sessions inactive for 7+ days
  totalDeleted += purgeSheet(SHEETS.SESSIONS, 'last_activity', DAYS_7);

  // 3. Audit entries older than 30 days
  totalDeleted += purgeSheet(SHEETS.AUDIT, 'ts', DAYS_30);

  // 4. Incident audit entries older than 30 days
  totalDeleted += purgeSheet(SHEETS.INCIDENT_AUDIT, 'ts', DAYS_30);

  // 5. Closed incidents older than 30 days
  totalDeleted += purgeSheet(SHEETS.INCIDENTS, 'last_update', DAYS_30, function(row, headers) {
    const statusIdx = headers.indexOf('status');
    return statusIdx >= 0 && String(row[statusIdx]).toUpperCase() === 'CLOSED';
  });

  console.log('[PURGE] Deleted ' + totalDeleted + ' old rows');
  return totalDeleted;
}

// Run this once from the Apps Script editor to install the daily trigger
function setupDailyPurge() {
  // Remove any existing purge triggers first
  removeDailyPurge();

  ScriptApp.newTrigger('purgeOldData')
    .timeBased()
    .everyDays(1)
    .atHour(3)  // 3 AM
    .create();

  console.log('[PURGE] Daily trigger installed (3 AM)');
}

// Run this to remove the daily purge trigger
function removeDailyPurge() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) {
    if (t.getHandlerFunction() === 'purgeOldData') {
      ScriptApp.deleteTrigger(t);
    }
  });
}
