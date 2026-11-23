# CobraCritic

Plataforma editorial e social estilo Metacritic criada para o **Grupo dos Cobras** catalogar jogos, publicar notas e críticas, acompanhar o progresso de cada membro, votar em eventos do grupo e gerar cards prontos para compartilhar no WhatsApp e Discord.

---

## Sumário

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
  - [Tela Inicial](#1-tela-inicial)
  - [Catálogo e Fichas de Jogos](#2-catálogo-e-fichas-de-jogos)
  - [Notas, Críticas, Progresso e Debate](#3-notas-críticas-progresso-e-debate)
  - [Feed Social](#4-feed-social)
  - [Eventos dos Cobras](#5-eventos-dos-cobras)
  - [Ranking e Retrospectiva do Ano](#6-ranking-e-retrospectiva-do-ano)
  - [Membros, Perfis e Afinidade de Gosto](#7-membros-perfis-e-afinidade-de-gosto)
  - [Share Cards (WhatsApp / Discord)](#8-share-cards-whatsapp--discord)
  - [Notificações em Tempo Real e Preferências](#9-notificações-em-tempo-real-e-preferências)
  - [Administração e Moderação](#10-administração-e-moderação)
- [Stack Tecnológica](#stack-tecnológica)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Coleções no Firestore](#coleções-no-firestore)
- [Como Executar Localmente](#como-executar-localmente)
- [Scripts Disponíveis](#scripts-disponíveis)

---

## Visão Geral

O **CobraCritic** centraliza as avaliações e conversas sobre jogos do grupo em tempo real usando **React + TypeScript + Tailwind CSS** no frontend e **Firebase (Authentication + Cloud Firestore)** como backend persistente.

Principais pilares da plataforma:
- **Curadoria colaborativa**: qualquer membro pode cadastrar jogos (com auxílio de busca na API RAWG ou manualmente) e publicar avaliações.
- **Média justa e transparente**: notas de `0` a `100` com classificação visual por faixa (*Aclamação Universal*, *Geralmente Favorável*, *Críticas Mistas* e *Geralmente Desfavorável*) e ordenação por **média ponderada bayesiana**.
- **Interação em tempo real**: comentários encadeados, menções `@membro`, alertas de spoiler, votações ao vivo e notificações instantâneas.

---

## Funcionalidades

### 1. Tela Inicial
- **Jogo da Rodada fixado no topo**: banner em destaque para o jogo escolhido para o grupo jogar junto, exibindo nota, participantes e atalho rápido para marcar *Jogando* ou avaliar.
- **Banner rotativo editorial**: alterna automaticamente (com controles manuais, pausa e modo aleatório sem repetição) entre:
  - o jogo mais bem avaliado do catálogo;
  - novas críticas e notas publicadas recentemente (com selo do status do autor);
  - eventos abertos em andamento.
- **Eventos em andamento**: acesso direto aos eventos com votações ou indicações abertas e contagem regressiva para o prazo.
- **Jogos em Alta (últimas 48h)**: seção dinâmica destacando os jogos com mais críticas positivas (`75+`) ou novos comentários nas últimas 48 horas.
- **Atalhos rápidos**: acesso direto ao Catálogo completo e ao Feed Social.

### 2. Catálogo e Fichas de Jogos
- **Cadastro de jogos**: formulário completo com título, estúdio/desenvolvedora, data de lançamento, plataformas, gêneros, sinopse e capa — com busca integrada na **API RAWG** para preenchimento rápido ou escolha entre capas curadas / URL HTTPS.
- **Filtros e ordenação**: busca textual, filtro por gênero, plataforma, ano, intervalo de datas de lançamento, status pessoal do jogador e ordenação (nota ponderada, média bruta, mais recentes, mais avaliados, A–Z).
- **Modos de visualização**: alternância entre **Grade** e **Lista compacta** (preferência salva localmente).
- **Busca global no topo**: pesquisa instantânea de jogos e membros de qualquer tela.
- **Ficha completa do jogo**:
  - média do grupo, faixa de notas (mínima–máxima) e barra proporcional de críticas positivas, mistas e desfavoráveis;
  - botão dedicado **Quero jogar** (marcador/wishlist separado dos status de progresso) ao lado de **Avaliar jogo**;
  - seletor de progresso pessoal (**Jogando**, **Zerado**, **Platinado**, **Langado**) e bloco **Atividade dos Cobras** mostrando o status de cada membro naquele jogo;
  - opção **Reportar capa incorreta** para alertar os administradores.

### 3. Notas, Críticas, Progresso e Debate
- **Avaliação flexível (0 a 100)**:
  - crítica completa (título + texto) ou modo **Dar apenas nota**;
  - plataforma jogada e horas jogadas (opcional);
  - **botões de progresso integrados na janela de avaliação** (**Jogando**, **Zerado**, **Platinado**, **Langado**), sincronizados automaticamente com a ficha do jogo e a estante do perfil;
  - selo colorido do status exibido diretamente ao lado do nome do autor em toda avaliação publicada.
- **Proteção contra Spoilers**:
  - marcação de spoiler tanto em críticas completas quanto individualmente em comentários e respostas;
  - conteúdo oculto atrás de aviso interativo com opção de revelar/ocultar sob demanda.
- **Reações e comentários em thread**:
  - botão **Concordar** com contagem e lista de membros;
  - comentários aninhados com respostas diretas, recolhimento de threads longas e **menções `@membro`** com menu de autocompletar e destaque clicável para o perfil mencionado.

### 4. Feed Social
- Linha do tempo em tempo real com todas as avaliações e notas publicadas pelos membros, exibindo capa do jogo, nota, status do autor, texto da crítica, reações e discussões inline.

### 5. Eventos dos Cobras
- **Visão inicial organizada**: lista de cartões por evento indicando claramente o estado (*Indicações abertas*, *Votação aberta*, *Em preparação* ou *Encerrado*), abrindo os detalhes, votação ou resultados ao clicar no evento.
- **Dois modos de evento**:
  - **Votação do Grupo (`poll`)**: o jogo mais votado em cada categoria vence automaticamente ao encerrar (com opção de desempate pelo admin quando necessário), ideal para escolher o *Jogo da Rodada* ou listas coletivas.
  - **Premiação ao Vivo (`award`)**: o grupo faz palpites nas categorias e o admin marca os vencedores oficiais durante o evento (ex.: The Game Awards), gerando **Placar de Acertos** e listando **Quem Acertou** por categoria.
- **Fase de indicações pelos membros**: permite que cada membro indique **1 jogo** para o evento antes da abertura da votação; o admin pode importar as indicações diretamente para as categorias.
- **Data limite e contagem regressiva**: exibição do tempo restante para encerramento de indicações ou votos.
- **Integração com o Jogo da Rodada**: opção para o admin fixar um jogo vencedor diretamente no topo da plataforma.

### 6. Ranking e Retrospectiva do Ano
- **Ranking Geral**: classificação de todos os jogos avaliados usando **média ponderada bayesiana** (equilibrando nota e volume de avaliações), além dos **Jogos Mais Divisivos** (maior desvio padrão) e estatísticas por crítico.
- **Retrospectiva do Ano (por ano de lançamento dos jogos)**:
  - seletor por ano de lançamento com totais de críticas, lançamentos avaliados, horas jogadas, comentários e média geral (independentemente de quando foram jogados);
  - destaques daquele ano de lançamento: **Melhor Jogo Lançado**, **Maior Polêmica**, **Maior Consenso**, top gêneros mais avaliados e membros mais ativos;
  - geração de imagem resumo pronta para compartilhar.

### 7. Membros, Perfis e Afinidade de Gosto
- **Diretório de Membros**: listagem de todos os integrantes com busca e ordenação por atividade, média de notas, nome ou **Maior afinidade comigo**.
- **Afinidade de Gosto (%)**: cálculo automático de compatibilidade entre dois membros com base nos jogos avaliados em comum, com selo de sintonia (*Almas gêmeas*, *Sintonia alta*, *Gosto parecido*, etc.) e lista comparativa de maiores concordâncias e divergências dentro do perfil do membro.
- **Perfil personalizável**:
  - edição de nome público, bio e gênero favorito;
  - upload de foto de perfil com **recorte interativo (Avatar Crop)**;
  - **Top 5 Jogos Favoritos** ordenáveis;
  - **Estante de Jogos** separando o progresso (**Jogando**, **Zerado**, **Platinado**, **Langado**) da aba dedicada **Quero jogar**;
  - histórico completo de avaliações do membro.

### 8. Share Cards (WhatsApp / Discord)
- Gerador nativo em `<canvas>` de imagens PNG em alta definição (**1080×1350**) com opção de **baixar** ou **copiar para a área de transferência**, disponível para:
  - críticas individuais (incluindo nota, capa, plataforma, horas e status do jogador);
  - Top 5 de qualquer membro;
  - resultados de eventos encerrados;
  - Retrospectiva do Ano.

### 9. Notificações em Tempo Real e Preferências
- **Central de Notificações (sino no topo)** + **toasts ao vivo** cobrindo:
  - comentários nas suas críticas e respostas aos seus comentários;
  - menções `@membro`;
  - novo **Jogo da Rodada** fixado;
  - atualizações em **Eventos** (abertura de indicações, votação ou encerramento);
  - reportes de capa incorreta (para administradores).
- **Painel de Preferências de Notificação** (em *Meu Perfil*): cada usuário escolhe individualmente quais tipos de alertas e toasts deseja receber, com salvamento instantâneo no Firestore e atalho direto no menu do sino.

### 10. Administração e Moderação
- **Autenticação**: login com **Google** e suporte a conta administrativa dedicada.
- **Modo “Ver como usuário”**: botão no cabeçalho (ao lado das notificações) que permite ao administrador alternar instantaneamente para a visão de membro comum para testar telas e fluxos sem privilégios visuais de admin.
- **Painel Admin**:
  - **Bloquear novos cadastros & Modo somente leitura**: interruptor que desabilita o botão de login com Google na tela inicial e bloqueia novos perfis no Firestore, liberando o botão **Visualizar site (somente leitura)** para visitantes navegarem pelo catálogo, críticas, ranking, retrospectiva e eventos sem criar conta (mantendo as abas de Membros, Meu Perfil e Painel Admin ocultas para visitantes, e o Acesso Admin Mestre ativo);
  - gestão de membros, concessão/revogação de privilégios de administrador (inclusive por UID), banimento com motivo e desbanimento;
  - moderação de jogos, críticas, comentários e limpeza de conteúdo;
  - fila de **reportes de capa incorreta** com acesso rápido à edição da ficha e resolução.
- **Segurança no banco**: regras hardened no `firestore.rules` com validação de schemas, limites de tamanho e isolamento de permissões.

---

## Stack Tecnológica

| Camada | Tecnologias |
| --- | --- |
| **Frontend** | React 19, TypeScript 5, Vite 8 |
| **Estilização** | Tailwind CSS 4, Lucide Icons, Motion |
| **Backend & Banco** | Firebase Authentication, Cloud Firestore (tempo real via `onSnapshot`) |
| **Catálogo externo** | RAWG Video Games Database API (opcional, para autocomplete no cadastro de jogos) |
| **Qualidade & Segurança** | TypeScript (`tsc --noEmit`), ESLint + `@firebase/eslint-plugin-security-rules` |

---

## Estrutura do Projeto

```text
.
├── public/                     # Assets estáticos (logo e mídia pública)
├── src/
│   ├── assets/                 # Capas curadas embutidas
│   ├── components/
│   │   ├── HomeView.tsx        # Tela inicial (banner rotativo, eventos, Jogos em Alta)
│   │   ├── CatalogView.tsx     # Catálogo completo com filtros e modos grade/lista
│   │   ├── GameDetailView.tsx  # Ficha do jogo, progresso, Quero jogar e críticas
│   │   ├── SocialFeedView.tsx  # Feed social de críticas e discussões
│   │   ├── EventsView.tsx      # Eventos (Votação do Grupo e Premiação ao Vivo)
│   │   ├── RankingView.tsx     # Ranking bayesiano, divisivos e críticos
│   │   ├── RetrospectiveView.tsx # Resumo Anual dos Cobras
│   │   ├── MembersView.tsx     # Lista de membros, perfis e afinidade de gosto
│   │   ├── ProfileView.tsx     # Edição de perfil, estante e preferências de notificação
│   │   ├── AdminPanelView.tsx  # Moderação de membros, jogos, capas e posts
│   │   ├── ReviewFormModal.tsx # Modal de nota, crítica, spoiler e progresso
│   │   ├── ReviewCard.tsx      # Card de crítica com status, reações, threads e @menções
│   │   ├── GameFormModal.tsx   # Cadastro/edição de jogos com busca RAWG
│   │   ├── ShareCardModal.tsx  # Gerador de Share Cards PNG (1080x1350)
│   │   ├── NotificationsBell.tsx # Central de notificações e toasts ao vivo
│   │   ├── FeaturedRoundBanner.tsx # Banner fixado do Jogo da Rodada
│   │   ├── GlobalSearchBar.tsx # Busca global de jogos e membros
│   │   ├── Sidebar.tsx         # Navegação lateral e filtros rápidos
│   │   └── ...                 # AuthGate, AvatarCropModal, GameCover, ScoreBadge, etc.
│   ├── context/
│   │   └── VereditoContext.tsx # Estado global, listeners Firestore e mutações
│   ├── services/
│   │   └── rawg.ts             # Integração com a API RAWG
│   ├── utils/
│   │   └── affinity.ts         # Cálculo de afinidade de gosto entre membros
│   ├── firebase.ts             # Inicialização Firebase App, Auth e Firestore
│   ├── types.ts                # Tipos, constantes, limites e helpers de domínio
│   └── App.tsx                 # Shell principal e roteamento entre seções
├── firebase-blueprint.json     # Schema documental das coleções Firestore
├── firestore.rules             # Regras de segurança do Cloud Firestore
├── firestore.rules.test.ts     # Especificação/testes de segurança das regras
└── package.json
```

---

## Coleções no Firestore

| Coleção | Finalidade |
| --- | --- |
| `users` | Perfil público dos membros, Top 5 e `notificationPreferences` |
| `games` | Catálogo de jogos cadastrados pelo grupo |
| `reviews` | Notas (0–100), críticas, modo *apenas nota*, spoiler, plataforma e horas |
| `comments` | Comentários e respostas encadeadas com `hasSpoiler` e `mentionedUserIds` |
| `reactions` | Reações (*Concordar*) em avaliações |
| `userGameStatuses` | Progresso (`playing`, `completed`, `platinum`, `dropped`) e `wishlist` por jogo/membro |
| `events` | Eventos do grupo (`poll` ou `award`), categorias, indicados, prazo e vencedores |
| `eventVotes` | Votos/palpites por categoria em cada evento |
| `eventNominations` | Indicações enviadas pelos membros (1 jogo por membro por evento) |
| `groupConfig` | Configurações do grupo (`featuredRound` para o *Jogo da Rodada* e `accessControl` para o bloqueio de novos cadastros) |
| `coverReports` | Reportes de capa incorreta para moderação administrativa |
| `admins` | Lista de UIDs com privilégios de administrador |
| `bans` | Registros de suspensão de contas |

---

## Como Executar Localmente

### Pré-requisitos
- **Node.js 20+** e **npm** (ou **Bun**)
- Um projeto **Firebase** com **Authentication (Google)** e **Cloud Firestore** habilitados

### Passo a passo

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure as variáveis de ambiente:**
   Copie `.env.example` para `.env.local` e preencha os valores necessários:
   ```bash
   cp .env.example .env.local
   ```
   - `VITE_RAWG_API_KEY` *(opcional)*: chave pública somente leitura da [RAWG API](https://rawg.io/apidocs) para habilitar a busca automática de jogos e capas no cadastro.

3. **Configure o Firebase:**
   Certifique-se de que `firebase-applet-config.json` na raiz contenha as credenciais do seu projeto Firebase (`apiKey`, `authDomain`, `projectId`, `firestoreDatabaseId`, etc.) e publique as regras de segurança contidas em `firestore.rules`.

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   A aplicação ficará disponível em `http://localhost:3000`.

---

## Scripts Disponíveis

```bash
npm run dev      # Inicia o servidor de desenvolvimento na porta 3000
npm run build    # Gera o bundle de produção em dist/
npm run preview  # Pré-visualiza o build de produção localmente
npm run lint     # Valida tipos TypeScript (tsc --noEmit)
npx eslint firestore.rules  # Valida as regras de segurança do Firestore
```
