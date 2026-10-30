const express = require('express');
const app = express();

// Home page
app.get('/', (req, res) => {
    console.log('GET / -> Status: 200');
    res.send('Welcome to Node.js and Express Server - Prakash Neduri');
});

// About page
app.get('/about', (req, res) => {
    console.log('GET /about -> Status: 200');
    res.send({
        name: 'Prakash Neduri',
        regNo: '252U1R1168',
        section: 'CSE-1D'
    });
});

// Current date and time
app.get('/time', (req, res) => {
    console.log('GET /time -> Status: 200');
    res.send({
        time: new Date()
    });
});

// Invalid URL
app.use((req, res) => {
    console.log(`GET ${req.url} -> Status: 404`);
    res.status(404).send('Page Not Found');
});

// Start server
app.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});

module.exports = app;
