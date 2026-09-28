import { useMemo, useState } from 'react';
import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  CircleX,
  MoreVertical,
  Search,
  Send,
  UsersRound,
  X,
} from 'lucide-react';
import JobCard from './JobCard.jsx';

const groups = [
  { id: 'ready', title: 'Para candidatar', statuses: ['new', 'saved'], tone: 'ready' },
  { id: 'applied', title: 'Candidatado', statuses: ['applied'], tone: 'applied' },
  { id: 'interview', title: 'Entrevista', statuses: ['interview'], tone: 'interview' },
  { id: 'rejected', title: 'Reprovadas', statuses: ['rejected'], tone: 'rejected' },
  { id: 'ignored', title: 'Ignoradas', statuses: ['ignored'], tone: 'ignored' },
];

const statusFilters = [
  { value: 'all', label: 'Todas' },
  { value: 'new', label: 'Novas' },
  { value: 'saved', label: 'Salvas' },
  { value: 'applied', label: 'Candidatadas' },
  { value: 'interview', label: 'Entrevistas' },
  { value: 'rejected', label: 'Reprovadas' },
  { value: 'ignored', label: 'Ignoradas' },
];

function relativeTime(value) {
  if (!value) return 'agora';
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
  if (days < 1) return 'hoje';
  return `há ${days} ${days === 1 ? 'dia' : 'dias'}`;
}

function jobBadge(job) {
  if (job.status === 'interview') return { icon: CalendarDays, label: 'Em entrevista', tone: 'green' };
  if (job.status === 'rejected') return { icon: CircleX, label: 'Reprovada', tone: 'gray' };
  if (job.status === 'applied') return { icon: Send, label: `Enviado ${relativeTime(job.updated_at)}`, tone: 'blue' };
  if (job.status === 'ignored') return { icon: X, label: 'Ignorada', tone: 'gray' };
  if (job.status === 'saved') return { icon: CheckCircle2, label: 'Vaga salva', tone: 'green' };
  if (job.has_personalized_resume) return { icon: CheckCircle2, label: 'Currículo pronto', tone: 'green' };
  return { icon: CircleAlert, label: 'Revisar requisitos', tone: 'amber' };
}

function PipelineJob({ job, onNavigate, onStatusChange }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const badge = jobBadge(job);
  const BadgeIcon = badge.icon;
  const initial = (job.company || job.title || 'V').trim().charAt(0).toUpperCase();

  const actions = [
    { label: 'Ver detalhes', action: () => onNavigate(`/vagas/${job.id}`) },
    ...(job.status !== 'applied' ? [{ label: 'Marcar como candidatado', action: () => onStatusChange(job, 'applied') }] : []),
    ...(job.status !== 'interview' ? [{ label: 'Mover para entrevista', action: () => onStatusChange(job, 'interview') }] : []),
    ...(job.status !== 'rejected' ? [{ label: 'Marcar como reprovado', action: () => onStatusChange(job, 'rejected'), danger: true }] : []),
    ...(['applied', 'interview', 'rejected', 'ignored'].includes(job.status) ? [{ label: 'Voltar para candidatar', action: () => onStatusChange(job, 'new') }] : []),
    ...(job.status !== 'ignored' ? [{ label: 'Ignorar vaga', action: () => onStatusChange(job, 'ignored'), danger: true }] : []),
  ];

  return (
    <article className="pipeline-job" role="link" tabIndex="0" onClick={() => onNavigate(`/vagas/${job.id}`)}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onNavigate(`/vagas/${job.id}`); } }}>
      <div className="pipeline-company-mark" aria-hidden="true">{initial}</div>
      <div className="pipeline-job-copy">
        <h3>{job.title}</h3>
        <p>{job.company || 'Empresa não informada'}</p>
        <span className={`pipeline-badge ${badge.tone}`}><BadgeIcon />{badge.label}</span>
      </div>
      <div className="pipeline-menu-wrap">
        <button type="button" onClick={(event) => { event.stopPropagation(); setMenuOpen((current) => !current); }} aria-label={`Ações para ${job.title}`}><MoreVertical /></button>
        {menuOpen && (
          <div className="pipeline-menu" onClick={(event) => event.stopPropagation()}>
            {actions.map((item) => <button className={item.danger ? 'danger' : ''} type="button" key={item.label} onClick={() => { setMenuOpen(false); item.action(); }}>{item.label}</button>)}
          </div>
        )}
      </div>
    </article>
  );
}

export default function JobsPipeline({ jobs, ignoredJobs, loading, error, onNavigate, onStatusChange }) {
  const [view, setView] = useState('pipeline');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [collapsed, setCollapsed] = useState({ ignored: true });
  const allJobs = useMemo(() => [...jobs, ...ignoredJobs], [jobs, ignoredJobs]);

  const filteredJobs = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return allJobs.filter((job) => {
      const matchesSearch = !term || `${job.title} ${job.company || ''} ${job.location || ''}`.toLocaleLowerCase('pt-BR').includes(term);
      const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [allJobs, search, statusFilter]);

  const inProgress = allJobs.filter((job) => ['applied', 'interview'].includes(job.status)).length;
  const interviews = allJobs.filter((job) => job.status === 'interview').length;
  const thisWeek = allJobs.filter((job) => Date.now() - new Date(job.updated_at || job.created_at).getTime() <= 7 * 86400000).length;

  return (
    <section className="pipeline-page">
      <header className="pipeline-heading">
        <h1>Candidaturas</h1>
      </header>

      <div className="pipeline-search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cargo, empresa ou local" /><button type="button" onClick={() => setSearch('')} disabled={!search} aria-label="Limpar busca"><X /></button></div>
      <div className="pipeline-filters">{statusFilters.map((filter) => <button className={statusFilter === filter.value ? 'active' : ''} type="button" key={filter.value} onClick={() => setStatusFilter(filter.value)}>{filter.label}</button>)}</div>

      <div className="pipeline-view-toggle" role="tablist" aria-label="Visualização das vagas">
        <button className={view === 'pipeline' ? 'active' : ''} type="button" role="tab" aria-selected={view === 'pipeline'} onClick={() => setView('pipeline')}>Pipeline</button>
        <button className={view === 'list' ? 'active' : ''} type="button" role="tab" aria-selected={view === 'list'} onClick={() => setView('list')}>Lista</button>
      </div>

      <section className="pipeline-metrics" aria-label="Resumo das candidaturas">
        <div><BriefcaseBusiness /><strong>{inProgress}</strong><span>em andamento</span></div>
        <div><UsersRound /><strong>{interviews}</strong><span>entrevistas</span></div>
        <div><CalendarDays /><strong>{thisWeek}</strong><span>esta semana</span></div>
      </section>

      {error && <p className="form-error" role="alert">{error}</p>}
      {loading ? <div className="opportunities-skeleton"><span /><span /><span /></div> : view === 'pipeline' ? (
        <div className="pipeline-groups">
          {groups.map((group) => {
            const groupJobs = filteredJobs.filter((job) => group.statuses.includes(job.status));
            if (!groupJobs.length && (search || statusFilter !== 'all')) return null;
            const isCollapsed = Boolean(collapsed[group.id]);
            return (
              <section className={`pipeline-group ${group.tone}`} key={group.id}>
                <button className="pipeline-group-heading" type="button" onClick={() => setCollapsed((current) => ({ ...current, [group.id]: !isCollapsed }))}>
                  <span>{group.title}<strong>{groupJobs.length}</strong></span><ChevronDown className={isCollapsed ? 'collapsed' : ''} />
                </button>
                {!isCollapsed && <div className="pipeline-group-jobs">{groupJobs.length ? groupJobs.map((job) => <PipelineJob job={job} key={job.id} onNavigate={onNavigate} onStatusChange={onStatusChange} />) : <p className="pipeline-empty">Nenhuma vaga nesta etapa.</p>}</div>}
              </section>
            );
          })}
        </div>
      ) : filteredJobs.length ? (
        <div className="pipeline-list-view">{filteredJobs.map((job) => <JobCard job={job} key={job.id} onOpen={() => onNavigate(`/vagas/${job.id}`)} />)}</div>
      ) : <div className="home-empty"><strong>Nenhuma vaga encontrada</strong><p>Ajuste a busca ou os filtros para ver outras oportunidades.</p></div>}
    </section>
  );
}
