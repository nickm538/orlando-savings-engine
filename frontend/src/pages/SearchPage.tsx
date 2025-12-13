import React, { useEffect } from 'react';
import { useSearch } from '../contexts/SearchContext';
import './SearchPage.css';

const SearchPage: React.FC = () => {
  const { searchResults, isSearching, searchQuery } = useSearch();

  if (isSearching) {
    return (
      <div className="search-page">
        <div className="search-container">
          <div className="loading">
            <div className="spinner"></div>
            <p>Searching for "{searchQuery}"...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="search-page">
      <div className="search-container">
        <h1>Search Results</h1>
        <p className="search-query">Query: "{searchQuery}"</p>
        
        {searchResults.length === 0 ? (
          <div className="no-results">
            <p>No results found. Try a different search term.</p>
          </div>
        ) : (
          <>
            <div className="results-summary">
              Found {searchResults.length} results
            </div>
            
            <div className="results-grid">
              {searchResults.map((result, index) => (
                <div key={index} className={`result-card ${result.type}`}>
                  {result.type === 'hotel' && (
                    <>
                      <div className="result-icon">🏨</div>
                      <h3>{result.name}</h3>
                      {result.price && (
                        <p className="price">
                          ${result.price.amount} {result.price.currency}/night
                        </p>
                      )}
                      {result.rating && (
                        <p className="rating">⭐ {result.rating}</p>
                      )}
                    </>
                  )}
                  
                  {result.type === 'insight' && (
                    <>
                      <div className="result-icon">💡</div>
                      <p className="insight-text">{result.content}</p>
                      <p className="insight-query">Source: {result.query}</p>
                    </>
                  )}
                  
                  {result.type === 'deal' && (
                    <>
                      <div className="result-icon">🏷️</div>
                      <p className="deal-text">{result.content}</p>
                      <p className="deal-confidence">{result.confidence}% verified</p>
                    </>
                  )}
                  
                  <div className="result-source">
                    Source: {result.source}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SearchPage;