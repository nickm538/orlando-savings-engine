/**
 * Flight Traffic Analysis API Routes
 * 
 * Endpoints for analyzing Orlando flight traffic patterns
 * using Amadeus Busiest Traveling Period API
 */

const express = require('express');
const router = express.Router();
const FlightTrafficAnalyzer = require('../services/FlightTrafficAnalyzer');

// Initialize analyzer with Amadeus credentials
const analyzer = new FlightTrafficAnalyzer(
  process.env.AMADEUS_API_KEY,
  process.env.AMADEUS_API_SECRET
);

/**
 * GET /api/traffic/analyze/:year
 * Get comprehensive traffic analysis for a year
 */
router.get('/analyze/:year', async (req, res) => {
  try {
    const { year } = req.params;

    // Validate year format
    if (!/^\d{4}$/.test(year)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid year format',
        message: 'Year must be in YYYY format (e.g., 2025)'
      });
    }

    const analysis = await analyzer.analyzeTrafficPatterns(year);

    if (!analysis.success) {
      return res.status(500).json(analysis);
    }

    res.json({
      success: true,
      data: analysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Traffic analysis failed:', error);
    res.status(500).json({
      success: false,
      error: 'Analysis failed',
      message: error.message
    });
  }
});

/**
 * GET /api/traffic/month/:year/:month
 * Get traffic score and recommendations for a specific month
 */
router.get('/month/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;

    // Validate inputs
    if (!/^\d{4}$/.test(year)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid year format',
        message: 'Year must be in YYYY format (e.g., 2025)'
      });
    }

    const monthNum = parseInt(month);
    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        error: 'Invalid month',
        message: 'Month must be between 1 and 12'
      });
    }

    const result = await analyzer.getMonthTrafficScore(monthNum, year);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Month traffic lookup failed:', error);
    res.status(500).json({
      success: false,
      error: 'Lookup failed',
      message: error.message
    });
  }
});

/**
 * POST /api/traffic/compare
 * Compare traffic across multiple months
 */
router.post('/compare', async (req, res) => {
  try {
    const { months, year = '2025' } = req.body;

    if (!months || !Array.isArray(months) || months.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Provide at least 2 months to compare (array of month numbers 1-12)'
      });
    }

    // Validate all months
    const invalidMonths = months.filter(m => m < 1 || m > 12);
    if (invalidMonths.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid months',
        message: 'All months must be between 1 and 12'
      });
    }

    const comparison = await analyzer.compareMonths(months, year);

    if (!comparison.success) {
      return res.status(500).json(comparison);
    }

    res.json({
      success: true,
      data: comparison,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Month comparison failed:', error);
    res.status(500).json({
      success: false,
      error: 'Comparison failed',
      message: error.message
    });
  }
});

/**
 * GET /api/traffic/best-months/:year
 * Get the best months for savings based on traffic
 */
router.get('/best-months/:year', async (req, res) => {
  try {
    const { year } = req.params;
    const { limit = 3 } = req.query;

    if (!/^\d{4}$/.test(year)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid year format',
        message: 'Year must be in YYYY format (e.g., 2025)'
      });
    }

    const analysis = await analyzer.analyzeTrafficPatterns(year);

    if (!analysis.success) {
      return res.status(500).json(analysis);
    }

    // Get months with lowest traffic (best savings)
    const bestMonths = analysis.monthlyScores
      .sort((a, b) => a.score - b.score)
      .slice(0, parseInt(limit))
      .map((month, index) => {
        const prediction = analysis.pricePredictions.find(p => p.monthNumber === month.monthNumber);
        return {
          rank: index + 1,
          month: month.month,
          monthNumber: month.monthNumber,
          trafficScore: month.score,
          category: month.category,
          expectedSavings: prediction.expectedPriceImpact,
          recommendation: prediction.recommendation
        };
      });

    res.json({
      success: true,
      data: {
        year,
        bestMonths,
        summary: `Top ${bestMonths.length} months with lowest traffic for maximum savings`
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Best months lookup failed:', error);
    res.status(500).json({
      success: false,
      error: 'Lookup failed',
      message: error.message
    });
  }
});

/**
 * GET /api/traffic/worst-months/:year
 * Get the worst months (highest traffic/prices)
 */
router.get('/worst-months/:year', async (req, res) => {
  try {
    const { year } = req.params;
    const { limit = 3 } = req.query;

    if (!/^\d{4}$/.test(year)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid year format',
        message: 'Year must be in YYYY format (e.g., 2025)'
      });
    }

    const analysis = await analyzer.analyzeTrafficPatterns(year);

    if (!analysis.success) {
      return res.status(500).json(analysis);
    }

    // Get months with highest traffic (worst for savings)
    const worstMonths = analysis.monthlyScores
      .sort((a, b) => b.score - a.score)
      .slice(0, parseInt(limit))
      .map((month, index) => {
        const prediction = analysis.pricePredictions.find(p => p.monthNumber === month.monthNumber);
        return {
          rank: index + 1,
          month: month.month,
          monthNumber: month.monthNumber,
          trafficScore: month.score,
          category: month.category,
          expectedPriceIncrease: prediction.expectedPriceImpact,
          recommendation: 'Avoid this month if looking for savings'
        };
      });

    res.json({
      success: true,
      data: {
        year,
        worstMonths,
        summary: `Top ${worstMonths.length} months with highest traffic - avoid for savings`
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Worst months lookup failed:', error);
    res.status(500).json({
      success: false,
      error: 'Lookup failed',
      message: error.message
    });
  }
});

/**
 * GET /api/traffic/recommendations/:year
 * Get all traffic-based recommendations
 */
router.get('/recommendations/:year', async (req, res) => {
  try {
    const { year } = req.params;

    if (!/^\d{4}$/.test(year)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid year format',
        message: 'Year must be in YYYY format (e.g., 2025)'
      });
    }

    const analysis = await analyzer.analyzeTrafficPatterns(year);

    if (!analysis.success) {
      return res.status(500).json(analysis);
    }

    res.json({
      success: true,
      data: {
        year,
        recommendations: analysis.recommendations,
        patterns: analysis.patterns,
        summary: {
          totalRecommendations: analysis.recommendations.length,
          criticalAlerts: analysis.recommendations.filter(r => r.priority === 'CRITICAL').length,
          highPriority: analysis.recommendations.filter(r => r.priority === 'HIGH').length
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Recommendations lookup failed:', error);
    res.status(500).json({
      success: false,
      error: 'Lookup failed',
      message: error.message
    });
  }
});

/**
 * GET /api/traffic/demo
 * Demo endpoint to test the service
 */
router.get('/demo', async (req, res) => {
  try {
    // Analyze 2025 traffic
    const analysis = await analyzer.analyzeTrafficPatterns('2025');

    if (!analysis.success) {
      return res.status(500).json({
        success: false,
        error: 'Demo failed',
        details: analysis.error,
        note: 'This may be due to API rate limits or authentication issues'
      });
    }

    // Get best and worst months
    const bestMonths = analysis.monthlyScores
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);

    const worstMonths = analysis.monthlyScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    res.json({
      success: true,
      note: 'This is a demo using real Amadeus data for Orlando (MCO) in 2025',
      data: {
        year: '2025',
        cityCode: 'MCO',
        bestMonthsForSavings: bestMonths.map(m => ({
          month: m.month,
          trafficScore: m.score,
          category: m.category
        })),
        worstMonthsForSavings: worstMonths.map(m => ({
          month: m.month,
          trafficScore: m.score,
          category: m.category
        })),
        topRecommendations: analysis.recommendations.slice(0, 3),
        seasonalityStrength: analysis.patterns.seasonalityStrength,
        averageTrafficScore: analysis.patterns.averageScore
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Demo failed:', error);
    res.status(500).json({
      success: false,
      error: 'Demo failed',
      message: error.message
    });
  }
});

module.exports = router;
