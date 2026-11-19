type StatusPanelProps = {
  title: string;
  body: string;
};

export function StatusPanel({ title, body }: StatusPanelProps) {
  return (
    <section className="status-panel" role="status">
      <h2>{title}</h2>
      <p>{body}</p>
    </section>
  );
}
