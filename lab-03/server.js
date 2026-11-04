const express = require('express');
const path = require('path');
const fs = require('fs');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const app = express();
app.use(express.json());

// Database path configuration (supports standard local development and Vercel serverless /tmp)
let dbPath = path.join(__dirname, 'books.db');

if (process.env.VERCEL) {
  const tmpDbPath = path.join('/tmp', 'books.db');
  if (!fs.existsSync(tmpDbPath)) {
    try {
      fs.copyFileSync(dbPath, tmpDbPath);
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
    response.status(500).json({ message: `Database Connection Failed: ${error.message}` });
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

if (require.main === module && !process.env.VERCEL) {
  initializeDBAndServer();
}

// Allowed columns for ordering to strictly guard against SQL injection
const ALLOWED_ORDER_COLUMNS = ['id', 'title', 'author', 'price', 'pages'];

// Root route - Overview of available endpoints and query parameters
app.get('/', (request, response) => {
  response.status(200).json({
    lab: 'Lab 3: REST API, query parameters, validation, debugging',
    student: 'Prakash Neduri',
    regNo: '252U1R1168',
    section: 'SCSE-2D',
    faculty: 'Siva Sai Teja',
    endpoints: [
      {
        method: 'GET',
        path: '/books/',
        description: 'Retrieve books with query parameters (search_q, order_by, order, limit, offset, min_price, max_price)',
        queryParams: {
          search_q: 'Partial match on title using SQL LIKE (default: "")',
          order_by: 'Column to sort by: id, title, author, price, pages (default: id)',
          order: 'Sort direction: ASC or DESC (default: ASC)',
          limit: 'Number of records to return (default: 10)',
          offset: 'Number of records to skip for pagination (default: 0)',
          min_price: 'Filter books with price greater than or equal to min_price',
          max_price: 'Filter books with price less than or equal to max_price'
        }
      },
      { method: 'GET', path: '/books/:bookId/', description: 'Retrieve a specific book by ID' },
      { method: 'POST', path: '/books/', description: 'Create a new book with input validation' },
      { method: 'PUT', path: '/books/:bookId/', description: 'Update an existing book record' },
      { method: 'DELETE', path: '/books/:bookId/', description: 'Remove a book by ID' }
    ]
  });
});

// Route 1: GET /books/ - Retrieve books with search, sort, filter, and pagination
app.get(['/books', '/books/'], async (request, response) => {
  try {
    const {
      search_q = '',
      order_by = 'id',
      order = 'ASC',
      limit = '10',
      offset = '0',
      min_price,
      max_price
    } = request.query;

    // Validate min_price if provided
    if (min_price !== undefined && (isNaN(Number(min_price)) || Number(min_price) < 0)) {
      return response.status(400).json({
        message: 'Invalid query parameter: min_price must be a valid non-negative number'
      });
    }

    // Validate max_price if provided
    if (max_price !== undefined && (isNaN(Number(max_price)) || Number(max_price) < 0)) {
      return response.status(400).json({
        message: 'Invalid query parameter: max_price must be a valid non-negative number'
      });
    }

    // Validate price range logic if both are provided
    if (min_price !== undefined && max_price !== undefined && Number(min_price) > Number(max_price)) {
      return response.status(400).json({
        message: 'Invalid price range: min_price cannot be greater than max_price'
      });
    }

    // Whitelist and normalize order_by column to prevent SQL injection
    const normalizedOrderBy = ALLOWED_ORDER_COLUMNS.includes(order_by.toLowerCase())
      ? order_by.toLowerCase()
      : 'id';

    // Whitelist and normalize order direction
    const normalizedOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Parse and bound pagination integers
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const parsedOffset = Math.max(0, parseInt(offset, 10) || 0);

    // Build dynamic SQL query with parameterized conditions
    const conditions = [];
    const params = [];

    // Title search filter with SQL LIKE
    if (search_q && search_q.trim() !== '') {
      conditions.push('title LIKE ?');
      params.push(`%${search_q.trim()}%`);
    }

    // Price range filters
    if (min_price !== undefined && max_price !== undefined) {
      conditions.push('price BETWEEN ? AND ?');
      params.push(Number(min_price), Number(max_price));
    } else if (min_price !== undefined) {
      conditions.push('price >= ?');
      params.push(Number(min_price));
    } else if (max_price !== undefined) {
      conditions.push('price <= ?');
      params.push(Number(max_price));
    }

    let whereClause = '';
    if (conditions.length > 0) {
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }

    const getBooksQuery = `
      SELECT * FROM book
      ${whereClause}
      ORDER BY ${normalizedOrderBy} ${normalizedOrder}
      LIMIT ? OFFSET ?;
    `;

    params.push(parsedLimit, parsedOffset);

    const books = await db.all(getBooksQuery, params);
    response.status(200).json(books);
  } catch (error) {
    console.error(`GET /books/ error: ${error.message}`);
    response.status(500).json({ message: error.message });
  }
});

// Route 2: GET /books/:bookId/ - Retrieve single book by ID
app.get(['/books/:bookId', '/books/:bookId/'], async (request, response) => {
  try {
    const { bookId } = request.params;
    const getBookQuery = `SELECT * FROM book WHERE id = ?;`;
    const book = await db.get(getBookQuery, [bookId]);

    if (!book) {
      return response.status(404).json({ message: `Book with id ${bookId} not found` });
    }

    response.status(200).json(book);
  } catch (error) {
    console.error(`GET /books/:bookId error: ${error.message}`);
    response.status(500).json({ message: error.message });
  }
});

// Route 3: POST /books/ - Create a new book with robust validation
app.post(['/books', '/books/'], async (request, response) => {
  try {
    const { title, author, price, pages } = request.body;

    // Validate title (must be non-empty string)
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return response.status(400).json({
        message: 'Invalid title: title is required and cannot be empty'
      });
    }

    // Validate author (must be non-empty string)
    if (!author || typeof author !== 'string' || author.trim() === '') {
      return response.status(400).json({
        message: 'Invalid author: author is required and cannot be empty'
      });
    }

    // Validate price (must be a valid numeric value >= 0)
    if (price === undefined || price === null || isNaN(Number(price)) || Number(price) < 0) {
      return response.status(400).json({
        message: 'Invalid price: price is required and must be a non-negative number'
      });
    }

    // Validate pages (must be a valid integer > 0)
    if (pages === undefined || pages === null || isNaN(Number(pages)) || !Number.isInteger(Number(pages)) || Number(pages) <= 0) {
      return response.status(400).json({
        message: 'Invalid pages: pages is required and must be a positive integer'
      });
    }

    const addBookQuery = `
      INSERT INTO book (title, author, price, pages)
      VALUES (?, ?, ?, ?);
    `;
    const dbResponse = await db.run(addBookQuery, [
      title.trim(),
      author.trim(),
      Number(price),
      parseInt(pages, 10)
    ]);
    const bookId = dbResponse.lastID;

    response.status(201).json({
      message: 'Book Added Successfully',
      bookId: bookId
    });
  } catch (error) {
    console.error(`POST /books/ error: ${error.message}`);
    response.status(500).json({ message: error.message });
  }
});

// Route 4: PUT /books/:bookId/ - Update an existing book record
app.put(['/books/:bookId', '/books/:bookId/'], async (request, response) => {
  try {
    const { bookId } = request.params;
    const { title, author, price, pages } = request.body;

    // Check if the book exists first
    const existingBook = await db.get('SELECT * FROM book WHERE id = ?;', [bookId]);
    if (!existingBook) {
      return response.status(404).json({ message: `Book with id ${bookId} not found` });
    }

    // Validate fields if provided
    if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
      return response.status(400).json({
        message: 'Invalid title: title cannot be empty'
      });
    }

    if (author !== undefined && (typeof author !== 'string' || author.trim() === '')) {
      return response.status(400).json({
        message: 'Invalid author: author cannot be empty'
      });
    }

    if (price !== undefined && (isNaN(Number(price)) || Number(price) < 0)) {
      return response.status(400).json({
        message: 'Invalid price: price must be a non-negative number'
      });
    }

    if (pages !== undefined && (isNaN(Number(pages)) || !Number.isInteger(Number(pages)) || Number(pages) <= 0)) {
      return response.status(400).json({
        message: 'Invalid pages: pages must be a positive integer'
      });
    }

    const updatedTitle = title !== undefined ? title.trim() : existingBook.title;
    const updatedAuthor = author !== undefined ? author.trim() : existingBook.author;
    const updatedPrice = price !== undefined ? Number(price) : existingBook.price;
    const updatedPages = pages !== undefined ? parseInt(pages, 10) : existingBook.pages;

    const updateBookQuery = `
      UPDATE book
      SET title = ?, author = ?, price = ?, pages = ?
      WHERE id = ?;
    `;
    await db.run(updateBookQuery, [updatedTitle, updatedAuthor, updatedPrice, updatedPages, bookId]);

    response.status(200).json({
      message: 'Book Details Updated Successfully',
      bookId: parseInt(bookId, 10)
    });
  } catch (error) {
    console.error(`PUT /books/:bookId error: ${error.message}`);
    response.status(500).json({ message: error.message });
  }
});

// Route 5: DELETE /books/:bookId/ - Remove a book
app.delete(['/books/:bookId', '/books/:bookId/'], async (request, response) => {
  try {
    const { bookId } = request.params;

    const existingBook = await db.get('SELECT * FROM book WHERE id = ?;', [bookId]);
    if (!existingBook) {
      return response.status(404).json({ message: `Book with id ${bookId} not found` });
    }

    const deleteBookQuery = `DELETE FROM book WHERE id = ?;`;
    await db.run(deleteBookQuery, [bookId]);

    response.status(200).json({
      message: 'Book Deleted Successfully',
      bookId: parseInt(bookId, 10)
    });
  } catch (error) {
    console.error(`DELETE /books/:bookId error: ${error.message}`);
    response.status(500).json({ message: error.message });
  }
});

// 404 Catch-All Handler with consistent message format
app.use((request, response) => {
  response.status(404).json({ message: 'Endpoint Not Found' });
});

module.exports = app;
