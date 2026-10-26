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
  const [periodo, setPeriodo] = useState<'semana' | 'mes'>('semana');

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    if (atletas.length > 0 && !atletaSelecionada) {
      setAtletaSelecionada(atletas[0].id);
    }
  }, [atletas]);

  const carregarDados = async () => {
    const { data: avData } = await supabase
      .from('avaliacoes')
      .select('nota, motivo, atleta_id, treinador_id, eventos(data), treinador:utilizadores(nome)');
    
    if (avData) {
      setAvaliacoes(avData);
      const tMap = new Map<string, string>();
      avData.forEach((av: any) => {
        if (av.treinador?.nome) tMap.set(av.treinador_id, av.treinador.nome.split(' ')[0]);
      });
      setTreinadores(Array.from(tMap.entries()).map(([id, nome]) => ({ id, nome })));
    }
  };

  const getWeekNumber = (d: Date) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const atletasComMedias = atletas.map(atleta => {
    // Apenas selecionamos as notas numéricas OU quando o motivo for "Falta"
    const avaliacoesValidas = avaliacoes.filter(av => 
      av.atleta_id === atleta.id && (av.nota !== null || av.motivo === 'Falta')
    );
    
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

  const gerarTextoIndividual = () => {
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    const semanaAtual = getWeekNumber(hoje);

    // Filtra apenas as que importam para a média (Nota e Falta) no período escolhido
    const avaliacoesValidasPeriodo = avaliacoes.filter(av => {
      if (av.atleta_id !== atletaSelecionada || !av.eventos) return false;
      if (av.nota === null && av.motivo !== 'Falta') return false; // Ignora as Doenças, Lesões, etc
      
      const d = new Date(av.eventos.data);
      if (periodo === 'mes') return (d.getMonth() + 1) === mesAtual && d.getFullYear() === anoAtual;
      return getWeekNumber(d) === semanaAtual && d.getFullYear() === anoAtual;
    });

    if (avaliacoesValidasPeriodo.length === 0) {
      return `Ainda não tens pontuações avaliáveis registadas nesta ${periodo === 'semana' ? 'semana' : 'mês'}.`;
    }

    const soma = avaliacoesValidasPeriodo.reduce((acc, av) => acc + (av.nota !== null ? parseFloat(av.nota) : 0), 0);
    const media = (soma / avaliacoesValidasPeriodo.length).toFixed(1);
    const textoPeriodo = periodo === 'semana' ? 'desta semana' : 'deste mês';
    
    return `A média da tua pontuação ${textoPeriodo} é de ${media}`;
  };

  const imprimirPDF = () => window.print();
  const atletaSelDados = atletas.find(a => a.id === atletaSelecionada);

  return (
    <div className="print-area">
      <style>
        {`
          @media print {
            .no-print { display: none !important; }
            body { background-color: white !important; }
            .print-area { padding: 0 !important; }
            .print-shadow { box-shadow: none !important; border: 1px solid #e2e8f0; }
          }
        `}
      </style>

      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setTipoView('global')} style={{ padding: '8px 15px', backgroundColor: tipoView === 'global' ? '#1e293b' : '#cbd5e1', color: tipoView === 'global' ? 'white' : '#334155', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Global (Plantel)</button>
          <button onClick={() => setTipoView('individual')} style={{ padding: '8px 15px', backgroundColor: tipoView === 'individual' ? '#1e293b' : '#cbd5e1', color: tipoView === 'individual' ? 'white' : '#334155', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Individual</button>
        </div>
        <button onClick={imprimirPDF} style={{ padding: '8px 15px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
          📄 Guardar PDF
        </button>
      </div>

      {tipoView === 'global' ? (
        <div className="print-shadow" style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
          <h2 style={{ color: '#0f172a', margin: '0 0 20px 0', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>Relatório Global de Pontuações</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ padding: '10px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Nº</th>
                <th style={{ padding: '10px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Atleta</th>
                {treinadores.map(t => (
                  <th key={t.id} style={{ padding: '10px', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'center' }}>{t.nome}</th>
                ))}
                <th style={{ padding: '10px', borderBottom: '2px solid #e2e8f0', color: '#0f172a', textAlign: 'center' }}>Média Global</th>
              </tr>
            </thead>
            <tbody>
              {atletasComMedias.map(atleta => (
                <tr key={atleta.id}>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>{atleta.numero || '-'}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontWeight: 'bold', color: '#1e293b' }}>
                    {atleta.nome}
                    <div style={{ fontSize: '0.8em', color: '#94a3b8', fontWeight: 'normal' }}>{atleta.posicao}</div>
                  </td>
                  {treinadores.map(t => (
                    <td key={t.id} style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', color: '#64748b', textAlign: 'center' }}>
                      {atleta.mediasTreinador[t.id] !== null ? atleta.mediasTreinador[t.id]?.toFixed(2) : '-'}
                    </td>
                  ))}
                  <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontWeight: 'bold', color: '#f59e0b', textAlign: 'center', fontSize: '1.1em' }}>
                    {atleta.mediaGlobal !== null ? atleta.mediaGlobal.toFixed(2) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="print-shadow" style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div className="no-print" style={{ display: 'flex', gap: '15px', marginBottom: '30px', flexWrap: 'wrap' }}>
            <select value={atletaSelecionada} onChange={(e) => setAtletaSelecionada(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1em', flex: '1 1 200px' }}>
              {atletas.map(a => <option key={a.id} value={a.id}>{a.numero ? `${a.numero} - ` : ''}{a.nome}</option>)}
            </select>
            <select value={periodo} onChange={(e) => setPeriodo(e.target.value as 'semana' | 'mes')} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1em', flex: '0 1 150px' }}>
              <option value="semana">Semana Atual</option>
              <option value="mes">Mês Atual</option>
            </select>
          </div>

          <div style={{ textAlign: 'center', padding: '40px 20px', border: '2px dashed #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
            <h2 style={{ color: '#0f172a', margin: '0 0 10px 0', fontSize: '1.8em' }}>{atletaSelDados?.nome}</h2>
            <div style={{ color: '#64748b', fontSize: '1.1em', marginBottom: '25px' }}>{atletaSelDados?.posicao}</div>
            <div style={{ fontSize: '1.5em', color: '#10b981', fontWeight: 'bold', maxWidth: '600px', margin: '0 auto', lineHeight: '1.4' }}>
              "{gerarTextoIndividual()}"
            </div>
          </div>
        </div>
      )}
    </div>
  );
}