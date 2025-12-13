const CarRentalService = require('../services/CarRentalService');

// Mock SerpApiService
jest.mock('../services/SerpApiService', () => {
  return jest.fn().mockImplementation(() => ({
    searchLight: jest.fn().mockResolvedValue({
      organic_results: [
        {
          title: 'Enterprise Car Rental - Save 15% on Orlando Rentals',
          snippet: 'Use promo code SAVE15 to get 15% off your Orlando car rental. Corporate discounts available.',
          link: 'https://enterprise.com/orlando',
          position: 1
        },
        {
          title: 'Budget Car Rental Deals MCO Airport',
          snippet: 'AAA members save up to 25% on car rentals. Military discounts also available.',
          link: 'https://budget.com/orlando',
          position: 2
        }
      ]
    })
  }));
});

describe('CarRentalService', () => {
  let carRentalService;

  beforeEach(() => {
    jest.clearAllMocks();
    carRentalService = new CarRentalService();
  });

  describe('Constructor', () => {
    it('should initialize with popular rental companies', () => {
      expect(carRentalService.popularRentalCompanies).toContain('Enterprise');
      expect(carRentalService.popularRentalCompanies).toContain('Hertz');
      expect(carRentalService.popularRentalCompanies).toContain('Budget');
      expect(carRentalService.popularRentalCompanies.length).toBeGreaterThan(5);
    });

    it('should initialize with Orlando locations', () => {
      expect(carRentalService.orlandoLocations).toContain('MCO Airport');
      expect(carRentalService.orlandoLocations).toContain('Disney World');
    });
  });

  describe('getDefaultPickupDate', () => {
    it('should return tomorrow\'s date', () => {
      const result = carRentalService.getDefaultPickupDate();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(result).toBe(tomorrow.toISOString().split('T')[0]);
    });
  });

  describe('getDefaultReturnDate', () => {
    it('should return date 8 days from now', () => {
      const result = carRentalService.getDefaultReturnDate();
      const returnDate = new Date();
      returnDate.setDate(returnDate.getDate() + 8);
      expect(result).toBe(returnDate.toISOString().split('T')[0]);
    });
  });

  describe('buildSearchQueries', () => {
    it('should build search queries with location and car type', () => {
      const queries = carRentalService.buildSearchQueries('MCO Airport', 'SUV', '2025-01-15');
      
      expect(queries.length).toBeGreaterThan(10);
      expect(queries.some(q => q.includes('Orlando'))).toBe(true);
      expect(queries.some(q => q.includes('MCO'))).toBe(true);
    });

    it('should include company-specific queries', () => {
      const queries = carRentalService.buildSearchQueries('MCO', '', '2025-01-15');
      
      expect(queries.some(q => q.includes('Enterprise'))).toBe(true);
      expect(queries.some(q => q.includes('Hertz'))).toBe(true);
    });
  });

  describe('isCarRentalResult', () => {
    it('should return true for car rental related results', () => {
      const item = {
        title: 'Enterprise Car Rental Deals',
        snippet: 'Save on car rental in Orlando'
      };
      expect(carRentalService.isCarRentalResult(item)).toBe(true);
    });

    it('should return true for results with rental company names', () => {
      const item = {
        title: 'Hertz Orlando Location',
        snippet: 'Pick up your vehicle at MCO'
      };
      expect(carRentalService.isCarRentalResult(item)).toBe(true);
    });

    it('should return false for unrelated results', () => {
      const item = {
        title: 'Best Restaurants in Orlando',
        snippet: 'Top dining spots near theme parks'
      };
      expect(carRentalService.isCarRentalResult(item)).toBe(false);
    });
  });

  describe('identifyCompany', () => {
    it('should identify Enterprise from text', () => {
      const company = carRentalService.identifyCompany('Enterprise Rent-A-Car', 'Best deals');
      expect(company).toBe('Enterprise');
    });

    it('should identify Hertz from snippet', () => {
      const company = carRentalService.identifyCompany('Car Rental', 'Hertz offers great rates');
      expect(company).toBe('Hertz');
    });

    it('should return Various when no company identified', () => {
      const company = carRentalService.identifyCompany('Car Rental', 'Best rates available');
      expect(company).toBe('Various');
    });
  });

  describe('extractDealType', () => {
    it('should identify corporate discount', () => {
      const dealType = carRentalService.extractDealType('Corporate Rates', 'Business discount');
      expect(dealType).toBe('Corporate Discount');
    });

    it('should identify AAA discount', () => {
      const dealType = carRentalService.extractDealType('AAA Member Savings', 'Show your card');
      expect(dealType).toBe('AAA Member Discount');
    });

    it('should identify military discount', () => {
      const dealType = carRentalService.extractDealType('Military Appreciation', 'Veteran discount');
      expect(dealType).toBe('Military Discount');
    });

    it('should identify promo code deals', () => {
      const dealType = carRentalService.extractDealType('Use Code', 'Enter promo code at checkout');
      expect(dealType).toBe('Promo Code');
    });

    it('should return General Discount for unknown types', () => {
      const dealType = carRentalService.extractDealType('Save Money', 'Great rates');
      expect(dealType).toBe('General Discount');
    });
  });

  describe('extractPromoCode', () => {
    it('should extract promo code with "code:" pattern', () => {
      const code = carRentalService.extractPromoCode('Use code: SAVE20 for discount');
      expect(code).toBe('SAVE20');
    });

    it('should extract promo code with "promo:" pattern', () => {
      const code = carRentalService.extractPromoCode('Apply promo: ORLANDO15');
      expect(code).toBe('ORLANDO15');
    });

    it('should extract promo code with quotes', () => {
      const code = carRentalService.extractPromoCode('Enter "DEAL2025" at checkout');
      expect(code).toBe('DEAL2025');
    });

    it('should return null when no code found', () => {
      const code = carRentalService.extractPromoCode('Great savings available');
      expect(code).toBeNull();
    });
  });

  describe('extractDiscountPercent', () => {
    it('should extract percentage with "off" pattern', () => {
      const percent = carRentalService.extractDiscountPercent('Save 15% off your rental');
      expect(percent).toBe(15);
    });

    it('should extract percentage with "save" pattern', () => {
      const percent = carRentalService.extractDiscountPercent('Save 25% on bookings');
      expect(percent).toBe(25);
    });

    it('should extract percentage with "up to" pattern', () => {
      const percent = carRentalService.extractDiscountPercent('Up to 30% discount');
      expect(percent).toBe(30);
    });

    it('should return null when no percentage found', () => {
      const percent = carRentalService.extractDiscountPercent('Great savings');
      expect(percent).toBeNull();
    });
  });

  describe('estimateSavings', () => {
    it('should extract dollar savings with "save" pattern', () => {
      const savings = carRentalService.estimateSavings('Save $50 on your rental');
      expect(savings).toBe(50);
    });

    it('should extract dollar savings with "off" pattern', () => {
      const savings = carRentalService.estimateSavings('Get $25 off');
      expect(savings).toBe(25);
    });

    it('should return null when no savings found', () => {
      const savings = carRentalService.estimateSavings('Great deals available');
      expect(savings).toBeNull();
    });
  });

  describe('calculateConfidence', () => {
    it('should give higher confidence to top positions', () => {
      const item1 = { position: 1, link: 'http://example.com', snippet: '' };
      const item2 = { position: 10, link: 'http://example.com', snippet: '' };
      
      expect(carRentalService.calculateConfidence(item1)).toBeGreaterThan(
        carRentalService.calculateConfidence(item2)
      );
    });

    it('should give higher confidence to rental company domains', () => {
      const item1 = { position: 5, link: 'https://enterprise.com/deals', snippet: '' };
      const item2 = { position: 5, link: 'https://random-blog.com/deals', snippet: '' };
      
      expect(carRentalService.calculateConfidence(item1)).toBeGreaterThan(
        carRentalService.calculateConfidence(item2)
      );
    });

    it('should give higher confidence to results with promo codes', () => {
      const item1 = { position: 5, link: 'http://example.com', snippet: 'Use code: SAVE20' };
      const item2 = { position: 5, link: 'http://example.com', snippet: 'Great deals' };
      
      expect(carRentalService.calculateConfidence(item1)).toBeGreaterThan(
        carRentalService.calculateConfidence(item2)
      );
    });

    it('should cap confidence at 0.95', () => {
      const item = { 
        position: 1, 
        link: 'https://enterprise.com/deals', 
        snippet: 'Use code: SAVE20' 
      };
      
      expect(carRentalService.calculateConfidence(item)).toBeLessThanOrEqual(0.95);
    });
  });

  describe('deduplicateDeals', () => {
    it('should remove duplicate deals based on company and promo code', () => {
      const deals = [
        { company: 'Enterprise', promoCode: 'SAVE20', title: 'Deal 1' },
        { company: 'Enterprise', promoCode: 'SAVE20', title: 'Deal 2' },
        { company: 'Budget', promoCode: 'AAA25', title: 'Deal 3' }
      ];
      
      const result = carRentalService.deduplicateDeals(deals);
      expect(result).toHaveLength(2);
    });
  });

  describe('rankDeals', () => {
    it('should sort deals by confidence first', () => {
      const deals = [
        { confidence: 0.7, discountPercent: 20 },
        { confidence: 0.9, discountPercent: 10 },
        { confidence: 0.8, discountPercent: 25 }
      ];
      
      const result = carRentalService.rankDeals(deals);
      expect(result[0].confidence).toBe(0.9);
    });

    it('should sort by discount when confidence is equal', () => {
      const deals = [
        { confidence: 0.8, discountPercent: 10 },
        { confidence: 0.8, discountPercent: 25 },
        { confidence: 0.8, discountPercent: 15 }
      ];
      
      const result = carRentalService.rankDeals(deals);
      expect(result[0].discountPercent).toBe(25);
    });
  });

  describe('getSampleDeals', () => {
    it('should return sample deals array', () => {
      const samples = carRentalService.getSampleDeals();
      
      expect(Array.isArray(samples)).toBe(true);
      expect(samples.length).toBeGreaterThan(0);
      expect(samples[0]).toHaveProperty('id');
      expect(samples[0]).toHaveProperty('company');
      expect(samples[0]).toHaveProperty('dealType');
    });
  });

  describe('searchCarRentals', () => {
    it('should search and return processed results', async () => {
      const results = await carRentalService.searchCarRentals({
        pickupDate: '2025-01-15',
        returnDate: '2025-01-22'
      });
      
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
