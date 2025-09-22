# Ecwid Plugin

A modern full-stack Ecwid plugin built with Node.js, Express, React, SQLite, and Tailwind CSS. This plugin provides OAuth authentication and store management for your Ecwid store.

## 🚀 Features

- **🔐 OAuth Authentication** - Secure OAuth 2.0 flow with Ecwid
- **🏪 Store Management** - Connect and manage your Ecwid store
- **📱 Responsive Design** - Mobile-first design with Tailwind CSS
- **🔒 Secure API** - Rate limiting and secure token management
- **💾 Local Database** - SQLite for store data and OAuth states

## 🛠️ Tech Stack

- **Backend**: Node.js + Express.js
- **Frontend**: React 18 + Vite
- **Database**: SQLite3
- **Styling**: Tailwind CSS
- **Authentication**: OAuth 2.0
- **API Integration**: Ecwid REST API
- **Development**: Hot reload, ESLint, TypeScript support

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (version 18 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- An [Ecwid account](https://www.ecwid.com/) with a store
- Access to [Ecwid Developer Portal](https://developers.ecwid.com/)

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd ecwid-plugin
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your credentials:
   ```env
   PORT=3001
   NODE_ENV=development
   ECWID_CLIENT_ID=your_client_id_here
   ECWID_CLIENT_SECRET=your_client_secret_here
   ECWID_STORE_ID=your_store_id_here
   JWT_SECRET=your_jwt_secret_here
   ```

4. **Initialize the database**
   ```bash
   npm run db:migrate
   ```

5. **Start the development servers**
   ```bash
   npm run dev
   ```

   This will start:
   - Backend server at `http://localhost:3001`
   - Frontend development server at `http://localhost:5173`

## 📁 Project Structure

```
ecwid-plugin/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API service functions
│   │   └── utils/         # Utility functions
│   └── public/            # Static assets
├── server/                # Express backend
│   ├── config/           # Database and app configuration
│   ├── middleware/       # Express middleware
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   └── scripts/         # Database scripts
├── data/                 # SQLite database files
├── dist/                # Built frontend files
├── package.json         # Dependencies and scripts
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
└── README.md           # This file
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Ecwid Configuration
ECWID_CLIENT_ID=your_client_id_here
ECWID_CLIENT_SECRET=your_client_secret_here
ECWID_STORE_ID=your_store_id_here


# Database Configuration
DB_PATH=./data/ecwid_plugin.db

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Getting Ecwid Credentials

1. Go to your [Ecwid Admin Panel](https://my.ecwid.com/)
2. Navigate to "My Apps" section
3. Create a new application
4. Copy the Client ID and Client Secret
5. Note your Store ID from the URL or settings

## 📚 API Documentation

### Backend API Endpoints

#### Store Management
- `GET /api/ecwid/store/:storeId` - Get store information
- `POST /api/ecwid/store` - Create or update store configuration

#### OAuth Authentication
- `GET /api/oauth/status/:storeId` - Check OAuth authentication status
- `GET /api/oauth/auth/:storeId` - Initiate OAuth flow
- `GET /api/oauth/callback` - Handle OAuth callback

### Frontend Components

#### Core Components
- `OAuthButton` - OAuth authentication button
- `StoreSetup` - Store setup and configuration
- `Settings` - Plugin configuration and OAuth status

#### Custom Hooks
- `useEcwid` - Ecwid API integration hook
- Custom hooks for data fetching and state management

## 🎨 Styling

The project uses Tailwind CSS with custom components and utilities:

### Custom CSS Classes
- `.btn` - Button base styles
- `.btn-primary`, `.btn-secondary`, etc. - Button variants
- `.card` - Card container styles
- `.form-input` - Form input styles
- `.badge` - Badge styles with variants

### Color Scheme
- Primary: Blue (`#3b82f6`)
- Ecwid: Cyan (`#0ea5e9`)
- Success: Green
- Warning: Yellow
- Danger: Red

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Database Operations
```bash
npm run sync:all    # Sync all stores data
```

## 🔒 Security Features

- **OAuth Authentication** - Secure API access
- **Rate Limiting** - Prevent API abuse
- **CORS Protection** - Configured for specific origins
- **Helmet.js** - Security headers
- **Input Validation** - Request validation middleware
- **SQL Injection Protection** - Parameterized queries

## 📊 Analytics Features

- **Real-time Tracking** - Live event monitoring
- **Event Types** - Page views, cart updates, purchases
- **Customer Behavior** - User journey tracking
- **Performance Metrics** - Store performance insights
- **Custom Events** - Track custom business events

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development servers
npm run server:dev   # Start backend only
npm run client:dev   # Start frontend only
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
```

### Adding New Features

1. **Backend**: Add routes in `server/routes/`
2. **Frontend**: Add components in `client/src/components/`
3. **Database**: Update models in `server/config/database.js`
4. **Styling**: Use Tailwind classes or add custom CSS

### Database Schema

The SQLite database includes tables for:
- `stores` - Store configuration and credentials
- `products` - Product data and metadata
- `orders` - Order information and status
- `customers` - Customer data and insights
- `analytics` - Event tracking and analytics
- `plugin_settings` - Plugin configuration

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Change port in .env file
   PORT=3002
   ```

2. **Database connection errors**
   ```bash
   # Ensure data directory exists
   mkdir data
   npm run db:migrate
   ```

3. **Ecwid API errors**
   - Verify your Client ID and Secret
   - Check store ID is correct
   - Ensure API permissions are granted

4. **Build errors**
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

### Debug Mode

Enable debug logging:
```javascript
localStorage.setItem('ecwid-plugin-debug', 'true');
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests: `npm run lint`
5. Commit your changes: `git commit -m 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- [Ecwid Developer Documentation](https://docs.ecwid.com/)
- [Ecwid API Reference](https://developers.ecwid.com/api-reference)
- [Ecwid Community Forum](https://support.ecwid.com/)
- [React Documentation](https://reactjs.org/docs/)
- [Express.js Documentation](https://expressjs.com/)

## 📝 Changelog

### Version 1.0.0
- Initial release with full-stack architecture
- React frontend with Tailwind CSS
- Express.js backend with SQLite
- Complete Ecwid API integration
- Real-time analytics dashboard
- Product and order management
- Responsive design
- Security features and authentication
