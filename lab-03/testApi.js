const http = require('http');
const app = require('./server');

const TEST_PORT = 3003;
let server;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: path,
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
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsed
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 Starting Lab 3 REST API & Validation Test Suite');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(description, condition, actualInfo) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${description}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${description} -> Actual: ${JSON.stringify(actualInfo)}`);
    }
  }

  try {
    // Start temporary test server
    await new Promise((resolve) => {
      server = app.listen(TEST_PORT, () => {
        console.log(`Test server active on port ${TEST_PORT}\n`);
        resolve();
      });
    });

    // 1. Root route
    const resRoot = await request('GET', '/');
    assert('1. GET / returns 200 with student and endpoint overview',
      resRoot.status === 200 && resRoot.body.student === 'Prakash Neduri',
      resRoot.body
    );

    // 2. GET /books/ (default all books)
    const resAll = await request('GET', '/books/');
    assert('2. GET /books/ returns 200 and array of books',
      resAll.status === 200 && Array.isArray(resAll.body) && resAll.body.length >= 10,
      resAll.body
    );

    // 3. Search query: search_q=Harry
    const resSearch = await request('GET', '/books/?search_q=Harry');
    assert('3. GET /books/?search_q=Harry returns partial match with LIKE',
      resSearch.status === 200 && resSearch.body.length === 1 && resSearch.body[0].title.includes('Harry Potter'),
      resSearch.body
    );

    // 4. Search query case-insensitive partial: search_q=the
    const resSearchThe = await request('GET', '/books/?search_q=the');
    assert('4. GET /books/?search_q=the returns multiple matches',
      resSearchThe.status === 200 && resSearchThe.body.length >= 4,
      resSearchThe.body.map(b => b.title)
    );

    // 5. Sorting: order_by=price&order=DESC
    const resSortPriceDesc = await request('GET', '/books/?order_by=price&order=DESC');
    const firstPrice = resSortPriceDesc.body[0].price;
    const secondPrice = resSortPriceDesc.body[1].price;
    assert('5. GET /books/?order_by=price&order=DESC sorts highest price first',
      resSortPriceDesc.status === 200 && firstPrice >= secondPrice,
      { firstPrice, secondPrice }
    );

    // 6. Sorting: order_by=price&order=ASC
    const resSortPriceAsc = await request('GET', '/books/?order_by=price&order=ASC');
    assert('6. GET /books/?order_by=price&order=ASC sorts lowest price first',
      resSortPriceAsc.status === 200 && resSortPriceAsc.body[0].price === 199,
      resSortPriceAsc.body[0]
    );

    // 7. SQL Injection guard in order_by
    const resSortGuard = await request('GET', '/books/?order_by=id;DROP+TABLE+book;&order=ASC');
    assert('7. GET /books/ safely falls back to default id on invalid order_by column',
      resSortGuard.status === 200 && Array.isArray(resSortGuard.body),
      resSortGuard.status
    );

    // 8. Price range filter: min_price and max_price
    const resPriceRange = await request('GET', '/books/?min_price=200&max_price=400');
    const allInRange = resPriceRange.body.every(b => b.price >= 200 && b.price <= 400);
    assert('8. GET /books/?min_price=200&max_price=400 returns only books in range',
      resPriceRange.status === 200 && allInRange && resPriceRange.body.length > 0,
      resPriceRange.body.map(b => ({ title: b.title, price: b.price }))
    );

    // 9. Min price only filter
    const resMinPrice = await request('GET', '/books/?min_price=600');
    const allMin = resMinPrice.body.every(b => b.price >= 600);
    assert('9. GET /books/?min_price=600 returns only books with price >= 600',
      resMinPrice.status === 200 && allMin && resMinPrice.body.length === 3,
      resMinPrice.body.map(b => ({ title: b.title, price: b.price }))
    );

    // 10. Max price only filter
    const resMaxPrice = await request('GET', '/books/?max_price=250');
    const allMax = resMaxPrice.body.every(b => b.price <= 250);
    assert('10. GET /books/?max_price=250 returns only books with price <= 250',
      resMaxPrice.status === 200 && allMax && resMaxPrice.body.length === 2,
      resMaxPrice.body.map(b => ({ title: b.title, price: b.price }))
    );

    // 11. Pagination: limit and offset
    const resPage1 = await request('GET', '/books/?limit=3&offset=0');
    const resPage2 = await request('GET', '/books/?limit=3&offset=3');
    assert('11. GET /books/?limit=3&offset=0 returns exactly 3 records',
      resPage1.status === 200 && resPage1.body.length === 3,
      resPage1.body.length
    );
    assert('12. GET /books/?limit=3&offset=3 returns next page with non-overlapping IDs',
      resPage2.status === 200 && resPage2.body.length === 3 && resPage2.body[0].id !== resPage1.body[0].id,
      { page1Ids: resPage1.body.map(b => b.id), page2Ids: resPage2.body.map(b => b.id) }
    );

    // 13. Single book by ID: GET /books/1/
    const resSingle = await request('GET', '/books/1/');
    assert('13. GET /books/1/ returns 200 and single book object',
      resSingle.status === 200 && resSingle.body.id === 1 && resSingle.body.title.includes('Harry Potter'),
      resSingle.body
    );

    // 14. Single book 404: GET /books/999/
    const res404 = await request('GET', '/books/999/');
    assert('14. GET /books/999/ returns 404 with consistent { message } JSON',
      res404.status === 404 && res404.body.message === 'Book with id 999 not found',
      res404.body
    );

    // 15. Validation on query param: min_price non-numeric
    const resBadParam = await request('GET', '/books/?min_price=abc');
    assert('15. GET /books/?min_price=abc returns 400 Bad Request with message',
      resBadParam.status === 400 && resBadParam.body.message.includes('Invalid query parameter: min_price'),
      resBadParam.body
    );

    // 16. Validation on query param: min_price > max_price
    const resInvertedPrice = await request('GET', '/books/?min_price=500&max_price=200');
    assert('16. GET /books/?min_price=500&max_price=200 returns 400 Bad Request',
      resInvertedPrice.status === 400 && resInvertedPrice.body.message.includes('min_price cannot be greater than max_price'),
      resInvertedPrice.body
    );

    // 17. POST validation: Missing title
    const resMissingTitle = await request('POST', '/books/', {
      author: 'Unknown Author',
      price: 299,
      pages: 150
    });
    assert('17. POST /books/ without title returns 400 Bad Request',
      resMissingTitle.status === 400 && resMissingTitle.body.message.includes('title is required'),
      resMissingTitle.body
    );

    // 18. POST validation: Missing author
    const resMissingAuthor = await request('POST', '/books/', {
      title: 'A Good Book',
      price: 299,
      pages: 150
    });
    assert('18. POST /books/ without author returns 400 Bad Request',
      resMissingAuthor.status === 400 && resMissingAuthor.body.message.includes('author is required'),
      resMissingAuthor.body
    );

    // 19. POST validation: Non-numeric price
    const resBadPrice = await request('POST', '/books/', {
      title: 'A Good Book',
      author: 'Jane Doe',
      price: 'not-a-number',
      pages: 150
    });
    assert('19. POST /books/ with non-numeric price returns 400 Bad Request',
      resBadPrice.status === 400 && resBadPrice.body.message.includes('price is required and must be a non-negative number'),
      resBadPrice.body
    );

    // 20. POST validation: Invalid pages (negative)
    const resBadPages = await request('POST', '/books/', {
      title: 'A Good Book',
      author: 'Jane Doe',
      price: 399,
      pages: -10
    });
    assert('20. POST /books/ with negative pages returns 400 Bad Request',
      resBadPages.status === 400 && resBadPages.body.message.includes('pages is required and must be a positive integer'),
      resBadPages.body
    );

    // 21. POST /books/ valid creation -> 201 Created
    const resCreate = await request('POST', '/books/', {
      title: 'Design Patterns: Elements of Reusable Object-Oriented Software',
      author: 'Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides',
      price: 750,
      pages: 395
    });
    const createdId = resCreate.body.bookId;
    assert('21. POST /books/ with valid data returns 201 Created with bookId and message',
      resCreate.status === 201 && resCreate.body.message === 'Book Added Successfully' && createdId > 0,
      resCreate.body
    );

    // 22. Verify created book exists
    const resVerifyCreated = await request('GET', `/books/${createdId}/`);
    assert('22. GET newly created book returns 200 with matching title',
      resVerifyCreated.status === 200 && resVerifyCreated.body.title.includes('Design Patterns'),
      resVerifyCreated.body
    );

    // 23. PUT /books/:bookId/ update book details -> 200 OK
    const resUpdate = await request('PUT', `/books/${createdId}/`, {
      price: 799,
      pages: 400
    });
    assert('23. PUT /books/:bookId/ returns 200 OK with success message',
      resUpdate.status === 200 && resUpdate.body.message === 'Book Details Updated Successfully',
      resUpdate.body
    );

    // 24. PUT on non-existent book -> 404 Not Found
    const resUpdate404 = await request('PUT', '/books/9999/', {
      price: 100
    });
    assert('24. PUT /books/9999/ on non-existent book returns 404 Not Found',
      resUpdate404.status === 404 && resUpdate404.body.message === 'Book with id 9999 not found',
      resUpdate404.body
    );

    // 25. DELETE /books/:bookId/ -> 200 OK
    const resDelete = await request('DELETE', `/books/${createdId}/`);
    assert('25. DELETE /books/:bookId/ returns 200 OK with success message',
      resDelete.status === 200 && resDelete.body.message === 'Book Deleted Successfully',
      resDelete.body
    );

    // 26. DELETE again (now deleted) -> 404 Not Found
    const resDelete404 = await request('DELETE', `/books/${createdId}/`);
    assert('26. DELETE already removed book returns 404 Not Found',
      resDelete404.status === 404 && resDelete404.body.message === `Book with id ${createdId} not found`,
      resDelete404.body
    );

    // 27. Invalid route -> 404 Not Found with consistent JSON
    const resInvalidRoute = await request('GET', '/unknown/route/');
    assert('27. GET /unknown/route/ returns 404 with consistent { message: "Endpoint Not Found" }',
      resInvalidRoute.status === 404 && resInvalidRoute.body.message === 'Endpoint Not Found',
      resInvalidRoute.body
    );

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    if (server) {
      server.close();
      console.log('\nTest server shut down.');
    }

    console.log('\n================================================================');
    console.log(`📊 Test Results: ${passed}/${total} Passed (${Math.round((passed / total) * 100)}%)`);
    console.log('================================================================\n');

    process.exit(passed === total ? 0 : 1);
  }
}

runTests();
