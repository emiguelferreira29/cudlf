import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import type { Utilizador, Evento, Atleta } from './types';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AvaliacaoEvento from './pages/AvaliacaoEvento';
import Admin from './pages/Admin';
import Relatorio from './pages/Relatorio';
import GrelhaNotas from './pages/GrelhaNotas';
import PainelAtleta from './pages/PainelAtleta';

type ViewState = 'login' | 'dashboard' | 'admin' | 'evento' | 'relatorio' | 'atleta' | 'partida_pergunta' | 'partida_nao' | 'partida_sim' | 'grelha';

export default function App() {
  const [user, setUser] = useState<Utilizador | null>(() => {
    const salvo = localStorage.getItem('clube_user');
    try { return salvo ? JSON.parse(salvo) : null; } catch { return null; }
  });

  const [eventoSelecionado, setEventoSelecionado] = useState<Evento | null>(() => {
    const salvo = localStorage.getItem('clube_evento');
    try { return salvo ? JSON.parse(salvo) : null; } catch { return null; }
  });

  const [view, setView] = useState<ViewState>(() => {
    const utilizadorSalvo = localStorage.getItem('clube_user');
    const viewSalva = localStorage.getItem('clube_view') as ViewState;
    const eventoSalvo = localStorage.getItem('clube_evento');

    if (!utilizadorSalvo) return 'login';
    
    try {
      const u = JSON.parse(utilizadorSalvo);
      if (u.perfil === 'atleta' && !['partida_pergunta', 'partida_nao', 'partida_sim'].includes(viewSalva)) return 'atleta';
    } catch {}

    if (viewSalva === 'evento' && eventoSalvo) return 'evento';
    if (['dashboard', 'admin', 'relatorio', 'grelha', 'partida_pergunta', 'partida_nao', 'partida_sim'].includes(viewSalva)) return viewSalva;
    return 'dashboard';
  });

  const [nomeClube, setNomeClube] = useState('Clube');
  const [atletas, setAtletas] = useState<Atleta[]>([]);

  useEffect(() => {
    fetchConfiguracoes();
    if (user && user.perfil !== 'atleta') {
      fetchAtletas();
      supabase.from('utilizadores').select('*').eq('id', user.id).single().then(({ data }) => {
        if (data) {
          setUser(data);
          localStorage.setItem('clube_user', JSON.stringify(data));
          if (view === 'relatorio' && !['admin', 'diretor'].includes(data.perfil) && !data.acesso_relatorios) {
            irParaDashboard();
          }
        }
      });
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (user && user.perfil !== 'atleta' && view !== 'dashboard') {
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

  const irParaView = (novaView: ViewState) => {
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
    localStorage.setItem('clube_user', JSON.stringify(u));

    if (u.perfil === 'atleta' && u.username.toLowerCase().includes('simone')) {
      setView('partida_pergunta');
      localStorage.setItem('clube_view', 'partida_pergunta');
      return;
    }

    if (u.perfil === 'atleta') {
      setView('atleta');
      localStorage.setItem('clube_view', 'atleta');
    } else {
      setView('dashboard');
      localStorage.setItem('clube_view', 'dashboard');
      fetchAtletas();
    }
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
    background: ativo ? '#334155' : 'transparent', color: 'white', border: '1px solid #334155', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85em'
  });

  const podeVerRelatorios = ['admin', 'diretor'].includes(user.perfil) || user.acesso_relatorios;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', fontSize: '0.95em' }}>
      <header className="no-print" style={{ backgroundColor: '#0f172a', padding: '15px 20px', color: 'white', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.2em' }}>⚽ {nomeClube}</div>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ fontSize: '0.85em', color: '#cbd5e1', marginRight: '5px' }}>{user.nome.split(' ')[0]}</span>
          {user.perfil !== 'atleta' && (
            <>
              <button onClick={irParaDashboard} style={btnNavStyle(view === 'dashboard')}>Painel</button>
              <button onClick={() => irParaView('grelha')} style={btnNavStyle(view === 'grelha')}>Grelha de Notas</button>
              {podeVerRelatorios && <button onClick={() => irParaView('relatorio')} style={btnNavStyle(view === 'relatorio')}>Relatórios Direção</button>}
              {user.perfil === 'admin' && <button onClick={() => irParaView('admin')} style={btnNavStyle(view === 'admin')}>Admin</button>}
            </>
          )}
          <button onClick={fazerLogout} style={{ background: '#dc2626', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85em' }}>Sair</button>
        </div>
      </header>

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
        
        {view === 'partida_pergunta' && (
          <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center', marginTop: '10vh' }}>
            <div style={{ fontSize: '4em', marginBottom: '20px' }}>🤔</div>
            <h2 style={{ color: '#0f172a', fontSize: '1.8em', marginBottom: '10px' }}>Tens a certeza que queres entrar, Simone?</h2>
            <h3 style={{ color: '#ef4444', fontSize: '1.3em', marginTop: '0' }}>A tua pontuação é muito má!</h3>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '40px' }}>
              <button onClick={() => irParaView('partida_sim')} style={{ padding: '12px 40px', fontSize: '1.1em', fontWeight: 'bold', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(16,185,129,0.3)' }}>Sim</button>
              <button onClick={() => irParaView('partida_nao')} style={{ padding: '12px 40px', fontSize: '1.1em', fontWeight: 'bold', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(239,68,68,0.3)' }}>Não</button>
            </div>
          </div>
        )}

        {view === 'partida_nao' && (
          <div style={{ textAlign: 'center', marginTop: '15vh', animation: 'fadeIn 0.5s' }}>
            <h1 style={{ fontSize: '3em', color: '#0f172a', margin: '0' }}>Decisão acertada 😂</h1>
            <p style={{ color: '#64748b', fontSize: '1.2em', marginTop: '10px' }}>Mais vale não ver para não chorar!</p>
            <button onClick={fazerLogout} style={{ marginTop: '30px', padding: '10px 25px', fontSize: '1.1em', backgroundColor: '#334155', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Sair e tentar outro dia</button>
          </div>
        )}

        {view === 'partida_sim' && (
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center', marginTop: '5vh' }}>
            <h2 style={{ color: '#0f172a', margin: '0 0 20px 0' }}>Tinhas de ser curiosa... 🤣</h2>
            
            <img 
              src="https://drive.google.com/uc?export=view&id=1FFrxwnBVE0O-XGE94IBr3nuwqna0i9e4" 
              alt="Surpresa" 
              style={{ maxWidth: '100%', maxHeight: '50vh', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.15)', objectFit: 'contain' }} 
            />
            
            <div style={{ marginTop: '30px' }}>
              <button onClick={() => { setView('atleta'); localStorage.setItem('clube_view', 'atleta'); }} style={{ padding: '12px 25px', fontSize: '1em', fontWeight: 'bold', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                Pronto, quero ir para o meu painel a sério 😅
              </button>
            </div>
          </div>
        )}

        {user.perfil === 'atleta' && view === 'atleta' && <PainelAtleta user={user} />}
        {user.perfil !== 'atleta' && view === 'dashboard' && <Dashboard user={user} onSelecionarEvento={selecionarEvento} onAtualizarAtletas={(lista) => setAtletas(lista)} />}
        {user.perfil !== 'atleta' && view === 'grelha' && <GrelhaNotas atletas={atletas} />}
        {user.perfil !== 'atleta' && view === 'evento' && eventoSelecionado && <AvaliacaoEvento evento={eventoSelecionado} user={user} atletas={atletas} onVoltar={irParaDashboard} onMudarEvento={selecionarEvento} />}
        {user.perfil !== 'atleta' && view === 'relatorio' && podeVerRelatorios && <Relatorio atletas={atletas} />}
        {user.perfil === 'admin' && view === 'admin' && <Admin nomeClube={nomeClube} onNomeClubeAtualizado={fetchConfiguracoes} />}
      </main>
    </div>
  );
}