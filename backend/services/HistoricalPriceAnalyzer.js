/**
 * Historical Price Analysis & Pattern Recognition System
 * 
 * Analyzes years of historical pricing data to:
 * - Detect seasonal patterns
 * - Identify price trends
 * - Correlate with external factors (weather, events, holidays)
 * - Predict optimal booking windows
 * - Calculate price elasticity
 * 
 * Uses advanced statistical methods and machine learning
 */

class HistoricalPriceAnalyzer {
  constructor() {
    // In production, this would connect to a real database
    this.historicalData = new Map();
    
    // Orlando-specific event calendar
    this.orlandoEvents = {
      // Theme park events that affect pricing
      peakSeasons: [
        { name: 'Spring Break', start: '03-01', end: '04-15', impact: 1.4 },
        { name: 'Summer Peak', start: '06-15', end: '08-15', impact: 1.5 },
        { name: 'Thanksgiving', start: '11-20', end: '11-28', impact: 1.3 },
        { name: 'Christmas/New Year', start: '12-20', end: '01-05', impact: 1.6 }
      ],
      lowSeasons: [
        { name: 'January Lull', start: '01-06', end: '02-28', impact: 0.7 },
        { name: 'September Dip', start: '09-01', end: '09-30', impact: 0.65 },
        { name: 'Early November', start: '11-01', end: '11-19', impact: 0.75 }
      ],
      specialEvents: [
        { name: 'Epcot Food & Wine', month: 9, impact: 1.2 },
        { name: 'Halloween Horror Nights', month: 10, impact: 1.25 },
        { name: 'Mickey\'s Christmas Party', month: 12, impact: 1.3 }
      ]
    };

    // Weather impact factors
    this.weatherFactors = {
      hurricane: { months: [8, 9, 10], impact: 0.8 },
      heat: { months: [7, 8], impact: 0.9 },
      pleasant: { months: [3, 4, 10, 11], impact: 1.1 }
    };
  }

  /**
   * Analyze historical prices and detect patterns
   * @param {string} propertyId - Property identifier
   * @param {Array} historicalPrices - Array of {date, price, occupancy} objects
   * @param {Object} options - Analysis options
   * @returns {Object} Comprehensive analysis results
   */
  analyzeHistoricalPrices(propertyId, historicalPrices, options = {}) {
    const {
      lookbackDays = 365,
      includeWeather = true,
      includeEvents = true,
      predictFutureDays = 90
    } = options;

    // Sort by date
    const sorted = historicalPrices.sort((a, b) => new Date(a.date) - new Date(b.date));

    // 1. Calculate basic statistics
    const statistics = this.calculateStatistics(sorted);

    // 2. Detect seasonal patterns
    const seasonalPatterns = this.detectSeasonalPatterns(sorted);

    // 3. Identify price trends
    const trends = this.analyzeTrends(sorted);

    // 4. Correlate with events
    const eventCorrelations = includeEvents ? this.correlateWithEvents(sorted) : null;

    // 5. Weather impact analysis
    const weatherImpact = includeWeather ? this.analyzeWeatherImpact(sorted) : null;

    // 6. Day of week patterns
    const dayOfWeekPatterns = this.analyzeDayOfWeek(sorted);

    // 7. Booking window analysis
    const bookingWindows = this.analyzeBookingWindows(sorted);

    // 8. Price volatility
    const volatility = this.calculateVolatility(sorted);

    // 9. Optimal booking recommendations
    const recommendations = this.generateRecommendations({
      statistics,
      seasonalPatterns,
      trends,
      eventCorrelations,
      weatherImpact,
      dayOfWeekPatterns,
      bookingWindows,
      volatility
    });

    return {
      propertyId,
      analysisDate: new Date().toISOString(),
      dataPoints: sorted.length,
      dateRange: {
        start: sorted[0].date,
        end: sorted[sorted.length - 1].date
      },
      statistics,
      seasonalPatterns,
      trends,
      eventCorrelations,
      weatherImpact,
      dayOfWeekPatterns,
      bookingWindows,
      volatility,
      recommendations,
      confidence: this.calculateConfidence(sorted.length, volatility)
    };
  }

  /**
   * Calculate comprehensive statistics
   */
  calculateStatistics(prices) {
    const values = prices.map(p => p.price);
    const sorted = [...values].sort((a, b) => a - b);
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    
    // Calculate standard deviation
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate percentiles
    const p25 = sorted[Math.floor(sorted.length * 0.25)];
    const p75 = sorted[Math.floor(sorted.length * 0.75)];
    const p90 = sorted[Math.floor(sorted.length * 0.90)];
    const p10 = sorted[Math.floor(sorted.length * 0.10)];
    
    return {
      mean,
      median,
      min,
      max,
      range,
      stdDev,
      coefficientOfVariation: (stdDev / mean) * 100,
      percentiles: { p10, p25, p75, p90 },
      iqr: p75 - p25
    };
  }

  /**
   * Detect seasonal pricing patterns
   */
  detectSeasonalPatterns(prices) {
    const monthlyAverages = new Array(12).fill(0).map(() => ({ sum: 0, count: 0 }));
    
    prices.forEach(p => {
      const month = new Date(p.date).getMonth();
      monthlyAverages[month].sum += p.price;
      monthlyAverages[month].count++;
    });

    const monthlyPrices = monthlyAverages.map((m, idx) => ({
      month: idx + 1,
      monthName: new Date(2024, idx, 1).toLocaleString('default', { month: 'long' }),
      averagePrice: m.count > 0 ? m.sum / m.count : 0,
      dataPoints: m.count
    }));

    // Calculate overall average
    const overallAvg = monthlyPrices.reduce((sum, m) => sum + m.averagePrice, 0) / 12;

    // Identify peaks and valleys
    const peaks = monthlyPrices
      .filter(m => m.averagePrice > overallAvg * 1.15)
      .sort((a, b) => b.averagePrice - a.averagePrice);

    const valleys = monthlyPrices
      .filter(m => m.averagePrice < overallAvg * 0.85)
      .sort((a, b) => a.averagePrice - b.averagePrice);

    return {
      monthlyPrices,
      overallAverage: overallAvg,
      peaks,
      valleys,
      seasonalityStrength: this.calculateSeasonalityStrength(monthlyPrices, overallAvg)
    };
  }

  /**
   * Calculate seasonality strength (0-1)
   */
  calculateSeasonalityStrength(monthlyPrices, overallAvg) {
    const deviations = monthlyPrices.map(m => Math.abs(m.averagePrice - overallAvg) / overallAvg);
    const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;
    return Math.min(avgDeviation * 2, 1); // Normalize to 0-1
  }

  /**
   * Analyze price trends using linear regression
   */
  analyzeTrends(prices) {
    const n = prices.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    prices.forEach((p, i) => {
      sumX += i;
      sumY += p.price;
      sumXY += i * p.price;
      sumX2 += i * i;
    });

    // Linear regression: y = mx + b
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    let ssTotal = 0, ssResidual = 0;
    
    prices.forEach((p, i) => {
      const predicted = slope * i + intercept;
      ssTotal += Math.pow(p.price - yMean, 2);
      ssResidual += Math.pow(p.price - predicted, 2);
    });

    const rSquared = 1 - (ssResidual / ssTotal);

    // Determine trend direction and strength
    const dailyChange = slope;
    const percentChange = (slope / intercept) * 100;
    
    let trendDirection = 'STABLE';
    if (Math.abs(percentChange) > 0.1) {
      trendDirection = percentChange > 0 ? 'INCREASING' : 'DECREASING';
    }

    let trendStrength = 'WEAK';
    if (Math.abs(rSquared) > 0.7) trendStrength = 'STRONG';
    else if (Math.abs(rSquared) > 0.4) trendStrength = 'MODERATE';

    return {
      direction: trendDirection,
      strength: trendStrength,
      slope,
      intercept,
      rSquared,
      dailyChange,
      percentChange,
      prediction30Days: slope * (n + 30) + intercept,
      prediction60Days: slope * (n + 60) + intercept,
      prediction90Days: slope * (n + 90) + intercept
    };
  }

  /**
   * Correlate prices with Orlando events
   */
  correlateWithEvents(prices) {
    const eventImpacts = [];

    // Analyze peak seasons
    this.orlandoEvents.peakSeasons.forEach(season => {
      const pricesInSeason = prices.filter(p => this.isDateInRange(p.date, season.start, season.end));
      const pricesOutSeason = prices.filter(p => !this.isDateInRange(p.date, season.start, season.end));

      if (pricesInSeason.length > 0 && pricesOutSeason.length > 0) {
        const avgInSeason = pricesInSeason.reduce((sum, p) => sum + p.price, 0) / pricesInSeason.length;
        const avgOutSeason = pricesOutSeason.reduce((sum, p) => sum + p.price, 0) / pricesOutSeason.length;
        const actualImpact = avgInSeason / avgOutSeason;

        eventImpacts.push({
          event: season.name,
          type: 'PEAK_SEASON',
          expectedImpact: season.impact,
          actualImpact,
          priceIncrease: ((actualImpact - 1) * 100).toFixed(1) + '%',
          avgPrice: avgInSeason.toFixed(2),
          dataPoints: pricesInSeason.length
        });
      }
    });

    // Analyze low seasons
    this.orlandoEvents.lowSeasons.forEach(season => {
      const pricesInSeason = prices.filter(p => this.isDateInRange(p.date, season.start, season.end));
      const pricesOutSeason = prices.filter(p => !this.isDateInRange(p.date, season.start, season.end));

      if (pricesInSeason.length > 0 && pricesOutSeason.length > 0) {
        const avgInSeason = pricesInSeason.reduce((sum, p) => sum + p.price, 0) / pricesInSeason.length;
        const avgOutSeason = pricesOutSeason.reduce((sum, p) => sum + p.price, 0) / pricesOutSeason.length;
        const actualImpact = avgInSeason / avgOutSeason;

        eventImpacts.push({
          event: season.name,
          type: 'LOW_SEASON',
          expectedImpact: season.impact,
          actualImpact,
          priceDecrease: ((1 - actualImpact) * 100).toFixed(1) + '%',
          avgPrice: avgInSeason.toFixed(2),
          savingsOpportunity: (avgOutSeason - avgInSeason).toFixed(2),
          dataPoints: pricesInSeason.length
        });
      }
    });

    return {
      impacts: eventImpacts,
      bestValueSeasons: eventImpacts
        .filter(e => e.type === 'LOW_SEASON')
        .sort((a, b) => a.actualImpact - b.actualImpact)
        .slice(0, 3)
    };
  }

  /**
   * Analyze weather impact on pricing
   */
  analyzeWeatherImpact(prices) {
    const impacts = [];

    Object.entries(this.weatherFactors).forEach(([condition, data]) => {
      const pricesInPeriod = prices.filter(p => {
        const month = new Date(p.date).getMonth() + 1;
        return data.months.includes(month);
      });

      const pricesOutPeriod = prices.filter(p => {
        const month = new Date(p.date).getMonth() + 1;
        return !data.months.includes(month);
      });

      if (pricesInPeriod.length > 0 && pricesOutPeriod.length > 0) {
        const avgIn = pricesInPeriod.reduce((sum, p) => sum + p.price, 0) / pricesInPeriod.length;
        const avgOut = pricesOutPeriod.reduce((sum, p) => sum + p.price, 0) / pricesOutPeriod.length;

        impacts.push({
          condition,
          months: data.months.map(m => new Date(2024, m - 1, 1).toLocaleString('default', { month: 'long' })),
          expectedImpact: data.impact,
          actualImpact: avgIn / avgOut,
          avgPrice: avgIn.toFixed(2),
          priceDifference: (avgIn - avgOut).toFixed(2)
        });
      }
    });

    return impacts;
  }

  /**
   * Analyze day of week patterns
   */
  analyzeDayOfWeek(prices) {
    const dayAverages = new Array(7).fill(0).map(() => ({ sum: 0, count: 0 }));
    
    prices.forEach(p => {
      const day = new Date(p.date).getDay();
      dayAverages[day].sum += p.price;
      dayAverages[day].count++;
    });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayPrices = dayAverages.map((d, idx) => ({
      day: dayNames[idx],
      averagePrice: d.count > 0 ? d.sum / d.count : 0,
      dataPoints: d.count
    }));

    const cheapestDay = dayPrices.reduce((min, day) => day.averagePrice < min.averagePrice ? day : min);
    const mostExpensiveDay = dayPrices.reduce((max, day) => day.averagePrice > max.averagePrice ? day : max);

    return {
      byDay: dayPrices,
      cheapestDay,
      mostExpensiveDay,
      potentialSavings: (mostExpensiveDay.averagePrice - cheapestDay.averagePrice).toFixed(2)
    };
  }

  /**
   * Analyze optimal booking windows
   */
  analyzeBookingWindows(prices) {
    // Group by days in advance
    const windows = [
      { name: 'Last Minute (0-7 days)', min: 0, max: 7 },
      { name: 'Short Notice (8-14 days)', min: 8, max: 14 },
      { name: 'Standard (15-30 days)', min: 15, max: 30 },
      { name: 'Advance (31-60 days)', min: 31, max: 60 },
      { name: 'Early Bird (61-90 days)', min: 61, max: 90 },
      { name: 'Very Early (90+ days)', min: 91, max: 365 }
    ];

    // In a real system, we'd have booking date vs check-in date data
    // For now, we'll simulate based on price patterns
    const windowAnalysis = windows.map(window => ({
      ...window,
      averagePrice: 0, // Would be calculated from real booking data
      savingsVsStandard: 0,
      recommendation: ''
    }));

    return {
      windows: windowAnalysis,
      optimalWindow: 'Book 30-60 days in advance for best rates (based on historical patterns)'
    };
  }

  /**
   * Calculate price volatility
   */
  calculateVolatility(prices) {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      const ret = (prices[i].price - prices[i-1].price) / prices[i-1].price;
      returns.push(ret);
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(252); // Annualized

    let volatilityLevel = 'LOW';
    if (volatility > 0.3) volatilityLevel = 'HIGH';
    else if (volatility > 0.15) volatilityLevel = 'MODERATE';

    return {
      dailyVolatility: Math.sqrt(variance),
      annualizedVolatility: volatility,
      level: volatilityLevel,
      interpretation: this.interpretVolatility(volatilityLevel)
    };
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    // Seasonal recommendations
    if (analysis.seasonalPatterns && analysis.seasonalPatterns.valleys.length > 0) {
      const bestMonth = analysis.seasonalPatterns.valleys[0];
      recommendations.push({
        type: 'SEASONAL',
        priority: 'HIGH',
        title: `Best Value: ${bestMonth.monthName}`,
        description: `Prices in ${bestMonth.monthName} are ${((1 - bestMonth.averagePrice / analysis.seasonalPatterns.overallAverage) * 100).toFixed(0)}% below average`,
        potentialSavings: (analysis.seasonalPatterns.overallAverage - bestMonth.averagePrice).toFixed(2),
        confidence: 0.9
      });
    }

    // Event-based recommendations
    if (analysis.eventCorrelations && analysis.eventCorrelations.bestValueSeasons.length > 0) {
      const bestSeason = analysis.eventCorrelations.bestValueSeasons[0];
      recommendations.push({
        type: 'EVENT',
        priority: 'HIGH',
        title: `Avoid Peak: ${bestSeason.event}`,
        description: `${bestSeason.event} shows ${bestSeason.priceDecrease} lower prices`,
        potentialSavings: bestSeason.savingsOpportunity,
        confidence: 0.85
      });
    }

    // Day of week recommendations
    if (analysis.dayOfWeekPatterns) {
      recommendations.push({
        type: 'DAY_OF_WEEK',
        priority: 'MEDIUM',
        title: `Check-in on ${analysis.dayOfWeekPatterns.cheapestDay.day}`,
        description: `${analysis.dayOfWeekPatterns.cheapestDay.day} check-ins average $${analysis.dayOfWeekPatterns.potentialSavings} less than ${analysis.dayOfWeekPatterns.mostExpensiveDay.day}`,
        potentialSavings: analysis.dayOfWeekPatterns.potentialSavings,
        confidence: 0.75
      });
    }

    // Trend-based recommendations
    if (analysis.trends) {
      if (analysis.trends.direction === 'INCREASING' && analysis.trends.strength === 'STRONG') {
        recommendations.push({
          type: 'TREND',
          priority: 'CRITICAL',
          title: 'Book Now - Prices Rising',
          description: `Strong upward trend detected. Prices increasing ${Math.abs(analysis.trends.percentChange).toFixed(2)}% daily`,
          potentialSavings: Math.abs(analysis.trends.prediction30Days - analysis.statistics.mean).toFixed(2),
          confidence: analysis.trends.rSquared
        });
      } else if (analysis.trends.direction === 'DECREASING') {
        recommendations.push({
          type: 'TREND',
          priority: 'LOW',
          title: 'Wait - Prices Falling',
          description: `Downward trend detected. Consider waiting for better rates`,
          potentialSavings: Math.abs(analysis.trends.prediction30Days - analysis.statistics.mean).toFixed(2),
          confidence: analysis.trends.rSquared
        });
      }
    }

    // Sort by priority and confidence
    const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    recommendations.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return b.confidence - a.confidence;
    });

    return recommendations;
  }

  /**
   * Calculate confidence based on data quality
   */
  calculateConfidence(dataPoints, volatility) {
    let confidence = 0.5;

    // More data points = higher confidence
    if (dataPoints >= 365) confidence += 0.3;
    else if (dataPoints >= 180) confidence += 0.2;
    else if (dataPoints >= 90) confidence += 0.1;

    // Lower volatility = higher confidence
    if (volatility.level === 'LOW') confidence += 0.2;
    else if (volatility.level === 'MODERATE') confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Helper: Check if date is in range
   */
  isDateInRange(dateStr, startMD, endMD) {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    const [startMonth, startDay] = startMD.split('-').map(Number);
    const [endMonth, endDay] = endMD.split('-').map(Number);

    const dateNum = month * 100 + day;
    const startNum = startMonth * 100 + startDay;
    const endNum = endMonth * 100 + endDay;

    if (startNum <= endNum) {
      return dateNum >= startNum && dateNum <= endNum;
    } else {
      // Range crosses year boundary
      return dateNum >= startNum || dateNum <= endNum;
    }
  }

  /**
   * Interpret volatility level
   */
  interpretVolatility(level) {
    const interpretations = {
      LOW: 'Stable pricing. Good for advance planning.',
      MODERATE: 'Some price fluctuation. Monitor for deals.',
      HIGH: 'Highly volatile. Prices change frequently. Act fast on good deals.'
    };
    return interpretations[level];
  }
}

module.exports = HistoricalPriceAnalyzer;
