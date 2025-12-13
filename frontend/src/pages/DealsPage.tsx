import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSearch } from '../contexts/SearchContext';
import './DealsPage.css';

const DealsPage: React.FC = () => {
  const { searchDeals, deals, isSearching } = useSearch();

  useEffect(() => {
    searchDeals('orlando');
  }, [searchDeals]);

  return (
    <div className="deals-page">
      <div className="deals-container">
        <h1>Exclusive Travel Deals</h1>
        <p className="subtitle">AI-discovered discounts and secret promo codes</p>

        {isSearching ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Scanning for the best deals...</p>
          </div>
        ) : (
          <div className="deals-grid">
            {deals.map((deal, index) => (
              <div key={index} className="deal-card">
                <div className="deal-header">
                  <span className="deal-type">{deal.type}</span>
                  <span className="confidence">{deal.confidence}% verified</span>
                </div>
                
                <div className="deal-content">
                  <p className="deal-text">{deal.content}</p>
                  <p className="deal-query">Found via: {deal.query}</p>
                </div>
                
                <div className="deal-footer">
                  <span className="deal-source">Source: {deal.source}</span>
                  <Link to="/insights" className="learn-more">
                    Learn More →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DealsPage;