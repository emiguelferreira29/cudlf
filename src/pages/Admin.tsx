import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import type { Utilizador } from '../types';

interface AdminProps {
  nomeClube: string;
  onNomeClubeAtualizado: () => void;
}

export default function Admin({ nomeClube, onNomeClubeAtualizado }: AdminProps) {
  const [inputNome, setInputNome] = useState(nomeClube);
  const [utilizadores, setUtilizadores] = useState<Utilizador[]>([]);

  // Formulário novo user
  const [novoUserNome, setNovoUserNome] = useState('');
  const [novoUserUsername, setNovoUserUsername] = useState('');
  const [novoUserSenha, setNovoUserSenha] = useState('');
  const [novoUserPerfil, setNovoUserPerfil] = useState('treinador');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase.from('utilizadores').select('id, username, perfil, nome');
    if (data) setUtilizadores(data as Utilizador[]);
  };

  const guardarClube = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('configuracoes').update({ valor: inputNome }).eq('chave', 'nome_clube');
    if (!error) {
      alert('Nome guardado!');
      onNomeClubeAtualizado();
    }
  };

  const adicionarUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('utilizadores').insert([{
      username: novoUserUsername,
      senha: novoUserSenha,
      perfil: novoUserPerfil,
      nome: novoUserNome
    }]);

    if (!error) {
      setNovoUserNome('');
      setNovoUserUsername('');
      setNovoUserSenha('');
      fetchUsers();
      alert('Utilizador criado com sucesso.');
    } else {
      alert('Erro ao criar utilizador.');
    }
  };

  const removerUser = async (id: string) => {
    if (window.confirm('Eliminar este utilizador permanentemente?')) {
      await supabase.from('utilizadores').delete().eq('id', id);
      fetchUsers();
    }
  };

  const mudarSenha = async (id: string) => {
    const nova = window.prompt('Nova senha:');
    if (nova && nova.trim() !== '') {
      await supabase.from('utilizadores').update({ senha: nova }).eq('id', id);
      alert('Senha atualizada com sucesso.');
    }
  };

  const inputStyle = { padding: '8px 10px', fontSize: '0.9em', border: '1px solid #cbd5e1', borderRadius: '4px', flex: '1 1 140px' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ color: '#0f172a', margin: '0 0 15px 0' }}>⚙️ Definições do Clube</h3>
        <form onSubmit={guardarClube} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <input type="text" value={inputNome} onChange={(e) => setInputNome(e.target.value)} required style={inputStyle} />
          <button type="submit" style={{ padding: '8px 15px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Guardar Alterações</button>
        </form>
      </div>

      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ color: '#0f172a', margin: '0 0 15px 0' }}>🔒 Gestão de Utilizadores</h3>
        <form onSubmit={adicionarUser} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
          <input type="text" placeholder="Nome Completo" value={novoUserNome} onChange={(e) => setNovoUserNome(e.target.value)} required style={inputStyle} />
          <input type="text" placeholder="Username" value={novoUserUsername} onChange={(e) => setNovoUserUsername(e.target.value)} required style={inputStyle} />
          <input type="password" placeholder="Senha" value={novoUserSenha} onChange={(e) => setNovoUserSenha(e.target.value)} required style={inputStyle} />
          <select value={novoUserPerfil} onChange={(e) => setNovoUserPerfil(e.target.value)} style={inputStyle}>
            <option value="treinador">Treinador</option>
            <option value="admin">Administrador</option>
          </select>
          <button type="submit" style={{ padding: '8px 15px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', flex: '1 1 100%' }}>Adicionar Utilizador</button>
        </form>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ padding: '10px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Nome</th>
                <th style={{ padding: '10px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Username</th>
                <th style={{ padding: '10px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {utilizadores.map(u => (
                <tr key={u.id}>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{u.nome} <span style={{ fontSize: '0.8em', color: '#94a3b8' }}>({u.perfil})</span></td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9' }}>{u.username}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '8px' }}>
                    <button onClick={() => mudarSenha(u.id)} style={{ padding: '6px 10px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85em' }}>Senha</button>
                    <button onClick={() => removerUser(u.id)} style={{ padding: '6px 10px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85em' }}>Remover</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}