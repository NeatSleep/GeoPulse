const API_BASE_URL = "http://localhost:5000";

/**
 * Chat with the AI assistant
 */
export async function sendAssistantMessage(message, conversationHistory = []) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/assistant/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        conversation_history: conversationHistory,
      }),
    });

    // Log response status for debugging
    console.log("[Assistant] Response status:", response.status);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[Assistant] Error response:", errorBody);
      throw new Error(`API error ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    console.log("[Assistant] Response received:", data);
    return data;
  } catch (error) {
    console.error("[Assistant Service] Error:", error);
    return {
      success: false,
      error: error.message,
      message: `Failed to connect to assistant service: ${error.message}\n\nMake sure the backend server is running on port 5000.`,
    };
  }
}

/**
 * Format tool results for display
 */
export function formatToolResults(toolCalls) {
  if (!toolCalls || toolCalls.length === 0) return null;

  return toolCalls.map((tool) => ({
    name: tool.tool_name,
    results: tool.tool_result,
  }));
}

/**
 * Extract news articles from tool results
 */
export function extractNewsFromToolResults(toolCalls) {
  const articles = [];

  if (!toolCalls) return articles;

  toolCalls.forEach((tool) => {
    if (tool.tool_name === "fetch_news" && tool.tool_result?.articles) {
      articles.push(...tool.tool_result.articles);
    }
  });

  return articles;
}
