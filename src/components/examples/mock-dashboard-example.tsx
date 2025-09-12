'use client'

// Example component showing how to use mock data for UI development
// This demonstrates the pattern for building UI without API dependency

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  useUser, 
  useWallets, 
  useTransactions, 
  useMockLoading,
  isMockMode 
} from '@/hooks'
import { formatCurrency } from '@/lib/utils'

export function MockDashboardExample() {
  // Use the hook switcher - will use mock data when USE_MOCK_DATA = true
  const { data: user, isLoading: userLoading } = useUser()
  const { data: wallets, isLoading: walletsLoading } = useWallets()
  const { data: transactions, isLoading: transactionsLoading } = useTransactions()
  
  // Example of using mock loading for testing loading states
  const isSimulatedLoading = useMockLoading(1000) // 1 second loading

  if (userLoading || walletsLoading || transactionsLoading || isSimulatedLoading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-6 p-6">
      {/* Mock Mode Indicator */}
      {isMockMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Mock Mode</Badge>
            <span className="text-sm text-blue-700">
              Using mock data for UI development. Change USE_MOCK_DATA to false in hooks/index.ts to connect to real API.
            </span>
          </div>
        </div>
      )}

      {/* User Welcome */}
      <Card>
        <CardHeader>
          <CardTitle>Bem-vindo, {user?.name}!</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Email: {user?.email}</p>
            <p className="text-sm text-muted-foreground">Telefone: {user?.phone}</p>
            <Badge variant={user?.kycStatus === 'approved' ? 'default' : 'secondary'}>
              KYC: {user?.kycStatus}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Wallet Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {wallets?.map((wallet) => (
          <Card key={wallet.currency}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Carteira {wallet.currency}</span>
                <Badge variant="outline">{wallet.currency}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Disponível:</span>
                  <span className="font-medium">
                    {formatCurrency(wallet.available, wallet.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Reservado:</span>
                  <span className="text-sm">
                    {formatCurrency(wallet.reserved, wallet.currency)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Total:</span>
                  <span className="font-bold">
                    {formatCurrency(wallet.total, wallet.currency)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions?.slice(0, 5).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <p className="font-medium">{transaction.description}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      transaction.type === 'send' ? 'destructive' :
                      transaction.type === 'receive' ? 'default' :
                      'secondary'
                    }>
                      {transaction.type}
                    </Badge>
                    <Badge variant={
                      transaction.status === 'completed' ? 'default' :
                      transaction.status === 'pending' ? 'secondary' :
                      'destructive'
                    }>
                      {transaction.status}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${
                    transaction.type === 'send' ? 'text-red-600' : 
                    transaction.type === 'receive' ? 'text-green-600' : 
                    'text-blue-600'
                  }`}>
                    {transaction.type === 'send' ? '-' : '+'}
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(transaction.createdAt).toLocaleDateString('pt-PT')}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Button variant="outline" className="w-full">
              Ver Todas as Transações
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button className="h-20 flex-col gap-2">
          <span className="text-lg">💸</span>
          <span>Enviar</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col gap-2">
          <span className="text-lg">📥</span>
          <span>Receber</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col gap-2">
          <span className="text-lg">🔄</span>
          <span>Trocar</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col gap-2">
          <span className="text-lg">📊</span>
          <span>Trading</span>
        </Button>
      </div>
    </div>
  )
}

// Loading skeleton component
function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-64" />
      
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-6 w-20" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
