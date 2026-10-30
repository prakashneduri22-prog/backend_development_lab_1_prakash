// Plain HTTP Server built with Node.js core 'http' module
// Lab 1: Task 3 - Demonstrating plain server setup

const http = require('http');

const PORT = 3000;

// Create web server using native http module
const server = http.createServer((req, res) => {
  console.log(`[HTTP Server] Received request: ${req.method} ${req.url}`);
  
  // Respond with status code 200 and plain text "Hello"
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Hello');
});

// Listen on port 3000
server.listen(3000, () => {
  console.log(`=========================================`);
  console.log(`Plain HTTP Server running on port ${PORT}`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`=========================================`);
});
