# sincronizacao-de-anuncios Specification

## Purpose

Trazer da plataforma para o banco o que existe (campanhas, conjuntos, anuncios) e
como esta indo (gasto, impressoes, cliques, CTR, CPC, conversoes), para que a
tela e as regras automaticas trabalhem sobre dado local em vez de bater na API a
cada clique.

## Requirements

### Requirement: Sincronizacao e idempotente

O sistema SHALL sincronizar por atualizacao-ou-insercao usando o id da plataforma
como chave (`platformCampaignId`, `platformAdSetId`, `platformAdId`), e NAO SHALL
inserir uma segunda copia de algo que ja existe.

Rodar a sincronizacao duas vezes tem de deixar o banco igual a rodar uma vez.

#### Scenario: Segunda sincronizacao da mesma conta

- **WHEN** a sincronizacao roda de novo sobre uma conta ja sincronizada
- **THEN** cada campanha existente e atualizada no lugar
- **AND** a contagem de campanhas no banco NAO aumenta

### Requirement: Paginacao explicita

O sistema SHALL percorrer os cursores de paginacao da plataforma ate o fim, e NAO
SHALL tratar a primeira pagina como a lista inteira.

⚠️ A Graph API devolve `data` com no maximo algumas dezenas de itens e sinaliza a
continuacao em `paging.cursors.after`. Quem le so `data` acha que viu tudo — e a
conta com muitas campanhas sincroniza pela metade, em silencio.

#### Scenario: Conta com mais campanhas do que cabe numa pagina

- **WHEN** a plataforma indica continuacao em `paging`
- **THEN** o sistema busca as paginas seguintes
- **AND** so encerra quando nao houver mais cursor

### Requirement: Metrica ausente nao vira zero

O sistema SHALL distinguir "a plataforma nao devolveu metrica" de "a metrica e
zero", e NAO SHALL gravar zero quando a consulta de insights falhou.

Gasto zero e uma informacao. Gasto desconhecido e outra. Confundir as duas faz a
regra automatica pausar campanha boa achando que ela nao performou.

#### Scenario: Insights indisponivel para uma campanha

- **WHEN** a consulta de insights falha ou volta vazia para uma campanha
- **THEN** o sistema preserva as metricas anteriores
- **AND** NAO atualiza `metricsUpdatedAt`

#### Scenario: Insights responde com zeros de verdade

- **WHEN** a plataforma devolve insights com gasto zero
- **THEN** o sistema grava zero
- **AND** atualiza `metricsUpdatedAt`

### Requirement: Falha parcial nao derruba a sincronizacao inteira

O sistema SHALL continuar sincronizando as demais campanhas quando uma falhar, e
SHALL relatar ao final quantas entraram e quantas falharam.

#### Scenario: Uma campanha falha no meio

- **WHEN** a busca de conjuntos de uma campanha devolve erro
- **THEN** o sistema registra a falha daquela campanha
- **AND** segue para a proxima
- **AND** a resposta informa o total sincronizado e o total com falha
