import { ProjetoWithRelations } from '@shared/schema';

/**
 * Conta quantas aprovações um projeto tem do cliente que ainda não foram visualizadas
 * Retorna número de itens aprovados (música, locução, vídeo final) não visualizados
 */
export function countClientApprovals(projeto: ProjetoWithRelations): number {
  let count = 0;

  // 🔔 DEBUG SININHO
  const hasAnyApproval = projeto.musicaAprovada || projeto.locucaoAprovada || projeto.videoFinalAprovado;
  if (hasAnyApproval) {
    console.log(`🔔 [countClientApprovals] Projeto ${projeto.titulo}:`, {
      musicaAprovada: projeto.musicaAprovada,
      musicaVisualizadaEm: projeto.musicaVisualizadaEm,
      locucaoAprovada: projeto.locucaoAprovada,
      locucaoVisualizadaEm: projeto.locucaoVisualizadaEm,
      videoFinalAprovado: projeto.videoFinalAprovado,
      videoFinalVisualizadoEm: projeto.videoFinalVisualizadoEm,
    });
  }

  // Música aprovada e não visualizada
  if (projeto.musicaAprovada === true && !projeto.musicaVisualizadaEm) {
    count++;
    console.log(`  ✅ Música não visualizada - count++`);
  }

  // Locução aprovada e não visualizada
  if (projeto.locucaoAprovada === true && !projeto.locucaoVisualizadaEm) {
    count++;
    console.log(`  ✅ Locução não visualizada - count++`);
  }

  // Vídeo final aprovado e não visualizado
  if (projeto.videoFinalAprovado === true && !projeto.videoFinalVisualizadoEm) {
    count++;
    console.log(`  ✅ Vídeo final não visualizado - count++`);
  }

  if (hasAnyApproval) {
    console.log(`  🔢 Total de aprovações não visualizadas: ${count}`);
  }

  return count;
}

/**
 * Verifica se há aprovações recentes (nas últimas 24h)
 * Útil para destacar ainda mais o card
 */
export function hasRecentApprovals(projeto: ProjetoWithRelations): boolean {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const recentMusicApproval = projeto.musicaDataAprovacao &&
    new Date(projeto.musicaDataAprovacao) > oneDayAgo &&
    projeto.musicaAprovada === true;

  const recentVoiceApproval = projeto.locucaoDataAprovacao &&
    new Date(projeto.locucaoDataAprovacao) > oneDayAgo &&
    projeto.locucaoAprovada === true;

  const recentVideoApproval = projeto.videoFinalDataAprovacao &&
    new Date(projeto.videoFinalDataAprovacao) > oneDayAgo &&
    projeto.videoFinalAprovado === true;

  return !!(recentMusicApproval || recentVoiceApproval || recentVideoApproval);
}

/**
 * Retorna detalhes das aprovações para exibir
 */
export function getApprovalDetails(projeto: ProjetoWithRelations) {
  const approvals = [];

  if (projeto.musicaAprovada === true) {
    approvals.push({
      type: 'Música',
      icon: '🎵',
      date: projeto.musicaDataAprovacao,
      feedback: projeto.musicaFeedback,
    });
  }

  if (projeto.locucaoAprovada === true) {
    approvals.push({
      type: 'Locução',
      icon: '🎤',
      date: projeto.locucaoDataAprovacao,
      feedback: projeto.locucaoFeedback,
    });
  }

  if (projeto.videoFinalAprovado === true) {
    approvals.push({
      type: 'Vídeo Final',
      icon: '🎬',
      date: projeto.videoFinalDataAprovacao,
      feedback: projeto.videoFinalFeedback,
    });
  }

  return approvals;
}
