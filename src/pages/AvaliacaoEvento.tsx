import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Evento, Atleta, Utilizador, AvaliacaoInput } from '../types';

interface AvaliacaoProps {
  evento: Evento;
  user: Utilizador;
  atletas: Atleta[];
  onVoltar: () => void;
  onGuardado: () => void;
}

export default function AvaliacaoEvento({ evento, user, atletas, onVoltar, onGuardado }: AvaliacaoProps) {
  const [avaliacoes, setAvaliacoes] = useState<Record<string, AvaliacaoInput>>({});

  useEffect(() => {
    carregarNotasExistentes();
  }, [evento.id]);

  const carregarNotasExistentes = async () => {
    const { data } = await supabase
      .from('avaliacoes')
      .select('*')
      .eq('evento_id', evento.id)
      .eq('treinador_id', user.id);
    
    if (data) {
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

  const guardar = async () => {
    const dadosParaInserir = Object.entries(avaliacoes)
      .filter(([_, dados]) => dados.nota !== '' || dados.semPontuacao)
      .map(([atletaId, dados]) => ({
        evento_id: evento.id,
        atleta_id: atletaId,
        treinador_id: user.id,
        nota: dados.semPontuacao ? null : parseFloat(dados.nota),
        motivo: dados.semPontuacao ? dados.motivo : null
      }));

    if (dadosParaInserir.length === 0) {
      alert('Nenhuma nota preenchida para guardar.');
      return;
    }

    const { error } = await supabase.from('avaliacoes').upsert(dadosParaInserir, { onConflict: 'evento_id, atleta_id, treinador_id' });
    
    if (!error) {
      alert('Notas guardadas com sucesso!');
      onGuardado();
    } else {
      alert('Erro ao guardar notas.');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div>
          <h2 style={{ margin: '0 0 5px 0', color: '#0f172a' }}>Registo de Notas</h2>
          <div style={{ color: '#64748b', fontSize: '0.95em' }}>
            {new Date(evento.data).toLocaleDateString('pt-PT')} • 
            <strong style={{ color: evento.tipo.includes('Jogo') ? '#ef4444' : '#10b981', marginLeft: '5px' }}>{evento.tipo}</strong>
            {evento.adversario && ` 🆚 ${evento.adversario}`}
          </div>
        </div>
        <button onClick={onVoltar} style={{ padding: '8px 15px', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Voltar</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
        {atletas.map(atleta => {
          const aval = avaliacoes[atleta.id] || { nota: '', semPontuacao: false, motivo: 'Falta' };
          return (
            <div key={atleta.id} style={{ backgroundColor: 'white', padding: '12px 15px', borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div>
                <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{atleta.nome}</div>
                <div style={{ fontSize: '0.85em', color: '#64748b' }}>{atleta.posicao}</div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9em', color: '#475569', cursor: 'pointer' }}>
                  <input type="checkbox" checked={aval.semPontuacao} onChange={(e) => atualizarInput(atleta.id, 'semPontuacao', e.target.checked)} />
                  Sem nota
                </label>
                
                {aval.semPontuacao ? (
                  <select value={aval.motivo} onChange={(e) => atualizarInput(atleta.id, 'motivo', e.target.value)} style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid #fca5a5', backgroundColor: '#fef2f2' }}>
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
                    placeholder="0-10" 
                    value={aval.nota} 
                    onChange={(e) => atualizarInput(atleta.id, 'nota', e.target.value)} 
                    style={{ width: '75px', padding: '6px 8px', borderRadius: '4px', border: '1px solid #86efac', backgroundColor: '#f0fdf4', textAlign: 'center' }} 
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={guardar} style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', width: '100%', padding: '12px', fontSize: '1em', fontWeight: 'bold', cursor: 'pointer' }}>
        Guardar Todas as Notas
      </button>
    </div>
  );
}