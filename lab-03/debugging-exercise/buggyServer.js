// ============================================================================
// Lab 3 Debugging Exercise: Faculty Broken Starter Code (buggyServer.js)
// Contains 4 deliberate bugs assigned by Faculty (Siva Sai Teja):
// 1. Wrong import path (MODULE_NOT_FOUND)
// 2. Port conflict without fallback (EADDRINUSE)
// 3. Table-name typo (SQLITE_ERROR: no such table)
// 4. Missing await (Promise serialization issue)
// ============================================================================

const express = require('express');
const path = require('path');

// ❌ BUG 1: Wrong import path (attempting to import non-existent relative file)
// Error: Cannot find module './db/sqlite'
const { open } = require('./db/sqlite'); 
const sqlite3 = require('sqlite3');

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, '..', 'books.db');
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // ❌ BUG 2: Hardcoded port with no fallback, causing EADDRINUSE if port 3000 is occupied
    // Error: listen EADDRINUSE: address already in use :::3000
    const PORT = 3000; 
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error(`Initialization Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// GET /books/ - Retrieve books with search, sort, and pagination
app.get('/books', async (req, res) => {
  try {
    // ❌ BUG 3: Table-name typo ('books_catalog' instead of 'book')
    // Error: SQLITE_ERROR: no such table: books_catalog
    const query = `SELECT * FROM books_catalog ORDER BY id ASC;`;

    // ❌ BUG 4: Missing await keyword!
    // db.all returns a Promise. Without await, 'books' is a pending Promise object
    // When serialized by res.json(), it sends an empty object {} instead of the array!
    const books = db.all(query); 

    res.status(200).json(books);
  } catch (error) {
    console.error(`Query Error: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
});
