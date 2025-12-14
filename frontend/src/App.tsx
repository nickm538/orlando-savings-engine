import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SerpApiProvider } from './contexts/SerpApiContext';
import { SearchProvider } from './contexts/SearchContext';
import { AuthProvider } from './contexts/AuthContext';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import DealsPage from './pages/DealsPage';
import HotelsPage from './pages/HotelsPage';
import InsightsPage from './pages/InsightsPage';
import SearchPage from './pages/SearchPage';
import HotelDealAnalyzer from './pages/HotelDealAnalyzer';
import InsiderCodesPage from './pages/InsiderCodesPage';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <SerpApiProvider>
        <SearchProvider>
          <Router>
            <div className="App">
              <Header />
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/deals" element={<DealsPage />} />
                  <Route path="/hotels" element={<HotelsPage />} />
                  <Route path="/insights" element={<InsightsPage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/analyzer" element={<HotelDealAnalyzer />} />
                  <Route path="/codes" element={<InsiderCodesPage />} />
                </Routes>
              </main>
            </div>
          </Router>
        </SearchProvider>
      </SerpApiProvider>
    </AuthProvider>
  );
}

export default App;