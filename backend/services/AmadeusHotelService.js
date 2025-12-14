/**
 * Amadeus Hotel Search Service
 * 
 * Integrates with Amadeus Hotel Search API to access:
 * - GDS (Global Distribution System) rates
 * - Corporate and negotiated rates
 * - Real-time hotel availability
 * - Professional travel agent rates
 * - Detailed room types and policies
 * 
 * This provides access to rates that consumers cannot see on public websites,
 * including corporate discounts, promotional rates, and negotiated deals.
 */

const axios = require('axios');

class AmadeusHotelService {
  constructor() {
    this.apiKey = process.env.AMADEUS_API_KEY;
    this.apiSecret = process.env.AMADEUS_API_SECRET;
    this.baseURL = 'https://api.amadeus.com/v3'; // Production
    this.testURL = 'https://test.api.amadeus.com/v3'; // Test
    this.authURL = 'https://api.amadeus.com/v1/security/oauth2/token';
    this.testAuthURL = 'https://test.api.amadeus.com/v1/security/oauth2/token';
    
    this.accessToken = null;
    this.tokenExpiry = null;
    
    // Use production if keys are set, otherwise test
    this.useProduction = !!(this.apiKey && this.apiSecret);
    this.currentBaseURL = this.useProduction ? this.baseURL : this.testURL;
    this.currentAuthURL = this.useProduction ? this.authURL : this.testAuthURL;
  }

  /**
   * Get OAuth access token
   */
  async getAccessToken() {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Amadeus API credentials not configured');
    }

    try {
      const response = await axios.post(
        this.currentAuthURL,
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
      // Token expires in 30 minutes, refresh 5 minutes early
      this.tokenExpiry = Date.now() + ((response.data.expires_in - 300) * 1000);
      
      return this.accessToken;
    } catch (error) {
      throw new Error(`Amadeus authentication failed: ${error.message}`);
    }
  }

  /**
   * Get Orlando hotel IDs from Amadeus Hotel List API
   */
  async getOrlandoHotelIds(radius = 50) {
    const token = await this.getAccessToken();
    
    try {
      const response = await axios.get(
        `${this.currentBaseURL}/reference-data/locations/hotels/by-city`,
        {
          params: {
            cityCode: 'ORL',
            radius: radius,
            radiusUnit: 'KM',
            hotelSource: 'ALL'
          },
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      return response.data.data.map(hotel => ({
        hotelId: hotel.hotelId,
        name: hotel.name,
        chainCode: hotel.chainCode,
        iataCode: hotel.iataCode,
        geoCode: hotel.geoCode,
        address: hotel.address,
        distance: hotel.distance
      }));
    } catch (error) {
      throw new Error(`Failed to get Orlando hotel IDs: ${error.message}`);
    }
  }

  /**
   * Search hotels with detailed offers
   */
  async searchHotels(params) {
    const token = await this.getAccessToken();
    
    const {
      hotelIds,
      checkInDate,
      checkOutDate,
      adults = 1,
      roomQuantity = 1,
      currency = 'USD',
      priceRange,
      paymentPolicy,
      boardType,
      bestRateOnly = false,
      countryOfResidence = 'US'
    } = params;

    if (!hotelIds || hotelIds.length === 0) {
      throw new Error('Hotel IDs are required');
    }

    try {
      const searchParams = {
        hotelIds: Array.isArray(hotelIds) ? hotelIds.join(',') : hotelIds,
        adults,
        roomQuantity,
        currency,
        countryOfResidence,
        bestRateOnly
      };

      // Add optional parameters
      if (checkInDate) searchParams.checkInDate = checkInDate;
      if (checkOutDate) searchParams.checkOutDate = checkOutDate;
      if (priceRange) searchParams.priceRange = priceRange;
      if (paymentPolicy) searchParams.paymentPolicy = paymentPolicy;
      if (boardType) searchParams.boardType = boardType;

      const response = await axios.get(
        `${this.currentBaseURL}/shopping/hotel-offers`,
        {
          params: searchParams,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      return this.processHotelOffers(response.data.data);
    } catch (error) {
      if (error.response) {
        throw new Error(`Amadeus API error: ${error.response.data.errors?.[0]?.detail || error.message}`);
      }
      throw new Error(`Hotel search failed: ${error.message}`);
    }
  }

  /**
   * Get detailed pricing for a specific offer
   */
  async getOfferPricing(offerId) {
    const token = await this.getAccessToken();
    
    try {
      const response = await axios.get(
        `${this.currentBaseURL}/shopping/hotel-offers/${offerId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      return response.data.data;
    } catch (error) {
      throw new Error(`Failed to get offer pricing: ${error.message}`);
    }
  }

  /**
   * Process hotel offers into standardized format
   */
  processHotelOffers(data) {
    if (!data || data.length === 0) {
      return [];
    }

    return data.map(hotelData => {
      const hotel = hotelData.hotel;
      const offers = hotelData.offers || [];

      // Find best offer (lowest total price)
      const bestOffer = offers.reduce((best, offer) => {
        const price = parseFloat(offer.price.total);
        const bestPrice = best ? parseFloat(best.price.total) : Infinity;
        return price < bestPrice ? offer : best;
      }, null);

      if (!bestOffer) {
        return null;
      }

      // Calculate confidence score based on multiple factors
      const confidence = this.calculateConfidence(hotelData, bestOffer);

      // Determine rate type and savings potential
      const rateType = this.getRateType(bestOffer);
      const savingsPotential = this.calculateSavingsPotential(bestOffer, rateType);

      return {
        source: 'amadeus',
        hotelId: hotel.hotelId,
        hotelName: hotel.name,
        chainCode: hotel.chainCode,
        cityCode: hotel.cityCode,
        location: {
          latitude: hotel.latitude,
          longitude: hotel.longitude
        },
        available: hotelData.available,
        
        // Best offer details
        offerId: bestOffer.id,
        checkInDate: bestOffer.checkInDate,
        checkOutDate: bestOffer.checkOutDate,
        
        // Room details
        roomType: bestOffer.room.type,
        roomCategory: bestOffer.room.typeEstimated?.category,
        bedType: bestOffer.room.typeEstimated?.bedType,
        beds: bestOffer.room.typeEstimated?.beds,
        roomDescription: bestOffer.room.description?.text,
        
        // Pricing
        currency: bestOffer.price.currency,
        basePrice: parseFloat(bestOffer.price.base),
        totalPrice: parseFloat(bestOffer.price.total),
        taxes: bestOffer.price.taxes?.map(tax => ({
          code: tax.code,
          amount: parseFloat(tax.amount),
          included: tax.included
        })),
        pricePerNight: parseFloat(bestOffer.price.variations?.average?.base || bestOffer.price.base),
        
        // Rate information
        rateCode: bestOffer.rateCode,
        rateFamily: rateType.family,
        rateType: rateType.type,
        rateDescription: rateType.description,
        
        // Policies
        boardType: bestOffer.boardType,
        paymentType: bestOffer.policies?.paymentType,
        cancellationDeadline: bestOffer.policies?.cancellation?.deadline,
        cancellationType: bestOffer.policies?.cancellation?.type,
        cancellationAmount: bestOffer.policies?.cancellation?.amount ? 
          parseFloat(bestOffer.policies.cancellation.amount) : null,
        
        // Metadata
        confidence,
        savingsPotential,
        totalOffers: offers.length,
        allOffers: offers.map(o => ({
          id: o.id,
          price: parseFloat(o.price.total),
          rateCode: o.rateCode,
          roomType: o.room.type
        })),
        
        // API reference
        offerUrl: bestOffer.self,
        timestamp: new Date().toISOString()
      };
    }).filter(Boolean);
  }

  /**
   * Calculate confidence score (0-100)
   */
  calculateConfidence(hotelData, offer) {
    let score = 70; // Base score for Amadeus (GDS data is reliable)

    // Availability bonus
    if (hotelData.available) score += 10;

    // Multiple offers available (more competition = better deals)
    const offerCount = hotelData.offers?.length || 0;
    if (offerCount > 5) score += 10;
    else if (offerCount > 2) score += 5;

    // Cancellation policy flexibility
    if (offer.policies?.cancellation?.type === 'FULL_STAY') {
      score += 5; // Free cancellation
    }

    // Price stability (low variation = more reliable)
    const priceVariation = offer.price.variations?.changes || [];
    if (priceVariation.length <= 2) {
      score += 5; // Stable pricing
    }

    return Math.min(score, 100);
  }

  /**
   * Determine rate type and description
   */
  getRateType(offer) {
    const rateFamily = offer.rateFamilyEstimated?.code;
    const rateCode = offer.rateCode;

    const rateTypes = {
      'PRO': {
        family: 'Promotional',
        type: 'promotional',
        description: 'Special promotional rate - Limited time offer',
        savingsPotential: 'high'
      },
      'COR': {
        family: 'Corporate',
        type: 'corporate',
        description: 'Corporate negotiated rate - Business discount',
        savingsPotential: 'high'
      },
      'GOV': {
        family: 'Government',
        type: 'government',
        description: 'Government rate - Official travel discount',
        savingsPotential: 'high'
      },
      'PKG': {
        family: 'Package',
        type: 'package',
        description: 'Package rate - Bundled deal',
        savingsPotential: 'medium'
      },
      'RAC': {
        family: 'Rack',
        type: 'standard',
        description: 'Standard rack rate - Public rate',
        savingsPotential: 'low'
      }
    };

    return rateTypes[rateFamily] || {
      family: 'Standard',
      type: 'standard',
      description: `Rate code: ${rateCode}`,
      savingsPotential: 'medium'
    };
  }

  /**
   * Calculate savings potential
   */
  calculateSavingsPotential(offer, rateType) {
    const potentialMap = {
      'high': { min: 20, max: 50, description: 'High savings potential (20-50% off)' },
      'medium': { min: 10, max: 20, description: 'Medium savings potential (10-20% off)' },
      'low': { min: 0, max: 10, description: 'Standard pricing' }
    };

    return potentialMap[rateType.savingsPotential] || potentialMap['medium'];
  }

  /**
   * Search Orlando hotels specifically
   */
  async searchOrlandoHotels(params) {
    // Get Orlando hotel IDs first
    const orlandoHotels = await this.getOrlandoHotelIds(params.radius || 50);
    
    if (orlandoHotels.length === 0) {
      return [];
    }

    // Amadeus limits to 100 hotels per request, so batch if needed
    const batchSize = 100;
    const hotelBatches = [];
    
    for (let i = 0; i < orlandoHotels.length; i += batchSize) {
      hotelBatches.push(orlandoHotels.slice(i, i + batchSize));
    }

    // Search all batches in parallel
    const searchPromises = hotelBatches.map(batch => {
      const hotelIds = batch.map(h => h.hotelId);
      return this.searchHotels({
        ...params,
        hotelIds
      }).catch(error => {
        // Log error but don't fail entire search
        console.warn(`Batch search failed: ${error.message}`);
        return [];
      });
    });

    const results = await Promise.all(searchPromises);
    
    // Flatten and sort by price
    return results
      .flat()
      .sort((a, b) => a.totalPrice - b.totalPrice);
  }

  /**
   * Compare Amadeus rates with market rates
   */
  compareWithMarket(amadeusOffers, marketOffers) {
    return amadeusOffers.map(amadeusOffer => {
      // Find matching hotel in market data
      const marketOffer = marketOffers.find(m => 
        m.hotelName.toLowerCase().includes(amadeusOffer.hotelName.toLowerCase()) ||
        amadeusOffer.hotelName.toLowerCase().includes(m.hotelName.toLowerCase())
      );

      if (!marketOffer) {
        return {
          ...amadeusOffer,
          marketComparison: null,
          exclusiveRate: true
        };
      }

      const amadeusPrice = amadeusOffer.totalPrice;
      const marketPrice = marketOffer.price;
      const savings = marketPrice - amadeusPrice;
      const savingsPercent = (savings / marketPrice) * 100;

      return {
        ...amadeusOffer,
        marketComparison: {
          marketPrice,
          amadeusPrice,
          savings,
          savingsPercent: Math.round(savingsPercent * 10) / 10,
          betterDeal: savings > 0
        },
        exclusiveRate: false
      };
    });
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const token = await this.getAccessToken();
      return {
        status: 'healthy',
        authenticated: !!token,
        environment: this.useProduction ? 'production' : 'test'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        environment: this.useProduction ? 'production' : 'test'
      };
    }
  }
}

module.exports = AmadeusHotelService;
