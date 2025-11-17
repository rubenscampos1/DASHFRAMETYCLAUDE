/**
 * Converte uma string de data (YYYY-MM-DD) para um objeto Date
 * preservando a data local sem conversão de timezone
 * 
 * @param dateString - String no formato YYYY-MM-DD ou Date object
 * @returns Date object com a data exata fornecida
 */
export function parseLocalDate(dateString: string | Date | undefined | null): Date | undefined {
  // Se não tiver valor, retorna undefined
  if (!dateString) {
    return undefined;
  }
  
  // Se já for um Date, retorna ele mesmo
  if (dateString instanceof Date) {
    return dateString;
  }
  
  // Se não for string, retorna undefined
  if (typeof dateString !== 'string') {
    return undefined;
  }
  
  // Extrai ano, mês e dia da string
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Valida se os valores são números válidos
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return undefined;
  }
  
  // Cria a data usando o construtor local (sem conversão UTC)
  // O mês é 0-indexed, então subtraímos 1
  return new Date(year, month - 1, day);
}

/**
 * Converte um Date para string no formato YYYY-MM-DD
 * preservando a data local
 * 
 * @param date - Objeto Date
 * @returns String no formato YYYY-MM-DD
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}
