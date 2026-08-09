export default function AdminLoading() {
  return (
    <main aria-busy="true" aria-label="Carregando conteúdo" className="admin-page admin-loading">
      <span className="sr-only" role="status">Carregando informações atualizadas</span>
      <div className="skeleton skeleton-eyebrow" />
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-copy" />
      <section className="skeleton-grid" aria-hidden="true">
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </section>
      <div aria-hidden="true" className="skeleton skeleton-panel" />
    </main>
  );
}
