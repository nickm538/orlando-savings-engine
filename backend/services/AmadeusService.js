const axios = require('axios');

/**
 * Amadeus Flight Service
 * Integrates with Amadeus API for flight search, pricing, and booking
 * 
 * API Documentation: https://developers.amadeus.com/
 * 
 * Required Environment Variables:
 * - AMADEUS_API_KEY: Your Amadeus API Key
 * - AMADEUS_API_SECRET: Your Amadeus API Secret
 */
class AmadeusService {
  constructor() {
    this.apiKey = process.env.AMADEUS_API_KEY;
    this.apiSecret = process.env.AMADEUS_API_SECRET;
    this.baseUrl = process.env.AMADEUS_BASE_URL || 'https://test.api.amadeus.com';
    this.accessToken = null;
    this.tokenExpiry = null;
    
    // Orlando airport codes
    this.orlandoAirports = {
      MCO: 'Orlando International Airport',
      SFB: 'Orlando Sanford International Airport'
    };
  }

  /**
   * Check if Amadeus credentials are configured
   */
  isConfigured() {
    return !!(this.apiKey && this.apiSecret);
  }

  /**
   * Get OAuth2 access token from Amadeus
   */
  async getAccessToken() {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.isConfigured()) {
      throw new Error('Amadeus API credentials not configured. Set AMADEUS_API_KEY and AMADEUS_API_SECRET environment variables.');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/security/oauth2/token`,
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
      // Set expiry 5 minutes before actual expiry for safety
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 300) * 1000);
      
      return this.accessToken;
    } catch (error) {
      console.error('Amadeus authentication failed:', error.response?.data || error.message);
      throw new Error(`Amadeus authentication failed: ${error.message}`);
    }
  }

  /**
   * Make authenticated API call to Amadeus
   */
  async makeAPICall(method, endpoint, data = null, params = null) {
    const token = await this.getAccessToken();

    try {
      const config = {
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      if (data) config.data = data;
      if (params) config.params = params;

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error('Amadeus API call failed:', error.response?.data || error.message);
      throw new Error(`Amadeus API error: ${error.response?.data?.errors?.[0]?.detail || error.message}`);
    }
  }

  /**
   * Search for flights to Orlando
   * @param {Object} options - Search parameters
   * @param {string} options.origin - Origin airport code (e.g., 'JFK', 'LAX')
   * @param {string} options.destination - Destination (default: 'MCO')
   * @param {string} options.departureDate - Departure date (YYYY-MM-DD)
   * @param {string} options.returnDate - Return date for round trip (YYYY-MM-DD)
   * @param {number} options.adults - Number of adult passengers (default: 1)
   * @param {number} options.children - Number of children (default: 0)
   * @param {string} options.travelClass - ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST
   * @param {boolean} options.nonStop - Only non-stop flights (default: false)
   * @param {string} options.currencyCode - Currency code (default: 'USD')
   * @param {number} options.maxPrice - Maximum price filter
   * @param {number} options.max - Maximum number of results (default: 50)
   */
  async searchFlights(options = {}) {
    const {
      origin,
      destination = 'MCO',
      departureDate,
      returnDate,
      adults = 1,
      children = 0,
      travelClass = 'ECONOMY',
      nonStop = false,
      currencyCode = 'USD',
      maxPrice,
      max = 50
    } = options;

    if (!origin || !departureDate) {
      throw new Error('Origin and departure date are required');
    }

    const params = {
      originLocationCode: origin.toUpperCase(),
      destinationLocationCode: destination.toUpperCase(),
      departureDate,
      adults,
      travelClass,
      currencyCode,
      max
    };

    if (returnDate) params.returnDate = returnDate;
    if (children > 0) params.children = children;
    if (nonStop) params.nonStop = true;
    if (maxPrice) params.maxPrice = maxPrice;

    const response = await this.makeAPICall('GET', '/v2/shopping/flight-offers', null, params);
    return this.processFlightResults(response, options);
  }

  /**
   * Search for flights from multiple origins to Orlando
   * @param {Array} origins - Array of origin airport codes
   * @param {Object} options - Search options
   */
  async searchFlightsFromMultipleOrigins(origins, options = {}) {
    const results = [];

    for (const origin of origins) {
      try {
        const flights = await this.searchFlights({ ...options, origin });
        results.push({
          origin,
          flights: flights.data,
          meta: flights.meta
        });
      } catch (error) {
        console.error(`Flight search failed for ${origin}:`, error.message);
        results.push({
          origin,
          flights: [],
          error: error.message
        });
      }
    }

    return {
      success: true,
      data: results,
      totalResults: results.reduce((sum, r) => sum + (r.flights?.length || 0), 0)
    };
  }

  /**
   * Get flight price confirmation and check availability
   * @param {Object} flightOffer - Flight offer from search results
   */
  async confirmFlightPrice(flightOffer) {
    const response = await this.makeAPICall('POST', '/v1/shopping/flight-offers/pricing', {
      data: {
        type: 'flight-offers-pricing',
        flightOffers: [flightOffer]
      }
    });

    return response;
  }

  /**
   * Search for cheapest flight dates (flexibility search)
   * @param {Object} options - Search options
   */
  async searchCheapestDates(options = {}) {
    const {
      origin,
      destination = 'MCO',
      departureDate,
      oneWay = false,
      duration,
      nonStop = false,
      viewBy = 'DATE'
    } = options;

    if (!origin) {
      throw new Error('Origin is required');
    }

    const params = {
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      oneWay,
      nonStop,
      viewBy
    };

    if (departureDate) params.departureDate = departureDate;
    if (duration) params.duration = duration;

    try {
      const response = await this.makeAPICall('GET', '/v1/shopping/flight-dates', null, params);
      return this.processCheapestDatesResults(response);
    } catch (error) {
      // This endpoint might not be available in test environment
      console.error('Cheapest dates search failed:', error.message);
      throw error;
    }
  }

  /**
   * Get airport information
   * @param {string} keyword - Airport name or code to search
   */
  async searchAirports(keyword) {
    const params = {
      subType: 'AIRPORT',
      keyword: keyword.toUpperCase(),
      'page[limit]': 10
    };

    const response = await this.makeAPICall('GET', '/v1/reference-data/locations', null, params);
    return response;
  }

  /**
   * Get airline information
   * @param {string} airlineCodes - Comma-separated airline codes
   */
  async getAirlineInfo(airlineCodes) {
    const params = {
      airlineCodes: airlineCodes.toUpperCase()
    };

    const response = await this.makeAPICall('GET', '/v1/reference-data/airlines', null, params);
    return response;
  }

  /**
   * Process and structure flight search results
   */
  processFlightResults(response, searchOptions) {
    if (!response.data || !Array.isArray(response.data)) {
      return { data: [], meta: {}, dictionaries: {} };
    }

    const processedFlights = response.data.map(offer => {
      const outbound = offer.itineraries[0];
      const inbound = offer.itineraries[1] || null;

      return {
        id: offer.id,
        source: offer.source,
        instantTicketingRequired: offer.instantTicketingRequired,
        nonHomogeneous: offer.nonHomogeneous,
        
        // Price information
        price: {
          currency: offer.price.currency,
          total: parseFloat(offer.price.total),
          base: parseFloat(offer.price.base),
          fees: offer.price.fees || [],
          grandTotal: parseFloat(offer.price.grandTotal),
          pricePerTraveler: offer.travelerPricings?.[0]?.price?.total 
            ? parseFloat(offer.travelerPricings[0].price.total) 
            : parseFloat(offer.price.total) / (searchOptions.adults + (searchOptions.children || 0))
        },

        // Outbound journey
        outbound: this.processItinerary(outbound, response.dictionaries),
        
        // Return journey (if round trip)
        inbound: inbound ? this.processItinerary(inbound, response.dictionaries) : null,
        
        // Booking information
        numberOfBookableSeats: offer.numberOfBookableSeats,
        lastTicketingDate: offer.lastTicketingDate,
        
        // Traveler pricing details
        travelerPricings: offer.travelerPricings,
        
        // Validation
        validatingAirlineCodes: offer.validatingAirlineCodes,

        // Confidence score (based on various factors)
        confidence: this.calculateFlightConfidence(offer),
        
        timestamp: new Date().toISOString()
      };
    });

    return {
      data: processedFlights,
      meta: response.meta || {},
      dictionaries: response.dictionaries || {}
    };
  }

  /**
   * Process a single itinerary (outbound or inbound)
   */
  processItinerary(itinerary, dictionaries) {
    const segments = itinerary.segments.map(segment => ({
      departure: {
        airport: segment.departure.iataCode,
        terminal: segment.departure.terminal,
        at: segment.departure.at
      },
      arrival: {
        airport: segment.arrival.iataCode,
        terminal: segment.arrival.terminal,
        at: segment.arrival.at
      },
      carrier: {
        code: segment.carrierCode,
        name: dictionaries?.carriers?.[segment.carrierCode] || segment.carrierCode
      },
      flightNumber: `${segment.carrierCode}${segment.number}`,
      aircraft: {
        code: segment.aircraft?.code,
        name: dictionaries?.aircraft?.[segment.aircraft?.code] || segment.aircraft?.code
      },
      duration: segment.duration,
      numberOfStops: segment.numberOfStops || 0,
      operating: segment.operating ? {
        carrierCode: segment.operating.carrierCode,
        carrierName: dictionaries?.carriers?.[segment.operating.carrierCode] || segment.operating.carrierCode
      } : null
    }));

    return {
      duration: itinerary.duration,
      segments,
      numberOfStops: segments.length - 1,
      departureTime: segments[0].departure.at,
      arrivalTime: segments[segments.length - 1].arrival.at,
      originAirport: segments[0].departure.airport,
      destinationAirport: segments[segments.length - 1].arrival.airport
    };
  }

  /**
   * Process cheapest dates results
   */
  processCheapestDatesResults(response) {
    if (!response.data) {
      return { data: [], meta: {} };
    }

    const processedDates = response.data.map(item => ({
      departureDate: item.departureDate,
      returnDate: item.returnDate,
      price: {
        total: parseFloat(item.price.total),
        currency: response.meta?.currency || 'USD'
      },
      links: item.links
    }));

    // Sort by price
    processedDates.sort((a, b) => a.price.total - b.price.total);

    return {
      data: processedDates,
      meta: response.meta || {},
      cheapestDate: processedDates[0] || null
    };
  }

  /**
   * Calculate confidence score for a flight offer
   */
  calculateFlightConfidence(offer) {
    let confidence = 0.7;

    // Higher confidence for direct flights
    const totalStops = offer.itineraries.reduce((sum, it) => 
      sum + (it.segments.length - 1), 0);
    if (totalStops === 0) confidence += 0.15;
    else if (totalStops <= 2) confidence += 0.1;

    // Higher confidence for more bookable seats
    if (offer.numberOfBookableSeats >= 5) confidence += 0.1;

    // Lower confidence if instant ticketing required
    if (offer.instantTicketingRequired) confidence -= 0.05;

    return Math.min(Math.max(confidence, 0.5), 0.95);
  }

  /**
   * Get sample flight data for demonstration
   */
  getSampleFlights() {
    return [
      {
        id: 'sample_1',
        outbound: {
          duration: 'PT3H15M',
          departureTime: '2025-12-20T08:00:00',
          arrivalTime: '2025-12-20T11:15:00',
          originAirport: 'JFK',
          destinationAirport: 'MCO',
          numberOfStops: 0,
          segments: [{
            carrier: { code: 'DL', name: 'Delta Air Lines' },
            flightNumber: 'DL1234'
          }]
        },
        price: {
          total: 189.00,
          currency: 'USD',
          pricePerTraveler: 189.00
        },
        confidence: 0.90
      },
      {
        id: 'sample_2',
        outbound: {
          duration: 'PT2H50M',
          departureTime: '2025-12-20T14:30:00',
          arrivalTime: '2025-12-20T17:20:00',
          originAirport: 'LGA',
          destinationAirport: 'MCO',
          numberOfStops: 0,
          segments: [{
            carrier: { code: 'B6', name: 'JetBlue Airways' },
            flightNumber: 'B6567'
          }]
        },
        price: {
          total: 159.00,
          currency: 'USD',
          pricePerTraveler: 159.00
        },
        confidence: 0.88
      },
      {
        id: 'sample_3',
        outbound: {
          duration: 'PT5H30M',
          departureTime: '2025-12-20T06:00:00',
          arrivalTime: '2025-12-20T11:30:00',
          originAirport: 'LAX',
          destinationAirport: 'MCO',
          numberOfStops: 1,
          segments: [
            { carrier: { code: 'AA', name: 'American Airlines' }, flightNumber: 'AA890' },
            { carrier: { code: 'AA', name: 'American Airlines' }, flightNumber: 'AA123' }
          ]
        },
        price: {
          total: 245.00,
          currency: 'USD',
          pricePerTraveler: 245.00
        },
        confidence: 0.85
      }
    ];
  }

  /**
   * Format duration from ISO 8601 to readable string
   */
  formatDuration(isoDuration) {
    const match = isoDuration.match(/PT(\d+H)?(\d+M)?/);
    if (!match) return isoDuration;

    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;

    if (hours && minutes) return `${hours}h ${minutes}m`;
    if (hours) return `${hours}h`;
    if (minutes) return `${minutes}m`;
    return isoDuration;
  }
}

module.exports = AmadeusService;
