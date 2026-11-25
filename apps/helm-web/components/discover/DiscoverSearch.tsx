type DiscoverSearchProps = {
  query?: string;
};

export function DiscoverSearch({ query = "" }: DiscoverSearchProps) {
  const hasQuery = query.length > 0;

  return (
    <section
      className="discover-search-section"
      aria-labelledby="discover-search-heading"
    >
      <h2 id="discover-search-heading" className="section-label">
        Search
      </h2>
      <form className="discover-search" method="get" action="/" role="search">
        <label className="discover-search-field" htmlFor="discover-q">
          <span className="discover-search-label">Destination name or slug</span>
          <input
            id="discover-q"
            className="discover-search-input"
            type="search"
            name="q"
            defaultValue={query}
            maxLength={120}
            autoComplete="off"
            enterKeyHint="search"
          />
        </label>
        <div className="discover-search-actions">
          <button className="discover-search-submit" type="submit">
            Search
          </button>
          {hasQuery ? (
            <a className="discover-search-clear" href="/">
              Clear
            </a>
          ) : null}
        </div>
      </form>
    </section>
  );
}
