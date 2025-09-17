import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LiquidityChanged } from './liquidity-changed'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock the hooks
jest.mock('@/hooks/use-api', () => ({
  usePlaceMarketOrder: () => ({
    mutateAsync: jest.fn().mockResolvedValue({ success: true }),
    isPending: false
  }),
  usePlaceLimitOrder: () => ({
    mutateAsync: jest.fn().mockResolvedValue({ success: true }),
    isPending: false
  })
}))

// Mock the router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )

  TestWrapper.displayName = 'TestWrapper'

  return TestWrapper
}

describe('LiquidityChanged Component', () => {
  const defaultProps = {
    fromAmount: 100,
    fromCurrency: 'EUR' as const,
    toCurrency: 'AOA' as const,
    originalExpectedAmount: 125000,
    currentAvailableAmount: 87500,
    currentRate: 875,
    onBack: jest.fn(),
    onCancel: jest.fn(),
    onSuccess: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the liquidity changed screen correctly', () => {
    render(<LiquidityChanged {...defaultProps} />, { wrapper: createWrapper() })
    
    expect(screen.getByText('O câmbio mudou enquanto processávamos a sua conversão.')).toBeInTheDocument()
    expect(screen.getByText('Você queria receber:')).toBeInTheDocument()
    expect(screen.getByText('125.000,00 AOA')).toBeInTheDocument()
    expect(screen.getByText('Disponível agora:')).toBeInTheDocument()
    expect(screen.getByText('87.500,00 AOA')).toBeInTheDocument()
  })

  it('shows both conversion options', () => {
    render(<LiquidityChanged {...defaultProps} />, { wrapper: createWrapper() })
    
    expect(screen.getByText('⚡ CONVERTER AGORA')).toBeInTheDocument()
    expect(screen.getByText('⏳ ESPERAR')).toBeInTheDocument()
    expect(screen.getByText('Tempo: Imediato')).toBeInTheDocument()
    expect(screen.getByText('Tempo: Pode demorar horas/dias')).toBeInTheDocument()
  })

  it('calls onBack when back button is clicked', () => {
    render(<LiquidityChanged {...defaultProps} />, { wrapper: createWrapper() })
    
    const backButton = screen.getByRole('button', { name: /back/i })
    fireEvent.click(backButton)
    
    expect(defaultProps.onBack).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when cancel button is clicked', () => {
    render(<LiquidityChanged {...defaultProps} />, { wrapper: createWrapper() })
    
    const cancelButton = screen.getByText('Cancelar')
    fireEvent.click(cancelButton)
    
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1)
  })

  it('handles convert now action', async () => {
    render(<LiquidityChanged {...defaultProps} />, { wrapper: createWrapper() })
    
    const convertNowButton = screen.getByText('⚡ CONVERTER AGORA').closest('button')!
    fireEvent.click(convertNowButton)
    
    await waitFor(() => {
      expect(defaultProps.onSuccess).toHaveBeenCalledWith('market', 87500)
    })
  })

  it('handles wait action', async () => {
    render(<LiquidityChanged {...defaultProps} />, { wrapper: createWrapper() })
    
    const waitButton = screen.getByText('⏳ ESPERAR').closest('button')!
    fireEvent.click(waitButton)
    
    await waitFor(() => {
      expect(defaultProps.onSuccess).toHaveBeenCalledWith('limit', 125000)
    })
  })
})
