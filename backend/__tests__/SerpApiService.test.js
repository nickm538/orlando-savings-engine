const SerpApiService = require('../services/SerpApiService');

// Mock axios
jest.mock('axios');
const axios = require('axios');

// Mock the rate limiter
jest.mock('limiter', () => ({
  RateLimiter: jest.fn().mockImplementation(() => ({
    removeTokens: jest.fn().mockResolvedValue(true)
  }))
}));

describe('SerpApiService', () => {
  let serpApi;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, SERP_API_KEY: 'test_api_key' };
    serpApi = new SerpApiService();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Constructor', () => {
    it('should initialize with API key from environment', () => {
      expect(serpApi.apiKey).toBe('test_api_key');
    });

    it('should set baseUrl correctly', () => {
      expect(serpApi.baseUrl).toBe('https://serpapi.com/search');
    });
  });

  describe('getDefaultCheckInDate', () => {
    it('should return tomorrow\'s date in YYYY-MM-DD format', () => {
      const result = serpApi.getDefaultCheckInDate();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const expected = tomorrow.toISOString().split('T')[0];
      expect(result).toBe(expected);
    });
  });

  describe('getDefaultCheckOutDate', () => {
    it('should return date 4 days from now in YYYY-MM-DD format', () => {
      const result = serpApi.getDefaultCheckOutDate();
      const checkout = new Date();
      checkout.setDate(checkout.getDate() + 4);
      const expected = checkout.toISOString().split('T')[0];
      expect(result).toBe(expected);
    });
  });

  describe('makeAPICall', () => {
    it('should throw error when API key is not configured', async () => {
      process.env.SERP_API_KEY = '';
      const serpApiNoKey = new SerpApiService();
      serpApiNoKey.apiKey = null;

      await expect(serpApiNoKey.makeAPICall({}))
        .rejects.toThrow('SERP_API_KEY environment variable is not configured');
    });

    it('should make successful API call with correct parameters', async () => {
      const mockResponse = { data: { properties: [] } };
      axios.get.mockResolvedValue(mockResponse);

      const result = await serpApi.makeAPICall({ engine: 'google_hotels' });

      expect(axios.get).toHaveBeenCalledWith(
        'https://serpapi.com/search',
        expect.objectContaining({
          params: expect.objectContaining({
            engine: 'google_hotels',
            api_key: 'test_api_key'
          }),
          timeout: 30000
        })
      );
      expect(result).toEqual({ properties: [] });
    });

    it('should handle API errors gracefully', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      await expect(serpApi.makeAPICall({ engine: 'google_hotels' }))
        .rejects.toThrow('SerpApi error: Network error');
    });
  });

  describe('searchHotels', () => {
    it('should call makeAPICall with correct hotel search parameters', async () => {
      const mockResponse = { data: { properties: [] } };
      axios.get.mockResolvedValue(mockResponse);

      await serpApi.searchHotels({
        q: 'hotels in Orlando',
        checkInDate: '2025-01-15',
        checkOutDate: '2025-01-18',
        adults: 2
      });

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            engine: 'google_hotels',
            q: 'hotels in Orlando',
            check_in_date: '2025-01-15',
            check_out_date: '2025-01-18',
            adults: 2
          })
        })
      );
    });

    it('should use default values when options not provided', async () => {
      const mockResponse = { data: { properties: [] } };
      axios.get.mockResolvedValue(mockResponse);

      await serpApi.searchHotels();

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            q: 'hotels in Orlando, FL',
            adults: 2,
            children: 0,
            gl: 'us',
            hl: 'en',
            currency: 'USD'
          })
        })
      );
    });
  });

  describe('searchOrlandoHotels', () => {
    it('should search with Orlando-specific defaults', async () => {
      const mockResponse = { data: { properties: [] } };
      axios.get.mockResolvedValue(mockResponse);

      await serpApi.searchOrlandoHotels();

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            q: 'hotels in Orlando, FL near Disney World Universal Studios',
            sort_by: 3,
            rating: 7
          })
        })
      );
    });
  });

  describe('searchAIMode', () => {
    it('should call AI Mode API with correct parameters', async () => {
      const mockResponse = { data: { text_blocks: [] } };
      axios.get.mockResolvedValue(mockResponse);

      await serpApi.searchAIMode({ q: 'Orlando travel tips' });

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            engine: 'google_ai_mode',
            q: 'Orlando travel tips'
          })
        })
      );
    });
  });

  describe('searchLight', () => {
    it('should call Google Light API with correct parameters', async () => {
      const mockResponse = { data: { organic_results: [] } };
      axios.get.mockResolvedValue(mockResponse);

      await serpApi.searchLight({ q: 'Orlando promo codes' });

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            engine: 'google_light',
            q: 'Orlando promo codes',
            location: 'Orlando, Florida, United States'
          })
        })
      );
    });
  });

  describe('processHotelResults', () => {
    it('should return empty array when no properties', () => {
      const result = serpApi.processHotelResults({});
      expect(result).toEqual([]);
    });

    it('should process hotel data correctly', () => {
      const mockData = {
        properties: [
          {
            property_token: 'hotel_123',
            name: 'Test Hotel',
            description: 'A nice hotel',
            rate_per_night: { lowest: '$150', currency: 'USD' },
            overall_rating: 4.5,
            review_count: 100,
            latitude: 28.5383,
            longitude: -81.3792,
            location: '123 Main St',
            neighborhood: 'Downtown',
            amenities: ['Pool', 'WiFi'],
            images: ['http://example.com/image.jpg'],
            property_type: 'Hotel',
            hotel_class: 4,
            check_in_time: '3:00 PM',
            check_out_time: '11:00 AM'
          }
        ]
      };

      const result = serpApi.processHotelResults(mockData);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'hotel_123',
        name: 'Test Hotel',
        rating: 4.5,
        reviewCount: 100,
        source: 'serpapi_google_hotels',
        confidence: 0.95
      });
    });
  });

  describe('processLightResults', () => {
    it('should process light search results correctly', () => {
      const mockResults = [
        {
          query: 'test query',
          data: {
            organic_results: [
              {
                title: 'Deal Title',
                snippet: 'This is a snippet with more than 30 characters for testing',
                link: 'http://example.com',
                position: 1
              }
            ]
          }
        }
      ];

      const result = serpApi.processLightResults(mockResults);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        title: 'Deal Title',
        link: 'http://example.com',
        position: 1,
        source: 'serpapi_google_light',
        confidence: 0.85
      });
    });

    it('should filter out short snippets', () => {
      const mockResults = [
        {
          query: 'test query',
          data: {
            organic_results: [
              {
                title: 'Short',
                snippet: 'Too short',
                link: 'http://example.com',
                position: 1
              }
            ]
          }
        }
      ];

      const result = serpApi.processLightResults(mockResults);
      expect(result).toHaveLength(0);
    });
  });

  describe('processAIModeResults', () => {
    it('should process AI mode results correctly', () => {
      const mockResults = [
        {
          query: 'test query',
          data: {
            text_blocks: [
              {
                type: 'text',
                snippet: 'This is a longer snippet that has more than 50 characters for proper testing',
                reference_indexes: [0, 1]
              }
            ]
          }
        }
      ];

      const result = serpApi.processAIModeResults(mockResults);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: 'text',
        source: 'serpapi_google_ai_mode'
      });
    });
  });
});
