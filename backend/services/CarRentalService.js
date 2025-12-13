const axios = require('axios');
const SerpApiService = require('./SerpApiService');

/**
 * Car Rental Service
 * Discovers car rental deals for Orlando using SerpApi Google Search
 * and processes results to find the best rates
 */
class CarRentalService {
  constructor() {
    this.serpApi = new SerpApiService();
    this.popularRentalCompanies = [
      'Enterprise', 'Hertz', 'Budget', 'Avis', 'National',
      'Alamo', 'Dollar', 'Thrifty', 'Sixt', 'Fox Rent A Car'
    ];
    this.orlandoLocations = [
      'MCO Airport',
      'Orlando International Airport',
      'Disney World',
      'Universal Studios',
      'International Drive',
      'Kissimmee'
    ];
  }

  /**
   * Search for car rental deals using Google Light Search
   * @param {Object} options - Search parameters
   * @param {string} options.pickupDate - Pickup date (YYYY-MM-DD)
   * @param {string} options.returnDate - Return date (YYYY-MM-DD)
   * @param {string} options.pickupLocation - Pickup location (default: MCO Airport)
   * @param {string} options.carType - Car type preference (economy, midsize, suv, luxury)
   */
  async searchCarRentals(options = {}) {
    const {
      pickupDate = this.getDefaultPickupDate(),
      returnDate = this.getDefaultReturnDate(),
      pickupLocation = 'MCO Airport',
      carType = ''
    } = options;

    const searchQueries = this.buildSearchQueries(pickupLocation, carType, pickupDate);
    const results = [];

    for (const query of searchQueries) {
      try {
        const searchResult = await this.serpApi.searchLight({
          q: query,
          location: 'Orlando, Florida, United States',
          gl: 'us',
          hl: 'en'
        });

        if (searchResult.organic_results) {
          results.push({
            query,
            data: searchResult
          });
        }
      } catch (error) {
        console.error(`Car rental search failed for: ${query}`, error.message);
      }
    }

    return this.processCarRentalResults(results, {
      pickupDate,
      returnDate,
      pickupLocation
    });
  }

  /**
   * Build optimized search queries for car rental deals
   */
  buildSearchQueries(location, carType, date) {
    const baseQueries = [
      `Orlando car rental deals ${carType} ${date}`,
      `MCO airport car rental discount codes`,
      `Orlando car rental promo codes coupons`,
      `cheap car rental Orlando Florida`,
      `${location} car rental best rates`,
      `Orlando car rental corporate discount codes`,
      `Florida car rental AAA discount`,
      `Orlando rental car military discount`,
      `Costco car rental Orlando deals`,
      `Orlando weekly car rental specials`
    ];

    // Add company-specific searches
    const companyQueries = this.popularRentalCompanies.slice(0, 5).map(company =>
      `${company} car rental Orlando promo code discount`
    );

    return [...baseQueries, ...companyQueries];
  }

  /**
   * Search for deals from specific rental companies
   * @param {string} company - Rental company name
   * @param {Object} options - Search options
   */
  async searchByCompany(company, options = {}) {
    const {
      pickupDate = this.getDefaultPickupDate(),
      returnDate = this.getDefaultReturnDate()
    } = options;

    const queries = [
      `${company} Orlando car rental promo code ${pickupDate}`,
      `${company} MCO airport discount code`,
      `${company} car rental coupon Florida`,
      `${company} corporate rate Orlando`
    ];

    const results = [];

    for (const query of queries) {
      try {
        const searchResult = await this.serpApi.searchLight({
          q: query,
          location: 'Orlando, Florida, United States'
        });

        if (searchResult.organic_results) {
          results.push({
            query,
            company,
            data: searchResult
          });
        }
      } catch (error) {
        console.error(`Company search failed for ${company}: ${query}`, error.message);
      }
    }

    return this.processCompanyResults(results, company);
  }

  /**
   * Get car rental deals for all major companies
   */
  async getAllCompanyDeals(options = {}) {
    const allDeals = [];

    for (const company of this.popularRentalCompanies) {
      try {
        const companyDeals = await this.searchByCompany(company, options);
        allDeals.push(...companyDeals);
      } catch (error) {
        console.error(`Failed to get deals for ${company}:`, error.message);
      }
    }

    return this.rankDeals(allDeals);
  }

  /**
   * Process and structure car rental search results
   */
  processCarRentalResults(results, searchParams) {
    const deals = [];

    results.forEach(result => {
      if (result.data && result.data.organic_results) {
        result.data.organic_results.forEach(item => {
          if (this.isCarRentalResult(item)) {
            const deal = this.extractDealInfo(item, result.query, searchParams);
            if (deal) {
              deals.push(deal);
            }
          }
        });
      }
    });

    // Remove duplicates and rank by confidence
    const uniqueDeals = this.deduplicateDeals(deals);
    return this.rankDeals(uniqueDeals);
  }

  /**
   * Process company-specific results
   */
  processCompanyResults(results, company) {
    const deals = [];

    results.forEach(result => {
      if (result.data && result.data.organic_results) {
        result.data.organic_results.forEach(item => {
          if (this.isCarRentalResult(item)) {
            deals.push({
              id: `${company}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              company: company,
              title: item.title,
              description: item.snippet,
              link: item.link,
              position: item.position,
              dealType: this.extractDealType(item.title, item.snippet),
              promoCode: this.extractPromoCode(item.snippet),
              discountPercent: this.extractDiscountPercent(item.snippet),
              source: 'serpapi_google_light',
              confidence: this.calculateConfidence(item, company),
              timestamp: new Date().toISOString()
            });
          }
        });
      }
    });

    return deals;
  }

  /**
   * Check if a search result is related to car rentals
   */
  isCarRentalResult(item) {
    const keywords = [
      'car rental', 'rent a car', 'rental car', 'vehicle rental',
      'auto rental', 'car hire', 'discount', 'promo', 'coupon',
      'deal', 'rate', 'price', ...this.popularRentalCompanies.map(c => c.toLowerCase())
    ];

    const text = `${item.title} ${item.snippet}`.toLowerCase();
    return keywords.some(keyword => text.includes(keyword.toLowerCase()));
  }

  /**
   * Extract deal information from a search result
   */
  extractDealInfo(item, query, searchParams) {
    const snippet = item.snippet || '';
    const title = item.title || '';

    return {
      id: `car_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: title,
      description: snippet,
      link: item.link,
      position: item.position,
      query: query,
      company: this.identifyCompany(title, snippet),
      dealType: this.extractDealType(title, snippet),
      promoCode: this.extractPromoCode(snippet),
      discountPercent: this.extractDiscountPercent(snippet),
      estimatedSavings: this.estimateSavings(snippet),
      pickupLocation: searchParams.pickupLocation,
      pickupDate: searchParams.pickupDate,
      returnDate: searchParams.returnDate,
      source: 'serpapi_google_light',
      confidence: this.calculateConfidence(item),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Identify which rental company a deal is for
   */
  identifyCompany(title, snippet) {
    const text = `${title} ${snippet}`.toLowerCase();
    
    for (const company of this.popularRentalCompanies) {
      if (text.includes(company.toLowerCase())) {
        return company;
      }
    }
    
    return 'Various';
  }

  /**
   * Extract deal type from text
   */
  extractDealType(title, snippet) {
    const text = `${title} ${snippet}`.toLowerCase();

    if (text.includes('corporate') || text.includes('business')) return 'Corporate Discount';
    if (text.includes('aaa')) return 'AAA Member Discount';
    if (text.includes('military') || text.includes('veteran')) return 'Military Discount';
    if (text.includes('costco')) return 'Costco Member Deal';
    if (text.includes('promo code') || text.includes('coupon code')) return 'Promo Code';
    if (text.includes('weekly') || text.includes('week')) return 'Weekly Special';
    if (text.includes('weekend')) return 'Weekend Deal';
    if (text.includes('free upgrade')) return 'Free Upgrade';
    if (text.includes('free day') || text.includes('day free')) return 'Free Day Offer';

    return 'General Discount';
  }

  /**
   * Extract promo code from text using regex
   */
  extractPromoCode(text) {
    // Common promo code patterns
    const patterns = [
      /code[:\s]+["']?([A-Z0-9]{4,15})["']?/i,
      /promo[:\s]+["']?([A-Z0-9]{4,15})["']?/i,
      /coupon[:\s]+["']?([A-Z0-9]{4,15})["']?/i,
      /use[:\s]+["']?([A-Z0-9]{4,15})["']?/i,
      /["']([A-Z]{2,}[0-9]{2,}[A-Z0-9]*)["']/
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].toUpperCase();
      }
    }

    return null;
  }

  /**
   * Extract discount percentage from text
   */
  extractDiscountPercent(text) {
    const patterns = [
      /(\d{1,2})%\s*off/i,
      /save\s*(\d{1,2})%/i,
      /(\d{1,2})%\s*discount/i,
      /up to\s*(\d{1,2})%/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return parseInt(match[1]);
      }
    }

    return null;
  }

  /**
   * Estimate savings in dollars from text
   */
  estimateSavings(text) {
    const patterns = [
      /save\s*\$(\d+)/i,
      /\$(\d+)\s*off/i,
      /up to\s*\$(\d+)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return parseInt(match[1]);
      }
    }

    return null;
  }

  /**
   * Calculate confidence score for a deal
   */
  calculateConfidence(item, company = null) {
    let confidence = 0.6;

    // Higher confidence for top search results
    if (item.position && item.position <= 3) confidence += 0.15;
    else if (item.position && item.position <= 5) confidence += 0.1;

    // Higher confidence for known rental company sites
    if (item.link) {
      const rentalDomains = [
        'enterprise.com', 'hertz.com', 'budget.com', 'avis.com',
        'nationalcar.com', 'alamo.com', 'dollar.com', 'thrifty.com',
        'sixt.com', 'foxrentacar.com', 'costcotravel.com', 'autoslash.com'
      ];
      
      if (rentalDomains.some(domain => item.link.includes(domain))) {
        confidence += 0.15;
      }
    }

    // Higher confidence for results with promo codes
    if (item.snippet && this.extractPromoCode(item.snippet)) {
      confidence += 0.1;
    }

    // Cap at 0.95
    return Math.min(confidence, 0.95);
  }

  /**
   * Remove duplicate deals
   */
  deduplicateDeals(deals) {
    const seen = new Map();

    return deals.filter(deal => {
      const key = `${deal.company}_${deal.promoCode || deal.title}`.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.set(key, true);
      return true;
    });
  }

  /**
   * Rank deals by confidence and potential savings
   */
  rankDeals(deals) {
    return deals.sort((a, b) => {
      // Primary sort: confidence
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      // Secondary sort: discount percentage
      const aDiscount = a.discountPercent || 0;
      const bDiscount = b.discountPercent || 0;
      return bDiscount - aDiscount;
    });
  }

  /**
   * Get default pickup date (tomorrow)
   */
  getDefaultPickupDate() {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  }

  /**
   * Get default return date (1 week from tomorrow)
   */
  getDefaultReturnDate() {
    const date = new Date();
    date.setDate(date.getDate() + 8);
    return date.toISOString().split('T')[0];
  }

  /**
   * Get sample deals for demonstration
   */
  getSampleDeals() {
    return [
      {
        id: 'sample_1',
        company: 'Enterprise',
        title: 'Enterprise Weekend Special',
        description: 'Save 10% on weekend rentals at Orlando MCO. Use code WKND10 at checkout.',
        dealType: 'Weekend Deal',
        promoCode: 'WKND10',
        discountPercent: 10,
        estimatedSavings: 25,
        confidence: 0.90,
        source: 'sample'
      },
      {
        id: 'sample_2',
        company: 'Budget',
        title: 'Budget AAA Member Discount',
        description: 'AAA members save up to 25% on car rentals. Show your membership card.',
        dealType: 'AAA Member Discount',
        promoCode: null,
        discountPercent: 25,
        estimatedSavings: 50,
        confidence: 0.85,
        source: 'sample'
      },
      {
        id: 'sample_3',
        company: 'Alamo',
        title: 'Alamo Free Upgrade Offer',
        description: 'Book economy, get free upgrade to midsize at MCO airport locations.',
        dealType: 'Free Upgrade',
        promoCode: 'UPGRADE24',
        discountPercent: null,
        estimatedSavings: 40,
        confidence: 0.80,
        source: 'sample'
      },
      {
        id: 'sample_4',
        company: 'Costco',
        title: 'Costco Travel Car Rental',
        description: 'Costco members get exclusive rates plus additional driver free. No promo code needed.',
        dealType: 'Costco Member Deal',
        promoCode: null,
        discountPercent: 20,
        estimatedSavings: 45,
        confidence: 0.88,
        source: 'sample'
      }
    ];
  }
}

module.exports = CarRentalService;
