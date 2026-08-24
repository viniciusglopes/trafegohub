# controle-de-acesso Specification

## Purpose

Quem entra, o que enxerga e o que pode fazer. Cobre login, papeis (`user` e
`admin`), plano assinado e time.

## Requirements

### Requirement: Senha guardada com hash de mao unica

O sistema SHALL guardar senha apenas como hash bcrypt e NAO SHALL permitir sua
leitura por nenhuma rota.

#### Scenario: Consulta de usuario pela API

- **WHEN** qualquer rota devolve dados de usuario
- **THEN** o campo de senha nao vai junto

### Requirement: Segredo de sessao forte e por ambiente

O sistema SHALL exigir `NEXTAUTH_SECRET` com entropia real, e NAO SHALL subir com
segredo previsivel.

⚠️ Em 24/08/2026 a producao rodava com `trafegohub-prod-secret-2026-qwerty`. Com o
repositorio publico, quem lesse o codigo sabia o formato; segredo fraco permite
forjar sessao sem saber senha nenhuma.

#### Scenario: Aplicacao sobe sem segredo configurado

- **WHEN** `NEXTAUTH_SECRET` esta vazio ou ausente
- **THEN** a aplicacao falha ao iniciar com mensagem clara
- **AND** NAO sobe com um valor padrao embutido

### Requirement: Papel admin e verificado no servidor

O sistema SHALL verificar `role = admin` no servidor para toda rota
administrativa, e NAO SHALL depender de esconder o item de menu.

#### Scenario: Usuario comum chama rota de administracao

- **WHEN** um usuario com `role = user` chama uma rota sob `/api/admin`
- **THEN** o sistema responde 403

### Requirement: Limite de plano aplicado no servidor

O sistema SHALL aplicar os limites do plano (`free`, `starter`, `pro`, `agency`)
nas rotas que criam recurso, e NAO SHALL confiar na tela para isso.

#### Scenario: Plano no limite de contas de anuncio

- **WHEN** o usuario no plano `free` tenta ligar uma conta alem do limite
- **THEN** o sistema recusa com mensagem dizendo o limite do plano
