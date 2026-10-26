import { useEffect, useState } from 'react';
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

export default function App() {
  const [user, setUser] = useState<Utilizador | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [erroLogin, setErroLogin] = useState('');
  
  const [relatorio, setRelatorio] = useState<AtletaRelatorio[]>([]);

  // Estados para adicionar atleta
  const [novoNome, setNovoNome] = useState('');
  const [novaPosicao, setNovaPosicao] = useState('Avançada');

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

  const adicionarAtleta = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('atletas').insert([{ nome: novoNome, posicao: novaPosicao }]);
    if (!error) {
      setNovoNome('');
      fetchRelatorio();
    } else {
      alert('Erro ao adicionar atleta.');
    }
  };

  const removerAtleta = async (id: string) => {
    if (window.confirm('Tem a certeza que quer eliminar esta atleta? Todas as suas notas serão apagadas.')) {
      const { error } = await supabase.from('atletas').delete().eq('id', id);
      if (!error) fetchRelatorio();
      else alert('Erro ao remover atleta.');
    }
  };

  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f3f4f6' }}>
        <form onSubmit={fazerLogin} style={{ backgroundColor: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
          <h2 style={{ textAlign: 'center', color: '#2c3e50', marginBottom: '30px' }}>Login do Clube</h2>
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
        <h1 style={{ color: '#2c3e50', margin: 0 }}>⚽ Painel do Clube</h1>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{user.nome}</p>
          <span style={{ fontSize: '0.8em', backgroundColor: user.perfil === 'admin' ? '#e74c3c' : '#2ecc71', color: 'white', padding: '2px 8px', borderRadius: '12px', marginRight: '10px' }}>
            {user.perfil.toUpperCase()}
          </span>
          <button onClick={fazerLogout} style={{ padding: '5px 10px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px' }}>Sair</button>
        </div>
      </div>

      {user.perfil === 'admin' && (
        <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffeeba' }}>
          <h3 style={{ marginTop: 0 }}>Gestão de Plantel (Diretor)</h3>
          <form onSubmit={adicionarAtleta} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input type="text" placeholder="Nome da Atleta" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} required style={{ flex: 1, padding: '8px' }} />
            <select value={novaPosicao} onChange={(e) => setNovaPosicao(e.target.value)} style={{ padding: '8px' }}>
              <option value="Guarda-Redes">Guarda-Redes</option>
              <option value="Defesa">Defesa</option>
              <option value="Médio">Médio</option>
              <option value="Avançada">Avançada</option>
            </select>
            <button type="submit" style={{ padding: '8px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Adicionar</button>
          </form>
        </div>
      )}

      {user.perfil === 'treinador' && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#d1ecf1', borderRadius: '8px', borderLeft: '5px solid #17a2b8' }}>
          <strong>Área de Treinador:</strong> Aqui entrará em breve o calendário e o acesso para avaliar os treinos.
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <h2>🏆 Plantel e Classificação Geral</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', textAlign: 'left' }}>
              <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>Atleta</th>
              <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>Posição</th>
              <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>Média Final</th>
              {user.perfil === 'admin' && <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {relatorio.map((atleta) => (
              <tr key={atleta.id}>
                <td style={{ padding: '12px', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>{atleta.nome}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>{atleta.posicao}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #eee', color: '#e67e22', fontWeight: 'bold' }}>{atleta.media_geral || 'S/ Nota'}</td>
                {user.perfil === 'admin' && (
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                    <button onClick={() => removerAtleta(atleta.id)} style={{ padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8em' }}>Remover</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}