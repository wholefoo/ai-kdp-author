import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';

// Unified AI service with GPT-5.1 primary and Claude Opus 4.5 fallback
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  authToken: process.env.ANTHROPIC_AUTH_TOKEN,
});

// Model configurations
const PRIMARY_MODEL = "gpt-5.1"; // OpenAI GPT-5.1
const SECONDARY_MODEL = "claude-opus-4-5"; // Claude Opus 4.5 (latest and most capable Claude model)
const TERTIARY_MODEL = "gpt-4o"; // OpenAI GPT-4o final fallback

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
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
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
    if (modelName === "gpt-5.1") {
      // GPT-5.1 specific configuration - needs extra tokens for reasoning
      const baseTokens = request.maxTokens || 8000;
      // GPT-5.1 needs significantly more tokens: reasoning tokens + actual content tokens
      // For complex Novel Composer requests, allocate 3x-4x the base tokens for complete responses
      const reasoningBuffer = Math.max(baseTokens * 2, 10000); // Substantial reasoning budget
      requestData.max_completion_tokens = Math.min(baseTokens + reasoningBuffer, 32000); // Cap at 32k to avoid excessive costs
      console.log(`🧠 GPT-5.1 token allocation: ${requestData.max_completion_tokens} (${baseTokens} content + ${reasoningBuffer} reasoning)`);
      // GPT-5.1 supports temperature=1 for consistency
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
        console.error(`❌ No content in ${modelName} response. Full response:`, JSON.stringify(response, null, 2));
        throw new Error(`No content received from OpenAI ${modelName}`);
      }
      
      // Warn if response was truncated due to length
      if (finishReason === 'length') {
        console.warn(`⚠️  ${modelName} response was truncated (finish_reason: length). Consider increasing token limit for future requests.`);
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

  private async callAnthropic(request: AIRequest): Promise<AIResponse> {
    // Convert OpenAI format to Anthropic format
    const systemMessage = request.messages.find(m => m.role === 'system')?.content || '';
    const userMessages = request.messages.filter(m => m.role === 'user' || m.role === 'assistant');

    // Enhanced system message to prevent commentary and truncation
    const enhancedSystemMessage = systemMessage + 
      (request.responseFormat?.type === 'json_object' ? 
        '\n\nIMPORTANT: Return ONLY valid, complete JSON. Do not add any commentary, notes, or explanations. Do not truncate the response. The response must be parseable JSON without any additional text.' : 
        '');

    const response = await anthropic.messages.create({
      model: SECONDARY_MODEL,
      max_tokens: Math.max(request.maxTokens || 4000, 8000), // Increase token limit for complete responses
      temperature: request.temperature || 0.7,
      system: enhancedSystemMessage,
      messages: userMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    const content = response.content[0];
    if (!content || content.type !== 'text') {
      throw new Error("No text content received from Anthropic");
    }

    return {
      content: content.text,
      model: SECONDARY_MODEL,
      usage: response.usage ? {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      } : undefined,
    };
  }

  async generateContent(request: AIRequest): Promise<AIResponse> {
    // Try GPT-5 first
    try {
      console.log(`🎯 Attempting AI generation with primary model: ${PRIMARY_MODEL}`);
      return await this.callOpenAI(request, PRIMARY_MODEL);
    } catch (primaryError) {
      console.warn(`❌ Primary model (${PRIMARY_MODEL}) failed:`, primaryError instanceof Error ? primaryError.message : 'Unknown error');
      
      // Try Claude Sonnet 4 as secondary model
      try {
        console.log(`🔄 Falling back to secondary model: ${SECONDARY_MODEL}`);
        const response = await this.callAnthropic(request);
        console.log(`✅ Successfully used secondary model: ${SECONDARY_MODEL}`);
        return response;
      } catch (secondaryError) {
        console.warn(`❌ Secondary model (${SECONDARY_MODEL}) failed:`, secondaryError instanceof Error ? secondaryError.message : 'Unknown error');
        
        // Try GPT-4o as final fallback
        try {
          console.log(`🔄 Falling back to tertiary model: ${TERTIARY_MODEL}`);
          const response = await this.callOpenAI(request, TERTIARY_MODEL);
          console.log(`✅ Successfully used tertiary model: ${TERTIARY_MODEL}`);
          return response;
        } catch (tertiaryError) {
          console.error(`💥 All models failed.`);
          console.error(`Primary (${PRIMARY_MODEL}) error:`, primaryError);
          console.error(`Secondary (${SECONDARY_MODEL}) error:`, secondaryError);
          console.error(`Tertiary (${TERTIARY_MODEL}) error:`, tertiaryError);
          throw new Error(`AI generation failed: Primary (${PRIMARY_MODEL}): ${primaryError instanceof Error ? primaryError.message : 'Unknown error'}, Secondary (${SECONDARY_MODEL}): ${secondaryError instanceof Error ? secondaryError.message : 'Unknown error'}, Tertiary (${TERTIARY_MODEL}): ${tertiaryError instanceof Error ? tertiaryError.message : 'Unknown error'}`);
        }
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
      
      const response = await this.callOpenAI(testRequest, 'gpt-5.1');
      console.log(`🧪 GPT-5 test response:`, response.content);
      return true;
    } catch (error) {
      console.error(`🧪 GPT-5 test failed:`, error);
      return false;
    }
  }

  // Check availability of all AI models
  async checkModelAvailability(): Promise<{ [key: string]: boolean }> {
    const results: { [key: string]: boolean } = {};
    
    console.log(`🏥 Running AI model health check...`);
    
    // Test GPT-5 (needs more tokens for reasoning)
    try {
      const testRequest: AIRequest = {
        messages: [{ role: 'user', content: 'Say "Hello" and nothing else.' }],
        maxTokens: 200 // GPT-5 needs sufficient tokens: reasoning + content
      };
      await this.callOpenAI(testRequest, PRIMARY_MODEL);
      results[PRIMARY_MODEL] = true;
      console.log(`✅ ${PRIMARY_MODEL} is available`);
    } catch (error) {
      results[PRIMARY_MODEL] = false;
      console.log(`❌ ${PRIMARY_MODEL} is unavailable:`, error instanceof Error ? error.message : 'Unknown error');
    }
    
    // Test Claude Sonnet 4
    try {
      const testRequest: AIRequest = {
        messages: [{ role: 'user', content: 'Test' }],
        maxTokens: 5
      };
      await this.callAnthropic(testRequest);
      results[SECONDARY_MODEL] = true;
      console.log(`✅ ${SECONDARY_MODEL} is available`);
    } catch (error) {
      results[SECONDARY_MODEL] = false;
      console.log(`❌ ${SECONDARY_MODEL} is unavailable:`, error instanceof Error ? error.message : 'Unknown error');
    }
    
    // Test GPT-4o
    try {
      const testRequest: AIRequest = {
        messages: [{ role: 'user', content: 'Test' }],
        maxTokens: 5
      };
      await this.callOpenAI(testRequest, TERTIARY_MODEL);
      results[TERTIARY_MODEL] = true;
      console.log(`✅ ${TERTIARY_MODEL} is available`);
    } catch (error) {
      results[TERTIARY_MODEL] = false;
      console.log(`❌ ${TERTIARY_MODEL} is unavailable:`, error instanceof Error ? error.message : 'Unknown error');
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