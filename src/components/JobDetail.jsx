import { useEffect, useState } from 'react';
import {
  Archive,
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  CircleX,
  Code2,
  Heart,
  MapPin,
  RotateCcw,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { apiRequest } from '../api.js';
import InlineResumePreview from './InlineResumePreview.jsx';
import { syncAppBadge } from '../pushNotifications.js';

function relativeTime(value) {
  if (!value) return 'agora';
  const hours = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 3600000));
  if (hours < 1) return 'há poucos minutos';
  if (hours < 24) return `há ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  const days = Math.floor(hours / 24);
  return `há ${days} ${days === 1 ? 'dia' : 'dias'}`;
}

function compatibilityLabel(score) {
  if (score >= 90) return 'Excelente compatibilidade';
  if (score >= 80) return 'Ótima compatibilidade';
  if (score >= 70) return 'Boa compatibilidade';
  return 'Compatibilidade moderada';
}

function DetailList({ items, tone = 'positive' }) {
  if (!items?.length) return <p className="detail-empty-copy">Nenhum ponto específico informado.</p>;
  return (
    <ul className={`detail-list ${tone}`}>
      {items.map((item) => <li key={item}>{tone === 'positive' ? <CheckCircle2 /> : <TriangleAlert />}<span>{item}</span></li>)}
    </ul>
  );
}

const applicationStages = [
  { value: 'new', label: 'Para candidatar', icon: BriefcaseBusiness },
  { value: 'applied', label: 'Candidatado', icon: CheckCircle2 },
  { value: 'interview', label: 'Entrevista', icon: Sparkles },
  { value: 'rejected', label: 'Reprovado', icon: CircleX },
];

export default function JobDetail({ jobId, onBack, onNavigate, onSessionExpired }) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [confirmApplication, setConfirmApplication] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest(`/api/jobs/${jobId}`)
      .then(({ data, meta }) => { if (active) { setJob(data); syncAppBadge(meta?.unread_count || 0); } })
      .catch((requestError) => {
        if (requestError.status === 401) onSessionExpired();
        else if (active) setError(requestError.status === 404 ? 'Esta vaga não está mais disponível.' : 'Não foi possível carregar a vaga.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [jobId]);

  async function changeStatus(status) {
    setUpdating(true);
    setError('');
    try {
      const { data } = await apiRequest(`/api/jobs/${jobId}/status`, { method: 'PATCH', body: { status } });
      setJob(data);
      if (status === 'ignored') {
        window.sessionStorage.setItem('vagaflow:ignored-job', JSON.stringify({ id: job.id, title: job.title, previousStatus: job.status }));
        onNavigate('/vagas');
      }
    } catch (requestError) {
      if (requestError.status === 401) onSessionExpired();
      else setError('Não foi possível atualizar a vaga.');
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <div className="detail-page"><div className="detail-skeleton" /></div>;

  if (!job) {
    return <div className="detail-page"><button className="detail-back-inline" type="button" onClick={onBack}><ArrowLeft />Voltar</button><p className="form-error">{error}</p></div>;
  }

  const saved = job.status === 'saved';
  const canSave = ['new', 'saved'].includes(job.status);
  const initial = (job.company || job.title || 'V').trim().charAt(0).toUpperCase();
  const requirements = [...(job.requirements || []), ...(job.desired_requirements || [])];
  const statusLabel = { new: 'Nova', saved: 'Salva', applied: 'Candidatado', interview: 'Entrevista', rejected: 'Reprovado', ignored: 'Ignorada' }[job.status] || job.status;

  function openOpportunity() {
    if (!job.url || !/^https?:\/\//i.test(job.url)) return;
    window.open(job.url, '_blank', 'noopener,noreferrer');
    setConfirmApplication(true);
  }

  return (
    <div className="detail-page">
      <header className="detail-topbar">
        <button type="button" onClick={onBack} aria-label="Voltar"><ArrowLeft /></button>
        <h1>Detalhes da vaga</h1>
        {canSave ? <button className={saved ? 'saved' : ''} type="button" disabled={updating}
          onClick={() => changeStatus(saved ? 'new' : 'saved')} aria-label={saved ? 'Remover dos favoritos' : 'Salvar vaga'}>
          <Heart fill={saved ? 'currentColor' : 'none'} />
        </button> : <span className="detail-topbar-placeholder" />}
      </header>

      <main className="detail-content">
        <section className="detail-job-heading">
          <div className="detail-company-mark" aria-hidden="true">{initial}</div>
          <div>
            <h2>{job.title}</h2>
            <p>{job.company || 'Empresa não informada'}</p>
            <div className="detail-meta">
              <span><MapPin />{job.work_mode === 'remoto' ? 'Remoto' : [job.location, job.work_mode].filter(Boolean).join(' - ')}</span>
              <span><BriefcaseBusiness />{job.level || job.contract_type || 'Nível não informado'}</span>
              <span className={`job-status-pill ${job.status}`}>{statusLabel}</span>
            </div>
          </div>
          <time>{relativeTime(job.discovered_at || job.created_at)}</time>
        </section>

        <section className="application-stage-card" aria-labelledby="application-stage-title">
          <h3 id="application-stage-title">Etapa da candidatura</h3>
          <div className="application-stage-options">
            {applicationStages.map((stage) => {
              const StageIcon = stage.icon;
              const active = job.status === stage.value || (stage.value === 'new' && job.status === 'saved');
              return <button className={active ? `active ${stage.value}` : stage.value} type="button" key={stage.value} disabled={updating || active} onClick={() => changeStatus(stage.value)}><StageIcon />{stage.label}</button>;
            })}
          </div>
        </section>

        <section className="compatibility-card">
          <div><strong>{job.score || 0}</strong><span>/100</span></div>
          <p>{compatibilityLabel(job.score || 0)}</p>
          <progress value={job.score || 0} max="100" />
        </section>

        <section className="job-information-card detail-description-card">
          <h3>Descrição da vaga</h3>
          <p>{job.description || job.analysis?.summary || 'A descrição completa não foi informada pela plataforma de origem.'}</p>
        </section>

        <section className="technologies-card">
          <h3><Code2 />Tecnologias</h3>
          <div className="technology-list">{job.technologies?.map((technology) => <span key={technology}>{technology}</span>)}</div>
        </section>

        <section className="job-information-card detail-requirements-card">
          <h3>Requisitos</h3>
          {requirements.length ? <ul>{requirements.map((item) => <li key={item}><CheckCircle2 />{item}</li>)}</ul> : <p>Não foram informados requisitos separados.</p>}
        </section>

        {job.benefits?.length > 0 && <section className="job-information-card detail-benefits-card"><h3>Benefícios</h3><ul>{job.benefits.map((item) => <li key={item}><CheckCircle2 />{item}</li>)}</ul></section>}

        <section className="reason-card">
          <span><Check /></span>
          <div><h3>Por que combina</h3><p>{job.analysis?.reason || job.analysis?.summary || 'A IA identificou aderência entre seu perfil e esta oportunidade.'}</p></div>
        </section>

        <div className="analysis-grid">
          <section className="analysis-card">
            <h3><Sparkles />Pontos fortes</h3>
            <DetailList items={job.analysis?.strengths} />
          </section>
          <section className="analysis-card attention">
            <h3><TriangleAlert />Pontos de atenção</h3>
            <DetailList items={job.analysis?.attention_points} tone="attention" />
          </section>
        </div>

        {job.analysis?.preparation && <section className="job-information-card preparation detail-preparation-card"><h3>Como se preparar</h3><p>{job.analysis.preparation}</p></section>}

        {job.has_personalized_resume && <InlineResumePreview job={job} />}

        {error && <p className="form-error" role="alert">{error}</p>}
      </main>

      <footer className="detail-actions-bar">
        <button type="button" onClick={() => changeStatus(job.status === 'ignored' ? 'new' : 'ignored')} disabled={updating}>
          {job.status === 'ignored' ? <RotateCcw /> : <Archive />}{job.status === 'ignored' ? 'Restaurar' : 'Arquivar'}
        </button>
        {job.url && /^https?:\/\//i.test(job.url) ? <button className="primary-action" type="button" onClick={openOpportunity}><ArrowUpRight />Abrir vaga</button> : <button type="button" disabled><ArrowUpRight />Link indisponível</button>}
      </footer>

      {confirmApplication && (
        <div className="application-confirmation" role="dialog" aria-modal="true" aria-labelledby="application-confirmation-title">
          <button className="confirmation-backdrop" type="button" onClick={() => setConfirmApplication(false)} aria-label="Fechar confirmação" />
          <div className="confirmation-sheet">
            <span><CheckCircle2 /></span>
            <h2 id="application-confirmation-title">Você se candidatou?</h2>
            <p>Atualize a etapa para acompanhar esta oportunidade no seu pipeline.</p>
            <button className="confirmation-primary" type="button" disabled={updating} onClick={async () => { await changeStatus('applied'); setConfirmApplication(false); }}>Sim, marcar como candidatado</button>
            <button type="button" onClick={() => setConfirmApplication(false)}>Ainda não</button>
          </div>
        </div>
      )}
    </div>
  );
}
