const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function clearBatches() {
  const db = await open({
    filename: path.join(process.cwd(), 'data.db'),
    driver: sqlite3.Database,
  });

  await db.exec('PRAGMA foreign_keys = ON');

  console.log('Clearing batches...');
  await db.run('DELETE FROM transaction_batches');
  await db.run('DELETE FROM batch_transactions');
  
  console.log('All batches deleted successfully.');
}

clearBatches().catch(console.error);
