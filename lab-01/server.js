// Lab 1: Node.js and Express Server
// Student: Prakash Neduri | Reg No: 22BCE10001 | Section: Section A
// Backend Development Fundamentals · Faculty: Joel Prashanth D

const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// Logging middleware to log incoming requests and the returned HTTP status code
app.use((req, res, next) => {
  const startTime = Date.now();
  res.on('finish', () => {
    const elapsed = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> Status: ${res.statusCode} (${elapsed}ms)`);
  });
  next();
});

// Route 1: GET / (Welcome text)
app.get('/', (req, res) => {
  res.status(200).send('Welcome to Lab 1: Node.js and Express Server - Prakash Neduri');
});

// Route 2: GET /about (JSON with name, registration number, and section)
app.get('/about', (req, res) => {
  res.status(200).json({
    name: 'Prakash Neduri',
    registrationNumber: '22BCE10001',
    section: 'Section A'
  });
});

// Route 3: GET /time (Current date and time using new Date())
app.get('/time', (req, res) => {
  const now = new Date();
  res.status(200).json({
    currentTime: now.toISOString(),
    readableTime: now.toString(),
    timestamp: now.getTime()
  });
});

// 404 Handler: Catch-all route for any undefined or unknown paths
app.use((req, res) => {
  res.status(404).json({
    status: 404,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl} - The requested route does not exist.`
  });
});

// Start the Express server
app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`Express server is running on port ${PORT}`);
  console.log(`Base URL: http://localhost:${PORT}`);
  console.log('Available Endpoints:');
  console.log(` - GET  /       (Welcome text)`);
  console.log(` - GET  /about  (JSON with student name and section)`);
  console.log(` - GET  /time   (Current date & time using new Date())`);
  console.log('====================================================');
});

module.exports = app;
