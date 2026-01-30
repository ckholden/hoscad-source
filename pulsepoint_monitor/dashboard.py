#!/usr/bin/env python3
"""
PulsePoint Dashboard Server - CAD Style

Flask server providing a CAD-style incident display with:
- Table layout for easy scanning
- All agencies shown (even without active incidents)
- Active and recent incidents
- Agency filtering
"""

import json
from pathlib import Path
from flask import Flask, jsonify, render_template_string

app = Flask(__name__)

DATA_FILE = Path(__file__).parent.parent / "pulsepoint_data.json"

DASHBOARD_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PulsePoint Oregon CAD</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            background: #0a0a12;
            color: #e0e0e0;
            font-size: 13px;
        }

        /* Header */
        .header {
            background: linear-gradient(90deg, #1a1a2e 0%, #16213e 100%);
            padding: 8px 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #c41e3a;
        }
        .header h1 {
            font-size: 1.3em;
            color: #ff6b6b;
            font-weight: bold;
        }
        .header-stats {
            display: flex;
            gap: 20px;
        }
        .header-stat {
            text-align: center;
        }
        .header-stat-value {
            font-size: 1.4em;
            font-weight: bold;
            color: #4ecdc4;
        }
        .header-stat-label {
            font-size: 0.75em;
            opacity: 0.7;
        }
        .live-indicator {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.85em;
        }
        .live-dot {
            width: 8px;
            height: 8px;
            background: #27ae60;
            border-radius: 50%;
            animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(0.9); }
        }

        /* Controls */
        .controls {
            background: #12121f;
            padding: 8px 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #2a2a4a;
        }
        .view-toggle {
            display: flex;
            gap: 5px;
        }
        .view-btn {
            padding: 5px 12px;
            background: #1a1a2e;
            border: 1px solid #3a3a5a;
            color: #aaa;
            cursor: pointer;
            font-size: 0.85em;
            font-family: inherit;
        }
        .view-btn.active {
            background: #c41e3a;
            border-color: #c41e3a;
            color: white;
        }
        .view-btn:hover:not(.active) {
            background: #2a2a4a;
        }
        .filter-toggle {
            padding: 5px 12px;
            background: #1a1a2e;
            border: 1px solid #3a3a5a;
            color: #aaa;
            cursor: pointer;
            font-size: 0.85em;
            font-family: inherit;
        }
        .filter-toggle:hover {
            background: #2a2a4a;
        }

        /* Agency Filter Panel */
        .filter-panel {
            background: #0f0f1a;
            padding: 10px 15px;
            border-bottom: 1px solid #2a2a4a;
            display: none;
        }
        .filter-panel.show {
            display: block;
        }
        .filter-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        .filter-title {
            font-weight: bold;
            color: #4ecdc4;
        }
        .filter-actions {
            display: flex;
            gap: 8px;
        }
        .filter-btn {
            padding: 3px 8px;
            background: #2a2a4a;
            border: none;
            color: #aaa;
            cursor: pointer;
            font-size: 0.8em;
            font-family: inherit;
        }
        .filter-btn:hover {
            background: #3a3a5a;
            color: white;
        }
        .agency-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 4px;
            max-height: 200px;
            overflow-y: auto;
        }
        .agency-item {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 4px 8px;
            background: #1a1a2e;
            cursor: pointer;
            font-size: 0.85em;
        }
        .agency-item:hover {
            background: #2a2a4a;
        }
        .agency-item input {
            cursor: pointer;
        }
        .agency-item.has-active {
            border-left: 3px solid #ff6b6b;
        }
        .agency-item.has-recent {
            border-left: 3px solid #f39c12;
        }
        .agency-count {
            margin-left: auto;
            background: #3a3a5a;
            padding: 1px 6px;
            border-radius: 10px;
            font-size: 0.8em;
        }

        /* CAD Table */
        .cad-container {
            padding: 10px;
        }
        .cad-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }
        .cad-table th {
            background: #1a1a2e;
            padding: 8px 10px;
            text-align: left;
            font-weight: bold;
            color: #4ecdc4;
            border-bottom: 2px solid #3a3a5a;
            position: sticky;
            top: 0;
            cursor: pointer;
        }
        .cad-table th:hover {
            background: #2a2a4a;
        }
        .cad-table td {
            padding: 6px 10px;
            border-bottom: 1px solid #1a1a2e;
            vertical-align: top;
        }
        .cad-table tr:hover {
            background: #16213e;
        }
        .cad-table tr.recent {
            opacity: 0.7;
        }
        .cad-table tr.recent td {
            font-style: italic;
        }

        /* Status indicator */
        .status-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.85em;
            font-weight: bold;
        }
        .status-active {
            background: #27ae60;
            color: white;
        }
        .status-recent {
            background: #7f8c8d;
            color: white;
        }

        /* Call type colors */
        .call-type {
            font-weight: bold;
            padding: 2px 6px;
            border-radius: 3px;
        }
        .call-me { background: #16a085; color: white; }
        .call-tc { background: #f39c12; color: white; }
        .call-fire { background: #c0392b; color: white; }
        .call-other { background: #7f8c8d; color: white; }

        /* Unit badges */
        .units-cell {
            display: flex;
            flex-wrap: wrap;
            gap: 3px;
        }
        .unit-badge {
            padding: 2px 5px;
            border-radius: 3px;
            font-size: 0.85em;
            font-weight: 500;
        }
        .unit-orange { background: #e67e22; color: white; }
        .unit-green { background: #27ae60; color: white; }
        .unit-red { background: #c0392b; color: white; }
        .unit-yellow { background: #f1c40f; color: #333; }
        .unit-blue { background: #3498db; color: white; }
        .unit-gray { background: #5a5a6a; color: white; }

        /* Time column */
        .time-cell {
            white-space: nowrap;
        }
        .time-ago {
            font-size: 0.85em;
            color: #888;
        }

        /* Empty state */
        .no-incidents {
            text-align: center;
            padding: 40px;
            color: #666;
            font-size: 1.1em;
        }

        /* Last update footer */
        .footer {
            text-align: center;
            padding: 8px;
            color: #666;
            font-size: 0.85em;
            border-top: 1px solid #1a1a2e;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>PULSEPOINT OREGON CAD</h1>
        <div class="header-stats">
            <div class="header-stat">
                <div class="header-stat-value" id="active-count">0</div>
                <div class="header-stat-label">ACTIVE</div>
            </div>
            <div class="header-stat">
                <div class="header-stat-value" id="recent-count">0</div>
                <div class="header-stat-label">RECENT</div>
            </div>
            <div class="header-stat">
                <div class="header-stat-value" id="unit-count">0</div>
                <div class="header-stat-label">UNITS</div>
            </div>
            <div class="header-stat">
                <div class="header-stat-value" id="agency-count">0</div>
                <div class="header-stat-label">AGENCIES</div>
            </div>
        </div>
        <div class="live-indicator">
            <span class="live-dot"></span>
            <span id="refresh-status">LIVE</span>
        </div>
    </div>

    <div class="controls">
        <div class="view-toggle">
            <button class="view-btn active" id="btn-all" onclick="setView('all')">ALL</button>
            <button class="view-btn" id="btn-active" onclick="setView('active')">ACTIVE ONLY</button>
            <button class="view-btn" id="btn-recent" onclick="setView('recent')">RECENT ONLY</button>
        </div>
        <div class="view-toggle">
            <button class="view-btn active" id="btn-12h" onclick="setTimeFilter('12h')">LAST 12 HRS</button>
            <button class="view-btn" id="btn-24h" onclick="setTimeFilter('24h')">12-24 HRS</button>
            <button class="view-btn" id="btn-alltime" onclick="setTimeFilter('all')">ALL TIME</button>
        </div>
        <button class="filter-toggle" onclick="toggleFilters()">
            FILTER AGENCIES (<span id="filter-count">0</span>/<span id="total-agencies">0</span>)
        </button>
    </div>

    <div class="filter-panel" id="filter-panel">
        <div class="filter-header">
            <span class="filter-title">SELECT AGENCIES TO DISPLAY</span>
            <div class="filter-actions">
                <button class="filter-btn" onclick="selectAll()">SELECT ALL</button>
                <button class="filter-btn" onclick="selectNone()">SELECT NONE</button>
            </div>
        </div>
        <div class="agency-grid" id="agency-grid"></div>
    </div>

    <div class="cad-container">
        <table class="cad-table">
            <thead>
                <tr>
                    <th onclick="sortBy('status')" style="width: 70px">STATUS</th>
                    <th onclick="sortBy('time')" style="width: 100px">TIME</th>
                    <th onclick="sortBy('type')" style="width: 80px">TYPE</th>
                    <th onclick="sortBy('agency')">AGENCY</th>
                    <th onclick="sortBy('address')">ADDRESS</th>
                    <th onclick="sortBy('units')">UNITS</th>
                </tr>
            </thead>
            <tbody id="incidents-body"></tbody>
        </table>
        <div class="no-incidents" id="no-incidents" style="display:none">
            No incidents to display
        </div>
    </div>

    <div class="footer">
        <span id="last-update">Loading...</span>
    </div>

    <script>
        const REFRESH_INTERVAL = 10000;
        let allData = { active_incidents: [], recent_incidents: [], agencies: {} };
        let knownAgencies = {};
        let selectedAgencies = new Set();
        let currentView = 'all';
        let timeFilter = '12h';
        let sortField = 'time';
        let sortAsc = false;

        const CALL_TYPES = {
            'ME': 'MED', 'TC': 'TC', 'VF': 'VEH FIRE', 'SF': 'STR FIRE',
            'VEG': 'VEG FIRE', 'OF': 'OUTSIDE', 'MU': 'MUTUAL', 'FA': 'ALARM',
            'AFA': 'AUTO ALM', 'GAS': 'GAS', 'HAZMAT': 'HAZMAT', 'WR': 'WATER',
            'LA': 'LIFT', 'PS': 'SERVICE', 'INV': 'INVEST'
        };

        function getCallClass(type) {
            if (['ME', 'LA'].includes(type)) return 'call-me';
            if (['VF', 'SF', 'VEG', 'OF', 'FA', 'AFA'].includes(type)) return 'call-fire';
            if (['TC'].includes(type)) return 'call-tc';
            return 'call-other';
        }

        function formatTime(iso) {
            if (!iso) return '';
            const d = new Date(iso);
            return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        }

        function timeAgo(iso) {
            if (!iso) return '';
            const mins = Math.floor((new Date() - new Date(iso)) / 60000);
            if (mins < 1) return 'now';
            if (mins < 60) return mins + 'm';
            const hrs = Math.floor(mins / 60);
            if (hrs < 24) return hrs + 'h';
            return Math.floor(hrs / 24) + 'd';
        }

        function setView(view) {
            currentView = view;
            document.getElementById('btn-all').classList.remove('active');
            document.getElementById('btn-active').classList.remove('active');
            document.getElementById('btn-recent').classList.remove('active');
            document.getElementById('btn-' + view).classList.add('active');
            renderIncidents();
        }

        function setTimeFilter(filter) {
            timeFilter = filter;
            document.getElementById('btn-12h').classList.remove('active');
            document.getElementById('btn-24h').classList.remove('active');
            document.getElementById('btn-alltime').classList.remove('active');
            document.getElementById('btn-' + filter).classList.add('active');
            renderIncidents();
        }

        function isWithinTimeRange(isoString) {
            if (!isoString || timeFilter === 'all') return true;
            const now = new Date();
            const incidentTime = new Date(isoString);
            const hoursAgo = (now - incidentTime) / (1000 * 60 * 60);

            if (timeFilter === '12h') {
                return hoursAgo <= 12;
            } else if (timeFilter === '24h') {
                return hoursAgo > 12 && hoursAgo <= 24;
            }
            return true;
        }

        function toggleFilters() {
            document.getElementById('filter-panel').classList.toggle('show');
        }

        function sortBy(field) {
            if (sortField === field) {
                sortAsc = !sortAsc;
            } else {
                sortField = field;
                sortAsc = true;
            }
            renderIncidents();
        }

        function updateAgencyFilters() {
            const grid = document.getElementById('agency-grid');
            const sorted = Object.entries(knownAgencies).sort((a, b) => a[1].name.localeCompare(b[1].name));

            grid.innerHTML = sorted.map(([id, info]) => {
                const hasActive = info.activeCount > 0;
                const hasRecent = info.recentCount > 0;
                let cls = 'agency-item';
                if (hasActive) cls += ' has-active';
                else if (hasRecent) cls += ' has-recent';

                const count = info.activeCount + info.recentCount;
                return `
                    <label class="${cls}">
                        <input type="checkbox" ${selectedAgencies.has(id) ? 'checked' : ''}
                               onchange="toggleAgency('${id}')">
                        <span>${info.name}</span>
                        ${count > 0 ? `<span class="agency-count">${count}</span>` : ''}
                    </label>
                `;
            }).join('');

            document.getElementById('filter-count').textContent = selectedAgencies.size;
            document.getElementById('total-agencies').textContent = Object.keys(knownAgencies).length;
        }

        function toggleAgency(id) {
            if (selectedAgencies.has(id)) selectedAgencies.delete(id);
            else selectedAgencies.add(id);
            localStorage.setItem('selectedAgencies', JSON.stringify([...selectedAgencies]));
            updateAgencyFilters();
            renderIncidents();
        }

        function selectAll() {
            selectedAgencies = new Set(Object.keys(knownAgencies));
            localStorage.setItem('selectedAgencies', JSON.stringify([...selectedAgencies]));
            updateAgencyFilters();
            renderIncidents();
        }

        function selectNone() {
            selectedAgencies.clear();
            localStorage.setItem('selectedAgencies', JSON.stringify([]));
            updateAgencyFilters();
            renderIncidents();
        }

        function renderIncidents() {
            let incidents = [];

            if (currentView === 'all' || currentView === 'active') {
                incidents = incidents.concat((allData.active_incidents || []).map(i => ({...i, _status: 'active'})));
            }
            if (currentView === 'all' || currentView === 'recent') {
                incidents = incidents.concat((allData.recent_incidents || []).map(i => ({...i, _status: 'recent'})));
            }

            // Filter by selected agencies
            if (selectedAgencies.size > 0) {
                incidents = incidents.filter(i => selectedAgencies.has(i.agency_id));
            }

            // Filter by time range
            incidents = incidents.filter(i => isWithinTimeRange(i.received_time));

            // Sort - always put active first, then by selected field
            incidents.sort((a, b) => {
                // Active always comes before recent
                if (a._status !== b._status) {
                    return a._status === 'active' ? -1 : 1;
                }
                // Then sort by selected field
                let va, vb;
                switch(sortField) {
                    case 'status': va = a._status; vb = b._status; break;
                    case 'time': va = a.received_time || ''; vb = b.received_time || ''; break;
                    case 'type': va = a.call_type || ''; vb = b.call_type || ''; break;
                    case 'agency': va = a.agency_name || ''; vb = b.agency_name || ''; break;
                    case 'address': va = a.address || ''; vb = b.address || ''; break;
                    default: va = a.received_time || ''; vb = b.received_time || '';
                }
                if (va < vb) return sortAsc ? -1 : 1;
                if (va > vb) return sortAsc ? 1 : -1;
                return 0;
            });

            const tbody = document.getElementById('incidents-body');
            const noInc = document.getElementById('no-incidents');

            if (incidents.length === 0) {
                tbody.innerHTML = '';
                noInc.style.display = 'block';
            } else {
                noInc.style.display = 'none';
                tbody.innerHTML = incidents.map(i => {
                    const units = (i.units || []).map(u =>
                        `<span class="unit-badge unit-${u.status_color || 'gray'}">${u.unit_id}</span>`
                    ).join('');

                    return `
                        <tr class="${i._status}">
                            <td><span class="status-badge status-${i._status}">${i._status.toUpperCase()}</span></td>
                            <td class="time-cell">${formatTime(i.received_time)} <span class="time-ago">${timeAgo(i.received_time)}</span></td>
                            <td><span class="call-type ${getCallClass(i.call_type)}">${CALL_TYPES[i.call_type] || i.call_type}</span></td>
                            <td>${i.agency_name || i.agency_id}</td>
                            <td>${i.address || '-'}</td>
                            <td class="units-cell">${units || '-'}</td>
                        </tr>
                    `;
                }).join('');
            }

            // Update stats
            const activeFiltered = (allData.active_incidents || []).filter(i => selectedAgencies.size === 0 || selectedAgencies.has(i.agency_id));
            const recentFiltered = (allData.recent_incidents || []).filter(i => selectedAgencies.size === 0 || selectedAgencies.has(i.agency_id));

            document.getElementById('active-count').textContent = activeFiltered.length;
            document.getElementById('recent-count').textContent = recentFiltered.length;

            const unitCount = activeFiltered.reduce((sum, i) => sum + (i.units?.length || 0), 0);
            document.getElementById('unit-count').textContent = unitCount;

            const agencyCount = selectedAgencies.size > 0 ? selectedAgencies.size : Object.keys(knownAgencies).length;
            document.getElementById('agency-count').textContent = agencyCount;
        }

        async function fetchData() {
            try {
                const response = await fetch('/api/incidents');
                allData = await response.json();

                // Build agency list from data.agencies (includes all polled agencies)
                const agencies = allData.agencies || {};
                const activeByAgency = {};
                const recentByAgency = {};

                (allData.active_incidents || []).forEach(i => {
                    activeByAgency[i.agency_id] = (activeByAgency[i.agency_id] || 0) + 1;
                });
                (allData.recent_incidents || []).forEach(i => {
                    recentByAgency[i.agency_id] = (recentByAgency[i.agency_id] || 0) + 1;
                });

                // Add all agencies from the data
                Object.entries(agencies).forEach(([id, info]) => {
                    if (!knownAgencies[id]) {
                        knownAgencies[id] = {
                            name: info.name || `Agency ${id}`,
                            activeCount: 0,
                            recentCount: 0
                        };
                    }
                    knownAgencies[id].name = info.name || knownAgencies[id].name;
                    knownAgencies[id].activeCount = activeByAgency[id] || 0;
                    knownAgencies[id].recentCount = recentByAgency[id] || 0;
                });

                // Also add any agencies from incidents not in agencies list
                [...(allData.active_incidents || []), ...(allData.recent_incidents || [])].forEach(i => {
                    if (!knownAgencies[i.agency_id]) {
                        knownAgencies[i.agency_id] = {
                            name: i.agency_name || `Agency ${i.agency_id}`,
                            activeCount: activeByAgency[i.agency_id] || 0,
                            recentCount: recentByAgency[i.agency_id] || 0
                        };
                    }
                });

                // Initialize selection on first load
                if (selectedAgencies.size === 0 && Object.keys(knownAgencies).length > 0) {
                    const saved = localStorage.getItem('selectedAgencies');
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        selectedAgencies = new Set(parsed.filter(id => knownAgencies[id]));
                    }
                    if (selectedAgencies.size === 0) {
                        selectedAgencies = new Set(Object.keys(knownAgencies));
                    }
                }

                updateAgencyFilters();
                renderIncidents();

                const lastUpdate = allData.last_updated ?
                    `Last updated: ${new Date(allData.last_updated).toLocaleString()}` : 'Loading...';
                document.getElementById('last-update').textContent = lastUpdate;
                document.getElementById('refresh-status').textContent = 'LIVE';

            } catch (error) {
                console.error('Fetch error:', error);
                document.getElementById('refresh-status').textContent = 'ERROR';
            }
        }

        fetchData();
        setInterval(fetchData, REFRESH_INTERVAL);
    </script>
</body>
</html>
"""


def load_data():
    """Load incident data from JSON file."""
    if DATA_FILE.exists():
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except json.JSONDecodeError:
            pass
    return {"active_incidents": [], "recent_incidents": [], "agencies": {}, "unit_status": [], "last_updated": None}


@app.route("/")
def dashboard():
    """Serve the dashboard HTML."""
    return render_template_string(DASHBOARD_HTML)


@app.route("/api/incidents")
def api_incidents():
    """API endpoint for incident data."""
    data = load_data()
    return jsonify(data)


@app.route("/api/stats")
def api_stats():
    """API endpoint for stats only."""
    data = load_data()
    active = data.get("active_incidents", [])
    recent = data.get("recent_incidents", [])
    units = data.get("unit_status", [])
    agencies = data.get("agencies", {})

    return jsonify({
        "active_count": len(active),
        "recent_count": len(recent),
        "unit_count": len(units),
        "agency_count": len(agencies),
        "last_updated": data.get("last_updated")
    })


if __name__ == "__main__":
    print("=" * 50)
    print("PulsePoint Oregon CAD Dashboard")
    print("=" * 50)
    print(f"Dashboard: http://localhost:5000")
    print(f"API:       http://localhost:5000/api/incidents")
    print("=" * 50)
    app.run(host="0.0.0.0", port=5000, debug=True)
