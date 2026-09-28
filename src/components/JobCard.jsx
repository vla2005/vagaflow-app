import { ArrowRight, MapPin } from 'lucide-react';

function relativeTime(value) {
  if (!value) return 'agora';

  const elapsed = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(elapsed / 60000));

  if (minutes < 60) return `há ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} ${hours === 1 ? 'hora' : 'horas'}`;

  const days = Math.floor(hours / 24);
  return `há ${days} ${days === 1 ? 'dia' : 'dias'}`;
}

function locationLabel(job) {
  if (job.work_mode === 'remoto') return 'Remoto';

  return [job.location, job.work_mode].filter(Boolean).join(' - ') || 'Local não informado';
}

export default function JobCard({ job, compact = false, onOpen }) {
  const companyInitial = (job.company || job.title || 'V').trim().charAt(0).toUpperCase();

  return (
    <article
      className={`opportunity-card clickable${compact ? ' compact' : ''}`}
      role="link"
      tabIndex="0"
      onClick={() => onOpen?.(job)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen?.(job);
        }
      }}
    >
      <div className="company-mark" aria-hidden="true">{companyInitial}</div>

      <div className="opportunity-copy">
        <div className="opportunity-title-row">
          <div>
            <h3>{job.title}</h3>
            <p>{job.company || 'Empresa não informada'}</p>
          </div>
          <time dateTime={job.discovered_at || job.created_at}>{relativeTime(job.discovered_at || job.created_at)}</time>
        </div>

        <div className="opportunity-location">
          <MapPin size={18} strokeWidth={1.8} aria-hidden="true" />
          <span>{locationLabel(job)}</span>
        </div>

        <div className="match-row">
          <span>Compatibilidade</span>
          <progress value={job.score || 0} max="100" aria-label={`Compatibilidade de ${job.score || 0}%`} />
          <strong>{job.score || 0}%</strong>
        </div>
      </div>

      <div className="opportunity-actions">
        <button type="button" onClick={(event) => { event.stopPropagation(); onOpen?.(job); }} title="Ver detalhes" aria-label={`Ver detalhes de ${job.title}`}>
          <ArrowRight size={19} strokeWidth={1.9} />
        </button>
      </div>
    </article>
  );
}
