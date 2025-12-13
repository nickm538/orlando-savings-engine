const HotelDealAnalyzer = require('../services/HotelDealAnalyzer');

// Mock SerpApiService
jest.mock('../services/SerpApiService', () => {
  return jest.fn().mockImplementation(() => ({
    searchHotels: jest.fn().mockResolvedValue({
      properties: [
        {
          property_token: 'hotel_1',
          name: 'Disney All-Star Movies Resort',
          rate_per_night: { lowest: '$150' },
          overall_rating: 4.2
        }
      ]
    }),
    searchLight: jest.fn().mockResolvedValue({
      organic_results: [
        {
          title: 'Disney Resort Discount',
          snippet: 'Save 15% with promo code DISNEY15. Valid for stays through December.',
          link: 'http://example.com',
          position: 1
        }
      ]
    })
  }));
});

describe('HotelDealAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    jest.clearAllMocks();
    analyzer = new HotelDealAnalyzer();
  });

  describe('Constructor', () => {
    it('should initialize with SerpApiService', () => {
      expect(analyzer.serpApi).toBeDefined();
    });
  });

  describe('isDealResult', () => {
    it('should return true for results with promo keyword', () => {
      const item = { title: 'Hotel Promo', snippet: 'Great deal' };
      expect(analyzer.isDealResult(item)).toBe(true);
    });

    it('should return true for results with discount keyword', () => {
      const item = { title: 'Hotel', snippet: 'Discount available' };
      expect(analyzer.isDealResult(item)).toBe(true);
    });

    it('should return true for results with coupon keyword', () => {
      const item = { title: 'Hotel', snippet: 'Use our coupon' };
      expect(analyzer.isDealResult(item)).toBe(true);
    });

    it('should return true for results with corporate keyword', () => {
      const item = { title: 'Corporate rates', snippet: 'Business travelers' };
      expect(analyzer.isDealResult(item)).toBe(true);
    });

    it('should return true for results with employee keyword', () => {
      const item = { title: 'Employee discount', snippet: 'Staff savings' };
      expect(analyzer.isDealResult(item)).toBe(true);
    });

    it('should return false for results without deal keywords', () => {
      const item = { title: 'Hotel Booking', snippet: 'Book your stay' };
      expect(analyzer.isDealResult(item)).toBe(false);
    });
  });

  describe('extractDiscountPercent', () => {
    it('should extract percentage from "X% off" pattern', () => {
      expect(analyzer.extractDiscountPercent('Get 20% off your stay')).toBe(20);
    });

    it('should extract percentage from "save X%" pattern', () => {
      expect(analyzer.extractDiscountPercent('Save 15% on bookings')).toBe(15);
    });

    it('should extract percentage from "X% discount" pattern', () => {
      expect(analyzer.extractDiscountPercent('Enjoy 25% discount')).toBe(25);
    });

    it('should extract percentage from "up to X%" pattern', () => {
      expect(analyzer.extractDiscountPercent('Up to 30% savings')).toBe(30);
    });

    it('should return null when no percentage found', () => {
      expect(analyzer.extractDiscountPercent('Great savings available')).toBeNull();
    });
  });

  describe('calculateConfidence', () => {
    it('should give higher confidence to top search positions', () => {
      const topResult = { position: 1, snippet: 'Short snippet' };
      const lowerResult = { position: 10, snippet: 'Short snippet' };

      expect(analyzer.calculateConfidence(topResult))
        .toBeGreaterThan(analyzer.calculateConfidence(lowerResult));
    });

    it('should give higher confidence to longer snippets', () => {
      const longSnippet = { 
        position: 5, 
        snippet: 'This is a very long and detailed snippet with lots of information about the deal and how to apply it to your booking for maximum savings' 
      };
      const shortSnippet = { position: 5, snippet: 'Short' };

      expect(analyzer.calculateConfidence(longSnippet))
        .toBeGreaterThan(analyzer.calculateConfidence(shortSnippet));
    });

    it('should cap confidence at reasonable maximum', () => {
      const bestResult = { 
        position: 1, 
        snippet: 'A'.repeat(500) 
      };

      expect(analyzer.calculateConfidence(bestResult)).toBeLessThanOrEqual(1);
    });
  });

  describe('findBasePrice', () => {
    it('should find matching hotel price', () => {
      const hotelData = [
        { name: 'Disney Resort', price: { amount: '$150' } },
        { name: 'Universal Hotel', price: { amount: '$200' } }
      ];

      const result = analyzer.findBasePrice('Disney Resort Special', hotelData);
      expect(result).toBe(150);
    });

    it('should return null when no match found', () => {
      const hotelData = [
        { name: 'Different Hotel', price: { amount: '$150' } }
      ];

      const result = analyzer.findBasePrice('Disney Resort', hotelData);
      expect(result).toBeNull();
    });

    it('should handle fuzzy matching', () => {
      const hotelData = [
        { name: 'Disney All-Star Movies Resort', price: { amount: '$150' } }
      ];

      const result = analyzer.findBasePrice('All-Star Movies discount', hotelData);
      expect(result).toBe(150);
    });
  });

  describe('analyzeDeals', () => {
    it('should find the best deal with maximum savings', () => {
      const deals = [
        { hotelName: 'Hotel A', basePrice: 200, discountPercent: 10, savings: 20 },
        { hotelName: 'Hotel B', basePrice: 300, discountPercent: 25, savings: 75 },
        { hotelName: 'Hotel C', basePrice: 150, discountPercent: 15, savings: 22.5 }
      ];

      const result = analyzer.analyzeDeals(deals);

      expect(result.bestDeal.hotelName).toBe('Hotel B');
      expect(result.bestDeal.savings).toBe(75);
    });

    it('should return null bestDeal when no deals provided', () => {
      const result = analyzer.analyzeDeals([]);
      expect(result.bestDeal).toBeNull();
    });

    it('should calculate summary statistics', () => {
      const deals = [
        { hotelName: 'Hotel A', basePrice: 200, discountPercent: 10, savings: 20, confidence: 0.8 },
        { hotelName: 'Hotel B', basePrice: 300, discountPercent: 20, savings: 60, confidence: 0.9 }
      ];

      const result = analyzer.analyzeDeals(deals);

      expect(result.summary.totalDeals).toBe(2);
      expect(result.summary.averageDiscount).toBe(15);
      expect(result.summary.totalPotentialSavings).toBe(80);
    });
  });

  describe('combineDealSources', () => {
    it('should merge hotel data with deal information', () => {
      const hotelData = [
        { name: 'Test Hotel', price: { amount: '$200' }, rating: 4.5 }
      ];
      const dealResults = [
        {
          query: 'Test Hotel deals',
          data: {
            organic_results: [
              {
                title: 'Test Hotel Promo',
                snippet: 'Save 15% with code TEST15',
                link: 'http://example.com',
                position: 1
              }
            ]
          }
        }
      ];

      const result = analyzer.combineDealSources(hotelData, dealResults);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('basePrice');
      expect(result[0]).toHaveProperty('discountPercent');
    });
  });

  describe('getSampleDeals', () => {
    it('should return array of sample deals', () => {
      const samples = analyzer.getSampleDeals();

      expect(Array.isArray(samples)).toBe(true);
      expect(samples.length).toBeGreaterThan(0);
    });

    it('should have required properties on each deal', () => {
      const samples = analyzer.getSampleDeals();

      samples.forEach(deal => {
        expect(deal).toHaveProperty('hotelName');
        expect(deal).toHaveProperty('basePrice');
        expect(deal).toHaveProperty('discountPercent');
        expect(deal).toHaveProperty('savings');
        expect(deal).toHaveProperty('confidence');
      });
    });
  });

  describe('getAlgorithmInfo', () => {
    it('should return algorithm information', () => {
      const info = analyzer.getAlgorithmInfo();

      expect(info).toHaveProperty('name');
      expect(info).toHaveProperty('description');
      expect(info).toHaveProperty('steps');
      expect(Array.isArray(info.steps)).toBe(true);
    });
  });

  describe('Integration: findBestDeal', () => {
    it('should orchestrate the full deal finding process', async () => {
      const result = await analyzer.findBestDeal({
        hotelName: 'Disney All-Star Movies Resort',
        checkInDate: '2025-01-15',
        checkOutDate: '2025-01-18'
      });

      expect(result).toHaveProperty('bestDeal');
      expect(result).toHaveProperty('allDeals');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('searchParameters');
    });

    it('should handle errors gracefully', async () => {
      analyzer.serpApi.searchHotels.mockRejectedValue(new Error('API Error'));

      await expect(analyzer.findBestDeal({
        hotelName: 'Test Hotel',
        checkInDate: '2025-01-15',
        checkOutDate: '2025-01-18'
      })).rejects.toThrow();
    });
  });
});
