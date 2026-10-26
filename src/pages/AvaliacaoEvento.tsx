import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import type { Evento, Atleta, Utilizador, AvaliacaoInput } from '../types';

interface AvaliacaoProps {
  evento: Evento;
  user: Utilizador;
  atletas: Atleta[];
  onVoltar: () => void;
  onGuardado?: () => void;
  onMudarEvento?: (ev: Evento) => void;
}

interface Notificacao {
  mensagem: string;
  tipo: 'sucesso' | 'erro' | 'aviso';
}

const PESO_POSICAO: Record<string, number> = { 'Guarda-Redes': 1, 'Defesa': 2, 'Médio': 3, 'Avançada': 4 };

export default function AvaliacaoEvento({ evento, user, atletas, onVoltar, onGuardado, onMudarEvento }: AvaliacaoProps) {
  const [avaliacoes, setAvaliacoes] = useState<Record<string, AvaliacaoInput>>({});
  const [salvando, setSalvando] = useState(false);
  const [avaliacoesGerais, setAvaliacoesGerais] = useState<any[]>([]);
  const [treinadoresEnvolvidos, setTreinadoresEnvolvidos] = useState<Record<string, string>>({});
  
  // Estado de fecho do evento
  const [estaFechado, setEstaFechado] = useState<boolean>(evento.fechado ?? false);

  const [eventoAnterior, setEventoAnterior] = useState<Evento | null>(null);
  const [eventoSeguinte, setEventoSeguinte] = useState<Evento | null>(null);

  // Popups da plataforma
  const [notificacao, setNotificacao] = useState<Notificacao | null>(null);
  const [atletaParaRemover, setAtletaParaRemover] = useState<string | null>(null);

  useEffect(() => {
    carregarEstadoEvento();
    if (user.perfil === 'admin') {
      carregarTodasAsNotasAdmin();
    } else {
      carregarNotasExistentes();
    }
    carregarAdjacentes();
  }, [evento.id]);

  useEffect(() => {
    if (notificacao) {
      const timer = setTimeout(() => setNotificacao(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notificacao]);

  const mostrarNotificacao = (mensagem: string, tipo: 'sucesso' | 'erro' | 'aviso') => {
    setNotificacao({ mensagem, tipo });
  };

  const carregarEstadoEvento = async () => {
    const { data } = await supabase.from('eventos').select('fechado').eq('id', evento.id).single();
    if (data) {
      setEstaFechado(data.fechado ?? false);
    }
  };

  const carregarAdjacentes = async () => {
    const { data } = await supabase.from('eventos').select('*').order('data', { ascending: true });
    if (data) {
      const index = data.findIndex(e => e.id === evento.id);
      if (index > 0) setEventoAnterior(data[index - 1]);
      else setEventoAnterior(null);
      
      if (index >= 0 && index < data.length - 1) setEventoSeguinte(data[index + 1]);
      else setEventoSeguinte(null);
    }
  };

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

  const carregarTodasAsNotasAdmin = async () => {
    const { data: avalData } = await supabase.from('avaliacoes').select('*, treinador:utilizadores(id, nome)').eq('evento_id', evento.id);
    if (avalData) {
      setAvaliacoesGerais(avalData);
      const treinadores: Record<string, string> = {};
      avalData.forEach((av: any) => { if (av.treinador) treinadores[av.treinador.id] = av.treinador.nome.split(' ')[0]; });
      setTreinadoresEnvolvidos(treinadores);
    }
  };

  const alternarFechoEvento = async () => {
    const novoEstado = !estaFechado;
    const { error } = await supabase.from('eventos').update({ fechado: novoEstado }).eq('id', evento.id);
    if (!error) {
      setEstaFechado(novoEstado);
      evento.fechado = novoEstado;
      mostrarNotificacao(novoEstado ? 'Evento fechado! As notas foram bloqueadas.' : 'Evento reaberto para edição.', novoEstado ? 'aviso' : 'sucesso');
    } else {
      mostrarNotificacao('Erro ao alterar o estado do evento.', 'erro');
    }
  };

  const atletasOrdenadas = [...atletas].sort((a, b) => {
    const pesoA = PESO_POSICAO[a.posicao] ?? 99;
    const pesoB = PESO_POSICAO[b.posicao] ?? 99;
    if (pesoA !== pesoB) return pesoA - pesoB;
    return a.nome.localeCompare(b.nome, 'pt-PT');
  });

  const atualizarInput = (atletaId: string, campo: keyof AvaliacaoInput, valor: any) => {
    if (estaFechado) return;
    setAvaliacoes(prev => ({ ...prev, [atletaId]: { ...(prev[atletaId] || { nota: '', semPontuacao: false, motivo: 'Falta' }), [campo]: valor } }));
  };

  const confirmarRemocao = async () => {
    if (!atletaParaRemover || estaFechado) return;
    const { error } = await supabase.from('avaliacoes').delete().eq('evento_id', evento.id).eq('atleta_id', atletaParaRemover).eq('treinador_id', user.id);
    if (!error) {
      setAvaliacoes(prev => { const n = { ...prev }; delete n[atletaParaRemover]; return n; });
      mostrarNotificacao('Avaliação removida com sucesso.', 'aviso');
    } else {
      mostrarNotificacao('Erro ao remover a avaliação.', 'erro');
    }
    setAtletaParaRemover(null);
  };

  const guardar = async () => {
    if (estaFechado) {
      mostrarNotificacao('Este evento está fechado e não pode ser editado.', 'erro');
      return;
    }

    setSalvando(true);
    const dados = Object.entries(avaliacoes)
      .filter(([_, d]) => d.nota.trim() !== '' || d.semPontuacao)
      .map(([atletaId, d]) => ({ 
        evento_id: evento.id, 
        atleta_id: atletaId, 
        treinador_id: user.id, 
        nota: d.semPontuacao ? null : parseFloat(d.nota), 
        motivo: d.semPontuacao ? d.motivo : null 
      }));

    if (dados.length === 0) { 
      mostrarNotificacao('Nenhuma nota ou justificação preenchida.', 'aviso');
      setSalvando(false); 
      return; 
    }

    const { error } = await supabase.from('avaliacoes').upsert(dados, { onConflict: 'evento_id, atleta_id, treinador_id' });
    setSalvando(false);
    
    if (!error) { 
      mostrarNotificacao('Notas guardadas com sucesso!', 'sucesso');
      carregarNotasExistentes();
      onGuardado?.();
    } else {
      mostrarNotificacao('Erro ao comunicar com a base de dados.', 'erro');
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative' }}>
      
      {/* NOTIFICAÇÃO DA PLATAFORMA */}
      {notificacao && (
        <div style={{
          position: 'fixed',
          top: '25px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '14px 22px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderLeft: `5px solid ${notificacao.tipo === 'sucesso' ? '#10b981' : (notificacao.tipo === 'erro' ? '#ef4444' : '#f59e0b')}`
        }}>
          <span style={{ fontSize: '1.2em' }}>
            {notificacao.tipo === 'sucesso' ? '✅' : (notificacao.tipo === 'erro' ? '❌' : '⚠️')}
          </span>
          <span style={{ color: '#0f172a', fontWeight: '600', fontSize: '0.95em' }}>
            {notificacao.mensagem}
          </span>
          <button 
            type="button" 
            onClick={() => setNotificacao(null)} 
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1em', marginLeft: '8px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO */}
      {atletaParaRemover && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(2px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9998, padding: '20px'
        }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '2em', marginBottom: '10px' }}>🗑️</div>
            <h3 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>Limpar Avaliação?</h3>
            <p style={{ color: '#64748b', fontSize: '0.92em', margin: '0 0 20px 0' }}>Tem a certeza de que pretende remover a pontuação desta atleta?</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button type="button" onClick={() => setAtletaParaRemover(null)} style={{ padding: '10px 18px', backgroundColor: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', flex: '1' }}>Cancelar</button>
              <button type="button" onClick={confirmarRemocao} style={{ padding: '10px 18px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', flex: '1' }}>Sim, Remover</button>
            </div>
          </div>
        </div>
      )}

      {/* CABEÇALHO */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '15px', backgroundColor: 'white', padding: '16px 20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ margin: '0', color: '#0f172a', fontSize: '1.25em' }}>
              {user.perfil === 'admin' ? 'Visão da Direção (Resumo)' : 'Registo de Notas'}
            </h2>
            {estaFechado && (
              <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75em', fontWeight: 'bold' }}>
                🔒 Fechado
              </span>
            )}
          </div>
          <div style={{ color: '#475569', fontSize: '0.9em', marginTop: '4px' }}>
            {new Date(evento.data).toLocaleDateString('pt-PT')} • 
            <strong style={{ color: evento.tipo.includes('Jogo') ? '#dc2626' : '#16a34a', marginLeft: '6px' }}>{evento.tipo}</strong>
            {evento.adversario && ` 🆚 ${evento.adversario}`}
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* BOTÃO DE CONTROLO DO ADMIN (FECHAR / REABRIR) */}
          {user.perfil === 'admin' && (
            <button 
              type="button" 
              onClick={alternarFechoEvento}
              style={{
                padding: '8px 14px',
                backgroundColor: estaFechado ? '#10b981' : '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.85em',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {estaFechado ? '🔓 Reabrir Evento' : '🔒 Fechar Evento'}
            </button>
          )}

          {eventoAnterior && (
            <button type="button" onClick={() => onMudarEvento?.(eventoAnterior)} style={{ padding: '8px 12px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85em' }}>
              ⬅️ Anterior
            </button>
          )}
          {eventoSeguinte && (
            <button type="button" onClick={() => onMudarEvento?.(eventoSeguinte)} style={{ padding: '8px 12px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85em' }}>
              Seguinte ➡️
            </button>
          )}
          <button type="button" onClick={onVoltar} style={{ padding: '8px 16px', backgroundColor: '#475569', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', fontSize: '0.9em' }}>
            Voltar
          </button>
        </div>
      </div>

      {/* AVISO VISUAL DE BLOQUEIO PARA OS TREINADORES */}
      {user.perfil !== 'admin' && estaFechado && (
        <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92em', fontWeight: '500' }}>
          <span style={{ fontSize: '1.2em' }}>🔒</span>
          Este evento foi encerrado pela Direção. As pontuações encontram-se bloqueadas para edição.
        </div>
      )}

      {/* VISÃO DO ADMIN: TABELA RESUMO SEM CAMPOS DE NOTA */}
      {user.perfil === 'admin' ? (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                <th style={{ padding: '12px 15px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>Atleta</th>
                {Object.values(treinadoresEnvolvidos).map((nomeTreinador, idx) => (
                  <th key={idx} style={{ padding: '12px 15px', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'center' }}>{nomeTreinador}</th>
                ))}
                <th style={{ padding: '12px 15px', borderBottom: '1px solid #e2e8f0', color: '#0f172a', fontWeight: 'bold', textAlign: 'center' }}>Média Evento</th>
              </tr>
            </thead>
            <tbody>
              {atletasOrdenadas.map(atleta => {
                const avaliacoesDaAtleta = avaliacoesGerais.filter(a => a.atleta_id === atleta.id && (a.nota !== null || a.motivo === 'Falta'));
                const avalTodasDaAtleta = avaliacoesGerais.filter(a => a.atleta_id === atleta.id);
                if (avalTodasDaAtleta.length === 0) return null;

                const notasValidas = avaliacoesDaAtleta.map(a => a.nota !== null ? parseFloat(a.nota) : 0);
                const media = notasValidas.length > 0 ? (notasValidas.reduce((sum, val) => sum + val, 0) / notasValidas.length).toFixed(2) : '-';

                return (
                  <tr key={atleta.id}>
                    <td style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', fontWeight: '500', color: '#1e293b' }}>{atleta.numero ? `${atleta.numero} - ` : ''}{atleta.nome}</td>
                    {Object.keys(treinadoresEnvolvidos).map(tId => {
                      const aval = avalTodasDaAtleta.find(a => a.treinador_id === tId);
                      const display = aval ? (aval.nota !== null ? aval.nota : aval.motivo) : '-';
                      return <td key={tId} style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', color: '#64748b', textAlign: 'center' }}>{display}</td>;
                    })}
                    <td style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', fontWeight: 'bold', color: '#f59e0b', textAlign: 'center' }}>{media}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* VISÃO DOS TREINADORES */
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '25px' }}>
            {atletasOrdenadas.map(atleta => {
              const aval = avaliacoes[atleta.id];
              const temRegisto = aval && (aval.nota.trim() !== '' || aval.semPontuacao);
              return (
                <div key={atleta.id} style={{ 
                  backgroundColor: estaFechado ? '#f8fafc' : 'white', 
                  padding: '14px 18px', 
                  borderRadius: '8px', 
                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)', 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  gap: '12px', 
                  borderLeft: temRegisto ? (aval.semPontuacao && aval.motivo === 'Falta' ? '4px solid #ef4444' : (aval.semPontuacao ? '4px solid #f59e0b' : '4px solid #10b981')) : '4px solid #cbd5e1' 
                }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '1em' }}>{atleta.numero ? `${atleta.numero} - ` : ''}{atleta.nome}</div>
                    <div style={{ fontSize: '0.85em', color: '#64748b', marginTop: '2px' }}>{atleta.posicao}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88em', color: '#334155', cursor: estaFechado ? 'not-allowed' : 'pointer' }}>
                      <input 
                        type="checkbox" 
                        disabled={estaFechado}
                        checked={aval?.semPontuacao || false} 
                        onChange={(e) => atualizarInput(atleta.id, 'semPontuacao', e.target.checked)} 
                        style={{ width: '16px', height: '16px', cursor: estaFechado ? 'not-allowed' : 'pointer' }}
                      /> Sem nota
                    </label>

                    {aval?.semPontuacao ? (
                      <select 
                        disabled={estaFechado}
                        value={aval.motivo || 'Falta'} 
                        onChange={(e) => atualizarInput(atleta.id, 'motivo', e.target.value)} 
                        style={{ 
                          padding: '8px 12px', 
                          borderRadius: '6px', 
                          border: '2px solid #cbd5e1', 
                          backgroundColor: estaFechado ? '#e2e8f0' : '#ffffff', 
                          color: '#334155', 
                          fontSize: '0.9em', 
                          fontWeight: '500',
                          cursor: estaFechado ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <option value="Falta">Falta (Conta 0)</option>
                        <option value="Justificada">Justificada</option>
                        <option value="Doente">Doente</option>
                        <option value="Lesionada">Lesionada</option>
                        <option value="Não aplicável">Não aplicável</option>
                        {evento.tipo.includes('Jogo') && <option value="Não convocada">Não convocada</option>}
                      </select>
                    ) : (
                      <input 
                        type="number" 
                        min="0" 
                        max="10" 
                        step="0.1" 
                        placeholder="0 - 10" 
                        disabled={estaFechado}
                        value={aval?.nota || ''} 
                        onChange={(e) => atualizarInput(atleta.id, 'nota', e.target.value)} 
                        style={{ 
                          width: '85px', 
                          padding: '8px 10px', 
                          borderRadius: '6px', 
                          border: '2px solid #94a3b8', 
                          backgroundColor: estaFechado ? '#e2e8f0' : '#ffffff', 
                          color: '#0f172a', 
                          fontSize: '0.95em', 
                          fontWeight: 'bold', 
                          textAlign: 'center',
                          cursor: estaFechado ? 'not-allowed' : 'text'
                        }} 
                      />
                    )}

                    {temRegisto && !estaFechado && (
                      <button 
                        type="button" 
                        onClick={() => setAtletaParaRemover(atleta.id)} 
                        style={{ padding: '8px 10px', backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85em', fontWeight: '600' }}
                      >
                        🗑️ Limpar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button 
            onClick={guardar} 
            disabled={salvando || estaFechado} 
            style={{ 
              backgroundColor: estaFechado ? '#94a3b8' : '#2563eb', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              width: '100%', 
              padding: '14px', 
              fontSize: '1em', 
              fontWeight: 'bold', 
              cursor: (salvando || estaFechado) ? 'not-allowed' : 'pointer', 
              opacity: salvando ? 0.7 : 1 
            }}
          >
            {estaFechado ? '🔒 Evento Fechado (Edição Bloqueada)' : (salvando ? 'A guardar...' : 'Guardar Todas as Notas')}
          </button>
        </>
      )}
    </div>
  );
}