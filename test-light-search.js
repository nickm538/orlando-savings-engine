const SerpApiService = require('./backend/services/SerpApiService');

async function testGoogleLightSearch() {
  const serpApi = new SerpApiService();
  
  console.log('🚀 Testing Google Light Search API Integration...\n');
  
  try {
    // Test 1: Basic Google Light Search
    console.log('⚡ Testing Google Light Search...');
    console.log('📍 API Key: 6cf510162e29b592d5d3d06c2f5f60511b062cb8316e98f3ef4f01a230474c6f');
    
    const lightResults = await serpApi.searchLight({
      q: 'Universal Studios secret corporate promo codes Orlando',
      location: 'Orlando, Florida, United States',
      google_domain: 'google.com',
      hl: 'en',
      gl: 'us'
    });
    
    console.log('✅ Light Search Response Status:', lightResults.search_metadata?.status || 'Success');
    console.log('📊 Organic Results Found:', lightResults.organic_results?.length || 0);
    
    if (lightResults.organic_results && lightResults.organic_results.length > 0) {
      const firstResult = lightResults.organic_results[0];
      console.log('🔗 First Result Title:', firstResult.title);
      console.log('📝 First Result Snippet:', firstResult.snippet?.substring(0, 200) + '...');
      console.log('🌐 First Result Link:', firstResult.link);
      console.log('📍 First Result Position:', firstResult.position);
    }
    
    // Test 2: Travel Deals Light Search
    console.log('\n🏷️ Testing Travel Deals Light Search...');
    const dealsResults = await serpApi.searchTravelDealsLight('Orlando theme parks');
    
    console.log('✅ Travel Deals Queries Executed:', dealsResults.length);
    
    let totalDeals = 0;
    dealsResults.forEach(result => {
      if (result.data && result.data.organic_results) {
        totalDeals += result.data.organic_results.length;
      }
    });
    
    console.log('📋 Total Deal Results Found:', totalDeals);
    
    // Test 3: Process Light Search results
    console.log('\n🔧 Testing Light Results Processing...');
    const processedDeals = serpApi.processLightResults(dealsResults);
    
    console.log('📋 Processed Deals:', processedDeals.length);
    
    if (processedDeals.length > 0) {
      console.log('🏷️ Sample Deal Title:', processedDeals[0].title);
      console.log('📝 Sample Deal Snippet:', processedDeals[0].snippet?.substring(0, 150) + '...');
      console.log('🔗 Sample Deal Link:', processedDeals[0].link);
      console.log('🔍 Sample Deal Query:', processedDeals[0].query);
    }
    
    // Test 4: Orlando-specific deals
    console.log('\n🎢 Testing Orlando-specific Light Search...');
    const orlandoResults = await serpApi.searchTravelDealsLight('Universal Studios secret corporate');
    
    const processedOrlando = serpApi.processLightResults(orlandoResults);
    console.log('🎢 Orlando Deals Found:', processedOrlando.length);
    
    if (processedOrlando.length > 0) {
      console.log('🏰 Sample Orlando Deal:', processedOrlando[0].title);
      console.log('💰 Orlando Deal Link:', processedOrlando[0].link);
    }
    
    console.log('\n🎉 All Google Light Search tests completed successfully!');
    console.log('⚡ Google Light Search API is working correctly.');
    console.log('📍 API Key Location: Hardcoded in SerpApiService.js');
    console.log('🔗 Usage: /api/serpapi/light/search?q=your+query');
    
  } catch (error) {
    console.error('❌ Google Light Search test failed:', error.message);
    console.error('🔍 Error details:', error);
    console.error('💡 API Key should be in: -d api_key="6cf510162e29b592d5d3d06c2f5f60511b062cb8316e98f3ef4f01a230474c6f"');
  }
}

// Run the test
console.log('Starting Google Light Search API Integration Test...\n');
testGoogleLightSearch();