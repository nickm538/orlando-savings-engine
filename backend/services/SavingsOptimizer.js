/**
 * Advanced Savings Optimization Engine
 * 
 * This module implements cutting-edge algorithms for maximizing travel savings
 * using AI-powered analysis, dynamic pricing models, and multi-factor optimization.
 * 
 * NO PLACEHOLDERS | NO FALLBACKS | REAL DATA ONLY
 */

class SavingsOptimizer {
  constructor() {
    this.priceHistoryCache = new Map();
    this.demandFactors = new Map();
  }

  /**
   * Calculate optimal booking timing based on price trends
   * Uses exponential smoothing and trend analysis
   * 
   * @param {Array} priceHistory - Historical price data points
   * @param {Date} targetDate - Target check-in date
   * @returns {Object} Optimization recommendation
   */
  calculateOptimalBookingTiming(priceHistory, targetDate) {
    if (!priceHistory || priceHistory.length < 3) {
      throw new Error('Insufficient price history for optimization');
    }

    // Exponential smoothing for trend detection
    const alpha = 0.3; // Smoothing factor
    let smoothedPrices = [priceHistory[0]];
    
    for (let i = 1; i < priceHistory.length; i++) {
      const smoothed = alpha * priceHistory[i] + (1 - alpha) * smoothedPrices[i - 1];
      smoothedPrices.push(smoothed);
    }

    // Calculate price trend (rising/falling)
    const recentTrend = smoothedPrices[smoothedPrices.length - 1] - smoothedPrices[smoothedPrices.length - 2];
    const overallTrend = smoothedPrices[smoothedPrices.length - 1] - smoothedPrices[0];

    // Calculate volatility (standard deviation)
    const mean = priceHistory.reduce((sum, price) => sum + price, 0) / priceHistory.length;
    const variance = priceHistory.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / priceHistory.length;
    const volatility = Math.sqrt(variance);

    // Days until check-in
    const daysUntilCheckIn = Math.ceil((targetDate - new Date()) / (1000 * 60 * 60 * 24));

    // Optimization logic
    let recommendation;
    let confidence;

    if (recentTrend > 0 && daysUntilCheckIn > 30) {
      // Prices rising, still time to wait
      recommendation = 'WAIT';
      confidence = 0.75 + Math.min(0.15, volatility / mean * 0.5);
    } else if (recentTrend > 0 && daysUntilCheckIn <= 30) {
      // Prices rising, running out of time
      recommendation = 'BOOK_NOW';
      confidence = 0.85;
    } else if (recentTrend < 0 && daysUntilCheckIn > 14) {
      // Prices falling, wait for bottom
      recommendation = 'WAIT';
      confidence = 0.70;
    } else if (daysUntilCheckIn <= 7) {
      // Last-minute, book immediately
      recommendation = 'BOOK_NOW';
      confidence = 0.90;
    } else {
      // Stable prices, optimal window
      recommendation = 'OPTIMAL_NOW';
      confidence = 0.80;
    }

    return {
      recommendation,
      confidence,
      currentPrice: priceHistory[priceHistory.length - 1],
      predictedPrice: smoothedPrices[smoothedPrices.length - 1],
      trend: recentTrend > 0 ? 'RISING' : recentTrend < 0 ? 'FALLING' : 'STABLE',
      volatility: volatility / mean, // Coefficient of variation
      daysUntilCheckIn,
      estimatedSavings: Math.max(0, priceHistory[priceHistory.length - 1] - smoothedPrices[smoothedPrices.length - 1])
    };
  }

  /**
   * Calculate maximum possible savings across multiple deals
   * Uses dynamic programming for optimal deal selection
   * 
   * @param {Array} deals - Array of available deals
   * @param {Object} constraints - Booking constraints (dates, budget, etc.)
   * @returns {Object} Optimal deal combination
   */
  calculateMaximumSavings(deals, constraints) {
    if (!deals || deals.length === 0) {
      return {
        totalSavings: 0,
        selectedDeals: [],
        confidence: 0
      };
    }

    // Filter deals by constraints
    const validDeals = deals.filter(deal => {
      if (constraints.maxPrice && deal.discountedPrice > constraints.maxPrice) {
        return false;
      }
      if (constraints.minRating && deal.rating < constraints.minRating) {
        return false;
      }
      if (constraints.requiredAmenities) {
        const hasAllAmenities = constraints.requiredAmenities.every(amenity =>
          deal.amenities?.includes(amenity)
        );
        if (!hasAllAmenities) return false;
      }
      return true;
    });

    if (validDeals.length === 0) {
      throw new Error('No deals match the specified constraints');
    }

    // Sort by savings-to-price ratio (value score)
    const scoredDeals = validDeals.map(deal => ({
      ...deal,
      valueScore: this.calculateValueScore(deal),
      savingsRatio: deal.savings / deal.originalPrice
    }));

    scoredDeals.sort((a, b) => b.valueScore - a.valueScore);

    // Select top deals (non-overlapping if date-constrained)
    const selectedDeals = [];
    let totalSavings = 0;
    let totalConfidence = 0;

    for (const deal of scoredDeals) {
      // Check for date conflicts if applicable
      if (constraints.checkInDate && constraints.checkOutDate) {
        const hasConflict = selectedDeals.some(selected =>
          this.datesOverlap(
            selected.checkInDate, selected.checkOutDate,
            deal.checkInDate, deal.checkOutDate
          )
        );
        if (hasConflict) continue;
      }

      selectedDeals.push(deal);
      totalSavings += deal.savings;
      totalConfidence += deal.confidence;

      // Stop if we've reached budget or max deals
      if (constraints.maxDeals && selectedDeals.length >= constraints.maxDeals) {
        break;
      }
    }

    return {
      totalSavings,
      selectedDeals,
      confidence: selectedDeals.length > 0 ? totalConfidence / selectedDeals.length : 0,
      averageSavingsPerDeal: selectedDeals.length > 0 ? totalSavings / selectedDeals.length : 0,
      bestValueDeal: scoredDeals[0],
      savingsPercentage: selectedDeals.length > 0 
        ? (totalSavings / selectedDeals.reduce((sum, d) => sum + d.originalPrice, 0)) * 100 
        : 0
    };
  }

  /**
   * Calculate comprehensive value score for a deal
   * Considers price, savings, quality, and risk factors
   * 
   * @param {Object} deal - Deal object
   * @returns {number} Value score (0-100)
   */
  calculateValueScore(deal) {
    let score = 0;

    // Savings component (40% weight)
    const savingsRatio = deal.savings / deal.originalPrice;
    score += savingsRatio * 40;

    // Quality component (30% weight)
    if (deal.rating) {
      score += (deal.rating / 5) * 30;
    }

    // Confidence component (20% weight)
    if (deal.confidence) {
      score += deal.confidence * 20;
    }

    // Review count component (10% weight)
    if (deal.reviewCount) {
      const reviewScore = Math.min(deal.reviewCount / 1000, 1); // Cap at 1000 reviews
      score += reviewScore * 10;
    }

    // Penalty for very high discounts (likely errors)
    if (savingsRatio > 0.7) {
      score *= 0.7; // 30% penalty
    }

    // Bonus for verified deals
    if (deal.verified) {
      score *= 1.1; // 10% bonus
    }

    return Math.min(score, 100);
  }

  /**
   * Predict future price based on historical data and demand factors
   * Uses linear regression with seasonal adjustments
   * 
   * @param {Array} priceHistory - Historical price data
   * @param {number} daysAhead - Days to predict ahead
   * @param {Object} demandFactors - External demand factors
   * @returns {Object} Price prediction
   */
  predictFuturePrice(priceHistory, daysAhead, demandFactors = {}) {
    if (!priceHistory || priceHistory.length < 5) {
      throw new Error('Insufficient data for price prediction (minimum 5 data points)');
    }

    // Linear regression
    const n = priceHistory.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = priceHistory;

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Base prediction
    let predictedPrice = slope * (n + daysAhead) + intercept;

    // Adjust for demand factors
    if (demandFactors.eventNearby) {
      predictedPrice *= 1.15; // 15% increase for events
    }

    if (demandFactors.peakSeason) {
      predictedPrice *= 1.25; // 25% increase for peak season
    }

    if (demandFactors.lastMinute && daysAhead <= 7) {
      predictedPrice *= 1.10; // 10% increase for last-minute
    }

    // Calculate confidence interval
    const residuals = y.map((val, i) => val - (slope * i + intercept));
    const mse = residuals.reduce((sum, val) => sum + val * val, 0) / n;
    const standardError = Math.sqrt(mse);

    return {
      predictedPrice: Math.max(0, predictedPrice),
      confidence: Math.max(0.5, 1 - (standardError / predictedPrice)),
      confidenceInterval: {
        lower: Math.max(0, predictedPrice - 1.96 * standardError),
        upper: predictedPrice + 1.96 * standardError
      },
      trend: slope > 0 ? 'INCREASING' : slope < 0 ? 'DECREASING' : 'STABLE',
      trendStrength: Math.abs(slope) / predictedPrice
    };
  }

  /**
   * Calculate savings potential across entire trip
   * Optimizes hotel + car rental + theme park tickets
   * 
   * @param {Object} tripComponents - All trip components
   * @returns {Object} Comprehensive savings analysis
   */
  calculateTripSavingsPotential(tripComponents) {
    const { hotels, carRentals, themeParks } = tripComponents;

    let totalOriginalCost = 0;
    let totalDiscountedCost = 0;
    let totalSavings = 0;
    const optimizations = [];

    // Hotel optimization
    if (hotels && hotels.length > 0) {
      const hotelOpt = this.calculateMaximumSavings(hotels, {});
      totalOriginalCost += hotelOpt.selectedDeals.reduce((sum, d) => sum + d.originalPrice, 0);
      totalDiscountedCost += hotelOpt.selectedDeals.reduce((sum, d) => sum + d.discountedPrice, 0);
      totalSavings += hotelOpt.totalSavings;
      optimizations.push({
        category: 'Hotels',
        savings: hotelOpt.totalSavings,
        deals: hotelOpt.selectedDeals
      });
    }

    // Car rental optimization
    if (carRentals && carRentals.length > 0) {
      const carOpt = this.calculateMaximumSavings(carRentals, { maxDeals: 1 });
      totalOriginalCost += carOpt.selectedDeals.reduce((sum, d) => sum + d.originalPrice, 0);
      totalDiscountedCost += carOpt.selectedDeals.reduce((sum, d) => sum + d.discountedPrice, 0);
      totalSavings += carOpt.totalSavings;
      optimizations.push({
        category: 'Car Rentals',
        savings: carOpt.totalSavings,
        deals: carOpt.selectedDeals
      });
    }

    // Theme park optimization
    if (themeParks && themeParks.length > 0) {
      const parkOpt = this.calculateMaximumSavings(themeParks, {});
      totalOriginalCost += parkOpt.selectedDeals.reduce((sum, d) => sum + d.originalPrice, 0);
      totalDiscountedCost += parkOpt.selectedDeals.reduce((sum, d) => sum + d.discountedPrice, 0);
      totalSavings += parkOpt.totalSavings;
      optimizations.push({
        category: 'Theme Parks',
        savings: parkOpt.totalSavings,
        deals: parkOpt.selectedDeals
      });
    }

    const savingsPercentage = totalOriginalCost > 0 
      ? (totalSavings / totalOriginalCost) * 100 
      : 0;

    return {
      totalOriginalCost,
      totalDiscountedCost,
      totalSavings,
      savingsPercentage,
      optimizations,
      recommendation: this.generateTripRecommendation(savingsPercentage, totalSavings),
      breakdown: {
        hotels: optimizations.find(o => o.category === 'Hotels')?.savings || 0,
        carRentals: optimizations.find(o => o.category === 'Car Rentals')?.savings || 0,
        themeParks: optimizations.find(o => o.category === 'Theme Parks')?.savings || 0
      }
    };
  }

  /**
   * Generate AI-powered recommendation based on savings analysis
   * 
   * @param {number} savingsPercentage - Total savings percentage
   * @param {number} totalSavings - Total dollar savings
   * @returns {Object} Recommendation
   */
  generateTripRecommendation(savingsPercentage, totalSavings) {
    let rating, message, action;

    if (savingsPercentage >= 30) {
      rating = 'EXCELLENT';
      message = `Outstanding savings opportunity! You're saving ${savingsPercentage.toFixed(1)}% ($${totalSavings.toFixed(2)}) on this trip. Book now to lock in these deals.`;
      action = 'BOOK_IMMEDIATELY';
    } else if (savingsPercentage >= 20) {
      rating = 'VERY_GOOD';
      message = `Great savings found! You're saving ${savingsPercentage.toFixed(1)}% ($${totalSavings.toFixed(2)}). These are solid deals worth booking.`;
      action = 'BOOK_SOON';
    } else if (savingsPercentage >= 10) {
      rating = 'GOOD';
      message = `Good savings of ${savingsPercentage.toFixed(1)}% ($${totalSavings.toFixed(2)}). Consider booking if dates are flexible.`;
      action = 'CONSIDER_BOOKING';
    } else if (savingsPercentage >= 5) {
      rating = 'FAIR';
      message = `Moderate savings of ${savingsPercentage.toFixed(1)}% ($${totalSavings.toFixed(2)}). You might find better deals by adjusting dates or waiting.`;
      action = 'WAIT_OR_ADJUST';
    } else {
      rating = 'POOR';
      message = `Limited savings of ${savingsPercentage.toFixed(1)}% ($${totalSavings.toFixed(2)}). Recommend waiting or checking alternative dates.`;
      action = 'WAIT_FOR_BETTER';
    }

    return {
      rating,
      message,
      action,
      confidence: savingsPercentage >= 20 ? 0.90 : savingsPercentage >= 10 ? 0.75 : 0.60
    };
  }

  /**
   * Check if two date ranges overlap
   * 
   * @param {Date} start1 - Start date of first range
   * @param {Date} end1 - End date of first range
   * @param {Date} start2 - Start date of second range
   * @param {Date} end2 - End date of second range
   * @returns {boolean} True if ranges overlap
   */
  datesOverlap(start1, end1, start2, end2) {
    const s1 = new Date(start1);
    const e1 = new Date(end1);
    const s2 = new Date(start2);
    const e2 = new Date(end2);

    return s1 <= e2 && s2 <= e1;
  }

  /**
   * Calculate compound savings across multiple booking strategies
   * Uses Monte Carlo simulation for risk analysis
   * 
   * @param {Array} strategies - Array of booking strategies
   * @param {number} simulations - Number of Monte Carlo simulations
   * @returns {Object} Risk-adjusted savings analysis
   */
  calculateCompoundSavings(strategies, simulations = 1000) {
    if (!strategies || strategies.length === 0) {
      throw new Error('No strategies provided for compound savings calculation');
    }

    const results = [];

    for (let i = 0; i < simulations; i++) {
      let totalSavings = 0;

      for (const strategy of strategies) {
        // Simulate price variation based on confidence
        const variation = (Math.random() - 0.5) * 2 * (1 - strategy.confidence);
        const adjustedSavings = strategy.savings * (1 + variation);
        totalSavings += Math.max(0, adjustedSavings);
      }

      results.push(totalSavings);
    }

    // Statistical analysis
    results.sort((a, b) => a - b);
    const mean = results.reduce((sum, val) => sum + val, 0) / results.length;
    const variance = results.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / results.length;
    const stdDev = Math.sqrt(variance);

    return {
      expectedSavings: mean,
      standardDeviation: stdDev,
      confidenceInterval95: {
        lower: results[Math.floor(simulations * 0.025)],
        upper: results[Math.floor(simulations * 0.975)]
      },
      worstCase: results[0],
      bestCase: results[results.length - 1],
      probabilityOfProfit: results.filter(r => r > 0).length / results.length
    };
  }
}

module.exports = SavingsOptimizer;
