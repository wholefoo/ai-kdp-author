import OpenAI from "openai";

// AI service with GPT-5.2 primary and GPT-4.1-mini emergency fallback
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "placeholder",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// Model configuration
const PRIMARY_MODEL = "gpt-5.2"; // OpenAI GPT-5.2 (primary)
const FALLBACK_MODEL = "gpt-4.1-mini"; // OpenAI GPT-4.1-mini (emergency fallback only)

export interface AIRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: { type: 'json_object' };
}

export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class UnifiedAIService {
  private async callOpenAI(request: AIRequest, modelName: string = PRIMARY_MODEL): Promise<AIResponse> {
    // Check API key availability
    if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY && !process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured. Set AI_INTEGRATIONS_OPENAI_API_KEY or OPENAI_API_KEY.");
    }

    console.log(`🔍 DEBUG: Preparing ${modelName} request with ${request.messages.length} messages`);
    console.log(`🔍 DEBUG: First message preview:`, JSON.stringify({
      role: request.messages[0]?.role,
      contentLength: request.messages[0]?.content?.length || 0,
      contentPreview: request.messages[0]?.content?.substring(0, 100) + '...'
    }, null, 2));

    const requestData: any = {
      model: modelName,
      messages: request.messages,
      response_format: request.responseFormat,
    };

    // Handle different parameter names for different models
    if (modelName === "gpt-5.2") {
      // GPT-5.2 specific configuration - needs substantial tokens for reasoning and content
      const baseTokens = request.maxTokens || 16000;
      // GPT-5.2 needs extremely high token limits to avoid truncation on complex tasks
      // Allocate 4-5x the base tokens for complete responses
      requestData.max_completion_tokens = 128000; // Use the highest reasonable limit (prevents truncation)
      console.log(`🧠 GPT-5.2 token allocation: ${requestData.max_completion_tokens} tokens (generous limit to prevent truncation)`);
      // GPT-5.2 supports temperature=1 for consistency
      requestData.temperature = 1;
    } else {
      // GPT-4o and other models
      requestData.max_tokens = request.maxTokens || 4000;
      requestData.temperature = request.temperature || 0.7;
    }
    
    console.log(`🚀 Making OpenAI API call with model: ${modelName}`);
    console.log(`📋 Request data:`, JSON.stringify({
      model: requestData.model,
      messageCount: requestData.messages.length,
      maxTokens: requestData.max_completion_tokens || requestData.max_tokens,
      responseFormat: requestData.response_format?.type || 'text',
      temperature: requestData.temperature || 'default'
    }, null, 2));

    try {
      const response = await openai.chat.completions.create(requestData);
      
      console.log(`✅ ${modelName} API call succeeded`);
      console.log(`📊 Response structure:`, JSON.stringify({
        id: response.id,
        object: response.object,
        created: response.created,
        model: response.model,
        choices: response.choices?.length,
        usage: response.usage ? {
          prompt_tokens: response.usage.prompt_tokens,
          completion_tokens: response.usage.completion_tokens,
          total_tokens: response.usage.total_tokens
        } : 'NO_USAGE',
        firstChoice: response.choices[0] ? {
          index: response.choices[0].index,
          finishReason: response.choices[0].finish_reason,
          message: response.choices[0].message ? {
            role: response.choices[0].message.role,
            hasContent: !!response.choices[0].message.content,
            contentLength: response.choices[0].message.content?.length || 0
          } : 'NO_MESSAGE'
        } : 'NO_CHOICES'
      }, null, 2));

      const content = response.choices[0]?.message?.content;
      const finishReason = response.choices[0]?.finish_reason;
      
      if (!content || content.trim() === '') {
        console.error(`❌ No content in ${modelName} response (finish_reason: ${finishReason}). Full response:`, JSON.stringify(response, null, 2));
        
        throw new Error(`No content received from OpenAI ${modelName} (finish_reason: ${finishReason})`);
      }
      
      // Warn if response was truncated due to length (but at least we have some content)
      if (finishReason === 'length') {
        console.warn(`⚠️  ${modelName} response was truncated (finish_reason: length). Content truncated but partial response returned (${content.length} chars).`);
      }

      console.log(`✅ Successfully extracted ${content.length} characters from ${modelName}`);
      return {
        content,
        model: modelName,
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        } : undefined,
      };
    } catch (error) {
      console.error(`❌ ${modelName} API call failed:`, error);
      if (error instanceof Error) {
        console.error(`❌ Error details:`, {
          name: error.name,
          message: error.message,
          stack: error.stack?.substring(0, 500)
        });
      }
      throw error;
    }
  }


  async generateContent(request: AIRequest): Promise<AIResponse> {
    console.log(`🎯 Attempting AI generation with primary model: ${PRIMARY_MODEL}`);
    try {
      return await this.callOpenAI(request, PRIMARY_MODEL);
    } catch (primaryError) {
      console.warn(`⚠️  ${PRIMARY_MODEL} failed:`, primaryError instanceof Error ? primaryError.message : 'Unknown error');
      console.log(`🔄 Falling back to emergency model: ${FALLBACK_MODEL}`);
      
      try {
        const response = await this.callOpenAI(request, FALLBACK_MODEL);
        console.log(`✅ Emergency fallback to ${FALLBACK_MODEL} succeeded`);
        return response;
      } catch (fallbackError) {
        console.error(`💥 Both ${PRIMARY_MODEL} and ${FALLBACK_MODEL} failed`);
        console.error(`Primary error:`, primaryError);
        console.error(`Fallback error:`, fallbackError);
        throw new Error(`AI generation failed: ${PRIMARY_MODEL} failed, then ${FALLBACK_MODEL} fallback also failed. Primary: ${primaryError instanceof Error ? primaryError.message : 'Unknown'}, Fallback: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown'}`);
      }
    }
  }

  // Test function to debug GPT-5 issues
  async testGPT5(): Promise<boolean> {
    try {
      console.log(`🧪 Testing GPT-5 with simple request...`);
      const testRequest: AIRequest = {
        messages: [
          { role: 'user', content: 'Say "Hello World" and nothing else.' }
        ],
        maxTokens: 50 // GPT-5 needs tokens for reasoning + content
      };
      
      const response = await this.callOpenAI(testRequest, 'gpt-5.2');
      console.log(`🧪 GPT-5 test response:`, response.content);
      return true;
    } catch (error) {
      console.error(`🧪 GPT-5 test failed:`, error);
      return false;
    }
  }

  // Check availability of GPT-5.1 and GPT-4o fallback
  async checkModelAvailability(): Promise<{ [key: string]: boolean }> {
    const results: { [key: string]: boolean } = {};
    
    console.log(`🏥 Running AI model health check...`);
    
    // Test GPT-5.1
    try {
      const testRequest: AIRequest = {
        messages: [{ role: 'user', content: 'Say "Hello" and nothing else.' }],
        maxTokens: 200
      };
      await this.callOpenAI(testRequest, PRIMARY_MODEL);
      results[PRIMARY_MODEL] = true;
      console.log(`✅ ${PRIMARY_MODEL} is available`);
    } catch (error) {
      results[PRIMARY_MODEL] = false;
      console.log(`❌ ${PRIMARY_MODEL} is unavailable:`, error instanceof Error ? error.message : 'Unknown error');
    }
    
    // Test GPT-4o fallback
    try {
      const testRequest: AIRequest = {
        messages: [{ role: 'user', content: 'Say "Hello" and nothing else.' }],
        maxTokens: 50
      };
      await this.callOpenAI(testRequest, FALLBACK_MODEL);
      results[FALLBACK_MODEL] = true;
      console.log(`✅ ${FALLBACK_MODEL} is available (emergency fallback)`);
    } catch (error) {
      results[FALLBACK_MODEL] = false;
      console.log(`❌ ${FALLBACK_MODEL} is unavailable:`, error instanceof Error ? error.message : 'Unknown error');
    }
    
    return results;
  }

  // Convenience method for JSON responses
  async generateJSON(request: Omit<AIRequest, 'responseFormat'>): Promise<any> {
    const response = await this.generateContent({
      ...request,
      responseFormat: { type: 'json_object' },
    });

    try {
      // Clean the response content to extract valid JSON
      const cleanedContent = this.extractJSON(response.content);
      return JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      console.error('Raw response:', response.content);
      
      // Try fallback parsing methods
      try {
        const fallbackResult = this.attemptFallbackParsing(response.content);
        if (fallbackResult) {
          console.log('Successfully recovered with fallback parsing');
          return fallbackResult;
        }
      } catch (fallbackError) {
        console.error('Fallback parsing also failed:', fallbackError);
      }
      
      throw new Error(`Invalid JSON response from AI model (${response.model}): ${parseError instanceof Error ? parseError.message : 'Parse error'}`);
    }
  }

  private extractJSON(content: string): string {
    // Remove any text before the first { or [
    const jsonStart = Math.min(
      content.indexOf('{') !== -1 ? content.indexOf('{') : Infinity,
      content.indexOf('[') !== -1 ? content.indexOf('[') : Infinity
    );
    
    if (jsonStart === Infinity) {
      throw new Error('No JSON structure found in response');
    }
    
    // Find the matching closing brace/bracket
    let cleanContent = content.slice(jsonStart);
    
    // Remove any trailing text that's clearly not JSON (like "[Note: ...]")
    const notePattern = /\[Note:.*?\]$/i;
    cleanContent = cleanContent.replace(notePattern, '').trim();
    
    return cleanContent;
  }

  private attemptFallbackParsing(content: string): any | null {
    // Try to find complete JSON objects within the content
    const jsonMatches = content.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
    if (jsonMatches) {
      for (const match of jsonMatches) {
        try {
          return JSON.parse(match);
        } catch (e) {
          // Continue to next match
        }
      }
    }
    
    // Try to find complete JSON arrays
    const arrayMatches = content.match(/\[[^\[\]]*(?:\[[^\[\]]*\][^\[\]]*)*\]/g);
    if (arrayMatches) {
      for (const match of arrayMatches) {
        try {
          return JSON.parse(match);
        } catch (e) {
          // Continue to next match
        }
      }
    }
    
    return null;
  }

}

export const aiService = new UnifiedAIService();