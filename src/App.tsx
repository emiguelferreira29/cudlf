import { useState } from 'react';
import { supabase } from './supabase';

interface AtletaRelatorio {
  id: string;
  nome: string;
  posicao: string;
  total_presencas: number;
  media_geral: number | null;
}

interface Utilizador {
  id: string;
  username: string;
  perfil: string;
  nome: string;
}

interface Evento {
  id: string;
  data: string;
  tipo: string;
  adversario?: string;
}

export default function App() {
  const [user, setUser] = useState<Utilizador | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [erroLogin, setErroLogin] = useState('');
  
  const [relatorio, setRelatorio] = useState<AtletaRelatorio[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);

  // Estados Atletas
  const [novoNome, setNovoNome] = useState('');
  const [novaPosicao, setNovaPosicao] = useState('Avançada');

  // Estados Eventos
  const [novaData, setNovaData] = useState('');
  const [novoTipo, setNovoTipo] = useState('Treino');
  const [novoAdversario, setNovoAdversario] = useState('');

  const fazerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroLogin('');
    
    const { data, error } = await supabase
      .from('utilizadores')
      .select('*')
      .eq('username', usernameInput)
      .eq('senha', senhaInput)
      .single();

    if (error || !data) {
      setErroLogin('Credenciais inválidas. Tente novamente.');
    } else {
      setUser(data as Utilizador);
      fetchRelatorio();
      fetchEventos();
    }
  };

  const fazerLogout = () => {
    setUser(null);
    setUsernameInput('');
    setSenhaInput('');
  };

  const fetchRelatorio = async () => {
    const { data, error } = await supabase.from('relatorio_atletas').select('*');
    if (!error) setRelatorio(data as AtletaRelatorio[]);
  };

  const fetchEventos = async () => {
    const { data, error } = await supabase.from('eventos').select('*').order('data', { ascending: false });
    if (!error) setEventos(data as Evento[]);
  };

  const adicionarAtleta = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('atletas').insert([{ nome: novoNome, posicao: novaPosicao }]);
    if (!error) {
      setNovoNome('');
      fetchRelatorio();
    } else alert('Erro ao adicionar atleta.');
  };

  const removerAtleta = async (id: string) => {
    if (window.confirm('Tem a certeza que quer eliminar esta atleta? Todas as suas notas serão apagadas.')) {
      const { error } = await supabase.from('atletas').delete().eq('id', id);
      if (!error) fetchRelatorio();
      else alert('Erro ao remover atleta.');
    }
  };

  const adicionarEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação extra por segurança
    if (novoTipo.includes('Jogo') && !novoAdversario.trim()) {
      alert('Por favor, indique o adversário.');
      return;
    }

    const { error } = await supabase.from('eventos').insert([{ 
      data: novaData, 
      tipo: novoTipo,
      adversario: novoTipo.includes('Jogo') ? novoAdversario : null
    }]);

    if (!error) {
      setNovaData('');
      setNovoAdversario('');
      fetchEventos();
    } else alert('Erro ao criar evento.');
  };

  const removerEvento = async (id: string) => {
    if (window.confirm('Tem a certeza que quer apagar este evento? Todas as avaliações deste dia desaparecerão.')) {
      const { error } = await supabase.from('eventos').delete().eq('id', id);
      if (!error) fetchEventos();
      else alert('Erro ao remover evento.');
    }
  };

  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f3f4f6' }}>
        <form onSubmit={fazerLogin} style={{ backgroundColor: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
          <h2 style={{ textAlign: 'center', color: '#2c3e50', marginBottom: '30px' }}>Plataforma de Avaliação</h2>
          {erroLogin && <p style={{ color: 'red', textAlign: 'center', marginBottom: '15px' }}>{erroLogin}</p>}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Utilizador</label>
            <input type="text" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} required />
          </div>
          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Senha</label>
            <input type="password" value={senhaInput} onChange={(e) => setSenhaInput(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} required />
          </div>
          <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Entrar</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
        <h1 style={{ color: '#2c3e50', margin: 0 }}>⚽ Painel de Gestão</h1>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{user.nome}</p>
          <span style={{ fontSize: '0.8em', backgroundColor: user.perfil === 'admin' ? '#e74c3c' : '#2ecc71', color: 'white', padding: '2px 8px', borderRadius: '12px', marginRight: '10px' }}>
            {user.perfil.toUpperCase()}
          </span>
          <button onClick={fazerLogout} style={{ padding: '5px 10px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px' }}>Sair</button>
        </div>
      </div>

      {user.perfil === 'admin' && (
        <>
          <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffeeba' }}>
            <h3 style={{ marginTop: 0 }}>👥 Gestão de Plantel</h3>
            <form onSubmit={adicionarAtleta} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input type="text" placeholder="Nome da Atleta" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} required style={{ flex: '1 1 200px', padding: '8px' }} />
              <select value={novaPosicao} onChange={(e) => setNovaPosicao(e.target.value)} style={{ padding: '8px' }}>
                <option value="Guarda-Redes">Guarda-Redes</option>
                <option value="Defesa">Defesa</option>
                <option value="Médio">Médio</option>
                <option value="Avançada">Avançada</option>
              </select>
              <button type="submit" style={{ padding: '8px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Adicionar</button>
            </form>
          </div>

          <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#e2e3e5', borderRadius: '8px', border: '1px solid #d6d8db' }}>
            <h3 style={{ marginTop: 0 }}>📅 Marcar Novo Evento</h3>
            <form onSubmit={adicionarEvento} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} required style={{ padding: '8px' }} />
              <select value={novoTipo} onChange={(e) => setNovoTipo(e.target.value)} style={{ padding: '8px' }}>
                <option value="Treino">Treino</option>
                <option value="Jogo (Oficial)">Jogo (Oficial)</option>
                <option value="Jogo (Treino)">Jogo (Treino)</option>
              </select>
              
              {/* O campo Adversário só aparece se for um Jogo */}
              {novoTipo.includes('Jogo') && (
                <input 
                  type="text" 
                  placeholder="Nome do Adversário" 
                  value={novoAdversario} 
                  onChange={(e) => setNovoAdversario(e.target.value)} 
                  required 
                  style={{ flex: '1 1 200px', padding: '8px' }} 
                />
              )}
              <button type="submit" style={{ padding: '8px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Criar Evento</button>
            </form>
          </div>
        </>
      )}

      {/* CALENDÁRIO VISUAL */}
      <div style={{ marginTop: '30px' }}>
        <h2>📅 Calendário (Treinos e Jogos)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
          {eventos.length === 0 ? <p>Sem eventos agendados.</p> : eventos.map((evento) => (
            <div key={evento.id} style={{ padding: '15px', backgroundColor: evento.tipo.includes('Jogo') ? '#ffebee' : '#e8f5e9', border: `1px solid ${evento.tipo.includes('Jogo') ? '#ffcdd2' : '#c8e6c9'}`, borderRadius: '8px', position: 'relative' }}>
              <div style={{ fontWeight: 'bold', fontSize: '1.1em', color: '#333' }}>
                {new Date(evento.data).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
              <div style={{ color: evento.tipo.includes('Jogo') ? '#d32f2f' : '#2e7d32', marginTop: '5px', fontWeight: 'bold' }}>
                {evento.tipo}
              </div>
              
              {/* Mostra o adversário no cartão se existir */}
              {evento.adversario && (
                <div style={{ marginTop: '5px', fontSize: '0.9em', color: '#555' }}>
                  🆚 {evento.adversario}
                </div>
              )}
              
              {user.perfil === 'admin' && (
                <button onClick={() => removerEvento(evento.id)} style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '0.7em', cursor: 'pointer' }}>
                  Eliminar
                </button>
              )}
              
              <button style={{ width: '100%', marginTop: '15px', padding: '8px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Ver Notas
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Tabela de Classificação Mantida no Fundo */}
      <div style={{ marginTop: '40px' }}>
        <h2>🏆 Classificação Geral</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', textAlign: 'left' }}>
              <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>Atleta</th>
              <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>Posição</th>
              <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>Média Final</th>
            </tr>
          </thead>
          <tbody>
            {relatorio.map((atleta) => (
              <tr key={atleta.id}>
                <td style={{ padding: '12px', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>{atleta.nome}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>{atleta.posicao}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #eee', color: '#e67e22', fontWeight: 'bold' }}>{atleta.media_geral || 'S/ Nota'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}