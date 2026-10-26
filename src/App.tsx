import { useState, useEffect } from 'react';
import { supabase } from './supabase';

interface AtletaRelatorio { id: string; nome: string; posicao: string; total_presencas: number; media_geral: number | null; }
interface Utilizador { id: string; username: string; senha?: string; perfil: string; nome: string; }
interface Evento { id: string; data: string; tipo: string; adversario?: string; }

export default function App() {
  // --- ESTADOS GERAIS ---
  const [user, setUser] = useState<Utilizador | null>(null);
  const [view, setView] = useState<'login' | 'dashboard' | 'admin'>('login');
  const [nomeClube, setNomeClube] = useState('A carregar...');
  
  // --- ESTADOS DE DADOS ---
  const [relatorio, setRelatorio] = useState<AtletaRelatorio[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [utilizadores, setUtilizadores] = useState<Utilizador[]>([]);

  // Estados Formulários
  const [novoNomeAtleta, setNovoNomeAtleta] = useState('');
  const [novaPosicao, setNovaPosicao] = useState('Avançada');
  const [novaData, setNovaData] = useState('');
  const [novoTipo, setNovoTipo] = useState('Treino');
  const [novoAdversario, setNovoAdversario] = useState('');
  
  // Estados Admin
  const [inputNomeClube, setInputNomeClube] = useState('');
  const [novoUserUsername, setNovoUserUsername] = useState('');
  const [novoUserSenha, setNovoUserSenha] = useState('');
  const [novoUserPerfil, setNovoUserPerfil] = useState('treinador');
  const [novoUserNome, setNovoUserNome] = useState('');

  // --- CARREGAMENTO INICIAL ---
  useEffect(() => { fetchConfiguracoes(); }, []);

  const fetchConfiguracoes = async () => {
    const { data } = await supabase.from('configuracoes').select('*').eq('chave', 'nome_clube').single();
    if (data) {
      setNomeClube(data.valor);
      setInputNomeClube(data.valor);
    }
  };

  const carregarDadosDashboard = () => {
    fetchRelatorio();
    fetchEventos();
  };

  const fetchRelatorio = async () => {
    const { data } = await supabase.from('relatorio_atletas').select('*');
    if (data) setRelatorio(data as AtletaRelatorio[]);
  };

  const fetchEventos = async () => {
    const { data } = await supabase.from('eventos').select('*').order('data', { ascending: false });
    if (data) setEventos(data as Evento[]);
  };

  const fetchUtilizadores = async () => {
    const { data } = await supabase.from('utilizadores').select('id, username, perfil, nome');
    if (data) setUtilizadores(data as Utilizador[]);
  };

  // --- FUNÇÕES DE LOGIN ---
  const [usernameInput, setUsernameInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [erroLogin, setErroLogin] = useState('');

  const fazerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroLogin('');
    const { data, error } = await supabase.from('utilizadores').select('*').eq('username', usernameInput).eq('senha', senhaInput).single();
    if (error || !data) {
      setErroLogin('Credenciais inválidas.');
    } else {
      setUser(data as Utilizador);
      carregarDadosDashboard();
      setView('dashboard');
    }
  };

  const fazerLogout = () => {
    setUser(null); setUsernameInput(''); setSenhaInput(''); setView('login');
  };

  // --- FUNÇÕES DASHBOARD ---
  const adicionarAtleta = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('atletas').insert([{ nome: novoNomeAtleta, posicao: novaPosicao }]);
    if (!error) { setNovoNomeAtleta(''); fetchRelatorio(); }
  };

  const removerAtleta = async (id: string) => {
    if (window.confirm('Eliminar atleta e todas as notas?')) {
      await supabase.from('atletas').delete().eq('id', id);
      fetchRelatorio();
    }
  };

  const adicionarEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novoTipo.includes('Jogo') && !novoAdversario.trim()) return alert('Indique o adversário.');
    const { error } = await supabase.from('eventos').insert([{ data: novaData, tipo: novoTipo, adversario: novoTipo.includes('Jogo') ? novoAdversario : null }]);
    if (!error) { setNovaData(''); setNovoAdversario(''); fetchEventos(); }
  };

  const removerEvento = async (id: string) => {
    if (window.confirm('Apagar evento e avaliações deste dia?')) {
      await supabase.from('eventos').delete().eq('id', id);
      fetchEventos();
    }
  };

  const agruparEventosPorSemana = () => {
    const grupos = new Map<string, Evento[]>();
    eventos.forEach(evento => {
      const d = new Date(evento.data);
      const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const dayNum = date.getUTCDay() || 7;
      date.setUTCDate(date.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      const chave = `Semana ${weekNo} (${date.getUTCFullYear()})`;
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave)!.push(evento);
    });
    grupos.forEach(lista => lista.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()));
    return Array.from(grupos.entries());
  };

  // --- FUNÇÕES ADMIN ---
  const atualizarNomeClube = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('configuracoes').update({ valor: inputNomeClube }).eq('chave', 'nome_clube');
    if (!error) { alert('Nome do clube atualizado!'); fetchConfiguracoes(); }
  };

  const adicionarUtilizador = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('utilizadores').insert([{ username: novoUserUsername, senha: novoUserSenha, perfil: novoUserPerfil, nome: novoUserNome }]);
    if (!error) { setNovoUserUsername(''); setNovoUserSenha(''); setNovoUserNome(''); fetchUtilizadores(); alert('Utilizador adicionado.'); }
    else alert('Erro. O username já deve existir.');
  };

  const removerUtilizador = async (id: string) => {
    if (window.confirm('Apagar este utilizador definitivamente?')) {
      await supabase.from('utilizadores').delete().eq('id', id);
      fetchUtilizadores();
    }
  };

  const mudarSenha = async (id: string) => {
    const novaSenha = window.prompt('Introduza a nova senha para este utilizador:');
    if (novaSenha && novaSenha.trim() !== '') {
      await supabase.from('utilizadores').update({ senha: novaSenha }).eq('id', id);
      alert('Senha atualizada com sucesso.');
    }
  };

  // --- RENDERIZAÇÃO (PÁGINAS) ---
  if (view === 'login') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f1f5f9' }}>
        <form onSubmit={fazerLogin} style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
          <h2 style={{ textAlign: 'center', color: '#0f172a', marginBottom: '30px' }}>{nomeClube}</h2>
          {erroLogin && <p style={{ color: '#ef4444', textAlign: 'center', marginBottom: '15px' }}>{erroLogin}</p>}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#475569' }}>Utilizador</label>
            <input type="text" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
          </div>
          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#475569' }}>Senha</label>
            <input type="password" value={senhaInput} onChange={(e) => setSenhaInput(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
          </div>
          <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Entrar</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* HEADER PROFISSIONAL */}
      <header style={{ backgroundColor: '#0f172a', padding: '15px 20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.2em' }}>⚽ {nomeClube}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ fontSize: '0.9em', color: '#cbd5e1' }}>{user?.nome} ({user?.perfil.toUpperCase()})</span>
          <button onClick={() => setView('dashboard')} style={{ background: view === 'dashboard' ? '#334155' : 'transparent', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>Painel</button>
          {user?.perfil === 'admin' && (
            <button onClick={() => { fetchUtilizadores(); setView('admin'); }} style={{ background: view === 'admin' ? '#334155' : 'transparent', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>Administração</button>
          )}
          <button onClick={fazerLogout} style={{ background: '#dc2626', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>Sair</button>
        </div>
      </header>

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '30px 20px' }}>
        
        {/* PÁGINA: DASHBOARD */}
        {view === 'dashboard' && (
          <>
            {user?.perfil === 'admin' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ margin: '0 0 15px 0', color: '#1e293b' }}>👥 Nova Atleta</h3>
                  <form onSubmit={adicionarAtleta} style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" placeholder="Nome" value={novoNomeAtleta} onChange={(e) => setNovoNomeAtleta(e.target.value)} required style={{ flex: 1, padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                    <select value={novaPosicao} onChange={(e) => setNovaPosicao(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                      <option>Guarda-Redes</option><option>Defesa</option><option>Médio</option><option>Avançada</option>
                    </select>
                    <button type="submit" style={{ padding: '8px 15px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Adicionar</button>
                  </form>
                </div>

                <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ margin: '0 0 15px 0', color: '#1e293b' }}>📅 Novo Evento</h3>
                  <form onSubmit={adicionarEvento} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} required style={{ flex: 1, padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                      <select value={novoTipo} onChange={(e) => setNovoTipo(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                        <option>Treino</option><option>Jogo (Oficial)</option><option>Jogo (Treino)</option>
                      </select>
                    </div>
                    {novoTipo.includes('Jogo') && <input type="text" placeholder="Adversário" value={novoAdversario} onChange={(e) => setNovoAdversario(e.target.value)} required style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />}
                    <button type="submit" style={{ padding: '8px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Criar Evento</button>
                  </form>
                </div>
              </div>
            )}

            <div style={{ marginBottom: '40px' }}>
              <h2 style={{ color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>📅 Calendário</h2>
              {eventos.length === 0 ? <p>Sem eventos.</p> : agruparEventosPorSemana().map(([semana, lista]) => (
                <div key={semana} style={{ marginBottom: '20px' }}>
                  <h4 style={{ color: '#64748b', marginBottom: '10px' }}>{semana}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' }}>
                    {lista.map(ev => (
                      <div key={ev.id} style={{ backgroundColor: 'white', borderLeft: `4px solid ${ev.tipo.includes('Jogo') ? '#ef4444' : '#10b981'}`, padding: '15px', borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', position: 'relative' }}>
                        <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{new Date(ev.data).toLocaleDateString('pt-PT')}</div>
                        <div style={{ color: ev.tipo.includes('Jogo') ? '#ef4444' : '#10b981', fontSize: '0.9em', fontWeight: 'bold', marginTop: '4px' }}>{ev.tipo}</div>
                        {ev.adversario && <div style={{ fontSize: '0.85em', color: '#64748b', marginTop: '4px' }}>🆚 {ev.adversario}</div>}
                        {user?.perfil === 'admin' && <button onClick={() => removerEvento(ev.id)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '0.8em' }}>✕ Apagar</button>}
                        <button style={{ width: '100%', marginTop: '15px', padding: '8px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}>Ver Notas</button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h2 style={{ color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>🏆 Classificação Geral</h2>
              <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#f8fafc' }}>
                    <tr>
                      <th style={{ padding: '12px 15px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>Atleta</th>
                      <th style={{ padding: '12px 15px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>Posição</th>
                      <th style={{ padding: '12px 15px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>Média</th>
                      {user?.perfil === 'admin' && <th style={{ padding: '12px 15px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>Ações</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {relatorio.map(atleta => (
                      <tr key={atleta.id}>
                        <td style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', fontWeight: '500', color: '#1e293b' }}>{atleta.nome}</td>
                        <td style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>{atleta.posicao}</td>
                        <td style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', fontWeight: 'bold', color: '#f59e0b' }}>{atleta.media_geral || '-'}</td>
                        {user?.perfil === 'admin' && <td style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9' }}><button onClick={() => removerAtleta(atleta.id)} style={{ padding: '4px 8px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8em' }}>Remover</button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* PÁGINA: ADMINISTRAÇÃO */}
        {view === 'admin' && user?.perfil === 'admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ color: '#0f172a', margin: '0 0 15px 0' }}>⚙️ Definições do Clube</h3>
              <form onSubmit={atualizarNomeClube} style={{ display: 'flex', gap: '10px' }}>
                <input type="text" value={inputNomeClube} onChange={(e) => setInputNomeClube(e.target.value)} required style={{ flex: 1, padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Guardar Alterações</button>
              </form>
            </div>

            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ color: '#0f172a', margin: '0 0 15px 0' }}>🔒 Gestão de Utilizadores</h3>
              
              <form onSubmit={adicionarUtilizador} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '10px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
                <input type="text" placeholder="Nome Completo" value={novoUserNome} onChange={(e) => setNovoUserNome(e.target.value)} required style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                <input type="text" placeholder="Username" value={novoUserUsername} onChange={(e) => setNovoUserUsername(e.target.value)} required style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                <input type="password" placeholder="Senha Inicial" value={novoUserSenha} onChange={(e) => setNovoUserSenha(e.target.value)} required style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                <select value={novoUserPerfil} onChange={(e) => setNovoUserPerfil(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                  <option value="treinador">Treinador</option>
                  <option value="admin">Administrador</option>
                </select>
                <button type="submit" style={{ padding: '8px 15px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Novo Utilizador</button>
              </form>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '10px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Nome</th>
                    <th style={{ padding: '10px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Username</th>
                    <th style={{ padding: '10px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Perfil</th>
                    <th style={{ padding: '10px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {utilizadores.map(u => (
                    <tr key={u.id}>
                      <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9' }}>{u.nome}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9' }}>{u.username}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9' }}>{u.perfil}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '10px' }}>
                        <button onClick={() => mudarSenha(u.id)} style={{ padding: '4px 8px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}>Nova Senha</button>
                        <button onClick={() => removerUtilizador(u.id)} style={{ padding: '4px 8px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Remover</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}