import React, { createContext, useContext, useState, useCallback } from 'react';

interface SerpApiHotel {
  id: string;
  name: string;
  description?: string;
  price?: {
    amount: number;
    currency: string;
  };
  rating?: number;
  reviewCount?: number;
  location: {
    latitude?: number;
    longitude?: number;
    address?: string;
    neighborhood?: string;
  };
  amenities?: string[];
  images?: string[];
  propertyType?: string;
  class?: number;
  checkInTime?: string;
  checkOutTime?: string;
  contact?: any;
  source: string;
  confidence: number;
  lastUpdated: string;
}

interface SerpApiInsight {
  type: string;
  content: string;
  references?: number[];
  query: string;
  source: string;
  timestamp: string;
  confidence: number;
}

interface SerpApiContextType {
  // Hotels
  searchHotels: (options?: any) => Promise<SerpApiHotel[]>;
  searchOrlandoHotels: (options?: any) => Promise<SerpApiHotel[]>;
  hotels: SerpApiHotel[];
  setHotels: React.Dispatch<React.SetStateAction<SerpApiHotel[]>>;
  isLoadingHotels: boolean;
  
  // AI Insights
  searchAIMode: (query: string) => Promise<any>;
  searchTravelInsights: (query: string) => Promise<SerpApiInsight[]>;
  searchOrlandoDeals: () => Promise<SerpApiInsight[]>;
  insights: SerpApiInsight[];
  setInsights: React.Dispatch<React.SetStateAction<SerpApiInsight[]>>;
  isLoadingInsights: boolean;
  
  // Google Light Search
  searchLight: (options?: any) => Promise<any>;
  searchTravelDealsLight: (query: string) => Promise<any[]>;
  searchOrlandoDealsLight: () => Promise<any[]>;
  
  // Combined search
  combinedSearch: (options: any) => Promise<{ hotels: SerpApiHotel[], insights: SerpApiInsight[] }>;
}

const SerpApiContext = createContext<SerpApiContextType | undefined>(undefined);

export const SerpApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hotels, setHotels] = useState<SerpApiHotel[]>([]);
  const [insights, setInsights] = useState<SerpApiInsight[]>([]);
  const [isLoadingHotels, setIsLoadingHotels] = useState(false);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://orlando-savings-engine-production.up.railway.app';

  // Hotel search functions
  const searchHotels = useCallback(async (options = {}) => {
    setIsLoadingHotels(true);
    try {
      const params = new URLSearchParams();
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`${API_BASE_URL}/api/serpapi/hotels/search?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const hotelResults = data.data || [];
      setHotels(hotelResults);
      return hotelResults;
    } catch (error) {
      console.error('Error searching hotels:', error);
      throw error;
    } finally {
      setIsLoadingHotels(false);
    }
  }, [API_BASE_URL]);

  const searchOrlandoHotels = useCallback(async (options = {}) => {
    setIsLoadingHotels(true);
    try {
      const params = new URLSearchParams();
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`${API_BASE_URL}/api/serpapi/hotels/orlando?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const hotelResults = data.data || [];
      setHotels(hotelResults);
      return hotelResults;
    } catch (error) {
      console.error('Error searching Orlando hotels:', error);
      throw error;
    } finally {
      setIsLoadingHotels(false);
    }
  }, [API_BASE_URL]);

  // AI Mode functions
  const searchAIMode = useCallback(async (query: string) => {
    setIsLoadingInsights(true);
    try {
      const params = new URLSearchParams({ q: query });
      const response = await fetch(`${API_BASE_URL}/api/serpapi/ai/search?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error searching AI Mode:', error);
      throw error;
    } finally {
      setIsLoadingInsights(false);
    }
  }, [API_BASE_URL]);

  const searchTravelInsights = useCallback(async (query: string) => {
    setIsLoadingInsights(true);
    try {
      const params = new URLSearchParams({ query });
      const response = await fetch(`${API_BASE_URL}/api/serpapi/ai/travel-insights?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const insightResults = data.data || [];
      setInsights(insightResults);
      return insightResults;
    } catch (error) {
      console.error('Error searching travel insights:', error);
      throw error;
    } finally {
      setIsLoadingInsights(false);
    }
  }, [API_BASE_URL]);

  const searchOrlandoDeals = useCallback(async () => {
    setIsLoadingInsights(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/serpapi/ai/orlando-deals`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const dealResults = data.data || [];
      setInsights(dealResults);
      return dealResults;
    } catch (error) {
      console.error('Error searching Orlando deals:', error);
      throw error;
    } finally {
      setIsLoadingInsights(false);
    }
  }, [API_BASE_URL]);

  // Combined search
  const combinedSearch = useCallback(async (options: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/serpapi/combined-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const hotelResults = data.data.hotels.data || [];
      const insightResults = data.data.insights.data || [];
      
      setHotels(hotelResults);
      setInsights(insightResults);
      
      return {
        hotels: hotelResults,
        insights: insightResults
      };
    } catch (error) {
      console.error('Error in combined search:', error);
      throw error;
    }
  }, [API_BASE_URL]);

  // Google Light Search functions
  const searchLight = useCallback(async (options = {}) => {
    setIsLoadingInsights(true);
    try {
      const params = new URLSearchParams();
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`${API_BASE_URL}/api/serpapi/light/search?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error searching Google Light:', error);
      throw error;
    } finally {
      setIsLoadingInsights(false);
    }
  }, [API_BASE_URL]);

  const searchTravelDealsLight = useCallback(async (query: string) => {
    setIsLoadingInsights(true);
    try {
      const params = new URLSearchParams({ query });
      const response = await fetch(`${API_BASE_URL}/api/serpapi/light/travel-deals?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const dealResults = data.data || [];
      setInsights(dealResults);
      return dealResults;
    } catch (error) {
      console.error('Error searching travel deals light:', error);
      throw error;
    } finally {
      setIsLoadingInsights(false);
    }
  }, [API_BASE_URL]);

  const searchOrlandoDealsLight = useCallback(async () => {
    setIsLoadingInsights(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/serpapi/light/orlando-deals`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const dealResults = data.data || [];
      setInsights(dealResults);
      return dealResults;
    } catch (error) {
      console.error('Error searching Orlando deals light:', error);
      throw error;
    } finally {
      setIsLoadingInsights(false);
    }
  }, [API_BASE_URL]);

  const value = {
    // Hotels
    searchHotels,
    searchOrlandoHotels,
    hotels,
    setHotels,
    isLoadingHotels,
    
    // AI Insights
    searchAIMode,
    searchTravelInsights,
    searchOrlandoDeals,
    insights,
    setInsights,
    isLoadingInsights,
    
    // Google Light Search
    searchLight,
    searchTravelDealsLight,
    searchOrlandoDealsLight,
    
    // Combined search
    combinedSearch,
  };

  return (
    <SerpApiContext.Provider value={value}>
      {children}
    </SerpApiContext.Provider>
  );
};

export const useSerpApi = () => {
  const context = useContext(SerpApiContext);
  if (context === undefined) {
    throw new Error('useSerpApi must be used within a SerpApiProvider');
  }
  return context;
};