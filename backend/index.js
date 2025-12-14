const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const amadeusRoutes = require('./routes/amadeus');
const darkWebRoutes = require('./routes/darkweb');
const serpApiRoutes = require('./routes/serpapi');
const analyzerRoutes = require('./routes/analyzer');
const carRentalRoutes = require('./routes/carrental');

const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));
app.use(limiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      serpApi: !!process.env.SERP_API_KEY,
      amadeus: !!(process.env.AMADEUS_API_KEY && process.env.AMADEUS_API_SECRET)
    }
  });
});

// API Info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Orlando Savings Engine API',
    version: '1.0.0',
    description: 'AI-powered travel savings for Orlando vacations',
    endpoints: {
      health: 'GET /api/health',
      serpapi: {
        base: '/api/serpapi',
        routes: [
          'GET /hotels/search',
          'GET /hotels/orlando',
          'GET /ai/search',
          'GET /light/search',
          'POST /combined-search'
        ]
      },
      analyzer: {
        base: '/api/analyzer',
        routes: [
          'POST /find-best-deal',
          'GET /sample-deals',
          'GET /algorithm-info'
        ]
      },
      amadeus: {
        base: '/api/amadeus',
        routes: [
          'GET /status',
          'GET /flights/search',
          'GET /flights/to-orlando',
          'GET /flights/multi-origin',
          'GET /flights/cheapest-dates',
          'POST /flights/price',
          'GET /airports/search',
          'GET /sample-flights'
        ]
      },
      carrental: {
        base: '/api/carrental',
        routes: [
          'GET /search',
          'GET /company/:company',
          'GET /all-companies',
          'GET /orlando-deals',
          'GET /sample-deals',
          'GET /companies',
          'GET /locations'
        ]
      }
    }
  });
});

// Root welcome page
app.get('/', (req, res) => {
  res.json({
    success: true,
    name: '🏰 Orlando Savings Engine API',
    version: '2.0.0',
    status: 'online',
    description: 'AI-powered travel savings for Orlando vacations - Hotels, Theme Parks, Car Rentals',
    features: [
      '✅ Real-time hotel pricing',
      '✅ Advanced savings optimization',
      '✅ Dynamic confidence scoring',
      '✅ Theme park deals',
      '✅ Car rental discounts'
    ],
    endpoints: {
      health: '/api/health',
      documentation: '/api',
      hotels: '/api/serpapi/hotels/orlando',
      deals: '/api/analyzer/sample-deals',
      flights: '/api/amadeus/status',
      carRentals: '/api/carrental/orlando-deals'
    },
    documentation: 'Visit /api for full API documentation',
    github: 'https://github.com/nickm538/orlando-savings-engine'
  });
});

// API routes
app.use('/api/amadeus', amadeusRoutes);
app.use('/api/darkweb', darkWebRoutes);
app.use('/api/serpapi', serpApiRoutes);
app.use('/api/analyzer', analyzerRoutes);
app.use('/api/carrental', carRentalRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`\n📚 Available API Routes:`);
  console.log(`   - /api/serpapi    (Hotel search & deals)`);
  console.log(`   - /api/analyzer   (Deal analysis)`);
  console.log(`   - /api/amadeus    (Flight search)`);
  console.log(`   - /api/carrental  (Car rental deals)`);
});

module.exports = app;
