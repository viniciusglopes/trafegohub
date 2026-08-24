# gestao-de-campanha Specification

## Purpose

Agir sobre o que esta no ar: pausar, ativar e mudar orcamento de campanha
diretamente da tela, sem abrir o gerenciador da plataforma.

Toda acao aqui mexe em dinheiro que esta sendo gasto agora. As exigencias abaixo
existem por isso.

## Requirements

### Requirement: Acao so acontece sobre conta que o usuario possui

O sistema SHALL verificar que a campanha alvo pertence a uma conta de anuncio do
usuario autenticado antes de qualquer acao, e SHALL responder 404 quando nao
pertencer.

404 e nao 403: responder "existe, mas nao e sua" ja entrega que o id existe.

#### Scenario: Usuario tenta pausar campanha de outro usuario

- **WHEN** o usuario chama a acao com o id de uma campanha que nao e dele
- **THEN** o sistema responde 404
- **AND** NAO chama a plataforma

### Requirement: Orcamento e sempre na unidade menor da moeda

O sistema SHALL tratar orcamento na unidade menor da moeda da conta (centavos) ao
falar com a plataforma, e SHALL exibir em unidade principal na tela.

⚠️ Confundir as duas escalas por um fator de 100 e o erro classico dessa
integracao: um orcamento de 25 vira 0,25 ou vira 2.500.

#### Scenario: Usuario define 30 reais por dia

- **WHEN** o usuario informa 30 como orcamento diario numa conta em BRL
- **THEN** o sistema envia 3000 para a plataforma
- **AND** a tela volta a exibir "R$ 30,00/dia"

### Requirement: O banco so muda depois que a plataforma confirma

O sistema SHALL atualizar o registro local somente apos a plataforma confirmar a
acao, e NAO SHALL marcar como pausado o que continua rodando la fora.

Divergencia silenciosa entre tela e realidade e pior que erro visivel: o usuario
para de olhar uma campanha que continua gastando.

#### Scenario: A plataforma recusa a pausa

- **WHEN** a chamada de pausa falha na plataforma
- **THEN** o status local permanece o anterior
- **AND** o usuario recebe o motivo da recusa em texto legivel

### Requirement: Toda acao fica registrada

O sistema SHALL gravar em log de auditoria quem fez, o que fez, sobre qual
recurso e quando, para toda acao que muda estado na plataforma.

#### Scenario: Campanha pausada pela tela

- **WHEN** um usuario pausa uma campanha
- **THEN** o sistema grava usuario, acao, id da campanha e horario
