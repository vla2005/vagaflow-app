import { useEffect, useState } from 'react';
import {
  Check,
  Eye,
  EyeOff,
  FileText,
  LockKeyhole,
  Mail,
  Trash2,
  UploadCloud,
  UserRound,
  X,
} from 'lucide-react';
import { apiFormRequest, apiRequest, getSession } from './api.js';
import AppNavigation from './components/AppNavigation.jsx';
import HomeDashboard from './components/HomeDashboard.jsx';
import JobDetail from './components/JobDetail.jsx';
import JobsPipeline from './components/JobsPipeline.jsx';
import NotificationSettings from './components/NotificationSettings.jsx';
import { useToast } from './components/ToastProvider.jsx';
import { notificationStatus, syncAppBadge } from './pushNotifications.js';

const initialValues = {
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
};

function Brand() {
  return (
    <div className="brand" aria-label="VagaFlow">
      <img className="brand-mark" src="/logo.png" alt="" />
      <span className="brand-name">Vaga<span>Flow</span></span>
    </div>
  );
}

function FormField({ label, name, type = 'text', icon: Icon, value, onChange, error, autoComplete, placeholder }) {
  const [visible, setVisible] = useState(false);
  const password = type === 'password';

  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <div className={`input-wrap${error ? ' input-wrap-error' : ''}`}>
        <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
        <input
          id={name}
          name={name}
          type={password && visible ? 'text' : type}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
          required
        />
        {password && (
          <button
            className="visibility-button"
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
            title={visible ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {visible ? <EyeOff size={21} strokeWidth={1.8} /> : <Eye size={21} strokeWidth={1.8} />}
          </button>
        )}
      </div>
      {error && <p className="field-error" id={`${name}-error`}>{error}</p>}
    </div>
  );
}

function AuthView({ mode, onModeChange, onAuthenticated }) {
  const toast = useToast();
  const registering = mode === 'register';
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setValues(initialValues);
    setErrors({});
    setFormError('');
  }, [mode]);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setFormError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    if (registering && !values.name.trim()) nextErrors.name = 'Informe seu nome.';
    if (!values.email.trim()) nextErrors.email = 'Informe seu e-mail.';
    if (!values.password) nextErrors.password = 'Informe sua senha.';
    if (registering && values.password.length > 0 && values.password.length < 12) {
      nextErrors.password = 'Use pelo menos 12 caracteres.';
    }
    if (registering && values.password_confirmation !== values.password) {
      nextErrors.password_confirmation = 'As senhas precisam ser iguais.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const body = registering
        ? { ...values, name: values.name.trim(), email: values.email.trim() }
        : { email: values.email.trim(), password: values.password };
      const result = await apiRequest(registering ? '/api/register' : '/api/session', {
        method: 'POST', body,
      });
      await onAuthenticated(result.user);
      toast.success(registering ? 'Sua conta foi criada e já está pronta para uso.' : 'Você entrou no VagaFlow.', {
        title: registering ? 'Conta criada' : 'Login realizado',
      });
    } catch (error) {
      setErrors(Object.fromEntries(Object.entries(error.fields || {}).map(([key, messages]) => [key, messages[0]])));
      setFormError(error.status === 429
        ? 'Muitas tentativas. Aguarde um minuto e tente novamente.'
        : error.status === 419
          ? 'A sessão expirou. Atualize a página e tente novamente.'
          : Object.keys(error.fields || {}).length > 0
            ? ''
            : error.message || 'Não foi possível conectar ao servidor.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={`auth-page ${registering ? 'auth-page-register' : 'auth-page-login'}`}>
      <div className="auth-shell">
        <Brand />
        <div className="auth-intro">
          <h1>{registering ? 'Crie sua conta' : 'Bem-vindo de volta'}</h1>
          <p>{registering
            ? 'Organize as vagas que fazem sentido para você.'
            : 'Entre para acompanhar suas oportunidades.'}</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {registering && (
            <FormField label="Nome" name="name" icon={UserRound} value={values.name}
              onChange={handleChange} error={errors.name} autoComplete="name" placeholder="Seu nome completo" />
          )}
          <FormField label="E-mail" name="email" type="email" icon={Mail} value={values.email}
            onChange={handleChange} error={errors.email} autoComplete="email" placeholder="seu@email.com" />
          <FormField label="Senha" name="password" type="password" icon={LockKeyhole} value={values.password}
            onChange={handleChange} error={errors.password}
            autoComplete={registering ? 'new-password' : 'current-password'} placeholder="Sua senha" />
          {registering && (
            <FormField label="Confirmar senha" name="password_confirmation" type="password"
              icon={LockKeyhole} value={values.password_confirmation} onChange={handleChange}
              error={errors.password_confirmation} autoComplete="new-password" placeholder="Repita sua senha" />
          )}

          {formError && <p className="form-error" role="alert">{formError}</p>}

          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? 'Aguarde...' : registering ? 'Criar conta' : 'Entrar'}
          </button>
        </form>

        <p className="auth-switch">
          {registering ? 'Já tem uma conta?' : 'Ainda não tem conta?'}{' '}
          <button type="button" onClick={() => onModeChange(registering ? 'login' : 'register')}>
            {registering ? 'Entrar' : 'Criar conta'}
          </button>
        </p>
      </div>
    </main>
  );
}

function TagField({ label, helper, values, onChange, placeholder, error }) {
  const [draft, setDraft] = useState('');

  function addValues(input = draft) {
    const entries = input
      .split(/[\n,;]+/)
      .map((value) => value.trim().replace(/^(?:[-*•]\s+|\d+[.)]\s+)/, ''))
      .filter(Boolean);
    const known = new Set(values.map((value) => value.toLowerCase()));
    const additions = entries.filter((value) => {
      const normalized = value.toLowerCase();
      if (known.has(normalized)) return false;
      known.add(normalized);
      return true;
    });

    if (additions.length) onChange([...values, ...additions]);
    setDraft('');
  }

  function handlePaste(event) {
    const pasted = event.clipboardData.getData('text');
    if (!/[\n,;]/.test(pasted)) return;

    event.preventDefault();
    addValues(pasted);
  }

  return (
    <div className="config-field">
      <label>{label}</label>
      {helper && <p className="field-helper">{helper}</p>}
      <div className={`tag-input${error ? ' input-wrap-error' : ''}`}>
        {values.map((value) => <span className="tag" key={value}>{value}<button type="button" onClick={() => onChange(values.filter((item) => item !== value))} aria-label={`Remover ${value}`}><X size={14} /></button></span>)}
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={values.length ? '' : placeholder}
          onPaste={handlePaste} onBlur={() => addValues()} onKeyDown={(event) => { if (['Enter', ',', ';'].includes(event.key)) { event.preventDefault(); addValues(); } }} />
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

function ChoiceGroup({ label, options, values, onChange }) {
  return (
    <fieldset className="config-field choice-field">
      <legend>{label}</legend>
      <div className="choice-row">
        {options.map(({ value, label: text }) => {
          const selected = values.includes(value);
          return <button className={selected ? 'choice selected' : 'choice'} type="button" key={value}
            onClick={() => onChange(selected ? values.filter((item) => item !== value) : [...values, value])}>
            {selected && <Check size={15} strokeWidth={2} />}{text}
          </button>;
        })}
      </div>
    </fieldset>
  );
}

function ToggleOption({ label, helper, checked, onChange }) {
  return (
    <div className="filter-toggle-row">
      <div><strong>{label}</strong><p>{helper}</p></div>
      <label className="switch">
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <span />
      </label>
    </div>
  );
}

const seniorityOptions = [
  { value: 'estagio', label: 'Estágio' }, { value: 'junior', label: 'Júnior' },
  { value: 'pleno', label: 'Pleno' }, { value: 'senior', label: 'Sênior' },
  { value: 'especialista', label: 'Especialista' }, { value: 'staff', label: 'Staff' },
  { value: 'coordenador', label: 'Coordenação' }, { value: 'techlead', label: 'Tech Lead' },
  { value: 'diretor', label: 'Diretoria' },
];

const areaOptions = [
  { value: 'backend', label: 'Backend' }, { value: 'frontend', label: 'Frontend' },
  { value: 'fullstack', label: 'Full Stack' }, { value: 'mobile', label: 'Mobile' },
  { value: 'qa', label: 'QA' }, { value: 'devops', label: 'DevOps' },
  { value: 'security', label: 'Segurança' }, { value: 'ia', label: 'IA' },
  { value: 'dados', label: 'Dados' }, { value: 'produto', label: 'Produto' },
  { value: 'cx', label: 'CX' }, { value: 'geral', label: 'Geral' },
];

const platformOptions = [
  { value: 'linkedin', label: 'LinkedIn' }, { value: 'gupy', label: 'Gupy' },
  { value: 'solides', label: 'Sólides' }, { value: 'greenhouse', label: 'Greenhouse' },
  { value: 'inhire', label: 'InHire' }, { value: 'empregos', label: 'Empregos.com' },
  { value: 'catho', label: 'Catho' }, { value: 'quickin', label: 'Quickin' },
  { value: 'indeed', label: 'Indeed' }, { value: 'trampos', label: 'Trampos' },
];

const emptyProfile = {
  is_active: false, job_titles: [], seniorities: ['junior'], technologies: [],
  areas: [], excluded_keywords: [], work_modes: ['remoto'], platforms: [], employment_types: [],
  easy_apply_only: false, locations: [], minimum_score: 75,
  has_resume: false, resume_preview: null, resume_characters: 0,
  resume_parse_status: 'missing', resume_parse_error: null, resume_sections: null,
};

function AutomationView({ onSessionExpired }) {
  const toast = useToast();
  const [profile, setProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let active = true;
    apiRequest('/api/automation').then(({ data }) => { if (active) setProfile({ ...emptyProfile, ...data }); })
      .catch((error) => { if (error.status === 401) onSessionExpired(); else if (active) setErrors({ form: error.message }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!['pending', 'processing'].includes(profile.resume_parse_status)) return undefined;

    const timer = window.setTimeout(() => {
      apiRequest('/api/automation').then(({ data }) => {
        setProfile((current) => ({ ...current, ...data }));
      }).catch((error) => {
        if (error.status === 401) onSessionExpired();
      });
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [profile.resume_parse_status]);

  function update(field, value) {
    setProfile((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
  }

  async function uploadResume(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
      setErrors((current) => ({ ...current, resume: 'Selecione um arquivo PDF válido.' }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((current) => ({ ...current, resume: 'O currículo deve ter no máximo 5 MB.' }));
      return;
    }

    setUploading(true);
    setErrors((current) => ({ ...current, resume: undefined, form: undefined }));
    const body = new FormData();
    body.append('resume', file);
    try {
      const result = await apiFormRequest('/api/automation/resume', body);
      setProfile((current) => ({ ...current, ...result.data, is_active: false, is_ready: false }));
      toast.success(result.message, { title: 'Currículo recebido' });
    } catch (error) {
      setErrors((current) => ({ ...current, resume: error.fields?.resume?.[0] || error.message }));
    } finally {
      setUploading(false);
    }
  }

  async function removeResume() {
    setUploading(true);
    try {
      await apiRequest('/api/automation/resume', { method: 'DELETE' });
      setProfile((current) => ({
        ...current,
        has_resume: false,
        resume_preview: null,
        resume_characters: 0,
        resume_parse_status: 'missing',
        resume_parse_error: null,
        resume_sections: null,
        is_active: false,
        is_ready: false,
      }));
      toast.info('Currículo removido e automação pausada.', { title: 'Currículo removido' });
    } catch (error) {
      setErrors((current) => ({ ...current, resume: error.message }));
    } finally {
      setUploading(false);
    }
  }

  async function retryResumeParsing() {
    setUploading(true);
    setErrors((current) => ({ ...current, resume: undefined }));

    try {
      const { data } = await apiRequest('/api/automation/resume/retry', { method: 'POST' });
      setProfile((current) => ({ ...current, ...data, is_active: false, is_ready: false }));
      toast.info('Nova leitura enviada para processamento.', { title: 'Processamento iniciado' });
    } catch (error) {
      setErrors((current) => ({ ...current, resume: error.fields?.resume?.[0] || error.message }));
    } finally {
      setUploading(false);
    }
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const fields = ['is_active', 'job_titles', 'areas', 'seniorities', 'technologies', 'excluded_keywords', 'work_modes', 'platforms', 'employment_types', 'easy_apply_only', 'locations', 'minimum_score'];
      const body = Object.fromEntries(fields.map((field) => [field, profile[field]]));
      const { data } = await apiRequest('/api/automation', { method: 'PUT', body });
      setProfile((current) => ({ ...current, ...data }));
      toast.success(data.is_active ? 'Automação salva e ativa.' : 'Configuração salva.', {
        title: data.is_active ? 'Automação ativa' : 'Alterações salvas',
      });
    } catch (error) {
      const fieldErrors = Object.fromEntries(Object.entries(error.fields || {}).map(([key, list]) => [key, list[0]]));
      setErrors(Object.keys(fieldErrors).length ? fieldErrors : { form: error.message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <section className="config-content"><div className="config-loading" /></section>;

  return (
      <form className="config-content" onSubmit={save}>
        <div className="config-heading"><p className="eyebrow">AUTOMAÇÃO</p><h1>Defina o que faz sentido para você</h1><p>Esses filtros reduzem ruído antes da análise da IA.</p></div>
        <section className="config-section"><h2>Oportunidades</h2>
          <TagField label="Cargos desejados" helper="Use nomes que costumam aparecer no título da vaga." values={profile.job_titles} onChange={(value) => update('job_titles', value)} placeholder="Ex.: Desenvolvedor Backend" error={errors.job_titles} />
          <ChoiceGroup label="Áreas" values={profile.areas} onChange={(value) => update('areas', value)} options={areaOptions} />
          {errors.areas && <p className="field-error">{errors.areas}</p>}
          <ChoiceGroup label="Senioridades" values={profile.seniorities} onChange={(value) => update('seniorities', value)} options={seniorityOptions} />
          {errors.seniorities && <p className="field-error">{errors.seniorities}</p>}
          <TagField label="Tecnologias de interesse" helper="A vaga precisa mencionar ao menos uma delas quando este campo estiver preenchido." values={profile.technologies} onChange={(value) => update('technologies', value)} placeholder="Ex.: Laravel, React, Java" error={errors.technologies} />
          <TagField label="Descartar quando encontrar" helper="Termos eliminatórios, como stacks ou áreas que você não procura." values={profile.excluded_keywords} onChange={(value) => update('excluded_keywords', value)} placeholder="Ex.: suporte, .NET, Power BI" error={errors.excluded_keywords} />
        </section>
        <section className="config-section"><h2>Local e aderência</h2>
          <ChoiceGroup label="Modalidades" values={profile.work_modes} onChange={(value) => update('work_modes', value)} options={[{ value: 'remoto', label: 'Remoto' }, { value: 'hibrido', label: 'Híbrido' }, { value: 'presencial', label: 'Presencial' }]} />
          {errors.work_modes && <p className="field-error">{errors.work_modes}</p>}
          <ChoiceGroup label="Plataformas" values={profile.platforms} onChange={(value) => update('platforms', value)} options={platformOptions} />
          {errors.platforms && <p className="field-error">{errors.platforms}</p>}
          <ChoiceGroup label="Tipo de contratação" values={profile.employment_types} onChange={(value) => update('employment_types', value)} options={[{ value: 'clt', label: 'CLT' }, { value: 'pj', label: 'PJ' }]} />
          {errors.employment_types && <p className="field-error">{errors.employment_types}</p>}
          <div className="filter-toggles">
            <ToggleOption label="Somente Easy Apply" helper="Prioriza candidaturas rápidas na plataforma de origem." checked={profile.easy_apply_only} onChange={(value) => update('easy_apply_only', value)} />
          </div>
          <TagField label="Localidades" helper="Aplicadas a vagas híbridas e presenciais." values={profile.locations} onChange={(value) => update('locations', value)} placeholder="Ex.: Brasília, Distrito Federal" error={errors.locations} />
          <div className="config-field score-field"><label htmlFor="minimum_score">Aderência mínima <strong>{profile.minimum_score}/100</strong></label><input id="minimum_score" type="range" min="50" max="95" step="1" value={profile.minimum_score} onChange={(event) => update('minimum_score', Number(event.target.value))} /></div>
        </section>
        <section className="config-section"><h2>Currículo base</h2><p className="section-copy">O PDF é usado somente durante a extração. O arquivo original não é armazenado.</p>
          {profile.has_resume ? <div className={`resume-result resume-${profile.resume_parse_status}`}><FileText size={24} strokeWidth={1.7} /><div><strong>{profile.resume_parse_status === 'ready' ? 'Currículo estruturado' : profile.resume_parse_status === 'failed' ? 'Falha ao organizar currículo' : 'Organizando currículo...'}</strong><p>{profile.resume_characters.toLocaleString('pt-BR')} caracteres extraídos{profile.resume_parse_status === 'ready' ? ' e revisáveis' : ''}</p></div><button type="button" onClick={removeResume} disabled={uploading} title="Remover currículo" aria-label="Remover currículo"><Trash2 size={18} /></button></div>
            : <label className={errors.resume ? 'upload-area upload-error' : 'upload-area'}><UploadCloud size={27} strokeWidth={1.6} /><strong>{uploading ? 'Lendo currículo...' : 'Enviar currículo em PDF'}</strong><span>PDF com texto selecionável, até 5 MB</span><input type="file" accept="application/pdf,.pdf" onChange={uploadResume} disabled={uploading} /></label>}
          {profile.resume_parse_status === 'ready' && profile.resume_sections && <div className="resume-sections" aria-label="Seções reconhecidas"><span>{profile.resume_sections.experiences} experiências</span><span>{profile.resume_sections.projects} projetos</span><span>{profile.resume_sections.education} formações</span>{profile.resume_sections.optional?.map((section) => <span key={section}>{section}</span>)}</div>}
          {profile.resume_parse_status === 'failed' && <div className="resume-parse-error"><p>{profile.resume_parse_error || 'Não foi possível organizar as informações do currículo.'}</p><button type="button" onClick={retryResumeParsing} disabled={uploading}>Tentar novamente</button></div>}
          {profile.has_resume && <label className="replace-resume">Substituir PDF<input type="file" accept="application/pdf,.pdf" onChange={uploadResume} disabled={uploading} /></label>}
          {errors.resume && <p className="field-error" role="alert">{errors.resume}</p>}
        </section>
        <NotificationSettings onSessionExpired={onSessionExpired} />
        <section className="activation-row"><div><strong>Ativar automação</strong><p>{profile.resume_parse_status === 'ready' ? 'Novas vagas serão avaliadas usando estes critérios.' : 'Aguarde a organização do currículo antes de ativar.'}</p></div><label className="switch"><input type="checkbox" checked={profile.is_active} disabled={profile.resume_parse_status !== 'ready'} onChange={(event) => update('is_active', event.target.checked)} /><span /></label></section>
        {errors.is_active && <p className="field-error" role="alert">{errors.is_active}</p>}
        {errors.form && <p className="form-error" role="alert">{errors.form}</p>}
        <div className="config-actions"><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar configuração'}</button></div>
      </form>
  );
}

function JobsView({ user, currentPath, onSessionExpired, onConfigure, onNavigate }) {
  const [jobs, setJobs] = useState([]);
  const [ignoredJobs, setIgnoredJobs] = useState([]);
  const [profile, setProfile] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [ignoredUndo, setIgnoredUndo] = useState(null);

  async function loadDashboard(background = false) {
    if (background) setRefreshing(true);
    setError('');

    try {
      const [jobsResult, ignoredResult, profileResult] = await Promise.all([
        apiRequest('/api/jobs?per_page=50'),
        apiRequest('/api/jobs?status=ignored&per_page=50'),
        apiRequest('/api/automation'),
      ]);

      setJobs(jobsResult.data || []);
      setIgnoredJobs(ignoredResult.data || []);
      setTotal(jobsResult.meta?.total ?? jobsResult.data?.length ?? 0);
      setProfile(profileResult.data);
    } catch (requestError) {
      if (requestError.status === 401) onSessionExpired();
      else setError('Não foi possível carregar suas oportunidades.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest('/api/jobs?per_page=50'),
      apiRequest('/api/jobs?status=ignored&per_page=50'),
      apiRequest('/api/automation'),
    ]).then(([jobsResult, ignoredResult, profileResult]) => {
      if (active) {
        setJobs(jobsResult.data || []);
        setIgnoredJobs(ignoredResult.data || []);
        setTotal(jobsResult.meta?.total ?? jobsResult.data?.length ?? 0);
        setProfile(profileResult.data);
      }
    }).catch((requestError) => {
      if (active && requestError.status === 401) onSessionExpired();
      else if (active) setError('Não foi possível carregar suas oportunidades.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (currentPath !== '/vagas') return undefined;
    const stored = window.sessionStorage.getItem('vagaflow:ignored-job');
    if (!stored) return undefined;

    window.sessionStorage.removeItem('vagaflow:ignored-job');
    try {
      setIgnoredUndo(JSON.parse(stored));
    } catch {
      return undefined;
    }

    const timer = window.setTimeout(() => setIgnoredUndo(null), 8000);
    return () => window.clearTimeout(timer);
  }, [currentPath]);

  async function updateJobStatus(job, status) {
    try {
      const { data } = await apiRequest(`/api/jobs/${job.id}/status`, { method: 'PATCH', body: { status } });
      setJobs((current) => status === 'ignored'
        ? current.filter((item) => item.id !== job.id)
        : [...current.filter((item) => item.id !== job.id), data]);
      setIgnoredJobs((current) => status === 'ignored'
        ? [...current.filter((item) => item.id !== job.id), data]
        : current.filter((item) => item.id !== job.id));
    } catch (requestError) {
      if (requestError.status === 401) onSessionExpired();
      else setError('Não foi possível atualizar a etapa da vaga.');
    }
  }

  if (currentPath === '/') {
    return (
      <HomeDashboard
        user={user}
        jobs={jobs}
        total={total}
        profile={profile}
        loading={loading}
        refreshing={refreshing}
        error={error}
        onRefresh={() => loadDashboard(true)}
        onConfigure={onConfigure}
        onNavigate={onNavigate}
      />
    );
  }

  if (currentPath === '/vagas') {
    return (
      <>
        <JobsPipeline
          jobs={jobs}
          ignoredJobs={ignoredJobs}
          loading={loading}
          error={error}
          onNavigate={onNavigate}
          onStatusChange={updateJobStatus}
        />
        {ignoredUndo && <div className="undo-toast" role="status"><span><strong>Vaga ignorada</strong>{ignoredUndo.title}</span><button type="button" onClick={async () => { await updateJobStatus(ignoredUndo, ignoredUndo.previousStatus || 'new'); setIgnoredUndo(null); }}>Desfazer</button></div>}
      </>
    );
  }

  return null;
}

export default function App() {
  const toast = useToast();
  const [mode, setMode] = useState(window.location.pathname === '/cadastro' ? 'register' : 'login');
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [path, setPath] = useState(window.location.pathname);

  async function refreshSession() {
    return getSession();
  }

  useEffect(() => {
    refreshSession().then((session) => {
      setUser(session.user);
    })
      .catch(() => toast.error('Não foi possível conectar ao servidor.'))
      .finally(() => setCheckingSession(false));

    const handleHistory = () => { setMode(window.location.pathname === '/cadastro' ? 'register' : 'login'); setPath(window.location.pathname); };
    window.addEventListener('popstate', handleHistory);
    return () => window.removeEventListener('popstate', handleHistory);
  }, []);

  useEffect(() => {
    if (!user) return;
    notificationStatus().then((status) => syncAppBadge(status.unread_count)).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (user && path === '/curriculos') {
      window.history.replaceState({}, '', '/vagas');
      setPath('/vagas');
    }
  }, [path, user]);

  function changeMode(nextMode) {
    window.history.pushState({}, '', nextMode === 'register' ? '/cadastro' : '/');
    setMode(nextMode);
    setPath(window.location.pathname);
  }

  function navigate(nextPath) { window.history.pushState({}, '', nextPath); setPath(nextPath); }

  if (checkingSession) {
    return <main className="auth-page"><div className="auth-shell"><Brand /><div className="session-loading" aria-label="Carregando" /></div></main>;
  }

  if (user) {
    const jobRoute = path.match(/^\/vagas\/(\d+)$/);
    const focusedView = Boolean(jobRoute);
    const returnToLogin = () => {
      window.history.replaceState({}, '', '/');
      setMode('login');
      setUser(null);
    };

    const logout = async () => {
      try {
        await apiRequest('/api/session', { method: 'DELETE' });
        returnToLogin();
      } catch {
        toast.error('Não foi possível sair agora. Tente novamente.');
      }
    };

    return (
      <main className={`authenticated-app${focusedView ? ' focused-view' : ''}`}>
        {!focusedView && <AppNavigation path={path} onNavigate={navigate} onLogout={logout} />}
        <div className="authenticated-content">
          {jobRoute ? (
            <JobDetail
              jobId={jobRoute[1]}
              onBack={() => navigate('/vagas')}
              onNavigate={navigate}
              onSessionExpired={returnToLogin}
            />
          ) : path === '/configuracao' ? (
            <AutomationView onSessionExpired={returnToLogin} />
          ) : (
            <JobsView
              user={user}
              currentPath={path}
              onConfigure={() => navigate('/configuracao')}
              onNavigate={navigate}
              onSessionExpired={returnToLogin}
            />
          )}
        </div>
      </main>
    );
  }

  return <AuthView mode={mode} onModeChange={changeMode} onAuthenticated={async () => {
      const session = await refreshSession();

      if (!session.user) {
        throw new Error('Não foi possível confirmar a sessão. Tente entrar novamente.');
      }

      window.history.replaceState({}, '', '/');
      setPath('/');
      setUser(session.user);
    }}
    />;
}
