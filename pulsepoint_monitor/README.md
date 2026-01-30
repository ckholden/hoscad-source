# PulsePoint Oregon Regional Monitor

A comprehensive system for monitoring PulsePoint incident data from Oregon fire/EMS agencies.

## Overview

This system has two main components:

1. **Agency Discovery** (`discover_agencies.py`) - Finds all Oregon agencies registered with PulsePoint
2. **Scraper Service** (`pulsepoint_scraper.py`) - Polls agencies for active incidents and outputs data

**No authentication required** - uses the public webapp API endpoint.

## Installation

```bash
pip install -r requirements.txt
```

Required packages:
- `cryptography` - AES decryption
- `requests` - HTTP requests
- `gspread` - Google Sheets API (optional)
- `google-auth` - Google authentication (optional)
- `schedule` - Polling scheduler

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Discover Oregon agencies
python discover_agencies.py

# Test with a single agency (Portland Fire)
python pulsepoint_scraper.py --test-agency 00291

# Run one poll cycle
python pulsepoint_scraper.py --once

# Run continuous monitoring
python pulsepoint_scraper.py
```

## Phase 1: Agency Discovery

Find all Oregon agencies:

```bash
python discover_agencies.py
```

Output saved to `oregon_agencies.json`:

```json
{
  "discovered_at": "2026-01-30T05:24:53Z",
  "total_agencies": 123,
  "agencies": [
    {"id": "00028", "name": "Clackamas Fire", "region": "Clackamas County"},
    {"id": "00041", "name": "Portland Fire & Rescue", "region": "Multnomah County"}
  ]
}
```

## Phase 2: Scraper Service

### Configuration

Edit `config.json`:

```json
{
  "poll_interval_seconds": 120,
  "output_mode": "json",
  "google_sheets_id": "YOUR_SHEET_ID",
  "service_account_file": "service_account.json",
  "enabled_agencies": ["00291", "00321", "00079"],
  "log_level": "INFO",
  "request_delay_seconds": 1.5,
  "agencies_file": "oregon_agencies.json",
  "output_file": "pulsepoint_data.json"
}
```

### Commands

```bash
# Continuous polling (default)
python pulsepoint_scraper.py

# Single poll cycle
python pulsepoint_scraper.py --once

# Test single agency
python pulsepoint_scraper.py --test-agency 00291

# Search for agencies
python pulsepoint_scraper.py --search "Portland Fire"
```

### Output: JSON (default)

Data saved to `pulsepoint_data.json`:

```json
{
  "last_updated": "2026-01-30T05:55:56Z",
  "active_incidents": [
    {
      "incident_id": "2404658199",
      "agency_id": "00291",
      "agency_name": "Portland Fire & Rescue",
      "call_type": "MU",
      "call_type_description": "Mutual Aid",
      "address": "2856 SE BOYD ST, MILWAUKIE, OR",
      "latitude": "45.4575076826",
      "longitude": "-122.6332673018",
      "units": [{"unit_id": "E20", "status": "Dispatched", "status_color": "orange"}],
      "received_time": "2026-01-30T05:53:10Z"
    }
  ],
  "unit_status": [...]
}
```

### Output: Google Sheets

1. Create a Google Cloud project and enable Sheets API
2. Create a service account and download JSON key
3. Save as `service_account.json`
4. Share your Google Sheet with the service account email
5. Set `"output_mode": "sheets"` in config.json

## Known Oregon Agencies

| Agency ID | Name | Region |
|-----------|------|--------|
| 00291 | Portland Fire & Rescue | Multnomah County |
| 00321 | Salem Fire Department | Marion County |
| 00079 | Tualatin Valley Fire & Rescue | Washington County |
| 00028 | Clackamas Fire | Clackamas County |
| 01117 | Lake Oswego Fire Department | Clackamas County |
| 00231 | Bend Fire & Rescue | Deschutes County |
| 00993 | Eugene Springfield Fire | Lane County |

Run `python pulsepoint_scraper.py --search "CITY Fire"` to find agency IDs.

## Incident Types

| Code | Description |
|------|-------------|
| ME | Medical Emergency |
| TC | Traffic Collision |
| VF | Vehicle Fire |
| SF | Structure Fire |
| VEG | Vegetation Fire |
| OF | Outside Fire |
| MU | Mutual Aid |
| FA/AFA | Fire Alarm |
| GAS | Gas Leak |
| HAZMAT | Hazardous Materials |
| WR | Water Rescue |
| LA | Lift Assist |
| PS | Public Service |

## Unit Status Colors

| Color | Status |
|-------|--------|
| Orange | Dispatched / Acknowledged |
| Green | Enroute / Staged |
| Red | On Scene |
| Yellow | Transport |
| Blue | Transport Arrived |
| Gray | Cleared / Available |

## Technical Details

### API Endpoint

```
https://api.pulsepoint.org/v1/webapp?resource=incidents&agencyid=AGENCY_ID
```

### Encryption

Responses are AES-256-CBC encrypted:
- Key derivation: OpenSSL EVP_BytesToKey with MD5
- Password: `tombrady5rings` (decoded from web app JS)

### Response Format

```json
{"ct": "base64_ciphertext", "iv": "hex_iv", "s": "hex_salt"}
```

## File Structure

```
pulsepoint_monitor/
├── config.json              # Configuration
├── discover_agencies.py     # Phase 1: Agency discovery
├── pulsepoint_scraper.py    # Phase 2: Scraper service
├── pulsepoint_constants.py  # Reference data
├── oregon_agencies.json     # Discovered agencies (generated)
├── pulsepoint_data.json     # Output data (generated)
├── requirements.txt         # Python dependencies
└── README.md
```

## License

For educational and personal use only. PulsePoint data usage subject to their terms of service.
