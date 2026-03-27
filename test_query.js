const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY);

async function test() {
  const { data: batches, error } = await supabase
    .from('transaction_batches')
    .select(`
      *,
      batch_transactions (
        transactiondata
      )
    `)
    .limit(10);
    
  console.log(JSON.stringify({ batches, error }, null, 2));
}

test();
