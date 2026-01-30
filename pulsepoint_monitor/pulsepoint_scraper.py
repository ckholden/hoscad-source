#!/usr/bin/env python3
"""
PulsePoint Scraper Service

Polls PulsePoint API for active incidents from Oregon agencies.
Outputs to Google Sheets or local JSON.

NO AUTHENTICATION REQUIRED - Uses the public webapp API endpoint.
"""

import base64
import hashlib
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import requests
import schedule

try:
    import gspread
    from google.oauth2.service_account import Credentials
    GSPREAD_AVAILABLE = True
except ImportError:
    GSPREAD_AVAILABLE = False

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

# PulsePoint API configuration
PULSEPOINT_API_BASE = "https://api.pulsepoint.org/v1/webapp"
PULSEPOINT_PASSWORD = b"tombrady5rings"  # Decoded from web app JS

# Incident type descriptions
INCIDENT_TYPES = {
    "ME": "Medical Emergency",
    "TC": "Traffic Collision",
    "VF": "Vehicle Fire",
    "SF": "Structure Fire",
    "VEG": "Vegetation Fire",
    "MA": "Manual Alarm",
    "FA": "Fire Alarm",
    "AFA": "Automatic Fire Alarm",
    "GAS": "Gas Leak",
    "WR": "Water Rescue",
    "MCI": "Mass Casualty Incident",
    "LA": "Lift Assist",
    "PS": "Public Service",
    "ELV": "Elevator Emergency",
    "HAZMAT": "Hazardous Materials",
    "CO": "Carbon Monoxide",
    "EL": "Electrical",
    "FLOOD": "Flooding",
    "WIRE": "Wires Down",
    "ODOR": "Odor Investigation",
    "SMOKE": "Smoke Investigation",
    "OF": "Outside Fire",
    "MU": "Mutual Aid",
    "TRANS": "Transfer",
    "TEST": "Test Incident",
}

# Unit status mapping
UNIT_STATUS = {
    "DP": {"color": "orange", "description": "Dispatched"},
    "AK": {"color": "orange", "description": "Acknowledged"},
    "ER": {"color": "green", "description": "Enroute"},
    "SG": {"color": "green", "description": "Staged"},
    "OS": {"color": "red", "description": "On Scene"},
    "AOS": {"color": "red", "description": "Available On Scene"},
    "AR": {"color": "gray", "description": "Available"},
    "TR": {"color": "yellow", "description": "Transport"},
    "TA": {"color": "blue", "description": "Transport Arrived"},
    "AT": {"color": "blue", "description": "At Hospital"},
    "AQ": {"color": "gray", "description": "Available In Quarters"},
    "CLR": {"color": "gray", "description": "Cleared"},
}


def setup_logging(level: str = "INFO") -> logging.Logger:
    """Configure logging."""
    logger = logging.getLogger("pulsepoint")
    logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(logging.Formatter(
            "%(asctime)s [%(levelname)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        ))
        logger.addHandler(handler)

    return logger


def evp_bytes_to_key(password: bytes, salt: bytes, key_len: int = 32, iv_len: int = 16) -> tuple[bytes, bytes]:
    """OpenSSL EVP_BytesToKey key derivation with MD5."""
    d = d_i = b''
    while len(d) < key_len + iv_len:
        d_i = hashlib.md5(d_i + password + salt).digest()
        d += d_i
    return d[:key_len], d[key_len:key_len + iv_len]


def decrypt_response(data: dict) -> dict:
    """
    Decrypt PulsePoint API response.

    Args:
        data: Dictionary with ct (ciphertext), iv, and s (salt)

    Returns:
        Decrypted JSON data
    """
    ct = base64.b64decode(data["ct"])
    iv = bytes.fromhex(data["iv"])
    salt = bytes.fromhex(data["s"])

    key, _ = evp_bytes_to_key(PULSEPOINT_PASSWORD, salt)

    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    decryptor = cipher.decryptor()
    padded = decryptor.update(ct) + decryptor.finalize()

    pad_len = padded[-1]
    plaintext = padded[:-pad_len].decode('utf-8')

    result = json.loads(plaintext)
    # Handle double-encoded JSON
    if isinstance(result, str):
        result = json.loads(result)

    return result


def fetch_incidents(agency_id: str, logger: logging.Logger) -> Optional[dict]:
    """
    Fetch incidents for an agency.

    Args:
        agency_id: PulsePoint agency ID (e.g., "00291")
        logger: Logger instance

    Returns:
        Incidents data or None on error
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
    }

    url = f"{PULSEPOINT_API_BASE}?resource=incidents&agencyid={agency_id}"

    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()

        encrypted = response.json()

        if not all(k in encrypted for k in ("ct", "iv", "s")):
            logger.warning(f"Agency {agency_id}: Response missing encryption fields")
            return None

        decrypted = decrypt_response(encrypted)
        return decrypted.get("incidents", {})

    except requests.RequestException as e:
        logger.error(f"Agency {agency_id}: Request failed - {e}")
        return None
    except Exception as e:
        logger.error(f"Agency {agency_id}: Error - {e}")
        return None


def fetch_agency_info(agency_id: str, logger: logging.Logger) -> Optional[dict]:
    """
    Fetch agency metadata.

    Args:
        agency_id: PulsePoint agency ID
        logger: Logger instance

    Returns:
        Agency info or None on error
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
    }

    url = f"{PULSEPOINT_API_BASE}?resource=agencies&agencyid={agency_id}"

    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()

        decrypted = decrypt_response(response.json())
        agencies = decrypted.get("agencies", [])

        if agencies:
            return agencies[0]
        return None

    except Exception as e:
        logger.error(f"Agency {agency_id}: Error fetching info - {e}")
        return None


def search_agencies(search_term: str) -> list[dict]:
    """
    Search for agencies by name/location.

    Args:
        search_term: Search query

    Returns:
        List of matching agencies
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
    }

    url = f"{PULSEPOINT_API_BASE}?resource=searchagencies&token={search_term}"

    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()

        decrypted = decrypt_response(response.json())
        return decrypted.get("searchagencies", [])

    except Exception:
        return []


def parse_incidents(incidents_data: dict, agency_id: str, agency_name: str, incident_type: str = "active") -> list[dict]:
    """Parse incidents from API response."""
    incidents = []

    for incident in incidents_data.get(incident_type, []):
        units = []
        for unit in incident.get("Unit", []):
            unit_id = unit.get("UnitID", "Unknown")
            status_code = unit.get("PulsePointDispatchStatus", "")
            status_info = UNIT_STATUS.get(status_code, {"color": "unknown", "description": status_code})

            units.append({
                "unit_id": unit_id,
                "status_code": status_code,
                "status": status_info["description"],
                "status_color": status_info["color"],
            })

        call_type = incident.get("PulsePointIncidentCallType", "UNK")
        call_type_desc = INCIDENT_TYPES.get(call_type, call_type)

        parsed = {
            "incident_id": incident.get("ID", ""),
            "agency_id": agency_id,
            "agency_name": agency_name,
            "call_type": call_type,
            "call_type_description": call_type_desc,
            "address": incident.get("FullDisplayAddress", ""),
            "latitude": incident.get("Latitude", ""),
            "longitude": incident.get("Longitude", ""),
            "received_time": incident.get("CallReceivedDateTime", ""),
            "alarm_level": incident.get("AlarmLevel", ""),
            "units": units,
            "unit_count": len(units),
            "units_display": ", ".join(u["unit_id"] for u in units),
            "is_active": incident_type == "active",
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }
        incidents.append(parsed)

    return incidents


def parse_unit_status(incidents: list[dict]) -> list[dict]:
    """Extract unit status records from incidents."""
    unit_records = []
    timestamp = datetime.now(timezone.utc).isoformat()

    for incident in incidents:
        for unit in incident.get("units", []):
            unit_records.append({
                "unit_id": unit["unit_id"],
                "agency_id": incident["agency_id"],
                "incident_id": incident["incident_id"],
                "status_code": unit["status_code"],
                "status": unit["status"],
                "status_color": unit["status_color"],
                "last_update": timestamp,
            })

    return unit_records


class GoogleSheetsOutput:
    """Handler for Google Sheets output."""

    SCOPES = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
    ]

    def __init__(self, sheet_id: str, service_account_file: str, logger: logging.Logger):
        self.sheet_id = sheet_id
        self.logger = logger

        if not GSPREAD_AVAILABLE:
            raise ImportError("gspread and google-auth packages required")

        creds = Credentials.from_service_account_file(service_account_file, scopes=self.SCOPES)
        self.client = gspread.authorize(creds)
        self.spreadsheet = self.client.open_by_key(sheet_id)
        self._ensure_worksheets()

    def _ensure_worksheets(self):
        existing = [ws.title for ws in self.spreadsheet.worksheets()]

        if "Agencies" not in existing:
            ws = self.spreadsheet.add_worksheet("Agencies", rows=200, cols=5)
            ws.update('A1:E1', [["agency_id", "name", "region", "enabled", "last_poll"]])

        if "Active_Incidents" not in existing:
            ws = self.spreadsheet.add_worksheet("Active_Incidents", rows=500, cols=13)
            ws.update('A1:M1', [[
                "incident_id", "agency_id", "agency_name", "call_type",
                "call_type_description", "address", "latitude", "longitude",
                "units", "unit_count", "alarm_level", "received_time", "fetched_at"
            ]])

        if "Unit_Status" not in existing:
            ws = self.spreadsheet.add_worksheet("Unit_Status", rows=500, cols=7)
            ws.update('A1:G1', [[
                "unit_id", "agency_id", "incident_id", "status_code",
                "status", "status_color", "last_update"
            ]])

    def update_incidents(self, incidents: list[dict]):
        ws = self.spreadsheet.worksheet("Active_Incidents")
        ws.batch_clear(["A2:M1000"])

        if incidents:
            rows = [[
                inc["incident_id"], inc["agency_id"], inc["agency_name"],
                inc["call_type"], inc["call_type_description"], inc["address"],
                inc["latitude"], inc["longitude"], inc["units_display"],
                inc["unit_count"], inc["alarm_level"], inc["received_time"],
                inc["fetched_at"]
            ] for inc in incidents]
            ws.update(f"A2:M{len(rows)+1}", rows)

        self.logger.info(f"Updated {len(incidents)} incidents in Sheets")

    def update_units(self, units: list[dict]):
        ws = self.spreadsheet.worksheet("Unit_Status")
        ws.batch_clear(["A2:G1000"])

        if units:
            rows = [[
                u["unit_id"], u["agency_id"], u["incident_id"],
                u["status_code"], u["status"], u["status_color"], u["last_update"]
            ] for u in units]
            ws.update(f"A2:G{len(rows)+1}", rows)

    def update_agency_poll_time(self, agency_id: str):
        ws = self.spreadsheet.worksheet("Agencies")
        timestamp = datetime.now(timezone.utc).isoformat()
        try:
            cell = ws.find(agency_id)
            if cell:
                ws.update_cell(cell.row, 5, timestamp)
        except Exception:
            pass


class JSONFileOutput:
    """Handler for local JSON file output."""

    def __init__(self, output_file: str, logger: logging.Logger):
        self.output_file = Path(output_file)
        self.logger = logger
        self.data = {
            "last_updated": None,
            "agencies": {},
            "active_incidents": [],
            "recent_incidents": [],
            "unit_status": [],
        }

        if self.output_file.exists():
            try:
                with open(self.output_file, "r", encoding="utf-8") as f:
                    self.data = json.load(f)
            except json.JSONDecodeError:
                pass

    def _save(self):
        self.data["last_updated"] = datetime.now(timezone.utc).isoformat()
        with open(self.output_file, "w", encoding="utf-8") as f:
            json.dump(self.data, f, indent=2, ensure_ascii=False)

    def update_incidents(self, active_incidents: list[dict], recent_incidents: list[dict] = None):
        self.data["active_incidents"] = active_incidents
        if recent_incidents is not None:
            self.data["recent_incidents"] = recent_incidents
        self._save()
        total = len(active_incidents) + (len(recent_incidents) if recent_incidents else 0)
        self.logger.info(f"Saved {len(active_incidents)} active, {len(recent_incidents) if recent_incidents else 0} recent incidents to {self.output_file}")

    def update_units(self, units: list[dict]):
        self.data["unit_status"] = units
        self._save()

    def update_agency_poll_time(self, agency_id: str, agency_name: str = None):
        if "agencies" not in self.data:
            self.data["agencies"] = {}
        if agency_id not in self.data["agencies"]:
            self.data["agencies"][agency_id] = {}
        self.data["agencies"][agency_id]["last_poll"] = datetime.now(timezone.utc).isoformat()
        if agency_name:
            self.data["agencies"][agency_id]["name"] = agency_name
        self._save()


class PulsePointScraper:
    """Main scraper service."""

    def __init__(self, config_file: str = "config.json"):
        with open(config_file, "r", encoding="utf-8") as f:
            self.config = json.load(f)

        self.logger = setup_logging(self.config.get("log_level", "INFO"))
        self.logger.info("PulsePoint Scraper initializing...")

        # Load agencies
        self.agencies = self._load_agencies()
        self.enabled = set(self.config.get("enabled_agencies", []))

        # Setup output
        output_mode = self.config.get("output_mode", "json")
        if output_mode == "sheets":
            if not GSPREAD_AVAILABLE:
                raise ImportError("gspread not available")
            self.output = GoogleSheetsOutput(
                self.config["google_sheets_id"],
                self.config["service_account_file"],
                self.logger
            )
        else:
            self.output = JSONFileOutput(
                self.config.get("output_file", "pulsepoint_data.json"),
                self.logger
            )

        self.delay = self.config.get("request_delay_seconds", 1.5)
        self.logger.info(f"Loaded {len(self.agencies)} agencies, {len(self.enabled)} enabled")

    def _load_agencies(self) -> dict:
        agencies_file = self.config.get("agencies_file", "oregon_agencies.json")

        if not os.path.exists(agencies_file):
            self.logger.warning(f"Agencies file not found: {agencies_file}")
            return {}

        with open(agencies_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        return {a["id"]: a for a in data.get("agencies", [])}

    def poll_all_agencies(self):
        """Poll all enabled agencies for active and recent incidents."""
        self.logger.info("=" * 50)
        self.logger.info("Starting poll cycle...")

        all_active = []
        all_recent = []
        enabled_list = list(self.enabled)

        for i, agency_id in enumerate(enabled_list, 1):
            agency_info = self.agencies.get(agency_id, {})
            agency_name = agency_info.get("name", f"Agency {agency_id}")

            self.logger.info(f"[{i}/{len(enabled_list)}] Polling {agency_id} - {agency_name}")

            incidents_data = fetch_incidents(agency_id, self.logger)

            if incidents_data is None:
                self.output.update_agency_poll_time(agency_id, agency_name)
                continue

            active_incidents = parse_incidents(incidents_data, agency_id, agency_name, "active")
            recent_incidents = parse_incidents(incidents_data, agency_id, agency_name, "recent")

            all_active.extend(active_incidents)
            all_recent.extend(recent_incidents)

            self.output.update_agency_poll_time(agency_id, agency_name)

            self.logger.info(f"  Active: {len(active_incidents)}, Recent: {len(recent_incidents)}")

            if i < len(enabled_list):
                time.sleep(self.delay)

        all_units = parse_unit_status(all_active)

        self.output.update_incidents(all_active, all_recent)
        self.output.update_units(all_units)

        self.logger.info(f"Poll complete: {len(all_active)} active, {len(all_recent)} recent incidents, {len(all_units)} units")
        self.logger.info("=" * 50)

    def run_once(self):
        self.poll_all_agencies()

    def run_continuous(self):
        interval = self.config.get("poll_interval_seconds", 120)
        self.logger.info(f"Starting continuous polling (every {interval}s)")
        self.logger.info("Press Ctrl+C to stop")

        self.poll_all_agencies()
        schedule.every(interval).seconds.do(self.poll_all_agencies)

        try:
            while True:
                schedule.run_pending()
                time.sleep(1)
        except KeyboardInterrupt:
            self.logger.info("Shutting down...")


def main():
    import argparse

    parser = argparse.ArgumentParser(description="PulsePoint Oregon Scraper")
    parser.add_argument("-c", "--config", default="config.json", help="Config file path")
    parser.add_argument("--once", action="store_true", help="Run single poll cycle")
    parser.add_argument("--test-agency", metavar="ID", help="Test fetching a single agency")
    parser.add_argument("--search", metavar="TERM", help="Search for agencies")

    args = parser.parse_args()

    if args.search:
        results = search_agencies(args.search)
        print(f"Found {len(results)} agencies:")
        for r in results:
            print(f"  {r.get('agencyid', '?')}: {r.get('Display1', '?')} - {r.get('Display2', '?')}")
        return

    if args.test_agency:
        logger = setup_logging("DEBUG")
        logger.info(f"Testing agency {args.test_agency}")

        # Get agency info
        info = fetch_agency_info(args.test_agency, logger)
        if info:
            print(f"\nAgency: {info.get('agencyname', 'Unknown')}")
            print(f"City: {info.get('city')}, State: {info.get('state')}")

        # Get incidents
        incidents = fetch_incidents(args.test_agency, logger)
        if incidents:
            active = incidents.get("active", [])
            recent = incidents.get("recent", [])
            print(f"\nActive incidents: {len(active)}")
            print(f"Recent incidents: {len(recent)}")

            if active:
                print("\nActive incidents:")
                for inc in active[:5]:
                    call_type = inc.get("PulsePointIncidentCallType", "?")
                    address = inc.get("FullDisplayAddress", "?")
                    units = [u.get("UnitID") for u in inc.get("Unit", [])]
                    print(f"  {call_type}: {address}")
                    print(f"    Units: {', '.join(units)}")
        return

    scraper = PulsePointScraper(args.config)

    if args.once:
        scraper.run_once()
    else:
        scraper.run_continuous()


if __name__ == "__main__":
    main()
