import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import type { Atleta, AtletaRelatorio, Evento, Utilizador } from '../types';

interface DashboardProps {
  user: Utilizador;
  onSelecionarEvento: (ev: Evento) => void;
  onAtualizarAtletas: (atletas: Atleta[]) => void;
}

interface EventoComAvaliadores extends Evento {
  avaliadores?: string[];
}

const PESO_POSICAO: Record<string, number> = { 'Guarda-Redes': 1, 'Defesa': 2, 'Médio': 3, 'Avançada': 4 };

const getCorEvento = (tipo: string) => {
  if (tipo === 'Jogo (Oficial)') return '#ef4444'; 
  if (tipo === 'Jogo (Treino)') return '#f59e0b'; 
  return '#10b981'; 
};

export default function Dashboard({ user, onSelecionarEvento, onAtualizarAtletas }: DashboardProps) {
  const [relatorio, setRelatorio] = useState<AtletaRelatorio[]>([]);
  const [eventos, setEventos] = useState<EventoComAvaliadores[]>([]);

  const [filtroMes, setFiltroMes] = useState(new Date().getMonth() + 1);
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear());

  const [editandoAtleta, setEditandoAtleta] = useState<string | null>(null);
  const [novoNumero, setNovoNumero] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [novaPosicao, setNovaPosicao] = useState('Guarda-Redes');

  const [editandoEvento, setEditandoEvento] = useState<string | null>(null);
  const [novaData, setNovaData] = useState('');
  const [novoTipo, setNovoTipo] = useState('Treino');
  const [novoAdversario, setNovoAdversario] = useState('');

  useEffect(() => { carregarTudo(); }, []);

  const carregarTudo = () => {
    fetchRelatorio();
    fetchEventos();
    fetchAtletas();
  };

  const fetchRelatorio = async () => {
    const { data } = await supabase.from('relatorio_atletas').select('*');
    if (data) setRelatorio(data as AtletaRelatorio[]);
  };

  const fetchEventos = async () => {
    const { data } = await supabase.from('eventos').select('*, avaliacoes(treinador:utilizadores(nome))').order('data', { ascending: false });
    if (data) {
      const eventosProcessados = data.map((ev: any) => {
        const nomes: string[] = [];
        if (ev.avaliacoes) { ev.avaliacoes.forEach((av: any) => { const nome = av.treinador?.nome; if (nome && !nomes.includes(nome)) nomes.push(nome); }); }
        return { id: ev.id, data: ev.data, tipo: ev.tipo, adversario: ev.adversario, fechado: ev.fechado ?? false, avaliadores: nomes.map(n => n.charAt(0).toUpperCase()) };
      });
      setEventos(eventosProcessados);
    }
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

  const iniciarEdicaoEvento = (ev: Evento) => { setEditandoEvento(ev.id); setNovaData(ev.data); setNovoTipo(ev.tipo); setNovoAdversario(ev.adversario || ''); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const salvarEdicaoEvento = async (e: React.FormEvent) => { e.preventDefault(); if (novoTipo.includes('Jogo') && !novoAdversario.trim()) return alert('Indique o adversário.'); const dados = { data: novaData, tipo: novoTipo, adversario: novoTipo.includes('Jogo') ? novoAdversario : null }; await supabase.from('eventos').update(dados).eq('id', editandoEvento); setEditandoEvento(null); fetchEventos(); };
  const removerEvento = async (id: string) => { if (window.confirm('Apagar evento e todas as avaliações associadas?')) { await supabase.from('eventos').delete().eq('id', id); fetchEventos(); } };
  
  const iniciarEdicaoAtleta = (atleta: AtletaRelatorio) => { setEditandoAtleta(atleta.id); setNovoNumero(atleta.numero?.toString() || ''); setNovoNome(atleta.nome); setNovaPosicao(atleta.posicao); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const salvarEdicaoAtleta = async (e: React.FormEvent) => { e.preventDefault(); const dados = { numero: novoNumero ? parseInt(novoNumero) : null, nome: novoNome, posicao: novaPosicao }; await supabase.from('atletas').update(dados).eq('id', editandoAtleta); setEditandoAtleta(null); carregarTudo(); };
  const removerAtleta = async (id: string) => { if (window.confirm('Eliminar atleta e o seu histórico de notas?')) { await supabase.from('atletas').delete().eq('id', id); carregarTudo(); } };

  const agruparEventosPorSemana = () => {
    const eventosFiltrados = eventos.filter(ev => { if (!ev.data) return false; const [ano, mes] = ev.data.split('-'); return parseInt(mes) === filtroMes && parseInt(ano) === filtroAno; });
    const grupos = new Map<string, EventoComAvaliadores[]>();
    eventosFiltrados.forEach(evento => {
      const d = new Date(evento.data); const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const dayNum = date.getUTCDay() || 7; date.setUTCDate(date.getUTCDate() + 4 - dayNum); const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1)); const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7); const chave = `Semana ${weekNo} (${date.getUTCFullYear()})`;
      if (!grupos.has(chave)) grupos.set(chave, []); grupos.get(chave)!.push(evento);
    });
    grupos.forEach(lista => lista.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()));
    return Array.from(grupos.entries());
  };

  const relatorioOrdenado = [...relatorio].sort((a, b) => {
    const valA = a.media_geral !== null && a.media_geral !== undefined ? Number(a.media_geral) : -1;
    const valB = b.media_geral !== null && b.media_geral !== undefined ? Number(b.media_geral) : -1;
    if (valA !== valB) return valB - valA;
    return a.nome.localeCompare(b.nome, 'pt-PT');
  });

  const inputStyle = { padding: '8px 10px', fontSize: '0.9em', border: '1px solid #cbd5e1', borderRadius: '4px', width: '100%', boxSizing: 'border-box' as const };
  const eventosAgrupados = agruparEventosPorSemana();

  return (
    <>
      {user.perfil === 'admin' && editandoEvento && (
        <div style={{ padding: '15px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px', border: '2px solid #3b82f6' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#1e293b', fontSize: '1.1em' }}>✏️ Atualizar Evento</h3>
          <form onSubmit={salvarEdicaoEvento} style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 140px' }}><label style={{ display: 'block', fontSize: '0.8em', color: '#64748b', marginBottom: '4px' }}>Data</label><input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} required style={inputStyle} /></div>
            <div style={{ flex: '1 1 140px' }}><label style={{ display: 'block', fontSize: '0.8em', color: '#64748b', marginBottom: '4px' }}>Tipo</label><select value={novoTipo} onChange={(e) => setNovoTipo(e.target.value)} style={inputStyle}><option>Treino</option><option>Jogo (Oficial)</option><option>Jogo (Treino)</option></select></div>
            {novoTipo.includes('Jogo') && <div style={{ flex: '1 1 140px' }}><label style={{ display: 'block', fontSize: '0.8em', color: '#64748b', marginBottom: '4px' }}>Adversário</label><input type="text" placeholder="Adversário" value={novoAdversario} onChange={(e) => setNovoAdversario(e.target.value)} required style={inputStyle} /></div>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" style={{ padding: '8px 15px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', height: '35px' }}>Guardar</button>
              <button type="button" onClick={() => setEditandoEvento(null)} style={{ padding: '8px 15px', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', height: '35px' }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {user.perfil === 'admin' && editandoAtleta && (
        <div style={{ padding: '15px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px', border: '2px solid #f59e0b' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#1e293b', fontSize: '1.1em' }}>✏️ Atualizar Atleta</h3>
          <form onSubmit={salvarEdicaoAtleta} style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end' }}>
            <div style={{ flex: '0 1 70px' }}><label style={{ display: 'block', fontSize: '0.8em', color: '#64748b', marginBottom: '4px' }}>Nº</label><input type="number" value={novoNumero} onChange={(e) => setNovoNumero(e.target.value)} style={inputStyle} /></div>
            <div style={{ flex: '1 1 150px' }}><label style={{ display: 'block', fontSize: '0.8em', color: '#64748b', marginBottom: '4px' }}>Nome</label><input type="text" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} required style={inputStyle} /></div>
            <div style={{ flex: '1 1 140px' }}><label style={{ display: 'block', fontSize: '0.8em', color: '#64748b', marginBottom: '4px' }}>Posição</label><select value={novaPosicao} onChange={(e) => setNovaPosicao(e.target.value)} style={inputStyle}><option value="Guarda-Redes">Guarda-Redes</option><option value="Defesa">Defesa</option><option value="Médio">Médio</option><option value="Avançada">Avançada</option></select></div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" style={{ padding: '8px 15px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', height: '35px' }}>Guardar</button>
              <button type="button" onClick={() => setEditandoAtleta(null)} style={{ padding: '8px 15px', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', height: '35px' }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ marginBottom: '35px' }}>
        <h2 style={{ color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', margin: '0 0 15px 0', fontSize: '1.3em', textAlign: 'center' }}>📅 Calendário</h2>
        
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
          <select value={filtroMes} onChange={(e) => setFiltroMes(Number(e.target.value))} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', outline: 'none', cursor: 'pointer', fontWeight: '500', flex: '1 1 120px' }}>
            <option value={1}>Janeiro</option><option value={2}>Fevereiro</option><option value={3}>Março</option><option value={4}>Abril</option><option value={5}>Maio</option><option value={6}>Junho</option><option value={7}>Julho</option><option value={8}>Agosto</option><option value={9}>Setembro</option><option value={10}>Outubro</option><option value={11}>Novembro</option><option value={12}>Dezembro</option>
          </select>
          <select value={filtroAno} onChange={(e) => setFiltroAno(Number(e.target.value))} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', outline: 'none', cursor: 'pointer', fontWeight: '500', flex: '0 1 90px' }}>
            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i).map(ano => (
              <option key={ano} value={ano}>{ano}</option>
            ))}
          </select>
        </div>

        {eventosAgrupados.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>Sem eventos registados para este mês.</div>
        ) : (
          eventosAgrupados.map(([semana, lista]) => (
            <div key={semana} style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#475569', fontSize: '0.95em', borderBottom: '1px solid #cbd5e1', paddingBottom: '5px', marginBottom: '12px', textAlign: 'center' }}>{semana}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
                {lista.map(ev => {
                  const dataObj = new Date(ev.data);
                  const dataFormatada = dataObj.toLocaleDateString('pt-PT');
                  const diaSemana = dataObj.toLocaleDateString('pt-PT', { weekday: 'long' }).split('-')[0];

                  return (
                    <div key={ev.id} style={{ backgroundColor: 'white', borderLeft: `4px solid ${getCorEvento(ev.tipo)}`, padding: '12px', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '1em', display: 'flex', alignItems: 'center', gap: '4px' }}>{dataFormatada} {ev.fechado && <span title="Evento Fechado">🔒</span>}</div>
                            <div style={{ fontSize: '0.85em', color: '#64748b', textTransform: 'capitalize' }}>{diaSemana}</div>
                          </div>
                          {user.perfil === 'admin' && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button type="button" onClick={() => iniciarEdicaoEvento(ev)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.1em', padding: '0', color: '#f59e0b' }} title="Editar Evento">✏️</button>
                              <button type="button" onClick={() => removerEvento(ev.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.1em', padding: '0', color: '#ef4444' }} title="Apagar Evento">🗑️</button>
                            </div>
                          )}
                        </div>
                        <div style={{ color: getCorEvento(ev.tipo), fontSize: '0.85em', fontWeight: 'bold', marginTop: '4px' }}>{ev.tipo}</div>
                        {ev.adversario && <div style={{ fontSize: '0.8em', color: '#64748b', marginTop: '2px' }}>🆚 {ev.adversario}</div>}
                        
                        {ev.avaliadores && ev.avaliadores.length > 0 && (
                          <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                            {ev.avaliadores.map((inicial, idx) => (
                              <span key={idx} style={{ backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', fontSize: '0.7em', fontWeight: 'bold', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>{inicial}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button type="button" onClick={() => onSelecionarEvento(ev)} style={{ width: '100%', marginTop: '12px', padding: '8px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', fontSize: '0.9em' }}>
                        {user.perfil === 'admin' ? 'Ver Resumo' : 'Ver Notas'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <div>
        <h2 style={{ color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', margin: '0 0 15px 0', fontSize: '1.3em', textAlign: 'center' }}>🏆 Classificação Geral</h2>
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.85em', width: '80px' }}>Nº</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.85em' }}>Atleta</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.85em', textAlign: 'center' }}>Média</th>
                {user.perfil === 'admin' && <th style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.85em', textAlign: 'center' }}>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {relatorioOrdenado.map(atleta => (
                <tr key={atleta.id}>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '0.9em' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {atleta.foto_url ? <img src={atleta.foto_url} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid #e2e8f0' }} onError={(e) => e.currentTarget.style.display = 'none'} /> : <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0, border: '1px solid #e2e8f0' }}>👤</div>}
                      <span style={{ minWidth: '20px' }}>{atleta.numero || '-'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.95em' }}>{atleta.nome}</div>
                    <div style={{ fontSize: '0.75em', color: '#94a3b8', marginTop: '2px' }}>{atleta.posicao}</div>
                  </td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', fontWeight: 'bold', color: '#f59e0b', fontSize: '0.95em', textAlign: 'center' }}>{atleta.media_geral ?? '-'}</td>
                  {user.perfil === 'admin' && (
                    <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <button type="button" onClick={() => iniciarEdicaoAtleta(atleta)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.1em', padding: '0', color: '#f59e0b' }} title="Editar">✏️</button>
                        <button type="button" onClick={() => removerAtleta(atleta.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.1em', padding: '0', color: '#ef4444' }} title="Remover">🗑️</button>
                      </div>
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