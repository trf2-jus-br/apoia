export interface DataSource {
  id: string;
  slug: string;
  name: string;
  description?: string;
  endpoint: string;
  method: "GET" | "POST";
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  queryParams?: Record<string, string>;

  // JSONPath mappings
  arrayPath: string;
  idPath: string;
  contentPath: string;
  contentTemplate?: string; // Template for combining multiple fields
  titleTemplate?: string; // Nunjucks template for generating item title

  // Display template for search results
  displayTemplate?: string; // HTML template for rendering search results

  // Pagination
  pagination?: PaginationConfig;

  // Transform
  transformScript?: string;

  // Sync settings
  syncInterval: number; // minutes
  isActive: boolean;
  lastSync?: string;
  lastError?: string;
  itemCount?: number;

  createdAt: string;
  updatedAt: string;
}

export interface PaginationConfig {
  type: "offset" | "page" | "cursor";
  location: "query" | "body"; // Where to send pagination params
  pageParam: string;
  limitParam: string;
  limit: number;
  cursorPath?: string; // JSONPath to get next cursor from response
  totalPath?: string; // JSONPath to get total count
}

export interface VectorItem {
  id: string;
  sourceId: string;
  externalId: string;
  content: string;
  embedding?: number[];
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type SearchMode = "vector" | "fulltext" | "hybrid";

export interface SearchRequest {
  query: string;
  sourceIds?: string[];
  limit?: number;
  offset?: number;
  threshold?: number;
  mode?: SearchMode;
  vectorWeight?: number; // Weight for vector search in hybrid mode (0-1)
}

export interface SearchResult {
  item: VectorItem;
  renderedTitle: string | null;
  renderedDisplay: string | null;
  similarity: number;
  vectorScore?: number;
  textScore?: number;
  source: Pick<DataSource, "id" | "slug" | "name" | "description" | "endpoint" | "method" | "displayTemplate"> | null;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  page: number;
  pageSize: number;
  totalPages: number;
  searchMethod?: "id" | "vector" | "fulltext" | "hybrid";
}

export interface SyncResult {
  sourceId: string;
  added: number;
  updated: number;
  deleted: number;
  errors: string[];
  duration: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
