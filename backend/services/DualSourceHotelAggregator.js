/**
 * Dual-Source Hotel Aggregation System
 * 
 * Combines data from multiple sources to provide comprehensive hotel search:
 * 1. SerpAPI - Consumer-facing deals from Google Hotels
 * 2. Amadeus - Professional GDS rates, corporate discounts, negotiated rates
 * 
 * This dual-source approach uncovers deals that even seasoned travel agents miss
 * by accessing both consumer and professional travel channels simultaneously.
 * 
 * Key Features:
 * - Deduplication of hotels across sources
 * - Price comparison and best rate selection
 * - Confidence scoring based on multiple data points
 * - Exclusive rate identification
 * - Savings calculation across sources
 */

const SerpApiService = require('./SerpApiService');
const AmadeusHotelService = require('./AmadeusHotelService');
const PriceErrorDetector = require('./PriceErrorDetector');

class DualSourceHotelAggregator {
  constructor() {
    this.serpApi = new SerpApiService();
    this.amadeusApi = new AmadeusHotelService();
    this.priceErrorDetector = new PriceErrorDetector();
  }

  /**
   * Search hotels from both sources simultaneously
   */
  async searchHotels(params) {
    const {
      location = 'Orlando, FL',
      checkInDate,
      checkOutDate,
      adults = 2,
      rooms = 1,
      currency = 'USD'
    } = params;

    // Search both sources in parallel
    const [serpResults, amadeusResults] = await Promise.allSettled([
      this.searchSerpAPI(location, checkInDate, checkOutDate, adults),
      this.searchAmadeus(checkInDate, checkOutDate, adults, rooms, currency)
    ]);

    // Extract successful results
    const serpHotels = serpResults.status === 'fulfilled' ? serpResults.value : [];
    const amadeusHotels = amadeusResults.status === 'fulfilled' ? amadeusResults.value : [];

    console.log(`Found ${serpHotels.length} hotels from SerpAPI, ${amadeusHotels.length} from Amadeus`);

    // Merge and deduplicate
    const mergedHotels = this.mergeHotels(serpHotels, amadeusHotels);

    // Detect price errors across all hotels
    const hotelsWithErrors = this.priceErrorDetector.batchAnalyze(mergedHotels);

    // Rank hotels by savings potential
    const rankedHotels = this.rankHotelsBySavings(hotelsWithErrors);

    return {
      hotels: rankedHotels,
      summary: {
        totalHotels: rankedHotels.length,
        serpApiCount: serpHotels.length,
        amadeusCount: amadeusHotels.length,
        priceErrorsFound: hotelsWithErrors.filter(h => h.priceError).length,
        exclusiveRates: rankedHotels.filter(h => h.exclusiveToSource).length,
        averageSavings: this.calculateAverageSavings(rankedHotels),
        bestDeal: rankedHotels[0] || null
      },
      searchParams: params,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Search SerpAPI (Google Hotels)
   */
  async searchSerpAPI(location, checkIn, checkOut, adults) {
    try {
      const results = await this.serpApi.searchHotels({
        q: location,
        check_in_date: checkIn,
        check_out_date: checkOut,
        adults: adults.toString(),
        currency: 'USD',
        gl: 'us',
        hl: 'en'
      });

      return results.properties?.map(hotel => ({
        source: 'serpapi',
        hotelName: hotel.name,
        price: hotel.rate_per_night?.lowest || hotel.total_rate?.lowest,
        currency: 'USD',
        rating: hotel.overall_rating,
        reviews: hotel.reviews,
        amenities: hotel.amenities,
        location: {
          address: hotel.link,
          gpsCoordinates: hotel.gps_coordinates
        },
        images: hotel.images,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        link: hotel.link,
        rawData: hotel
      })) || [];
    } catch (error) {
      console.error('SerpAPI search failed:', error.message);
      return [];
    }
  }

  /**
   * Search Amadeus (GDS)
   */
  async searchAmadeus(checkIn, checkOut, adults, rooms, currency) {
    try {
      const results = await this.amadeusApi.searchOrlandoHotels({
        checkInDate: checkIn,
        checkOutDate: checkOut,
        adults,
        roomQuantity: rooms,
        currency,
        bestRateOnly: false, // Get all rates to find best deals
        countryOfResidence: 'US'
      });

      return results.map(hotel => ({
        ...hotel,
        price: hotel.totalPrice,
        rating: null, // Amadeus doesn't provide ratings
        reviews: null,
        amenities: [],
        images: [],
        link: hotel.offerUrl
      }));
    } catch (error) {
      console.error('Amadeus search failed:', error.message);
      return [];
    }
  }

  /**
   * Merge hotels from both sources and deduplicate
   */
  mergeHotels(serpHotels, amadeusHotels) {
    const hotelMap = new Map();

    // Add SerpAPI hotels
    serpHotels.forEach(hotel => {
      const key = this.generateHotelKey(hotel.hotelName, hotel.location);
      hotelMap.set(key, {
        ...hotel,
        sources: ['serpapi'],
        serpApiData: hotel,
        amadeusData: null
      });
    });

    // Add or merge Amadeus hotels
    amadeusHotels.forEach(hotel => {
      const key = this.generateHotelKey(hotel.hotelName, hotel.location);
      
      if (hotelMap.has(key)) {
        // Hotel exists in both sources - merge data
        const existing = hotelMap.get(key);
        hotelMap.set(key, {
          ...existing,
          sources: ['serpapi', 'amadeus'],
          amadeusData: hotel,
          // Use best price from either source
          bestPrice: Math.min(existing.price || Infinity, hotel.price || Infinity),
          priceComparison: {
            serpApiPrice: existing.price,
            amadeusPrice: hotel.price,
            savings: Math.abs((existing.price || 0) - (hotel.price || 0)),
            betterSource: (existing.price || Infinity) < (hotel.price || Infinity) ? 'serpapi' : 'amadeus'
          }
        });
      } else {
        // Hotel only in Amadeus
        hotelMap.set(key, {
          ...hotel,
          sources: ['amadeus'],
          serpApiData: null,
          amadeusData: hotel,
          exclusiveToSource: 'amadeus'
        });
      }
    });

    return Array.from(hotelMap.values());
  }

  /**
   * Generate unique hotel key for deduplication
   */
  generateHotelKey(name, location) {
    // Normalize hotel name for matching
    const normalizedName = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20); // First 20 chars

    // Use location if available
    const locationKey = location?.latitude && location?.longitude
      ? `${Math.round(location.latitude * 100)}_${Math.round(location.longitude * 100)}`
      : 'unknown';

    return `${normalizedName}_${locationKey}`;
  }

  /**
   * Rank hotels by savings potential
   */
  rankHotelsBySavings(hotels) {
    return hotels
      .map(hotel => {
        // Calculate comprehensive savings score
        const savingsScore = this.calculateSavingsScore(hotel);
        
        return {
          ...hotel,
          savingsScore,
          savingsRank: 0 // Will be set after sorting
        };
      })
      .sort((a, b) => b.savingsScore - a.savingsScore)
      .map((hotel, index) => ({
        ...hotel,
        savingsRank: index + 1
      }));
  }

  /**
   * Calculate comprehensive savings score (0-100)
   */
  calculateSavingsScore(hotel) {
    let score = 0;

    // 1. Price error detection (40 points)
    if (hotel.priceError) {
      const errorSeverity = hotel.priceError.severity;
      if (errorSeverity === 'CRITICAL') score += 40;
      else if (errorSeverity === 'HIGH') score += 30;
      else if (errorSeverity === 'MEDIUM') score += 20;
    }

    // 2. Amadeus exclusive rates (25 points)
    if (hotel.source === 'amadeus') {
      const rateType = hotel.rateType;
      if (rateType === 'promotional') score += 25;
      else if (rateType === 'corporate') score += 20;
      else if (rateType === 'government') score += 15;
      else score += 10;
    }

    // 3. Multi-source price comparison (20 points)
    if (hotel.priceComparison) {
      const savings = hotel.priceComparison.savings;
      const savingsPercent = (savings / Math.max(hotel.priceComparison.serpApiPrice, hotel.priceComparison.amadeusPrice)) * 100;
      
      if (savingsPercent > 30) score += 20;
      else if (savingsPercent > 20) score += 15;
      else if (savingsPercent > 10) score += 10;
      else if (savingsPercent > 5) score += 5;
    }

    // 4. Confidence score (10 points)
    const confidence = hotel.confidence || 70;
    score += (confidence / 100) * 10;

    // 5. Cancellation flexibility (5 points)
    if (hotel.cancellationDeadline || hotel.amadeusData?.cancellationDeadline) {
      score += 5;
    }

    return Math.min(Math.round(score), 100);
  }

  /**
   * Calculate average savings across all hotels
   */
  calculateAverageSavings(hotels) {
    if (hotels.length === 0) return 0;

    const totalSavings = hotels.reduce((sum, hotel) => {
      if (hotel.priceComparison) {
        return sum + hotel.priceComparison.savings;
      }
      if (hotel.priceError) {
        return sum + (hotel.priceError.potentialSavings || 0);
      }
      return sum;
    }, 0);

    return Math.round(totalSavings / hotels.length * 100) / 100;
  }

  /**
   * Get exclusive Amadeus rates (not available on consumer sites)
   */
  async getExclusiveRates(params) {
    const amadeusResults = await this.searchAmadeus(
      params.checkInDate,
      params.checkOutDate,
      params.adults || 2,
      params.rooms || 1,
      params.currency || 'USD'
    );

    // Filter for promotional, corporate, and government rates
    return amadeusResults.filter(hotel => 
      hotel.rateType === 'promotional' ||
      hotel.rateType === 'corporate' ||
      hotel.rateType === 'government'
    ).map(hotel => ({
      ...hotel,
      exclusiveReason: `${hotel.rateFamily} rate - Not available on consumer booking sites`,
      savingsPotential: hotel.savingsPotential
    }));
  }

  /**
   * Find price errors across all sources
   */
  async findPriceErrors(params) {
    const results = await this.searchHotels(params);
    
    return results.hotels
      .filter(hotel => hotel.priceError)
      .sort((a, b) => b.priceError.confidence - a.priceError.confidence)
      .map(hotel => ({
        hotelName: hotel.hotelName,
        price: hotel.price,
        priceError: hotel.priceError,
        source: hotel.source,
        sources: hotel.sources,
        link: hotel.link,
        checkInDate: hotel.checkInDate,
        checkOutDate: hotel.checkOutDate
      }));
  }

  /**
   * Compare specific hotel across sources
   */
  async compareHotel(hotelName, params) {
    const results = await this.searchHotels(params);
    
    const matchingHotels = results.hotels.filter(hotel =>
      hotel.hotelName.toLowerCase().includes(hotelName.toLowerCase()) ||
      hotelName.toLowerCase().includes(hotel.hotelName.toLowerCase())
    );

    if (matchingHotels.length === 0) {
      return null;
    }

    // Return best match with full comparison
    const bestMatch = matchingHotels[0];
    
    return {
      hotel: bestMatch,
      comparison: {
        availableOn: bestMatch.sources,
        serpApiPrice: bestMatch.serpApiData?.price,
        amadeusPrice: bestMatch.amadeusData?.price,
        bestPrice: bestMatch.bestPrice || bestMatch.price,
        savings: bestMatch.priceComparison?.savings || 0,
        savingsPercent: bestMatch.priceComparison?.savings ? 
          Math.round((bestMatch.priceComparison.savings / Math.max(bestMatch.priceComparison.serpApiPrice, bestMatch.priceComparison.amadeusPrice)) * 100) : 0,
        recommendation: this.generateRecommendation(bestMatch)
      }
    };
  }

  /**
   * Generate booking recommendation
   */
  generateRecommendation(hotel) {
    const recommendations = [];

    // Price error recommendation
    if (hotel.priceError && hotel.priceError.severity === 'CRITICAL') {
      recommendations.push({
        priority: 'URGENT',
        message: `🚨 PRICE ERROR DETECTED! Book immediately - this rate may be corrected soon. Potential savings: $${hotel.priceError.potentialSavings}`,
        confidence: hotel.priceError.confidence
      });
    }

    // Exclusive rate recommendation
    if (hotel.exclusiveToSource === 'amadeus') {
      recommendations.push({
        priority: 'HIGH',
        message: `💎 Exclusive ${hotel.rateFamily} rate - Not available on consumer sites. ${hotel.rateDescription}`,
        confidence: hotel.confidence
      });
    }

    // Multi-source comparison recommendation
    if (hotel.priceComparison && hotel.priceComparison.savings > 50) {
      recommendations.push({
        priority: 'HIGH',
        message: `💰 Save $${hotel.priceComparison.savings} by booking through ${hotel.priceComparison.betterSource} instead of ${hotel.priceComparison.betterSource === 'serpapi' ? 'amadeus' : 'serpapi'}`,
        confidence: 90
      });
    }

    // Cancellation policy recommendation
    if (hotel.cancellationDeadline) {
      const deadline = new Date(hotel.cancellationDeadline);
      const now = new Date();
      const hoursUntilDeadline = (deadline - now) / (1000 * 60 * 60);
      
      if (hoursUntilDeadline > 24) {
        recommendations.push({
          priority: 'MEDIUM',
          message: `✅ Free cancellation until ${deadline.toLocaleDateString()} - Book risk-free!`,
          confidence: 95
        });
      }
    }

    // Default recommendation
    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'MEDIUM',
        message: `Good deal at $${hotel.price} per night. Confidence: ${hotel.confidence}%`,
        confidence: hotel.confidence
      });
    }

    return recommendations;
  }

  /**
   * Health check for both services
   */
  async healthCheck() {
    const [serpHealth, amadeusHealth] = await Promise.allSettled([
      this.serpApi.healthCheck(),
      this.amadeusApi.healthCheck()
    ]);

    return {
      serpApi: serpHealth.status === 'fulfilled' ? serpHealth.value : { status: 'unhealthy', error: serpHealth.reason?.message },
      amadeus: amadeusHealth.status === 'fulfilled' ? amadeusHealth.value : { status: 'unhealthy', error: amadeusHealth.reason?.message },
      aggregator: {
        status: 'healthy',
        features: [
          'Dual-source search',
          'Price error detection',
          'Exclusive rate identification',
          'Multi-source comparison',
          'Intelligent ranking'
        ]
      }
    };
  }
}

module.exports = DualSourceHotelAggregator;
