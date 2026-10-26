import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import type { Utilizador, Atleta, Evento } from '../types';

interface AdminProps {
  nomeClube: string;
  onNomeClubeAtualizado: () => void;
}

const PESO_POSICAO: Record<string, number> = { 'Guarda-Redes': 1, 'Defesa': 2, 'Médio': 3, 'Avançada': 4 };

export default function Admin({ nomeClube, onNomeClubeAtualizado }: AdminProps) {
  const [inputNome, setInputNome] = useState(nomeClube);
  
  // Listas de Dados
  const [utilizadores, setUtilizadores] = useState<Utilizador[]>([]);
  const [atletas, setAtletas] = useState<Atleta[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);

  // Formulário User
  const [novoUserNome, setNovoUserNome] = useState('');
  const [novoUserUsername, setNovoUserUsername] = useState('');
  const [novoUserSenha, setNovoUserSenha] = useState('');
  const [novoUserPerfil, setNovoUserPerfil] = useState('treinador');

  // Formulário Atleta
  const [novoNumero, setNovoNumero] = useState('');
  const [novoNomeAtleta, setNovoNomeAtleta] = useState('');
  const [novaPosicao, setNovaPosicao] = useState('Guarda-Redes');
  const [editandoAtleta, setEditandoAtleta] = useState<string | null>(null);

  // Formulário Evento Individual
  const [novaData, setNovaData] = useState('');
  const [novoTipo, setNovoTipo] = useState('Treino');
  const [novoAdversario, setNovoAdversario] = useState('');
  const [editandoEvento, setEditandoEvento] = useState<string | null>(null);

  // Gerador Automático Mensal
  const [mesGerador, setMesGerador] = useState(new Date().getMonth() + 1);
  const [anoGerador, setAnoGerador] = useState(new Date().getFullYear());
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = () => {
    fetchUsers();
    fetchAtletas();
    fetchEventos();
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from('utilizadores').select('id, username, perfil, nome');
    if (data) setUtilizadores(data as Utilizador[]);
  };

  const fetchAtletas = async () => {
    const { data } = await supabase.from('atletas').select('*');
    if (data) {
      const ordenada = (data as Atleta[]).sort((a, b) => {
        const pesoA = PESO_POSICAO[a.posicao] ?? 99;
        const pesoB = PESO_POSICAO[b.posicao] ?? 99;
        if (pesoA !== pesoB) return pesoA - pesoB;
        return a.nome.localeCompare(b.nome, 'pt-PT');
      });
      setAtletas(ordenada);
    }
  };

  const fetchEventos = async () => {
    const { data } = await supabase.from('eventos').select('*').order('data', { ascending: false });
    if (data) setEventos(data as Evento[]);
  };

  // --- Lógica Utilizadores ---
  const adicionarUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('utilizadores').insert([{ username: novoUserUsername, senha: novoUserSenha, perfil: novoUserPerfil, nome: novoUserNome }]);
    if (!error) { setNovoUserNome(''); setNovoUserUsername(''); setNovoUserSenha(''); fetchUsers(); }
  };
  const removerUser = async (id: string) => {
    if (window.confirm('Eliminar utilizador permanentemente?')) { await supabase.from('utilizadores').delete().eq('id', id); fetchUsers(); }
  };
  const mudarSenha = async (id: string) => {
    const nova = window.prompt('Nova senha:');
    if (nova && nova.trim() !== '') { await supabase.from('utilizadores').update({ senha: nova }).eq('id', id); alert('Atualizada.'); }
  };
  const guardarClube = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('configuracoes').update({ valor: inputNome }).eq('chave', 'nome_clube');
    if (!error) { alert('Nome guardado!'); onNomeClubeAtualizado(); }
  };

  // --- Lógica Plantel ---
  const salvarAtleta = async (e: React.FormEvent) => {
    e.preventDefault();
    const dados = { numero: novoNumero ? parseInt(novoNumero) : null, nome: novoNomeAtleta, posicao: novaPosicao };
    if (editandoAtleta) await supabase.from('atletas').update(dados).eq('id', editandoAtleta);
    else await supabase.from('atletas').insert([dados]);
    setNovoNumero(''); setNovoNomeAtleta(''); setNovaPosicao('Guarda-Redes'); setEditandoAtleta(null); fetchAtletas();
  };
  const iniciarEdicaoAtleta = (a: Atleta) => {
    setEditandoAtleta(a.id); setNovoNumero(a.numero?.toString() || ''); setNovoNomeAtleta(a.nome); setNovaPosicao(a.posicao);
  };
  const removerAtleta = async (id: string) => {
    if (window.confirm('Apagar atleta e histórico de notas?')) { await supabase.from('atletas').delete().eq('id', id); fetchAtletas(); }
  };

  // --- Lógica Eventos (Individuais) ---
  const salvarEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novoTipo.includes('Jogo') && !novoAdversario.trim()) return alert('Indique o adversário.');
    const dados = { data: novaData, tipo: novoTipo, adversario: novoTipo.includes('Jogo') ? novoAdversario : null };
    if (editandoEvento) await supabase.from('eventos').update(dados).eq('id', editandoEvento);
    else await supabase.from('eventos').insert([dados]);
    setNovaData(''); setNovoAdversario(''); setNovoTipo('Treino'); setEditandoEvento(null); fetchEventos();
  };
  const iniciarEdicaoEvento = (ev: Evento) => {
    setEditandoEvento(ev.id); setNovaData(ev.data); setNovoTipo(ev.tipo); setNovoAdversario(ev.adversario || '');
  };
  const removerEvento = async (id: string) => {
    if (window.confirm('Apagar evento e avaliações associadas?')) { await supabase.from('eventos').delete().eq('id', id); fetchEventos(); }
  };

  // --- Lógica do Gerador Automático Mensal ---
  const gerarEventosMensais = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm(`Deseja gerar automaticamente os treinos (Seg, Ter, Qui) e jogos (Sáb) para o mês ${mesGerador}/${anoGerador}?`)) return;
    
    setGerando(true);
    const novosEventos = [];
    const diasNoMes = new Date(anoGerador, mesGerador, 0).getDate();

    for (let dia = 1; dia <= diasNoMes; dia++) {
      // Usar UTC para evitar problemas de fuso horário que alteram o dia da semana
      const dataAtual = new Date(Date.UTC(anoGerador, mesGerador - 1, dia));
      const diaSemana = dataAtual.getUTCDay(); // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
      
      const dataString = dataAtual.toISOString().split('T')[0];

      // Segunda(1), Terça(2) ou Quinta(4) = Treino
      if (diaSemana === 1 || diaSemana === 2 || diaSemana === 4) {
        novosEventos.push({ data: dataString, tipo: 'Treino', adversario: null });
      } 
      // Sábado(6) = Jogo (Oficial)
      else if (diaSemana === 6) {
        novosEventos.push({ data: dataString, tipo: 'Jogo (Oficial)', adversario: 'A Definir' });
      }
    }

    if (novosEventos.length > 0) {
      const { error } = await supabase.from('eventos').insert(novosEventos);
      if (!error) {
        alert(`${novosEventos.length} eventos criados com sucesso!`);
        fetchEventos();
      } else {
        alert('Erro ao guardar os eventos automáticos.');
      }
    }
    setGerando(false);
  };

  const inputStyle = { padding: '8px 10px', fontSize: '0.9em', border: '1px solid #cbd5e1', borderRadius: '4px', flex: '1 1 140px' };
  const btnAcao = { padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', border: 'none', fontSize: '0.85em' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      
      {/* 1. CLUBE */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ color: '#0f172a', margin: '0 0 15px 0' }}>⚙️ Definições do Clube</h3>
        <form onSubmit={guardarClube} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <input type="text" value={inputNome} onChange={(e) => setInputNome(e.target.value)} required style={inputStyle} />
          <button type="submit" style={{ padding: '8px 15px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Guardar Alterações</button>
        </form>
      </div>

      {/* 2. PLANTEL */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: editandoAtleta ? '2px solid #f59e0b' : 'none' }}>
        <h3 style={{ color: '#0f172a', margin: '0 0 15px 0' }}>👥 {editandoAtleta ? 'Editar Atleta' : 'Gestão de Plantel'}</h3>
        <form onSubmit={salvarAtleta} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
          <input type="number" placeholder="Nº" value={novoNumero} onChange={(e) => setNovoNumero(e.target.value)} style={{ ...inputStyle, flex: '0 1 70px' }} />
          <input type="text" placeholder="Nome da Atleta" value={novoNomeAtleta} onChange={(e) => setNovoNomeAtleta(e.target.value)} required style={inputStyle} />
          <select value={novaPosicao} onChange={(e) => setNovaPosicao(e.target.value)} style={inputStyle}>
            <option value="Guarda-Redes">Guarda-Redes</option>
            <option value="Defesa">Defesa</option>
            <option value="Médio">Médio</option>
            <option value="Avançada">Avançada</option>
          </select>
          <button type="submit" style={{ padding: '8px 15px', backgroundColor: editandoAtleta ? '#f59e0b' : '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{editandoAtleta ? 'Atualizar' : 'Adicionar Atleta'}</button>
          {editandoAtleta && <button type="button" onClick={() => {setEditandoAtleta(null); setNovoNumero(''); setNovoNomeAtleta('');}} style={{ padding: '8px 15px', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>}
        </form>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9em' }}>
            <thead>
              <tr>
                <th style={{ padding: '8px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Nº</th>
                <th style={{ padding: '8px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Nome</th>
                <th style={{ padding: '8px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Posição</th>
                <th style={{ padding: '8px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {atletas.map(a => (
                <tr key={a.id}>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>{a.numero || '-'}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', fontWeight: '500' }}>{a.nome}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>{a.posicao}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '5px' }}>
                    <button onClick={() => iniciarEdicaoAtleta(a)} style={{ ...btnAcao, backgroundColor: '#fef3c7', color: '#d97706' }}>Editar</button>
                    <button onClick={() => removerAtleta(a.id)} style={{ ...btnAcao, backgroundColor: '#fee2e2', color: '#ef4444' }}>Remover</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. EVENTOS */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: editandoEvento ? '2px solid #3b82f6' : 'none' }}>
        <h3 style={{ color: '#0f172a', margin: '0 0 15px 0' }}>📅 {editandoEvento ? 'Editar Evento' : 'Gestão de Eventos'}</h3>
        
        {/* Formulário Individual */}
        <form onSubmit={salvarEvento} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} required style={inputStyle} />
          <select value={novoTipo} onChange={(e) => setNovoTipo(e.target.value)} style={inputStyle}>
            <option>Treino</option>
            <option>Jogo (Oficial)</option>
            <option>Jogo (Treino)</option>
          </select>
          {novoTipo.includes('Jogo') && <input type="text" placeholder="Adversário" value={novoAdversario} onChange={(e) => setNovoAdversario(e.target.value)} required style={inputStyle} />}
          <button type="submit" style={{ padding: '8px 15px', backgroundColor: editandoEvento ? '#f59e0b' : '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{editandoEvento ? 'Atualizar' : 'Criar Evento Único'}</button>
          {editandoEvento && <button type="button" onClick={() => {setEditandoEvento(null); setNovaData(''); setNovoAdversario('');}} style={{ padding: '8px 15px', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>}
        </form>

        {/* Bloco de Geração Automática */}
        {!editandoEvento && (
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
            <h4 style={{ color: '#0f172a', margin: '0 0 5px 0' }}>⚡ Gerador de Calendário Mensal</h4>
            <p style={{ fontSize: '0.85em', color: '#64748b', margin: '0 0 15px 0' }}>Cria automaticamente Treinos à Seg, Ter e Qui, e Jogos ao Sáb.</p>
            <form onSubmit={gerarEventosMensais} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
              <select value={mesGerador} onChange={(e) => setMesGerador(Number(e.target.value))} style={inputStyle}>
                <option value={1}>Janeiro</option><option value={2}>Fevereiro</option><option value={3}>Março</option>
                <option value={4}>Abril</option><option value={5}>Maio</option><option value={6}>Junho</option>
                <option value={7}>Julho</option><option value={8}>Agosto</option><option value={9}>Setembro</option>
                <option value={10}>Outubro</option><option value={11}>Novembro</option><option value={12}>Dezembro</option>
              </select>
              <input type="number" min="2024" max="2030" value={anoGerador} onChange={(e) => setAnoGerador(Number(e.target.value))} style={{ ...inputStyle, flex: '0 1 100px' }} />
              <button type="submit" disabled={gerando} style={{ padding: '8px 15px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '4px', cursor: gerando ? 'not-allowed' : 'pointer' }}>
                {gerando ? 'A Gerar...' : 'Gerar Mês Completo'}
              </button>
            </form>
          </div>
        )}

        <div style={{ overflowX: 'auto', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9em' }}>
            <thead>
              <tr>
                <th style={{ padding: '8px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Data</th>
                <th style={{ padding: '8px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Tipo / Adversário</th>
                <th style={{ padding: '8px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map(ev => (
                <tr key={ev.id}>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', fontWeight: 'bold' }}>{new Date(ev.data).toLocaleDateString('pt-PT')}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>
                    <span style={{ color: ev.tipo.includes('Jogo') ? '#ef4444' : '#10b981', fontWeight: '500' }}>{ev.tipo}</span> 
                    {ev.adversario && ` 🆚 ${ev.adversario}`}
                  </td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '5px' }}>
                    <button onClick={() => iniciarEdicaoEvento(ev)} style={{ ...btnAcao, backgroundColor: '#fef3c7', color: '#d97706' }}>Editar</button>
                    <button onClick={() => removerEvento(ev.id)} style={{ ...btnAcao, backgroundColor: '#fee2e2', color: '#ef4444' }}>Remover</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. UTILIZADORES */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ color: '#0f172a', margin: '0 0 15px 0' }}>🔒 Gestão de Utilizadores</h3>
        <form onSubmit={adicionarUser} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
          <input type="text" placeholder="Nome Completo" value={novoUserNome} onChange={(e) => setNovoUserNome(e.target.value)} required style={inputStyle} />
          <input type="text" placeholder="Username" value={novoUserUsername} onChange={(e) => setNovoUserUsername(e.target.value)} required style={inputStyle} />
          <input type="password" placeholder="Senha" value={novoUserSenha} onChange={(e) => setNovoUserSenha(e.target.value)} required style={inputStyle} />
          <select value={novoUserPerfil} onChange={(e) => setNovoUserPerfil(e.target.value)} style={inputStyle}>
            <option value="treinador">Treinador</option><option value="admin">Administrador</option>
          </select>
          <button type="submit" style={{ padding: '8px 15px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', flex: '1 1 100%' }}>Adicionar Utilizador</button>
        </form>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9em' }}>
            <thead>
              <tr>
                <th style={{ padding: '8px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Nome</th>
                <th style={{ padding: '8px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Username</th>
                <th style={{ padding: '8px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {utilizadores.map(u => (
                <tr key={u.id}>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{u.nome} <span style={{ fontSize: '0.8em', color: '#94a3b8' }}>({u.perfil})</span></td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>{u.username}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '5px' }}>
                    <button onClick={() => mudarSenha(u.id)} style={{ ...btnAcao, backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1' }}>Senha</button>
                    <button onClick={() => removerUser(u.id)} style={{ ...btnAcao, backgroundColor: '#fee2e2', color: '#ef4444' }}>Remover</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}