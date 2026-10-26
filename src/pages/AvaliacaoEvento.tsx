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

// Ordem tática no terreno de jogo (Defesa -> Ataque)
const PESO_POSICAO: Record<string, number> = {
  'Guarda-Redes': 1,
  'Defesa': 2,
  'Médio': 3,
  'Avançada': 4
};

export default function AvaliacaoEvento({ evento, user, atletas, onVoltar, onGuardado }: AvaliacaoProps) {
  const [avaliacoes, setAvaliacoes] = useState<Record<string, AvaliacaoInput>>({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarNotasExistentes();
  }, [evento.id]);

  const carregarNotasExistentes = async () => {
    const { data, error } = await supabase
      .from('avaliacoes')
      .select('*')
      .eq('evento_id', evento.id)
      .eq('treinador_id', user.id);
    
    if (data && !error) {
      const notasCarregadas: Record<string, AvaliacaoInput> = {};
      data.forEach(av => {
        notasCarregadas[av.atleta_id] = {
          nota: av.nota !== null ? av.nota.toString() : '',
          semPontuacao: av.nota === null,
          motivo: av.motivo || 'Falta'
        };
      });
      setAvaliacoes(notasCarregadas);
    }
  };

  const atualizarInput = (atletaId: string, campo: keyof AvaliacaoInput, valor: any) => {
    setAvaliacoes(prev => {
      const atual = prev[atletaId] || { nota: '', semPontuacao: false, motivo: 'Falta' };
      return { ...prev, [atletaId]: { ...atual, [campo]: valor } };
    });
  };

  const removerAvaliacao = async (atletaId: string) => {
    if (!window.confirm('Pretende remover a avaliação atribuída a esta atleta neste evento?')) return;

    const { error } = await supabase
      .from('avaliacoes')
      .delete()
      .eq('evento_id', evento.id)
      .eq('atleta_id', atletaId)
      .eq('treinador_id', user.id);

    if (!error) {
      setAvaliacoes(prev => {
        const novo = { ...prev };
        delete novo[atletaId];
        return novo;
      });
      onGuardado();
    } else {
      alert('Erro ao remover avaliação.');
    }
  };

  const guardar = async () => {
    setSalvando(true);
    const dadosParaInserir = Object.entries(avaliacoes)
      .filter(([_, dados]) => dados.nota.trim() !== '' || dados.semPontuacao)
      .map(([atletaId, dados]) => ({
        evento_id: evento.id,
        atleta_id: atletaId,
        treinador_id: user.id,
        nota: dados.semPontuacao ? null : parseFloat(dados.nota),
        motivo: dados.semPontuacao ? dados.motivo : null
      }));

    if (dadosParaInserir.length === 0) {
      alert('Nenhuma alteração para guardar.');
      setSalvando(false);
      return;
    }

    const { error } = await supabase
      .from('avaliacoes')
      .upsert(dadosParaInserir, { onConflict: 'evento_id, atleta_id, treinador_id' });
    
    setSalvando(false);

    if (!error) {
      alert('Notas guardadas com sucesso!');
      onGuardado();
    } else {
      alert('Erro ao guardar notas.');
    }
  };

  // Ordenação tática: Posição do campo + Nome alfabético
  const atletasOrdenadas = [...atletas].sort((a, b) => {
    const pesoA = PESO_POSICAO[a.posicao] ?? 99;
    const pesoB = PESO_POSICAO[b.posicao] ?? 99;

    if (pesoA !== pesoB) {
      return pesoA - pesoB;
    }
    return a.nome.localeCompare(b.nome, 'pt-PT');
  });

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: 'white', padding: '16px 20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div>
          <h2 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '1.25em' }}>Registo de Notas</h2>
          <div style={{ color: '#475569', fontSize: '0.9em' }}>
            {new Date(evento.data).toLocaleDateString('pt-PT')} • 
            <strong style={{ color: evento.tipo.includes('Jogo') ? '#dc2626' : '#16a34a', marginLeft: '6px' }}>{evento.tipo}</strong>
            {evento.adversario && ` 🆚 ${evento.adversario}`}
          </div>
        </div>
        <button 
          onClick={onVoltar} 
          style={{ padding: '8px 16px', backgroundColor: '#475569', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', fontSize: '0.9em' }}
        >
          Voltar
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '25px' }}>
        {atletasOrdenadas.map(atleta => {
          const aval = avaliacoes[atleta.id];
          const temRegisto = aval && (aval.nota.trim() !== '' || aval.semPontuacao);

          return (
            <div 
              key={atleta.id} 
              style={{ 
                backgroundColor: 'white', 
                padding: '14px 18px', 
                borderRadius: '8px', 
                boxShadow: '0 1px 2px rgba(0,0,0,0.06)', 
                display: 'flex', 
                flexWrap: 'wrap', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                gap: '12px',
                borderLeft: temRegisto ? (aval.semPontuacao ? '4px solid #ef4444' : '4px solid #10b981') : '4px solid #cbd5e1'
              }}
            >
              <div>
                <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '1em' }}>{atleta.nome}</div>
                <div style={{ fontSize: '0.85em', color: '#64748b', marginTop: '2px' }}>{atleta.posicao}</div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88em', color: '#334155', cursor: 'pointer', userSelect: 'none' }}>
                  <input 
                    type="checkbox" 
                    checked={aval?.semPontuacao || false} 
                    onChange={(e) => atualizarInput(atleta.id, 'semPontuacao', e.target.checked)} 
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  Sem nota
                </label>
                
                {aval?.semPontuacao ? (
                  <select 
                    value={aval.motivo || 'Falta'} 
                    onChange={(e) => atualizarInput(atleta.id, 'motivo', e.target.value)} 
                    style={{ 
                      padding: '8px 12px', 
                      borderRadius: '6px', 
                      border: '2px solid #ef4444', 
                      backgroundColor: '#ffffff', 
                      color: '#991b1b', 
                      fontSize: '0.9em',
                      fontWeight: '600',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="Falta">Falta</option>
                    <option value="Lesionada">Lesionada</option>
                    <option value="Doente">Doente</option>
                  </select>
                ) : (
                  <input 
                    type="number" 
                    min="0" 
                    max="10" 
                    step="0.1" 
                    placeholder="0 - 10" 
                    value={aval?.nota || ''} 
                    onChange={(e) => atualizarInput(atleta.id, 'nota', e.target.value)} 
                    style={{ 
                      width: '85px', 
                      padding: '8px 10px', 
                      borderRadius: '6px', 
                      border: '2px solid #94a3b8', 
                      backgroundColor: '#ffffff', 
                      color: '#0f172a',
                      fontSize: '0.95em',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      outline: 'none'
                    }} 
                  />
                )}

                {temRegisto && (
                  <button 
                    type="button"
                    onClick={() => removerAvaliacao(atleta.id)} 
                    style={{ 
                      padding: '8px 10px', 
                      backgroundColor: '#fee2e2', 
                      color: '#b91c1c', 
                      border: '1px solid #fecaca', 
                      borderRadius: '6px', 
                      cursor: 'pointer', 
                      fontSize: '0.85em',
                      fontWeight: '600'
                    }}
                    title="Remover avaliação desta atleta"
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
        disabled={salvando}
        style={{ 
          backgroundColor: '#2563eb', 
          color: 'white', 
          border: 'none', 
          borderRadius: '8px', 
          width: '100%', 
          padding: '14px', 
          fontSize: '1em', 
          fontWeight: 'bold', 
          cursor: salvando ? 'not-allowed' : 'pointer',
          opacity: salvando ? 0.7 : 1,
          boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
        }}
      >
        {salvando ? 'A guardar...' : 'Guardar Todas as Notas'}
      </button>
    </div>
  );
}