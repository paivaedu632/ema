import { Metadata } from 'next'
import { TradingPageContent } from './trading-page-content'

export const metadata: Metadata = {
  title: 'Vender - EmaPay',
  description: 'Venda suas moedas EUR e AOA com taxas de câmbio competitivas e processamento seguro.',
}

export default function TradePage() {
  return <TradingPageContent />
}
