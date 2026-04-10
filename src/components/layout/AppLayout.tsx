import { ReactNode } from 'react';

interface AppLayoutProps {
  header: ReactNode;
  grid: ReactNode;
  controls: ReactNode;
  report: ReactNode;
}

export function AppLayout({ header, grid, controls, report }: AppLayoutProps) {
  return (
    <div className="app-layout">
      <header className="app-header">{header}</header>
      <main className="app-main">
        <section className="grid-section">{grid}</section>
        <aside className="side-panel">
          <div className="controls-section">{controls}</div>
          <div className="report-section">{report}</div>
        </aside>
      </main>
    </div>
  );
}
