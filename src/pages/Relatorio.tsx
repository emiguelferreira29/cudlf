import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import type { Atleta } from '../types';

interface RelatorioProps {
  atletas: Atleta[];
}

export default function Relatorio({ atletas }: RelatorioProps) {
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [treinadores, setTreinadores] = useState<{id: string, nome: string}[]>([]);
  
  const [tipoView, setTipoView] = useState<'global' | 'individual'>('global');
  const [atletaSelecionada, setAtletaSelecionada] = useState<string>('');
  
  const [filtroTipo, setFiltroTipo] = useState<'epoca' | 'mes' | 'semana'>('epoca');
  const [filtroValor, setFiltroValor] = useState<string>('');
  const [opcoesSemana, setOpcoesSemana] = useState<string[]>([]);
  const [opcoesMes, setOpcoesMes] = useState<string[]>([]);

  useEffect(() => { carregarDados(); }, []);

  useEffect(() => {
    if (atletas.length > 0 && !atletaSelecionada) {
      setAtletaSelecionada(atletas[0].id);
    }
  }, [atletas]);

  useEffect(() => {
    if (filtroTipo === 'semana' && opcoesSemana.length > 0 && !opcoesSemana.includes(filtroValor)) {
      setFiltroValor(opcoesSemana[0]);
    } else if (filtroTipo === 'mes' && opcoesMes.length > 0 && !opcoesMes.includes(filtroValor)) {
      setFiltroValor(opcoesMes[0]);
    }
  }, [filtroTipo, opcoesSemana, opcoesMes]);

  const carregarDados = async () => {
    const { data: avData } = await supabase
      .from('avaliacoes')
      .select('nota, motivo, atleta_id, treinador_id, eventos(id, data, tipo, adversario), treinador:utilizadores(nome)');
    
    if (avData) {
      setAvaliacoes(avData);
      const tMap = new Map<string, string>();
      const semanasMap = new Map<string, string>();
      const mesesMap = new Map<string, string>();

      avData.forEach((av: any) => {
        if (av.treinador?.nome) tMap.set(av.treinador_id, av.treinador.nome.split(' ')[0]);
        if (av.eventos?.data) {
          const d = new Date(av.eventos.data);
          const w = getWeekNumber(d);
          const yr = d.getFullYear();
          const mo = d.getMonth() + 1;
          const sKey = `${yr}-${w.toString().padStart(2, '0')}`;
          semanasMap.set(sKey, `Semana ${w} (${yr})`);
          const mKey = `${yr}-${mo.toString().padStart(2, '0')}`;
          const nomeMes = d.toLocaleString('pt-PT', { month: 'long' });
          mesesMap.set(mKey, `${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)} ${yr}`);
        }
      });
      setTreinadores(Array.from(tMap.entries()).map(([id, nome]) => ({ id, nome })));
      setOpcoesSemana(Array.from(semanasMap.entries()).sort((a, b) => b[0].localeCompare(a[0])).map(e => e[1]));
      setOpcoesMes(Array.from(mesesMap.entries()).sort((a, b) => b[0].localeCompare(a[0])).map(e => e[1]));
    }
  };

  const getWeekNumber = (d: Date) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const avaliacoesFiltradas = avaliacoes.filter(av => {
    if (!av.eventos) return false;
    if (filtroTipo === 'epoca') return true;
    const d = new Date(av.eventos.data);
    if (filtroTipo === 'semana') return `Semana ${getWeekNumber(d)} (${d.getFullYear()})` === filtroValor;
    if (filtroTipo === 'mes') {
      const nomeMes = d.toLocaleString('pt-PT', { month: 'long' });
      return `${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)} ${d.getFullYear()}` === filtroValor;
    }
    return true;
  });

  const atletasComMedias = atletas.map(atleta => {
    const avaliacoesValidas = avaliacoesFiltradas.filter(av => av.atleta_id === atleta.id && (av.nota !== null || av.motivo === 'Falta'));
    const somaGlobal = avaliacoesValidas.reduce((sum, av) => sum + (av.nota !== null ? parseFloat(av.nota) : 0), 0);
    const mediaGlobal = avaliacoesValidas.length > 0 ? somaGlobal / avaliacoesValidas.length : null;

    const mediasTreinador: Record<string, number | null> = {};
    treinadores.forEach(t => {
      const avsTreinador = avaliacoesValidas.filter(av => av.treinador_id === t.id);
      const somaTreinador = avsTreinador.reduce((sum, av) => sum + (av.nota !== null ? parseFloat(av.nota) : 0), 0);
      mediasTreinador[t.id] = avsTreinador.length > 0 ? somaTreinador / avsTreinador.length : null;
    });

    return { ...atleta, mediaGlobal, mediasTreinador };
  }).sort((a, b) => {
    const valA = a.mediaGlobal ?? -1;
    const valB = b.mediaGlobal ?? -1;
    if (valA !== valB) return valB - valA;
    return a.nome.localeCompare(b.nome, 'pt-PT');
  });

  const atletaSelDados = atletas.find(a => a.id === atletaSelecionada);
  const avaliacoesAtletaIndividual = avaliacoesFiltradas.filter(av => av.atleta_id === atletaSelecionada);
  const avaliacoesValidasIndividual = avaliacoesAtletaIndividual.filter(av => av.nota !== null || av.motivo === 'Falta');
  
  const somaInd = avaliacoesValidasIndividual.reduce((sum, av) => sum + (av.nota !== null ? parseFloat(av.nota) : 0), 0);
  const mediaInd = avaliacoesValidasIndividual.length > 0 ? (somaInd / avaliacoesValidasIndividual.length).toFixed(2) : '-';

  const eventosIndividuaisMap = new Map<string, any>();
  avaliacoesAtletaIndividual.forEach(av => {
    const evId = av.eventos.id;
    if (!eventosIndividuaisMap.has(evId)) {
      eventosIndividuaisMap.set(evId, { id: evId, data: av.eventos.data, tipo: av.eventos.tipo, adversario: av.eventos.adversario, notas: {} });
    }
    const eventoItem = eventosIndividuaisMap.get(evId);
    eventoItem.notas[av.treinador_id] = av.nota !== null ? parseFloat(av.nota).toFixed(1) : av.motivo;
  });
  const eventosIndividuais = Array.from(eventosIndividuaisMap.values()).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const imprimirPDF = () => window.print();

  return (
    <div className="print-area">
      <style>{`@media print { .no-print { display: none !important; } body { background-color: white !important; } .print-area { padding: 0 !important; } .print-shadow { box-shadow: none !important; border: 1px solid #e2e8f0; } }`}</style>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setTipoView('global')} style={{ padding: '8px 15px', backgroundColor: tipoView === 'global' ? '#1e293b' : '#cbd5e1', color: tipoView === 'global' ? 'white' : '#334155', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Plantel</button>
          <button onClick={() => setTipoView('individual')} style={{ padding: '8px 15px', backgroundColor: tipoView === 'individual' ? '#1e293b' : '#cbd5e1', color: tipoView === 'individual' ? 'white' : '#334155', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Individual</button>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as any)} style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.95em', fontWeight: '600', color: '#1e293b', cursor: 'pointer' }}>
            <option value="epoca">Toda a Época</option><option value="mes">Por Mês</option><option value="semana">Por Semana</option>
          </select>
          {filtroTipo === 'semana' && opcoesSemana.length > 0 && <select value={filtroValor} onChange={(e) => setFiltroValor(e.target.value)} style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.95em', fontWeight: '600', color: '#1e293b', cursor: 'pointer' }}>{opcoesSemana.map(s => <option key={s} value={s}>{s}</option>)}</select>}
          {filtroTipo === 'mes' && opcoesMes.length > 0 && <select value={filtroValor} onChange={(e) => setFiltroValor(e.target.value)} style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.95em', fontWeight: '600', color: '#1e293b', cursor: 'pointer' }}>{opcoesMes.map(m => <option key={m} value={m}>{m}</option>)}</select>}
          <button onClick={imprimirPDF} style={{ padding: '8px 15px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>📄 Guardar PDF</button>
        </div>
      </div>

      {tipoView === 'global' ? (
        <div className="print-shadow" style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px' }}>
            <h2 style={{ color: '#0f172a', margin: '0' }}>Relatório do Plantel</h2>
            <span style={{ color: '#64748b', fontWeight: 'bold', fontSize: '0.9em', textTransform: 'uppercase' }}>{filtroTipo === 'epoca' ? 'Toda a Época' : filtroValor}</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ padding: '10px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Nº</th>
                <th style={{ padding: '10px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Atleta</th>
                {treinadores.map(t => <th key={t.id} style={{ padding: '10px', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'center' }}>{t.nome}</th>)}
                <th style={{ padding: '10px', borderBottom: '2px solid #e2e8f0', color: '#0f172a', textAlign: 'center' }}>Média</th>
              </tr>
            </thead>
            <tbody>
              {atletasComMedias.length === 0 ? <tr><td colSpan={10} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Sem avaliações.</td></tr> : (
                atletasComMedias.map(atleta => (
                  <tr key={atleta.id}>
                    <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>{atleta.numero || '-'}</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontWeight: 'bold', color: '#1e293b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {atleta.foto_url ? (
                          <img src={atleta.foto_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} onError={(e) => e.currentTarget.style.display = 'none'} />
                        ) : null}
                        <div>
                          {atleta.nome}
                          <div style={{ fontSize: '0.8em', color: '#94a3b8', fontWeight: 'normal' }}>{atleta.posicao}</div>
                        </div>
                      </div>
                    </td>
                    {treinadores.map(t => <td key={t.id} style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', color: '#64748b', textAlign: 'center' }}>{atleta.mediasTreinador[t.id] !== null ? atleta.mediasTreinador[t.id]?.toFixed(2) : '-'}</td>)}
                    <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontWeight: 'bold', color: '#f59e0b', textAlign: 'center', fontSize: '1.1em' }}>{atleta.mediaGlobal !== null ? atleta.mediaGlobal.toFixed(2) : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="print-shadow" style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div className="no-print" style={{ marginBottom: '30px' }}>
            <select value={atletaSelecionada} onChange={(e) => setAtletaSelecionada(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1em', width: '100%', maxWidth: '400px', cursor: 'pointer', fontWeight: '600' }}>
              {atletas.map(a => <option key={a.id} value={a.id}>{a.numero ? `${a.numero} - ` : ''}{a.nome}</option>)}
            </select>
          </div>

          <div style={{ textAlign: 'center', padding: '30px 20px', border: '2px dashed #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', marginBottom: '30px' }}>
            <div style={{ textTransform: 'uppercase', color: '#94a3b8', fontSize: '0.85em', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '15px' }}>
              Desempenho • {filtroTipo === 'epoca' ? 'Toda a Época' : filtroValor}
            </div>
            
            {atletaSelDados?.foto_url ? (
              <img src={atletaSelDados.foto_url} alt="" style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #f1f5f9', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', marginBottom: '10px' }} />
            ) : null}

            <h2 style={{ color: '#0f172a', margin: '0 0 5px 0', fontSize: '1.8em' }}>{atletaSelDados?.nome}</h2>
            <div style={{ color: '#64748b', fontSize: '1.1em', marginBottom: '20px' }}>{atletaSelDados?.posicao}</div>
            
            <div style={{ fontSize: '3.5em', color: mediaInd !== '-' ? '#10b981' : '#cbd5e1', fontWeight: 'bold', lineHeight: '1' }}>{mediaInd}</div>
            {mediaInd !== '-' && <div style={{ color: '#64748b', fontSize: '0.95em', marginTop: '10px' }}>Média de Pontuação</div>}
          </div>

          <div>
            <h3 style={{ color: '#1e293b', fontSize: '1.1em', margin: '0 0 15px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>Registo de Eventos</h3>
            {eventosIndividuais.length === 0 ? <p style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>Sem avaliações registadas neste período.</p> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9em' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '10px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Data</th>
                      <th style={{ padding: '10px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Evento</th>
                      {treinadores.map(t => <th key={t.id} style={{ padding: '10px', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'center' }}>{t.nome}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {eventosIndividuais.map(ev => (
                      <tr key={ev.id}>
                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontWeight: 'bold', color: '#334155' }}>{new Date(ev.data).toLocaleDateString('pt-PT')}</td>
                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9' }}><span style={{ color: ev.tipo.includes('Jogo') ? '#ef4444' : '#10b981', fontWeight: '600' }}>{ev.tipo}</span>{ev.adversario && <span style={{ color: '#64748b' }}> 🆚 {ev.adversario}</span>}</td>
                        {treinadores.map(t => {
                          const nota = ev.notas[t.id];
                          const isNumeric = !isNaN(parseFloat(nota));
                          return <td key={t.id} style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', fontWeight: isNumeric ? 'bold' : 'normal', color: isNumeric ? '#f59e0b' : '#94a3b8' }}>{nota || '-'}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}