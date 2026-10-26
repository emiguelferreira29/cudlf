import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import type { Atleta, AtletaRelatorio, Evento, Utilizador } from '../types';

interface DashboardProps {
  user: Utilizador;
  onSelecionarEvento: (ev: Evento) => void;
  onAtualizarAtletas: (atletas: Atleta[]) => void;
}

const PESO_POSICAO: Record<string, number> = { 'Guarda-Redes': 1, 'Defesa': 2, 'Médio': 3, 'Avançada': 4 };

export default function Dashboard({ user, onSelecionarEvento, onAtualizarAtletas }: DashboardProps) {
  const [relatorio, setRelatorio] = useState<AtletaRelatorio[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);

  // Estados Form Atleta
  const [novoNumero, setNovoNumero] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [novaPosicao, setNovaPosicao] = useState('Guarda-Redes');
  const [editandoAtleta, setEditandoAtleta] = useState<string | null>(null);

  // Estados Form Evento
  const [novaData, setNovaData] = useState('');
  const [novoTipo, setNovoTipo] = useState('Treino');
  const [novoAdversario, setNovoAdversario] = useState('');
  const [editandoEvento, setEditandoEvento] = useState<string | null>(null);

  useEffect(() => { carregarTudo(); }, []);

  const carregarTudo = () => { fetchRelatorio(); fetchEventos(); fetchAtletas(); };

  const fetchRelatorio = async () => {
    const { data } = await supabase.from('relatorio_atletas').select('*');
    if (data) setRelatorio(data as AtletaRelatorio[]);
  };

  const fetchEventos = async () => {
    const { data } = await supabase.from('eventos').select('*').order('data', { ascending: false });
    if (data) setEventos(data as Evento[]);
  };

  const fetchAtletas = async () => {
    const { data } = await supabase.from('atletas').select('*');
    if (data) {
      const listaOrdenada = (data as Atleta[]).sort((a, b) => {
        const pesoA = PESO_POSICAO[a.posicao] ?? 99;
        const pesoB = PESO_POSICAO[b.posicao] ?? 99;
        if (pesoA !== pesoB) return pesoA - pesoB;
        return a.nome.localeCompare(b.nome, 'pt-PT');
      });
      onAtualizarAtletas(listaOrdenada);
    }
  };

  const salvarAtleta = async (e: React.FormEvent) => {
    e.preventDefault();
    const dados = { 
      numero: novoNumero ? parseInt(novoNumero) : null, 
      nome: novoNome, 
      posicao: novaPosicao 
    };

    if (editandoAtleta) {
      await supabase.from('atletas').update(dados).eq('id', editandoAtleta);
    } else {
      await supabase.from('atletas').insert([dados]);
    }
    
    setNovoNumero(''); setNovoNome(''); setNovaPosicao('Guarda-Redes'); setEditandoAtleta(null);
    carregarTudo();
  };

  const iniciarEdicaoAtleta = (atleta: AtletaRelatorio) => {
    setEditandoAtleta(atleta.id);
    setNovoNumero(atleta.numero?.toString() || '');
    setNovoNome(atleta.nome);
    setNovaPosicao(atleta.posicao);
    window.scrollTo(0, 0);
  };

  const removerAtleta = async (id: string) => {
    if (window.confirm('Eliminar atleta e notas associadas?')) {
      await supabase.from('atletas').delete().eq('id', id);
      carregarTudo();
    }
  };

  const salvarEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novoTipo.includes('Jogo') && !novoAdversario.trim()) return alert('Indique o adversário.');
    const dados = { data: novaData, tipo: novoTipo, adversario: novoTipo.includes('Jogo') ? novoAdversario : null };

    if (editandoEvento) {
      await supabase.from('eventos').update(dados).eq('id', editandoEvento);
    } else {
      await supabase.from('eventos').insert([dados]);
    }

    setNovaData(''); setNovoAdversario(''); setNovoTipo('Treino'); setEditandoEvento(null);
    fetchEventos();
  };

  const iniciarEdicaoEvento = (ev: Evento) => {
    setEditandoEvento(ev.id);
    setNovaData(ev.data);
    setNovoTipo(ev.tipo);
    setNovoAdversario(ev.adversario || '');
    window.scrollTo(0, 0);
  };

  const removerEvento = async (id: string) => {
    if (window.confirm('Apagar evento?')) {
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

  const relatorioOrdenado = [...relatorio].sort((a, b) => {
    const pesoA = PESO_POSICAO[a.posicao] ?? 99;
    const pesoB = PESO_POSICAO[b.posicao] ?? 99;
    if (pesoA !== pesoB) return pesoA - pesoB;
    return a.nome.localeCompare(b.nome, 'pt-PT');
  });

  const inputStyle = { padding: '8px 10px', fontSize: '0.9em', border: '1px solid #cbd5e1', borderRadius: '4px', flex: '1 1 120px' };

  return (
    <>
      {user.perfil === 'admin' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '35px' }}>
          <div style={{ flex: '1 1 300px', padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#1e293b', fontSize: '1.1em' }}>👥 {editandoAtleta ? 'Editar Atleta' : 'Nova Atleta'}</h3>
            <form onSubmit={salvarAtleta} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <input type="number" placeholder="Nº" value={novoNumero} onChange={(e) => setNovoNumero(e.target.value)} style={{ ...inputStyle, flex: '0 1 60px' }} />
              <input type="text" placeholder="Nome" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} required style={inputStyle} />
              <select value={novaPosicao} onChange={(e) => setNovaPosicao(e.target.value)} style={inputStyle}>
                <option value="Guarda-Redes">Guarda-Redes</option>
                <option value="Defesa">Defesa</option>
                <option value="Médio">Médio</option>
                <option value="Avançada">Avançada</option>
              </select>
              <button type="submit" style={{ padding: '8px 15px', backgroundColor: editandoAtleta ? '#f59e0b' : '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{editandoAtleta ? 'Atualizar' : 'Adicionar'}</button>
              {editandoAtleta && <button type="button" onClick={() => {setEditandoAtleta(null); setNovoNumero(''); setNovoNome('');}} style={{ padding: '8px 15px', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>}
            </form>
          </div>

          <div style={{ flex: '1 1 300px', padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#1e293b', fontSize: '1.1em' }}>📅 {editandoEvento ? 'Editar Evento' : 'Novo Evento'}</h3>
            <form onSubmit={salvarEvento} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} required style={inputStyle} />
              <select value={novoTipo} onChange={(e) => setNovoTipo(e.target.value)} style={inputStyle}>
                <option>Treino</option>
                <option>Jogo (Oficial)</option>
                <option>Jogo (Treino)</option>
              </select>
              {novoTipo.includes('Jogo') && <input type="text" placeholder="Adversário" value={novoAdversario} onChange={(e) => setNovoAdversario(e.target.value)} required style={inputStyle} />}
              <button type="submit" style={{ padding: '8px 15px', backgroundColor: editandoEvento ? '#f59e0b' : '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', flex: '1 1 100%' }}>{editandoEvento ? 'Atualizar Evento' : 'Criar Evento'}</button>
              {editandoEvento && <button type="button" onClick={() => {setEditandoEvento(null); setNovaData(''); setNovoAdversario('');}} style={{ padding: '8px 15px', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', flex: '1 1 100%' }}>Cancelar</button>}
            </form>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', margin: '0 0 20px 0', fontSize: '1.4em', textAlign: 'center' }}>📅 Calendário</h2>
        {eventos.length === 0 ? <p style={{ textAlign: 'center', color: '#64748b' }}>Sem eventos registados.</p> : agruparEventosPorSemana().map(([semana, lista]) => (
          <div key={semana} style={{ marginBottom: '25px' }}>
            <h4 style={{ color: '#475569', fontSize: '1em', borderBottom: '1px solid #cbd5e1', paddingBottom: '5px', marginBottom: '15px', textAlign: 'center' }}>{semana}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' }}>
              {lista.map(ev => (
                <div key={ev.id} style={{ backgroundColor: 'white', borderLeft: `4px solid ${ev.tipo.includes('Jogo') ? '#ef4444' : '#10b981'}`, padding: '15px', borderRadius: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '1.05em' }}>{new Date(ev.data).toLocaleDateString('pt-PT')}</div>
                      {user.perfil === 'admin' && (
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button onClick={() => iniciarEdicaoEvento(ev)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.1em', padding: '0', color: '#f59e0b' }} title="Editar Evento">✏️</button>
                          <button onClick={() => removerEvento(ev.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.1em', padding: '0', color: '#ef4444' }} title="Apagar Evento">🗑️</button>
                        </div>
                      )}
                    </div>
                    <div style={{ color: ev.tipo.includes('Jogo') ? '#ef4444' : '#10b981', fontSize: '0.9em', fontWeight: 'bold', marginTop: '6px' }}>{ev.tipo}</div>
                    {ev.adversario && <div style={{ fontSize: '0.85em', color: '#64748b', marginTop: '6px' }}>🆚 {ev.adversario}</div>}
                  </div>
                  <button onClick={() => onSelecionarEvento(ev)} style={{ width: '100%', marginTop: '15px', padding: '8px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}>Ver Notas</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div>
        <h2 style={{ color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', margin: '0 0 15px 0', fontSize: '1.4em', textAlign: 'center' }}>👥 Plantel e Médias</h2>
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                <th style={{ padding: '12px 15px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>Nº</th>
                <th style={{ padding: '12px 15px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>Atleta</th>
                <th style={{ padding: '12px 15px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>Posição</th>
                <th style={{ padding: '12px 15px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>Média Geral</th>
                {user.perfil === 'admin' && <th style={{ padding: '12px 15px', borderBottom: '1px solid #e2e8f0' }}>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {relatorioOrdenado.map(atleta => (
                <tr key={atleta.id}>
                  <td style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>{atleta.numero || '-'}</td>
                  <td style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', fontWeight: '500', color: '#1e293b', whiteSpace: 'nowrap' }}>{atleta.nome}</td>
                  <td style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>{atleta.posicao}</td>
                  <td style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', fontWeight: 'bold', color: '#f59e0b' }}>{atleta.media_geral || '-'}</td>
                  {user.perfil === 'admin' && (
                    <td style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '5px' }}>
                      <button onClick={() => iniciarEdicaoAtleta(atleta)} style={{ padding: '4px 8px', backgroundColor: '#fef3c7', color: '#d97706', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85em' }}>Editar</button>
                      <button onClick={() => removerAtleta(atleta.id)} style={{ padding: '4px 8px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85em' }}>Remover</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}