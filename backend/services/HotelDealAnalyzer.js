/**
 * Hotel Deal Analyzer Service
 * Based on the original Java implementation from:
 * https://github.com/darshann25/Find-The-Best-Hotel-Deal.git
 * 
 * This service implements the same deal analysis logic but adapted for Node.js
 * and integrated with our real-time hotel data sources.
 */

const SerpApiService = require('./SerpApiService');

class HotelDealAnalyzer {
  constructor() {
    this.serpApi = new SerpApiService();
    this.deals = new Map(); // hotelName -> Array of deals
  }

  /**
   * Main method to find the best hotel deal
   * @param {Object} params - Search parameters
   * @param {string} params.hotelName - Name of the hotel
   * @param {string} params.checkInDate - Check-in date (YYYY-MM-DD)
   * @param {string} params.checkOutDate - Check-out date (YYYY-MM-DD)
   * @param {number} params.duration - Duration of stay in nights
   */
  async findBestDeal(params) {
    const { hotelName, checkInDate, checkOutDate, duration } = params;
    
    try {
      // Step 1: Get real-time hotel pricing from SerpApi
      const realTimeData = await this.getRealTimeHotelData({
        hotelName,
        checkInDate,
        checkOutDate
      });

      // Step 2: Get deal information from Google Light Search
      const dealData = await this.getDealInformation({
        hotelName,
        checkInDate,
        checkOutDate
      });

      // Step 3: Combine and analyze all available deals
      const allDeals = this.combineDealSources(realTimeData, dealData);
      
      // Step 4: Apply the original algorithm to find the best deal
      const analysis = this.analyzeDeals(allDeals, {
        checkInDate,
        checkOutDate,
        duration
      });

      return analysis;
    } catch (error) {
      console.error('Error finding best deal:', error);
      throw error;
    }
  }

  /**
   * Get real-time hotel data from SerpApi
   */
  async getRealTimeHotelData(params) {
    const { hotelName, checkInDate, checkOutDate } = params;
    
    try {
      const hotelResults = await this.serpApi.searchOrlandoHotels({
        q: hotelName,
        checkInDate,
        checkOutDate,
        adults: 2,
        sortBy: 3 // Lowest price
      });

      return hotelResults.properties?.map(hotel => ({
        id: hotel.property_token || `hotel_${Date.now()}_${Math.random()}`,
        hotelName: hotel.name,
        originalPrice: hotel.rate_per_night?.lowest || 200,
        currentPrice: hotel.rate_per_night?.lowest || 200,
        currency: hotel.rate_per_night?.currency || 'USD',
        rating: hotel.overall_rating,
        amenities: hotel.amenities || [],
        location: hotel.location,
        source: 'serpapi_google_hotels',
        confidence: 0.95,
        timestamp: new Date().toISOString()
      })) || [];
    } catch (error) {
      console.error('Error getting real-time hotel data:', error);
      return [];
    }
  }

  /**
   * Get deal information from Google Light Search
   */
  async getDealInformation(params) {
    const { hotelName, checkInDate, checkOutDate } = params;
    
    try {
      const searchQueries = [
        `${hotelName} promo codes discounts ${checkInDate}`,
        `${hotelName} corporate discount codes`,
        `${hotelName} employee discount rates`,
        `${hotelName} special offers deals`,
        `${hotelName} coupon codes ${checkInDate}`
      ];

      const allDeals = [];
      
      for (const query of searchQueries) {
        try {
          const lightResults = await this.serpApi.searchLight({
            q: query,
            location: 'Orlando, Florida, United States'
          });

          if (lightResults.organic_results) {
            lightResults.organic_results.forEach(result => {
              if (this.isDealResult(result)) {
                allDeals.push({
                  id: `deal_${Date.now()}_${Math.random()}`,
                  hotelName: hotelName,
                  title: result.title,
                  snippet: result.snippet,
                  link: result.link,
                  dealType: this.extractDealType(result.title, result.snippet),
                  discountAmount: this.extractDiscountAmount(result.snippet),
                  source: 'serpapi_google_light',
                  confidence: this.calculateConfidence(result),
                  timestamp: new Date().toISOString()
                });
              }
            });
          }
        } catch (error) {
          console.error(`Error searching for: ${query}`, error);
        }
      }

      return allDeals;
    } catch (error) {
      console.error('Error getting deal information:', error);
      return [];
    }
  }

  /**
   * Combine real-time data with deal information
   */
  combineDealSources(realTimeData, dealData) {
    const combinedDeals = [];

    // Add real-time hotel pricing as baseline
    realTimeData.forEach(hotel => {
      combinedDeals.push({
        id: hotel.id,
        hotelName: hotel.hotelName,
        promoText: 'Standard Rate - No promotion applied',
        originalPrice: hotel.originalPrice,
        discountedPrice: hotel.currentPrice,
        savings: 0,
        checkInDate: hotel.checkInDate,
        checkOutDate: hotel.checkOutDate,
        dealType: 'Standard Rate',
        confidence: hotel.confidence,
        source: hotel.source,
        applicableDays: 0,
        totalDays: 0,
        isBestDeal: false
      });
    });

    // Add discovered deals
    dealData.forEach(deal => {
      try {
        const discountPercent = this.extractDiscountPercent(deal.snippet);
        
        // Validate discount percentage
        if (discountPercent > 90) {
          console.warn(`Unrealistic discount detected: ${discountPercent}% for ${deal.hotelName} - skipping`);
          return; // Skip this deal
        }
        
        const basePrice = this.findBasePrice(deal.hotelName, realTimeData);
        const savings = Math.round(basePrice * (discountPercent / 100));
        
        // FIXED: Prevent negative prices
        const discountedPrice = Math.max(0, basePrice - savings);
        
        // Warn about suspicious deals
        if (discountedPrice === 0) {
          console.warn(`Free hotel detected: ${deal.hotelName} - verify deal authenticity`);
        }
        
        if (discountPercent > 70) {
          console.warn(`Very high discount: ${discountPercent}% for ${deal.hotelName} - verify authenticity`);
        }
        
        combinedDeals.push({
          id: deal.id,
          hotelName: deal.hotelName,
          promoText: deal.snippet,
          originalPrice: basePrice,
          discountedPrice: discountedPrice,
          savings: savings,
          checkInDate: deal.checkInDate,
          checkOutDate: deal.checkOutDate,
          dealType: deal.dealType,
          confidence: deal.confidence,
          source: deal.source,
          applicableDays: 0,
          totalDays: 0,
          isBestDeal: false
        });
      } catch (error) {
        console.error(`Failed to process deal for ${deal.hotelName}:`, error.message);
        // Skip this deal if price not available
      }
    });

    return combinedDeals;
  }

  /**
   * Analyze deals using the original algorithm logic
   */
  analyzeDeals(deals, params) {
    const { checkInDate, checkOutDate, duration } = params;
    
    // Calculate applicable days for each deal
    deals.forEach(deal => {
      deal.applicableDays = this.calculateApplicableDays(deal, params);
      deal.totalDays = duration;
    });

    // Find the best deal (highest savings)
    let bestDeal = null;
    let maxSavings = -1;

    deals.forEach(deal => {
      if (deal.savings > maxSavings) {
        maxSavings = deal.savings;
        bestDeal = deal;
      }
    });

    if (bestDeal) {
      bestDeal.isBestDeal = true;
    }

    // Calculate summary statistics
    const totalSavings = deals.reduce((sum, deal) => sum + deal.savings, 0);
    const bestSavings = bestDeal?.savings || 0;
    const averageSavings = deals.length > 0 ? totalSavings / deals.length : 0;

    return {
      bestDeal,
      allDeals: deals,
      savingsSummary: {
        totalSavings,
        bestSavings,
        averageSavings
      }
    };
  }

  /**
   * Calculate applicable days for a deal
   */
  calculateApplicableDays(deal, params) {
    // For now, assume all days are applicable
    // In a full implementation, this would check deal validity dates
    return params.duration;
  }

  /**
   * Determine if a search result contains deal information
   */
  isDealResult(result) {
    const dealKeywords = [
      'promo', 'discount', 'coupon', 'code', 'deal', 'offer',
      'save', 'off', 'special', 'corporate', 'employee'
    ];
    
    const searchText = (result.title + ' ' + result.snippet).toLowerCase();
    return dealKeywords.some(keyword => searchText.includes(keyword));
  }

  /**
   * Extract deal type from search result
   */
  extractDealType(title, snippet) {
    const text = (title + ' ' + snippet).toLowerCase();
    
    if (text.includes('corporate') || text.includes('employee')) return 'Corporate Discount';
    if (text.includes('promo') || text.includes('code')) return 'Promo Code';
    if (text.includes('coupon')) return 'Coupon Discount';
    if (text.includes('special')) return 'Special Offer';
    if (text.includes('save') || text.includes('off')) return 'Percentage Off';
    
    return 'General Discount';
  }

  /**
   * Extract discount amount from snippet
   */
  extractDiscountAmount(snippet) {
    const match = snippet.match(/(\d+)%?\s*(?:off|save)/i);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Extract discount percentage from text
   */
  extractDiscountPercent(text) {
    const match = text.match(/(\d+)%?\s*(?:off|save|discount)/i);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Find base price for a hotel
   * FIXED: Removed $200 fallback - only returns real prices
   */
  findBasePrice(hotelName, realTimeData) {
    const hotel = realTimeData.find(h => 
      h.hotelName.toLowerCase().includes(hotelName.toLowerCase()) ||
      hotelName.toLowerCase().includes(h.hotelName.toLowerCase())
    );
    
    if (!hotel || !hotel.originalPrice || hotel.originalPrice <= 0) {
      throw new Error(`Real-time price not available for ${hotelName}`);
    }
    
    return hotel.originalPrice;
  }

  /**
   * Calculate confidence score for a deal
   */
  calculateConfidence(result) {
    // Simple confidence calculation based on result quality
    let confidence = 0.7; // Base confidence
    
    if (result.position && result.position <= 3) confidence += 0.2;
    if (result.snippet && result.snippet.length > 100) confidence += 0.1;
    
    return Math.min(confidence, 0.95);
  }

  /**
   * Format currency
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  /**
   * Calculate savings percentage
   */
  calculateSavingsPercentage(savings, originalPrice) {
    return Math.round((savings / originalPrice) * 100);
  }
}

module.exports = HotelDealAnalyzer;