# Futebol dos Amigos 2026

Site com a classificação e as estatísticas da pelada dos amigos na temporada 2026: tabela geral, aproveitamento, forma recente e a ficha de cada jogador.

![HTML](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=000)

## Funcionalidades

- Tabela de classificação com aproveitamento de cada jogador
- Ficha do jogador com desempenho, estatísticas e histórico por rodada
- Forma recente dos últimos jogos
- Contagem regressiva para a próxima rodada

## Como os dados funcionam

A pontuação é mantida na planilha **`Pontuação 2026.xlsx`**. O site lê a planilha direto no navegador (`excel-loader.js`, usando a biblioteca SheetJS) e usa a aba mais recente. O arquivo `dados.js` é uma cópia dos dados gerada a partir da planilha, usada quando a leitura do Excel não está disponível.

### Atualizar os dados (Windows)

1. Atualize a planilha `Pontuação 2026.xlsx`
2. Dê dois cliques em `atualizar-dados.bat` para gerar o `dados.js`
3. Faça o commit da planilha e do `dados.js`

## Rodar localmente

A leitura da planilha precisa de um servidor (o navegador bloqueia `fetch` em `file://`):

```bash
python3 -m http.server 8080
```

## Licença

Código sob [MIT](LICENSE).
