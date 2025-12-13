const express = require('express');
const router = express.Router();
const CarRentalService = require('../services/CarRentalService');
const carRentalService = new CarRentalService();

/**
 * @route   GET /api/carrental/search
 * @desc    Search for car rental deals
 * @access  Public
 */
router.get('/search', async (req, res) => {
  try {
    const {
      pickup_date,
      return_date,
      pickup_location,
      car_type
    } = req.query;

    const searchOptions = {
      pickupDate: pickup_date,
      returnDate: return_date,
      pickupLocation: pickup_location || 'MCO Airport',
      carType: car_type || ''
    };

    const results = await carRentalService.searchCarRentals(searchOptions);

    res.json({
      success: true,
      data: results,
      count: results.length,
      searchParameters: searchOptions,
      source: 'serpapi_google_light',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Car rental search error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to search car rentals',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/carrental/company/:company
 * @desc    Search for deals from a specific rental company
 * @access  Public
 */
router.get('/company/:company', async (req, res) => {
  try {
    const { company } = req.params;
    const { pickup_date, return_date } = req.query;

    const searchOptions = {
      pickupDate: pickup_date,
      returnDate: return_date
    };

    const results = await carRentalService.searchByCompany(company, searchOptions);

    res.json({
      success: true,
      data: results,
      count: results.length,
      company: company,
      source: 'serpapi_google_light',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Car rental company search error for ${req.params.company}:`, error.message);
    res.status(500).json({
      success: false,
      error: `Failed to search ${req.params.company} deals`,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/carrental/all-companies
 * @desc    Get deals from all major rental companies
 * @access  Public
 */
router.get('/all-companies', async (req, res) => {
  try {
    const { pickup_date, return_date } = req.query;

    const searchOptions = {
      pickupDate: pickup_date,
      returnDate: return_date
    };

    const results = await carRentalService.getAllCompanyDeals(searchOptions);

    // Group results by company
    const groupedResults = results.reduce((acc, deal) => {
      const company = deal.company || 'Other';
      if (!acc[company]) {
        acc[company] = [];
      }
      acc[company].push(deal);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        all: results,
        byCompany: groupedResults
      },
      count: results.length,
      companies: Object.keys(groupedResults),
      source: 'serpapi_google_light',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('All companies search error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to search all companies',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/carrental/orlando-deals
 * @desc    Get Orlando-specific car rental deals
 * @access  Public
 */
router.get('/orlando-deals', async (req, res) => {
  try {
    const { pickup_date, return_date, car_type } = req.query;

    const searchOptions = {
      pickupDate: pickup_date,
      returnDate: return_date,
      pickupLocation: 'Orlando MCO Airport',
      carType: car_type || ''
    };

    const results = await carRentalService.searchCarRentals(searchOptions);

    // Find best deal
    const bestDeal = results.length > 0 ? results[0] : null;

    // Calculate summary
    const dealsWithCodes = results.filter(d => d.promoCode);
    const avgDiscount = results
      .filter(d => d.discountPercent)
      .reduce((sum, d, _, arr) => sum + d.discountPercent / arr.length, 0);

    res.json({
      success: true,
      data: {
        bestDeal,
        allDeals: results,
        summary: {
          totalDeals: results.length,
          dealsWithPromoCodes: dealsWithCodes.length,
          averageDiscount: Math.round(avgDiscount) || 0,
          topCompanies: [...new Set(results.map(d => d.company).filter(c => c !== 'Various'))].slice(0, 5)
        }
      },
      searchParameters: searchOptions,
      source: 'serpapi_google_light_orlando',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Orlando deals search error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to search Orlando car rental deals',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/carrental/sample-deals
 * @desc    Get sample car rental deals for demonstration
 * @access  Public
 */
router.get('/sample-deals', (req, res) => {
  try {
    const sampleDeals = carRentalService.getSampleDeals();

    res.json({
      success: true,
      data: sampleDeals,
      count: sampleDeals.length,
      type: 'sample',
      message: 'Sample deals for demonstration purposes'
    });
  } catch (error) {
    console.error('Sample deals error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get sample deals',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/carrental/companies
 * @desc    Get list of supported rental companies
 * @access  Public
 */
router.get('/companies', (req, res) => {
  res.json({
    success: true,
    data: carRentalService.popularRentalCompanies,
    count: carRentalService.popularRentalCompanies.length
  });
});

/**
 * @route   GET /api/carrental/locations
 * @desc    Get list of Orlando pickup locations
 * @access  Public
 */
router.get('/locations', (req, res) => {
  res.json({
    success: true,
    data: carRentalService.orlandoLocations,
    count: carRentalService.orlandoLocations.length
  });
});

/**
 * @route   GET /api/carrental/test
 * @desc    Test car rental API routes
 * @access  Public
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Car rental API routes working',
    endpoints: [
      'GET /api/carrental/search - Search for car rental deals',
      'GET /api/carrental/company/:company - Search specific company',
      'GET /api/carrental/all-companies - Get all company deals',
      'GET /api/carrental/orlando-deals - Orlando-specific deals',
      'GET /api/carrental/sample-deals - Sample deals for demo',
      'GET /api/carrental/companies - List of rental companies',
      'GET /api/carrental/locations - Orlando pickup locations'
    ]
  });
});

module.exports = router;
