import Wallet from '@/components/wallet'

interface WalletPageProps {
  searchParams: Promise<{
    currency?: string
    type?: string
    amount?: string
  }>
}

export default async function WalletPage({ searchParams }: WalletPageProps) {
  const params = await searchParams
  return (
    <Wallet
      currency={params.currency || 'EUR'}
      accountType={params.type || 'Conta'}
      amount={params.amount || '0.00'}
    />
  )
}
