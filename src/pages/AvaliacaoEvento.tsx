import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import type { Evento, Atleta, Utilizador, AvaliacaoInput } from '../types';

interface AvaliacaoProps {
  evento: Evento;
  user: Utilizador;
  atletas: Atleta[];
  onVoltar: () => void;
  onGuardado: () => void;
}

const PESO_POSICAO: Record<string, number> = { 'Guarda-Redes': 1, 'Defesa': 2, 'Médio': 3, 'Avançada': 4 };

export default function AvaliacaoEvento({ evento, user, atletas, onVoltar, onGuardado }: AvaliacaoProps) {
  // Estados para Treinador
  const [avaliacoes, setAvaliacoes] = useState<Record<string, AvaliacaoInput>>({});
  const [salvando, setSalvando] = useState(false);

  // Estados para Admin
  const [avaliacoesGerais, setAvaliacoesGerais] = useState<any[]>([]);
  const [treinadoresEnvolvidos, setTreinadoresEnvolvidos] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user.perfil === 'admin') {
      carregarTodasAsNotasAdmin();
    } else {
      carregarNotasExistentes();
    }
  }, [evento.id]);

  // Lógica Treinador
  const carregarNotasExistentes = async () => {
    const { data } = await supabase.from('avaliacoes').select('*').eq('evento_id', evento.id).eq('treinador_id', user.id);
    if (data) {
      const notasCarregadas: Record<string, AvaliacaoInput> = {};
      data.forEach(av => {
        notasCarregadas[av.atleta_id] = { nota: av.nota !== null ? av.nota.toString() : '', semPontuacao: av.nota === null, motivo: av.motivo || 'Falta' };
      });
      setAvaliacoes(notasCarregadas);
    }
  };

  // Lógica Admin (ver todas as notas)
  const carregarTodasAsNotasAdmin = async () => {
    const { data: avalData } = await supabase.from('avaliacoes').select('*, treinador:utilizadores(id, nome)').eq('evento_id', evento.id);
    if (avalData) {
      setAvaliacoesGerais(avalData);
      const treinadores: Record<string, string> = {};
      avalData.forEach((av: any) => { if (av.treinador) treinadores[av.treinador.id] = av.treinador.nome; });
      setTreinadoresEnvolvidos(treinadores);
    }
  };

  const atletasOrdenadas = [...atletas].sort((a, b) => {
    const pesoA = PESO_POSICAO[a.posicao] ?? 99;
    const pesoB = PESO_POSICAO[b.posicao] ?? 99;
    if (pesoA !== pesoB) return pesoA - pesoB;
    return a.nome.localeCompare(b.nome, 'pt-PT');
  });

  const atualizarInput = (atletaId: string, campo: keyof AvaliacaoInput, valor: any) => {
    setAvaliacoes(prev => ({ ...prev, [atletaId]: { ...(prev[atletaId] || { nota: '', semPontuacao: false, motivo: 'Falta' }), [campo]: valor } }));
  };

  const removerAvaliacao = async (atletaId: string) => {
    if (!window.confirm('Pretende remover a avaliação desta atleta?')) return;
    const { error } = await supabase.from('avaliacoes').delete().eq('evento_id', evento.id).eq('atleta_id', atletaId).eq('treinador_id', user.id);
    if (!error) { setAvaliacoes(prev => { const n = { ...prev }; delete n[atletaId]; return n; }); onGuardado(); }
  };

  const guardar = async () => {
    setSalvando(true);
    const dados = Object.entries(avaliacoes)
      .filter(([_, d]) => d.nota.trim() !== '' || d.semPontuacao)
      .map(([atletaId, d]) => ({ evento_id: evento.id, atleta_id: atletaId, treinador_id: user.id, nota: d.semPontuacao ? null : parseFloat(d.nota), motivo: d.semPontuacao ? d.motivo : null }));

    if (dados.length === 0) { alert('Nada para guardar.'); setSalvando(false); return; }
    const { error } = await supabase.from('avaliacoes').upsert(dados, { onConflict: 'evento_id, atleta_id, treinador_id' });
    setSalvando(false);
    if (!error) { alert('Notas guardadas!'); onGuardado(); } else alert('Erro.');
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: 'white', padding: '16px 20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div>
          <h2 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '1.25em' }}>{user.perfil === 'admin' ? 'Visão Global de Notas' : 'Registo de Notas'}</h2>
          <div style={{ color: '#475569', fontSize: '0.9em' }}>
            {new Date(evento.data).toLocaleDateString('pt-PT')} • 
            <strong style={{ color: evento.tipo.includes('Jogo') ? '#dc2626' : '#16a34a', marginLeft: '6px' }}>{evento.tipo}</strong>
            {evento.adversario && ` 🆚 ${evento.adversario}`}
          </div>
        </div>
        <button onClick={onVoltar} style={{ padding: '8px 16px', backgroundColor: '#475569', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', fontSize: '0.9em' }}>Voltar</button>
      </div>

      {user.perfil === 'admin' ? (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                <th style={{ padding: '12px 15px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>Atleta</th>
                {Object.values(treinadoresEnvolvidos).map(nomeTreinador => (
                  <th key={nomeTreinador} style={{ padding: '12px 15px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>{nomeTreinador}</th>
                ))}
                <th style={{ padding: '12px 15px', borderBottom: '1px solid #e2e8f0', color: '#0f172a', fontWeight: 'bold' }}>Média Evento</th>
              </tr>
            </thead>
            <tbody>
              {atletasOrdenadas.map(atleta => {
                const avaliacoesDaAtleta = avaliacoesGerais.filter(a => a.atleta_id === atleta.id);
                if (avaliacoesDaAtleta.length === 0) return null; // Esconde quem não foi avaliado

                const notasValidas = avaliacoesDaAtleta.filter(a => a.nota !== null).map(a => parseFloat(a.nota));
                const media = notasValidas.length > 0 ? (notasValidas.reduce((sum, val) => sum + val, 0) / notasValidas.length).toFixed(2) : '-';

                return (
                  <tr key={atleta.id}>
                    <td style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', fontWeight: '500', color: '#1e293b' }}>{atleta.numero ? `${atleta.numero} - ` : ''}{atleta.nome}</td>
                    {Object.keys(treinadoresEnvolvidos).map(tId => {
                      const aval = avaliacoesDaAtleta.find(a => a.treinador_id === tId);
                      const display = aval ? (aval.nota !== null ? aval.nota : aval.motivo) : '-';
                      return <td key={tId} style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>{display}</td>;
                    })}
                    <td style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', fontWeight: 'bold', color: '#f59e0b' }}>{media}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {/* O layout do treinador permanece igual */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '25px' }}>
            {atletasOrdenadas.map(atleta => {
              const aval = avaliacoes[atleta.id];
              const temRegisto = aval && (aval.nota.trim() !== '' || aval.semPontuacao);
              return (
                <div key={atleta.id} style={{ backgroundColor: 'white', padding: '14px 18px', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.06)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', borderLeft: temRegisto ? (aval.semPontuacao ? '4px solid #ef4444' : '4px solid #10b981') : '4px solid #cbd5e1' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '1em' }}>{atleta.numero ? `${atleta.numero} - ` : ''}{atleta.nome}</div>
                    <div style={{ fontSize: '0.85em', color: '#64748b', marginTop: '2px' }}>{atleta.posicao}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88em', color: '#334155', cursor: 'pointer' }}>
                      <input type="checkbox" checked={aval?.semPontuacao || false} onChange={(e) => atualizarInput(atleta.id, 'semPontuacao', e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }}/> Sem nota
                    </label>
                    {aval?.semPontuacao ? (
                      <select value={aval.motivo || 'Falta'} onChange={(e) => atualizarInput(atleta.id, 'motivo', e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '2px solid #ef4444', backgroundColor: '#ffffff', color: '#991b1b', fontSize: '0.9em', fontWeight: '600' }}>
                        <option value="Falta">Falta</option><option value="Lesionada">Lesionada</option><option value="Doente">Doente</option>
                      </select>
                    ) : (
                      <input type="number" min="0" max="10" step="0.1" placeholder="0 - 10" value={aval?.nota || ''} onChange={(e) => atualizarInput(atleta.id, 'nota', e.target.value)} style={{ width: '85px', padding: '8px 10px', borderRadius: '6px', border: '2px solid #94a3b8', backgroundColor: '#ffffff', color: '#0f172a', fontSize: '0.95em', fontWeight: 'bold', textAlign: 'center' }} />
                    )}
                    {temRegisto && <button type="button" onClick={() => removerAvaliacao(atleta.id)} style={{ padding: '8px 10px', backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85em', fontWeight: '600' }}>🗑️ Limpar</button>}
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={guardar} disabled={salvando} style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', width: '100%', padding: '14px', fontSize: '1em', fontWeight: 'bold', cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1 }}>{salvando ? 'A guardar...' : 'Guardar Todas as Notas'}</button>
        </>
      )}
    </div>
  );
}