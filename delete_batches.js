const id1 = '515fbebc-d2b5-4ef8-911c-1fc772fc8429';
const id2 = '677a8b51-cdab-4748-9d1b-2a656738d8be';

async function run() {
  const r1 = await fetch(`http://localhost:3000/api/batches/${id1}`, { method: 'DELETE' });
  console.log('Batch 01:', await r1.json());

  const r2 = await fetch(`http://localhost:3000/api/batches/${id2}`, { method: 'DELETE' });
  console.log('Batch 02:', await r2.json());
}

run();
