'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Archive, ChevronRight, X } from 'lucide-react'

type Batch = {
  id: string
  viewerId: string
  entryUserId: string
  batchName: string
  transactionCount: number
  totalAmount: number
  appliedFilters: string
  createdAt: string
  fund?: string
  bankName?: string
  month?: string
}

interface BatchListProps {
  viewerId?: string
  entryUserId?: string
  onSelectBatch: (batch: Batch) => void
}

export default function BatchList({ viewerId, entryUserId, onSelectBatch }: BatchListProps) {
  const [batches, setBatches] = useState<Batch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFund, setSelectedFund] = useState<string>('')
  const [selectedBank, setSelectedBank] = useState<string>('')
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [selectedPlace, setSelectedPlace] = useState<string>('')
  const [funds, setFunds] = useState<string[]>([])
  const [banks, setBanks] = useState<string[]>([])
  const [places, setPlaces] = useState<string[]>([])

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        setIsLoading(true)
        const queryParam = viewerId ? `viewerId=${viewerId}` : `entryUserId=${entryUserId}`
        const response = await fetch(`/api/batches?${queryParam}`)
        if (!response.ok) throw new Error('Failed to fetch batches')
        const data = await response.json()
        
        // Extract filters from batches and parse metadata
        const batchesWithMetadata = data
          .filter((batch: Batch) => batch.transactionCount > 0) // Filter out empty batches
          .map((batch: Batch) => {
            try {
              const filters = typeof batch.appliedFilters === 'string' ? JSON.parse(batch.appliedFilters || '{}') : (batch.appliedFilters || {})
              
              // Get the computed fields or fallback to parsing appliedFilters for older structures
              let month = ''
              const targetDate = (batch as any).computedDate || batch.createdAt
              if (targetDate) {
                month = new Date(targetDate).toLocaleDateString('en-US', { month: 'long' })
              }

              let funds = (batch as any).computedFunds;
              if (!funds || funds.length === 0) {
                 funds = filters.funds || (filters.fund ? [filters.fund] : [])
              }

              let banks = (batch as any).computedBanks;
              if (!banks || banks.length === 0) {
                 banks = filters.bankNames || (filters.bankName ? [filters.bankName] : [])
              }

              return {
                ...batch,
                fund: Array.isArray(funds) && funds.length > 0 ? funds.join(', ') : 'General Fund',
                bankName: Array.isArray(banks) && banks.length > 0 ? banks.join(', ') : 'All Banks',
                month: month,
              }
            } catch (err) {
              console.log('[v0] Error parsing filters:', err)
              return {
                ...batch,
                fund: 'General Fund',
                bankName: 'All Banks',
                month: new Date(batch.createdAt).toLocaleDateString('en-US', { month: 'long' }),
              }
            }
          })
        
        setBatches(batchesWithMetadata)
        
        // Extract all unique funds, banks, and places from all batches
        const allFunds = new Set<string>()
        const allBanks = new Set<string>()
        const allPlaces = new Set<string>()
        const regularFunds = ['General Fund', 'Development Fund', 'Trust Fund', 'Hospital Fund']
        
        batchesWithMetadata.forEach((batch: any) => {
          try {
            const filters = typeof batch.appliedFilters === 'string' ? JSON.parse(batch.appliedFilters || '{}') : (batch.appliedFilters || {})

            const bFunds = batch.computedFunds || []
            const bBanks = batch.computedBanks || []

           bFunds.forEach((f: string) => {
              if (!f) return;
              allFunds.add(f)
              if (f.startsWith('MOPH - ')) {
                 allPlaces.add(f.replace('MOPH - ', ''))
              } else if (!regularFunds.includes(f)) {
                 allPlaces.add(f)
              }
           })

           bBanks.forEach((b: string) => {
             if (b) allBanks.add(b)
           })
          } catch (err) {
            console.error(err)
          }
        })
        
        setFunds(Array.from(allFunds).sort())
        setBanks(Array.from(allBanks).sort())
        setPlaces(Array.from(allPlaces).sort())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchBatches()
  }, [viewerId, entryUserId])

  const formatCurrency = (amount: number) => {
    const formatted = amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    return `₱ ${formatted}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const filteredBatches = batches.filter((batch) => {
    if (selectedFund && selectedFund !== 'none' && !batch.fund?.includes(selectedFund)) return false
    if (selectedBank && selectedBank !== 'none' && !batch.bankName?.includes(selectedBank)) return false
    if (selectedMonth && selectedMonth !== 'none' && batch.month !== selectedMonth) return false
    if (selectedPlace && selectedPlace !== 'none' && !batch.fund?.includes(selectedPlace)) return false
    return true
  })

  const uniqueMonths = [...new Set(batches.map((b) => b.month))].sort() as string[]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading batches...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-red-800">Error loading batches: {error}</p>
        </CardContent>
      </Card>
    )
  }

  if (batches.length === 0) {
    return (
      <Card className="border-emerald-100">
        <CardContent className="pt-6 text-center">
          <Archive className="w-12 h-12 text-emerald-200 mx-auto mb-3" />
          <p className="text-gray-600">No batches yet. Print a report to create a batch.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      {/* Filters */}
      <div className="bg-white border border-emerald-100 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Fund</label>
            <div className="w-40">
              <Select value={selectedFund} onValueChange={setSelectedFund}>
                <SelectTrigger className="w-full bg-white border-gray-300 focus:ring-emerald-500">
                  <SelectValue placeholder="All Funds" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-gray-500 italic">All Funds</SelectItem>
                  {funds.filter(f => f).map((fund) => (
                    <SelectItem key={fund} value={fund}>{fund}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Bank</label>
            <div className="w-40">
              <Select value={selectedBank} onValueChange={setSelectedBank}>
                <SelectTrigger className="w-full bg-white border-gray-300 focus:ring-emerald-500">
                  <SelectValue placeholder="All Banks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-gray-500 italic">All Banks</SelectItem>
                  {banks.filter(b => b).map((bank) => (
                    <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Month</label>
            <div className="w-40">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full bg-white border-gray-300 focus:ring-emerald-500">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-gray-500 italic">All Months</SelectItem>
                  {uniqueMonths.map((month) => (
                    <SelectItem key={month} value={month}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Place</label>
            <div className="w-40">
              <Select value={selectedPlace} onValueChange={setSelectedPlace}>
                <SelectTrigger className="w-full bg-white border-gray-300 focus:ring-emerald-500">
                  <SelectValue placeholder="All Places" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-gray-500 italic">All Places</SelectItem>
                  {places.filter(p => p).map((place) => (
                    <SelectItem key={place} value={place}>{place}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(selectedFund || selectedBank || selectedMonth || selectedPlace) && (
            <Button
              onClick={() => {
                setSelectedFund('')
                setSelectedBank('')
                setSelectedMonth('')
                setSelectedPlace('')
              }}
              variant="ghost"
              size="sm"
              className="text-emerald-600 hover:bg-emerald-50"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Batch Grid */}
      {filteredBatches.length === 0 ? (
        <Card className="border-emerald-100">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600">No batches match your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBatches.map((batch) => (
            <Card
              key={batch.id}
              className="border-emerald-100 hover:border-emerald-300 transition-colors cursor-pointer hover:shadow-md"
              onClick={() => onSelectBatch(batch)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-xl font-bold text-emerald-900">
                    {batch.batchName}
                  </CardTitle>
                  <ChevronRight className="w-5 h-5 text-emerald-400 mt-1" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 py-3 border-y border-emerald-100">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Fund</p>
                      <p className="text-sm font-semibold text-emerald-900">{batch.fund}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Bank</p>
                      <p className="text-sm font-semibold text-emerald-900">{batch.bankName}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Month</p>
                    <p className="text-sm font-semibold text-emerald-900">{batch.month}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-100">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Transactions</p>
                      <p className="text-lg font-bold text-emerald-900">{batch.transactionCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
                      <p className="text-lg font-bold text-emerald-900">
                        {formatCurrency(batch.totalAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
