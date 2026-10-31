const express = require('express');
const path = require('path');
const fs = require('fs');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const app = express();
app.use(express.json());

// Database path configuration (supports standard local execution and Vercel serverless /tmp)
let dbPath = path.join(__dirname, 'books.db');

if (process.env.VERCEL) {
  const tmpDbPath = path.join('/tmp', 'books.db');
  if (!fs.existsSync(tmpDbPath)) {
    try {
      fs.copyFileSync(dbPath, tmpDbPath);
      console.log('Copied books.db to /tmp/books.db for serverless execution');
    } catch (err) {
      console.error('Failed to copy books.db to /tmp:', err.message);
    }
  }
  dbPath = tmpDbPath;
}

let db = null;

// Helper to guarantee active DB connection across cold starts & serverless invocations
const getDbConnection = async () => {
  if (!db) {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
  }
  return db;
};

// Middleware to ensure DB connection is ready before processing any request
app.use(async (request, response, next) => {
  try {
    await getDbConnection();
    next();
  } catch (error) {
    console.error(`DB Connection Error: ${error.message}`);
    response.status(500).json({ error: `Database Connection Failed: ${error.message}` });
  }
});

// Initialize SQLite Database and start Express Server (used in local development)
const initializeDBAndServer = async () => {
  try {
    await getDbConnection();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

// In local mode start listener; on Vercel the exported app handles requests
if (!process.env.VERCEL) {
  initializeDBAndServer();
}

// Root route - Overview of available endpoints
app.get('/', (request, response) => {
  console.log('GET / -> Status: 200');
  response.status(200).json({
    lab: 'Lab 2: SQLite database and CRUD routes',
    student: 'Prakash Neduri',
    regNo: '252U1R1168',
    section: 'SCSE-2D',
    faculty: 'Sai Siva Teja',
    endpoints: [
      { method: 'GET', path: '/books/', description: 'Retrieve all books from the database' },
      { method: 'GET', path: '/books/:bookId/', description: 'Retrieve a specific book by ID' },
      { method: 'POST', path: '/books/', description: 'Create and insert a new book' },
      { method: 'PUT', path: '/books/:bookId/', description: 'Update details of an existing book' },
      { method: 'DELETE', path: '/books/:bookId/', description: 'Remove a book by ID' }
    ]
  });
});

// Route 1: GET /books/ - Retrieve all books
app.get(['/books', '/books/'], async (request, response) => {
  try {
    const getBooksQuery = `
      SELECT * FROM book ORDER BY id;
    `;
    const books = await db.all(getBooksQuery);
    console.log(`GET /books/ -> Status: 200 (${books.length} records returned)`);
    response.status(200).json(books);
  } catch (error) {
    console.error(`GET /books/ error: ${error.message}`);
    response.status(500).json({ error: error.message });
  }
});

// Route 2: GET /books/:bookId/ - Retrieve a single book by id
app.get(['/books/:bookId', '/books/:bookId/'], async (request, response) => {
  try {
    const { bookId } = request.params;
    const getBookQuery = `
      SELECT * FROM book WHERE id = ?;
    `;
    const book = await db.get(getBookQuery, [bookId]);

    if (!book) {
      console.log(`GET /books/${bookId}/ -> Status: 404 (Not Found)`);
      return response.status(404).json({ error: `Book with id ${bookId} not found` });
    }

    console.log(`GET /books/${bookId}/ -> Status: 200`);
    response.status(200).json(book);
  } catch (error) {
    console.error(`GET /books/:bookId error: ${error.message}`);
    response.status(500).json({ error: error.message });
  }
});

// Route 3: POST /books/ - Add a new book
app.post(['/books', '/books/'], async (request, response) => {
  try {
    const { title, author, price, pages } = request.body;

    if (!title || !author || price === undefined || pages === undefined) {
      console.log('POST /books/ -> Status: 400 (Bad Request - Missing Fields)');
      return response.status(400).json({
        error: 'title, author, price, and pages are required fields'
      });
    }

    const addBookQuery = `
      INSERT INTO book (title, author, price, pages)
      VALUES (?, ?, ?, ?);
    `;
    const dbResponse = await db.run(addBookQuery, [title, author, price, pages]);
    const bookId = dbResponse.lastID;

    console.log(`POST /books/ -> Status: 201 (Book Added with ID ${bookId})`);
    response.status(201).json({
      message: 'Book Added Successfully',
      bookId: bookId
    });
  } catch (error) {
    console.error(`POST /books/ error: ${error.message}`);
    response.status(500).json({ error: error.message });
  }
});

// Route 4: PUT /books/:bookId/ - Update an existing book
app.put(['/books/:bookId', '/books/:bookId/'], async (request, response) => {
  try {
    const { bookId } = request.params;
    const { title, author, price, pages } = request.body;

    // Check if book exists first
    const existingBook = await db.get('SELECT * FROM book WHERE id = ?;', [bookId]);
    if (!existingBook) {
      console.log(`PUT /books/${bookId}/ -> Status: 404 (Not Found)`);
      return response.status(404).json({ error: `Book with id ${bookId} not found` });
    }

    const updatedTitle = title !== undefined ? title : existingBook.title;
    const updatedAuthor = author !== undefined ? author : existingBook.author;
    const updatedPrice = price !== undefined ? price : existingBook.price;
    const updatedPages = pages !== undefined ? pages : existingBook.pages;

    const updateBookQuery = `
      UPDATE book
      SET title = ?, author = ?, price = ?, pages = ?
      WHERE id = ?;
    `;
    await db.run(updateBookQuery, [updatedTitle, updatedAuthor, updatedPrice, updatedPages, bookId]);

    console.log(`PUT /books/${bookId}/ -> Status: 200 (Updated)`);
    response.status(200).json({
      message: 'Book Details Updated Successfully',
      bookId: parseInt(bookId, 10)
    });
  } catch (error) {
    console.error(`PUT /books/:bookId error: ${error.message}`);
    response.status(500).json({ error: error.message });
  }
});

// Route 5: DELETE /books/:bookId/ - Remove a book
app.delete(['/books/:bookId', '/books/:bookId/'], async (request, response) => {
  try {
    const { bookId } = request.params;

    const existingBook = await db.get('SELECT * FROM book WHERE id = ?;', [bookId]);
    if (!existingBook) {
      console.log(`DELETE /books/${bookId}/ -> Status: 404 (Not Found)`);
      return response.status(404).json({ error: `Book with id ${bookId} not found` });
    }

    const deleteBookQuery = `
      DELETE FROM book WHERE id = ?;
    `;
    await db.run(deleteBookQuery, [bookId]);

    console.log(`DELETE /books/${bookId}/ -> Status: 200 (Deleted)`);
    response.status(200).json({
      message: 'Book Deleted Successfully',
      bookId: parseInt(bookId, 10)
    });
  } catch (error) {
    console.error(`DELETE /books/:bookId error: ${error.message}`);
    response.status(500).json({ error: error.message });
  }
});

// 404 Catch-All Handler
app.use((request, response) => {
  console.log(`GET ${request.originalUrl} -> Status: 404`);
  response.status(404).json({ error: 'Endpoint Not Found' });
});

module.exports = app;
