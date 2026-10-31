-- SQLite Initialization Script for Lab 2
-- Table: book
-- Columns: id, title, author, price, pages

DROP TABLE IF EXISTS book;

CREATE TABLE book (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    price INTEGER NOT NULL,
    pages INTEGER NOT NULL
);

-- Insert 10 sample books
INSERT INTO book (title, author, price, pages) VALUES
('Harry Potter and the Sorcerer''s Stone', 'J.K. Rowling', 450, 309),
('The Hobbit', 'J.R.R. Tolkien', 399, 310),
('To Kill a Mockingbird', 'Harper Lee', 299, 281),
('1984', 'George Orwell', 199, 328),
('The Great Gatsby', 'F. Scott Fitzgerald', 250, 180),
('Clean Code', 'Robert C. Martin', 850, 464),
('You Don''t Know JS', 'Kyle Simpson', 620, 278),
('The Pragmatic Programmer', 'David Thomas & Andrew Hunt', 780, 352),
('Atomic Habits', 'James Clear', 499, 320),
('The Alchemist', 'Paulo Coelho', 299, 208);
