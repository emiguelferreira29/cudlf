import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import type { Utilizador, Evento, Atleta } from './types';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AvaliacaoEvento from './pages/AvaliacaoEvento';
import Admin from './pages/Admin';

export default function App() {
  // 1. Recupera o utilizador autenticado guardado no navegador
  const [user, setUser] = useState<Utilizador | null>(() => {
    const salvo = localStorage.getItem('clube_user');
    try {
      return salvo ? JSON.parse(salvo) : null;
    } catch {
      return null;
    }
  });

  // 2. Recupera o evento que estava selecionado (se houver)
  const [eventoSelecionado, setEventoSelecionado] = useState<Evento | null>(() => {
    const salvo = localStorage.getItem('clube_evento');
    try {
      return salvo ? JSON.parse(salvo) : null;
    } catch {
      return null;
    }
  });

  // 3. Recupera o ecrã onde o utilizador se encontrava
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

  // Carrega configurações e a lista de atletas logo no arranque
  useEffect(() => {
    fetchConfiguracoes();
    fetchAtletas();
  }, []);

  const fetchConfiguracoes = async () => {
    const { data } = await supabase.from('configuracoes').select('*').eq('chave', 'nome_clube').single();
    if (data) setNomeClube(data.valor);
  };

  const fetchAtletas = async () => {
    const { data } = await supabase.from('atletas').select('*').order('nome');
    if (data) setAtletas(data as Atleta[]);
  };

  // Funções de transição de ecrã com persistência
  const navegarPara = (novaView: 'dashboard' | 'admin') => {
    setView(novaView);
    localStorage.setItem('clube_view', novaView);
  };

  const selecionarEvento = (ev: Evento) => {
    setEventoSelecionado(ev);
    setView('evento');
    localStorage.setItem('clube_evento', JSON.stringify(ev));
    localStorage.setItem('clube_view', 'evento');
  };

  const voltarParaDashboard = () => {
    setEventoSelecionado(null);
    setView('dashboard');
    localStorage.removeItem('clube_evento');
    localStorage.setItem('clube_view', 'dashboard');
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
    localStorage.removeItem('clube_user');
    localStorage.removeItem('clube_view');
    localStorage.removeItem('clube_evento');
  };

  if (!user || view === 'login') {
    return (
      <Login 
        nomeClube={nomeClube} 
        onLoginSuccess={loginSucesso} 
      />
    );
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
          <button onClick={() => navegarPara('dashboard')} style={btnNavStyle(view === 'dashboard')}>Painel</button>
          {user.perfil === 'admin' && (
            <button onClick={() => navegarPara('admin')} style={btnNavStyle(view === 'admin')}>Admin</button>
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
            onVoltar={voltarParaDashboard}
            onGuardado={voltarParaDashboard}
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