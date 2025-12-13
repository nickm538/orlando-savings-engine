const AmadeusService = require('../services/AmadeusService');

// Mock axios
jest.mock('axios');
const axios = require('axios');

describe('AmadeusService', () => {
  let amadeusService;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      AMADEUS_API_KEY: 'test_api_key',
      AMADEUS_API_SECRET: 'test_api_secret'
    };
    amadeusService = new AmadeusService();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Constructor', () => {
    it('should initialize with credentials from environment', () => {
      expect(amadeusService.apiKey).toBe('test_api_key');
      expect(amadeusService.apiSecret).toBe('test_api_secret');
    });

    it('should set default base URL', () => {
      expect(amadeusService.baseUrl).toBe('https://test.api.amadeus.com');
    });

    it('should initialize Orlando airports', () => {
      expect(amadeusService.orlandoAirports).toHaveProperty('MCO');
      expect(amadeusService.orlandoAirports).toHaveProperty('SFB');
    });
  });

  describe('isConfigured', () => {
    it('should return true when both credentials are set', () => {
      expect(amadeusService.isConfigured()).toBe(true);
    });

    it('should return false when API key is missing', () => {
      amadeusService.apiKey = null;
      expect(amadeusService.isConfigured()).toBe(false);
    });

    it('should return false when API secret is missing', () => {
      amadeusService.apiSecret = null;
      expect(amadeusService.isConfigured()).toBe(false);
    });
  });

  describe('getAccessToken', () => {
    it('should get new token when none exists', async () => {
      axios.post.mockResolvedValue({
        data: {
          access_token: 'new_token',
          expires_in: 1800
        }
      });

      const token = await amadeusService.getAccessToken();

      expect(token).toBe('new_token');
      expect(axios.post).toHaveBeenCalledWith(
        'https://test.api.amadeus.com/v1/security/oauth2/token',
        expect.any(URLSearchParams),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })
      );
    });

    it('should return cached token if still valid', async () => {
      amadeusService.accessToken = 'cached_token';
      amadeusService.tokenExpiry = new Date(Date.now() + 60000); // 1 minute from now

      const token = await amadeusService.getAccessToken();

      expect(token).toBe('cached_token');
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('should throw error when credentials not configured', async () => {
      amadeusService.apiKey = null;
      amadeusService.apiSecret = null;

      await expect(amadeusService.getAccessToken())
        .rejects.toThrow('Amadeus API credentials not configured');
    });

    it('should handle authentication errors', async () => {
      axios.post.mockRejectedValue({
        response: { data: { error: 'invalid_client' } },
        message: 'Authentication failed'
      });

      await expect(amadeusService.getAccessToken())
        .rejects.toThrow('Amadeus authentication failed');
    });
  });

  describe('searchFlights', () => {
    beforeEach(() => {
      // Mock successful token retrieval
      axios.post.mockResolvedValue({
        data: { access_token: 'test_token', expires_in: 1800 }
      });
    });

    it('should throw error when origin is missing', async () => {
      await expect(amadeusService.searchFlights({ departureDate: '2025-01-15' }))
        .rejects.toThrow('Origin and departure date are required');
    });

    it('should throw error when departure date is missing', async () => {
      await expect(amadeusService.searchFlights({ origin: 'JFK' }))
        .rejects.toThrow('Origin and departure date are required');
    });

    it('should search flights with correct parameters', async () => {
      axios.mockImplementation((config) => {
        if (config.method === 'GET') {
          return Promise.resolve({
            data: {
              data: [],
              meta: {},
              dictionaries: {}
            }
          });
        }
        return Promise.resolve({ data: { access_token: 'test_token', expires_in: 1800 } });
      });

      await amadeusService.searchFlights({
        origin: 'JFK',
        departureDate: '2025-01-15',
        adults: 2
      });

      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: 'https://test.api.amadeus.com/v2/shopping/flight-offers',
          params: expect.objectContaining({
            originLocationCode: 'JFK',
            destinationLocationCode: 'MCO',
            departureDate: '2025-01-15',
            adults: 2
          })
        })
      );
    });

    it('should include optional parameters when provided', async () => {
      axios.mockImplementation((config) => {
        if (config.method === 'GET') {
          return Promise.resolve({ data: { data: [], meta: {}, dictionaries: {} } });
        }
        return Promise.resolve({ data: { access_token: 'test_token', expires_in: 1800 } });
      });

      await amadeusService.searchFlights({
        origin: 'JFK',
        departureDate: '2025-01-15',
        returnDate: '2025-01-20',
        children: 2,
        nonStop: true,
        maxPrice: 500
      });

      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            returnDate: '2025-01-20',
            children: 2,
            nonStop: true,
            maxPrice: 500
          })
        })
      );
    });
  });

  describe('processFlightResults', () => {
    it('should return empty data when no results', () => {
      const result = amadeusService.processFlightResults({}, {});
      expect(result.data).toEqual([]);
    });

    it('should process flight data correctly', () => {
      const mockResponse = {
        data: [
          {
            id: 'flight_1',
            source: 'GDS',
            instantTicketingRequired: false,
            nonHomogeneous: false,
            price: {
              currency: 'USD',
              total: '250.00',
              base: '200.00',
              grandTotal: '250.00'
            },
            itineraries: [
              {
                duration: 'PT3H15M',
                segments: [
                  {
                    departure: { iataCode: 'JFK', terminal: '4', at: '2025-01-15T08:00:00' },
                    arrival: { iataCode: 'MCO', terminal: 'A', at: '2025-01-15T11:15:00' },
                    carrierCode: 'DL',
                    number: '1234',
                    aircraft: { code: '738' },
                    duration: 'PT3H15M',
                    numberOfStops: 0
                  }
                ]
              }
            ],
            numberOfBookableSeats: 5,
            travelerPricings: [
              { price: { total: '250.00' } }
            ],
            validatingAirlineCodes: ['DL']
          }
        ],
        dictionaries: {
          carriers: { 'DL': 'Delta Air Lines' },
          aircraft: { '738': 'Boeing 737-800' }
        }
      };

      const result = amadeusService.processFlightResults(mockResponse, { adults: 1 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: 'flight_1',
        price: {
          currency: 'USD',
          total: 250,
          base: 200
        },
        outbound: {
          duration: 'PT3H15M',
          numberOfStops: 0,
          originAirport: 'JFK',
          destinationAirport: 'MCO'
        }
      });
      expect(result.data[0].outbound.segments[0].carrier.name).toBe('Delta Air Lines');
    });
  });

  describe('processItinerary', () => {
    it('should process itinerary with multiple segments', () => {
      const itinerary = {
        duration: 'PT5H30M',
        segments: [
          {
            departure: { iataCode: 'JFK', at: '2025-01-15T08:00:00' },
            arrival: { iataCode: 'ATL', at: '2025-01-15T10:30:00' },
            carrierCode: 'DL',
            number: '100',
            aircraft: { code: '738' },
            duration: 'PT2H30M'
          },
          {
            departure: { iataCode: 'ATL', at: '2025-01-15T11:30:00' },
            arrival: { iataCode: 'MCO', at: '2025-01-15T13:30:00' },
            carrierCode: 'DL',
            number: '200',
            aircraft: { code: '738' },
            duration: 'PT2H00M'
          }
        ]
      };

      const dictionaries = {
        carriers: { 'DL': 'Delta Air Lines' },
        aircraft: { '738': 'Boeing 737-800' }
      };

      const result = amadeusService.processItinerary(itinerary, dictionaries);

      expect(result.numberOfStops).toBe(1);
      expect(result.segments).toHaveLength(2);
      expect(result.originAirport).toBe('JFK');
      expect(result.destinationAirport).toBe('MCO');
    });
  });

  describe('calculateFlightConfidence', () => {
    it('should give higher confidence to direct flights', () => {
      const directFlight = {
        itineraries: [{ segments: [{}] }],
        numberOfBookableSeats: 5,
        instantTicketingRequired: false
      };

      const connectingFlight = {
        itineraries: [{ segments: [{}, {}] }],
        numberOfBookableSeats: 5,
        instantTicketingRequired: false
      };

      expect(amadeusService.calculateFlightConfidence(directFlight))
        .toBeGreaterThan(amadeusService.calculateFlightConfidence(connectingFlight));
    });

    it('should give higher confidence when more seats available', () => {
      const manySeats = {
        itineraries: [{ segments: [{}] }],
        numberOfBookableSeats: 10,
        instantTicketingRequired: false
      };

      const fewSeats = {
        itineraries: [{ segments: [{}] }],
        numberOfBookableSeats: 2,
        instantTicketingRequired: false
      };

      expect(amadeusService.calculateFlightConfidence(manySeats))
        .toBeGreaterThan(amadeusService.calculateFlightConfidence(fewSeats));
    });

    it('should lower confidence for instant ticketing required', () => {
      const noInstant = {
        itineraries: [{ segments: [{}] }],
        numberOfBookableSeats: 5,
        instantTicketingRequired: false
      };

      const instantRequired = {
        itineraries: [{ segments: [{}] }],
        numberOfBookableSeats: 5,
        instantTicketingRequired: true
      };

      expect(amadeusService.calculateFlightConfidence(noInstant))
        .toBeGreaterThan(amadeusService.calculateFlightConfidence(instantRequired));
    });
  });

  describe('formatDuration', () => {
    it('should format hours and minutes', () => {
      expect(amadeusService.formatDuration('PT3H15M')).toBe('3h 15m');
    });

    it('should format hours only', () => {
      expect(amadeusService.formatDuration('PT2H')).toBe('2h');
    });

    it('should format minutes only', () => {
      expect(amadeusService.formatDuration('PT45M')).toBe('45m');
    });

    it('should return original string if format not recognized', () => {
      expect(amadeusService.formatDuration('invalid')).toBe('invalid');
    });
  });

  describe('getSampleFlights', () => {
    it('should return sample flight data', () => {
      const samples = amadeusService.getSampleFlights();

      expect(Array.isArray(samples)).toBe(true);
      expect(samples.length).toBeGreaterThan(0);
      expect(samples[0]).toHaveProperty('id');
      expect(samples[0]).toHaveProperty('outbound');
      expect(samples[0]).toHaveProperty('price');
      expect(samples[0]).toHaveProperty('confidence');
    });
  });

  describe('searchFlightsFromMultipleOrigins', () => {
    beforeEach(() => {
      axios.post.mockResolvedValue({
        data: { access_token: 'test_token', expires_in: 1800 }
      });
    });

    it('should search from multiple origins', async () => {
      axios.mockImplementation((config) => {
        if (config.method === 'GET') {
          return Promise.resolve({ data: { data: [], meta: {}, dictionaries: {} } });
        }
        return Promise.resolve({ data: { access_token: 'test_token', expires_in: 1800 } });
      });

      const result = await amadeusService.searchFlightsFromMultipleOrigins(
        ['JFK', 'LAX'],
        { departureDate: '2025-01-15' }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should handle errors for individual origins', async () => {
      let callCount = 0;
      axios.mockImplementation((config) => {
        if (config.method === 'GET') {
          callCount++;
          if (callCount === 1) {
            return Promise.reject(new Error('Search failed'));
          }
          return Promise.resolve({ data: { data: [], meta: {}, dictionaries: {} } });
        }
        return Promise.resolve({ data: { access_token: 'test_token', expires_in: 1800 } });
      });

      const result = await amadeusService.searchFlightsFromMultipleOrigins(
        ['JFK', 'LAX'],
        { departureDate: '2025-01-15' }
      );

      expect(result.data[0]).toHaveProperty('error');
      expect(result.data[1].flights).toEqual([]);
    });
  });
});
