# Lab 3: Debugging Exercise Report

**Course:** Backend Development Fundamentals · Year II Term II · Aurora  
**Faculty:** Siva Sai Teja  
**Student:** Prakash Neduri · 252U1R1168 · SCSE-2D  

---

## Overview

In this exercise, a deliberately broken version of the Express + SQLite project (`buggyServer.js`) was provided. The objective is to identify, document, and resolve four classic backend development bugs:
1. `MODULE_NOT_FOUND` (Wrong import path)
2. `EADDRINUSE` (Port conflict without fallback)
3. `SQLITE_ERROR: no such table` (Table-name typo)
4. Missing `await` (Asynchronous Promise serialization issue)

---

## Detailed Bug Analysis & Solutions

### Bug 1: Wrong Import Path (`MODULE_NOT_FOUND`)

#### Symptom & Stack Trace
```text
Error: Cannot find module './db/sqlite'
Require stack:
- C:\...\lab-03\debugging-exercise\buggyServer.js
    at Module._resolveFilename (node:internal/modules/cjs/loader:1476:15)
    at Module._load (node:internal/modules/cjs/loader:1262:25)
    at Module.require (node:internal/modules/cjs/loader:1576:12)
    at require (node:internal/modules/helpers:153:16)
    at Object.<anonymous> (buggyServer.js:14:18)
```

#### Root Cause
The starter code attempted to require `{ open }` using a relative file path `require('./db/sqlite')`. Because no local file exists at `./db/sqlite.js`, Node.js CommonJS module resolver failed to locate the file and immediately threw `MODULE_NOT_FOUND`.

#### Fix
Import `{ open }` directly from the installed third-party npm package `sqlite`:
```javascript
// ❌ Buggy:
const { open } = require('./db/sqlite');

// ✅ Fixed:
const { open } = require('sqlite');
```

---

### Bug 2: Port Conflict (`EADDRINUSE`)

#### Symptom & Stack Trace
```text
Error: listen EADDRINUSE: address already in use :::3000
    at Server.setupListenHandle [as _listen2] (node:net:1940:16)
    at listenInCluster (node:net:1997:12)
    at Server.listen (node:net:2099:7)
    at Function.listen (node_modules/express/lib/application.js:635:24)
    at initializeDBAndServer (buggyServer.js:33:9)
```

#### Root Cause
The server code hardcoded `const PORT = 3000;`. If another application, a prior development instance, or a previous test process is already bound to port 3000, the operating system kernel rejects the binding with `EADDRINUSE`.

#### How to Troubleshoot on the Command Line
1. Identify the process holding port 3000:
   - **Windows:** `netstat -ano | findstr :3000`
   - **Linux / macOS:** `lsof -i :3000`
2. Terminate the blocking PID (if orphaned):
   - **Windows:** `taskkill /PID <PID> /F`
   - **Linux / macOS:** `kill -9 <PID>`

#### Fix
Adopt environment variable configuration with a default fallback so that ports can be assigned dynamically by process managers, hosting providers (e.g. Vercel/Render), or custom environment flags:
```javascript
// ❌ Buggy:
const PORT = 3000;

// ✅ Fixed:
const PORT = process.env.PORT || 3000;
```

---

### Bug 3: Table-Name Typo (`SQLITE_ERROR: no such table`)

#### Symptom & Stack Trace
```text
Query Error: SQLITE_ERROR: no such table: books_catalog
[500 Internal Server Error] { "message": "SQLITE_ERROR: no such table: books_catalog" }
```

#### Root Cause
The SQL query was written as:
```sql
SELECT * FROM books_catalog ORDER BY id ASC;
```
However, the database schema defined in `init.sql` and initialized in `books.db` creates a table named `book` (singular). In SQLite, referencing a non-existent table name triggers `SQLITE_ERROR: no such table`.

#### Fix
Align the SQL query with the actual database schema:
```javascript
// ❌ Buggy:
const query = `SELECT * FROM books_catalog ORDER BY id ASC;`;

// ✅ Fixed:
const query = `SELECT * FROM book ORDER BY id ASC;`;
```

---

### Bug 4: Missing `await` (Asynchronous Promise Serialization)

#### Symptom & Behavior
When requesting `GET /books`, the server returned an empty JSON object `{}` instead of the expected JSON array of book objects, yet no fatal error was thrown.

#### Root Cause
`db.all(query)` is an asynchronous method provided by the `sqlite` Promise wrapper that returns a `Promise<Array<Row>>`.  
Without the `await` keyword:
1. `const books = db.all(query);` assigns a pending `Promise` object to `books`.
2. Execution immediately moves to `res.status(200).json(books)`.
3. `JSON.stringify(new Promise(...))` serializes a JavaScript Promise as `{}` because Promises have no enumerable own properties.
4. The client receives `{}` while the actual database query resolves in the background unhandled.

#### Fix
Include `await` before calling `db.all()` inside the `async` request handler:
```javascript
// ❌ Buggy:
const books = db.all(query);

// ✅ Fixed:
const books = await db.all(query);
```

---

## Summary of Verification
All four bugs have been resolved and verified in [`fixedServer.js`](./fixedServer.js). When run, the server cleanly connects to the database, listens on the designated port, queries the `book` table, and returns the expected array of books.
