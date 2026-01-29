# HOSCAD Admin Commands

**Access:** SUPV1, SUPV2, MGR1, MGR2, IT roles only

## Data Management Commands

| Command | Description |
|---------|-------------|
| `ADMIN` | Show admin command reference |
| `PURGE` | Clean old data (>7 days) + install daily auto-purge trigger |
| `CLEARDATA UNITS` | Clear ALL units from board |
| `CLEARDATA INACTIVE` | Clear only inactive/logged-off units |
| `CLEARDATA AUDIT` | Clear unit audit history |
| `CLEARDATA INCIDENTS` | Clear all incidents |
| `CLEARDATA MESSAGES` | Clear all messages |
| `CLEARDATA SESSIONS` | Log out all users (force re-login) |
| `CLEARDATA ALL` | Clear all data (units, incidents, audit, messages) |

## User Management Commands

| Command | Description |
|---------|-------------|
| `NEWUSER lastname,firstname` | Create new user (default password: 12345) |
| `DELUSER <username>` | Delete user |
| `LISTUSERS` | Show all system users |

## Available Roles

| Role | Description |
|------|-------------|
| STA1-6 | Station positions (Central Communications) |
| SUPV1, SUPV2 | Supervisors (admin access) |
| MGR1, MGR2 | Managers (admin access) |
| EMS | EMS Operations |
| TCRN | Transfer Center RN |
| PLRN | Patient Logistics RN |
| IT | Information Technology (restricted to authorized users) |

## Notes

- PURGE automatically runs daily once triggered
- CLEARDATA operations cannot be undone
- CLEARDATA SESSIONS will log you out too
- IT role is restricted to authorized users only (currently: holdenc)
