import { Client } from '@opensearch-project/opensearch';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';

interface OpenSearchConfig {
  endpoint: string;
  region: string;
}

interface VectorSearchOptions {
  index: string;
  vector: number[];
  k?: number;
  minScore?: number;
  filters?: Record<string, any>;
}

interface SearchHit {
  _id: string;
  _score: number;
  _source: any;
}

export class OpenSearchService {
  private client: Client;

  constructor(config: OpenSearchConfig) {
    this.client = new Client({
      ...AwsSigv4Signer({
        region: config.region,
        service: 'es',
      }),
      node: config.endpoint,
    });
  }

  /**
   * Perform k-NN vector search in OpenSearch
   */
  async vectorSearch(options: VectorSearchOptions): Promise<SearchHit[]> {
    const { index, vector, k = 10, minScore = 0.7, filters } = options;

    try {
      const query: any = {
        size: k,
        query: {
          bool: {
            must: [
              {
                knn: {
                  embedding: {
                    vector,
                    k,
                  },
                },
              },
            ],
          },
        },
        min_score: minScore,
      };

      // Add filters if provided
      if (filters && Object.keys(filters).length > 0) {
        query.query.bool.filter = [];
        
        for (const [field, value] of Object.entries(filters)) {
          if (Array.isArray(value)) {
            query.query.bool.filter.push({
              terms: { [field]: value },
            });
          } else {
            query.query.bool.filter.push({
              term: { [field]: value },
            });
          }
        }
      }

      const response = await this.client.search({
        index,
        body: query,
      });

      return response.body.hits.hits;
    } catch (error) {
      console.error('OpenSearch vector search error:', error);
      throw error;
    }
  }

  /**
   * Hybrid search combining vector similarity and keyword matching
   */
  async hybridSearch(
    index: string,
    vector: number[],
    keywords: string,
    options: {
      k?: number;
      minScore?: number;
      vectorWeight?: number;
      keywordWeight?: number;
      filters?: Record<string, any>;
    } = {}
  ): Promise<SearchHit[]> {
    const {
      k = 10,
      minScore = 0.5,
      vectorWeight = 0.7,
      keywordWeight = 0.3,
      filters,
    } = options;

    try {
      const query: any = {
        size: k,
        query: {
          bool: {
            should: [
              {
                script_score: {
                  query: { match_all: {} },
                  script: {
                    source: `
                      cosineSimilarity(params.query_vector, 'embedding') * ${vectorWeight}
                    `,
                    params: {
                      query_vector: vector,
                    },
                  },
                },
              },
              {
                multi_match: {
                  query: keywords,
                  fields: ['title^3', 'author^2', 'description', 'content'],
                  boost: keywordWeight,
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
        min_score: minScore,
      };

      // Add filters if provided
      if (filters && Object.keys(filters).length > 0) {
        query.query.bool.filter = [];
        
        for (const [field, value] of Object.entries(filters)) {
          if (Array.isArray(value)) {
            query.query.bool.filter.push({
              terms: { [field]: value },
            });
          } else {
            query.query.bool.filter.push({
              term: { [field]: value },
            });
          }
        }
      }

      const response = await this.client.search({
        index,
        body: query,
      });

      return response.body.hits.hits;
    } catch (error) {
      console.error('OpenSearch hybrid search error:', error);
      throw error;
    }
  }

  /**
   * Index a document with vector embedding
   */
  async indexDocument(
    index: string,
    id: string,
    document: any,
    embedding: number[]
  ): Promise<void> {
    try {
      await this.client.index({
        index,
        id,
        body: {
          ...document,
          embedding,
        },
      });
    } catch (error) {
      console.error('OpenSearch index error:', error);
      throw error;
    }
  }

  /**
   * Bulk index documents with embeddings
   */
  async bulkIndexDocuments(
    index: string,
    documents: Array<{ id: string; document: any; embedding: number[] }>
  ): Promise<void> {
    try {
      const body = documents.flatMap(({ id, document, embedding }) => [
        { index: { _index: index, _id: id } },
        { ...document, embedding },
      ]);

      await this.client.bulk({ body });
    } catch (error) {
      console.error('OpenSearch bulk index error:', error);
      throw error;
    }
  }

  /**
   * Create index with k-NN mapping
   */
  async createIndex(index: string, dimensions: number = 1024): Promise<void> {
    try {
      await this.client.indices.create({
        index,
        body: {
          settings: {
            index: {
              knn: true,
              'knn.algo_param.ef_search': 512,
            },
          },
          mappings: {
            properties: {
              embedding: {
                type: 'knn_vector',
                dimension: dimensions,
                method: {
                  name: 'hnsw',
                  space_type: 'cosinesimil',
                  engine: 'nmslib',
                  parameters: {
                    ef_construction: 512,
                    m: 16,
                  },
                },
              },
              title: { type: 'text' },
              author: { type: 'text' },
              description: { type: 'text' },
              content: { type: 'text' },
              topics: { type: 'keyword' },
              difficulty: { type: 'keyword' },
              publicationYear: { type: 'integer' },
            },
          },
        },
      });
    } catch (error) {
      console.error('OpenSearch create index error:', error);
      throw error;
    }
  }
}
