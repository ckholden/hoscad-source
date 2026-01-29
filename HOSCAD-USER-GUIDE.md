# HOSCAD User Guide
## Hospital Operations System - Computer Aided Dispatch

**Version:** 2.0
**Last Updated:** January 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Login and Roles](#login-and-roles)
4. [Resource Board](#resource-board)
5. [Common Commands](#common-commands)
6. [Status Codes](#status-codes)
7. [Incident Management](#incident-management)
8. [Messaging](#messaging)
9. [Field App (HOSCADField)](#field-app)
10. [Keyboard Shortcuts](#keyboard-shortcuts)
11. [Role-Specific Instructions](#role-specific-instructions)

---

## 1. Overview

HOSCAD is a web-based dispatch and resource tracking system designed for hospital communications centers. It provides real-time visibility of:

- **Units** (ambulances, transport vehicles, personnel)
- **Incidents** (transport requests, emergencies, scheduled moves)
- **Status** (available, enroute, on scene, transporting)
- **Messaging** between operators and supervisors

### Access URLs

| Application | URL |
|-------------|-----|
| Dispatch Board | https://holdenportal.com/hoscad |
| Field App | https://holdenportal.com/hoscadfield |

---

## 2. Getting Started

### Browser Requirements
- Chrome, Edge, or Firefox (current version)
- JavaScript enabled
- Cookies enabled for login persistence

### First Time Login
1. Navigate to https://holdenportal.com/hoscad
2. Select your role from the dropdown
3. Enter your username
4. Enter your password (default: 12345 - change after first login)
5. Click LOGIN

### Changing Your Password
Type in the command bar:
```
PASSWD oldpassword newpassword
```
Example: `PASSWD 12345 MySecurePass123`

---

## 3. Login and Roles

### Available Roles

| Role | Description | Use Case |
|------|-------------|----------|
| **STA1-6** | Station positions | Central Communications operators |
| **SUPV1, SUPV2** | Supervisors | TC/CC Supervisors (admin access) |
| **MGR1, MGR2** | Managers | Department managers (admin access) |
| **EMS** | EMS Operations | EMS coordinators |
| **TCRN** | Transfer Center RN | Transfer Center registered nurses |
| **PLRN** | Patient Logistics RN | Patient logistics nurses |
| **IT** | Information Technology | System administrators (admin access, restricted) |

### Session Information
- Sessions last 12 hours of activity
- Inactive sessions expire automatically
- Type `LO` to log out manually

---

## 4. Resource Board

The main screen shows all active units in a sortable table:

| Column | Description |
|--------|-------------|
| **UNIT** | Unit identifier (e.g., EMS12, TC1) |
| **STATUS** | Current status code |
| **ELAPSED** | Time since last status change |
| **LOCATION** | Current destination or location |
| **NOTES** | Status notes and incident info |
| **INCIDENT** | Assigned incident number |
| **UPDATED** | Last update time and by whom |

### Interacting with Units
- **Click** a row to select it (yellow outline)
- **Double-click** to open the edit modal
- Type a status code while a unit is selected to change its status

### Quick Action Buttons
Each unit row has buttons for common actions:
- **D** - Dispatch
- **DE** - Enroute
- **OS** - On Scene
- **T** - Transporting
- **AV** - Available
- **OOS** - Out of Service

---

## 5. Common Commands

Type commands in the command bar at the top of the screen.

### Unit Status Changes

| Command | Description | Example |
|---------|-------------|---------|
| `<STATUS> <UNIT>` | Change unit status | `DE EMS12` |
| `<STATUS> <UNIT>; <NOTE>` | Change with note | `OS EMS12; ON SCENE` |
| `DEST <UNIT>; <LOCATION>` | Set destination | `DEST EMS12; MERCY ED` |
| `LOGON <UNIT>` | Activate a unit | `LOGON TC1` |
| `LOGOFF <UNIT>` | Deactivate a unit | `LOGOFF TC1` |

### View Commands

| Command | Description |
|---------|-------------|
| `V SIDE` | Toggle sidebar panel |
| `V MSG` | Toggle messages panel |
| `V INC` | Toggle incident queue |
| `F <STATUS>` | Filter by status (e.g., `F AV`) |
| `F ALL` | Clear filters |
| `NIGHT` | Toggle dark mode |

### Information Commands

| Command | Description |
|---------|-------------|
| `HELP` | Full command reference |
| `INFO` | Quick reference numbers |
| `ADDR <QUERY>` | Search facility addresses |
| `WHO` | Show logged-in users |
| `STATUS` | System status summary |

---

## 6. Status Codes

| Code | Name | Description | Color |
|------|------|-------------|-------|
| **D** | Dispatch | Pending dispatch (flashing) | Blue |
| **DE** | Enroute | Traveling to scene/destination | Yellow |
| **OS** | On Scene | Arrived at scene | Orange |
| **T** | Transporting | Transporting patient | Purple |
| **AV** | Available | Ready for assignment | Green |
| **UV** | Unavailable | Not available | Gray |
| **BRK** | Break | On break/lunch | Gray |
| **OOS** | Out of Service | Not in service | Red |
| **F** | Follow Up | Requires follow up | Cyan |
| **FD** | Flagged Down | Flagged for attention | Cyan |

### Stale Warnings
Units show colored borders when status hasn't been updated:
- **Yellow border** - 10+ minutes (warning)
- **Orange border** - 20+ minutes (alert)
- **Red border** - 30+ minutes (critical)

Use `OK <UNIT>` to reset the timer without changing status.

---

## 7. Incident Management

### Creating Incidents

| Command | Description | Example |
|---------|-------------|---------|
| `NC <DEST>; <NOTE>; <TYPE>` | New incident | `NC MERCY ED; CHEST PAIN; MED` |
| `NC <DEST>` | New incident (minimal) | `NC BEND ED` |

Or press **F2** to open the new incident dialog.

### Working with Incidents

| Command | Description | Example |
|---------|-------------|---------|
| `DE <UNIT> <INC>` | Assign unit to incident | `DE EMS12 0023` |
| `R <INC>` | Review incident details | `R 0023` |
| `U <INC>; <NOTE>` | Add note to incident | `U 0023; PT STABLE` |
| `CLOSE <INC>` | Close incident | `CLOSE 0023` |
| `RQ <INC>` | Reopen incident | `RQ 0023` |

### Incident Queue
The sidebar shows queued incidents awaiting assignment. Click an incident to expand details.

---

## 8. Messaging

### Sending Messages

| Command | Description | Example |
|---------|-------------|---------|
| `MSG <ROLE>; <TEXT>` | Send normal message | `MSG SUPV1; NEED COVERAGE` |
| `HTMSG <ROLE>; <TEXT>` | Send urgent message | `HTMSG SUPV1; CALLBACK ASAP` |
| `MSGALL; <TEXT>` | Broadcast to all | `MSGALL; RADIO CHECK` |

### Viewing Messages
- Press **F4** to open the message inbox
- Unread messages show in the sidebar
- Urgent messages play an alert tone

### Deleting Messages
```
DEL ALL MSG
```

---

## 9. Field App (HOSCADField)

The Field App is a simplified mobile interface for field units.

**URL:** https://holdenportal.com/hoscadfield

### Features
- Large, glove-friendly status buttons
- Active call card with address and notes
- Command bar for messaging and lookups
- Works offline (queues updates)
- Auto dark mode after 6 PM

### Field Commands

| Command | Description |
|---------|-------------|
| `DE` / `OS` / `T` / `AV` | Change status |
| `MSG STA1; <TEXT>` | Message dispatch |
| `WHO` | Show active units |
| `WHODP` | Show online dispatchers |
| `STATUS` | Your current status |
| `NOTE; <TEXT>` | Add note to incident |
| `ADDR <QUERY>` | Facility lookup |
| `LO` | Log out |

---

## 10. Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Ctrl+K** / **F1** / **F3** | Focus command bar |
| **Ctrl+L** | Open logon modal |
| **F2** | New incident |
| **F4** | Open messages |
| **Up/Down** | Command history |
| **Enter** | Run command |
| **Esc** | Close dialogs |

---

## 11. Role-Specific Instructions

### Transfer Center Operators (STA1-6)

Your primary tasks:
1. Monitor the resource board for incoming requests
2. Dispatch units to incidents
3. Track unit status changes
4. Communicate with field units via messaging

**Typical workflow:**
1. New incident arrives in queue (or create with `NC`)
2. Find available unit (`F AV` to filter)
3. Dispatch: `DE EMS12 0023`
4. Monitor status: DE -> OS -> T -> AV
5. Close incident when complete

### Central Communications Operators (STA1-6)

Same as Transfer Center Operators, with additional focus on:
- Multi-agency coordination
- Status monitoring for all active units
- Alert/banner management for system-wide notices

**Setting Alerts:**
```
ALERT; SEVERE WEATHER - LEVEL 2 RESPONSE
```

**Setting Info Notes:**
```
NOTE; MERCY ED ON DIVERSION UNTIL 1400
```

### TC/CC Supervisors (SUPV1, SUPV2)

All operator functions plus:
- User management (`NEWUSER`, `DELUSER`, `LISTUSERS`)
- Data management (via `ADMIN` command)
- System monitoring (`STATUS`, `WHO`)
- Report generation (`REPORTOOS`)

**Admin Commands:**
Type `ADMIN` to see supervisor-only commands for:
- Clearing old data
- Managing sessions
- User administration

### Transfer Center RN (TCRN)

Focus areas:
- Patient transfer coordination
- Clinical communication with receiving facilities
- Status updates for clinical transports

Use the messaging system to coordinate with dispatch:
```
MSG STA1; PT READY FOR PICKUP RM 412
```

### Patient Logistics RN (PLRN)

Focus areas:
- Internal patient movement
- Bed placement coordination
- Discharge transportation

Track units assigned to your patients and communicate status:
```
MSG STA2; DISCHARGE PT SMITH WAITING LOBBY
```

---

## Troubleshooting

### "NETWORK ERROR" on commands
- Check internet connection
- Refresh the page (F5)
- If persists, contact IT

### Units not updating
- Check if polling is active (clock should update)
- Press REFRESH or type `REFRESH`
- Hard refresh: Ctrl+Shift+R

### Login issues
- Verify username spelling
- Check role selection
- Default password is 12345
- Contact supervisor if locked out

### Messages not appearing
- Check role matches recipient
- Verify sender role
- Press F4 to open inbox

---

## Quick Reference Card

### Essential Commands
```
DE EMS12           Dispatch unit
OS EMS12           Unit on scene
T EMS12            Unit transporting
AV EMS12           Unit available
NC DEST; NOTE      New incident
DE UNIT INC#       Assign incident
MSG ROLE; TEXT     Send message
HELP               Full command list
```

### Emergency Procedures
```
ALERT; MESSAGE     System-wide alert
HTALL; MESSAGE     Urgent broadcast
MASS D DEST        Dispatch all available
```

---

**For technical support, contact IT.**
**For operational questions, contact your supervisor.**
