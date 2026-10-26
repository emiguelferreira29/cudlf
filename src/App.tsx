import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import type { Utilizador, Evento, Atleta } from './types';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AvaliacaoEvento from './pages/AvaliacaoEvento';
import Admin from './pages/Admin';
import Relatorio from './pages/Relatorio';

export default function App() {
  const [user, setUser] = useState<Utilizador | null>(() => {
    const salvo = localStorage.getItem('clube_user');
    try { return salvo ? JSON.parse(salvo) : null; } catch { return null; }
  });

  const [eventoSelecionado, setEventoSelecionado] = useState<Evento | null>(() => {
    const salvo = localStorage.getItem('clube_evento');
    try { return salvo ? JSON.parse(salvo) : null; } catch { return null; }
  });

  const [view, setView] = useState<'login' | 'dashboard' | 'admin' | 'evento' | 'relatorio'>(() => {
    const utilizadorSalvo = localStorage.getItem('clube_user');
    const viewSalva = localStorage.getItem('clube_view') as any;
    const eventoSalvo = localStorage.getItem('clube_evento');

    if (!utilizadorSalvo) return 'login';
    if (viewSalva === 'evento' && eventoSalvo) return 'evento';
    if (['dashboard', 'admin', 'relatorio'].includes(viewSalva)) return viewSalva;
    return 'dashboard';
  });

  const [nomeClube, setNomeClube] = useState('Clube');
  const [atletas, setAtletas] = useState<Atleta[]>([]);

  useEffect(() => {
    fetchConfiguracoes();
    if (user) fetchAtletas();
  }, [user]);

  useEffect(() => {
    const handlePopState = () => {
      if (user && view !== 'dashboard') {
        setEventoSelecionado(null);
        setView('dashboard');
        localStorage.setItem('clube_view', 'dashboard');
        localStorage.removeItem('clube_evento');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user, view]);

  const fetchConfiguracoes = async () => {
    const { data } = await supabase.from('configuracoes').select('*').eq('chave', 'nome_clube').single();
    if (data) setNomeClube(data.valor);
  };

  const fetchAtletas = async () => {
    const { data } = await supabase.from('atletas').select('*').order('nome');
    if (data) setAtletas(data as Atleta[]);
  };

  const irParaView = (novaView: 'dashboard' | 'admin' | 'relatorio') => {
    if (view !== novaView) {
      window.history.pushState({ page: novaView }, '');
      setView(novaView);
      localStorage.setItem('clube_view', novaView);
    }
  };

  const irParaDashboard = () => {
    if (view !== 'dashboard') {
      window.history.back(); 
      setTimeout(() => {
        setView('dashboard');
        setEventoSelecionado(null);
        localStorage.setItem('clube_view', 'dashboard');
        localStorage.removeItem('clube_evento');
      }, 50);
    }
  };

  const selecionarEvento = (ev: Evento) => {
    window.history.pushState({ page: 'evento' }, '');
    setEventoSelecionado(ev);
    setView('evento');
    localStorage.setItem('clube_evento', JSON.stringify(ev));
    localStorage.setItem('clube_view', 'evento');
  };

  const loginSucesso = (u: Utilizador) => {
    setUser(u);
    setView('dashboard');
    localStorage.setItem('clube_user', JSON.stringify(u));
    localStorage.setItem('clube_view', 'dashboard');
    fetchAtletas();
  };

  const fazerLogout = () => {
    setUser(null);
    setEventoSelecionado(null);
    setView('login');
    localStorage.clear();
  };

  if (!user || view === 'login') {
    return <Login nomeClube={nomeClube} onLoginSuccess={loginSucesso} />;
  }

  const btnNavStyle = (ativo: boolean) => ({
    background: ativo ? '#334155' : 'transparent',
    color: 'white',
    border: '1px solid #334155',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.85em'
  });

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', fontSize: '0.95em' }}>
      <header className="no-print" style={{ backgroundColor: '#0f172a', padding: '15px 20px', color: 'white', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.2em' }}>⚽ {nomeClube}</div>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ fontSize: '0.85em', color: '#cbd5e1', marginRight: '5px' }}>{user.nome.split(' ')[0]}</span>
          <button onClick={irParaDashboard} style={btnNavStyle(view === 'dashboard')}>Painel</button>
          <button onClick={() => irParaView('relatorio')} style={btnNavStyle(view === 'relatorio')}>Relatórios</button>
          {user.perfil === 'admin' && (
            <button onClick={() => irParaView('admin')} style={btnNavStyle(view === 'admin')}>Admin</button>
          )}
          <button onClick={fazerLogout} style={{ background: '#dc2626', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85em' }}>Sair</button>
        </div>
      </header>

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
        {view === 'dashboard' && (
          <Dashboard 
            user={user} 
            onSelecionarEvento={selecionarEvento}
            onAtualizarAtletas={(lista) => setAtletas(lista)}
          />
        )}

        {view === 'evento' && eventoSelecionado && (
          <AvaliacaoEvento 
            evento={eventoSelecionado}
            user={user}
            atletas={atletas}
            onVoltar={irParaDashboard}
            onGuardado={irParaDashboard}
          />
        )}

        {view === 'relatorio' && (
          <Relatorio atletas={atletas} />
        )}

        {view === 'admin' && user.perfil === 'admin' && (
          <Admin 
            nomeClube={nomeClube}
            onNomeClubeAtualizado={fetchConfiguracoes}
          />
        )}
      </main>
    </div>
  );
}