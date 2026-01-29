# SCMC HOSCAD/EMS TRACKING SYSTEM
## Management Presentation Document

---

## EXECUTIVE SUMMARY

**SCMC HOSCAD/EMS Tracking** is a professional-grade Computer-Aided Dispatch (CAD) system designed specifically for tracking available resources and out-of-service (OOS) times. Built using Google Sheets backend with a web-based interface, the system provides real-time visibility into unit status, incident management, and comprehensive reporting.

**Key Value Propositions:**
- ✅ Real-time resource availability tracking
- ✅ Accurate OOS time reporting (primary management requirement)
- ✅ Full audit trail for accountability
- ✅ User authentication with role-based access
- ✅ Zero infrastructure cost (runs on Google Sheets + GitHub Pages)
- ✅ Accessible from any device with web browser
- ✅ Scalable for future dispatch operations
- ✅ Integrated PTT radio with field-unit CAD terminals (CADRadio)
- ✅ Bidirectional messaging between dispatch and field units
- ✅ Automated data maintenance (nightly purge of old records)

---

## CURRENT CAPABILITIES (PHASE 1 & 2 - COMPLETE)

### 1. RESOURCE TRACKING & AVAILABILITY

**Unit Status Management:**
- 10 distinct status codes: D, DE, OS, F, FD, T, AV, UV, BRK, OOS
- Real-time status updates with visual indicators
- Color-coded rows for quick identification
- Automatic staleness detection (units on scene >10/20/30 minutes)

**Unit Operations:**
- Quick status changes via command line
- Unit history tracking (12/24/48/168 hour views)
- Notes and destinations per unit
- Incident assignment and tracking
- Undo capability for error correction

### 2. OUT-OF-SERVICE (OOS) REPORTING ⭐

**NEW: REPORTOOS Command**
```
REPORTOOS24H    - Last 24 hours
REPORTOOS7D     - Last 7 days
REPORTOOS30D    - Last 30 days
```

**Report Includes:**
- Total OOS time (minutes and hours)
- Per-unit breakdown
- Time periods with start/end timestamps
- Currently ongoing OOS periods
- Sortable by duration

**Management Impact:** 
Provides accurate, auditable OOS time data for:
- Resource allocation decisions
- Staffing analysis
- Compliance reporting
- Performance metrics

### 3. RECOGNIZED ADDRESS/FACILITY LOOKUP

**97 Pre-Loaded Facilities:**
- Hospitals, urgent care centers, skilled nursing facilities
- Fire stations, law enforcement agencies, county jails
- Airports, air ambulance bases, dialysis centers
- All major Central Oregon facilities with full addresses, phone numbers, and aliases

**Autocomplete Destination Entry:**
- Custom fuzzy search dropdown on destination fields
- Type 2+ characters to search by name, alias, address, or facility ID
- 3-tier ranking: exact alias match, starts-with, then contains
- Keyboard navigation (arrows/enter/escape) and mouse selection

**Address Resolution on Board:**
- Recognized addresses display as facility names in green
- Full address shown as tooltip on hover
- Freeform text entries displayed as-is

**Commands:**
- `ADDR` — View full address directory grouped by category
- `ADDR <query>` — Search facilities by name, alias, or address
- `DEST <UNIT>; <LOCATION>` — Set unit destination from command line with address resolution

### 4. DISPATCH & EMERGENCY CONTACT DIRECTORY

**Built-in INFO Command with Real Contact Numbers:**
- `INFO` — Quick reference (all dispatch centers)
- `INFO DISPATCH` — DCSO, Redmond, Bend, La Pine, Prineville, Madras, Warm Springs
- `INFO AIR` — AirLink, Life Flight, CalStar base numbers
- `INFO OSP` — Oregon State Police dispatch and field
- `INFO CRISIS` — Crisis lines, suicide hotline, 988, poison control
- `INFO LE` — Law enforcement non-emergency numbers
- `INFO JAIL` — Deschutes, Crook, Jefferson county jails
- `INFO FIRE` — Fire agency non-emergency numbers
- `INFO ME` — Oregon State Medical Examiner
- `INFO ALL` — Complete directory

### 5. INCIDENT MANAGEMENT

**Incident Queue System:**
- Create new incidents (NC command or + button)
- Visual queue with age indicators
- One-click assignment to units
- Automatic queue removal when assigned
- Incident auto-closes when unit goes available

**Incident Tracking:**
- Unique incident numbers (auto-generated)
- Full incident history and audit log
- Notes and updates
- Multi-unit incident support
- Incident transfer capability

### 6. USER AUTHENTICATION & SESSION MANAGEMENT

**Secure Login:**
- Username/password authentication
- 10 pre-configured users (expandable)
- Full name display after login
- 12-hour session timeout
- Manual logout capability

**User Management Commands:**
- NEWUSER - Create new users (auto-generates usernames)
- DELUSER - Remove users
- LISTUSERS - View all system users
- PASSWD - Change your password
- WHO - See who's currently logged in
- WHOCLEAR - Clear all sessions (admin)

**Pre-Loaded Users (all password: 12345):**
- holdenc (Christian Holden)
- holdenc2 (Chris Holden)  
- lawsonm (Margaret Lawson)
- ginabrede (Elisa Ginabreda)
- magnusonm (Michele Magnuson)
- smileya (Amanda Smiley)
- peterse (Erika Peters)
- test1, test2, test3 (Test users)

### 7. COMMUNICATION SYSTEM

**Messaging:**
- Station-to-station messaging
- Dispatcher-to-field unit messaging (by callsign: `MSG EMS12; text`)
- Field unit-to-dispatcher messaging
- Field unit-to-field unit messaging
- Broadcast messages (MSGALL / HTALL)
- Urgent message alerts (hot messages)
- Message history and deletion
- Visual/audio notifications
- Browser push notifications for background alerts

**Alert System:**
- NOTE banner (informational)
- ALERT banner (urgent, with extended beep)
- Auto-focuses command line
- Dismissible with ESC key

### 8. AUDIT & COMPLIANCE

**Complete Audit Trail:**
- Every unit status change logged
- User actions tracked with timestamp and actor
- Incident history maintained
- Session tracking (who logged in when)
- Searchable logs (! command)

**Search Capability:**
```
! MADRAS        - Search for "MADRAS" in all logs
! EMS1          - Find all EMS1 activity
! CHEST PAIN    - Search incident notes
```

### 9. ADMINISTRATIVE TOOLS

**Data Management:**
- CLEARDATA UNITS - Clear inactive units
- CLEARDATA AUDIT - Clear audit history
- CLEARDATA INCIDENTS - Clear old incidents
- CLEARDATA ALL - Nuclear option with confirmation

**System Monitoring:**
- STATUS - System overview (units, incidents)
- US - Unit status report (all units)
- WHO - Current logged-in users
- INFO - Dispatch & emergency contact directory (DISPATCH, AIR, OSP, CRISIS, LE, JAIL, FIRE, ME, ALL)

**Admin-Only Commands (Not Documented in Public HELP):**
- CURUSERSINFO - View all usernames and passwords
- WHOCLEAR - Force logout all users
- CLEARDATA - Data cleanup operations

### 10. CADRADIO — FIELD UNIT TERMINALS (PHASE 2 - COMPLETE)

**Overview:**
CADRadio transforms any phone, tablet, or computer into a combined PTT radio and CAD terminal. Field units (EMS crews, supervisors, command cars) can communicate via push-to-talk radio AND interact with the HOSCAD dispatch board from the same interface.

**Access:** `holdenportal.com/cadradio`

**PTT Radio System:**
- 4-channel push-to-talk radio over internet (Firebase Realtime Database)
- Compact single-row radio bar: channel selector (CH1-CH4) + single PTT button
- Expandable RX toggles to monitor multiple channels
- Motorola MCC7500 alert tones sent by dispatchers
- Volume control
- F5 hotkey for desktop PTT
- Touch-optimized for mobile devices

**CAD Integration (Field Side):**
- Free-text callsign login (e.g., EMS12, CC1, SUPV1)
- Optional unit info field (crew/vehicle/assignment details)
- Auto-registers on HOSCAD dispatch board on login
- Auto-deregisters on logout
- Color-coded status badge (AV=green, DE=yellow, OS=red, T=purple, OOS=gray)
- Incident display panel (shows assigned incident details)
- Destination/location display with address resolution (facility names instead of raw IDs)
- Real-time sync via 5-second polling

**Field Command Bar:**
| Command | Example | Description |
|---------|---------|-------------|
| `MSG <target>; <text>` | `MSG STA1; ON BREAK` | Message dispatcher or unit |
| `HTMSG <target>; <text>` | `HTMSG SUPV1; NEED HELP` | Urgent message |
| `DE`, `OS`, `T`, `AV`, `OOS`, `BRK`, `UV` | `OS; 122 MAIN ST` | Update own status |
| `CLOSE <inc>` | `CLOSE 26-0042` | Close assigned incident |
| `R <inc>` | `R 26-0042` | Review incident details |
| `HELP` | `HELP` | Command reference |
| `LO` | `LO` | Log out of CADRadio |
| `CLS` | `CLS` | Clear screen |

**Status Buttons (touch-friendly):**
- ENRTE, ON SC, TRANS, AVAIL, OOS, BRK — one-tap status changes

**Background Alerts:**
- Browser push notifications for incoming CAD messages when app is not in foreground
- Audio alert for urgent messages
- Notification permission requested on login

**Dispatcher-to-Field Messaging:**
- Dispatchers send to specific units by callsign: `MSG EMS12; CALL ME`
- Field units see sender's callsign (not generic "UNIT")
- Field units can message dispatchers, other field units, or any role

### 11. AUTOMATED DATA MAINTENANCE

**Nightly Auto-Purge (3 AM daily):**
- Messages older than 7 days — deleted automatically
- Inactive sessions older than 7 days — deleted automatically
- Audit log entries older than 30 days — deleted automatically
- Incident audit entries older than 30 days — deleted automatically
- Closed incidents older than 30 days — deleted automatically

**Purpose:** Keeps Google Sheets responsive. Without cleanup, accumulated data would slow down polling and command execution over months of use. The purge runs silently via Apps Script time trigger.

### 12. MOBILE APP (PWA — PROGRESSIVE WEB APP)

**CADRadio is installable as an app on any phone or tablet — no app store required.**

**Android (Chrome):**
- Visit `holdenportal.com/cadradio`
- "INSTALL APP" button appears on the login screen
- Tap to install — Chrome shows native install dialog
- App appears on home screen with its own icon
- Launches full-screen (no browser address bar)
- Supports push notifications in background

**iOS (iPhone / iPad):**
- Visit `holdenportal.com/cadradio` in Safari
- "INSTALL" button appears with instructions
- Tap Share > "Add to Home Screen" > Add
- App appears on home screen with its own icon
- Launches full-screen (standalone mode)
- Push notifications supported on iOS 16.4+

**PWA Benefits:**
- No App Store or Play Store approval needed
- Updates instantly (always loads latest version from server)
- Works offline (app shell cached locally)
- Zero distribution cost
- Same codebase as the website — no separate mobile app to maintain

### 13. DESKTOP APPLICATIONS (ELECTRON)

**Windows desktop installers are available for both HOSCAD and CADRadio.**

**HOSCAD Desktop:**
- One-click Windows installer (`HOSCAD Setup 1.0.0.exe`)
- Runs in a dedicated 1400x900 window
- Global F5 hotkey for PTT (works even when window is unfocused)
- Minimizes to system tray (keeps running in background)
- Native Windows notifications

**CADRadio Desktop:**
- One-click Windows installer (`CADRadio Setup 1.0.0.exe`)
- Runs in a compact 600x800 window
- Global F5 hotkey for PTT
- Minimizes to system tray
- Native Windows notifications

**Desktop App Benefits:**
- Dedicated window (not a browser tab)
- Global PTT hotkey works while using other applications
- System tray icon — always accessible
- Auto-starts if pinned to taskbar/startup

---

## TECHNICAL SPECIFICATIONS

**Platform:**
- Backend: Google Sheets (Apps Script) — CAD data, dispatch, messaging, auth
- PTT Radio: Firebase Realtime Database — audio streaming, channel management
- Frontend — HOSCAD Dispatch: HTML5/CSS3/JavaScript hosted on GitHub Pages (`holdenportal.com/tccad`)
- Frontend — CADRadio Field: HTML5/CSS3/JavaScript hosted on GitHub Pages (`holdenportal.com/cadradio`)
- Mobile App: Progressive Web App (PWA) — installable from browser, no app store needed
- Desktop App: Electron 33.0 — Windows installers for HOSCAD and CADRadio
- Authentication: Session-based (12-hour TTL for dispatchers), callsign-based for field units
- Data Storage: Google Sheets with automated nightly purge
- Hosting: GitHub Pages (frontend) + Google Apps Script (backend API) + Firebase (radio audio)

**Supported Platforms:**
- Chrome (desktop + mobile) ✅ — PWA installable
- Firefox (desktop + mobile) ✅
- Safari (desktop + mobile) ✅ — PWA installable via Add to Home Screen
- Edge ✅ — PWA installable
- Android phones/tablets ✅ — PWA with push notifications
- iPhone/iPad ✅ — PWA with push notifications (iOS 16.4+)
- Windows desktop ✅ — Electron app with system tray + global PTT hotkey

**Performance:**
- HOSCAD dispatch: 10-second polling
- CADRadio field: 5-second polling
- Sub-second command execution
- Designed for 1 dispatcher + up to ~10 field units (current operational scale)
- Scalable to ~50 concurrent users before Google Sheets bottleneck
- Automated data cleanup keeps sheets lean indefinitely
- PTT audio: real-time streaming via Firebase WebSocket (low latency)

**Resource Usage:**
- Minimal CPU on client devices (lightweight polling + WebSocket)
- No server infrastructure to maintain (all serverless/hosted)
- Mobile-friendly: comparable battery impact to any messaging app
- Zero bandwidth when idle; audio only during PTT transmission

---

## USER INTERFACE

**HOSCAD Dispatch Board (Desktop):**
- Professional CAD-style interface
- Dark theme optimized for 24/7 operations
- Single command line for all operations
- Keyboard shortcuts (F1/F3, CTRL+K, ESC)
- Up/down arrows for command history
- Color-coded status indicators
- Flashing alerts for pending dispatch (D status)
- Staleness warnings (yellow/red borders)
- Compact, information-dense table layout
- Integrated 4-channel radio with TX/tone buttons

**CADRadio Field Terminal (Mobile/Tablet/Desktop):**
- Dark theme matching dispatch board
- Compact radio bar (channel selector + PTT + RX toggles)
- Large touch-friendly PTT button (no text selection issues on mobile)
- Color-coded status badge
- Incident display panel
- One-tap status buttons (ENRTE, ON SC, TRANS, AVAIL, OOS, BRK)
- Command bar with message feed
- Quick-action buttons for common operations
- Browser push notifications for background alerts

**Accessibility:**
- Keyboard-first navigation on desktop
- Touch-optimized on mobile
- ESC to close any dialog
- Auto-focus on command line
- High contrast colors
- Large, readable fonts

---

## TRAINING & DOCUMENTATION

**Built-In Help System:**
```
HELP - Complete command reference (60+ commands)
INFO - Dispatch & emergency contact directory
ADDR - Facility/address directory and search
```

**Easy Learning Curve:**
- Intuitive command syntax
- Error messages with usage examples
- Confirmation prompts for destructive actions
- Undo capability for mistakes

**Private Admin Documentation:**
Separate document with sensitive commands (not in public HELP file):
- CURUSERSINFO
- CLEARDATA
- WHOCLEAR
- Advanced troubleshooting

---

## SECURITY & COMPLIANCE

**Authentication:**
- Username/password required
- Session tracking in database
- Automatic 12-hour timeout
- Manual logout capability

**Audit Trail:**
- Every action logged with:
  - Timestamp
  - User (full name + role)
  - Action performed
  - Before/after state
- Searchable history
- Exportable for compliance

**Data Protection:**
- CAD data stored in organization's Google Workspace (Sheets)
- Audio streaming via Firebase (Google infrastructure)
- Frontend hosted on GitHub Pages (static files, no sensitive data)
- Standard Google Workspace security
- Regular backups via Google
- No third-party servers or paid services

---

## COST ANALYSIS

**Development:** $0 (internal)
**Hosting:** $0 (Google Apps Script + GitHub Pages + Firebase — all free tier)
**Per-User Cost:** $0 (unlimited users)
**Mobile App:** $0 (PWA — no App Store or Play Store fees)
**Desktop App:** $0 (Electron — free distribution)
**Maintenance:** $0 (no ongoing fees, automated data cleanup)
**Training:** Minimal (intuitive interface)

**Total Cost of Ownership:** $0/year

**Comparison to Commercial CAD Systems:**
- TriTech CAD: $50,000-$200,000+ initial + $10,000+/year maintenance
- Motorola PremierOne: $100,000+ initial + maintenance
- Zoll RescueNet: $25,000-$50,000+ annually
- **SCMC HOSCAD: $0**

---

## SCALABILITY & FUTURE EXPANSION

### Ready for Dispatch Operations

**Current Capabilities Support:**
- Incident creation and assignment
- Multi-unit dispatching
- Response time tracking
- Destination management
- Notes and updates
- Dispatcher and field unit messaging
- PTT radio communication
- Field unit CAD terminals

**Easy to Add (When Needed):**
- Geographic zones
- Response time analytics
- Automated reports
- Map integration
- SMS notifications
- Call-taking integration
- Commercial PTT radio integration (Zello, Motorola WAVE PTX)

### Potential for Ambulance Company Contract

**System Can Handle:**
- Separate unit groups per company
- Independent incident queues
- Per-company reporting
- Multi-organization tracking
- User roles per organization

---

## RISK ASSESSMENT

**Risks:**
✅ **Low** - Technology Risk: Uses proven Google Sheets platform
✅ **Low** - Cost Risk: Zero cost to implement/operate
✅ **Low** - Training Risk: Intuitive interface, built-in help
⚠️ **Medium** - Data Loss: Mitigated by Google Sheets auto-backup
⚠️ **Medium** - Internet Dependency: Requires internet connectivity

**Risk Mitigation:**
- Google Sheets auto-backup + version history
- Automated nightly data purge prevents performance degradation (implemented)
- Multiple user access for redundancy
- Full audit trail for accountability
- Firebase audio independent of CAD backend (radio works even if Sheets is slow)
- PWA caches app shell locally — app loads even with intermittent connectivity (radio/CAD features require network)

---

## SUCCESS METRICS

**Measurable Outcomes:**

1. **OOS Time Tracking** ⭐
   - Accurate to-the-minute reporting
   - Historical trending
   - Per-unit accountability
   - Exportable for analysis

2. **Response Time Metrics:**
   - D→DE (dispatch to enroute)
   - DE→OS (enroute to on scene)
   - OS→T (on scene to transport)
   - T→AV (transport to available)

3. **Resource Utilization:**
   - Unit availability percentages
   - Call volume per unit
   - Incident duration tracking
   - Coverage gap identification

4. **Operational Efficiency:**
   - Reduced radio traffic (command-line updates)
   - Faster unit status changes
   - Improved communication (messaging system)
   - Better shift handoff (notes/history)

---

## IMPLEMENTATION PLAN

### Phase 1: Core Dispatch Board (COMPLETE) ✅
- Core dispatch board (HOSCAD)
- User authentication and session management
- Incident queue and assignment
- OOS reporting
- Dispatcher messaging system
- Audit trail and search
- **Status: IN PRODUCTION**

### Phase 2: Field Unit Integration (COMPLETE) ✅
- CADRadio field terminal (PTT radio + CAD)
- 4-channel push-to-talk radio over internet
- Bidirectional messaging (dispatcher ↔ field units, field ↔ field)
- Per-unit message routing by callsign
- Field status updates (command bar + touch buttons)
- Incident display on field devices
- Background browser notifications
- Automated nightly data purge
- Motorola MCC7500 alert tones
- Mobile app (PWA) — installable on Android and iOS from browser
- Windows desktop apps (Electron) — HOSCAD and CADRadio installers
- **Status: IN PRODUCTION**

### Phase 3: Enhancement (Future if Approved)
- Automated daily OOS reports (email to management)
- Export data commands (CSV downloads)
- Shift management (track coverage)
- Unit types/groups (ALS/BLS/FIRE)
- Geographic zones (basic)
- Response time analytics dashboard

### Phase 4: Advanced (Future if Needed)
- Map integration (Google Maps API)
- SMS notifications for dispatches
- Commercial PTT integration (Zello, Motorola WAVE, or WebRTC upgrade)
- Automated reminders

### Phase 5: Enterprise (Future)
- Hardware integration (tone-out systems)
- LMR radio interop (Motorola WAVE PTX)
- Voice commands (Google Speech-to-Text)
- External CAD system integration
- Full compliance suite

---

## RECOMMENDATION

**Immediate Action:**
1. **Approve for pilot deployment** (2-4 week trial)
2. **Train initial users** (1-2 hour session)
3. **Run parallel with existing system** (no risk)
4. **Collect feedback** from dispatchers and supervisors
5. **Review OOS reports** after 2 weeks

**Success Criteria for Full Deployment:**
- ✅ Accurate OOS time tracking
- ✅ User satisfaction (ease of use)
- ✅ System reliability (uptime >99%)
- ✅ Training completion (<2 hours per user)

---

## APPENDIX A: COMMAND REFERENCE (QUICK GUIDE)

### Most Used Commands

**Unit Status:**
```
D EMS1; MADRAS ED          - Dispatch
DE EMS1                     - Enroute
OS EMS1                     - On scene
T EMS1                      - Transporting
AV EMS1                     - Available
OOS EMS1; MAINTENANCE       - Out of service
```

**Locations & Info:**
```
DEST EMS1; SCB             - Set unit destination
ADDR                       - View address directory
ADDR OHSU                  - Search addresses
INFO                       - Quick dispatch numbers
INFO AIR                   - Air ambulance contacts
INFO ALL                   - Full contact directory
```

**Reporting:**
```
REPORTOOS24H               - Last 24 hours OOS
REPORTOOS7D                - Last 7 days OOS
US                         - Unit status report
STATUS                     - System overview
WHO                        - Who's logged in
```

**Incidents:**
```
NC; BEND ED CHEST PAIN     - New call
DE EMS1 0023               - Assign to unit
R 0023                     - Review incident
```

**Communication:**
```
MSG STA2; MESSAGE          - Send message to station
MSG EMS12; CALL ME         - Send message to field unit
MSGALL; MESSAGE            - Broadcast to all
```

**Field Unit Commands (CADRadio):**
```
MSG STA1; ON BREAK         - Message dispatcher
OS; 122 MAIN ST            - Set status with note
CLOSE 26-0042              - Close assigned incident
R 26-0042                  - Review incident
LO                         - Log out
CLS                        - Clear screen
HELP                       - Command reference
```

---

## APPENDIX B: SUPPORT & MAINTENANCE

**System Administrator:** [Your Name]
**Technical Support:** [Your Contact]
**Training Lead:** [Training Contact]

**Escalation Path:**
1. Built-in HELP command
2. Admin documentation (private)
3. System administrator
4. Developer (if needed)

**Response Time:**
- Critical issues: <2 hours
- Non-critical: <24 hours
- Feature requests: Tracked for future releases

---

## CONCLUSION

SCMC HOSCAD/EMS Tracking represents a **zero-cost, professional-grade solution** to critical operational needs: accurate OOS time tracking, resource visibility, and field-to-dispatch communication. The system is **in production** with both the dispatch board (HOSCAD) and field unit terminals (CADRadio) fully operational.

**Key Benefits:**
- ✅ Solves immediate OOS reporting requirement
- ✅ Zero cost to implement and operate
- ✅ Full dispatch board + field unit CAD terminals
- ✅ Integrated PTT radio (no additional hardware needed)
- ✅ Bidirectional messaging between dispatch and field
- ✅ Full audit trail for compliance
- ✅ Automated data maintenance (no manual cleanup)
- ✅ Scalable for future dispatch needs
- ✅ User-friendly interface on desktop and mobile
- ✅ Minimal training required

**System URLs:**
- Dispatch Board (HOSCAD): `holdenportal.com/tccad`
- Field Terminal (CADRadio): `holdenportal.com/cadradio`

---

**Document Version:** 2.2
**Date:** January 28, 2026
**Status:** Phase 1 & 2 Complete — In Production
**Changelog:**
- v2.2 — Added address/facility lookup (97 facilities), dispatch & emergency contact directory (INFO commands), DEST command, radio LO command, audio improvements
- v2.1 — Added PWA mobile app (installable on Android/iOS), desktop app documentation, updated platform support
- v2.0 — Added CADRadio field unit integration, PTT radio, bidirectional messaging, automated data purge
