// Plain HTTP Server built with Node.js core 'http' module
// Lab 1: Task 3 - Demonstrating plain server setup

const http = require('http');

// Create web server using native http module
const server = http.createServer((request, response) => {
  console.log(`[HTTP Server] Received request: ${request.method} ${request.url}`);
  
  // Respond with status code 200 and plain text "Hello"
  response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end('Hello');
});

// Listen on port 3000
server.listen(3000, () => {
  console.log('=========================================');
  console.log('Plain HTTP Server running on port 3000');
  console.log('Server Running at http://localhost:3000/');
  console.log('=========================================');
});
