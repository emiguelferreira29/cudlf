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
  const [utilizadores, setUtilizadores] = useState<Utilizador[]>([]);
  const [atletas, setAtletas] = useState<Atleta[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);

  // Modal de Acesso para Atleta
  const [atletaAcesso, setAtletaAcesso] = useState<Atleta | null>(null);
  const [loginAtletaUsername, setLoginAtletaUsername] = useState('');
  const [loginAtletaSenha, setLoginAtletaSenha] = useState('');

  // Formulários Utilizadores
  const [novoUserNome, setNovoUserNome] = useState('');
  const [novoUserUsername, setNovoUserUsername] = useState('');
  const [novoUserSenha, setNovoUserSenha] = useState('');
  const [novoUserPerfil, setNovoUserPerfil] = useState('treinador');
  const [novoUserAcesso, setNovoUserAcesso] = useState(true);

  // Formulários Atletas
  const [novoNumero, setNovoNumero] = useState('');
  const [novoNomeAtleta, setNovoNomeAtleta] = useState('');
  const [novaPosicao, setNovaPosicao] = useState('Guarda-Redes');
  const [novaFoto, setNovaFoto] = useState(''); // NOVO CAMPO DE FOTO
  const [editandoAtleta, setEditandoAtleta] = useState<string | null>(null);

  // Formulários Eventos
  const [novaData, setNovaData] = useState('');
  const [novoTipo, setNovoTipo] = useState('Treino');
  const [novoAdversario, setNovoAdversario] = useState('');
  const [editandoEvento, setEditandoEvento] = useState<string | null>(null);

  const [mesGerador, setMesGerador] = useState(new Date().getMonth() + 1);
  const [anoGerador, setAnoGerador] = useState(new Date().getFullYear());
  const [gerando, setGerando] = useState(false);

  useEffect(() => { carregarDados(); }, []);

  const carregarDados = () => { fetchUsers(); fetchAtletas(); fetchEventos(); };

  const fetchUsers = async () => {
    const { data } = await supabase.from('utilizadores').select('id, username, perfil, nome, acesso_relatorios, atleta_id');
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

  const abrirModalAcesso = (a: Atleta) => {
    setAtletaAcesso(a);
    const userExistente = utilizadores.find(u => u.atleta_id === a.id);
    if (userExistente) {
      setLoginAtletaUsername(userExistente.username);
    } else {
      setLoginAtletaUsername(a.nome.toLowerCase().split(' ')[0] + (a.numero ? a.numero : ''));
    }
    setLoginAtletaSenha('');
  };

  const guardarAcessoAtleta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!atletaAcesso) return;

    const userExistente = utilizadores.find(u => u.atleta_id === atletaAcesso.id);
    const usernameFinal = loginAtletaUsername.trim().toLowerCase();
    const senhaFinal = loginAtletaSenha.trim();

    if (userExistente) {
      const updateData: any = { username: usernameFinal };
      if (senhaFinal) updateData.senha = senhaFinal;
      const { error } = await supabase.from('utilizadores').update(updateData).eq('id', userExistente.id);
      if (error) return alert('Erro ao atualizar: ' + error.message);
      alert('Credenciais da atleta atualizadas com sucesso!');
    } else {
      if (!senhaFinal) return alert('Insira uma palavra-passe inicial.');
      const { error } = await supabase.from('utilizadores').insert([{ username: usernameFinal, senha: senhaFinal, perfil: 'atleta', nome: atletaAcesso.nome, atleta_id: atletaAcesso.id, acesso_relatorios: false }]);
      if (error) return alert('Erro ao criar conta: ' + error.message);
      alert('Acesso criado com sucesso para a atleta!');
    }
    setAtletaAcesso(null);
    fetchUsers();
  };

  const adicionarUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('utilizadores').insert([{ username: novoUserUsername, senha: novoUserSenha, perfil: novoUserPerfil, nome: novoUserNome, acesso_relatorios: novoUserAcesso }]);
    if (!error) { setNovoUserNome(''); setNovoUserUsername(''); setNovoUserSenha(''); fetchUsers(); }
  };
  const removerUser = async (id: string) => { if (window.confirm('Eliminar utilizador permanentemente?')) { await supabase.from('utilizadores').delete().eq('id', id); fetchUsers(); } };
  const mudarSenha = async (id: string) => { const nova = window.prompt('Nova senha:'); if (nova && nova.trim() !== '') { await supabase.from('utilizadores').update({ senha: nova }).eq('id', id); alert('Atualizada.'); } };
  const alternarAcessoRelatorio = async (id: string, estadoAtual: boolean) => { await supabase.from('utilizadores').update({ acesso_relatorios: !estadoAtual }).eq('id', id); fetchUsers(); };
  const guardarClube = async (e: React.FormEvent) => { e.preventDefault(); const { error } = await supabase.from('configuracoes').update({ valor: inputNome }).eq('chave', 'nome_clube'); if (!error) { alert('Nome guardado!'); onNomeClubeAtualizado(); } };

  // --- Lógica Plantel (com foto) ---
  const salvarAtleta = async (e: React.FormEvent) => {
    e.preventDefault();
    const dados = { numero: novoNumero ? parseInt(novoNumero) : null, nome: novoNomeAtleta, posicao: novaPosicao, foto_url: novaFoto };
    if (editandoAtleta) await supabase.from('atletas').update(dados).eq('id', editandoAtleta);
    else await supabase.from('atletas').insert([dados]);
    setNovoNumero(''); setNovoNomeAtleta(''); setNovaPosicao('Guarda-Redes'); setNovaFoto(''); setEditandoAtleta(null); fetchAtletas();
  };
  const iniciarEdicaoAtleta = (a: Atleta) => { setEditandoAtleta(a.id); setNovoNumero(a.numero?.toString() || ''); setNovoNomeAtleta(a.nome); setNovaPosicao(a.posicao); setNovaFoto(a.foto_url || ''); };
  const removerAtleta = async (id: string) => { if (window.confirm('Apagar atleta?')) { await supabase.from('atletas').delete().eq('id', id); fetchAtletas(); } };

  const salvarEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novoTipo.includes('Jogo') && !novoAdversario.trim()) return alert('Indique o adversário.');
    const dados = { data: novaData, tipo: novoTipo, adversario: novoTipo.includes('Jogo') ? novoAdversario : null };
    if (editandoEvento) await supabase.from('eventos').update(dados).eq('id', editandoEvento);
    else await supabase.from('eventos').insert([dados]);
    setNovaData(''); setNovoAdversario(''); setNovoTipo('Treino'); setEditandoEvento(null); fetchEventos();
  };
  const iniciarEdicaoEvento = (ev: Evento) => { setEditandoEvento(ev.id); setNovaData(ev.data); setNovoTipo(ev.tipo); setNovoAdversario(ev.adversario || ''); };
  const removerEvento = async (id: string) => { if (window.confirm('Apagar evento?')) { await supabase.from('eventos').delete().eq('id', id); fetchEventos(); } };

  const gerarEventosMensais = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm(`Gerar eventos para ${mesGerador}/${anoGerador}?`)) return;
    setGerando(true);
    const novosEventos = [];
    const diasNoMes = new Date(anoGerador, mesGerador, 0).getDate();
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const dataAtual = new Date(Date.UTC(anoGerador, mesGerador - 1, dia));
      const diaSemana = dataAtual.getUTCDay();
      const dataString = dataAtual.toISOString().split('T')[0];
      if (diaSemana === 1 || diaSemana === 2 || diaSemana === 4) novosEventos.push({ data: dataString, tipo: 'Treino', adversario: null });
      else if (diaSemana === 6) novosEventos.push({ data: dataString, tipo: 'Jogo (Oficial)', adversario: 'A Definir' });
    }
    if (novosEventos.length > 0) { await supabase.from('eventos').insert(novosEventos); alert('Criados!'); fetchEventos(); }
    setGerando(false);
  };

  const inputStyle = { padding: '8px 10px', fontSize: '0.9em', border: '1px solid #cbd5e1', borderRadius: '4px', flex: '1 1 140px' };
  const btnAcao = { padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', border: 'none', fontSize: '0.85em' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      
      {atletaAcesso && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '10px', maxWidth: '400px', width: '100%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>🔑 Acesso de Atleta</h3>
            <p style={{ color: '#64748b', fontSize: '0.9em', margin: '0 0 15px 0' }}>
              Defina as credenciais para <strong>{atletaAcesso.nome}</strong> aceder à sua pontuação individual.
            </p>
            <form onSubmit={guardarAcessoAtleta} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8em', color: '#475569', fontWeight: 'bold' }}>Username de Login:</label>
                <input type="text" value={loginAtletaUsername} onChange={(e) => setLoginAtletaUsername(e.target.value.toLowerCase().trim())} required style={{ ...inputStyle, width: '100%', marginTop: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8em', color: '#475569', fontWeight: 'bold' }}>Palavra-passe:</label>
                <input type="text" placeholder="Nova senha..." value={loginAtletaSenha} onChange={(e) => setLoginAtletaSenha(e.target.value)} style={{ ...inputStyle, width: '100%', marginTop: '4px' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setAtletaAcesso(null)} style={{ flex: '1', padding: '10px', backgroundColor: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Cancelar</button>
                <button type="submit" style={{ flex: '1', padding: '10px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Guardar Acesso</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ color: '#0f172a', margin: '0 0 15px 0' }}>⚙️ Definições do Clube</h3>
        <form onSubmit={guardarClube} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <input type="text" value={inputNome} onChange={(e) => setInputNome(e.target.value)} required style={inputStyle} />
          <button type="submit" style={{ padding: '8px 15px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Guardar Alterações</button>
        </form>
      </div>

      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: editandoAtleta ? '2px solid #f59e0b' : 'none' }}>
        <h3 style={{ color: '#0f172a', margin: '0 0 15px 0' }}>👥 {editandoAtleta ? 'Editar Atleta' : 'Gestão de Plantel'}</h3>
        <form onSubmit={salvarAtleta} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
          <input type="number" placeholder="Nº" value={novoNumero} onChange={(e) => setNovoNumero(e.target.value)} style={{ ...inputStyle, flex: '0 1 70px' }} />
          <input type="text" placeholder="Nome da Atleta" value={novoNomeAtleta} onChange={(e) => setNovoNomeAtleta(e.target.value)} required style={inputStyle} />
          <select value={novaPosicao} onChange={(e) => setNovaPosicao(e.target.value)} style={inputStyle}>
            <option value="Guarda-Redes">Guarda-Redes</option><option value="Defesa">Defesa</option>
            <option value="Médio">Médio</option><option value="Avançada">Avançada</option>
          </select>
          <input type="url" placeholder="URL da Fotografia (Opcional)" value={novaFoto} onChange={(e) => setNovaFoto(e.target.value)} style={{ ...inputStyle, flex: '1 1 200px' }} />
          <button type="submit" style={{ padding: '8px 15px', backgroundColor: editandoAtleta ? '#f59e0b' : '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{editandoAtleta ? 'Atualizar' : 'Adicionar Atleta'}</button>
          {editandoAtleta && <button type="button" onClick={() => {setEditandoAtleta(null); setNovoNumero(''); setNovoNomeAtleta(''); setNovaFoto('');}} style={{ padding: '8px 15px', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>}
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
              {atletas.map(a => {
                const temLogin = utilizadores.some(u => u.atleta_id === a.id);
                return (
                  <tr key={a.id}>
                    <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>{a.numero || '-'}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', fontWeight: '500' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {a.foto_url ? <img src={a.foto_url} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} onError={(e) => e.currentTarget.style.display = 'none'} /> : null}
                        {a.nome} {temLogin && <span title="Tem login criado" style={{ fontSize: '0.85em' }}>📱</span>}
                      </div>
                    </td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>{a.posicao}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '5px' }}>
                      <button type="button" onClick={() => abrirModalAcesso(a)} style={{ ...btnAcao, backgroundColor: temLogin ? '#dbeafe' : '#f1f5f9', color: temLogin ? '#1d4ed8' : '#475569', fontWeight: '600' }} title="Definir Password de Acesso">🔑 Acesso</button>
                      <button onClick={() => iniciarEdicaoAtleta(a)} style={{ ...btnAcao, backgroundColor: '#fef3c7', color: '#d97706' }}>Editar</button>
                      <button onClick={() => removerAtleta(a.id)} style={{ ...btnAcao, backgroundColor: '#fee2e2', color: '#ef4444' }}>Remover</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* EVENTOS (Igual) */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: editandoEvento ? '2px solid #3b82f6' : 'none' }}>
        <h3 style={{ color: '#0f172a', margin: '0 0 15px 0' }}>📅 {editandoEvento ? 'Editar Evento' : 'Gestão de Eventos'}</h3>
        <form onSubmit={salvarEvento} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} required style={inputStyle} />
          <select value={novoTipo} onChange={(e) => setNovoTipo(e.target.value)} style={inputStyle}>
            <option>Treino</option><option>Jogo (Oficial)</option><option>Jogo (Treino)</option>
          </select>
          {novoTipo.includes('Jogo') && <input type="text" placeholder="Adversário" value={novoAdversario} onChange={(e) => setNovoAdversario(e.target.value)} required style={inputStyle} />}
          <button type="submit" style={{ padding: '8px 15px', backgroundColor: editandoEvento ? '#f59e0b' : '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{editandoEvento ? 'Atualizar' : 'Criar Evento Único'}</button>
          {editandoEvento && <button type="button" onClick={() => {setEditandoEvento(null); setNovaData(''); setNovoAdversario('');}} style={{ padding: '8px 15px', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>}
        </form>

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
                {gerando ? 'A Gerar...' : 'Gerar Mês'}
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
                  <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}><span style={{ color: ev.tipo.includes('Jogo') ? '#ef4444' : '#10b981', fontWeight: '500' }}>{ev.tipo}</span> {ev.adversario && ` 🆚 ${ev.adversario}`}</td>
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

      {/* UTILIZADORES (Igual) */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ color: '#0f172a', margin: '0 0 15px 0' }}>🔒 Equipa Técnica e Direção</h3>
        <form onSubmit={adicionarUser} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
          <input type="text" placeholder="Nome Completo" value={novoUserNome} onChange={(e) => setNovoUserNome(e.target.value)} required style={inputStyle} />
          <input type="text" placeholder="Username" value={novoUserUsername} onChange={(e) => setNovoUserUsername(e.target.value)} required style={inputStyle} />
          <input type="password" placeholder="Senha" value={novoUserSenha} onChange={(e) => setNovoUserSenha(e.target.value)} required style={inputStyle} />
          <select value={novoUserPerfil} onChange={(e) => setNovoUserPerfil(e.target.value)} style={inputStyle}>
            <option value="treinador">Treinador</option><option value="admin">Administrador</option>
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9em', color: '#334155', cursor: 'pointer', flex: '1 1 100%' }}>
            <input type="checkbox" checked={novoUserAcesso} onChange={(e) => setNovoUserAcesso(e.target.value === 'on')} />
            Dar acesso à página de Relatórios
          </label>
          <button type="submit" style={{ padding: '8px 15px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', flex: '1 1 100%' }}>Adicionar Utilizador</button>
        </form>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9em' }}>
            <thead>
              <tr>
                <th style={{ padding: '8px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Nome</th>
                <th style={{ padding: '8px', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'center' }}>Vê Relatórios?</th>
                <th style={{ padding: '8px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {utilizadores.filter(u => u.perfil !== 'atleta').map(u => (
                <tr key={u.id}>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                    {u.nome} <span style={{ fontSize: '0.8em', color: '#94a3b8' }}>({u.perfil})</span>
                  </td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                    <button onClick={() => alternarAcessoRelatorio(u.id, u.acesso_relatorios ?? false)} style={{ ...btnAcao, backgroundColor: (u.acesso_relatorios ?? false) ? '#dcfce7' : '#fee2e2', color: (u.acesso_relatorios ?? false) ? '#16a34a' : '#ef4444', fontWeight: 'bold', border: `1px solid ${(u.acesso_relatorios ?? false) ? '#bbf7d0' : '#fecaca'}` }}>
                      {(u.acesso_relatorios ?? false) ? 'Sim (Desativar)' : 'Não (Ativar)'}
                    </button>
                  </td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '5px' }}>
                    <button onClick={() => mudarSenha(u.id)} style={{ ...btnAcao, backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1' }}>Mudar Senha</button>
                    {u.perfil !== 'admin' && (
                      <button onClick={() => removerUser(u.id)} style={{ ...btnAcao, backgroundColor: '#fee2e2', color: '#ef4444' }}>Remover</button>
                    )}
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