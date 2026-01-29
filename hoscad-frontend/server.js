const http = require('http');
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.md': 'text/plain' };

http.createServer((req, res) => {
  let url = req.url.split('?')[0];
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
});
