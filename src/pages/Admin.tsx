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

  const [atletaAcesso, setAtletaAcesso] = useState<Atleta | null>(null);
  const [loginAtletaUsername, setLoginAtletaUsername] = useState('');
  const [loginAtletaSenha, setLoginAtletaSenha] = useState('');

  const [novoUserNome, setNovoUserNome] = useState('');
  const [novoUserUsername, setNovoUserUsername] = useState('');
  const [novoUserSenha, setNovoUserSenha] = useState('');
  const [novoUserPerfil, setNovoUserPerfil] = useState('treinador');
  const [novoUserAcesso, setNovoUserAcesso] = useState(true);

  const [novoNumero, setNovoNumero] = useState('');
  const [novoNomeAtleta, setNovoNomeAtleta] = useState('');
  const [novaPosicao, setNovaPosicao] = useState('Guarda-Redes');
  const [novaFoto, setNovaFoto] = useState(''); 
  const [fotoFile, setFotoFile] = useState<File | null>(null); 
  const [salvandoAtleta, setSalvandoAtleta] = useState(false);
  const [editandoAtleta, setEditandoAtleta] = useState<string | null>(null);

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
    const { data } = await supabase.from('utilizadores').select('id, username, perfil, nome, acesso_relatorios, atleta_id, ultimo_login');
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

  const salvarAtleta = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoAtleta(true);
    let urlFinal = novaFoto; 

    if (fotoFile) {
      const fileExt = fotoFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('fotos').upload(fileName, fotoFile);
      if (uploadError) { alert('Erro a carregar a imagem: ' + uploadError.message); setSalvandoAtleta(false); return; }
      const { data: publicUrlData } = supabase.storage.from('fotos').getPublicUrl(fileName);
      urlFinal = publicUrlData.publicUrl;
    }

    const dados = { numero: novoNumero ? parseInt(novoNumero) : null, nome: novoNomeAtleta, posicao: novaPosicao, foto_url: urlFinal };
    if (editandoAtleta) await supabase.from('atletas').update(dados).eq('id', editandoAtleta);
    else await supabase.from('atletas').insert([dados]);
    
    setNovoNumero(''); setNovoNomeAtleta(''); setNovaPosicao('Guarda-Redes'); setNovaFoto(''); setFotoFile(null); setEditandoAtleta(null); setSalvandoAtleta(false); fetchAtletas();
  };

  const iniciarEdicaoAtleta = (a: Atleta) => { setEditandoAtleta(a.id); setNovoNumero(a.numero?.toString() || ''); setNovoNomeAtleta(a.nome); setNovaPosicao(a.posicao); setNovaFoto(a.foto_url || ''); setFotoFile(null); };
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

  const inputStyle = { padding: '8px 10px', fontSize: '0.9em', border: '1px solid #cbd5e1', borderRadius: '4px', width: '100%', boxSizing: 'border-box' as const };
  const btnAcao = { padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', border: 'none', fontSize: '0.85em' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      
      {atletaAcesso && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '10px', maxWidth: '400px', width: '100%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>🔑 Acesso de Atleta</h3>
            <p style={{ color: '#64748b', fontSize: '0.9em', margin: '0 0 15px 0' }}>Defina as credenciais para <strong>{atletaAcesso.nome}</strong>.</p>
            <form onSubmit={guardarAcessoAtleta} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div><label style={{ fontSize: '0.8em', color: '#475569', fontWeight: 'bold' }}>Username de Login:</label><input type="text" value={loginAtletaUsername} onChange={(e) => setLoginAtletaUsername(e.target.value.toLowerCase().trim())} required style={{ ...inputStyle, marginTop: '4px' }} /></div>
              <div><label style={{ fontSize: '0.8em', color: '#475569', fontWeight: 'bold' }}>Palavra-passe:</label><input type="text" placeholder="Nova senha..." value={loginAtletaSenha} onChange={(e) => setLoginAtletaSenha(e.target.value)} style={{ ...inputStyle, marginTop: '4px' }} /></div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}><button type="button" onClick={() => setAtletaAcesso(null)} style={{ flex: '1', padding: '10px', backgroundColor: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Cancelar</button><button type="submit" style={{ flex: '1', padding: '10px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Guardar Acesso</button></div>
            </form>
          </div>
        </div>
      )}

      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ color: '#0f172a', margin: '0 0 15px 0' }}>⚙️ Definições do Clube</h3>
        <form onSubmit={guardarClube} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ flex: '1 1 200px' }}><input type="text" value={inputNome} onChange={(e) => setInputNome(e.target.value)} required style={inputStyle} /></div>
          <button type="submit" style={{ padding: '8px 15px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Guardar Alterações</button>
        </form>
      </div>

      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: editandoAtleta ? '2px solid #f59e0b' : 'none' }}>
        <h3 style={{ color: '#0f172a', margin: '0 0 15px 0' }}>👥 {editandoAtleta ? 'Editar Atleta' : 'Gestão de Plantel'}</h3>
        
        <form onSubmit={salvarAtleta} style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ flex: '0 1 70px' }}>
            <label style={{ display: 'block', fontSize: '0.8em', color: '#64748b', marginBottom: '4px' }}>Nº</label>
            <input type="number" value={novoNumero} onChange={(e) => setNovoNumero(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: '1 1 150px' }}>
            <label style={{ display: 'block', fontSize: '0.8em', color: '#64748b', marginBottom: '4px' }}>Nome da Atleta</label>
            <input type="text" value={novoNomeAtleta} onChange={(e) => setNovoNomeAtleta(e.target.value)} required style={inputStyle} />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={{ display: 'block', fontSize: '0.8em', color: '#64748b', marginBottom: '4px' }}>Posição</label>
            <select value={novaPosicao} onChange={(e) => setNovaPosicao(e.target.value)} style={inputStyle}>
              <option value="Guarda-Redes">Guarda-Redes</option><option value="Defesa">Defesa</option>
              <option value="Médio">Médio</option><option value="Avançada">Avançada</option>
            </select>
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: '0.8em', color: '#64748b', marginBottom: '4px' }}>{editandoAtleta && novaFoto ? 'Substituir Foto' : 'Adicionar Foto'}</label>
            <input type="file" accept="image/*" onChange={(e) => setFotoFile(e.target.files ? e.target.files[0] : null)} style={{ ...inputStyle, padding: '5px', backgroundColor: 'white' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" disabled={salvandoAtleta} style={{ padding: '8px 15px', backgroundColor: editandoAtleta ? '#f59e0b' : '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: salvandoAtleta ? 'not-allowed' : 'pointer', height: '35px', opacity: salvandoAtleta ? 0.7 : 1 }}>
              {salvandoAtleta ? 'A Guardar...' : (editandoAtleta ? 'Atualizar' : 'Adicionar')}
            </button>
            {editandoAtleta && <button type="button" onClick={() => {setEditandoAtleta(null); setNovoNumero(''); setNovoNomeAtleta(''); setNovaFoto(''); setFotoFile(null);}} style={{ padding: '8px 15px', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', height: '35px' }}>Cancelar</button>}
          </div>
        </form>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9em' }}>
            <thead>
              <tr>
                <th style={{ padding: '8px', borderBottom: '2px solid #e2e8f0', color: '#475569', width: '80px' }}>Nº</th>
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
                    <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {a.foto_url ? <img src={a.foto_url} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid #e2e8f0' }} onError={(e) => e.currentTarget.style.display = 'none'} /> : <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0, border: '1px solid #e2e8f0' }}>👤</div>}
                        <span style={{ minWidth: '20px' }}>{a.numero || '-'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', fontWeight: '500' }}>{a.nome} {temLogin && <span title="Tem login criado" style={{ fontSize: '0.85em' }}>📱</span>}</td>
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

      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: editandoEvento ? '2px solid #3b82f6' : 'none' }}>
        <h3 style={{ color: '#0f172a', margin: '0 0 15px 0' }}>📅 {editandoEvento ? 'Editar Evento' : 'Gestão de Eventos'}</h3>
        <form onSubmit={salvarEvento} style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end', marginBottom: '20px' }}>
          <div style={{ flex: '1 1 140px' }}><input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} required style={inputStyle} /></div>
          <div style={{ flex: '1 1 140px' }}>
            <select value={novoTipo} onChange={(e) => setNovoTipo(e.target.value)} style={inputStyle}>
              <option>Treino</option><option>Jogo (Oficial)</option><option>Jogo (Treino)</option>
            </select>
          </div>
          {novoTipo.includes('Jogo') && <div style={{ flex: '1 1 200px' }}><input type="text" placeholder="Adversário" value={novoAdversario} onChange={(e) => setNovoAdversario(e.target.value)} required style={inputStyle} /></div>}
          <button type="submit" style={{ padding: '8px 15px', backgroundColor: editandoEvento ? '#f59e0b' : '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', height: '35px' }}>{editandoEvento ? 'Atualizar' : 'Criar Evento'}</button>
          {editandoEvento && <button type="button" onClick={() => {setEditandoEvento(null); setNovaData(''); setNovoAdversario('');}} style={{ padding: '8px 15px', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', height: '35px' }}>Cancelar</button>}
        </form>

        {!editandoEvento && (
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
            <h4 style={{ color: '#0f172a', margin: '0 0 5px 0' }}>⚡ Gerador de Calendário Mensal</h4>
            <p style={{ fontSize: '0.85em', color: '#64748b', margin: '0 0 15px 0' }}>Cria automaticamente Treinos à Seg, Ter e Qui, e Jogos ao Sáb.</p>
            <form onSubmit={gerarEventosMensais} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ flex: '1 1 140px' }}>
                <select value={mesGerador} onChange={(e) => setMesGerador(Number(e.target.value))} style={inputStyle}>
                  <option value={1}>Janeiro</option><option value={2}>Fevereiro</option><option value={3}>Março</option><option value={4}>Abril</option><option value={5}>Maio</option><option value={6}>Junho</option><option value={7}>Julho</option><option value={8}>Agosto</option><option value={9}>Setembro</option><option value={10}>Outubro</option><option value={11}>Novembro</option><option value={12}>Dezembro</option>
                </select>
              </div>
              <div style={{ flex: '0 1 100px' }}><input type="number" min="2024" max="2030" value={anoGerador} onChange={(e) => setAnoGerador(Number(e.target.value))} style={inputStyle} /></div>
              <button type="submit" disabled={gerando} style={{ padding: '8px 15px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '4px', cursor: gerando ? 'not-allowed' : 'pointer', height: '35px' }}>{gerando ? 'A Gerar...' : 'Gerar Mês'}</button>
            </form>
          </div>
        )}
        <div style={{ overflowX: 'auto', borderTop: '1px solid #e2e8f0', paddingTop: '15px', marginTop: '15px' }}>
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

      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ color: '#0f172a', margin: '0 0 15px 0' }}>🔒 Equipa Técnica e Direção</h3>
        <form onSubmit={adicionarUser} style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ flex: '1 1 150px' }}><label style={{ display: 'block', fontSize: '0.8em', color: '#64748b', marginBottom: '4px' }}>Nome Completo</label><input type="text" value={novoUserNome} onChange={(e) => setNovoUserNome(e.target.value)} required style={inputStyle} /></div>
          <div style={{ flex: '1 1 120px' }}><label style={{ display: 'block', fontSize: '0.8em', color: '#64748b', marginBottom: '4px' }}>Username</label><input type="text" value={novoUserUsername} onChange={(e) => setNovoUserUsername(e.target.value)} required style={inputStyle} /></div>
          <div style={{ flex: '1 1 120px' }}><label style={{ display: 'block', fontSize: '0.8em', color: '#64748b', marginBottom: '4px' }}>Senha</label><input type="password" value={novoUserSenha} onChange={(e) => setNovoUserSenha(e.target.value)} required style={inputStyle} /></div>
          <div style={{ flex: '1 1 120px' }}><label style={{ display: 'block', fontSize: '0.8em', color: '#64748b', marginBottom: '4px' }}>Perfil</label>
            <select value={novoUserPerfil} onChange={(e) => setNovoUserPerfil(e.target.value)} style={inputStyle}>
              <option value="treinador">Treinador</option>
              <option value="diretor">Diretor</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div style={{ flex: '1 1 100%' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9em', color: '#334155', cursor: 'pointer' }}>
              <input type="checkbox" checked={novoUserAcesso} onChange={(e) => setNovoUserAcesso(e.target.checked)} /> Dar acesso a Relatórios
            </label>
          </div>
          <button type="submit" style={{ padding: '8px 15px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', height: '35px' }}>Adicionar Utilizador</button>
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
                  <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{u.nome} <span style={{ fontSize: '0.8em', color: '#94a3b8' }}>({u.perfil})</span></td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                    <button onClick={() => alternarAcessoRelatorio(u.id, u.acesso_relatorios ?? false)} style={{ ...btnAcao, backgroundColor: (u.acesso_relatorios ?? false) ? '#dcfce7' : '#fee2e2', color: (u.acesso_relatorios ?? false) ? '#16a34a' : '#ef4444', fontWeight: 'bold', border: `1px solid ${(u.acesso_relatorios ?? false) ? '#bbf7d0' : '#fecaca'}` }}>
                      {(u.acesso_relatorios ?? false) ? 'Sim (Desativar)' : 'Não (Ativar)'}
                    </button>
                  </td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '5px' }}>
                    <button onClick={() => mudarSenha(u.id)} style={{ ...btnAcao, backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1' }}>Mudar Senha</button>
                    {u.perfil !== 'admin' && <button onClick={() => removerUser(u.id)} style={{ ...btnAcao, backgroundColor: '#fee2e2', color: '#ef4444' }}>Remover</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ color: '#0f172a', margin: '0 0 15px 0' }}>🕒 Últimos Acessos (Atletas)</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9em' }}>
            <thead>
              <tr>
                <th style={{ padding: '8px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Atleta</th>
                <th style={{ padding: '8px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Username</th>
                <th style={{ padding: '8px', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>Último Login</th>
              </tr>
            </thead>
            <tbody>
              {utilizadores.filter(u => u.perfil === 'atleta').map(u => (
                <tr key={u.id}>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', fontWeight: '500' }}>{u.nome}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>{u.username}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>
                    {u.ultimo_login ? new Date(u.ultimo_login).toLocaleString('pt-PT') : 'Nunca acedeu'}
                  </td>
                </tr>
              ))}
              {utilizadores.filter(u => u.perfil === 'atleta').length === 0 && (
                <tr><td colSpan={3} style={{ padding: '15px', textAlign: 'center', color: '#94a3b8' }}>Nenhum acesso de atleta registado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}