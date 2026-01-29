# HOSCAD — IT Deployment Guide (Microsoft Environment)

This document explains what HOSCAD is, how it currently works, and what an IT team
needs to do to deploy it in a Microsoft/Azure environment at a hospital.

---

## What Is HOSCAD?

HOSCAD is a Computer-Aided Dispatch (CAD) and EMS resource tracking system with two components:

1. **Dispatch Board** — A web-based real-time dashboard for tracking units, incidents,
   messages, and operational status. Used by dispatchers and supervisors.
   URL: holdenportal.com/hoscad

2. **Field App (HOSCADField)** — A mobile-friendly web app for field units to update
   status, view assignments, and communicate with dispatch.
   URL: holdenportal.com/hoscadfield

Both run in a browser and can be installed as PWAs (Progressive Web Apps) for a
standalone app experience on desktop or mobile.

---

## Current Architecture (What Needs to Change)

```
CURRENT SETUP (Personal Google Services)
=========================================

  Browser (PWA)
       |
       |--- Dispatch Board (index.html, app.js, styles.css)
       |       |
       |       +--- api.js ---> Google Apps Script Web App
       |                              |
       |                              +--- Google Sheets (data store)
       |
       |--- Field App (field.html)
               |
               +--- api.js ---> (same backend)
```

**Everything above the line (the frontend) stays the same.**
The browser code does not change. Only the backend services need to be replaced.

---

## Target Architecture (Microsoft/Azure)

```
TARGET SETUP (Organization-Owned Azure)
========================================

  Browser (PWA)
       |
       |--- Dispatch Board (index.html, app.js, styles.css)
       |       |
       |       +--- api.js ---> Azure Functions (HTTP triggers)
       |                              |
       |                              +--- Azure SQL Database (data store)
       |                              |
       |                              +--- Azure AD / Entra ID (authentication)
       |
       |--- Field App (field.html)
               |
               +--- api.js ---> (same backend)
```

---

## Component 1: Dispatch Board Backend

### What It Does Now

A single Google Apps Script web app handles all API requests. The frontend calls it via:

```
GET https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec?action={name}&params=[...]
```

All requests go through one URL. The `action` parameter determines what runs.
Data is stored in Google Sheets (one sheet per table).

### What IT Needs to Build

**Azure Functions** (HTTP-triggered, Node.js or C#) that replicate the API.
The frontend only needs the base URL changed in one file (`api.js`, line 1).

#### Database Tables to Create

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **Units** | Active unit roster | unit_id, display_name, type, active, status, note, unit_info, incident, destination, updated_at, updated_by |
| **Incidents** | Dispatch incidents | incident_id (format: YY-XXXX), status (ACTIVE/QUEUED/CLOSED), units, destination, incident_note, incident_type, created_at, created_by, last_update, updated_by |
| **Audit** | Unit change history | ts, unit_id, action, prev_state (JSON), next_state (JSON), actor |
| **IncidentAudit** | Incident change history | ts, incident_id, message, actor |
| **Messages** | Inter-role messaging | message_id, ts, from_role, from_initials, to_role, message, urgent, read |
| **Users** | User accounts | username, first_name, last_name, password_hash, created_at, created_by |
| **Sessions** | Active login sessions | session_id (UUID), username, full_name, role, login_time, last_activity |
| **Destinations** | Dispatch destinations | code, name |
| **Addresses** | Recognized facilities/locations | addr_id, name, address, city, state, zip, category, aliases (pipe-delimited), phone, notes |
| **Meta** | System metadata | key, value (stores incident_counter, banner text) |

#### API Endpoints to Implement

These are the functions the frontend calls. Each becomes an Azure Function HTTP trigger.

**Authentication:**
| Endpoint | Parameters | What It Does |
|----------|-----------|--------------|
| `login` | role, username, password | Validate credentials, return UUID session token (12h TTL) |
| `logout` | token | Invalidate session |
| `who` | token | Return current user info |

**Available Roles:**
| Role | Description | Admin Access |
|------|-------------|--------------|
| STA1-6 | Station positions (Central Communications) | No |
| SUPV1, SUPV2 | Supervisors | Yes |
| MGR1, MGR2 | Managers | Yes |
| EMS | EMS Operations | No |
| TCRN | Transfer Center RN | No |
| PLRN | Patient Logistics RN | No |
| IT | Information Technology (restricted users) | Yes |
| UNIT | Field units (no password required) | No |

**Core Data:**
| Endpoint | Parameters | What It Does |
|----------|-----------|--------------|
| `getState` | token | Return ALL units, incidents, destinations, messages, banners. Called every 10 seconds by frontend polling. |
| `getMetrics` | token, hours | Return status-change counts for past N hours |
| `getAddresses` | token | Return all recognized facility/location addresses (~100 entries). Cached client-side for autocomplete and display resolution. |

**Unit Operations:**
| Endpoint | Parameters | What It Does |
|----------|-----------|--------------|
| `upsertUnit` | token, unitId, patch, expectedUpdatedAt | Create or update a unit. Patch is partial — only fields included are changed. `expectedUpdatedAt` provides optimistic concurrency (reject if stale). |
| `logoffUnit` | token, unitId, expectedUpdatedAt | Set unit active=false |
| `ridoffUnit` | token, unitId, expectedUpdatedAt | Remove unit from service |
| `touchUnit` | token, unitId, expectedUpdatedAt | Reset unit's updated_at timestamp (prevents stale warnings) |
| `touchAllOS` | token | Touch all units with status "OS" |
| `undoUnit` | token, unitId | Revert unit to previous state from audit log |
| `getUnitInfo` | token, unitId | Return unit detail |
| `getUnitHistory` | token, unitId, hours | Return audit trail for one unit |
| `massDispatch` | token, destination | Dispatch all available units to a destination |

**Incident Operations:**
| Endpoint | Parameters | What It Does |
|----------|-----------|--------------|
| `createQueuedIncident` | token, destination, note, urgent, assignUnitId, incidentType | Create incident. ID format: YY-XXXX (auto-increment). |
| `getIncident` | token, incidentId | Return incident with last 25 audit entries |
| `updateIncident` | token, incidentId, message, incidentType | Update incident fields |
| `appendIncidentNote` | token, incidentId, message | Add note to incident audit trail |
| `closeIncident` | token, incidentId | Set status=CLOSED |
| `reopenIncident` | token, incidentId | Set status=ACTIVE |
| `linkUnits` | token, unit1Id, unit2Id, incidentId | Assign both units to incident |
| `transferIncident` | token, fromUnitId, toUnitId, incidentId | Move incident between units |

**Messaging:**
| Endpoint | Parameters | What It Does |
|----------|-----------|--------------|
| `sendMessage` | token, toRole, message, urgent | Send message to a role (STA1, SUPV1, etc.) or "ALL" |
| `getMessages` | token | Get messages for user's role |
| `readMessage` | token, messageId | Mark as read |
| `deleteMessage` | token, messageId | Delete one message |
| `deleteAllMessages` | token | Delete all messages for user's role |

**Admin:**
| Endpoint | Parameters | What It Does |
|----------|-----------|--------------|
| `newUser` | token, lastName, firstName | Create user account |
| `delUser` | token, username | Delete user account |
| `listUsers` | token | List users (filtered by role) |
| `changePassword` | token, oldPassword, newPassword | Change password |
| `setBanner` | token, kind, message | Set system-wide alert or note banner |
| `exportAuditCsv` | token, hours | Export audit log as CSV |

#### Frontend Change Required

One line in `api.js`:

```javascript
// BEFORE (Google Apps Script)
const baseUrl = 'https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec';

// AFTER (Azure Functions)
const baseUrl = 'https://{your-function-app}.azurewebsites.net/api';
```

The `api.js` call pattern sends `?action={name}&params=[...]` — your Azure Functions
should parse parameters the same way, or you can modify `api.js` to use RESTful
routes instead. Either approach works; the frontend is simple to adapt.

---

## Component 2: Authentication

### Current State (Not Production-Ready)

- Passwords stored in plaintext in Google Sheets
- Simple UUID token in localStorage (12h expiry)
- Hardcoded room password "12345" for radio access
- No password complexity requirements
- No account lockout

### What IT Should Implement

**Azure AD / Entra ID integration:**

1. Register HOSCAD as an Azure AD application
2. Use MSAL.js in the frontend for SSO login
3. Users authenticate with their existing hospital credentials
4. Azure AD tokens replace the current UUID session tokens
5. Role assignment via Azure AD groups (STA1, SUPV1, etc.)
6. MFA enforced by existing Azure AD policies

This eliminates the Users table entirely. The frontend login modal would be
replaced with a Microsoft SSO redirect.

---

## Current Deployment URLs

| Environment | URL | Repo / Location |
|-------------|-----|-----------------|
| **Production (Dispatch)** | https://holdenportal.com/hoscad | `ckholden/Holden-nerd-portal` (`/hoscad` dir) |
| **Production (Field)** | https://holdenportal.com/hoscadfield | `ckholden/Holden-nerd-portal` (`/hoscadfield` dir) |
| **Test (unblocked)** | https://ckholden.github.io/hoscad | `ckholden/hoscad` (root) |
| **Backend API** | Google Apps Script Web App | `backend-deploy/` via clasp |

> **Note:** The test deployment at `ckholden.github.io/hoscad` uses a separate GitHub
> repo (`ckholden/hoscad`) with no CNAME file, so it serves directly from `github.io`
> — useful when corporate network filters block `holdenportal.com`. Both deployments
> share the same backend API; all data is shared.

---

## Deployment Options

### Option 1: Azure Static Web Apps + Azure Functions (Recommended)

- Frontend hosted on Azure Static Web Apps (free tier available)
- Backend API as Azure Functions (consumption plan)
- Database on Azure SQL (basic tier ~$5/month)
- All within the organization's Azure tenant

### Option 2: Internal IIS Server

- Frontend as static files on an IIS web server
- Backend as ASP.NET Core API on the same server
- SQL Server (existing hospital infrastructure)

### Option 3: Hybrid (Fastest Path)

- Frontend hosted anywhere (Azure, IIS, or even current hosting)
- Backend migrated to Azure Functions
- Azure AD added for authentication

---

## Security Checklist for Production

- [ ] Replace plaintext passwords with Azure AD SSO
- [ ] Enable HTTPS on all endpoints
- [ ] Implement rate limiting on API
- [ ] Add input validation/sanitization on all API parameters
- [ ] Set up Azure AD groups for role-based access
- [ ] Configure CORS to allow only the frontend domain
- [ ] Enable audit logging in Azure
- [ ] Set up database backups (daily)
- [ ] Implement session timeout and forced logout
- [ ] Penetration test before go-live

---

## Effort Summary

| Component | Complexity | Notes |
|-----------|-----------|-------|
| Azure Functions API (replaces Apps Script) | Medium | ~25 endpoints, straightforward CRUD. Most are simple DB queries. |
| Azure SQL setup | Low | 9 tables, simple schema, no complex relations. |
| Azure AD integration | Medium | Standard MSAL.js integration. Replaces login modal. |
| Frontend URL change | Trivial | One line in api.js. |
| Push notifications | Low-Medium | Azure Notification Hubs or browser notifications. |

---

## Files Included in This Project

```
hoscad-frontend/          Frontend (browser code — does not change)
  index.html              Main dispatch board page
  field.html              Field app for mobile units (HOSCADField)
  app.js                  UI logic, command parser, state management
  api.js                  API wrapper — ONLY file that needs a URL change
  styles.css              All styling
  sw.js                   Service worker for PWA/notifications (dispatch)
  sw-field.js             Service worker for PWA (field app)
  manifest.json           PWA manifest (dispatch)
  manifest-field.json     PWA manifest (field app)
  tone-urgent.wav         Alert tone for messages and notifications
  server.js               Local dev server (optional)
```

---

## Questions IT Will Likely Ask

**Q: Why not just use a commercial CAD system?**
A: HOSCAD is purpose-built for hospital communications center workflows that
commercial CAD systems don't address well. It can be evaluated as a lightweight
alternative or supplement.

**Q: What uptime/SLA does this need?**
A: For a hospital comms center, this is operationally critical. Azure Functions
with a dedicated App Service plan (not consumption) and Azure SQL with geo-replication
would provide appropriate reliability.

**Q: How many concurrent users?**
A: Typically 2-6 dispatchers + 10-30 field units. The system is lightweight —
a basic Azure tier handles this easily.

**Q: What about HIPAA?**
A: HOSCAD tracks unit status and dispatch logistics, not patient health records.
However, incident notes could contain patient information. Azure services are
HIPAA-eligible with a BAA. Ensure the Azure tenant has a BAA in place and
incident notes are treated as potentially containing PHI.

**Q: Can we keep using Google Sheets as the database?**
A: It works for prototyping but is not appropriate for production. Google Sheets
has no transactions, no indexing, limited concurrent access, and data lives
outside the organization's control. Use a proper database.
