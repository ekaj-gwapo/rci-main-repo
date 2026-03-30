import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// Helper to map database columns to camelCase
const mapBatch = (b: any) => ({
  id: b.id,
  viewerId: b.viewerid,
  entryUserId: b.entryuserid,
  batchName: b.batchname,
  transactionCount: b.transactioncount,
  totalAmount: b.totalamount,
  appliedFilters: b.appliedfilters,
  createdAt: b.createdat
})

// GET all batches for a viewer or entry user
export async function GET(request: NextRequest) {
  try {
    const viewerId = request.nextUrl.searchParams.get('viewerId')
    const entryUserId = request.nextUrl.searchParams.get('entryUserId')

    if (!viewerId && !entryUserId) {
      return NextResponse.json(
        { error: 'Viewer ID or Entry User ID required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('transaction_batches')
      .select(`
        *,
        batch_transactions (
          transactiondata
        )
      `)
      .order('createdat', { ascending: false })

    if (viewerId) {
      query = query.eq('viewerid', viewerId)
    } else if (entryUserId) {
      query = query.eq('entryuserid', entryUserId)
    }

    const { data: batches, error } = await query

    if (error) throw error

    const mappedBatches = batches?.map((b: any) => {
      const mapped = mapBatch(b)
      
      const actualFunds = new Set<string>()
      const actualBanks = new Set<string>()
      let latestDate = ''

      if (b.batch_transactions && Array.isArray(b.batch_transactions) && b.batch_transactions.length > 0) {
        b.batch_transactions.forEach((bt: any) => {
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

      return {
        ...mapped,
        computedFunds: Array.from(actualFunds),
        computedBanks: Array.from(actualBanks),
        computedDate: latestDate || b.createdat
      }
    }) || []

    return NextResponse.json(mappedBatches)
  } catch (error) {
    console.error('Error fetching batches:', error)
    return NextResponse.json(
      { error: 'Failed to fetch batches' },
      { status: 500 }
    )
  }
}

// POST create a new batch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      viewerId,
      entryUserId,
      transactions,
      appliedFilters,
    } = body

    if (!viewerId || !entryUserId || !transactions || transactions.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const totalAmount = transactions.reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0)
    
    // Get the count of batches for this viewer to generate sequential number
    const { count, error: countError } = await supabase
      .from('transaction_batches')
      .select('*', { count: 'exact', head: true })
      .eq('viewerid', viewerId)

    if (countError) throw countError

    const sequentialNumber = String((count || 0) + 1).padStart(2, '0')
    const batchName = `Batch ${sequentialNumber}`

    // Create batch record
    const { data: batch, error: batchError } = await supabase
      .from('transaction_batches')
      .insert([
        {
          viewerid: viewerId,
          entryuserid: entryUserId,
          batchname: batchName,
          transactioncount: transactions.length,
          totalamount: totalAmount,
          appliedfilters: appliedFilters || {},
        }
      ])
      .select('*')
      .single()

    if (batchError) throw batchError

    // Create batch transaction records and delete from main transactions table
    for (const tx of transactions) {
      const { error: batchTxError } = await supabase
        .from('batch_transactions')
        .insert([
          {
            batchid: batch.id,
            transactiondata: tx,
          }
        ])

      if (batchTxError) throw batchTxError

      // Delete the transaction from main transactions table
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', tx.id)

      if (deleteError) throw deleteError
    }

    return NextResponse.json(mapBatch(batch), { status: 201 })
  } catch (error) {
    console.error('Error creating batch:', error)
    return NextResponse.json(
      { error: 'Failed to create batch' },
      { status: 500 }
    )
  }
}
