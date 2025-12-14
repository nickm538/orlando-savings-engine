import React, { useEffect } from 'react';
import { useSerpApi } from '../contexts/SerpApiContext';
import './InsightsPage.css';

const InsightsPage: React.FC = () => {
  const { searchTravelInsights, insights, isLoadingInsights } = useSerpApi();

  useEffect(() => {
    searchTravelInsights('Orlando travel insights');
  }, [searchTravelInsights]);

  return (
    <div className="insights-page">
      <div className="insights-container">
        <h1>Travel Intelligence</h1>
        <p className="subtitle">AI-powered insights and travel recommendations</p>

        {isLoadingInsights ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Analyzing travel data...</p>
          </div>
        ) : (
          <div className="insights-grid">
            {insights.map((insight, index) => (
              <div key={index} className="insight-card">
                <div className="insight-type-badge">{insight.type}</div>
                <div className="insight-content">
                  <p>{insight.content}</p>
                </div>
                <div className="insight-meta">
                  <span className="query">Query: {insight.query}</span>
                  <span className="confidence">{insight.confidence}% confidence</span>
                </div>
                <div className="insight-footer">
                  <span className="source">{insight.source}</span>
                  <span className="timestamp">
                    {new Date(insight.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InsightsPage;