const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const dbPath = path.join(__dirname, 'books.db');

const initialBooks = [
  { title: "Harry Potter and the Sorcerer's Stone", author: 'J.K. Rowling', price: 450, pages: 309 },
  { title: 'The Hobbit', author: 'J.R.R. Tolkien', price: 399, pages: 310 },
  { title: 'To Kill a Mockingbird', author: 'Harper Lee', price: 299, pages: 281 },
  { title: '1984', author: 'George Orwell', price: 199, pages: 328 },
  { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', price: 250, pages: 180 },
  { title: 'Clean Code', author: 'Robert C. Martin', price: 850, pages: 464 },
  { title: "You Don't Know JS", author: 'Kyle Simpson', price: 620, pages: 278 },
  { title: 'The Pragmatic Programmer', author: 'David Thomas & Andrew Hunt', price: 780, pages: 352 },
  { title: 'Atomic Habits', author: 'James Clear', price: 499, pages: 320 },
  { title: 'The Alchemist', author: 'Paulo Coelho', price: 299, pages: 208 }
];

async function setupDatabase() {
  try {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    console.log(`Connected to SQLite database at: ${dbPath}`);

    // Create table if not exists or recreate fresh
    await db.exec(`
      DROP TABLE IF EXISTS book;
      CREATE TABLE book (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        price INTEGER NOT NULL,
        pages INTEGER NOT NULL
      );
    `);
    console.log('Table "book" created successfully.');

    // Insert 10 sample books using parameterized queries
    const insertQuery = `
      INSERT INTO book (title, author, price, pages)
      VALUES (?, ?, ?, ?);
    `;

    for (const book of initialBooks) {
      await db.run(insertQuery, [book.title, book.author, book.price, book.pages]);
    }

    console.log(`Successfully inserted ${initialBooks.length} sample books into database.`);

    const countResult = await db.get('SELECT COUNT(*) AS total FROM book;');
    console.log(`Total books in database: ${countResult.total}`);

    const allBooks = await db.all('SELECT * FROM book;');
    console.table(allBooks);

    await db.close();
    console.log('Database setup complete and connection closed.');
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

setupDatabase();
