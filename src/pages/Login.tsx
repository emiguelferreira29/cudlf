import { useState } from 'react';
import { supabase } from '../supabase';
import type { Utilizador } from '../types';

interface LoginProps {
  nomeClube: string;
  onLoginSuccess: (user: Utilizador) => void;
}

export default function Login({ nomeClube, onLoginSuccess }: LoginProps) {
  const [usernameInput, setUsernameInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [erroLogin, setErroLogin] = useState('');

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
      setErroLogin('Credenciais inválidas.');
    } else {
      onLoginSuccess(data as Utilizador);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f1f5f9', padding: '15px' }}>
      <form onSubmit={fazerLogin} style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', width: '100%', maxWidth: '360px' }}>
        <h2 style={{ textAlign: 'center', color: '#0f172a', marginTop: 0, marginBottom: '25px', fontSize: '1.4em' }}>{nomeClube}</h2>
        {erroLogin && <p style={{ color: '#ef4444', textAlign: 'center', fontSize: '0.9em', margin: '0 0 15px 0' }}>{erroLogin}</p>}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '5px', color: '#475569', fontWeight: 'bold' }}>Utilizador</label>
          <input 
            type="text" 
            value={usernameInput} 
            onChange={(e) => setUsernameInput(e.target.value)} 
            style={{ width: '100%', padding: '8px 10px', fontSize: '0.9em', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }} 
            required 
          />
        </div>
        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '5px', color: '#475569', fontWeight: 'bold' }}>Senha</label>
          <input 
            type="password" 
            value={senhaInput} 
            onChange={(e) => setSenhaInput(e.target.value)} 
            style={{ width: '100%', padding: '8px 10px', fontSize: '0.9em', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }} 
            required 
          />
        </div>
        <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', fontSize: '1em' }}>
          Entrar
        </button>
      </form>
    </div>
  );
}