import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import type { Utilizador, Atleta } from '../types';

interface PainelAtletaProps {
  user: Utilizador;
}

export default function PainelAtleta({ user }: PainelAtletaProps) {
  const [atleta, setAtleta] = useState<Atleta | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  
  const [filtroTipo, setFiltroTipo] = useState<'epoca' | 'mes' | 'semana'>('mes');
  const [filtroValor, setFiltroValor] = useState<string>('');
  const [opcoesSemana, setOpcoesSemana] = useState<string[]>([]);
  const [opcoesMes, setOpcoesMes] = useState<string[]>([]);

  useEffect(() => {
    if (user.atleta_id) carregarDados(user.atleta_id);
  }, [user.atleta_id]);

  useEffect(() => {
    if (filtroTipo === 'semana' && opcoesSemana.length > 0 && !opcoesSemana.includes(filtroValor)) setFiltroValor(opcoesSemana[0]);
    else if (filtroTipo === 'mes' && opcoesMes.length > 0 && !opcoesMes.includes(filtroValor)) setFiltroValor(opcoesMes[0]);
  }, [filtroTipo, opcoesSemana, opcoesMes]);

  const carregarDados = async (atletaId: string) => {
    const { data: atlData } = await supabase.from('atletas').select('*').eq('id', atletaId).single();
    if (atlData) setAtleta(atlData as Atleta);

    const { data: evData } = await supabase.from('eventos').select('*').order('data', { ascending: true });
    const { data: avData } = await supabase.from('avaliacoes').select('*').eq('atleta_id', atletaId);

    if (evData && avData) {
      // FILTRO CRUCIAL: Apenas eventos que já foram fechados pelo Admin
      const eventosFechados = evData.filter((ev: any) => ev.fechado === true);
      
      setEventos(eventosFechados);
      setAvaliacoes(avData);

      const semanasMap = new Map<string, string>();
      const mesesMap = new Map<string, string>();

      eventosFechados.forEach((ev: any) => {
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

  if (!atleta) {
    return <div style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>A carregar perfil da atleta...</div>;
  }

  const eventosFiltrados = eventos.filter(ev => {
    if (filtroTipo === 'epoca') return true;
    const d = new Date(ev.data);
    if (filtroTipo === 'semana') return `Semana ${getWeekNumber(d)} (${d.getFullYear()})` === filtroValor;
    if (filtroTipo === 'mes') {
      const nomeMes = d.toLocaleString('pt-PT', { month: 'long' });
      return `${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)} ${d.getFullYear()}` === filtroValor;
    }
    return false;
  });

  let somaMediasDiarias = 0;
  let diasComNota = 0;

  const historico = eventosFiltrados.map(ev => {
    const avs = avaliacoes.filter(av => av.evento_id === ev.id);
    const avsValidas = avs.filter(av => av.nota !== null || av.motivo === 'Falta');
    
    let display = '-';
    let valNumerico = null;
    let cor = '#94a3b8';

    if (avsValidas.length > 0) {
      if (avsValidas.every(av => av.motivo === 'Falta')) {
        display = 'Falta (0)';
        valNumerico = 0;
        cor = '#ef4444';
        
        somaMediasDiarias += 0;
        diasComNota++;
      } else {
        const soma = avsValidas.reduce((a, b) => a + (b.nota !== null ? parseFloat(b.nota) : 0), 0);
        const mediaReal = soma / avsValidas.length;
        
        display = mediaReal.toFixed(1);
        valNumerico = parseFloat(display);
        cor = '#10b981';
        
        somaMediasDiarias += valNumerico;
        diasComNota++;
      }
    } else if (avs.length > 0 && avs[0].motivo) {
      display = avs[0].motivo;
      if (display === 'Justificada') { cor = '#3b82f6'; }
      else if (display === 'Doente') { cor = '#8b5cf6'; }
      else if (display === 'Lesionada') { cor = '#f97316'; }
    }

    return { ...ev, display, valNumerico, cor };
  }).filter(ev => ev.display !== '-');

  const mediaGlobal = diasComNota > 0 ? (somaMediasDiarias / diasComNota).toFixed(2) : '-';
  const chartData = historico.filter(h => h.valNumerico !== null);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '40px' }}>
      
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '30px 20px', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', marginBottom: '25px' }}>
        {atleta.foto_url ? (
          <img src={atleta.foto_url} alt={atleta.nome} style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #f1f5f9', margin: '0 auto 15px auto', display: 'block' }} />
        ) : (
          <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', border: '4px solid #e2e8f0', margin: '0 auto 15px auto' }}>👤</div>
        )}
        <h1 style={{ margin: '0 0 5px 0', color: '#0f172a', fontSize: '1.8em' }}>{atleta.nome}</h1>
        <p style={{ margin: '0', color: '#64748b', fontSize: '1em', fontWeight: '500' }}>Nº {atleta.numero || '-'} • {atleta.posicao}</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '25px', flexWrap: 'wrap' }}>
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as any)} style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1em', fontWeight: '600', color: '#1e293b', cursor: 'pointer', backgroundColor: 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <option value="epoca">Toda a Época</option>
          <option value="mes">Por Mês</option>
          <option value="semana">Por Semana</option>
        </select>

        {filtroTipo === 'semana' && opcoesSemana.length > 0 && (
          <select value={filtroValor} onChange={(e) => setFiltroValor(e.target.value)} style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1em', fontWeight: '600', color: '#1e293b', cursor: 'pointer', backgroundColor: 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            {opcoesSemana.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}

        {filtroTipo === 'mes' && opcoesMes.length > 0 && (
          <select value={filtroValor} onChange={(e) => setFiltroValor(e.target.value)} style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1em', fontWeight: '600', color: '#1e293b', cursor: 'pointer', backgroundColor: 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            {opcoesMes.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '25px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '25px', borderTop: '4px solid #3b82f6' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#475569', fontSize: '1em', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          A TUA MÉDIA {filtroTipo === 'epoca' ? 'DA ÉPOCA' : (filtroTipo === 'mes' ? 'DESTE MÊS' : 'DESTA SEMANA')}
        </h3>
        <div style={{ fontSize: '3.5em', fontWeight: 'bold', color: mediaGlobal === '-' ? '#94a3b8' : '#0f172a', lineHeight: '1' }}>
          {mediaGlobal}
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '25px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '25px' }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#0f172a', fontSize: '1.2em', display: 'flex', alignItems: 'center', gap: '8px' }}>📈 Evolução das Notas</h3>
        
        {chartData.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0' }}>Sem notas numéricas para desenhar o gráfico.</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '160px', overflowX: 'auto', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
            {chartData.map((d, idx) => {
              const altura = d.valNumerico === 0 ? 5 : (d.valNumerico / 10) * 100;
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '45px', flex: '1', height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '0.8em', fontWeight: 'bold', color: d.cor, marginBottom: '4px' }}>{d.valNumerico.toFixed(1)}</span>
                  <div style={{ width: '100%', height: `${altura}%`, backgroundColor: d.valNumerico === 0 ? '#ef4444' : '#3b82f6', borderRadius: '4px 4px 0 0', transition: 'height 0.3s ease' }}></div>
                  <span style={{ fontSize: '0.7em', color: '#64748b', marginTop: '6px', whiteSpace: 'nowrap' }}>{new Date(d.data).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <h3 style={{ margin: '0 0 15px 0', color: '#0f172a', fontSize: '1.2em' }}>Histórico de Eventos</h3>
      {historico.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '30px', textAlign: 'center', color: '#94a3b8', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          Ainda não existem registos no teu histórico para este período.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {historico.reverse().map(ev => (
            <div key={ev.id} style={{ backgroundColor: 'white', borderRadius: '10px', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: `4px solid ${ev.cor}` }}>
              <div>
                <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '1.05em' }}>{new Date(ev.data).toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long' })}</div>
                <div style={{ fontSize: '0.85em', color: '#64748b', marginTop: '2px' }}>{ev.tipo} {ev.adversario ? ` 🆚 ${ev.adversario}` : ''}</div>
              </div>
              <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: ev.cor, backgroundColor: '#f8fafc', padding: '8px 15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                {ev.display}
              </div>
            </div>
          ))}
        </div>
      )}
      
    </div>
  );
}