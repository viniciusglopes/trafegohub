# regras-automaticas Specification

## Purpose

Deixar o sistema agir sozinho sobre criterio de desempenho: pausar o que gasta
sem retorno, ativar o que esta indo bem, avisar quando algo sai da faixa, ajustar
orcamento.

E a capacidade de maior alcance e de maior risco do produto: e a unica em que o
sistema gasta ou deixa de gastar dinheiro sem ninguem clicar.

## Requirements

### Requirement: Regra so age sobre metrica fresca

O sistema SHALL verificar a idade da metrica antes de aplicar uma regra, e NAO
SHALL agir sobre dado mais velho que a janela da propria regra.

Regra horaria decidindo sobre metrica de ontem pausa campanha por engano.

#### Scenario: Metrica mais velha que a frequencia da regra

- **WHEN** uma regra horaria vai avaliar uma campanha cujo `metricsUpdatedAt` tem
  mais de uma hora
- **THEN** o sistema pula a campanha nesta rodada
- **AND** registra o motivo

### Requirement: Acao destrutiva de regra e reversivel e avisada

O sistema SHALL limitar as acoes automaticas a `pause`, `activate`, `alert` e
`adjust_budget`, todas reversiveis, e SHALL notificar o usuario a cada acao
tomada por regra.

#### Scenario: Regra pausa uma campanha

- **WHEN** a condicao da regra e satisfeita e a acao e `pause`
- **THEN** o sistema pausa a campanha
- **AND** cria um alerta dizendo qual regra agiu e sobre qual metrica

### Requirement: Regra nao repete a mesma acao em loop

O sistema SHALL registrar `lastRunAt` e SHALL respeitar a frequencia declarada
(`hourly`, `daily`, `weekly`), e NAO SHALL reaplicar a mesma acao sobre o mesmo
alvo dentro da mesma janela.

#### Scenario: Regra ja rodou na janela

- **WHEN** a regra tem frequencia diaria e ja rodou hoje
- **THEN** o sistema nao a executa de novo

### Requirement: Regra desligada nao age

O sistema SHALL avaliar apenas regras com `active = true`.

#### Scenario: Regra desativada pelo usuario

- **WHEN** o usuario desativa a regra
- **THEN** ela deixa de ser avaliada
- **AND** permanece cadastrada com seu historico
