import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import type { Atleta, AtletaRelatorio, Evento, Utilizador } from '../types';

interface DashboardProps {
  user: Utilizador;
  onSelecionarEvento: (ev: Evento) => void;
  onAtualizarAtletas: (atletas: Atleta[]) => void;
}

const PESO_POSICAO: Record<string, number> = { 'Guarda-Redes': 1, 'Defesa': 2, 'Médio': 3, 'Avançada': 4 };

export default function Dashboard({ user, onSelecionarEvento, onAtualizarAtletas }: DashboardProps) {
  const [relatorio, setRelatorio] = useState<AtletaRelatorio[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);

  useEffect(() => {
    carregarTudo();
  }, []);

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
    const { data } = await supabase.from('eventos').select('*').order('data', { ascending: false });
    if (data) setEventos(data as Evento[]);
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

  const agruparEventosPorSemana = () => {
    const grupos = new Map<string, Evento[]>();
    eventos.forEach(evento => {
      const d = new Date(evento.data);
      const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const dayNum = date.getUTCDay() || 7;
      date.setUTCDate(date.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      const chave = `Semana ${weekNo} (${date.getUTCFullYear()})`;
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave)!.push(evento);
    });
    grupos.forEach(lista => lista.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()));
    return Array.from(grupos.entries());
  };

  const relatorioOrdenado = [...relatorio].sort((a, b) => {
    const pesoA = PESO_POSICAO[a.posicao] ?? 99;
    const pesoB = PESO_POSICAO[b.posicao] ?? 99;
    if (pesoA !== pesoB) return pesoA - pesoB;
    return a.nome.localeCompare(b.nome, 'pt-PT');
  });

  return (
    <>
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', margin: '0 0 20px 0', fontSize: '1.4em', textAlign: 'center' }}>📅 Calendário</h2>
        {eventos.length === 0 ? <p style={{ textAlign: 'center', color: '#64748b' }}>Sem eventos registados.</p> : agruparEventosPorSemana().map(([semana, lista]) => (
          <div key={semana} style={{ marginBottom: '25px' }}>
            <h4 style={{ color: '#475569', fontSize: '1em', borderBottom: '1px solid #cbd5e1', paddingBottom: '5px', marginBottom: '15px', textAlign: 'center' }}>{semana}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' }}>
              {lista.map(ev => (
                <div key={ev.id} style={{ backgroundColor: 'white', borderLeft: `4px solid ${ev.tipo.includes('Jogo') ? '#ef4444' : '#10b981'}`, padding: '15px', borderRadius: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '1.05em' }}>{new Date(ev.data).toLocaleDateString('pt-PT')}</div>
                    <div style={{ color: ev.tipo.includes('Jogo') ? '#ef4444' : '#10b981', fontSize: '0.9em', fontWeight: 'bold', marginTop: '6px' }}>{ev.tipo}</div>
                    {ev.adversario && <div style={{ fontSize: '0.85em', color: '#64748b', marginTop: '6px' }}>🆚 {ev.adversario}</div>}
                  </div>
                  <button type="button" onClick={() => onSelecionarEvento(ev)} style={{ width: '100%', marginTop: '15px', padding: '8px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}>Ver Notas</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div>
        <h2 style={{ color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', margin: '0 0 15px 0', fontSize: '1.4em', textAlign: 'center' }}>🏆 Classificação Geral</h2>
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                <th style={{ padding: '12px 15px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>Nº</th>
                <th style={{ padding: '12px 15px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>Atleta</th>
                <th style={{ padding: '12px 15px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>Posição</th>
                <th style={{ padding: '12px 15px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>Média Geral</th>
              </tr>
            </thead>
            <tbody>
              {relatorioOrdenado.map(atleta => (
                <tr key={atleta.id}>
                  <td style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>{atleta.numero || '-'}</td>
                  <td style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', fontWeight: '500', color: '#1e293b', whiteSpace: 'nowrap' }}>{atleta.nome}</td>
                  <td style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>{atleta.posicao}</td>
                  <td style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', fontWeight: 'bold', color: '#f59e0b' }}>{atleta.media_geral || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}