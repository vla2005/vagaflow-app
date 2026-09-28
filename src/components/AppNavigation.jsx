import {
  BriefcaseBusiness,
  House,
  LogOut,
  Settings,
} from 'lucide-react';

const items = [
  { path: '/', label: 'Início', icon: House },
  { path: '/vagas', label: 'Vagas', icon: BriefcaseBusiness },
  { path: '/configuracao', label: 'Ajustes', icon: Settings },
];

export default function AppNavigation({ path, onNavigate, onLogout }) {
  return (
    <nav className="app-navigation" aria-label="Navegação principal">
      <button className="nav-brand" type="button" onClick={() => onNavigate('/')} aria-label="Ir para o início">
        <img src="/logo.png" alt="" />
        <span>Vaga<strong>Flow</strong></span>
      </button>

      <div className="nav-items">
        {items.map(({ path: itemPath, label, icon: Icon }) => {
          const active = path === itemPath;

          return (
            <button
              className={`nav-item${active ? ' active' : ''}`}
              type="button"
              key={itemPath}
              onClick={() => onNavigate(itemPath)}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={23} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      <button className="nav-logout" type="button" onClick={onLogout}>
        <LogOut size={21} strokeWidth={1.8} aria-hidden="true" />
        <span>Sair</span>
      </button>
    </nav>
  );
}
