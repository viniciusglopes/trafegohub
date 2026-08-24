# Tarefas

## 1. Remocao local

- [ ] 1.1 `DELETE /api/campaigns/[id]` — apaga campanha e, em cascata, conjuntos
      e anuncios dela. Verifica dono antes; 404 quando nao for do usuario.
- [ ] 1.2 `DELETE /api/ad-accounts/[id]?dados=manter|apagar` — desliga a conta e
      trata o historico conforme escolhido.
- [ ] 1.3 `POST /api/meta/sync?limpar=1` — apaga o que veio daquela conta e
      ressincroniza do zero, numa operacao so.

## 2. Tela

- [ ] 2.1 Acao de remover no card da campanha, com confirmacao que informa a
      quantidade de registros e a frase "isso nao apaga o anuncio na Meta".
- [ ] 2.2 Acao "limpar e sincronizar de novo" na tela de contas.
- [ ] 2.3 Marcar visualmente campanha cuja conta de anuncio nao existe mais.

## 3. Rastro

- [ ] 3.1 Registrar cada remocao no log de auditoria: quem, o que, quantos
      registros, quando.

## Historico

- 24/08/2026: proposta aberta depois de o Vinicius pedir para zerar o sistema e
  nao haver caminho pela tela. A limpeza daquele dia foi feita direto no banco,
  com backup em `/root/backup_trafegohub_24ago.json` (1 campanha e 1 conjunto;
  as demais colecoes ja estavam vazias).
