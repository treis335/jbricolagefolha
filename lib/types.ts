// lib/types.ts

import { v4 as uuidv4 } from "uuid"; // se ainda não tens, instala: npm install uuid @types/uuid

// Tipo para cada serviço individual dentro do dia
export interface Service {
  id: string;                     // UUID único para este serviço (gerado automaticamente)
  obraNome: string;               // Nome da obra / serviço (ex: "Reabilitação Casa Sr. António - Telhado")
  descricao: string;
  equipa: string[];
  materiais: string[];
  // Pode adicionar mais campos no futuro sem quebrar nada:
  // totalHorasPorServico?: number;
  // notas?: string;
  // cliente?: string;
  // localizacao?: string;
}

// Tipo principal do dia (mantém compatibilidade total com dados antigos)
export interface DayEntry {
  date: string;
  totalHoras: number;
  normalHoras: number;
  extraHoras: number;

  // Campos antigos (mantidos para compatibilidade total com dados existentes)
  descricao?: string;             // descrição geral do dia (opcional agora)
  equipa?: string[];              // equipa geral (opcional)
  materiais?: string[];           // materiais gerais (opcional)

  // NOVO: array de serviços detalhados (opcional para dados antigos)
  services?: Service[];
}

// Calculate normal and extra hours based on weekday rules (mantido exatamente igual)
export function calculateHours(
  date: string,
  totalHoras: number
): { normalHoras: number; extraHoras: number } {
  const dayOfWeek = new Date(date).getDay(); // 0 = Sunday, 6 = Saturday

  if (dayOfWeek === 0) {
    // Sunday: all extra
    return { normalHoras: 0, extraHoras: totalHoras };
  }

  if (dayOfWeek === 6) {
    // Saturday: first 5 normal
    const normalHoras = Math.min(totalHoras, 5);
    const extraHoras = Math.max(0, totalHoras - 5);
    return { normalHoras, extraHoras };
  }

  // Mon-Fri: first 8 normal
  const normalHoras = Math.min(totalHoras, 8);
  const extraHoras = Math.max(0, totalHoras - 8);
  return { normalHoras, extraHoras };
}

export type PaymentMethod = "MBWay" | "Dinheiro" | "Transferência";

export interface Payment {
  id: string;
  date: string; // YYYY-MM-DD
  valor: number;
  metodo: PaymentMethod;
}

export interface Settings {
  taxaHoraria: number; // Single rate for all hours
  equipaComum: string[];
}

export interface AppData {
  entries: DayEntry[];
  payments: Payment[];
  settings: Settings;
}

export const defaultSettings: Settings = {
  taxaHoraria: 10,
  equipaComum: [],
};

export const defaultAppData: AppData = {
  entries: [],
  payments: [],
  settings: defaultSettings,
};

// Calculate which days are paid based on sequential payments (mantido igual)
export function calculatePaidStatus(
  entries: DayEntry[],
  payments: Payment[],
  taxaHoraria: number
): Set<string> {
  const paidDates = new Set<string>();
  
  // Sort entries by date (oldest first)
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Calculate total paid amount
  const totalPaid = payments.reduce((sum, p) => sum + p.valor, 0);
  
  // Mark days as paid until we run out of paid amount
  let cumulativeValor = 0;
  for (const entry of sortedEntries) {
    const dayValor = entry.totalHoras * taxaHoraria;
    cumulativeValor += dayValor;
    
    if (cumulativeValor <= totalPaid) {
      paidDates.add(entry.date);
    } else {
      break;
    }
  }
  
  return paidDates;
}