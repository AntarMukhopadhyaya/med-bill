# Medical Billing Management System

A comprehensive React Native application built with Expo for managing medical billing, inventory, customers, and orders.

## Features

### 🔐 Authentication

- User registration and login
- Secure session management with Supabase
- Password reset functionality

### 👥 Customer Management

- Add, edit, and delete customers
- Store customer details (name, phone, email, GST, addresses)
- Search and filter customers
- Track customer purchase history

### 📦 Inventory Management

- Manage medical inventory items
- Track stock levels with low stock alerts
- GST and HSN code support
- Price management
- Stock quantity tracking

### 📋 Order Management

- Create and manage orders
- Order status tracking (pending, confirmed, shipped, delivered)
- Payment status tracking (pending, paid, overdue)
- Order item management with automatic calculations
- Customer order history

### 📊 Reports & Analytics

- Sales reports by period (week, month, quarter, year)
- Top customers and products analysis
- Payment status overview
- Sales trends visualization
- Key performance metrics

### 💰 Billing Features

- Automatic tax calculations
- GST-compliant invoicing
- Order totals with tax breakdown
- Payment tracking

## Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Supabase (PostgreSQL)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form with Zod validation
- **Navigation**: Expo Router
- **TypeScript**: Fully type-safe implementation

## Database Schema

The application uses the following main tables:

- `customers` - Customer information
- `inventory` - Product/item inventory
- `orders` - Order records
- `order_items` - Individual items in orders
- `invoices` - Generated invoices
- `payments` - Payment records
- `ledgers` - Customer account ledgers
- `profiles` - User profiles
- `store` - Store configuration

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- Supabase account

### 1. Clone the Repository

\`\`\`bash
git clone <your-repo-url>
cd med-bill
\`\`\`

### 2. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Create the database tables using the provided schema (see Database Schema section)
3. Copy your project URL and anon key

### 4. Configure Environment Variables

\`\`\`bash
cp .env.example .env
\`\`\`

Edit the `.env` file with your Supabase credentials:
\`\`\`
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
\`\`\`

### 5. Database Setup

Execute the following SQL in your Supabase SQL editor to create the required tables:

\`\`\`sql
-- Enable Row Level Security
ALTER TABLE IF EXISTS public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies (example for authenticated users)
CREATE POLICY "Users can view their own data" ON public.customers
FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage inventory" ON public.inventory
FOR ALL USING (auth.uid() IS NOT NULL);

-- Add similar policies for other tables
\`\`\`

### 6. Run the Application

For development:
\`\`\`bash
npm start
\`\`\`

For specific platforms:
\`\`\`bash
npm run android # Android
npm run ios # iOS
npm run web # Web
\`\`\`

## Project Structure

\`\`\`
med-bill/
├── app/ # App screens (Expo Router)
│ ├── (auth)/ # Authentication screens
│ ├── (tabs)/ # Main app tabs
│ └── \_layout.tsx # Root layout
├── components/ # Reusable components
├── contexts/ # React contexts (Auth, Query)
├── lib/ # Utilities and configurations
├── types/ # TypeScript type definitions
├── constants/ # App constants
└── assets/ # Images, fonts, etc.
\`\`\`

## Key Components

### Authentication Flow

- Login/Register screens with validation
- Automatic session management
- Protected routes

### Data Management

- TanStack Query for server state
- Optimistic updates
- Automatic error handling
- Real-time data synchronization

### UI/UX Features

- Modern, clean interface
- Dark/light theme support
- Responsive design
- Touch-friendly interactions
- Loading states and error handling

## Development Guidelines

### Code Style

- TypeScript strict mode enabled
- ESLint and Prettier configuration
- Consistent naming conventions
- Component-based architecture

### State Management

- Use TanStack Query for server state
- React Context for global app state
- Local state for component-specific data

### Error Handling

- Comprehensive error boundaries
- User-friendly error messages
- Automatic retry mechanisms
- Offline support considerations

## Deployment

### Expo Build

\`\`\`bash
expo build:android
expo build:ios
\`\`\`

### Environment Configuration

- Set up production environment variables
- Configure Supabase for production
- Update app configuration for release

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:

- Create an issue in the repository
- Contact the development team
- Check the documentation

## Future Enhancements

- PDF invoice generation
- Barcode scanning
- Multi-currency support
- Advanced reporting
- API integrations
- Mobile app notifications
- Backup and restore functionality
