# conexao-de-contas Specification

## Purpose

Ligar uma conta de anuncio de uma plataforma (Meta, Google Ads, TikTok) ao
trafegohub, guardar a credencial dessa ligacao e manter visivel se ela ainda
esta valida. Sem isso nenhuma outra capacidade do sistema funciona: sincronizar,
medir e pausar dependem todos de uma credencial viva.

## Requirements

### Requirement: Ligacao por OAuth, nunca por credencial digitada

O sistema SHALL ligar contas de anuncio exclusivamente por OAuth da propria
plataforma, e NAO SHALL oferecer campo para o usuario colar token ou senha da
plataforma.

O motivo e de responsabilidade: token colado a mao costuma ser token de usuario
pessoal com poder amplo, colado de um lugar inseguro, e sem caminho de revogacao.

#### Scenario: Usuario liga uma conta da Meta

- **WHEN** o usuario autenticado pede para ligar uma conta da Meta
- **THEN** o sistema redireciona para o dialogo OAuth da Meta pedindo os escopos
  `ads_management` e `ads_read`
- **AND** identifica o usuario no parametro `state`

#### Scenario: Usuario nao autenticado tenta ligar uma conta

- **WHEN** a rota de OAuth e chamada sem sessao valida
- **THEN** o sistema recusa com 401
- **AND** NAO SHALL iniciar o fluxo com a plataforma

### Requirement: Token de curta duracao vira token de longa duracao

O sistema SHALL trocar o token de curta duracao devolvido pelo OAuth por um
token de longa duracao antes de guardar, e SHALL guardar a data de expiracao.

Token de curta duracao vence em horas: guardado sem troca, a conta aparece
ligada na tela e para de sincronizar calada no dia seguinte.

#### Scenario: Troca bem-sucedida

- **WHEN** a plataforma devolve o codigo de autorizacao
- **THEN** o sistema troca o codigo pelo token curto
- **AND** troca o token curto pelo longo (`fb_exchange_token` na Meta)
- **AND** guarda o token longo e o `expiresAt` correspondente

#### Scenario: A troca falha

- **WHEN** a plataforma recusa a troca do token
- **THEN** o sistema NAO SHALL guardar o token curto como se fosse definitivo
- **AND** devolve o usuario a tela de contas com um motivo legivel

### Requirement: Estado da ligacao visivel e honesto

O sistema SHALL manter em cada conta de anuncio um estado entre `connected`,
`expired` e `error`, e SHALL mostrar esse estado na tela de contas.

⚠️ Em 24/08/2026 o banco de producao tinha uma campanha apontando para uma conta
de anuncio **que nao existia mais**, e nenhuma conta ligada. A tela nao dizia
nada: dava a entender que estava tudo certo. Estado de ligacao que so existe
implicitamente vira exatamente isso.

#### Scenario: Token vencido e detectado na sincronizacao

- **WHEN** uma chamada a plataforma falha por token invalido ou vencido
- **THEN** o sistema marca a conta como `expired`
- **AND** a tela oferece religar a conta

#### Scenario: Campanha sem conta de anuncio correspondente

- **WHEN** existe campanha cuja conta de anuncio referenciada nao existe mais
- **THEN** o sistema NAO SHALL exibi-la como se estivesse sincronizando
- **AND** SHALL sinalizar que a conta de origem foi removida

### Requirement: Credencial nunca sai do servidor

O sistema SHALL manter `credentials.accessToken` fora de toda resposta de API e
de toda pagina renderizada, e NAO SHALL registra-la em log.

#### Scenario: Listagem de contas de anuncio

- **WHEN** a API devolve as contas de anuncio do usuario
- **THEN** cada conta traz id, nome, plataforma, status e ultima sincronizacao
- **AND** NAO traz `credentials`
