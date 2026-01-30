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

// Password for /orfireems
const ORFIREEMS_PASSWORD = 'holdc123';

// Session storage (simple in-memory)
const sessions = new Set();

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => resolve(body));
  });
}

function parseCookies(req) {
  const cookies = {};
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      cookies[name] = value;
    });
  }
  return cookies;
}

http.createServer(async (req, res) => {
  let url = req.url.split('?')[0];
  const cookies = parseCookies(req);

  // Handle /orfireems routes
  if (url === '/orfireems' || url === '/orfireems/') {
    // Check if authenticated
    if (sessions.has(cookies.orfireems_session)) {
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
    } else {
      // Show login page
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
<!DOCTYPE html>
<html>
<head>
  <title>Oregon Fire/EMS CAD - Login</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Consolas', monospace; background: #0a0a12; color: #e0e0e0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .login-box { background: #1a1a2e; padding: 40px; border-radius: 10px; border: 2px solid #c41e3a; width: 350px; }
    h1 { color: #ff6b6b; margin-bottom: 10px; font-size: 1.4em; }
    .subtitle { color: #888; margin-bottom: 30px; font-size: 0.9em; }
    input { width: 100%; padding: 12px; margin-bottom: 15px; background: #0a0a12; border: 1px solid #3a3a5a; color: #e0e0e0; font-family: inherit; font-size: 1em; }
    input:focus { outline: none; border-color: #c41e3a; }
    button { width: 100%; padding: 12px; background: #c41e3a; border: none; color: white; font-family: inherit; font-size: 1em; cursor: pointer; }
    button:hover { background: #a01830; }
    .error { color: #ff6b6b; margin-bottom: 15px; display: none; }
  </style>
</head>
<body>
  <div class="login-box">
    <h1>OREGON FIRE/EMS CAD</h1>
    <div class="subtitle">Authorized Access Only</div>
    <div class="error" id="error">Invalid password</div>
    <form method="POST" action="/orfireems/login">
      <input type="password" name="password" placeholder="Enter password" autofocus>
      <button type="submit">LOGIN</button>
    </form>
  </div>
</body>
</html>
      `);
    }
    return;
  }

  // Handle login POST
  if (url === '/orfireems/login' && req.method === 'POST') {
    const body = await parseBody(req);
    const params = new URLSearchParams(body);
    const password = params.get('password');

    if (password === ORFIREEMS_PASSWORD) {
      const sessionId = Math.random().toString(36).substring(2);
      sessions.add(sessionId);
      res.writeHead(302, {
        'Location': '/orfireems',
        'Set-Cookie': `orfireems_session=${sessionId}; Path=/; HttpOnly`
      });
      res.end();
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
<!DOCTYPE html>
<html>
<head>
  <title>Oregon Fire/EMS CAD - Login</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Consolas', monospace; background: #0a0a12; color: #e0e0e0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .login-box { background: #1a1a2e; padding: 40px; border-radius: 10px; border: 2px solid #c41e3a; width: 350px; }
    h1 { color: #ff6b6b; margin-bottom: 10px; font-size: 1.4em; }
    .subtitle { color: #888; margin-bottom: 30px; font-size: 0.9em; }
    input { width: 100%; padding: 12px; margin-bottom: 15px; background: #0a0a12; border: 1px solid #3a3a5a; color: #e0e0e0; font-family: inherit; font-size: 1em; }
    input:focus { outline: none; border-color: #c41e3a; }
    button { width: 100%; padding: 12px; background: #c41e3a; border: none; color: white; font-family: inherit; font-size: 1em; cursor: pointer; }
    button:hover { background: #a01830; }
    .error { color: #ff6b6b; margin-bottom: 15px; }
  </style>
</head>
<body>
  <div class="login-box">
    <h1>OREGON FIRE/EMS CAD</h1>
    <div class="subtitle">Authorized Access Only</div>
    <div class="error">Invalid password</div>
    <form method="POST" action="/orfireems/login">
      <input type="password" name="password" placeholder="Enter password" autofocus>
      <button type="submit">LOGIN</button>
    </form>
  </div>
</body>
</html>
      `);
    }
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
