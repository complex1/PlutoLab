import "@fortawesome/fontawesome-free/css/all.min.css";
import { formatResult } from "./convertLogic";
import { unitCategories } from "./unitCategories";
import { useConverter } from "./useConverter";
import "./Converter.css";

export default function Converter() {
  const {
    category,
    categoryId,
    fromUnitId,
    toUnitId,
    inputValue,
    setInputValue,
    setFromUnitId,
    setToUnitId,
    result,
    allResults,
    searchQuery,
    setSearchQuery,
    searchResults,
    showAllUnits,
    setShowAllUnits,
    copyFeedback,
    recent,
    favorites,
    favoriteActive,
    selectCategory,
    applySearchMatch,
    swapUnits,
    reset,
    copyResult,
    toggleFavoritePair,
    applyFavorite,
    applyRecent,
  } = useConverter();

  return (
    <div className="converter">
      <header className="converter-header">
        <div className="converter-header-icon" aria-hidden="true">
          <i className="fa-solid fa-right-left" />
        </div>
        <div>
          <h1 className="converter-title">Pluto Converter</h1>
          <p className="converter-tagline">Fast unit conversion, right inside your browser.</p>
        </div>
      </header>

      <div className="converter-search-wrap">
        <i className="fa-solid fa-magnifying-glass converter-search-icon" aria-hidden="true" />
        <input
          type="search"
          className="converter-search"
          placeholder="Search conversion or unit…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search conversions"
        />
        {searchQuery && searchResults.length > 0 && (
          <ul className="converter-search-results" role="listbox">
            {searchResults.map((match) => (
              <li key={`${match.categoryId}-${match.unitId}`}>
                <button
                  type="button"
                  className="converter-search-item"
                  onClick={() => applySearchMatch(match)}
                >
                  <span>{match.unitLabel}</span>
                  <span className="converter-search-meta">
                    {match.unitSymbol} · {match.categoryName}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <nav className="converter-categories" aria-label="Conversion categories">
        {unitCategories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`converter-chip ${categoryId === cat.id ? "active" : ""}`}
            onClick={() => selectCategory(cat.id)}
          >
            <i className={`fa-solid ${cat.icon}`} aria-hidden="true" />
            <span>{cat.name}</span>
          </button>
        ))}
      </nav>

      <section className="converter-panel" aria-label="Convert">
        <h2 className="converter-panel-title">Convert</h2>

        <div className="converter-row">
          <label className="converter-field">
            <span className="converter-label">Value</span>
            <input
              type="number"
              inputMode="decimal"
              className="converter-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter value"
            />
          </label>
          <label className="converter-field converter-field--unit">
            <span className="converter-label">From</span>
            <select
              className="converter-select"
              value={fromUnitId}
              onChange={(e) => setFromUnitId(e.target.value)}
            >
              {category.units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.label} ({unit.symbol})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="converter-equals" aria-hidden="true">=</div>

        <div className="converter-row">
          <label className="converter-field">
            <span className="converter-label">Result</span>
            <output className="converter-output">
              {result || "—"}
            </output>
          </label>
          <label className="converter-field converter-field--unit">
            <span className="converter-label">To</span>
            <select
              className="converter-select"
              value={toUnitId}
              onChange={(e) => setToUnitId(e.target.value)}
            >
              {category.units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.label} ({unit.symbol})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="converter-actions">
          <button type="button" className="converter-btn" onClick={swapUnits}>
            <i className="fa-solid fa-right-left" aria-hidden="true" /> Swap Units
          </button>
          <button type="button" className="converter-btn converter-btn--primary" onClick={copyResult}>
            <i className="fa-solid fa-copy" aria-hidden="true" /> Copy Result
          </button>
          <button type="button" className="converter-btn" onClick={reset}>
            <i className="fa-solid fa-rotate-left" aria-hidden="true" /> Reset
          </button>
          <button
            type="button"
            className={`converter-btn converter-btn--icon ${favoriteActive ? "active" : ""}`}
            onClick={toggleFavoritePair}
            title={favoriteActive ? "Remove favorite" : "Add to favorites"}
            aria-label={favoriteActive ? "Remove favorite" : "Add to favorites"}
          >
            <i className={`fa-${favoriteActive ? "solid" : "regular"} fa-star`} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`converter-btn ${showAllUnits ? "active" : ""}`}
            onClick={() => setShowAllUnits((v) => !v)}
          >
            <i className="fa-solid fa-table-cells" aria-hidden="true" /> All Units
          </button>
        </div>

        {copyFeedback && <p className="converter-feedback" role="status">{copyFeedback}</p>}
      </section>

      {showAllUnits && allResults.length > 0 && (
        <section className="converter-multi" aria-label="All unit conversions">
          <h2 className="converter-section-title">All {category.name} Units</h2>
          <ul className="converter-multi-list">
            {allResults.map(({ unit, result: value }) => (
              <li key={unit.id} className="converter-multi-item">
                <span>{unit.label}</span>
                <strong>{formatResult(value)} {unit.symbol}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="converter-tips" aria-label="Common conversions">
        <h2 className="converter-section-title">Common Conversions</h2>
        <ul className="converter-tips-list">
          {category.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </section>

      {(favorites.length > 0 || recent.length > 0) && (
        <div className="converter-history-grid">
          {favorites.length > 0 && (
            <section className="converter-side" aria-label="Favorites">
              <h2 className="converter-section-title">Favorites</h2>
              <ul className="converter-history-list">
                {favorites.map((fav) => (
                  <li key={fav.id}>
                    <button type="button" className="converter-history-item" onClick={() => applyFavorite(fav)}>
                      <i className="fa-solid fa-star" aria-hidden="true" />
                      {fav.label}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {recent.length > 0 && (
            <section className="converter-side" aria-label="Recent conversions">
              <h2 className="converter-section-title">Recent</h2>
              <ul className="converter-history-list">
                {recent.map((record) => (
                  <li key={record.id}>
                    <button type="button" className="converter-history-item" onClick={() => applyRecent(record)}>
                      {record.label}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
