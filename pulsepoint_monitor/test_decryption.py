#!/usr/bin/env python3
"""
Test script to verify PulsePoint API connectivity and authentication.

Run this to test your credentials and API access.
"""

import json
import sys
import requests

# PulsePoint API
PULSEPOINT_API = "https://api.pulsepoint.org/v1"

# Test agencies
TEST_AGENCIES = [
    ("41", "Portland Fire & Rescue"),
    ("28", "Clackamas Fire"),
    ("79", "Tualatin Valley Fire & Rescue"),
    ("1117", "Lake Oswego Fire Department"),
]


def test_search_api():
    """Test the public search API."""
    print("=" * 60)
    print("Testing Public Search API")
    print("=" * 60)

    try:
        response = requests.get(
            f"{PULSEPOINT_API}/search",
            params={"term": "Fire"},
            timeout=30
        )
        print(f"Status: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type', 'unknown')}")

        if response.status_code == 200:
            # Count Oregon agencies in response
            import re
            oregon_count = len(re.findall(r'\[OR United States\]', response.text))
            print(f"Oregon agencies found: {oregon_count}")
            print("Search API: WORKING")
            return True
        else:
            print("Search API: FAILED")
            return False

    except Exception as e:
        print(f"Error: {e}")
        return False


def test_incidents_api(token: str = None):
    """Test the incidents API (requires authentication)."""
    print("\n" + "=" * 60)
    print("Testing Incidents API")
    print("=" * 60)

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
    }

    if token:
        headers['Authorization'] = f'Bearer {token}'
        print(f"Using token: {token[:20]}...")
    else:
        print("No token provided - expecting 401 response")

    for agency_id, agency_name in TEST_AGENCIES[:2]:
        url = f"{PULSEPOINT_API}/agencies/{agency_id}/incidents"
        print(f"\nTesting: {agency_name} ({agency_id})")

        try:
            response = requests.get(url, headers=headers, timeout=30)
            print(f"  Status: {response.status_code}")

            if response.status_code == 200:
                data = response.json()
                if isinstance(data, dict):
                    incidents = data.get("incidents", {}).get("active", [])
                    print(f"  Active incidents: {len(incidents)}")
                print("  Result: SUCCESS")
            elif response.status_code == 401:
                print("  Result: AUTH REQUIRED (expected without token)")
            else:
                print(f"  Result: {response.text[:100]}")

        except Exception as e:
            print(f"  Error: {e}")


def main():
    """Run connectivity tests."""
    print("PulsePoint API Connectivity Test")
    print("=" * 60)

    # Test public search API
    search_ok = test_search_api()

    # Test incidents API
    token = None
    if len(sys.argv) > 1:
        token = sys.argv[1]

    test_incidents_api(token)

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Search API (public): {'WORKING' if search_ok else 'FAILED'}")
    print(f"Incidents API: Requires authentication")
    print("\nTo test with authentication:")
    print("  python test_decryption.py YOUR_API_TOKEN")
    print("\nOr add credentials to config.json and run:")
    print("  python pulsepoint_scraper.py --test-agency 41")


if __name__ == "__main__":
    main()
