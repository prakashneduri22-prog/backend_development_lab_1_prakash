// Lab 1: Node.js and Express Server
// Student: Prakash Neduri | Reg No: 22BCE10001 | Section: Section A
// Backend Development Fundamentals · Faculty: Joel Prashanth D

const express = require('express');
const app = express();

// Route 1: GET / (Welcome text / HTML content)
app.get('/', (request, response) => {
  console.log('GET / -> Status: 200');
  response.send('Welcome to Lab 1: Node.js and Express Server - Prakash Neduri');
});

// Route 2: GET /about (JSON with name, registration number, and section)
app.get('/about', (request, response) => {
  console.log('GET /about -> Status: 200');
  response.send({
    name: 'Prakash Neduri',
    registrationNumber: '22BCE10001',
    section: 'Section A'
  });
});

// Route 3: GET /time (Current date and time using new Date())
app.get('/time', (request, response) => {
  console.log('GET /time -> Status: 200');
  const currentDate = new Date();
  response.send({
    currentTime: currentDate.toISOString(),
    readableTime: currentDate.toString(),
    timestamp: currentDate.getTime()
  });
});

// 404 Handler: Catch-all for any unknown route
app.use((request, response) => {
  console.log(`GET ${request.url} -> Status: 404`);
  response.status(404).send({
    status: 404,
    error: 'Not Found',
    message: `Cannot ${request.method} ${request.url} - The requested route does not exist.`
  });
});

// Start the Express server on port 3000
app.listen(3000, () => {
  console.log('====================================================');
  console.log('Express server is running on port 3000');
  console.log('Server Running at http://localhost:3000/');
  console.log('Available Endpoints:');
  console.log(' - GET  /       (Welcome text)');
  console.log(' - GET  /about  (JSON with student name and section)');
  console.log(' - GET  /time   (Current date & time using new Date())');
  console.log('====================================================');
});

module.exports = app;
