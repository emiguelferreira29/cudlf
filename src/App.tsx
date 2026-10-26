import { useEffect, useState } from 'react';
import { supabase } from './supabase';

// Define a estrutura dos dados para o TypeScript
interface AtletaRelatorio {
  id: string;
  nome: string;
  posicao: string;
  total_presencas: number;
  media_geral: number | null;
}

export default function App() {
  const [relatorio, setRelatorio] = useState<AtletaRelatorio[]>([]);
  const [loading, setLoading] = useState(true);

  // Função para ir buscar os dados à View que criámos no SQL
  const fetchRelatorio = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('relatorio_atletas')
      .select('*');
      
    if (error) console.error("Erro a carregar dados:", error);
    else setRelatorio(data as AtletaRelatorio[]);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchRelatorio();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
        ⚽ Clube de Futebol Feminino - Avaliações
      </h1>

      <div style={{ marginTop: '30px' }}>
        <h2>🏆 Classificação Geral (Média)</h2>
        
        {loading ? (
          <p>A carregar classificações...</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', textAlign: 'left' }}>
                <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>#</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>Atleta</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>Posição</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>Presenças</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>Média Final</th>
              </tr>
            </thead>
            <tbody>
              {relatorio.map((atleta, index) => (
                <tr key={atleta.id}>
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>{index + 1}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>{atleta.nome}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>{atleta.posicao}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>{atleta.total_presencas}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee', color: '#e67e22', fontWeight: 'bold', fontSize: '1.1em' }}>
                    {atleta.media_geral ? atleta.media_geral : 'S/ Nota'}
                  </td>
                </tr>
              ))}
              {relatorio.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '20px', textAlign: 'center' }}>
                    Ainda não há atletas registadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}