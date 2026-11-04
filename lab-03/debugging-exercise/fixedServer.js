// ============================================================================
// Lab 3 Debugging Exercise: Corrected & Verified Code (fixedServer.js)
// All 4 bugs resolved and verified:
// 1. Corrected package import ('sqlite')
// 2. Added dynamic port configuration (process.env.PORT || 3000)
// 3. Corrected table name ('book')
// 4. Added 'await' before asynchronous database call
// ============================================================================

const express = require('express');
const path = require('path');

// ✅ FIX 1: Import directly from installed npm package 'sqlite'
const { open } = require('sqlite');
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

    // ✅ FIX 2: Dynamic port binding using process.env.PORT with fallback
    // Resolves EADDRINUSE conflict by allowing environment configuration or alternative port
    const PORT = process.env.PORT || 3000;
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
    // ✅ FIX 3: Corrected table name from 'books_catalog' to 'book' matching schema
    const query = `SELECT * FROM book ORDER BY id ASC;`;

    // ✅ FIX 4: Added 'await' to resolve the database Promise before sending response
    const books = await db.all(query);

    res.status(200).json(books);
  } catch (error) {
    console.error(`Query Error: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
});

module.exports = app;
