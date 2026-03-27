const batches = [
  {
    "id": "651b5525-5962-42e9-97c3-d54a8697a951",
    "viewerid": "04d8068c-47e5-4de8-b873-5cfe0b4504f3",
    "entryuserid": "316b82bb-c627-4c44-8081-620acd86b9f1",
    "batchname": "Batch 03",
    "transactioncount": 1,
    "totalamount": 5000,
    "appliedfilters": { "date": "", "funds": [ "Development Fund" ], "bankNames": [ "Bank of the Philippine Islands" ] },
    "createdat": "2026-03-26T04:53:23.076374+00:00",
    "batch_transactions": [ { "transactiondata": { "id": "cdf0b056-16b6-474e-99d9-71c7412074fc", "date": "2026-01-05", "fund": "Development Fund", "moph": "", "bankName": "Bank of the Philippine Islands", "amount": 5000 } } ]
  }
];

const mapBatch = (b) => ({
  id: b.id, viewerId: b.viewerid, entryUserId: b.entryuserid, batchName: b.batchname,
  transactionCount: b.transactioncount, totalAmount: b.totalamount,
  appliedFilters: b.appliedfilters, createdAt: b.createdat
});

try {
  const mappedBatches = batches?.map((b) => {
    const mapped = mapBatch(b)
    const actualFunds = new Set()
    const actualBanks = new Set()
    let latestDate = ''

    if (b.batch_transactions && Array.isArray(b.batch_transactions) && b.batch_transactions.length > 0) {
      b.batch_transactions.forEach((bt) => {
        const tx = typeof bt.transactiondata === 'string' ? JSON.parse(bt.transactiondata) : bt.transactiondata
        if (tx) {
          if (tx.bankName) actualBanks.add(tx.bankName)
          if (tx.fund && tx.fund !== 'General Fund') {
            actualFunds.add(tx.fund)
          } else if (tx.moph) {
            actualFunds.add(`MOPH - ${tx.moph}`)
          } else {
            actualFunds.add('General Fund')
          }
          if (tx.date && (!latestDate || new Date(tx.date) > new Date(latestDate))) {
            latestDate = tx.date
          }
        }
      })
    }
    return { ...mapped, computedFunds: Array.from(actualFunds), computedBanks: Array.from(actualBanks), computedDate: latestDate || b.createdat }
  }) || []
  console.log("SUCCESS:", JSON.stringify(mappedBatches));
} catch (e) {
  console.error("ERROR:", e);
}
