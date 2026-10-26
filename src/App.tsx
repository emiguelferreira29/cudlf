import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Utilizador, Evento, Atleta } from './types';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AvaliacaoEvento from './pages/AvaliacaoEvento';
import Admin from './pages/Admin';

export default function App() {
  const [user, setUser] = useState<Utilizador | null>(null);
  const [view, setView] = useState<'login' | 'dashboard' | 'admin' | 'evento'>('login');
  const [nomeClube, setNomeClube] = useState('Clube');
  
  const [eventoSelecionado, setEventoSelecionado] = useState<Evento | null>(null);
  const [atletas, setAtletas] = useState<Atleta[]>([]);

  useEffect(() => {
    fetchConfiguracoes();
  }, []);

  const fetchConfiguracoes = async () => {
    const { data } = await supabase.from('configuracoes').select('*').eq('chave', 'nome_clube').single();
    if (data) setNomeClube(data.valor);
  };

  const fazerLogout = () => {
    setUser(null);
    setView('login');
    setEventoSelecionado(null);
  };

  if (!user || view === 'login') {
    return (
      <Login 
        nomeClube={nomeClube} 
        onLoginSuccess={(u) => { setUser(u); setView('dashboard'); }} 
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
          <button onClick={() => setView('dashboard')} style={btnNavStyle(view === 'dashboard')}>Painel</button>
          {user.perfil === 'admin' && (
            <button onClick={() => setView('admin')} style={btnNavStyle(view === 'admin')}>Admin</button>
          )}
          <button onClick={fazerLogout} style={{ background: '#dc2626', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85em' }}>Sair</button>
        </div>
      </header>

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
        {view === 'dashboard' && (
          <Dashboard 
            user={user} 
            onSelecionarEvento={(ev) => { setEventoSelecionado(ev); setView('evento'); }}
            onAtualizarAtletas={(lista) => setAtletas(lista)}
          />
        )}

        {view === 'evento' && eventoSelecionado && (
          <AvaliacaoEvento 
            evento={eventoSelecionado}
            user={user}
            atletas={atletas}
            onVoltar={() => setView('dashboard')}
            onGuardado={() => setView('dashboard')}
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