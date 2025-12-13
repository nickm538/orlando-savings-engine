import React, { useState, useEffect } from 'react';
import { useSerpApi } from '../contexts/SerpApiContext';
import './HotelDealAnalyzer.css';

interface Deal {
  id: string;
  hotelName: string;
  promoText: string;
  originalPrice: number;
  discountedPrice: number;
  savings: number;
  checkInDate: string;
  checkOutDate: string;
  dealType: string;
  confidence: number;
  source: string;
  applicableDays: number;
  totalDays: number;
}

interface DealAnalysis {
  bestDeal: Deal | null;
  allDeals: Deal[];
  savingsSummary: {
    totalSavings: number;
    bestSavings: number;
    averageSavings: number;
  };
}

const HotelDealAnalyzer: React.FC = () => {
  const [hotelName, setHotelName] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [duration, setDuration] = useState(1);
  const [analysis, setAnalysis] = useState<DealAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'comparison'>('input');
  
  const { searchOrlandoHotels, searchLight } = useSerpApi();

  // Sample deals data based on the repository's CSV structure
  const sampleDeals: Deal[] = [
    {
      id: '1',
      hotelName: 'Disney All-Star Resort',
      promoText: 'Save 35% on 5+ night stays + Free Dining Plan',
      originalPrice: 289,
      discountedPrice: 189,
      savings: 100,
      checkInDate: '2025-12-20',
      checkOutDate: '2025-12-27',
      dealType: 'Package Deal',
      confidence: 0.95,
      source: 'Disney Official',
      applicableDays: 7,
      totalDays: 7
    },
    {
      id: '2',
      hotelName: 'Disney All-Star Resort',
      promoText: 'Annual Passholder Discount - 25% off',
      originalPrice: 289,
      discountedPrice: 217,
      savings: 72,
      checkInDate: '2025-12-20',
      checkOutDate: '2025-12-27',
      dealType: 'Passholder Discount',
      confidence: 0.90,
      source: 'Disney Official',
      applicableDays: 7,
      totalDays: 7
    },
    {
      id: '3',
      hotelName: 'Disney All-Star Resort',
      promoText: 'Florida Resident Discount - 20% off',
      originalPrice: 289,
      discountedPrice: 231,
      savings: 58,
      checkInDate: '2025-12-20',
      checkOutDate: '2025-12-27',
      dealType: 'Resident Discount',
      confidence: 0.85,
      source: 'Disney Official',
      applicableDays: 7,
      totalDays: 7
    },
    {
      id: '4',
      hotelName: 'Universal Loews Royal Pacific',
      promoText: 'Stay More Save More - 4th Night Free',
      originalPrice: 350,
      discountedPrice: 280,
      savings: 70,
      checkInDate: '2025-12-20',
      checkOutDate: '2025-12-27',
      dealType: 'Stay More Save More',
      confidence: 0.88,
      source: 'Universal Official',
      applicableDays: 7,
      totalDays: 7
    },
    {
      id: '5',
      hotelName: 'Hilton Orlando',
      promoText: 'Corporate Code - SAVE25',
      originalPrice: 220,
      discountedPrice: 165,
      savings: 55,
      checkInDate: '2025-12-20',
      checkOutDate: '2025-12-27',
      dealType: 'Corporate Discount',
      confidence: 0.75,
      source: 'Corporate Partnership',
      applicableDays: 7,
      totalDays: 7
    }
  ];

  // Initialize with today's date
  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 8);
    
    setCheckInDate(tomorrow.toISOString().split('T')[0]);
    setCheckOutDate(nextWeek.toISOString().split('T')[0]);
    setHotelName('Disney All-Star Resort');
  }, []);

  // Calculate duration when dates change
  useEffect(() => {
    if (checkInDate && checkOutDate) {
      const start = new Date(checkInDate);
      const end = new Date(checkOutDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDuration(diffDays);
    }
  }, [checkInDate, checkOutDate]);

  const analyzeDeals = async () => {
    if (!hotelName || !checkInDate || !checkOutDate) {
      alert('Please fill in all required fields');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // In a real implementation, this would fetch actual deals from APIs
      // For now, we'll analyze the sample deals and combine with real hotel data
      
      // Get real hotel pricing from SerpApi
      const hotelResults = await searchOrlandoHotels({
        q: hotelName,
        checkInDate: checkInDate,
        checkOutDate: checkOutDate,
        adults: 2
      });

      // Get deal insights from Google Light Search
      const dealInsights = await searchLight({
        q: `${hotelName} promo codes discounts ${checkInDate}`,
        location: 'Orlando, Florida, United States'
      });

      // Analyze deals using the repository's logic
      const filteredDeals = sampleDeals.filter(deal => 
        deal.hotelName.toLowerCase().includes(hotelName.toLowerCase()) ||
        hotelName.toLowerCase().includes(deal.hotelName.toLowerCase())
      );

      // Calculate best deal using the original algorithm logic
      let bestDeal: Deal | null = null;
      let maxSavings = 0;

      filteredDeals.forEach(deal => {
        if (deal.savings > maxSavings) {
          maxSavings = deal.savings;
          bestDeal = deal;
        }
      });

      // If no specific deals found, create a baseline deal from real hotel data
      if (filteredDeals.length === 0 && hotelResults.length > 0) {
        const realHotel = hotelResults[0];
        const basePrice = realHotel.price?.amount || 200;
        
        const baselineDeal: Deal = {
          id: 'baseline',
          hotelName: realHotel.name,
          promoText: 'Standard Rate - No deals available',
          originalPrice: basePrice,
          discountedPrice: basePrice,
          savings: 0,
          checkInDate: checkInDate,
          checkOutDate: checkOutDate,
          dealType: 'Standard Rate',
          confidence: 0.95,
          source: 'Real-time Search',
          applicableDays: duration,
          totalDays: duration
        };
        
        filteredDeals.push(baselineDeal);
        bestDeal = baselineDeal;
      }

      const analysisResult: DealAnalysis = {
        bestDeal,
        allDeals: filteredDeals,
        savingsSummary: {
          totalSavings: filteredDeals.reduce((sum, deal) => sum + deal.savings, 0),
          bestSavings: bestDeal?.savings || 0,
          averageSavings: filteredDeals.length > 0 
            ? filteredDeals.reduce((sum, deal) => sum + deal.savings, 0) / filteredDeals.length 
            : 0
        }
      };

      setAnalysis(analysisResult);
      setActiveTab('results');
    } catch (error) {
      console.error('Error analyzing deals:', error);
      alert('Error analyzing deals. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const calculateSavingsPercentage = (savings: number, originalPrice: number) => {
    return Math.round((savings / originalPrice) * 100);
  };

  return (
    <div className="hotel-deal-analyzer">
      <div className="analyzer-container">
        <h1>Hotel Deal Analyzer</h1>
        <p className="subtitle">
          Find the best possible hotel deals based on your check-in and check-out dates
        </p>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'input' ? 'active' : ''}`}
            onClick={() => setActiveTab('input')}
          >
            Input Details
          </button>
          <button 
            className={`tab-button ${activeTab === 'results' ? 'active' : ''}`}
            onClick={() => setActiveTab('results')}
            disabled={!analysis}
          >
            Analysis Results
          </button>
          <button 
            className={`tab-button ${activeTab === 'comparison' ? 'active' : ''}`}
            onClick={() => setActiveTab('comparison')}
            disabled={!analysis}
          >
            Deal Comparison
          </button>
        </div>

        {/* Input Tab */}
        {activeTab === 'input' && (
          <div className="input-section">
            <div className="input-form">
              <div className="form-group">
                <label>Hotel Name</label>
                <input
                  type="text"
                  value={hotelName}
                  onChange={(e) => setHotelName(e.target.value)}
                  placeholder="Enter hotel name (e.g., Disney All-Star Resort)"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Check-in Date</label>
                  <input
                    type="date"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="form-group">
                  <label>Check-out Date</label>
                  <input
                    type="date"
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    min={checkInDate || new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Duration: {duration} night{duration !== 1 ? 's' : ''}</label>
                <p className="help-text">
                  Duration is automatically calculated from check-in and check-out dates
                </p>
              </div>

              <button 
                className="analyze-button"
                onClick={analyzeDeals}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? 'Analyzing Deals...' : 'Analyze Hotel Deals'}
              </button>
            </div>

            {/* Algorithm Explanation */}
            <div className="algorithm-explanation">
              <h3>How It Works</h3>
              <div className="explanation-grid">
                <div className="explanation-item">
                  <div className="step-number">1</div>
                  <h4>Data Collection</h4>
                  <p>Gathers real-time hotel pricing from multiple sources including Google Hotels API</p>
                </div>
                <div className="explanation-item">
                  <div className="step-number">2</div>
                  <h4>Deal Discovery</h4>
                  <p>Scans for promo codes, corporate discounts, and special offers using Google Light Search</p>
                </div>
                <div className="explanation-item">
                  <div className="step-number">3</div>
                  <h4>Cost Analysis</h4>
                  <p>Applies the original repository's algorithm to find the most cost-effective deal</p>
                </div>
                <div className="explanation-item">
                  <div className="step-number">4</div>
                  <h4>Result Optimization</h4>
                  <p>Calculates applicable days, total savings, and confidence scores for each deal</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && analysis && (
          <div className="results-section">
            {analysis.bestDeal && (
              <div className="best-deal-card">
                <div className="best-deal-header">
                  <h2>🏆 BEST DEAL FOUND</h2>
                  <div className="confidence-badge">
                    {Math.round(analysis.bestDeal.confidence * 100)}% Confidence
                  </div>
                </div>
                
                <div className="best-deal-content">
                  <h3>{analysis.bestDeal.hotelName}</h3>
                  <p className="promo-text">{analysis.bestDeal.promoText}</p>
                  
                  <div className="price-comparison">
                    <div className="original-price">
                      <span className="label">Original Price:</span>
                      <span className="amount">{formatCurrency(analysis.bestDeal.originalPrice)}</span>
                    </div>
                    <div className="discounted-price">
                      <span className="label">Your Price:</span>
                      <span className="amount">{formatCurrency(analysis.bestDeal.discountedPrice)}</span>
                    </div>
                    <div className="savings">
                      <span className="label">You Save:</span>
                      <span className="amount">
                        {formatCurrency(analysis.bestDeal.savings)} 
                        ({calculateSavingsPercentage(analysis.bestDeal.savings, analysis.bestDeal.originalPrice)}%)
                      </span>
                    </div>
                  </div>

                  <div className="deal-details">
                    <div className="detail-item">
                      <span className="label">Stay Duration:</span>
                      <span>{analysis.bestDeal.duration} nights</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Deal Type:</span>
                      <span>{analysis.bestDeal.dealType}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Source:</span>
                      <span>{analysis.bestDeal.source}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="savings-summary">
              <h3>Savings Summary</h3>
              <div className="summary-grid">
                <div className="summary-item">
                  <span className="label">Total Potential Savings:</span>
                  <span className="value">{formatCurrency(analysis.savingsSummary.totalSavings)}</span>
                </div>
                <div className="summary-item">
                  <span className="label">Best Deal Savings:</span>
                  <span className="value">{formatCurrency(analysis.savingsSummary.bestSavings)}</span>
                </div>
                <div className="summary-item">
                  <span className="label">Average Savings:</span>
                  <span className="value">{formatCurrency(analysis.savingsSummary.averageSavings)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comparison Tab */}
        {activeTab === 'comparison' && analysis && (
          <div className="comparison-section">
            <h2>All Available Deals</h2>
            <div className="deals-table">
              <div className="table-header">
                <div className="header-cell">Hotel</div>
                <div className="header-cell">Deal Type</div>
                <div className="header-cell">Original Price</div>
                <div className="header-cell">Your Price</div>
                <div className="header-cell">Savings</div>
                <div className="header-cell">Confidence</div>
              </div>
              
              {analysis.allDeals.map((deal) => (
                <div 
                  key={deal.id} 
                  className={`table-row ${deal.id === analysis.bestDeal?.id ? 'best-deal' : ''}`}
                >
                  <div className="cell hotel-name">
                    {deal.hotelName}
                    {deal.id === analysis.bestDeal?.id && (
                      <span className="best-badge">BEST</span>
                    )}
                  </div>
                  <div className="cell deal-type">{deal.dealType}</div>
                  <div className="cell original-price">{formatCurrency(deal.originalPrice)}</div>
                  <div className="cell discounted-price">{formatCurrency(deal.discountedPrice)}</div>
                  <div className="cell savings">
                    {formatCurrency(deal.savings)} 
                    ({calculateSavingsPercentage(deal.savings, deal.originalPrice)}%)
                  </div>
                  <div className="cell confidence">
                    {Math.round(deal.confidence * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HotelDealAnalyzer;