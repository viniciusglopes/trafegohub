## ADDED Requirements

### Requirement: Remocao local nao toca na plataforma

O sistema SHALL permitir remover do banco local campanhas, conjuntos e anuncios
sincronizados, e NAO SHALL apagar nada na plataforma de anuncios ao fazer isso.

#### Scenario: Usuario remove uma campanha sincronizada

- **WHEN** o usuario confirma a remocao de uma campanha
- **THEN** a campanha e seus conjuntos e anuncios saem do banco local
- **AND** a campanha continua existindo na plataforma
- **AND** o texto de confirmacao informa isso antes do clique

#### Scenario: Campanha de outro usuario

- **WHEN** o id informado nao pertence a uma conta do usuario autenticado
- **THEN** o sistema responde 404

### Requirement: Limpar e sincronizar de novo

O sistema SHALL oferecer, por conta de anuncio, uma operacao que apaga o que veio
daquela conta e refaz a sincronizacao do zero.

#### Scenario: Conta sincronizada com dado errado

- **WHEN** o usuario aciona "limpar e sincronizar de novo" numa conta
- **THEN** o sistema apaga campanhas, conjuntos e anuncios daquela conta
- **AND** executa a sincronizacao completa em seguida
- **AND** informa quantos registros foram apagados e quantos vieram

### Requirement: Confirmacao diz o tamanho do estrago

O sistema SHALL informar, antes de qualquer remocao, quantos registros serao
apagados e que a plataforma nao sera afetada.

#### Scenario: Confirmacao de remocao

- **WHEN** a tela pede confirmacao para remover
- **THEN** o texto traz a contagem de campanhas, conjuntos e anuncios afetados
- **AND** afirma explicitamente que o anuncio continua no ar na plataforma
