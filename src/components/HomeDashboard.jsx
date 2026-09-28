import { ArrowRight, RefreshCw } from 'lucide-react';
import JobCard from './JobCard.jsx';

function minutesUntilNextSearch() {
  const now = new Date();
  const currentMinute = now.getMinutes();

  return currentMinute < 30 ? 30 - currentMinute : 60 - currentMinute;
}

function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'VF';
}

export default function HomeDashboard({
  user,
  jobs,
  total,
  profile,
  loading,
  refreshing,
  error,
  onRefresh,
  onConfigure,
  onNavigate,
}) {
  const firstName = user.name.trim().split(/\s+/)[0];
  const active = Boolean(profile?.is_active);
  const nextSearch = active ? minutesUntilNextSearch() : null;
  const rankedJobs = [...jobs].sort((left, right) => (right.score || 0) - (left.score || 0));
  const recentJobs = rankedJobs.slice(0, 2);
  const newJobs = jobs.filter((job) => job.status === 'new').length;

  return (
    <div className="home-dashboard">
      <header className="home-welcome reveal-item">
        <div className="user-avatar" aria-hidden="true">{initials(user.name)}</div>
        <div>
          <p>Visão geral</p>
          <h1>Olá, {firstName}</h1>
          <span>{active ? 'Sua busca está ativa' : 'Sua busca está pausada'}</span>
        </div>
      </header>

      <section className={`automation-panel reveal-item${active ? ' active' : ''}`} aria-label="Status da automação">
        <span className="status-dot" />
        <div>
          <strong>{active ? 'Automação ativa' : profile?.is_ready ? 'Automação pausada' : 'Configure sua automação'}</strong>
          <p>{active && nextSearch
            ? `Próxima busca em ${nextSearch} min`
            : profile?.is_ready
              ? 'Ative a busca para encontrar novas oportunidades'
              : 'Adicione seus filtros e currículo para começar'}</p>
        </div>
        <button
          className={refreshing ? 'refresh-button refreshing' : 'refresh-button'}
          type="button"
          onClick={active ? onRefresh : onConfigure}
          title={active ? 'Atualizar dados' : 'Configurar automação'}
          aria-label={active ? 'Atualizar dados' : 'Configurar automação'}
          disabled={refreshing}
        >
          {active ? <RefreshCw size={23} strokeWidth={1.8} /> : <ArrowRight size={23} strokeWidth={1.8} />}
        </button>
      </section>

      <section className="metrics-strip reveal-item" aria-label="Resumo das oportunidades">
        <div><strong>{newJobs}</strong><span>novas</span></div>
        <div><strong>{total}</strong><span>analisadas</span></div>
        <div><strong>{total}</strong><span>currículos</span></div>
      </section>

      <section className="opportunities-section reveal-item">
        <div className="section-heading-row">
          <div>
            <p>Recomendadas para você</p>
            <h2>Melhores oportunidades</h2>
          </div>
          <button type="button" onClick={() => onNavigate('/vagas')}>Ver todas</button>
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}

        {loading ? (
          <div className="opportunities-skeleton" aria-label="Carregando oportunidades"><span /><span /></div>
        ) : recentJobs.length ? (
          <div className="opportunity-stack">
            {recentJobs.map((job) => <JobCard job={job} key={job.id} compact onOpen={() => onNavigate(`/vagas/${job.id}`)} />)}
          </div>
        ) : (
          <div className="home-empty">
            <strong>Nenhuma oportunidade analisada ainda</strong>
            <p>Assim que a automação encontrar uma vaga compatível, ela aparecerá aqui.</p>
          </div>
        )}
      </section>
    </div>
  );
}
