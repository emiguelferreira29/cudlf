import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import type { Utilizador, Atleta } from '../types';

interface PainelAtletaProps {
  user: Utilizador;
}

export default function PainelAtleta({ user }: PainelAtletaProps) {
  const [atleta, setAtleta] = useState<Atleta | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [periodo, setPeriodo] = useState<'epoca' | 'mes' | 'semana'>('epoca');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (user.atleta_id) {
      carregarDadosAtleta(user.atleta_id);
    }
  }, [user.atleta_id]);

  const carregarDadosAtleta = async (atletaId: string) => {
    setCarregando(true);
    
    const { data: atletaData } = await supabase.from('atletas').select('*').eq('id', atletaId).single();
    if (atletaData) setAtleta(atletaData);

    const { data: avData } = await supabase
      .from('avaliacoes')
      .select('nota, motivo, eventos(id, data, tipo, adversario)')
      .eq('atleta_id', atletaId);

    if (avData) setAvaliacoes(avData);
    setCarregando(false);
  };

  const getWeekNumber = (d: Date) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  // Filtrar avaliações pelo período selecionado
  const avaliacoesFiltradas = avaliacoes.filter(av => {
    if (!av.eventos?.data) return false;
    if (periodo === 'epoca') return true;

    const d = new Date(av.eventos.data);
    const hoje = new Date();

    if (periodo === 'mes') {
      return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
    }
    if (periodo === 'semana') {
      return getWeekNumber(d) === getWeekNumber(hoje) && d.getFullYear() === hoje.getFullYear();
    }
    return true;
  });

  // Consolidar notas por evento (média única quando há 2 treinadores)
  const eventosMap = new Map<string, { evento: any; notas: number[]; motivos: string[] }>();
  avaliacoesFiltradas.forEach(av => {
    const ev = av.eventos;
    if (!eventosMap.has(ev.id)) {
      eventosMap.set(ev.id, { evento: ev, notas: [], motivos: [] });
    }
    const item = eventosMap.get(ev.id)!;
    if (av.nota !== null) {
      item.notas.push(parseFloat(av.nota));
    } else if (av.motivo) {
      item.motivos.push(av.motivo);
    }
  });

  const listaEventos = Array.from(eventosMap.values()).map(({ evento, notas, motivos }) => {
    let notaFinal: string | null = null;
    let motivoFinal: string | null = null;

    if (notas.length > 0) {
      notaFinal = (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1);
    } else if (motivos.length > 0) {
      motivoFinal = motivos[0];
    }

    return {
      id: evento.id,
      data: evento.data,
      tipo: evento.tipo,
      adversario: evento.adversario,
      notaFinal,
      motivoFinal
    };
  }).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  // Média Geral
  const avaliacoesValidasPeriodo = avaliacoesFiltradas.filter(av => av.nota !== null || av.motivo === 'Falta');
  const somaTotal = avaliacoesValidasPeriodo.reduce((sum, av) => sum + (av.nota !== null ? parseFloat(av.nota) : 0), 0);
  const mediaPeriodo = avaliacoesValidasPeriodo.length > 0 ? (somaTotal / avaliacoesValidasPeriodo.length).toFixed(2) : '-';

  // Dados cronológicos (do mais antigo para o mais recente) para desenhar o gráfico
  const dadosGrafico = [...listaEventos]
    .filter(e => e.notaFinal !== null)
    .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  // Configurações do gráfico SVG
  const chartWidth = 500;
  const chartHeight = 180;
  const paddingX = 45;
  const paddingY = 25;
  const graphW = chartWidth - paddingX * 2;
  const graphH = chartHeight - paddingY * 2;

  const coordenadasPontos = dadosGrafico.map((d, i) => {
    const x = dadosGrafico.length === 1 
      ? chartWidth / 2 
      : paddingX + (i / (dadosGrafico.length - 1)) * graphW;
    const nota = parseFloat(d.notaFinal!);
    // Mapeia nota 0-10 para o eixo Y invertido do SVG
    const y = paddingY + graphH - (nota / 10) * graphH;
    return { x, y, nota, data: d.data };
  });

  const caminhoLinha = coordenadasPontos.length > 1
    ? coordenadasPontos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : '';

  const caminhoArea = coordenadasPontos.length > 1
    ? `${caminhoLinha} L ${coordenadasPontos[coordenadasPontos.length - 1].x} ${chartHeight - paddingY} L ${coordenadasPontos[0].x} ${chartHeight - paddingY} Z`
    : '';

  if (carregando) {
    return <div style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>A carregar os teus dados...</div>;
  }

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* CARTÃO DE PERFIL E MÉDIA */}
      <div style={{ backgroundColor: 'white', padding: '25px 20px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', textAlign: 'center' }}>
        <div style={{ fontSize: '2em', marginBottom: '8px' }}>👤</div>
        <h2 style={{ color: '#0f172a', margin: '0 0 4px 0' }}>{atleta?.nome}</h2>
        <div style={{ color: '#64748b', fontSize: '0.9em', fontWeight: '500' }}>
          {atleta?.numero ? `Nº ${atleta.numero} • ` : ''}{atleta?.posicao}
        </div>

        {/* SELETOR DE PERÍODO */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
          {(['epoca', 'mes', 'semana'] as const).map(p => (
            <button 
              key={p}
              type="button" 
              onClick={() => setPeriodo(p)} 
              style={{ 
                padding: '6px 14px', 
                borderRadius: '20px', 
                border: 'none', 
                cursor: 'pointer', 
                fontSize: '0.85em', 
                fontWeight: '600', 
                backgroundColor: periodo === p ? '#0f172a' : '#f1f5f9', 
                color: periodo === p ? 'white' : '#475569' 
              }}
            >
              {p === 'epoca' ? 'Toda a Época' : (p === 'mes' ? 'Este Mês' : 'Esta Semana')}
            </button>
          ))}
        </div>

        {/* DESTAQUE DA MÉDIA */}
        <div style={{ marginTop: '20px', padding: '18px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.8em', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', fontWeight: 'bold' }}>
            A tua média {periodo === 'epoca' ? 'global' : (periodo === 'mes' ? 'deste mês' : 'desta semana')}
          </div>
          <div style={{ fontSize: '3.5em', fontWeight: 'bold', color: mediaPeriodo !== '-' ? '#10b981' : '#94a3b8', lineHeight: '1.2' }}>
            {mediaPeriodo}
          </div>
        </div>
      </div>

      {/* GRÁFICO EVOLUTIVO */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
        <h3 style={{ color: '#1e293b', fontSize: '1.05em', margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📈 Evolução das Notas
        </h3>

        {dadosGrafico.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9em' }}>
            Sem notas atribuídas neste período para desenhar o gráfico.
          </div>
        ) : dadosGrafico.length === 1 ? (
          <div style={{ padding: '25px', textAlign: 'center', color: '#64748b', fontSize: '0.9em', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            Apenas tens 1 pontuação ({dadosGrafico[0].notaFinal}) neste período. Adiciona mais eventos para veres a linha de evolução.
          </div>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: 'auto', display: 'block', minWidth: '320px' }}>
              <defs>
                <linearGradient id="degradeNota" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Linhas horizontais de referência (Notas 0, 5, 10) */}
              {[0, 5, 10].map(val => {
                const y = paddingY + graphH - (val / 10) * graphH;
                return (
                  <g key={val}>
                    <line x1={paddingX} y1={y} x2={chartWidth - paddingX} y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray={val === 5 ? '4 4' : undefined} />
                    <text x={paddingX - 10} y={y + 3} textAnchor="end" fontSize="10" fill="#94a3b8" fontWeight="bold">
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Área com gradiente suave por baixo da curva */}
              <path d={caminhoArea} fill="url(#degradeNota)" />

              {/* Linha principal de evolução */}
              <path d={caminhoLinha} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

              {/* Marcadores circulares e valores pontuais */}
              {coordenadasPontos.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r="5" fill="white" stroke="#10b981" strokeWidth="3" />
                  <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="11" fill="#0f172a" fontWeight="bold">
                    {p.nota.toFixed(1)}
                  </text>
                  <text x={p.x} y={chartHeight - 6} textAnchor="middle" fontSize="9" fill="#94a3b8">
                    {new Date(p.data).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        )}
      </div>

      {/* HISTÓRICO DE EVENTOS */}
      <div>
        <h3 style={{ color: '#1e293b', fontSize: '1.1em', margin: '0 0 15px 0' }}>Histórico de Eventos</h3>

        {listaEventos.length === 0 ? (
          <div style={{ backgroundColor: 'white', padding: '25px', textAlign: 'center', color: '#64748b', borderRadius: '8px' }}>
            Ainda não existem registos de notas para este período.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {listaEventos.map(ev => {
              const dataFormatada = new Date(ev.data).toLocaleDateString('pt-PT');
              const diaSemana = new Date(ev.data).toLocaleDateString('pt-PT', { weekday: 'long' }).split('-')[0];

              return (
                <div key={ev.id} style={{ backgroundColor: 'white', padding: '14px 16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '0.95em' }}>{dataFormatada}</div>
                    <div style={{ fontSize: '0.8em', color: '#64748b', textTransform: 'capitalize' }}>
                      {diaSemana} • <span style={{ color: ev.tipo.includes('Jogo') ? '#dc2626' : '#16a34a', fontWeight: '600' }}>{ev.tipo}</span>
                    </div>
                    {ev.adversario && <div style={{ fontSize: '0.8em', color: '#64748b', marginTop: '2px' }}>🆚 {ev.adversario}</div>}
                  </div>

                  <div>
                    {ev.notaFinal !== null ? (
                      <span style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#f59e0b', backgroundColor: '#fef3c7', padding: '6px 12px', borderRadius: '8px' }}>
                        {ev.notaFinal}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.8em', fontWeight: '600', color: ev.motivoFinal === 'Falta' ? '#ef4444' : '#64748b', backgroundColor: '#f1f5f9', padding: '6px 10px', borderRadius: '6px' }}>
                        {ev.motivoFinal || '-'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}