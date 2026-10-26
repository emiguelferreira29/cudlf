import { useState } from 'react';
import { supabase } from '../supabase';
import type { Utilizador } from '../types';

interface LoginProps {
  nomeClube: string;
  onLoginSuccess: (user: Utilizador) => void;
}

export default function Login({ nomeClube, onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    const userLimpo = username.trim().toLowerCase();
    const senhaLimpa = senha.trim();

    const { data, error } = await supabase
      .from('utilizadores')
      .select('*')
      .ilike('username', userLimpo)
      .eq('senha', senhaLimpa)
      .single();

    setCarregando(false);

    if (error || !data) {
      setErro('Credenciais inválidas. Verifique o utilizador e a senha.');
      return;
    }

    onLoginSuccess(data as Utilizador);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backgroundColor: '#0f172a' }}>
      <div style={{ backgroundColor: 'white', padding: '30px 25px', borderRadius: '12px', width: '100%', maxWidth: '380px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <div style={{ fontSize: '2.5em', marginBottom: '10px' }}>⚽</div>
          <h2 style={{ margin: '0 0 6px 0', color: '#0f172a', fontSize: '1.4em' }}>{nomeClube}</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9em' }}>Inicie sessão na plataforma</p>
        </div>

        {erro && (
          <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', padding: '10px', borderRadius: '6px', fontSize: '0.85em', marginBottom: '18px', textAlign: 'center', fontWeight: '500' }}>
            {erro}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85em', color: '#475569', fontWeight: 'bold', marginBottom: '5px' }}>Utilizador</label>
            <input 
              type="text" 
              placeholder="username"
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
              autoCapitalize="none"
              autoCorrect="off"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.95em', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85em', color: '#475569', fontWeight: 'bold', marginBottom: '5px' }}>Palavra-passe</label>
            <input 
              type="password" 
              placeholder="••••••••"
              value={senha} 
              onChange={(e) => setSenha(e.target.value)} 
              required 
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.95em', boxSizing: 'border-box' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={carregando}
            style={{ marginTop: '10px', width: '100%', padding: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '1em', cursor: carregando ? 'not-allowed' : 'pointer', opacity: carregando ? 0.7 : 1 }}
          >
            {carregando ? 'A entrar...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}