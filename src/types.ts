export interface Atleta {
  id: string;
  numero?: number;
  nome: string;
  posicao: string;
  foto_url?: string;
}

export interface AtletaRelatorio extends Atleta {
  total_presencas: number;
  media_geral: number | null;
}

export interface Utilizador {
  id: string;
  username: string;
  senha?: string;
  perfil: string;
  nome: string;
  acesso_relatorios?: boolean;
  atleta_id?: string;
  ultimo_login?: string;
}

export interface Evento {
  id: string;
  data: string;
  tipo: string;
  adversario?: string;
  fechado?: boolean;
}

export interface AvaliacaoInput {
  nota: string;
  semPontuacao: boolean;
  motivo: string;
}