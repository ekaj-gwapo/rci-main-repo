const { open } = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')

async function initDb() {
  const db = await open({
    filename: path.join(process.cwd(), 'data.db'),
    driver: sqlite3.Database,
  })

  console.log('Creating database tables...')

  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        bankName TEXT NOT NULL,
        payee TEXT NOT NULL,
        address TEXT,
        dvNumber TEXT,
        particulars TEXT,
        amount REAL NOT NULL,
        date DATETIME NOT NULL,
        checkNumber TEXT,
        controlNumber TEXT,
        accountCode TEXT,
        debit REAL DEFAULT 0,
        credit REAL DEFAULT 0,
        remarks TEXT,
        fund TEXT DEFAULT 'General Fund',
        responsibilityCenter TEXT,
        moph TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS viewer_access (
        id TEXT PRIMARY KEY,
        viewerId TEXT NOT NULL,
        entryUserId TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(viewerId, entryUserId),
        FOREIGN KEY (viewerId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (entryUserId) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS transaction_batches (
        id TEXT PRIMARY KEY,
        viewerId TEXT NOT NULL,
        entryUserId TEXT NOT NULL,
        batchName TEXT,
        transactionCount INTEGER DEFAULT 0,
        totalAmount REAL DEFAULT 0,
        appliedFilters TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (viewerId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (entryUserId) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS batch_transactions (
        id TEXT PRIMARY KEY,
        batchId TEXT NOT NULL,
        transactionId TEXT NOT NULL,
        transactionData TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (batchId) REFERENCES transaction_batches(id) ON DELETE CASCADE
      );
    `)

    console.log('Tables created successfully!')
  } finally {
    await db.close()
  }
}

initDb().catch((e) => {
  console.error(e)
  process.exit(1)
})
