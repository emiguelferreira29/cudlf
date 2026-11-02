import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import type { Atleta } from '../types';

export default function Diplomas() {
  const [atletas, setAtletas] = useState<Atleta[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [opcoesMes, setOpcoesMes] = useState<string[]>([]);
  const [mesSelecionado, setMesSelecionado] = useState<string>('');
  const [gerandoPDF, setGerandoPDF] = useState(false);

  useEffect(() => { carregarDados(); }, []);

  const carregarDados = async () => {
    const { data: atlData } = await supabase.from('atletas').select('*').order('nome');
    const { data: evData } = await supabase.from('eventos').select('*').order('data', { ascending: true });
    const { data: avData } = await supabase.from('avaliacoes').select('*');

    if (atlData && evData && avData) {
      setAtletas(atlData);
      setEventos(evData);
      setAvaliacoes(avData);

      const mesesMap = new Map<string, string>();
      evData.forEach((ev: any) => {
        const d = new Date(ev.data);
        const yr = d.getFullYear();
        const mo = d.getMonth() + 1;
        const nomeMes = d.toLocaleString('pt-PT', { month: 'long' });
        mesesMap.set(`${yr}-${mo.toString().padStart(2, '0')}`, `${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)} ${yr}`);
      });

      const arrMeses = Array.from(mesesMap.entries()).sort((a, b) => b[0].localeCompare(a[0])).map(e => e[1]);
      setOpcoesMes(arrMeses);
      if (arrMeses.length > 0) setMesSelecionado(arrMeses[0]);
    }
  };

  // Encontrar atletas de mérito no mês selecionado
  const atletasMerito = atletas.map(a => {
    const eventosDoMes = eventos.filter(ev => {
      const d = new Date(ev.data);
      const nomeMes = d.toLocaleString('pt-PT', { month: 'long' });
      return `${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)} ${d.getFullYear()}` === mesSelecionado;
    });

    const avaliacoesNoFiltro = avaliacoes.filter(av => 
      av.atleta_id === a.id && 
      eventosDoMes.some(ef => ef.id === av.evento_id) &&
      (av.nota !== null || av.motivo === 'Falta')
    );

    const soma = avaliacoesNoFiltro.reduce((acc, av) => acc + (av.nota !== null ? parseFloat(av.nota) : 0), 0);
    const media = avaliacoesNoFiltro.length > 0 ? (soma / avaliacoesNoFiltro.length) : 0;

    return { ...a, media: parseFloat(media.toFixed(2)) };
  }).filter(a => a.media >= 7.0).sort((a, b) => b.media - a.media);

  const baixarDiplomas = () => {
    if (atletasMerito.length === 0) return alert('Nenhuma atleta atingiu a média 7.0 neste mês.');
    setGerandoPDF(true);
    
    setTimeout(() => {
      const elemento = document.getElementById('area-diplomas');
      if (!elemento) return;

      const opcoes = {
        margin:       0,
        filename:     `Diplomas_Merito_${mesSelecionado.replace(/ /g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 1 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };

      const executarDownload = () => {
        (window as any).html2pdf().set(opcoes).from(elemento).save().then(() => setGerandoPDF(false));
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
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      
      {!gerandoPDF && (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h2 style={{ margin: '0 0 5px 0', color: '#0f172a' }}>🎓 Diplomas de Mérito</h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9em' }}>Geração automática para médias ≥ 7.0</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select value={mesSelecionado} onChange={(e) => setMesSelecionado(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>
              {opcoesMes.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button onClick={baixarDiplomas} disabled={gerandoPDF || atletasMerito.length === 0} style={{ padding: '10px 15px', backgroundColor: '#eab308', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: (gerandoPDF || atletasMerito.length === 0) ? 'not-allowed' : 'pointer', opacity: atletasMerito.length === 0 ? 0.5 : 1 }}>
              {gerandoPDF ? 'A Gerar...' : 'Baixar Diplomas PDF'}
            </button>
          </div>
        </div>
      )}

      {!gerandoPDF && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#334155' }}>Atletas Elegíveis ({mesSelecionado}) - {atletasMerito.length}</h3>
          {atletasMerito.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>Nenhuma atleta com média superior a 7.0 neste mês.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {atletasMerito.map(a => (
                <div key={a.id} style={{ backgroundColor: '#fef9c3', border: '1px solid #fde047', padding: '10px 15px', borderRadius: '6px', color: '#854d0e', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', minWidth: '250px' }}>
                  <span>{a.nome}</span> <span>⭐ {a.media.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ÁREA DE IMPRESSÃO DOS DIPLOMAS (Escondida no ecrã normal se não estivermos a gerar) */}
      <div id="area-diplomas" style={{ position: gerandoPDF ? 'relative' : 'absolute', left: gerandoPDF ? 'auto' : '-9999px', top: 0 }}>
        {atletasMerito.map((atleta, index) => (
          <div key={atleta.id} style={{ width: '297mm', height: '210mm', backgroundColor: 'white', boxSizing: 'border-box', padding: '15mm', pageBreakAfter: index === atletasMerito.length - 1 ? 'auto' : 'always', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ border: '8px double #eab308', borderRadius: '15px', width: '100%', height: '100%', padding: '10mm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fafaf9' }}>
              
              <div style={{ textAlign: 'center' }}>
                <img src="/logor.png" alt="Logo" style={{ height: '120px', marginBottom: '15px' }} onError={(e) => e.currentTarget.style.display = 'none'} />
                <h1 style={{ margin: 0, fontSize: '2.5em', color: '#0f172a', textTransform: 'uppercase', fontFamily: 'serif' }}>Clube União Desportivo Leverense</h1>
                <h2 style={{ margin: '5px 0 0 0', fontSize: '1.5em', color: '#475569', fontWeight: 'normal', letterSpacing: '2px' }}>Sub-17 Feminino</h2>
              </div>

              <div style={{ textAlign: 'center', margin: '30px 0' }}>
                <div style={{ fontSize: '4em', color: '#eab308', margin: '0 0 10px 0' }}>🏆</div>
                <h1 style={{ fontSize: '3.5em', color: '#1e293b', margin: '0 0 20px 0', fontFamily: 'serif', fontStyle: 'italic' }}>Diploma de Mérito</h1>
                <p style={{ fontSize: '1.4em', color: '#334155', margin: '0 0 10px 0' }}>Certificamos que a atleta</p>
                <h2 style={{ fontSize: '2.5em', color: '#0f172a', margin: '15px 0', borderBottom: '2px solid #cbd5e1', paddingBottom: '10px', display: 'inline-block', minWidth: '60%' }}>
                  {atleta.nome_completo || atleta.nome}
                </h2>
                <p style={{ fontSize: '1.4em', color: '#334155', margin: '10px 0 0 0' }}>
                  destacou-se pelo seu excelente desempenho, obtendo a classificação média de <strong style={{ color: '#eab308', fontSize: '1.2em' }}>{atleta.media.toFixed(2)}</strong> no mês de <strong>{mesSelecionado}</strong>.
                </p>
              </div>

              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-around', marginTop: 'auto', paddingTop: '20px' }}>
                <div style={{ textAlign: 'center', width: '35%' }}>
                  <div style={{ borderBottom: '1px solid #475569', height: '30px', marginBottom: '10px' }}></div>
                  <div style={{ fontSize: '1.1em', color: '#475569', fontWeight: 'bold' }}>Equipa Técnica</div>
                </div>
                <div style={{ textAlign: 'center', width: '35%' }}>
                  <div style={{ borderBottom: '1px solid #475569', height: '30px', marginBottom: '10px' }}></div>
                  <div style={{ fontSize: '1.1em', color: '#475569', fontWeight: 'bold' }}>A Direção</div>
                </div>
              </div>
              
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}