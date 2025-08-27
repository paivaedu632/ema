# EmaPay Dashboard with Sidebar Navigation

A clean and modern financial dashboard built with Next.js 15, TypeScript, Tailwind CSS v4, and ShadCN UI components, featuring a vertical sidebar navigation.

## Features

✨ **Clean Dashboard Design**: Modern financial dashboard with streamlined interface
🎨 **Modern Tech Stack**: Built with Next.js 15, TypeScript, and Tailwind CSS v4
🧩 **ShadCN UI Components**: Utilizes professional UI components for consistency
📱 **Responsive Design**: Works seamlessly across desktop and mobile devices
🌙 **Dark Mode Ready**: Built-in dark mode support with next-themes
⚡ **Performance Optimized**: Fast loading with Next.js optimizations
🔧 **Sidebar Navigation**: Modern vertical sidebar with collapsible functionality

## Components Included

- **Vertical Sidebar**: Clean navigation with logo, menu items, and user profile (no promotional buttons)
- **Balance Overview**: Total balance display with currency breakdown
- **Action Buttons**: Send, Add money, and Request functionality
- **Currency Cards**: Essential currency account displays (BRL, EUR, USD)
- **Transaction History**: Recent transaction list with status badges
- **Transfer Calculator**: Real-time currency conversion tool

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: ShadCN UI
- **Icons**: Lucide React
- **Fonts**: Inter & JetBrains Mono

## Getting Started

1. **Install dependencies**:
```bash
npm install
```

2. **Run the development server**:
```bash
npm run dev
```

3. **Open your browser**:
Navigate to [http://localhost:3000](http://localhost:3000) to see the EmaPay dashboard.

## Project Structure

```
src/
├── app/
│   ├── globals.css          # Global styles and Tailwind configuration
│   ├── layout.tsx           # Root layout with fonts and metadata
│   └── page.tsx             # Main page component
├── components/
│   ├── ui/                  # ShadCN UI components
│   │   ├── button.tsx       # Button component with variants
│   │   ├── card.tsx         # Card components (using custom CSS classes)
│   │   ├── avatar.tsx       # Avatar component for user profiles
│   │   ├── separator.tsx    # Separator component for dividing sections
│   │   ├── input.tsx        # Input component with custom styling
│   │   └── select.tsx       # Select dropdown component
│   ├── dashboard.tsx        # Main EmaPay dashboard component

│   ├── sell.tsx             # Sell flow component
│   ├── deposit.tsx          # Deposit flow component
│   ├── withdraw.tsx         # Withdraw flow component
│   ├── send.tsx             # Send money flow component
│   └── receive.tsx          # Receive payment component
└── lib/
    └── utils.ts             # Utility functions
```

## ShadCN Components Used

- **Form Components**: Button (with variants), Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue
- **Display Components**: Avatar, AvatarFallback, AvatarImage, Separator
- **Card Components**: Card, CardContent, CardHeader, CardTitle (Note: Custom CSS classes are primarily used instead)

## Design Principles

- **Solid Minimalistic Design**: Clean interface without unnecessary borders and shadows
- **Thicker Border Radius**: Enhanced visual appeal with rounded corners
- **Black Color Scheme**: Consistent use of black for borders and text
- **Responsive Layout**: Grid-based layout that adapts to different screen sizes
- **Hover States**: Interactive elements with smooth transitions

## Development

This project follows modern React patterns and best practices:

- **Client Components**: Uses "use client" directive for interactive components
- **TypeScript**: Full type safety throughout the application
- **Component Composition**: Modular design with reusable components
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Accessibility**: Proper ARIA labels and semantic HTML

## License

This project is for educational purposes only.
