import React, { createContext, useContext, useState, useCallback } from 'react';
import { useSerpApi } from './SerpApiContext';

interface SearchFilters {
  priceRange: [number, number];
  rating: number;
  amenities: string[];
  propertyTypes: string[];
  sortBy: string;
}

interface SearchContextType {
  // Search state
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  filters: SearchFilters;
  setFilters: React.Dispatch<React.SetStateAction<SearchFilters>>;
  searchResults: any[];
  setSearchResults: React.Dispatch<React.SetStateAction<any[]>>;
  isSearching: boolean;
  
  // Search functions
  performSearch: (query?: string, searchFilters?: Partial<SearchFilters>) => Promise<void>;
  searchHotels: (location: string, checkIn: string, checkOut: string, guests: number) => Promise<void>;
  searchDeals: (category: string) => Promise<void>;
  clearSearch: () => void;
  
  // Results
  hotels: any[];
  deals: any[];
  insights: any[];
  combinedResults: any[];
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    priceRange: [0, 1000],
    rating: 0,
    amenities: [],
    propertyTypes: [],
    sortBy: 'relevance'
  });
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hotels, setHotels] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [combinedResults, setCombinedResults] = useState<any[]>([]);

  // Use SerpApi context
  const {
    searchOrlandoHotels,
    searchTravelInsights,
    searchOrlandoDeals,
    combinedSearch,
    hotels: serpApiHotels,
    insights: serpApiInsights,
    isLoadingHotels,
    isLoadingInsights
  } = useSerpApi();

  const performSearch = useCallback(async (query?: string, searchFilters?: Partial<SearchFilters>) => {
    setIsSearching(true);
    try {
      const finalQuery = query || searchQuery;
      const finalFilters = { ...filters, ...searchFilters };
      
      // Perform combined search using SerpApi
      const results = await combinedSearch({
        hotel_query: finalQuery,
        insights_query: finalQuery,
        min_price: finalFilters.priceRange[0],
        max_price: finalFilters.priceRange[1],
        rating: finalFilters.rating || undefined
      });

      setHotels(results.hotels);
      setInsights(results.insights);
      
      // Combine and process results
      const allResults = [
        ...results.hotels.map((hotel: any) => ({ ...hotel, type: 'hotel', source: 'serpapi' })),
        ...results.insights.map((insight: any) => ({ ...insight, type: 'insight', source: 'serpapi' }))
      ];
      
      setCombinedResults(allResults);
      setSearchResults(allResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, filters, combinedSearch]);

  const searchHotels = useCallback(async (location: string, checkIn: string, checkOut: string, guests: number) => {
    setIsSearching(true);
    try {
      const results = await searchOrlandoHotels({
        q: `hotels in ${location}`,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        adults: guests
      });
      
      setHotels(results);
      setSearchResults(results);
    } catch (error) {
      console.error('Hotel search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchOrlandoHotels]);

  const searchDeals = useCallback(async (category: string) => {
    setIsSearching(true);
    try {
      let results;
      
      if (category === 'orlando' || category === 'all') {
        results = await searchOrlandoDeals();
      } else {
        results = await searchTravelInsights(`${category} deals Orlando`);
      }
      
      setDeals(results);
      setInsights(results);
      
      const dealResults = results.map((deal: any) => ({ ...deal, type: 'deal', source: 'serpapi' }));
      setSearchResults(dealResults);
    } catch (error) {
      console.error('Deal search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchOrlandoDeals, searchTravelInsights]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setHotels([]);
    setDeals([]);
    setInsights([]);
    setCombinedResults([]);
    setFilters({
      priceRange: [0, 1000],
      rating: 0,
      amenities: [],
      propertyTypes: [],
      sortBy: 'relevance'
    });
  }, []);

  const value = {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    searchResults,
    setSearchResults,
    isSearching: isSearching || isLoadingHotels || isLoadingInsights,
    performSearch,
    searchHotels,
    searchDeals,
    clearSearch,
    hotels: hotels.length > 0 ? hotels : serpApiHotels,
    deals,
    insights: insights.length > 0 ? insights : serpApiInsights,
    combinedResults
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};