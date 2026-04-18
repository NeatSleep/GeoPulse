/**
 * Search Service - Frontend API calls for news search
 */

export async function searchNews(query) {
  try {
    console.log('[Search Service] Searching for:', query);
    
    const response = await fetch('http://localhost:5000/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('[Search Service] Results:', data);
    return data;
  } catch (error) {
    console.error('[Search Service] Error:', error);
    return {
      success: false,
      message: 'Search failed',
      error: error.message,
      results: [],
    };
  }
}

export function getAuthenticityBadgeColor(score) {
  if (score >= 0.85) return 'green'; // High credibility
  if (score >= 0.65) return 'yellow'; // Medium credibility
  return 'red'; // Low credibility
}

export function getAuthenticityLabel(score) {
  if (score >= 0.85) return 'Highly Authentic ✓';
  if (score >= 0.65) return 'Moderately Authentic';
  if (score >= 0.5) return 'Unverified';
  return 'Low Credibility';
}
