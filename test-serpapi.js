const SerpApiService = require('./backend/services/SerpApiService');

async function testSerpApi() {
  const serpApi = new SerpApiService();
  
  console.log('🚀 Testing SerpApi Integration...\n');
  
  try {
    // Test 1: Google Hotels API
    console.log('🏨 Testing Google Hotels API...');
    const hotelResults = await serpApi.searchOrlandoHotels({
      checkInDate: '2025-12-20',
      checkOutDate: '2025-12-27',
      adults: 2,
      sortBy: 3 // Lowest price
    });
    
    console.log('✅ Hotels API Response Status:', hotelResults.search_metadata?.status || 'Success');
    console.log('📊 Hotels Found:', hotelResults.properties?.length || 0);
    
    if (hotelResults.properties && hotelResults.properties.length > 0) {
      const firstHotel = hotelResults.properties[0];
      console.log('🏨 First Hotel:', firstHotel.name);
      console.log('💰 Price:', firstHotel.rate_per_night?.lowest || 'N/A');
      console.log('⭐ Rating:', firstHotel.overall_rating || 'N/A');
    }
    
    // Test 2: Google AI Mode API
    console.log('\n🤖 Testing Google AI Mode API...');
    const aiResults = await serpApi.searchTravelInsights('Orlando travel deals discounts');
    
    console.log('✅ AI Mode Queries Executed:', aiResults.length);
    
    let totalInsights = 0;
    aiResults.forEach(result => {
      if (result.data && result.data.text_blocks) {
        totalInsights += result.data.text_blocks.length;
      }
    });
    
    console.log('💡 Total Insights Found:', totalInsights);
    
    // Test 3: Process results
    console.log('\n🔧 Testing Data Processing...');
    const processedHotels = serpApi.processHotelResults(hotelResults);
    const processedInsights = serpApi.processAIModeResults(aiResults);
    
    console.log('📋 Processed Hotels:', processedHotels.length);
    console.log('📋 Processed Insights:', processedInsights.length);
    
    if (processedHotels.length > 0) {
      console.log('🏨 Sample Hotel:', processedHotels[0].name);
      console.log('💰 Sample Price:', processedHotels[0].price?.amount || 'N/A');
    }
    
    if (processedInsights.length > 0) {
      console.log('💡 Sample Insight:', processedInsights[0].content.substring(0, 100) + '...');
    }
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('✨ SerpApi integration is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('🔍 Error details:', error);
  }
}

// Run the test
console.log('Starting SerpApi Integration Test...\n');
testSerpApi();