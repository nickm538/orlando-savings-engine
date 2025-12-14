import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSearch } from '../contexts/SearchContext';
import { useSerpApi } from '../contexts/SerpApiContext';
import './HomePage.css';

const HomePage: React.FC = () => {
  // Quick search with navigation to hotels page
  const navigate = useNavigate();
  const { isSearching, performSearch } = useSearch();
  const { searchOrlandoDeals, insights } = useSerpApi();

  useEffect(() => {
    // Load Orlando deals on homepage load
    searchOrlandoDeals();
  }, [searchOrlandoDeals]);

  const handleQuickSearch = async (category: string) => {
    await performSearch(`${category} Orlando Florida`);
    navigate('/hotels');
  };

  return (
    <div className="homepage">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Discover Orlando's Best Travel Deals
          </h1>
          <p className="hero-subtitle">
            AI-powered search engine that scans the web for exclusive discounts, 
            secret promo codes, and hidden travel deals in Orlando and beyond.
          </p>
          
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-number">250+</span>
              <span className="stat-label">API Calls/Month</span>
            </div>
            <div className="stat">
              <span className="stat-number">∞</span>
              <span className="stat-label">Web Sources</span>
            </div>
            <div className="stat">
              <span className="stat-number">95%</span>
              <span className="stat-label">Accuracy</span>
            </div>
          </div>

          <div className="hero-actions">
            <Link to="/hotels" className="cta-button primary">
              Search Hotels
            </Link>
            <Link to="/deals" className="cta-button secondary">
              Browse Deals
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Search Categories */}
      <section className="quick-search">
        <h2>Quick Search</h2>
        <div className="search-categories">
          <button 
            className="category-card" 
            onClick={() => handleQuickSearch('Disney World hotels')}
            disabled={isSearching}
          >
            <div className="category-icon">🏰</div>
            <h3>Disney World</h3>
            <p>Hotels & Packages</p>
          </button>

          <button 
            className="category-card" 
            onClick={() => handleQuickSearch('Universal Studios hotels')}
            disabled={isSearching}
          >
            <div className="category-icon">🎢</div>
            <h3>Universal Studios</h3>
            <p>Resorts & Tickets</p>
          </button>

          <button 
            className="category-card" 
            onClick={() => handleQuickSearch('Orlando vacation rentals')}
            disabled={isSearching}
          >
            <div className="category-icon">🏠</div>
            <h3>Vacation Rentals</h3>
            <p>Homes & Condos</p>
          </button>

          <button 
            className="category-card" 
            onClick={() => handleQuickSearch('Orlando car rentals')}
            disabled={isSearching}
          >
            <div className="category-icon">🚗</div>
            <h3>Car Rentals</h3>
            <p>Best Rates Guaranteed</p>
          </button>
        </div>
      </section>

      {/* Live Insights */}
      <section className="live-insights">
        <h2>Live Travel Insights</h2>
        <div className="insights-grid">
          {insights.slice(0, 6).map((insight, index) => (
            <div key={index} className="insight-card">
              <div className="insight-type">{insight.type}</div>
              <p className="insight-content">{insight.content}</p>
              <div className="insight-meta">
                <span className="confidence">{insight.confidence}% confidence</span>
                <span className="source">{insight.source}</span>
              </div>
            </div>
          ))}
        </div>
        
        {insights.length > 6 && (
          <Link to="/insights" className="view-all-link">
            View All Insights →
          </Link>
        )}
      </section>

      {/* Features */}
      <section className="features">
        <h2>Why Choose Our Engine?</h2>
        <div className="features-grid">
          <div className="feature">
            <div className="feature-icon">🤖</div>
            <h3>AI-Powered Search</h3>
            <p>Advanced algorithms scan multiple sources including Google Hotels, AI Mode, and deep web findings.</p>
          </div>

          <div className="feature">
            <div className="feature-icon">💰</div>
            <h3>Exclusive Deals</h3>
            <p>Find discounts and promo codes not available to the general public through our comprehensive scanning.</p>
          </div>

          <div className="feature">
            <div className="feature-icon">⚡</div>
            <h3>Real-Time Results</h3>
            <p>Get the most current pricing and availability with live data from multiple travel APIs.</p>
          </div>

          <div className="feature">
            <div className="feature-icon">🎯</div>
            <h3>Orlando Focused</h3>
            <p>Specialized in Orlando and Central Florida travel with deep local knowledge and connections.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;