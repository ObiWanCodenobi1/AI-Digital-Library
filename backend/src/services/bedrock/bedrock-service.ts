// backend/src/services/bedrock/bedrock-service.ts
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { createHash } from 'crypto';

export interface InvokeOptions {
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
}

export interface EmbeddingOptions {
  modelId?: string;
  dimensions?: 1024 | 512 | 256;
}

export class BedrockService {
  private client: BedrockRuntimeClient;
  private defaultClaudeModel = 'anthropic.claude-3-sonnet-20240229-v1:0';
  private defaultHaikuModel = 'anthropic.claude-3-haiku-20240307-v1:0';
  private defaultEmbeddingModel = 'amazon.titan-embed-text-v1';

  constructor(region: string = 'us-east-1') {
    this.client = new BedrockRuntimeClient({ region });
  }

  /**
   * Generate embedding using Titan Embeddings
   * Task 2.1.1 - Validates: Requirements 1.1 (Semantic Search)
   */
  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<number[]> {
    const modelId = options?.modelId || this.defaultEmbeddingModel;

    const payload = {
      inputText: text,
    };

    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    try {
      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      return responseBody.embedding;
    } catch (error: any) {
      console.error('Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Generate embeddings in batch
   * Task 2.1.2
   */
  async generateBatchEmbeddings(
    texts: string[],
    options?: EmbeddingOptions
  ): Promise<number[][]> {
    // Process in parallel with concurrency limit
    const batchSize = 10;
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(text => this.generateEmbedding(text, options))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Invoke Claude 3 for text generation
   * Task 2.1.3 - Validates: Requirements 6, 7, 21, 22 (Content Generation)
   */
  async invokeModel(prompt: string, options?: InvokeOptions): Promise<string> {
    const modelId = options?.modelId || this.defaultClaudeModel;
    const temperature = options?.temperature ?? 0.7;
    const maxTokens = options?.maxTokens || 2048;
    const topP = options?.topP ?? 1;

    // Claude 3 uses messages API format
    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: maxTokens,
      temperature,
      top_p: topP,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      ...(options?.stopSequences && { stop_sequences: options.stopSequences }),
    };

    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    try {
      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      return responseBody.content[0].text;
    } catch (error: any) {
      console.error('Error invoking model:', error);
      throw new Error(`Failed to invoke model: ${error.message}`);
    }
  }

  /**
   * Invoke Claude 3 with structured output (JSON schema validation)
   * Task 2.1.4 - Validates: Requirements 22 (Quiz Generation)
   */
  async invokeStructured<T>(prompt: string, schema: any): Promise<T> {
    // Add JSON schema instruction to prompt
    const structuredPrompt = `${prompt}

CRITICAL: You must respond with valid JSON that matches this schema:
${JSON.stringify(schema, null, 2)}

Respond ONLY with the JSON object, no additional text.`;

    const response = await this.invokeModel(structuredPrompt, {
      temperature: 0.3, // Lower temperature for structured output
    });

    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = response.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(jsonStr);
      
      // Basic schema validation
      if (!this.validateSchema(parsed, schema)) {
        throw new Error('Response does not match schema');
      }

      return parsed as T;
    } catch (error: any) {
      console.error('Error parsing structured response:', error);
      console.error('Raw response:', response);
      throw new Error(`Failed to parse structured response: ${error.message}`);
    }
  }

  /**
   * Stream responses from Claude 3
   * Task 2.1.5 - Validates: Requirements 21 (Chat with Book)
   */
  async *invokeModelStream(
    prompt: string,
    options?: InvokeOptions
  ): AsyncIterator<string> {
    const modelId = options?.modelId || this.defaultClaudeModel;
    const temperature = options?.temperature ?? 0.7;
    const maxTokens = options?.maxTokens || 2048;

    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: maxTokens,
      temperature,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    };

    const command = new InvokeModelWithResponseStreamCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    try {
      const response = await this.client.send(command);

      if (response.body) {
        for await (const event of response.body) {
          if (event.chunk) {
            const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
            
            if (chunk.type === 'content_block_delta') {
              yield chunk.delta.text;
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error streaming model response:', error);
      throw new Error(`Failed to stream model response: ${error.message}`);
    }
  }

  /**
   * Basic schema validation
   */
  private validateSchema(data: any, schema: any): boolean {
    if (schema.type === 'object' && typeof data !== 'object') {
      return false;
    }
    if (schema.type === 'array' && !Array.isArray(data)) {
      return false;
    }
    return true;
  }

  /**
   * Generate hash for caching
   */
  static generateCacheKey(text: string, prefix: string = ''): string {
    const hash = createHash('sha256').update(text).digest('hex');
    return prefix ? `${prefix}:${hash}` : hash;
  }
}
