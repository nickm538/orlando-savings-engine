/**
 * Flight Traffic Analyzer
 * 
 * Integrates Amadeus Flight Busiest Traveling Period API to:
 * - Analyze historical passenger traffic patterns
 * - Identify peak and off-peak travel seasons
 * - Correlate flight traffic with hotel/theme park pricing
 * - Predict optimal booking windows based on demand
 * - Generate savings recommendations based on traffic trends
 * 
 * Uses real historical data from Amadeus for Orlando (MCO)
 */

const axios = require('axios');

class FlightTrafficAnalyzer {
  constructor(amadeusApiKey, amadeusApiSecret) {
    this.apiKey = amadeusApiKey;
    this.apiSecret = amadeusApiSecret;
    this.baseUrl = 'https://test.api.amadeus.com/v1';
    this.accessToken = null;
    this.tokenExpiry = null;

    // Orlando-specific configuration
    this.cityCode = 'MCO'; // Orlando International Airport
    
    // Traffic score interpretation thresholds
    this.thresholds = {
      veryHigh: 9,    // Score 9-10: Peak season
      high: 7,        // Score 7-8: Busy period
      moderate: 4,    // Score 4-6: Normal traffic
      low: 1          // Score 1-3: Low season
    };

    // Price impact multipliers based on traffic
    this.priceImpact = {
      veryHigh: 1.50,   // 50% price increase
      high: 1.25,       // 25% price increase
      moderate: 1.00,   // Normal pricing
      low: 0.70         // 30% discount opportunity
    };
  }

  /**
   * Get Amadeus OAuth access token
   */
  async getAccessToken() {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        'https://test.api.amadeus.com/v1/security/oauth2/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.apiKey,
          client_secret: this.apiSecret
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      // Set expiry to 5 minutes before actual expiry for safety
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 300) * 1000);
      
      return this.accessToken;
    } catch (error) {
      console.error('Failed to get Amadeus access token:', error.response?.data || error.message);
      throw new Error('Authentication failed');
    }
  }

  /**
   * Fetch busiest period data from Amadeus
   * @param {string} year - Year in YYYY format (e.g., "2025")
   * @param {string} direction - "ARRIVING" or "DEPARTING"
   * @returns {Object} Traffic data by month
   */
  async fetchBusiestPeriod(year = '2025', direction = 'ARRIVING') {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(
        `${this.baseUrl}/travel/analytics/air-traffic/busiest-period`,
        {
          params: {
            cityCode: this.cityCode,
            period: year,
            direction: direction
          },
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      return {
        success: true,
        data: response.data.data,
        meta: response.data.meta,
        year,
        direction,
        cityCode: this.cityCode
      };
    } catch (error) {
      console.error('Failed to fetch busiest period data:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.errors?.[0] || { 
          title: 'API Error',
          detail: error.message 
        },
        year,
        direction
      };
    }
  }

  /**
   * Analyze traffic patterns and generate insights
   * @param {string} year - Year to analyze
   * @returns {Object} Comprehensive traffic analysis
   */
  async analyzeTrafficPatterns(year = '2025') {
    // Fetch both arriving and departing traffic
    const [arrivingData, departingData] = await Promise.all([
      this.fetchBusiestPeriod(year, 'ARRIVING'),
      this.fetchBusiestPeriod(year, 'DEPARTING')
    ]);

    if (!arrivingData.success) {
      return {
        success: false,
        error: 'Failed to fetch traffic data',
        details: arrivingData.error
      };
    }

    // Process arriving traffic (most relevant for hotel bookings)
    const monthlyScores = this.processMonthlyScores(arrivingData.data);
    
    // Identify patterns
    const patterns = this.identifyPatterns(monthlyScores);
    
    // Generate recommendations
    const recommendations = this.generateTrafficRecommendations(monthlyScores, patterns);
    
    // Calculate price predictions
    const pricePredictions = this.predictPriceImpact(monthlyScores);

    return {
      success: true,
      year,
      cityCode: this.cityCode,
      analysisDate: new Date().toISOString(),
      monthlyScores,
      patterns,
      recommendations,
      pricePredictions,
      rawData: {
        arriving: arrivingData.data,
        departing: departingData.success ? departingData.data : null
      }
    };
  }

  /**
   * Process monthly traffic scores
   */
  processMonthlyScores(data) {
    const scores = data.map(item => ({
      period: item.period,
      month: new Date(item.period + '-01').toLocaleString('default', { month: 'long' }),
      monthNumber: parseInt(item.period.split('-')[1]),
      score: item.analytics.travelers.score,
      category: this.categorizeTrafficScore(item.analytics.travelers.score)
    }));

    // Sort by month
    scores.sort((a, b) => a.monthNumber - b.monthNumber);

    return scores;
  }

  /**
   * Categorize traffic score
   */
  categorizeTrafficScore(score) {
    if (score >= this.thresholds.veryHigh) return 'PEAK_SEASON';
    if (score >= this.thresholds.high) return 'BUSY';
    if (score >= this.thresholds.moderate) return 'MODERATE';
    return 'LOW_SEASON';
  }

  /**
   * Identify traffic patterns
   */
  identifyPatterns(monthlyScores) {
    const peakMonths = monthlyScores.filter(m => m.category === 'PEAK_SEASON');
    const lowSeasonMonths = monthlyScores.filter(m => m.category === 'LOW_SEASON');
    const busyMonths = monthlyScores.filter(m => m.category === 'BUSY');
    
    // Calculate average score
    const avgScore = monthlyScores.reduce((sum, m) => sum + m.score, 0) / monthlyScores.length;
    
    // Find consecutive low-season months (best for savings)
    const lowSeasonPeriods = this.findConsecutivePeriods(lowSeasonMonths);
    
    // Find consecutive peak months (avoid for savings)
    const peakPeriods = this.findConsecutivePeriods(peakMonths);

    return {
      peakMonths: peakMonths.map(m => ({ month: m.month, score: m.score })),
      lowSeasonMonths: lowSeasonMonths.map(m => ({ month: m.month, score: m.score })),
      busyMonths: busyMonths.map(m => ({ month: m.month, score: m.score })),
      averageScore: avgScore.toFixed(2),
      seasonalityStrength: this.calculateSeasonalityStrength(monthlyScores),
      lowSeasonPeriods,
      peakPeriods,
      bestMonthForSavings: lowSeasonMonths.length > 0 
        ? lowSeasonMonths.reduce((min, m) => m.score < min.score ? m : min)
        : null,
      worstMonthForSavings: peakMonths.length > 0
        ? peakMonths.reduce((max, m) => m.score > max.score ? m : max)
        : null
    };
  }

  /**
   * Find consecutive periods of similar traffic
   */
  findConsecutivePeriods(months) {
    if (months.length === 0) return [];

    const periods = [];
    let currentPeriod = [months[0]];

    for (let i = 1; i < months.length; i++) {
      if (months[i].monthNumber === months[i-1].monthNumber + 1) {
        currentPeriod.push(months[i]);
      } else {
        if (currentPeriod.length >= 2) {
          periods.push({
            start: currentPeriod[0].month,
            end: currentPeriod[currentPeriod.length - 1].month,
            duration: currentPeriod.length,
            avgScore: (currentPeriod.reduce((sum, m) => sum + m.score, 0) / currentPeriod.length).toFixed(1)
          });
        }
        currentPeriod = [months[i]];
      }
    }

    if (currentPeriod.length >= 2) {
      periods.push({
        start: currentPeriod[0].month,
        end: currentPeriod[currentPeriod.length - 1].month,
        duration: currentPeriod.length,
        avgScore: (currentPeriod.reduce((sum, m) => sum + m.score, 0) / currentPeriod.length).toFixed(1)
      });
    }

    return periods;
  }

  /**
   * Calculate seasonality strength (0-1)
   */
  calculateSeasonalityStrength(monthlyScores) {
    const scores = monthlyScores.map(m => m.score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    
    // Normalize to 0-1 scale (assuming max std dev of 3)
    return Math.min(stdDev / 3, 1);
  }

  /**
   * Generate traffic-based recommendations
   */
  generateTrafficRecommendations(monthlyScores, patterns) {
    const recommendations = [];

    // Recommendation 1: Best months for savings
    if (patterns.bestMonthForSavings) {
      const bestMonth = patterns.bestMonthForSavings;
      const expectedSavings = ((1 - this.priceImpact.low) * 100).toFixed(0);
      
      recommendations.push({
        type: 'LOW_TRAFFIC_SAVINGS',
        priority: 'HIGH',
        title: `Book in ${bestMonth.month} for Maximum Savings`,
        description: `${bestMonth.month} has the lowest passenger traffic (score: ${bestMonth.score}/10). Expect ${expectedSavings}% lower hotel prices.`,
        month: bestMonth.month,
        trafficScore: bestMonth.score,
        expectedSavings: `${expectedSavings}%`,
        confidence: 0.85
      });
    }

    // Recommendation 2: Avoid peak months
    if (patterns.worstMonthForSavings) {
      const worstMonth = patterns.worstMonthForSavings;
      const priceIncrease = ((this.priceImpact.veryHigh - 1) * 100).toFixed(0);
      
      recommendations.push({
        type: 'AVOID_PEAK_TRAFFIC',
        priority: 'CRITICAL',
        title: `Avoid ${worstMonth.month} - Peak Season`,
        description: `${worstMonth.month} has the highest passenger traffic (score: ${worstMonth.score}/10). Expect ${priceIncrease}% higher prices.`,
        month: worstMonth.month,
        trafficScore: worstMonth.score,
        priceIncrease: `${priceIncrease}%`,
        confidence: 0.90
      });
    }

    // Recommendation 3: Extended low-season periods
    if (patterns.lowSeasonPeriods.length > 0) {
      const longestPeriod = patterns.lowSeasonPeriods.reduce((max, p) => 
        p.duration > max.duration ? p : max
      );
      
      recommendations.push({
        type: 'EXTENDED_LOW_SEASON',
        priority: 'MEDIUM',
        title: `Extended Savings Period: ${longestPeriod.start} - ${longestPeriod.end}`,
        description: `${longestPeriod.duration} consecutive months of low traffic. Ideal for flexible travelers.`,
        period: `${longestPeriod.start} - ${longestPeriod.end}`,
        duration: `${longestPeriod.duration} months`,
        avgTrafficScore: longestPeriod.avgScore,
        confidence: 0.80
      });
    }

    // Recommendation 4: Shoulder season opportunities
    const shoulderMonths = monthlyScores.filter(m => m.category === 'MODERATE');
    if (shoulderMonths.length > 0) {
      recommendations.push({
        type: 'SHOULDER_SEASON',
        priority: 'MEDIUM',
        title: 'Shoulder Season Balance',
        description: `${shoulderMonths.length} months with moderate traffic offer good balance of weather and pricing.`,
        months: shoulderMonths.map(m => m.month),
        confidence: 0.75
      });
    }

    return recommendations;
  }

  /**
   * Predict price impact based on traffic
   */
  predictPriceImpact(monthlyScores) {
    return monthlyScores.map(month => {
      let multiplier, impact, savingsOpportunity;

      switch (month.category) {
        case 'PEAK_SEASON':
          multiplier = this.priceImpact.veryHigh;
          impact = `+${((multiplier - 1) * 100).toFixed(0)}%`;
          savingsOpportunity = 'AVOID';
          break;
        case 'BUSY':
          multiplier = this.priceImpact.high;
          impact = `+${((multiplier - 1) * 100).toFixed(0)}%`;
          savingsOpportunity = 'LOW';
          break;
        case 'MODERATE':
          multiplier = this.priceImpact.moderate;
          impact = 'Normal';
          savingsOpportunity = 'MODERATE';
          break;
        case 'LOW_SEASON':
          multiplier = this.priceImpact.low;
          impact = `-${((1 - multiplier) * 100).toFixed(0)}%`;
          savingsOpportunity = 'HIGH';
          break;
      }

      return {
        month: month.month,
        monthNumber: month.monthNumber,
        trafficScore: month.score,
        category: month.category,
        priceMultiplier: multiplier,
        expectedPriceImpact: impact,
        savingsOpportunity,
        recommendation: this.getMonthRecommendation(month.category)
      };
    });
  }

  /**
   * Get recommendation text for a month
   */
  getMonthRecommendation(category) {
    const recommendations = {
      'PEAK_SEASON': 'Avoid if possible. Prices at annual high. Consider alternative months.',
      'BUSY': 'Expect elevated prices. Book early for best rates.',
      'MODERATE': 'Normal pricing. Good balance of value and availability.',
      'LOW_SEASON': 'Excellent savings opportunity. Best time to book for value.'
    };
    return recommendations[category];
  }

  /**
   * Get traffic score for a specific month
   * @param {number} month - Month number (1-12)
   * @param {string} year - Year in YYYY format
   * @returns {Object} Traffic data for that month
   */
  async getMonthTrafficScore(month, year = '2025') {
    const analysis = await this.analyzeTrafficPatterns(year);
    
    if (!analysis.success) {
      return { success: false, error: analysis.error };
    }

    const monthData = analysis.monthlyScores.find(m => m.monthNumber === month);
    
    if (!monthData) {
      return { 
        success: false, 
        error: 'No data available for this month' 
      };
    }

    const prediction = analysis.pricePredictions.find(p => p.monthNumber === month);

    return {
      success: true,
      month: monthData.month,
      trafficScore: monthData.score,
      category: monthData.category,
      priceImpact: prediction.expectedPriceImpact,
      savingsOpportunity: prediction.savingsOpportunity,
      recommendation: prediction.recommendation
    };
  }

  /**
   * Compare multiple months for optimal booking
   * @param {Array<number>} months - Array of month numbers to compare
   * @param {string} year - Year in YYYY format
   * @returns {Object} Comparison results
   */
  async compareMonths(months, year = '2025') {
    const analysis = await this.analyzeTrafficPatterns(year);
    
    if (!analysis.success) {
      return { success: false, error: analysis.error };
    }

    const comparisons = months.map(monthNum => {
      const monthData = analysis.monthlyScores.find(m => m.monthNumber === monthNum);
      const prediction = analysis.pricePredictions.find(p => p.monthNumber === monthNum);
      
      return {
        month: monthData.month,
        monthNumber: monthNum,
        trafficScore: monthData.score,
        category: monthData.category,
        priceImpact: prediction.expectedPriceImpact,
        savingsOpportunity: prediction.savingsOpportunity,
        rank: 0 // Will be calculated below
      };
    });

    // Rank by savings opportunity (lowest traffic = best)
    comparisons.sort((a, b) => a.trafficScore - b.trafficScore);
    comparisons.forEach((c, idx) => c.rank = idx + 1);

    const best = comparisons[0];
    const worst = comparisons[comparisons.length - 1];

    return {
      success: true,
      comparisons,
      bestMonth: {
        month: best.month,
        trafficScore: best.trafficScore,
        savingsOpportunity: best.savingsOpportunity,
        reason: `Lowest traffic among compared months`
      },
      worstMonth: {
        month: worst.month,
        trafficScore: worst.trafficScore,
        savingsOpportunity: worst.savingsOpportunity,
        reason: `Highest traffic among compared months`
      },
      potentialSavings: this.calculatePotentialSavings(best.trafficScore, worst.trafficScore)
    };
  }

  /**
   * Calculate potential savings between two months
   */
  calculatePotentialSavings(lowScore, highScore) {
    const lowMultiplier = this.getMultiplierForScore(lowScore);
    const highMultiplier = this.getMultiplierForScore(highScore);
    
    const savingsPercent = ((highMultiplier - lowMultiplier) / highMultiplier * 100).toFixed(0);
    
    return {
      percentage: `${savingsPercent}%`,
      description: `Booking in the low-traffic month could save approximately ${savingsPercent}% compared to the high-traffic month`
    };
  }

  /**
   * Get price multiplier for a traffic score
   */
  getMultiplierForScore(score) {
    if (score >= this.thresholds.veryHigh) return this.priceImpact.veryHigh;
    if (score >= this.thresholds.high) return this.priceImpact.high;
    if (score >= this.thresholds.moderate) return this.priceImpact.moderate;
    return this.priceImpact.low;
  }
}

module.exports = FlightTrafficAnalyzer;
