const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const dir = __dirname;
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.md': 'text/plain', '.json': 'application/json' };

// PulsePoint scraper config
const SCRAPER_INTERVAL = 2 * 60 * 1000; // 2 minutes
const SCRAPER_PATH = path.join(dir, '..', 'pulsepoint_monitor', 'pulsepoint_scraper.py');
const CONFIG_PATH = path.join(dir, '..', 'pulsepoint_monitor', 'config.json');
let scraperRunning = false;
let lastScraperRun = null;

function runScraper() {
  if (scraperRunning) {
    console.log('[Scraper] Already running, skipping...');
    return;
  }

  console.log('[Scraper] Starting poll cycle...');
  scraperRunning = true;

  const scraper = spawn('python', [SCRAPER_PATH, '--config', CONFIG_PATH, '--once'], {
    cwd: path.join(dir, '..', 'pulsepoint_monitor')
  });

  scraper.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      if (line.includes('Poll complete') || line.includes('Saved')) {
        console.log('[Scraper]', line.trim());
      }
    });
  });

  scraper.stderr.on('data', (data) => {
    console.error('[Scraper Error]', data.toString().trim());
  });

  scraper.on('close', (code) => {
    scraperRunning = false;
    lastScraperRun = new Date();
    console.log(`[Scraper] Finished with code ${code}`);
  });

  scraper.on('error', (err) => {
    scraperRunning = false;
    console.error('[Scraper] Failed to start:', err.message);
  });
}

http.createServer((req, res) => {
  let url = req.url.split('?')[0];

  // Handle /orfireems routes - serve dashboard directly
  if (url === '/orfireems' || url === '/orfireems/') {
    const filePath = path.join(dir, 'orfireems.html');
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading dashboard');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
    return;
  }

  // Handle /orfireems/api - read directly from JSON file
  if (url === '/orfireems/api/incidents') {
    const dataFile = path.join(dir, '..', 'pulsepoint_data.json');
    fs.readFile(dataFile, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          active_incidents: [],
          recent_incidents: [],
          agencies: {},
          last_updated: null,
          error: 'Data file not found - scraper may not be running'
        }));
        return;
      }
      try {
        const jsonData = JSON.parse(data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(jsonData));
      } catch (e) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ active_incidents: [], recent_incidents: [], agencies: {}, error: 'Invalid data file' }));
      }
    });
    return;
  }

  // Regular file serving
  if (url === '/') url = '/index.html';
  const filePath = path.join(dir, url);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.log('404:', filePath);
      res.writeHead(404);
      res.end('Not found: ' + url);
      return;
    }
    console.log('200:', url);
    res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' });
    res.end(data);
  });
}).listen(8080, () => {
  console.log('Server running at http://localhost:8080');
  console.log('Oregon Fire/EMS CAD at http://localhost:8080/orfireems');

  // Start PulsePoint scraper
  console.log('[Scraper] Starting automatic polling every 2 minutes...');
  runScraper(); // Run immediately on startup
  setInterval(runScraper, SCRAPER_INTERVAL); // Then every 2 minutes
});
