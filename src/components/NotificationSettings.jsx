import { useEffect, useState } from 'react';
import { Bell, BellOff, Smartphone } from 'lucide-react';
import {
  disablePushNotifications,
  enablePushNotifications,
  isInstalledPwa,
  isIos,
  notificationStatus,
  supportsPushNotifications,
  syncAppBadge,
} from '../pushNotifications.js';

export default function NotificationSettings({ onSessionExpired }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const supported = supportsPushNotifications();
  const needsInstallation = isIos() && !isInstalledPwa();

  useEffect(() => {
    if (!supported) return;
    notificationStatus()
      .then((result) => {
        setStatus(result);
        syncAppBadge(result.unread_count);
      })
      .catch((requestError) => {
        if (requestError.status === 401) onSessionExpired();
        else setError(requestError.message);
      });
  }, [onSessionExpired, supported]);

  async function toggle() {
    setBusy(true);
    setError('');
    try {
      setStatus(status?.subscribed
        ? await disablePushNotifications()
        : await enablePushNotifications());
    } catch (requestError) {
      if (requestError.status === 401) onSessionExpired();
      else setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  const active = Boolean(status?.subscribed);
  const Icon = active ? Bell : BellOff;

  return (
    <section className="config-section notification-settings">
      <h2>Notificações</h2>
      <p className="section-copy">Receba um aviso quando uma nova vaga passar pelos seus filtros e pela análise de compatibilidade.</p>

      {!supported ? <div className="notification-state unavailable"><BellOff /><div><strong>Notificações indisponíveis</strong><p>Este navegador ou conexão não oferece suporte a Web Push.</p></div></div>
        : needsInstallation ? <div className="notification-state"><Smartphone /><div><strong>Instale o VagaFlow</strong><p>No iPhone, use Compartilhar e Adicionar à Tela de Início. Depois abra o aplicativo instalado para ativar.</p></div></div>
          : <div className={`notification-state${active ? ' active' : ''}`}><Icon /><div><strong>{active ? 'Ativas neste dispositivo' : 'Desativadas neste dispositivo'}</strong><p>{active ? `${status?.unread_count || 0} vaga(s) nova(s) ainda não visualizada(s).` : 'Ative para receber alertas mesmo com o aplicativo fechado.'}</p></div><button type="button" onClick={toggle} disabled={busy || !status?.available}>{busy ? 'Aguarde...' : active ? 'Desativar' : 'Ativar'}</button></div>}

      {supported && !needsInstallation && status && !status.available && <p className="field-error">As chaves VAPID ainda não foram configuradas na API.</p>}
      {status?.permission === 'denied' && <p className="field-error">A permissão foi bloqueada. Reative as notificações nos ajustes do sistema.</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
    </section>
  );
}
