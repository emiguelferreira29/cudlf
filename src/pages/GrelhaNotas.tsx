import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import type { Atleta } from '../types';

interface GrelhaNotasProps {
  atletas: Atleta[];
}

export default function GrelhaNotas({ atletas }: GrelhaNotasProps) {
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<'mes' | 'semana'>('mes');
  const [filtroValor, setFiltroValor] = useState<string>('');
  const [opcoesSemana, setOpcoesSemana] = useState<string[]>([]);
  const [opcoesMes, setOpcoesMes] = useState<string[]>([]);
  const [gerandoPDF, setGerandoPDF] = useState(false);

  useEffect(() => { carregarDados(); }, []);

  useEffect(() => {
    if (filtroTipo === 'semana' && opcoesSemana.length > 0 && !opcoesSemana.includes(filtroValor)) setFiltroValor(opcoesSemana[0]);
    else if (filtroTipo === 'mes' && opcoesMes.length > 0 && !opcoesMes.includes(filtroValor)) setFiltroValor(opcoesMes[0]);
  }, [filtroTipo, opcoesSemana, opcoesMes]);

  const carregarDados = async () => {
    const { data: evData } = await supabase.from('eventos').select('*').order('data', { ascending: true });
    const { data: avData } = await supabase.from('avaliacoes').select('*');

    if (evData && avData) {
      setEventos(evData);
      setAvaliacoes(avData);

      const semanasMap = new Map<string, string>();
      const mesesMap = new Map<string, string>();

      evData.forEach((ev: any) => {
        const d = new Date(ev.data);
        const w = getWeekNumber(d);
        const yr = d.getFullYear();
        const mo = d.getMonth() + 1;
        semanasMap.set(`${yr}-${w.toString().padStart(2, '0')}`, `Semana ${w} (${yr})`);
        
        const nomeMes = d.toLocaleString('pt-PT', { month: 'long' });
        mesesMap.set(`${yr}-${mo.toString().padStart(2, '0')}`, `${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)} ${yr}`);
      });

      const arrSemanas = Array.from(semanasMap.entries()).sort((a, b) => b[0].localeCompare(a[0])).map(e => e[1]);
      const arrMeses = Array.from(mesesMap.entries()).sort((a, b) => b[0].localeCompare(a[0])).map(e => e[1]);
      
      setOpcoesSemana(arrSemanas);
      setOpcoesMes(arrMeses);
      
      if (arrMeses.length > 0) setFiltroValor(arrMeses[0]);
    }
  };

  const getWeekNumber = (d: Date) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const eventosFiltrados = eventos.filter(ev => {
    const d = new Date(ev.data);
    if (filtroTipo === 'semana') return `Semana ${getWeekNumber(d)} (${d.getFullYear()})` === filtroValor;
    if (filtroTipo === 'mes') {
      const nomeMes = d.toLocaleString('pt-PT', { month: 'long' });
      return `${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)} ${d.getFullYear()}` === filtroValor;
    }
    return false;
  });

  const atletasOrdenados = [...atletas].sort((a, b) => {
    const numA = a.numero !== null && a.numero !== undefined ? a.numero : 999;
    const numB = b.numero !== null && b.numero !== undefined ? b.numero : 999;
    if (numA !== numB) return numA - numB;
    return a.nome.localeCompare(b.nome, 'pt-PT');
  });

  const baixarPDF = () => {
    setGerandoPDF(true);
    
    setTimeout(() => {
      const elemento = document.getElementById('relatorio-pdf');
      if (!elemento) return;

      const opcoes = {
        margin:       4,
        filename:     `Relatorio_Sub17_${filtroValor.replace(/ /g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 1 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };

      const executarDownload = () => {
        (window as any).html2pdf().set(opcoes).from(elemento).save().then(() => {
          setGerandoPDF(false);
        });
      };

      if (!(window as any).html2pdf) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = executarDownload;
        document.body.appendChild(script);
      } else {
        executarDownload();
      }
    }, 200);
  };

  return (
    <div>
      {!gerandoPDF && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.3em' }}>📋 Grelha de Pontuações</h2>
            <div style={{ marginTop: '4px', color: '#64748b', fontSize: '0.95em', fontWeight: '500' }}>{filtroValor}</div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as any)} style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.95em', fontWeight: '600', color: '#1e293b', cursor: 'pointer' }}>
              <option value="mes">Por Mês</option><option value="semana">Por Semana</option>
            </select>
            {filtroTipo === 'semana' && opcoesSemana.length > 0 && <select value={filtroValor} onChange={(e) => setFiltroValor(e.target.value)} style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.95em', fontWeight: '600', color: '#1e293b', cursor: 'pointer' }}>{opcoesSemana.map(s => <option key={s} value={s}>{s}</option>)}</select>}
            {filtroTipo === 'mes' && opcoesMes.length > 0 && <select value={filtroValor} onChange={(e) => setFiltroValor(e.target.value)} style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.95em', fontWeight: '600', color: '#1e293b', cursor: 'pointer' }}>{opcoesMes.map(m => <option key={m} value={m}>{m}</option>)}</select>}
            
            <button onClick={baixarPDF} disabled={gerandoPDF} style={{ padding: '8px 15px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: gerandoPDF ? 'wait' : 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
              {gerandoPDF ? 'A gerar PDF...' : '📄 Guardar Relatório'}
            </button>
          </div>
        </div>
      )}

      {/* ÁREA QUE VAI SER CONVERTIDA EM PDF */}
      <div id="relatorio-pdf" style={{ backgroundColor: 'white', padding: gerandoPDF ? '10px' : '0', borderRadius: gerandoPDF ? '0' : '8px' }}>
        
        {/* CABEÇALHO OFICIAL - SÓ APARECE DURANTE A GERAÇÃO DO PDF */}
        {gerandoPDF && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px', paddingBottom: '10px', borderBottom: '2px solid #e2e8f0' }}>
            <img 
              src="/logor.png" 
              alt="Logótipo do Clube" 
              style={{ height: '40px', width: 'auto', objectFit: 'contain' }} 
              onError={(e) => e.currentTarget.style.display = 'none'} 
            />
            <div>
              <h1 style={{ margin: 0, color: '#0f172a', fontSize: '1.2em', textTransform: 'uppercase', lineHeight: 1.1 }}>Clube União Desportivo Leverense</h1>
              <h2 style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.95em', fontWeight: '500' }}>Sub-17 Feminino • {filtroValor}</h2>
            </div>
          </div>
        )}

        <div style={{ overflowX: gerandoPDF ? 'visible' : 'auto', backgroundColor: 'white', borderRadius: '8px', boxShadow: gerandoPDF ? 'none' : '0 1px 3px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: gerandoPDF ? '0.70em' : '0.85em' }}>
            <thead>
              <tr>
                <th style={{ 
                  position: gerandoPDF ? 'static' : 'sticky', left: 0, zIndex: 2, backgroundColor: '#f8fafc', 
                  padding: gerandoPDF ? '6px 4px' : '10px 8px', borderBottom: '2px solid #e2e8f0', borderRight: '2px solid #e2e8f0', 
                  color: '#475569', textAlign: 'left', minWidth: gerandoPDF ? 'auto' : '90px', maxWidth: gerandoPDF ? 'none' : '130px',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>Atleta</th>
                {eventosFiltrados.map(ev => (
                  <th key={ev.id} style={{ padding: gerandoPDF ? '4px 2px' : '10px 5px', borderBottom: '2px solid #e2e8f0', borderRight: '1px solid #e2e8f0', color: '#475569', textAlign: 'center' }}>
                    <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{new Date(ev.data).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}</div>
                    <div style={{ fontSize: '0.85em', fontWeight: 'normal', color: ev.tipo.includes('Jogo') ? '#ef4444' : '#10b981' }}>{ev.tipo.split(' ')[0]}</div>
                  </th>
                ))}
                <th style={{ position: gerandoPDF ? 'static' : 'sticky', right: 0, zIndex: 2, backgroundColor: '#f8fafc', padding: gerandoPDF ? '6px 8px' : '12px', borderBottom: '2px solid #e2e8f0', borderLeft: '2px solid #e2e8f0', color: '#0f172a', textAlign: 'center', minWidth: gerandoPDF ? 'auto' : '60px' }}>Média</th>
              </tr>
            </thead>
            <tbody>
              {atletasOrdenados.length === 0 ? <tr><td colSpan={eventosFiltrados.length + 2} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Sem dados.</td></tr> : (
                atletasOrdenados.map(a => {
                  let totalNotas = 0;
                  let countNotas = 0;

                  return (
                    <tr key={a.id}>
                      <td title={a.nome} style={{ 
                        position: gerandoPDF ? 'static' : 'sticky', left: 0, zIndex: 1, backgroundColor: 'white', 
                        padding: gerandoPDF ? '4px 4px' : '10px 8px', borderBottom: '1px solid #f1f5f9', borderRight: '2px solid #e2e8f0', 
                        fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap', maxWidth: gerandoPDF ? 'none' : '130px',
                        overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        {a.numero ? `${a.numero} - ` : ''}{a.nome}
                      </td>
                      {eventosFiltrados.map(ev => {
                        const avs = avaliacoes.filter(av => av.evento_id === ev.id && av.atleta_id === a.id);
                        const notasNumericas = avs.filter(av => av.nota !== null).map(av => parseFloat(av.nota));
                        
                        let display = '-';
                        let color = '#94a3b8';
                        let bg = 'transparent';
                        let bold = false;

                        if (notasNumericas.length > 0) {
                          const mediaEv = notasNumericas.reduce((acc, v) => acc + v, 0) / notasNumericas.length;
                          totalNotas += mediaEv;
                          countNotas++;
                          display = mediaEv.toFixed(1);
                          color = '#d97706';
                          bold = true;
                        } else if (avs.length > 0 && avs[0].motivo) {
                          display = avs[0].motivo;
                          if (display === 'Falta') { color = '#ef4444'; display = 'F'; totalNotas += 0; countNotas++; bg = '#fef2f2'; bold = true; }
                          else if (display === 'Justificada') { color = '#3b82f6'; display = 'J'; bg = '#eff6ff'; }
                          else if (display === 'Doente') { color = '#8b5cf6'; display = 'D'; bg = '#f5f3ff'; }
                          else if (display === 'Lesionada') { color = '#f97316'; display = 'L'; bg = '#fff7ed'; }
                          else if (display === 'Não convocada') { color = '#64748b'; display = 'NC'; bg = '#f8fafc'; }
                          else if (display === 'Não aplicável') { color = '#64748b'; display = 'NA'; bg = '#f8fafc'; }
                        }

                        return (
                          <td key={ev.id} style={{ padding: gerandoPDF ? '4px 2px' : '10px 5px', borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', textAlign: 'center', color: color, backgroundColor: bg, fontWeight: bold ? 'bold' : 'normal' }}>
                            {display}
                          </td>
                        );
                      })}
                      <td style={{ position: gerandoPDF ? 'static' : 'sticky', right: 0, zIndex: 1, backgroundColor: '#f8fafc', padding: gerandoPDF ? '4px 8px' : '10px', borderBottom: '1px solid #f1f5f9', borderLeft: '2px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold', color: '#10b981', fontSize: '1.1em' }}>
                        {countNotas > 0 ? (totalNotas / countNotas).toFixed(2) : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          
          <div style={{ padding: gerandoPDF ? '6px' : '15px', backgroundColor: '#f8fafc', borderTop: '2px solid #e2e8f0', fontSize: gerandoPDF ? '0.7em' : '0.85em', color: '#64748b', display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span><strong style={{ color: '#ef4444' }}>F</strong> = Falta (0 pts)</span>
            <span><strong style={{ color: '#3b82f6' }}>J</strong> = Justificada</span>
            <span><strong style={{ color: '#8b5cf6' }}>D</strong> = Doente</span>
            <span><strong style={{ color: '#f97316' }}>L</strong> = Lesionada</span>
            <span><strong style={{ color: '#64748b' }}>NC</strong> = Não Convocada</span>
            <span><strong style={{ color: '#64748b' }}>NA</strong> = Não Aplicável</span>
          </div>
        </div>
      </div>
    </div>
  );
}