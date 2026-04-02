'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import BatchList from '@/components/BatchList'
import BatchDetails from '@/components/BatchDetails'
import PrintReport from '@/components/PrintReport'
import { LogOut, Archive } from 'lucide-react'

type Batch = {
  id: string
  viewerId: string
  entryUserId: string
  batchName: string
  transactionCount: number
  totalAmount: number
  appliedFilters: string
  createdAt: string
}

export default function BatchManagement() {
  const [user, setUser] = useState<any>(null)
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Printing states
  const [printTransactions, setPrintTransactions] = useState<any[]>([])
  const [printBatchId, setPrintBatchId] = useState<string | undefined>()
  const [printFund, setPrintFund] = useState('')
  const [printMoph, setPrintMoph] = useState('')
  const [printBankName, setPrintBankName] = useState('')
  const [printUserEmail, setPrintUserEmail] = useState('')
  
  const router = useRouter()

  useEffect(() => {
    const checkAuth = () => {
      const userStr = localStorage.getItem('user')
      if (!userStr) {
        router.push('/auth/login')
        return
      }

      const user = JSON.parse(userStr)
      if (user.role !== 'viewer_user') {
        router.push('/entry-dashboard')
        return
      }

      setUser(user)
      setIsLoading(false)
    }

    checkAuth()
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/auth/login')
  }

  const handleRestoreSuccess = () => {
    // Refresh batch list
    setRefreshKey((prev) => prev + 1)
  }

  const handlePrintBatch = async (batch: Batch, txs?: any[]) => {
    try {
      let transactionsToPrint = txs
      
      if (!transactionsToPrint) {
        // Fetch transitions if not provided (from List view)
        const response = await fetch(`/api/batches/${batch.id}`)
        if (response.ok) {
          const data = await response.json()
          transactionsToPrint = data.transactions
        }
      }

      if (!transactionsToPrint || transactionsToPrint.length === 0) {
        alert('No transactions found in this batch.')
        return
      }

      // Prepare metadata for printing
      setPrintTransactions(transactionsToPrint)
      setPrintBatchId(batch.id)
      
      // Parse filters to get metadata
      try {
        const filters = typeof batch.appliedFilters === 'string' 
          ? JSON.parse(batch.appliedFilters || '{}') 
          : (batch.appliedFilters || {})
        
        setPrintBankName(Array.isArray(filters.bankNames) ? filters.bankNames.join(', ') : (filters.bankName || ''))
        
        const funds = filters.funds || []
        const fund = funds.find((f: string) => !f.startsWith('MOPH - ')) || ''
        const moph = funds.find((f: string) => f.startsWith('MOPH - '))?.replace('MOPH - ', '') || ''
        setPrintFund(fund)
        setPrintMoph(moph)
      } catch (e) {
        console.error('Error parsing filters for print:', e)
      }

      // Fetch entry user email for the report
      try {
        const userResponse = await fetch(`/api/users?id=${batch.entryUserId}`)
        if (userResponse.ok) {
          const userData = await userResponse.json()
          setPrintUserEmail(userData.email || '')
        }
      } catch (e) {
        console.error('Error fetching user email for print:', e)
      }

      // Trigger print
      setTimeout(() => {
        window.print()
      }, 500)

    } catch (error) {
      console.error('Error preparing print:', error)
      alert('Failed to prepare print report.')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f9f6f0] print:bg-white">
      {/* Header - Hidden on Print */}
      <div className="bg-white border-b border-emerald-100 sticky top-0 z-40 print:hidden">
        <div className="w-full px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Archive className="w-6 h-6 text-emerald-600" />
            <div>
              <h1 className="text-2xl font-bold text-emerald-900">Batch Management</h1>
              <p className="text-sm text-gray-600">{user?.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push('/viewer-dashboard')}
              variant="outline"
              className="border-emerald-300 text-emerald-600 hover:bg-emerald-50"
            >
              Back to Dashboard
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Hidden on Print */}
      <div className="w-full px-6 py-8 print:hidden">
        {selectedBatch ? (
          <BatchDetails
            batch={selectedBatch}
            onBack={() => setSelectedBatch(null)}
            onRestoreSuccess={handleRestoreSuccess}
            onPrint={handlePrintBatch}
          />
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Archived Transaction Batches
              </h2>
              <p className="text-sm text-gray-600">
                View and restore transactions from your saved batches
              </p>
            </div>
            <BatchList
              key={refreshKey}
              viewerId={user?.id}
              onSelectBatch={setSelectedBatch}
              onPrintBatch={handlePrintBatch}
            />
          </>
        )}
      </div>

      {/* Print Report - Visible only on Print */}
      <div className="hidden print:block w-full bg-white relative z-50">
        <PrintReport
          transactions={printTransactions}
          logo={null}
          entryUserEmail={printUserEmail}
          batchId={printBatchId}
          fund={printFund}
          moph={printMoph}
          bankName={printBankName}
        />
      </div>
    </div>
  )
}
