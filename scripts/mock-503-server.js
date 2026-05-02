const http = require('http');
let requestCount = 0;

http.createServer((req, res) => {
  requestCount++;
  console.log(`[Mock] Request #${requestCount}: ${req.method} ${req.url}`);
  res.writeHead(503, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'Service Unavailable' }));
}).listen(9999, () => {
  console.log('[Mock] 503 Mock-Server läuft auf Port 9999');
});
