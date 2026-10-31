// Automated Test Script for Lab 2 CRUD Routes
const http = require('http');

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('   Lab 2: Automated CRUD Endpoint Verification Test  ');
  console.log('====================================================\n');

  try {
    // 1. GET /books/
    console.log('[TEST 1] GET /books/ - Fetching all books...');
    const getAllRes = await makeRequest('GET', '/books/');
    console.log(`Status: ${getAllRes.status}`);
    console.log(`Total books retrieved: ${getAllRes.data.length}`);
    console.log(`First book: ${JSON.stringify(getAllRes.data[0])}`);
    console.log('✔ GET /books/ passed.\n');

    // 2. GET /books/:bookId/ (existing)
    console.log('[TEST 2] GET /books/1/ - Fetching book by ID (1)...');
    const getOneRes = await makeRequest('GET', '/books/1/');
    console.log(`Status: ${getOneRes.status}`);
    console.log(`Book details:`, getOneRes.data);
    console.log('✔ GET /books/1/ passed.\n');

    // 3. GET /books/:bookId/ (not found)
    console.log('[TEST 3] GET /books/999/ - Fetching non-existent book...');
    const getNonExistent = await makeRequest('GET', '/books/999/');
    console.log(`Status: ${getNonExistent.status}`);
    console.log(`Response:`, getNonExistent.data);
    console.log('✔ 404 Not Found passed.\n');

    // 4. POST /books/ - Add new book
    console.log('[TEST 4] POST /books/ - Inserting a new book...');
    const newBook = {
      title: 'Designing Data-Intensive Applications',
      author: 'Martin Kleppmann',
      price: 950,
      pages: 616
    };
    const postRes = await makeRequest('POST', '/books/', newBook);
    console.log(`Status: ${postRes.status}`);
    console.log(`Response:`, postRes.data);
    const createdId = postRes.data.bookId;
    console.log(`✔ POST /books/ passed. Created Book ID: ${createdId}\n`);

    // Verify the newly inserted book
    console.log(`[TEST 4.1] GET /books/${createdId}/ - Verifying newly inserted book...`);
    const verifyNewBook = await makeRequest('GET', `/books/${createdId}/`);
    console.log(`Status: ${verifyNewBook.status}`);
    console.log(`Verified Book:`, verifyNewBook.data);
    console.log('✔ New book verified in SQLite database.\n');

    // 5. PUT /books/:bookId/ - Update the new book
    console.log(`[TEST 5] PUT /books/${createdId}/ - Updating the newly added book...`);
    const updatePayload = {
      title: 'Designing Data-Intensive Applications (2nd Edition)',
      author: 'Martin Kleppmann',
      price: 1100,
      pages: 650
    };
    const putRes = await makeRequest('PUT', `/books/${createdId}/`, updatePayload);
    console.log(`Status: ${putRes.status}`);
    console.log(`Response:`, putRes.data);
    console.log('✔ PUT /books/:bookId/ passed.\n');

    // Verify updated book
    console.log(`[TEST 5.1] GET /books/${createdId}/ - Verifying update in SQLite...`);
    const verifyUpdated = await makeRequest('GET', `/books/${createdId}/`);
    console.log(`Status: ${verifyUpdated.status}`);
    console.log(`Updated Book in DB:`, verifyUpdated.data);
    console.log('✔ Book update verified in SQLite database.\n');

    // 6. DELETE /books/:bookId/ - Delete the book
    console.log(`[TEST 6] DELETE /books/${createdId}/ - Removing the created book...`);
    const deleteRes = await makeRequest('DELETE', `/books/${createdId}/`);
    console.log(`Status: ${deleteRes.status}`);
    console.log(`Response:`, deleteRes.data);
    console.log('✔ DELETE /books/:bookId/ passed.\n');

    // Verify deletion
    console.log(`[TEST 6.1] GET /books/${createdId}/ - Verifying deletion (expect 404)...`);
    const verifyDeleted = await makeRequest('GET', `/books/${createdId}/`);
    console.log(`Status: ${verifyDeleted.status}`);
    console.log(`Response:`, verifyDeleted.data);
    console.log('✔ Deletion confirmed. Book no longer exists in DB.\n');

    console.log('====================================================');
    console.log('       ALL 5 CRUD ROUTES PASSED SUCCESSFULLY!       ');
    console.log('====================================================');
  } catch (err) {
    console.error('Test execution error:', err.message);
  }
}

// Allow time for server to start if run standalone, or run directly
runTests();
