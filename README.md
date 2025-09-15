# EmaPay Dashboard

A modern financial dashboard built with Next.js 15, TypeScript, and Supabase for managing international money transfers and currency exchange.

## 🚀 Features

- **Multi-currency Support**: Handle EUR and AOA currencies
- **P2P Transfers**: Send money to other users instantly
- **Currency Exchange**: Convert between EUR and AOA
- **Transaction History**: Track all your financial activities
- **KYC Compliance**: Complete identity verification process
- **Real-time Updates**: Live transaction status updates
- **Secure Authentication**: JWT-based authentication with Supabase
- **Modern State Management**: React Query for server state management
- **Comprehensive Testing**: 94+ test suites with 100% API coverage

## 🛠 Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Auth)
- **State Management**: React Query (@tanstack/react-query)
- **Testing**: Jest, Supertest
- **Deployment**: Vercel-ready

## 📁 Clean Architecture

This project follows a **clean, maintainable frontend architecture** optimized for React/Next.js applications:

```
src/
├── 📱 app/                    # Next.js 15 App Router
│   ├── api/v1/               # RESTful API routes
│   ├── dashboard/            # Dashboard pages
│   ├── kyc/                  # KYC verification flow
│   ├── login/                # Authentication pages
│   └── [feature]/            # Feature-based pages
├── 🧩 components/            # React Components
│   ├── ui/                   # shadcn/ui base components
│   ├── layout/               # Layout components (headers, layouts)
│   ├── forms/                # Form components (inputs, fields)
│   ├── features/             # Feature-specific components
│   │   ├── auth/             # Authentication components
│   │   ├── dashboard/        # Dashboard components
│   │   ├── transfers/        # Transfer components
│   │   ├── wallet/           # Wallet components
│   │   ├── trading/          # Trading components
│   │   ├── transactions/     # Transaction components
│   │   └── kyc/              # KYC components
│   └── providers/            # Context providers (React Query)
├── 🎣 hooks/                 # Custom React Hooks
│   ├── use-api.ts            # React Query API hooks
│   └── use-*.ts              # Feature-specific hooks
├── 📚 lib/                   # Utility Libraries
│   ├── api.ts                # HTTP client & API utilities
│   ├── utils.ts              # General utilities & helpers
│   ├── validations.ts        # Zod schemas & validation
│   ├── auth/                 # Authentication utilities
│   ├── database/             # Database utilities
│   └── supabase/             # Supabase client config
├── 🏷️ types/                 # TypeScript Definitions
│   └── index.ts              # Centralized type definitions
└── 🔧 contexts/              # React Contexts
    └── kyc-context.tsx       # KYC flow state management
```

### 🎯 Architecture Principles

1. **🎨 Feature-Based Organization**: Components organized by business domain
2. **🔄 Modern State Management**: React Query for server state, React Context for client state
3. **📦 Centralized Utilities**: Consolidated lib/ directory with focused responsibilities
4. **🏷️ Type Safety**: Comprehensive TypeScript coverage with centralized types
5. **🧪 Testable Structure**: Clean separation of concerns for easy testing
6. **📱 Mobile-First**: Responsive design with Tailwind CSS

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/ema.git
   cd ema
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Coverage

- **API Contract Tests**: 100% endpoint coverage
- **Integration Tests**: End-to-end user flows
- **Unit Tests**: Component and utility testing
- **Security Tests**: Authentication and data privacy
- **Performance Tests**: Load and stress testing

## 🏗️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run test suite
- `npm run type-check` - Run TypeScript checks

### Code Style

This project uses:
- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript** for type safety
- **Tailwind CSS** for styling

## 📚 API Documentation

The API follows RESTful conventions with comprehensive OpenAPI documentation available at `/api/docs` when running in development mode.

### Key Endpoints

- `GET /api/v1/auth/me` - Get current user
- `GET /api/v1/wallets/balance` - Get wallet balances
- `POST /api/v1/transfers/send` - Send money
- `GET /api/v1/transfers/history` - Transaction history
- `GET /api/v1/users/search` - Search users

## 🔐 Security

- JWT-based authentication
- Row Level Security (RLS) with Supabase
- Input validation with Zod schemas
- CORS protection
- Rate limiting
- Secure error handling

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

```bash
npm run build
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing React framework
- [Supabase](https://supabase.com/) for the backend infrastructure
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- [React Query](https://tanstack.com/query) for server state management

---

**EmaPay Dashboard** - Making international money transfers simple and secure 🌍💰
