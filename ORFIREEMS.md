# Oregon Fire/EMS CAD Monitor

A real-time CAD-style dashboard that monitors PulsePoint data for all Oregon fire and EMS agencies.

## Overview

This system scrapes PulsePoint's public API for incident data across 100+ Oregon fire/EMS agencies and displays it in a CAD-style dashboard interface.

## Components

### 1. PulsePoint Scraper (`pulsepoint_monitor/`)

- **`pulsepoint_scraper.py`** - Python script that polls PulsePoint API
- **`oregon_agencies.json`** - List of all Oregon agency IDs and names
- **`config.json`** - Configuration for polling interval, agencies, output paths

The scraper:
- Polls all configured Oregon agencies every 2 minutes (local) or 5 minutes (GitHub Actions)
- Decrypts PulsePoint's AES-256-CBC encrypted responses
- Outputs active and recent incidents to `pulsepoint_data.json`

### 2. GitHub Actions (`.github/workflows/pulsepoint-scraper.yml`)

Automated scraper that runs every 5 minutes:
- Checks out the repo
- Runs the Python scraper
- Commits updated data to `docs/pulsepoint_data.json`
- GitHub Pages serves the data file

### 3. Dashboard (`Holden-nerd-portal/orfireems/`)

CAD-style dashboard hosted on GitHub Pages.

**URL:** https://holdenportal.com/orfireems

**Features:**
- Real-time incident table (active incidents highlighted)
- Time filters: Last 12 hours, 12-24 hours, All time
- Agency filtering with checkboxes
- Click incidents for detailed modal (units, coordinates, Google Maps link)
- Auto-refresh every minute

### 4. Local Server Integration (`hoscad-frontend/server.js`)

The local dev server also runs the scraper:
- Available at `localhost:8080/orfireems`
- Runs scraper every 2 minutes

## Data Flow

```
PulsePoint API
     |
     v
pulsepoint_scraper.py (every 5 min via GitHub Actions)
     |
     v
pulsepoint_data.json (committed to repo)
     |
     v
GitHub Pages serves JSON
     |
     v
holdenportal.com/orfireems fetches and displays
```

## Configuration

### `pulsepoint_monitor/config.json`

```json
{
  "poll_interval_seconds": 120,
  "output_mode": "json",
  "enabled_agencies": ["00028", "00041", ...],
  "log_level": "INFO",
  "request_delay_seconds": 1.5,
  "agencies_file": "oregon_agencies.json",
  "output_file": "../pulsepoint_data.json"
}
```

## Incident Types

| Code | Description |
|------|-------------|
| ME | Medical Emergency |
| TC | Traffic Collision |
| SF | Structure Fire |
| VF | Vehicle Fire |
| VEG | Vegetation Fire |
| FA | Fire Alarm |
| LA | Lift Assist |
| PS | Public Service |

## Unit Status Colors

| Status | Color | Meaning |
|--------|-------|---------|
| DP | Orange | Dispatched |
| ER | Yellow | Enroute |
| OS | Green | On Scene |
| TR | Blue | Transporting |
| AR | Gray | Available |

## Agencies Monitored

Over 100 Oregon agencies including:
- Portland Fire & Rescue
- Salem Fire Department
- Tualatin Valley Fire & Rescue
- Clackamas Fire District
- Eugene Springfield Fire
- Bend Fire & Rescue
- And many more...

See `pulsepoint_monitor/oregon_agencies.json` for the complete list.

## Running Locally

1. Start the server:
   ```bash
   cd hoscad-frontend
   node server.js
   ```

2. Open http://localhost:8080/orfireems

3. The scraper runs automatically every 2 minutes

## Dependencies

- Python 3.11+
- `cryptography` - For AES decryption
- `requests` - For HTTP requests
- `schedule` - For polling scheduler
- Node.js (for local server)
