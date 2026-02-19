"use client";

import { useState, useEffect } from "react";
import nunjucks from "nunjucks";
import type { DataSource, SearchResponse, SearchResult, SearchMode } from "./types";
import { Container } from "react-bootstrap";

export default function SearchComponent() {
  const [query, setQuery] = useState("");
  const [sources, setSources] = useState<DataSource[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });
  const [threshold, setThreshold] = useState(0.3);
  const [searchMode, setSearchMode] = useState<SearchMode>("hybrid");
  const [vectorWeight, setVectorWeight] = useState(0.7);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      const res = await fetch('/api/semantic-search/sources');
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources || []);
      }
    } catch (error) {
      console.error("Erro ao carregar fontes:", error);
    }
  };

  const handleSearch = async (page = 1) => {
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch('/api/semantic-search/search', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          sourceIds: selectedSources.length > 0 ? selectedSources : undefined,
          limit: pagination.pageSize,
          offset: (page - 1) * pagination.pageSize,
          threshold,
          mode: searchMode,
          vectorWeight,
        }),
      });

      if (res.ok) {
        const data: SearchResponse = await res.json();
        setResults(data.results);
        setPagination({
          page: data.page,
          pageSize: data.pageSize,
          total: data.total,
          totalPages: data.totalPages,
        });
      }
    } catch (error) {
      console.error("Erro na busca:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSource = (sourceId: string) => {
    setSelectedSources((prev) =>
      prev.includes(sourceId)
        ? prev.filter((id) => id !== sourceId)
        : [...prev, sourceId]
    );
  };

  const formatSimilarity = (similarity: number) => {
    return `${(similarity * 100).toFixed(1)}%`;
  };

  const renderContent = (result: SearchResult) => {
    // If source has a display template, use it
    if (result.source?.displayTemplate) {
      const template = result.source.displayTemplate;
      const data = result.item.data;

      try {
        // Use Nunjucks to render the template
        // Configure Nunjucks to not auto-escape HTML (since we want to preserve formatting)
        nunjucks.configure({ autoescape: false });
        return nunjucks.renderString(template, data);
      } catch (error) {
        console.error("Error rendering template:", error);
        return result.item.content;
      }
    }

    // Default: just return the plain content
    return result.item.content;
  };

  return (
    <Container className="mt-4" fluid={false}>
      {/* Logo e Campo de Busca - Estilo Google */}
      <div className={`d-flex flex-column align-items-center ${searched ? "mt-4" : ""}`}
        style={{ marginTop: searched ? undefined : "4em" }}>
        {!searched && (
          <div className="text-center mb-5">
            <h2 className="text-muted">Busca Semântica de Temas</h2>
          </div>
        )}

        {/* Caixa de Busca */}
        <div style={{ width: "100%" }}>
          <div className="position-relative" style={{ width: "100%", maxWidth: "50em", margin: "0 auto" }}>
            <input
              type="text"
              className="form-control form-control-lg rounded-pill shadow-sm py-3 px-4"
              placeholder="Digite sua busca..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              style={{
                border: "1px solid #dfe1e5",
                fontSize: "16px",
                paddingRight: "48px"
              }}
              autoFocus
            />
            <button
              className="btn btn-link position-absolute top-50 translate-middle-y p-0"
              onClick={() => handleSearch()}
              disabled={loading || !query.trim()}
              style={{ right: "16px", width: "32px", height: "32px" }}
              title="Buscar"
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm text-primary" />
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
              )}
            </button>
          </div>

          {/* Botões de Filtros Rápidos */}
          <div className="d-flex justify-content-center gap-2 mt-3">
            <button
              className="btn btn-sm btn-outline-secondary rounded-pill"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? "Ocultar Filtros" : "Filtros Avançados"}
            </button>
            {selectedSources.length > 0 && (
              <span className="badge bg-primary rounded-pill align-self-center px-3 py-2">
                {selectedSources.length} fonte{selectedSources.length > 1 ? "s" : ""} selecionada{selectedSources.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Filtros Expandidos */}
          {showFilters && (
            <div className="mt-4 p-4 bg-light rounded-3">
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Modo de Busca</label>
                  <select
                    className="form-select form-select-sm"
                    value={searchMode}
                    onChange={(e) => setSearchMode(e.target.value as SearchMode)}
                  >
                    <option value="hybrid">🔀 Híbrida (Vetor + Texto)</option>
                    <option value="vector">🧠 Vetorial (Semântica)</option>
                    <option value="fulltext">📝 Texto Completo (Exata)</option>
                  </select>
                </div>

                {searchMode === "hybrid" && (
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">
                      Balanceamento: Vetor {(vectorWeight * 100).toFixed(0)}% / Texto {((1 - vectorWeight) * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      className="form-range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={vectorWeight}
                      onChange={(e) => setVectorWeight(parseFloat(e.target.value))}
                    />
                  </div>
                )}

                {searchMode !== "fulltext" && (
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">
                      Similaridade Mínima: {(threshold * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      className="form-range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={threshold}
                      onChange={(e) => setThreshold(parseFloat(e.target.value))}
                    />
                  </div>
                )}
              </div>
              <div className="col-12 mt-3">
                <label className="form-label small fw-semibold">Fontes de Dados</label>
                <div className="d-flex flex-wrap gap-2">
                  {sources.map((source) => (
                    <button
                      key={source.id}
                      className={`btn btn-sm rounded-pill ${selectedSources.includes(source.id)
                        ? "btn-primary"
                        : "btn-outline-secondary"
                        }`}
                      onClick={() => toggleSource(source.id)}
                    >
                      {source.name}
                    </button>
                  ))}
                  {sources.length === 0 && (
                    <span className="text-muted small">Nenhuma fonte disponível</span>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {searched && !loading && (
        <div className="mt-5" style={{ margin: "0 auto", width: "100%" }}>
          {results.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted mb-0">
                Nenhum resultado encontrado para <strong>&quot;{query}&quot;</strong>
              </p>
            </div>
          ) : (
            <div className="d-flex flex-column gap-4">
              {results.map((result, index) => (
                <div key={result.item.id} className="search-result-item">
                  <div className="d-flex align-items-start gap-2">
                    <span className="text-muted fw-semibold" style={{ fontSize: "1.2em", minWidth: "24px" }}>
                      {(pagination.page - 1) * pagination.pageSize + index + 1}.
                    </span>
                    <div className="flex-grow-1">
                      <div
                        style={{ fontSize: "1.2em" }}
                        dangerouslySetInnerHTML={{
                          __html: renderContent(result)
                        }}
                        className="mb-2"
                      />

                      <div className="d-flex align-items-center gap-2">
                        {result.source && (
                          <button
                            className="badge bg-secondary text-white border-0"
                            style={{ fontSize: "10px", cursor: "pointer" }}
                            onClick={() =>
                              setExpandedItem(
                                expandedItem === result.item.id ? null : result.item.id
                              )
                            }
                            title="Clique para ver detalhes"
                          >
                            {result.source.name}
                          </button>
                        )}
                        <div className="d-flex gap-1">
                          {searchMode === "hybrid" && (
                            <>
                              {result.vectorScore !== undefined && (
                                <span
                                  className="badge border border-primary text-primary bg-transparent"
                                  title="Score Vetorial (similaridade semântica)"
                                  style={{ fontSize: "10px" }}
                                >
                                  V: {Math.round(result.vectorScore * 100)}%
                                </span>
                              )}
                              {result.textScore !== undefined && (
                                <span
                                  className={`badge border ${result.textScore > 0 ? "border-warning text-warning" : "border-secondary text-secondary"} bg-transparent`}
                                  title="Score Texto (match de palavras)"
                                  style={{ fontSize: "10px" }}
                                >
                                  T: {Math.round(result.textScore * 100)}%
                                </span>
                              )}
                            </>
                          )}
                          <span
                            className={`badge border bg-transparent ${result.similarity >= 0.9 ? "border-success text-success" :
                              result.similarity >= 0.8 ? "border-primary text-primary" :
                                result.similarity >= 0.7 ? "border-warning text-warning" : "border-secondary text-secondary"
                              }`}
                            title={searchMode === "hybrid" ? "Score Combinado" : "Score"}
                            style={{ fontSize: "10px" }}
                          >
                            {Math.round(result.similarity * 100)}%
                          </span>
                        </div>
                      </div>

                      {expandedItem === result.item.id && (
                        <div className="mt-3 p-3 bg-light rounded" style={{ fontSize: "12px" }}>
                          <pre className="mb-0" style={{ maxHeight: "300px", overflow: "auto" }}>
                            {JSON.stringify(result.item.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-5 mb-4">
              <nav>
                <ul className="pagination justify-content-center mb-0">
                  <li className={`page-item ${pagination.page === 1 ? "disabled" : ""}`}>
                    <button
                      className="page-link"
                      onClick={() => handleSearch(1)}
                      disabled={pagination.page === 1}
                      title="Primeira página"
                    >
                      «
                    </button>
                  </li>
                  <li className={`page-item ${pagination.page === 1 ? "disabled" : ""}`}>
                    <button
                      className="page-link"
                      onClick={() => handleSearch(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    >
                      Anterior
                    </button>
                  </li>
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    return (
                      <li
                        key={pageNum}
                        className={`page-item ${pagination.page === pageNum ? "active" : ""}`}
                      >
                        <button
                          className="page-link"
                          onClick={() => handleSearch(pageNum)}
                        >
                          {pageNum}
                        </button>
                      </li>
                    );
                  })}
                  <li className={`page-item ${pagination.page === pagination.totalPages ? "disabled" : ""}`}>
                    <button
                      className="page-link"
                      onClick={() => handleSearch(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      Próxima
                    </button>
                  </li>
                  <li className={`page-item ${pagination.page === pagination.totalPages ? "disabled" : ""}`}>
                    <button
                      className="page-link"
                      onClick={() => handleSearch(pagination.totalPages)}
                      disabled={pagination.page === pagination.totalPages}
                      title="Última página"
                    >
                      »
                    </button>
                  </li>
                </ul>
              </nav>
              <div className="text-center mt-3">
                <small className="text-muted">
                  {pagination.total.toLocaleString("pt-BR")} resultado{pagination.total !== 1 ? "s" : ""}
                </small>
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .search-result-item {
          padding: 12px 0;
        }
        
        .search-result-item:hover {
          background-color: #fafafa;
          margin: 0 -12px;
          padding: 12px;
          border-radius: 8px;
        }
      `}</style>
    </Container>
  );
}
