import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import type { Atleta } from '../types';

interface RelatorioProps {
  atletas: Atleta[];
}

export default function Relatorio({ atletas }: RelatorioProps) {
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [tipoView, setTipoView] = useState<'global' | 'individual'>('global');
  
  // Estados para o Relatório Individual
  const [atletaSelecionada, setAtletaSelecionada] = useState<string>('');
  const [periodo, setPeriodo] = useState<'semana' | 'mes'>('semana');

  useEffect(() => {
    carregarTodasAvaliacoes();
  }, []);

  // Define a primeira atleta como padrão quando a lista carregar
  useEffect(() => {
    if (atletas.length > 0 && !atletaSelecionada) {
      setAtletaSelecionada(atletas[0].id);
    }
  }, [atletas]);

  const carregarTodasAvaliacoes = async () => {
    // Trazemos as notas e a data do evento correspondente
    const { data } = await supabase
      .from('avaliacoes')
      .select('nota, atleta_id, eventos(data)');
    
    if (data) setAvaliacoes(data);
  };

  const getWeekNumber = (d: Date) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const calcularMediaGlobal = (atletaId: string) => {
    const notas = avaliacoes.filter(av => av.atleta_id === atletaId && av.nota !== null).map(av => parseFloat(av.nota));
    if (notas.length === 0) return '-';
    return (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(2);
  };

  const gerarTextoIndividual = () => {
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    const semanaAtual = getWeekNumber(hoje);

    const notasDoPeriodo = avaliacoes.filter(av => {
      if (av.atleta_id !== atletaSelecionada || av.nota === null || !av.eventos) return false;
      const dataEvento = new Date(av.eventos.data);
      
      if (periodo === 'mes') {
        return (dataEvento.getMonth() + 1) === mesAtual && dataEvento.getFullYear() === anoAtual;
      } else {
        return getWeekNumber(dataEvento) === semanaAtual && dataEvento.getFullYear() === anoAtual;
      }
    }).map(av => parseFloat(av.nota));

    if (notasDoPeriodo.length === 0) {
      return `Ainda não existem notas tuas registadas nesta ${periodo === 'semana' ? 'semana' : 'mês'}.`;
    }

    const media = (notasDoPeriodo.reduce((a, b) => a + b, 0) / notasDoPeriodo.length).toFixed(1);
    const textoPeriodo = periodo === 'semana' ? 'desta semana' : 'deste mês';
    
    return `A média da tua pontuação ${textoPeriodo} é de ${media}`;
  };

  const imprimirPDF = () => {
    window.print();
  };

  const atletaSelDados = atletas.find(a => a.id === atletaSelecionada);

  return (
    <div className="print-area">
      {/* Estilos injetados para formatação limpa no momento de imprimir o PDF */}
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
        <div className="print-shadow" style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ color: '#0f172a', margin: '0 0 20px 0', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>Relatório Global de Pontuações</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ padding: '10px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Nº</th>
                <th style={{ padding: '10px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Atleta</th>
                <th style={{ padding: '10px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Posição</th>
                <th style={{ padding: '10px', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'center' }}>Média Global</th>
              </tr>
            </thead>
            <tbody>
              {atletas.map(atleta => (
                <tr key={atleta.id}>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>{atleta.numero || '-'}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontWeight: 'bold', color: '#1e293b' }}>{atleta.nome}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>{atleta.posicao}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontWeight: 'bold', color: '#f59e0b', textAlign: 'center' }}>{calcularMediaGlobal(atleta.id)}</td>
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