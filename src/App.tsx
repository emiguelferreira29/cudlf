import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import type { Utilizador, Evento, Atleta } from './types';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AvaliacaoEvento from './pages/AvaliacaoEvento';
import Admin from './pages/Admin';

export default function App() {
  const [user, setUser] = useState<Utilizador | null>(() => {
    const salvo = localStorage.getItem('clube_user');
    try { return salvo ? JSON.parse(salvo) : null; } catch { return null; }
  });

  const [eventoSelecionado, setEventoSelecionado] = useState<Evento | null>(() => {
    const salvo = localStorage.getItem('clube_evento');
    try { return salvo ? JSON.parse(salvo) : null; } catch { return null; }
  });

  const [view, setView] = useState<'login' | 'dashboard' | 'admin' | 'evento'>(() => {
    const utilizadorSalvo = localStorage.getItem('clube_user');
    const viewSalva = localStorage.getItem('clube_view');
    const eventoSalvo = localStorage.getItem('clube_evento');

    if (!utilizadorSalvo) return 'login';
    if (viewSalva === 'evento' && eventoSalvo) return 'evento';
    if (viewSalva === 'admin') return 'admin';
    return 'dashboard';
  });

  const [nomeClube, setNomeClube] = useState('Clube');
  const [atletas, setAtletas] = useState<Atleta[]>([]);

  useEffect(() => {
    fetchConfiguracoes();
    if (user) fetchAtletas();
  }, [user]);

  // --- Otimização PWA: Gestão do Botão Voltar (Hardware/Gestos no Telemóvel) ---
  useEffect(() => {
    const handlePopState = () => {
      // Se o utilizador usar o recuo do telemóvel enquanto está fora do dashboard, nós forçamos o regresso em vez de fechar a app
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

  // --- Navegação com History API para suportar o Back Button ---
  const irParaDashboard = () => {
    if (view !== 'dashboard') {
      window.history.back(); // Aciona o evento popstate acima de forma natural
      setTimeout(() => { // Fallback de segurança rápido
        setView('dashboard');
        setEventoSelecionado(null);
        localStorage.setItem('clube_view', 'dashboard');
        localStorage.removeItem('clube_evento');
      }, 50);
    }
  };

  const irParaAdmin = () => {
    if (view !== 'admin') {
      window.history.pushState({ page: 'admin' }, '');
      setView('admin');
      localStorage.setItem('clube_view', 'admin');
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
      <header style={{ backgroundColor: '#0f172a', padding: '15px 20px', color: 'white', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.2em' }}>⚽ {nomeClube}</div>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ fontSize: '0.85em', color: '#cbd5e1', marginRight: '5px' }}>{user.nome.split(' ')[0]}</span>
          <button onClick={irParaDashboard} style={btnNavStyle(view === 'dashboard')}>Painel</button>
          {user.perfil === 'admin' && (
            <button onClick={irParaAdmin} style={btnNavStyle(view === 'admin')}>Admin</button>
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