#!/usr/bin/env python3
"""
PulsePoint Oregon Agency Discovery Script

Searches the PulsePoint agency API to find all Oregon fire/EMS agencies.
Outputs discovered agencies to oregon_agencies.json.

NOTE: Uses the v1/search endpoint which returns PHP array format.
"""

import json
import re
import time
from datetime import datetime, timezone
import requests

# PulsePoint agency search endpoint (returns PHP print_r format)
SEARCH_API = "https://api.pulsepoint.org/v1/search"

# Known Oregon agencies (verified working)
KNOWN_AGENCIES = {
    "00028": {"name": "Clackamas Fire", "region": "Clackamas County"},
    "00041": {"name": "Portland Fire & Rescue", "region": "Multnomah County"},
    "00079": {"name": "Tualatin Valley Fire & Rescue", "region": "Washington County"},
    "01117": {"name": "Lake Oswego Fire Department", "region": "Clackamas County"},
}


def fetch_all_agencies() -> str:
    """
    Fetch the full agency list from PulsePoint.
    The API returns PHP print_r format containing all agencies.

    Returns:
        Raw text response containing agency data
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
    }

    # The search endpoint returns all agencies regardless of search term
    response = requests.get(SEARCH_API, params={"term": "Fire"}, headers=headers, timeout=60)
    response.raise_for_status()

    return response.text


def parse_php_array(text: str) -> list[dict]:
    """
    Parse PHP print_r array format into list of agencies.

    Args:
        text: Raw PHP print_r output

    Returns:
        List of agency dictionaries
    """
    agencies = []

    # Pattern to match each agency entry
    # [Type] => Agency
    # [Display1] => Agency Name
    # [Display2] => [STATE Country] Serving Cities
    # [Agency] => ID
    pattern = re.compile(
        r'\[Type\] => Agency\s*\n\s*'
        r'\[Display1\] => ([^\n]+)\s*\n\s*'
        r'\[Display2\] => \[([A-Z]{2}) ([^\]]+)\][^\n]*\n\s*'
        r'\[Agency\] => (\d+)',
        re.MULTILINE
    )

    for match in pattern.finditer(text):
        name = match.group(1).strip()
        state = match.group(2).strip()
        country = match.group(3).strip()
        agency_id = match.group(4).strip()

        agencies.append({
            "id": agency_id.zfill(5),
            "name": name,
            "state": state,
            "country": country,
        })

    return agencies


def extract_region_from_name(name: str) -> str:
    """
    Extract region information from agency name.

    Args:
        name: Agency name

    Returns:
        Region string
    """
    # Try to extract county
    county_match = re.search(r"(\w+)\s+County", name, re.IGNORECASE)
    if county_match:
        return f"{county_match.group(1)} County"

    # Try to extract city from common patterns
    city_patterns = [
        r"^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:Fire|Rural|Volunteer)",
        r"^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+F(?:ire)?",
    ]

    for pattern in city_patterns:
        match = re.search(pattern, name)
        if match:
            return match.group(1)

    return "Oregon"


def discover_oregon_agencies() -> dict:
    """
    Discover all Oregon agencies from PulsePoint API.

    Returns:
        Dictionary with discovery timestamp and list of agencies
    """
    print("Fetching agency data from PulsePoint API...")
    raw_data = fetch_all_agencies()
    print(f"Received {len(raw_data):,} characters of data")

    print("Parsing agency data...")
    all_agencies = parse_php_array(raw_data)
    print(f"Found {len(all_agencies):,} total agencies")

    # Filter for Oregon agencies
    oregon_agencies = [a for a in all_agencies if a["state"] == "OR"]
    print(f"Found {len(oregon_agencies)} Oregon agencies")

    # Enhance with known agency data and extract regions
    discovered = {}

    # Add known agencies first
    for agency_id, info in KNOWN_AGENCIES.items():
        discovered[agency_id] = {
            "id": agency_id,
            "name": info["name"],
            "region": info["region"],
        }

    # Add discovered agencies
    for agency in oregon_agencies:
        agency_id = agency["id"]

        # Skip if we have better known data
        if agency_id in discovered:
            continue

        discovered[agency_id] = {
            "id": agency_id,
            "name": agency["name"],
            "region": extract_region_from_name(agency["name"]),
        }

    # Sort by ID
    agencies_list = sorted(discovered.values(), key=lambda x: x["id"])

    return {
        "discovered_at": datetime.now(timezone.utc).isoformat(),
        "total_agencies": len(agencies_list),
        "note": "Discovered via PulsePoint v1/search API",
        "agencies": agencies_list
    }


def main():
    """Main entry point."""
    print("=" * 60)
    print("PulsePoint Oregon Agency Discovery")
    print("=" * 60)

    try:
        result = discover_oregon_agencies()
    except requests.RequestException as e:
        print(f"Error fetching data: {e}")
        return

    # Write to file
    output_file = "oregon_agencies.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 60)
    print(f"Discovery complete!")
    print(f"Found {result['total_agencies']} Oregon agencies")
    print(f"Output saved to: {output_file}")
    print("=" * 60)

    # Print summary
    print("\nDiscovered Agencies:")
    print("-" * 60)
    for agency in result["agencies"]:
        print(f"  {agency['id']}: {agency['name']:<45} ({agency['region']})")


if __name__ == "__main__":
    main()
