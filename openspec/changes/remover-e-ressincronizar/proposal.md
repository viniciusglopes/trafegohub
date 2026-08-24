# Remover e ressincronizar dados de anuncio

## Por que

Em 24/08/2026 o Vinicius pediu para zerar o trafegohub — tirar campanhas e
anuncios sincronizados — e descobriu que **nao existe caminho para isso na tela**.

Palavras dele: "pelo que vi nao tem como excluir, ficou ruim isso".

Foi preciso apagar direto no banco de producao, com backup na mao, que e
exatamente o tipo de operacao que este produto deveria tornar desnecessaria.

O sistema hoje e uma via de mao unica: sincroniza da plataforma para dentro e
nao tem volta. Consequencias praticas:

- sincronizou a conta errada? o dado fica;
- testou com uma conta e quer limpar antes de usar de verdade? nao da;
- a conta de anuncio foi removida la fora? campanha vira registro orfao, e foi
  isso que aconteceu: havia campanha apontando para uma conta que nao existia
  mais, sem nenhum aviso na tela.

## O que muda

1. Remover uma campanha sincronizada (e, em cascata, seus conjuntos e anuncios)
   **do banco local**, sem tocar na plataforma.
2. "Limpar e sincronizar de novo" por conta de anuncio: apaga o que veio daquela
   conta e refaz a sincronizacao do zero.
3. Desligar uma conta de anuncio, escolhendo entre manter o historico local ou
   apaga-lo junto.
4. Toda remocao passa por confirmacao que diz **quantos registros** serao
   apagados e **que a plataforma nao sera tocada**.

## O que NAO muda

- Nada aqui apaga campanha, conjunto ou anuncio **na plataforma**. Remocao e
  sempre local. Apagar anuncio de verdade continua sendo no gerenciador da Meta.
- Nao entra remocao em massa por filtro. O alcance de um clique tem de caber na
  cabeca de quem clica.

## Risco

Remocao local e reversivel por ressincronizacao — o dado vive na plataforma, nao
aqui. O risco real e o usuario achar que apagou o anuncio de verdade e ele
continuar rodando e gastando. Por isso a confirmacao precisa dizer isso com todas
as letras, e nao com um "tem certeza?".
