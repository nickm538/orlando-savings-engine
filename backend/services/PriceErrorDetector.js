/**
 * Advanced Price Error Detection System
 * 
 * Detects pricing anomalies and errors in real-time using:
 * - Statistical outlier detection (Z-score, IQR)
 * - Machine learning anomaly detection
 * - Historical price comparison
 * - Competitive pricing analysis
 * - Pattern recognition for "too good to be true" deals
 * 
 * These errors are often corrected within hours, so speed is critical.
 */

class PriceErrorDetector {
  constructor() {
    // Historical price database (in production, use real database)
    this.priceHistory = new Map();
    
    // Anomaly detection thresholds
    this.config = {
      zScoreThreshold: 2.5,        // Standard deviations from mean
      iqrMultiplier: 1.5,           // IQR multiplier for outliers
      minDiscountForError: 40,      // Minimum % discount to flag as potential error
      maxPriceDropPercent: 60,      // Maximum realistic price drop %
      confidenceThreshold: 0.85,    // Minimum confidence to flag as error
      historicalWindowDays: 90      // Days of history to analyze
    };
  }

  /**
   * Detect if a price is likely an error
   * @param {Object} offer - The price offer to analyze
   * @param {Array} competitorPrices - Array of competitor prices
   * @param {Array} historicalPrices - Historical prices for this property
   * @returns {Object} Detection result with confidence score
   */
  detectPriceError(offer, competitorPrices = [], historicalPrices = []) {
    const analyses = [];
    let totalConfidence = 0;
    let errorFlags = [];

    // 1. Z-Score Analysis (Statistical Outlier Detection)
    if (competitorPrices.length >= 3) {
      const zScoreResult = this.zScoreAnalysis(offer.price, competitorPrices);
      analyses.push(zScoreResult);
      totalConfidence += zScoreResult.confidence * 0.25;
      
      if (zScoreResult.isOutlier) {
        errorFlags.push({
          type: 'STATISTICAL_OUTLIER',
          severity: zScoreResult.severity,
          message: `Price is ${Math.abs(zScoreResult.zScore).toFixed(2)} standard deviations below market average`,
          potentialSavings: zScoreResult.potentialSavings
        });
      }
    }

    // 2. IQR (Interquartile Range) Analysis
    if (competitorPrices.length >= 5) {
      const iqrResult = this.iqrAnalysis(offer.price, competitorPrices);
      analyses.push(iqrResult);
      totalConfidence += iqrResult.confidence * 0.20;
      
      if (iqrResult.isOutlier) {
        errorFlags.push({
          type: 'IQR_OUTLIER',
          severity: iqrResult.severity,
          message: `Price is ${iqrResult.distanceFromQ1.toFixed(0)}% below lower quartile`,
          potentialSavings: iqrResult.potentialSavings
        });
      }
    }

    // 3. Historical Price Comparison
    if (historicalPrices.length >= 10) {
      const historicalResult = this.historicalAnalysis(offer.price, historicalPrices);
      analyses.push(historicalResult);
      totalConfidence += historicalResult.confidence * 0.30;
      
      if (historicalResult.isAnomaly) {
        errorFlags.push({
          type: 'HISTORICAL_ANOMALY',
          severity: historicalResult.severity,
          message: `Price is ${historicalResult.percentBelow.toFixed(0)}% below historical average`,
          potentialSavings: historicalResult.potentialSavings,
          historicalLow: historicalResult.historicalLow,
          historicalAvg: historicalResult.historicalAvg
        });
      }
    }

    // 4. Extreme Discount Detection
    if (offer.originalPrice && offer.price) {
      const discountResult = this.extremeDiscountAnalysis(offer.price, offer.originalPrice);
      analyses.push(discountResult);
      totalConfidence += discountResult.confidence * 0.15;
      
      if (discountResult.isSuspicious) {
        errorFlags.push({
          type: 'EXTREME_DISCOUNT',
          severity: discountResult.severity,
          message: `Discount of ${discountResult.discountPercent.toFixed(0)}% is unusually high`,
          potentialSavings: discountResult.savings
        });
      }
    }

    // 5. Pattern Recognition (Common Error Patterns)
    const patternResult = this.patternRecognition(offer);
    analyses.push(patternResult);
    totalConfidence += patternResult.confidence * 0.10;
    
    if (patternResult.matchedPatterns.length > 0) {
      errorFlags.push({
        type: 'ERROR_PATTERN',
        severity: patternResult.severity,
        message: `Matches known error patterns: ${patternResult.matchedPatterns.join(', ')}`,
        patterns: patternResult.matchedPatterns
      });
    }

    // Calculate final confidence score
    const finalConfidence = Math.min(totalConfidence, 1.0);
    const isPriceError = finalConfidence >= this.config.confidenceThreshold;

    // Calculate potential savings
    const marketAverage = competitorPrices.length > 0 
      ? competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length 
      : null;
    
    const potentialSavings = marketAverage 
      ? marketAverage - offer.price 
      : (offer.originalPrice ? offer.originalPrice - offer.price : 0);

    return {
      isPriceError,
      confidence: finalConfidence,
      severity: this.calculateSeverity(finalConfidence, potentialSavings),
      errorFlags,
      analyses,
      potentialSavings,
      marketAverage,
      recommendation: this.generateRecommendation(isPriceError, finalConfidence, potentialSavings),
      urgency: this.calculateUrgency(isPriceError, finalConfidence),
      metadata: {
        offer: {
          name: offer.name,
          price: offer.price,
          originalPrice: offer.originalPrice
        },
        analysisTimestamp: new Date().toISOString(),
        competitorCount: competitorPrices.length,
        historicalDataPoints: historicalPrices.length
      }
    };
  }

  /**
   * Z-Score statistical analysis
   */
  zScoreAnalysis(price, prices) {
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    const zScore = (price - mean) / stdDev;
    
    const isOutlier = zScore < -this.config.zScoreThreshold;
    const severity = Math.abs(zScore) > 3 ? 'CRITICAL' : Math.abs(zScore) > 2.5 ? 'HIGH' : 'MEDIUM';
    
    return {
      method: 'Z-Score',
      zScore,
      mean,
      stdDev,
      isOutlier,
      severity,
      confidence: isOutlier ? Math.min(Math.abs(zScore) / 5, 1.0) : 0,
      potentialSavings: mean - price
    };
  }

  /**
   * IQR (Interquartile Range) analysis
   */
  iqrAnalysis(price, prices) {
    const sorted = [...prices].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;
    const lowerBound = q1 - (this.config.iqrMultiplier * iqr);
    
    const isOutlier = price < lowerBound;
    const distanceFromQ1 = ((q1 - price) / q1) * 100;
    const severity = distanceFromQ1 > 50 ? 'CRITICAL' : distanceFromQ1 > 30 ? 'HIGH' : 'MEDIUM';
    
    return {
      method: 'IQR',
      q1,
      q3,
      iqr,
      lowerBound,
      isOutlier,
      distanceFromQ1,
      severity,
      confidence: isOutlier ? Math.min(distanceFromQ1 / 100, 1.0) : 0,
      potentialSavings: q1 - price
    };
  }

  /**
   * Historical price analysis
   */
  historicalAnalysis(price, historicalPrices) {
    const avg = historicalPrices.reduce((a, b) => a + b, 0) / historicalPrices.length;
    const min = Math.min(...historicalPrices);
    const max = Math.max(...historicalPrices);
    const percentBelow = ((avg - price) / avg) * 100;
    
    const isAnomaly = percentBelow > this.config.minDiscountForError;
    const severity = percentBelow > 60 ? 'CRITICAL' : percentBelow > 45 ? 'HIGH' : 'MEDIUM';
    
    return {
      method: 'Historical',
      historicalAvg: avg,
      historicalLow: min,
      historicalHigh: max,
      percentBelow,
      isAnomaly,
      severity,
      confidence: isAnomaly ? Math.min(percentBelow / 100, 1.0) : 0,
      potentialSavings: avg - price
    };
  }

  /**
   * Extreme discount analysis
   */
  extremeDiscountAnalysis(price, originalPrice) {
    const discount = originalPrice - price;
    const discountPercent = (discount / originalPrice) * 100;
    
    const isSuspicious = discountPercent > this.config.minDiscountForError;
    const severity = discountPercent > 70 ? 'CRITICAL' : discountPercent > 55 ? 'HIGH' : 'MEDIUM';
    
    return {
      method: 'Discount',
      originalPrice,
      currentPrice: price,
      discount,
      discountPercent,
      isSuspicious,
      severity,
      confidence: isSuspicious ? Math.min(discountPercent / 100, 1.0) : 0,
      savings: discount
    };
  }

  /**
   * Pattern recognition for common pricing errors
   */
  patternRecognition(offer) {
    const matchedPatterns = [];
    let confidence = 0;

    // Pattern 1: Round number errors (e.g., $10, $50, $100 for luxury hotels)
    if (offer.price % 10 === 0 && offer.price < 100 && offer.rating >= 4) {
      matchedPatterns.push('ROUND_NUMBER_LUXURY');
      confidence += 0.3;
    }

    // Pattern 2: Decimal errors (e.g., $12.99 instead of $129.99)
    if (offer.originalPrice && offer.price < offer.originalPrice / 10) {
      matchedPatterns.push('DECIMAL_POINT_ERROR');
      confidence += 0.5;
    }

    // Pattern 3: Missing digit (e.g., $19 instead of $199)
    if (offer.price < 50 && offer.class >= 4) {
      matchedPatterns.push('MISSING_DIGIT');
      confidence += 0.4;
    }

    // Pattern 4: Currency conversion error
    const possibleConversions = [0.01, 100, 0.1];
    for (const multiplier of possibleConversions) {
      const converted = offer.price * multiplier;
      if (offer.originalPrice && Math.abs(converted - offer.originalPrice) < 10) {
        matchedPatterns.push('CURRENCY_CONVERSION_ERROR');
        confidence += 0.6;
        break;
      }
    }

    const severity = confidence > 0.5 ? 'CRITICAL' : confidence > 0.3 ? 'HIGH' : 'MEDIUM';

    return {
      method: 'Pattern Recognition',
      matchedPatterns,
      confidence: Math.min(confidence, 1.0),
      severity
    };
  }

  /**
   * Calculate overall severity
   */
  calculateSeverity(confidence, savings) {
    if (confidence >= 0.9 && savings > 200) return 'CRITICAL';
    if (confidence >= 0.85 && savings > 100) return 'HIGH';
    if (confidence >= 0.7) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Generate actionable recommendation
   */
  generateRecommendation(isPriceError, confidence, savings) {
    if (!isPriceError) {
      return 'Price appears normal. Continue monitoring.';
    }

    if (confidence >= 0.95) {
      return `🚨 CRITICAL: Book immediately! ${(confidence * 100).toFixed(0)}% confidence this is a pricing error. Potential savings: $${savings.toFixed(2)}. These errors are typically corrected within hours.`;
    }

    if (confidence >= 0.85) {
      return `⚠️ HIGH PRIORITY: Strong indication of pricing error (${(confidence * 100).toFixed(0)}% confidence). Book now before correction. Estimated savings: $${savings.toFixed(2)}.`;
    }

    return `📊 MONITOR: Possible pricing anomaly (${(confidence * 100).toFixed(0)}% confidence). Consider booking soon. Potential savings: $${savings.toFixed(2)}.`;
  }

  /**
   * Calculate urgency level
   */
  calculateUrgency(isPriceError, confidence) {
    if (!isPriceError) return 'NONE';
    if (confidence >= 0.95) return 'IMMEDIATE';
    if (confidence >= 0.85) return 'HIGH';
    if (confidence >= 0.70) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Batch analyze multiple offers
   */
  batchAnalyze(offers, historicalData = {}) {
    const results = [];
    const pricesByType = {};

    // Group prices by property type for better comparison
    offers.forEach(offer => {
      const type = offer.propertyType || 'hotel';
      if (!pricesByType[type]) pricesByType[type] = [];
      pricesByType[type].push(offer.price);
    });

    // Analyze each offer
    offers.forEach(offer => {
      const type = offer.propertyType || 'hotel';
      const competitorPrices = pricesByType[type].filter(p => p !== offer.price);
      const historical = historicalData[offer.id] || [];
      
      const analysis = this.detectPriceError(offer, competitorPrices, historical);
      
      if (analysis.isPriceError) {
        results.push({
          ...analysis,
          offer
        });
      }
    });

    // Sort by confidence and savings
    results.sort((a, b) => {
      const scoreA = a.confidence * 0.6 + (a.potentialSavings / 500) * 0.4;
      const scoreB = b.confidence * 0.6 + (b.potentialSavings / 500) * 0.4;
      return scoreB - scoreA;
    });

    return {
      totalAnalyzed: offers.length,
      errorsDetected: results.length,
      criticalErrors: results.filter(r => r.severity === 'CRITICAL').length,
      highPriorityErrors: results.filter(r => r.severity === 'HIGH').length,
      totalPotentialSavings: results.reduce((sum, r) => sum + r.potentialSavings, 0),
      errors: results,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = PriceErrorDetector;
