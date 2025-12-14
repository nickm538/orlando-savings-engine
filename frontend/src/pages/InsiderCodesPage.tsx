import React, { useState } from 'react';

interface Code {
  code: string | null;
  type: string;
  description: string;
  source: string;
  query: string;
  engine: string;
  confidence: number;
  found_at: string;
}

const InsiderCodesPage: React.FC = () => {
  const [hotelResults, setHotelResults] = useState<Code[]>([]);
  const [themeParkResults, setThemeParkResults] = useState<Code[]>([]);
  const [hotelLoading, setHotelLoading] = useState(false);
  const [themeParkLoading, setThemeParkLoading] = useState(false);

  // Hotel form state
  const [hotelName, setHotelName] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [hotelUserType, setHotelUserType] = useState('general');

  // Theme park form state
  const [themePark, setThemePark] = useState('Disney World');
  const [parkUserType, setParkUserType] = useState('general');

  const searchHotelCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotelName.trim()) return;

    setHotelLoading(true);
    setHotelResults([]);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'https://orlando-savings-engine-production.up.railway.app'}/api/serpapi/insider-codes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            searchType: 'hotel',
            hotelName,
            checkIn,
            checkOut,
            userType: hotelUserType
          })
        }
      );

      const data = await response.json();
      if (data.success) {
        setHotelResults(data.data);
      }
    } catch (error) {
      console.error('Hotel search error:', error);
    } finally {
      setHotelLoading(false);
    }
  };

  const searchThemeParkCodes = async (e: React.FormEvent) => {
    e.preventDefault();

    setThemeParkLoading(true);
    setThemeParkResults([]);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'https://orlando-savings-engine-production.up.railway.app'}/api/serpapi/insider-codes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            searchType: 'themepark',
            themePark,
            userType: parkUserType
          })
        }
      );

      const data = await response.json();
      if (data.success) {
        setThemeParkResults(data.data);
      }
    } catch (error) {
      console.error('Theme park search error:', error);
    } finally {
      setThemeParkLoading(false);
    }
  };

  const getCodeTypeBadge = (type: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      insider: { color: 'bg-red-500', label: 'INSIDER' },
      price_error: { color: 'bg-orange-500', label: 'PRICE ERROR' },
      secret: { color: 'bg-purple-500', label: 'SECRET' },
      student: { color: 'bg-blue-500', label: 'STUDENT' },
      first_responder: { color: 'bg-green-500', label: 'FIRST RESPONDER' },
      promo_code: { color: 'bg-indigo-500', label: 'PROMO CODE' },
      deal: { color: 'bg-gray-500', label: 'DEAL' }
    };

    const badge = badges[type] || badges.deal;
    return (
      <span className={`${badge.color} text-white text-xs px-2 py-1 rounded font-bold`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">🔓 Insider Codes & Secret Deals</h1>
        <p className="text-gray-600">
          Deep web searches for hidden promo codes, price errors, and exclusive discounts
        </p>
        <p className="text-sm text-gray-500 mt-2">
          ⚡ Aggressive search • 💎 Insider access • 🎯 Occupational discounts
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Hotel Search Form */}
        <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-purple-200">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            🏨 Hotel Insider Codes
          </h2>
          
          <form onSubmit={searchHotelCodes}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Hotel Name</label>
              <input
                type="text"
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
                placeholder="e.g., Hilton Orlando, Marriott"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Check-in</label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Check-out</label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">I am a...</label>
              <select
                value={hotelUserType}
                onChange={(e) => setHotelUserType(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="general">General Public</option>
                <option value="emt">EMT / First Responder</option>
                <option value="student">Student (.edu)</option>
                <option value="nonprofit">Nonprofit Worker</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={hotelLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50"
            >
              {hotelLoading ? '🔍 Searching Deep Web...' : '🔓 Find Hotel Codes'}
            </button>
          </form>

          {/* Hotel Results */}
          {hotelLoading && (
            <div className="mt-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Scanning insider sources...</p>
            </div>
          )}

          {hotelResults.length > 0 && (
            <div className="mt-6">
              <h3 className="font-bold mb-3">Found {hotelResults.length} Codes</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {hotelResults.map((code, idx) => (
                  <div key={idx} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      {getCodeTypeBadge(code.type)}
                      <span className="text-xs text-gray-500">{code.confidence}% confidence</span>
                    </div>
                    {code.code && (
                      <div className="bg-yellow-100 border-2 border-yellow-400 rounded px-3 py-2 mb-2">
                        <code className="text-lg font-bold text-gray-800">{code.code}</code>
                      </div>
                    )}
                    <p className="text-sm text-gray-700 mb-2">{code.description}</p>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>via {code.engine}</span>
                      <a href={code.source} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Source →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Theme Park Search Form */}
        <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-indigo-200">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            🎢 Theme Park Insider Codes
          </h2>
          
          <form onSubmit={searchThemeParkCodes}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Theme Park</label>
              <select
                value={themePark}
                onChange={(e) => setThemePark(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Disney World">Disney World</option>
                <option value="Universal Studios Orlando">Universal Studios Orlando</option>
                <option value="SeaWorld Orlando">SeaWorld Orlando</option>
                <option value="LEGOLAND Florida">LEGOLAND Florida</option>
                <option value="Busch Gardens Tampa">Busch Gardens Tampa</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">I am a...</label>
              <select
                value={parkUserType}
                onChange={(e) => setParkUserType(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="general">General Public</option>
                <option value="emt">EMT / First Responder</option>
                <option value="student">Student (.edu)</option>
                <option value="nonprofit">Nonprofit Worker</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={themeParkLoading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50"
            >
              {themeParkLoading ? '🔍 Searching Deep Web...' : '🔓 Find Theme Park Codes'}
            </button>
          </form>

          {/* Theme Park Results */}
          {themeParkLoading && (
            <div className="mt-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Scanning insider sources...</p>
            </div>
          )}

          {themeParkResults.length > 0 && (
            <div className="mt-6">
              <h3 className="font-bold mb-3">Found {themeParkResults.length} Codes</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {themeParkResults.map((code, idx) => (
                  <div key={idx} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      {getCodeTypeBadge(code.type)}
                      <span className="text-xs text-gray-500">{code.confidence}% confidence</span>
                    </div>
                    {code.code && (
                      <div className="bg-yellow-100 border-2 border-yellow-400 rounded px-3 py-2 mb-2">
                        <code className="text-lg font-bold text-gray-800">{code.code}</code>
                      </div>
                    )}
                    <p className="text-sm text-gray-700 mb-2">{code.description}</p>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>via {code.engine}</span>
                      <a href={code.source} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Source →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 text-sm text-gray-700">
        <p className="font-bold mb-2">⚠️ Disclaimer:</p>
        <p>
          Codes are sourced from publicly available deep web searches including Reddit, Slickdeals, FlyerTalk, and other forums.
          Always verify codes are still active before booking. Occupational discounts may require verification (ID, .edu email, etc.).
          This tool aggregates publicly shared information and does not guarantee code validity.
        </p>
      </div>

      {/* AI Price Error Detection Info */}
      <div className="mt-12 bg-gradient-to-r from-orange-50 to-red-50 p-6 rounded-lg border-2 border-orange-300">
        <h2 className="text-2xl font-bold mb-4 flex items-center text-orange-900">
          🤖 AI-Powered Price Error Detection
        </h2>
        <div className="space-y-3 text-gray-700">
          <p className="font-semibold">
            Our advanced search algorithms actively scan for:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Pricing Glitches:</strong> System errors that create temporary deep discounts</li>
            <li><strong>Leaked Employee Codes:</strong> Internal-use codes shared on forums and Reddit</li>
            <li><strong>Corporate Portal Access:</strong> Business rates not advertised to the public</li>
            <li><strong>Error Fares:</strong> Booking mistakes that save hundreds of dollars</li>
            <li><strong>Non-Public Rates:</strong> Hidden discount tiers and backdoor promo codes</li>
            <li><strong>Loopholes & Stacking:</strong> Techniques to combine multiple discounts</li>
          </ul>
          <p className="text-sm text-orange-800 mt-4 font-semibold">
            ⚠️ Search Sources: Reddit (r/churning, r/TravelHacks), Slickdeals, FlyerTalk, employee forums, 
            corporate booking portals, and deep web travel communities.
          </p>
          <p className="text-xs text-gray-600 mt-2">
            Disclaimer: All codes are publicly accessible through search engines. We do not hack, steal, 
            or access unauthorized systems. Use codes at your own discretion.
          </p>
        </div>
      </div>
    </div>
  );
};

export default InsiderCodesPage;
