import { TransactionDetails } from "@/components/transaction-details"

interface TransactionPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function TransactionPage({ params }: TransactionPageProps) {
  const { id } = await params
  return <TransactionDetails transactionId={`#${id}`} />
}
