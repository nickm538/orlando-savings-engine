import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSearch } from '../contexts/SearchContext';
import './Header.css';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { user, isAuthenticated, logout } = useAuth();
  const { performSearch } = useSearch();
  const navigate = useNavigate();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      await performSearch(searchTerm);
      navigate('/search');
    }
  };

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <h1>Orlando Savings Engine</h1>
          <span className="tagline">AI-Powered Travel Deals</span>
        </Link>

        <nav className={`nav ${isMenuOpen ? 'nav-open' : ''}`}>
          <form className="search-form" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search hotels, deals, insights..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-button">
              🔍
            </button>
          </form>

          <div className="nav-links">
            <Link to="/hotels" className="nav-link" onClick={() => setIsMenuOpen(false)}>
              Hotels
            </Link>
            <Link to="/deals" className="nav-link" onClick={() => setIsMenuOpen(false)}>
              Deals
            </Link>
            <Link to="/insights" className="nav-link" onClick={() => setIsMenuOpen(false)}>
              Insights
            </Link>
            <Link to="/codes" className="nav-link" onClick={() => setIsMenuOpen(false)}>
              🔓 Codes
            </Link>
            <Link to="/analyzer" className="nav-link" onClick={() => setIsMenuOpen(false)}>
              Deal Analyzer
            </Link>
            
            {isAuthenticated ? (
              <div className="user-menu">
                <span className="user-name">Hello, {user?.name}</span>
                <button onClick={handleLogout} className="logout-button">
                  Logout
                </button>
              </div>
            ) : (
              <Link to="/" className="nav-link login-button" onClick={() => setIsMenuOpen(false)}>
                Login
              </Link>
            )}
          </div>
        </nav>

        <button
          className="mobile-menu-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? '✕' : '☰'}
        </button>
      </div>
    </header>
  );
};

export default Header;