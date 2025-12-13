import React, { useState, useEffect } from 'react';
import { useSearch } from '../contexts/SearchContext';
import { useSerpApi } from '../contexts/SerpApiContext';
import './HotelsPage.css';

const HotelsPage: React.FC = () => {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [rating, setRating] = useState(0);
  
  const { searchHotels, isSearching } = useSearch();
  const { hotels, searchOrlandoHotels } = useSerpApi();

  useEffect(() => {
    // Load Orlando hotels on page load
    const loadInitialHotels = async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 8);
      
      setCheckIn(tomorrow.toISOString().split('T')[0]);
      setCheckOut(nextWeek.toISOString().split('T')[0]);
      
      await searchOrlandoHotels({
        checkInDate: tomorrow.toISOString().split('T')[0],
        checkOutDate: nextWeek.toISOString().split('T')[0],
        adults: guests,
        sortBy: 3 // Lowest price
      });
    };
    
    loadInitialHotels();
  }, [searchOrlandoHotels]);

  const handleSearch = async () => {
    if (checkIn && checkOut) {
      await searchHotels('Orlando, FL', checkIn, checkOut, guests);
    }
  };

  const handleFilterChange = async () => {
    await searchOrlandoHotels({
      checkInDate: checkIn,
      checkOutDate: checkOut,
      adults: guests,
      minPrice: priceRange[0],
      maxPrice: priceRange[1],
      rating: rating || undefined,
      sortBy: 3
    });
  };

  return (
    <div className="hotels-page">
      <div className="hotels-container">
        <h1>Orlando Hotels</h1>
        <p className="subtitle">Find the best hotel deals with our AI-powered search</p>

        {/* Search Form */}
        <div className="search-form">
          <div className="form-row">
            <div className="form-group">
              <label>Check-in Date</label>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div className="form-group">
              <label>Check-out Date</label>
              <input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                min={checkIn || new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div className="form-group">
              <label>Guests</label>
              <select
                value={guests}
                onChange={(e) => setGuests(parseInt(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                  <option key={num} value={num}>{num} {num === 1 ? 'Guest' : 'Guests'}</option>
                ))}
              </select>
            </div>
            
            <button 
              className="search-button"
              onClick={handleSearch}
              disabled={isSearching}
            >
              {isSearching ? 'Searching...' : 'Search Hotels'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="filters">
          <div className="filter-group">
            <label>Price Range: ${priceRange[0]} - ${priceRange[1]}</label>
            <div className="price-inputs">
              <input
                type="range"
                min="0"
                max="500"
                value={priceRange[0]}
                onChange={(e) => {
                  setPriceRange([parseInt(e.target.value), priceRange[1]]);
                  handleFilterChange();
                }}
              />
              <input
                type="range"
                min="0"
                max="500"
                value={priceRange[1]}
                onChange={(e) => {
                  setPriceRange([priceRange[0], parseInt(e.target.value)]);
                  handleFilterChange();
                }}
              />
            </div>
          </div>
          
          <div className="filter-group">
            <label>Minimum Rating</label>
            <select
              value={rating}
              onChange={(e) => {
                setRating(parseInt(e.target.value));
                handleFilterChange();
              }}
            >
              <option value="0">Any Rating</option>
              <option value="7">3.5+ Stars</option>
              <option value="8">4.0+ Stars</option>
              <option value="9">4.5+ Stars</option>
            </select>
          </div>
        </div>

        {/* Results */}
        <div className="results">
          {isSearching ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Searching for the best hotel deals...</p>
            </div>
          ) : (
            <>
              <div className="results-header">
                <h2>Found {hotels.length} Hotels</h2>
                <p>Powered by Google Hotels API via SerpApi</p>
              </div>
              
              <div className="hotels-grid">
                {hotels.map((hotel) => (
                  <div key={hotel.id} className="hotel-card">
                    <div className="hotel-image">
                      {hotel.images && hotel.images.length > 0 ? (
                        <img src={hotel.images[0]} alt={hotel.name} />
                      ) : (
                        <div className="placeholder-image">🏨</div>
                      )}
                    </div>
                    
                    <div className="hotel-info">
                      <h3>{hotel.name}</h3>
                      {hotel.description && (
                        <p className="hotel-description">{hotel.description}</p>
                      )}
                      
                      <div className="hotel-details">
                        {hotel.rating && (
                          <div className="rating">
                            <span className="stars">{'★'.repeat(Math.floor(hotel.rating))}</span>
                            <span className="rating-value">{hotel.rating}</span>
                            {hotel.reviewCount && (
                              <span className="reviews">({hotel.reviewCount} reviews)</span>
                            )}
                          </div>
                        )}
                        
                        {hotel.location && hotel.location.neighborhood && (
                          <p className="location">📍 {hotel.location.neighborhood}</p>
                        )}
                        
                        {hotel.propertyType && (
                          <p className="property-type">{hotel.propertyType}</p>
                        )}
                      </div>
                      
                      {hotel.price && (
                        <div className="price-section">
                          <div className="price">
                            <span className="currency">{hotel.price.currency}</span>
                            <span className="amount">{hotel.price.amount}</span>
                            <span className="per-night">/night</span>
                          </div>
                          <span className="confidence">{Math.round(hotel.confidence * 100)}% match</span>
                        </div>
                      )}
                      
                      <div className="hotel-actions">
                        <button className="view-deal-button">
                          View Deal
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HotelsPage;