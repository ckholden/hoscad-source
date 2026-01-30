"""
PulsePoint constants and reference data.
"""

# PulsePoint API endpoints
SEARCH_API = "https://web.pulsepoint.org/DB/search-agency.php"
DATA_API = "https://web.pulsepoint.org/DB/giba.php"

# Decryption password (from PulsePoint app JavaScript)
DECRYPT_PASSWORD = b"sbrady5rilegs"

# Incident type codes and descriptions
INCIDENT_TYPES = {
    # Medical
    "ME": "Medical Emergency",
    "MCI": "Mass Casualty Incident",
    "LA": "Lift Assist",
    "TRANS": "Transfer/Transport",

    # Fire - Structure
    "SF": "Structure Fire",
    "SFA": "Structure Fire Alarm",
    "AFA": "Automatic Fire Alarm",
    "FA": "Fire Alarm",
    "MA": "Manual Alarm",

    # Fire - Vehicle
    "VF": "Vehicle Fire",

    # Fire - Vegetation
    "VEG": "Vegetation Fire",
    "BF": "Brush Fire",
    "GF": "Grass Fire",

    # Fire - Other
    "RF": "Rubbish Fire",
    "OF": "Outside Fire",
    "FIRE": "Fire (General)",

    # Traffic
    "TC": "Traffic Collision",
    "TCA": "Traffic Collision w/ Injuries",
    "TCE": "Traffic Collision w/ Entrapment",
    "EXTR": "Extrication",

    # Hazmat
    "HAZMAT": "Hazardous Materials",
    "GAS": "Gas Leak",
    "CO": "Carbon Monoxide",
    "FUEL": "Fuel Spill",
    "ODOR": "Odor Investigation",

    # Rescue
    "WR": "Water Rescue",
    "TR": "Technical Rescue",
    "SR": "Swift Water Rescue",
    "CONF": "Confined Space",
    "ROPE": "Rope Rescue",
    "TRENCH": "Trench Rescue",

    # Service
    "PS": "Public Service",
    "ELV": "Elevator Emergency",
    "LOCK": "Lock Out",
    "APTS": "Animal Problem",

    # Electrical/Utility
    "EL": "Electrical",
    "WIRE": "Wires Down",
    "TRANS": "Transformer",

    # Weather
    "FLOOD": "Flooding",
    "STORM": "Storm Related",

    # Investigation
    "SMOKE": "Smoke Investigation",
    "INVEST": "Investigation",

    # Mutual Aid
    "MUAID": "Mutual Aid",
    "COV": "Coverage",
    "MOVE": "Move Up",

    # Other
    "TEST": "Test Incident",
    "UNK": "Unknown",
    "OTH": "Other",
}

# Unit dispatch status codes
UNIT_STATUS_CODES = {
    # Active statuses
    "DP": {
        "description": "Dispatched",
        "color": "orange",
        "active": True,
    },
    "AK": {
        "description": "Acknowledged",
        "color": "orange",
        "active": True,
    },
    "ER": {
        "description": "Enroute",
        "color": "green",
        "active": True,
    },
    "OS": {
        "description": "On Scene",
        "color": "red",
        "active": True,
    },
    "AOS": {
        "description": "Available On Scene",
        "color": "red",
        "active": True,
    },
    "TR": {
        "description": "Transport",
        "color": "yellow",
        "active": True,
    },
    "TA": {
        "description": "Transport Arrived",
        "color": "blue",
        "active": True,
    },
    "AT": {
        "description": "At Hospital",
        "color": "blue",
        "active": True,
    },

    # Available/Cleared statuses
    "AQ": {
        "description": "Available In Quarters",
        "color": "gray",
        "active": False,
    },
    "CLR": {
        "description": "Cleared",
        "color": "gray",
        "active": False,
    },
    "AVL": {
        "description": "Available",
        "color": "gray",
        "active": False,
    },
    "AR": {
        "description": "Available On Radio",
        "color": "gray",
        "active": False,
    },

    # Out of service
    "OOS": {
        "description": "Out Of Service",
        "color": "black",
        "active": False,
    },
    "STN": {
        "description": "At Station",
        "color": "gray",
        "active": False,
    },
}

# Known Oregon agencies (verified working)
KNOWN_OREGON_AGENCIES = {
    "00057": {
        "name": "Clackamas Fire District #1",
        "region": "Clackamas County",
        "dispatch": "CCOM",
    },
    "00291": {
        "name": "Portland Fire & Rescue",
        "region": "Multnomah County",
        "dispatch": "BOEC",
    },
    "00485": {
        "name": "Tualatin Valley Fire & Rescue",
        "region": "Washington County",
        "dispatch": "WCCCA",
    },
    "40210": {
        "name": "Lake Oswego Fire Department",
        "region": "Clackamas County",
        "dispatch": "LOCOM",
    },
}

# Oregon dispatch centers
OREGON_DISPATCH_CENTERS = {
    "BOEC": {
        "name": "Bureau of Emergency Communications",
        "region": "Portland Metro",
        "serves": ["Portland", "Multnomah County"],
    },
    "WCCCA": {
        "name": "Washington County Consolidated Communications Agency",
        "region": "Washington County",
        "serves": ["TVF&R", "Hillsboro", "Beaverton", "Tigard", "Forest Grove"],
    },
    "CCOM": {
        "name": "Clackamas County Communications",
        "region": "Clackamas County",
        "serves": ["Clackamas FD", "Gladstone", "Milwaukie", "Oregon City"],
    },
    "LOCOM": {
        "name": "Lake Oswego Communications",
        "region": "Lake Oswego",
        "serves": ["Lake Oswego Fire"],
    },
    "YCOM": {
        "name": "Yamhill Communications Agency",
        "region": "Yamhill County",
        "serves": ["McMinnville", "Newberg", "Yamhill County"],
    },
    "METCOM": {
        "name": "Metro Area Communications",
        "region": "Salem Area",
        "serves": ["Salem", "Keizer", "Marion County"],
    },
    "ECSO": {
        "name": "Emergency Communications of Southern Oregon",
        "region": "Jackson County",
        "serves": ["Medford", "Ashland", "Jackson County"],
    },
}

# Color codes for UI display
STATUS_COLORS = {
    "orange": "#FFA500",
    "green": "#00FF00",
    "red": "#FF0000",
    "yellow": "#FFFF00",
    "blue": "#0000FF",
    "gray": "#808080",
    "black": "#000000",
}


def get_incident_description(code: str) -> str:
    """Get description for incident type code."""
    return INCIDENT_TYPES.get(code, code)


def get_unit_status(code: str) -> dict:
    """Get status info for unit status code."""
    return UNIT_STATUS_CODES.get(code, {
        "description": code,
        "color": "unknown",
        "active": True,
    })


def is_unit_active(code: str) -> bool:
    """Check if unit status code indicates active response."""
    status = UNIT_STATUS_CODES.get(code, {"active": True})
    return status.get("active", True)
