const http = require('http');
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.md': 'text/plain', '.json': 'application/json' };

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

  // Handle /orfireems/api proxy to Flask
  if (url.startsWith('/orfireems/api/')) {
    const apiPath = url.replace('/orfireems/api', '');
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api' + apiPath,
      method: 'GET'
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
      proxyRes.pipe(res);
    });

    proxyReq.on('error', () => {
      res.writeHead(502);
      res.end(JSON.stringify({ error: 'Dashboard API unavailable' }));
    });

    proxyReq.end();
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
});
