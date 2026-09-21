# JBRICOLAGE — Gestão de Obras

App de gestão de horas, obras e equipas para uma empresa de construção/handyman. PWA em Next.js, com Firebase como backend, hospedada no Vercel.

Tem dois lados: um para **colaboradores** (registar dias de trabalho, ver o financeiro pessoal) e um para **admins** (gerir colaboradores, obras, finanças e a escala diária de equipas).

---

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Firebase**: Auth (login Google), Firestore (base de dados), Storage
- **Cloudinary** — upload de fotos de obras e de registos de trabalho
- **TailwindCSS** + componentes shadcn/ui (Radix)
- **jsPDF** + **jspdf-autotable** — exportação de relatórios e escalas em PDF
- PWA (`@ducanh2912/next-pwa`) — instalável no telemóvel
- Deploy: **Vercel** (não usa Firebase Hosting nem Cloud Functions — tudo corre como app Next.js normal)

---

## Funcionalidades

### Lado do colaborador
- **Login** com conta Google — só emails autorizados pelo admin conseguem criar conta nova (contas já existentes não são afetadas)
- **Calendário mensal**: registo diário de horas trabalhadas, por obra, com serviços/descrição e fotos
- Indicadores por dia: pago / não pago / hoje / ausência / sem registo
- **Bloqueio de edição de dias antigos** — configurável pelo admin (janela de X dias), com possibilidade de desbloqueio manual por dia e por colaborador
- **Financeiro pessoal**: horas do mês, valor devido (usa a taxa horária histórica de cada dia, não só a atual), pagamentos recebidos, saldo pendente — cálculo por FIFO mensal (pagamentos consomem os meses mais antigos primeiro)
- **Escala do dia**: botão no cabeçalho (só aparece se houver escala agendada) que abre um popup com a obra do dia e toda a equipa; navega entre vários dias se houver mais do que um agendado
- Definições pessoais (nome, taxa horária visível, etc.)

### Lado do admin
Acessível a UIDs autorizados (ver `lib/admin-config.ts`), navegação por separadores:

- **Início** — dashboard com KPIs globais (horas do mês, custo total, pendente global, colaboradores com atraso)
- **Equipa** — lista de colaboradores, ativar/suspender, taxa horária (com histórico de alterações), calendário individual de cada um, desbloqueio de dias específicos, override manual da taxa em dias passados
- **Obras** — CRUD de obras (nome, morada com geocoding, estado ativa/pausada/concluída, cor, fotos)
- **Escala** — distribuição diária de colaboradores por obra: escolhe/escreve o nome da obra, marca quem vai para lá por checkbox (um colaborador pode estar em mais do que uma obra no mesmo dia — o admin vê um aviso "também em X" para não se confundir), exporta a escala do dia em **PDF A4 paisagem** com o logótipo da empresa e uma grelha por obra (nome em cima, equipa toda por baixo). Escalas de dias passados são limpas da Firestore sempre que o admin abre esta ferramenta (sem cron — o Vercel não corre nada em segundo plano)
- **Financeiro** — visão agregada de pagamentos e pendências de todos os colaboradores, registo de pagamentos
- **Relatórios** — relatórios mensais/anuais/de desempenho em PDF
- **Configurações** — bloqueio de dias (janela de edição), e **Acessos & Registos**: lista de emails autorizados a criar conta nova na app

---

## Estrutura do projeto

```
app/
  page.tsx              → home do colaborador (calendário)
  admin/page.tsx         → shell do painel admin (troca de separadores)
  login/                 → ecrã de login

components/
  calendar-view.tsx      → calendário do colaborador
  day-entry-form.tsx     → formulário de registo de um dia
  financeiro-view.tsx    → financeiro pessoal do colaborador
  escala-do-dia.tsx      → botão + popup da escala (colaborador)
  header.tsx              → cabeçalho fixo (logo, escala, saudação, admin)
  side-nav.tsx / bottom-nav.tsx → navegação do colaborador
  forms/                 → seletor de obra, upload de fotos, etc.
  admin/                 → todos os ecrãs do painel admin
    admin-escalas-view.tsx     → escala diária + exportação PDF
    admin-collaborators-view.tsx, admin-finance-view.tsx,
    admin-obras-view.tsx, admin-dashboard-view.tsx, admin-settings-view.tsx, …

lib/
  firebase.ts             → inicialização do Firebase (client SDK)
  AuthProvider.tsx         → contexto de autenticação, criação de conta,
                             verificação de email autorizado, conta suspensa
  admin-config.ts          → lista de UIDs com acesso ao painel admin
  useGlobalSettings.ts     → definições globais (config/global): bloqueio de
                             dias, desbloqueios por utilizador/dia, emails
                             autorizados
  escalas-service.ts       → CRUD da escala diária (coleção escalas/)
  obras-service.ts         → CRUD de obras + upload Cloudinary + geocoding
  work-tracker-context.tsx → contexto com as entries de trabalho do
                             colaborador autenticado (users/{uid}.workData)
  types.ts, utils.ts       → tipos partilhados, resolveEntryTaxa (taxa
                             histórica por entry), isDayLocked, etc.
  report-utils.ts          → agregações para relatórios

hooks/
  useCollaborators.ts       → lista de colaboradores com totais (admin)
  useActiveCollaborators.ts, usePendingSuggestions.ts
```

### Código legado (não está ligado a nada)
`components/admin.tsx` e os ficheiros que importa (`atividades-tab.tsx`,
`materiais-tab.tsx`, `relatorios-tab.tsx`, `financeiro-tab.tsx`) são uma
versão antiga do painel admin, anterior à pasta `components/admin/` atual.
Não são importados em lado nenhum da app — candidatos a remoção numa limpeza
futura, mas deixados como estão até isso ser decidido.

---

## Modelo de dados (Firestore)

| Coleção | Documento | Conteúdo |
|---|---|---|
| `users` | `{uid}` | Perfil do colaborador: `name`, `email`, `role` ("worker"), `ativo`, `taxaHoraria`, `workData.entries[]` (registos diários, cada um com `taxaHoraria` histórica), `payments[]`, `unlockedDays[]`, `rateHistory[]` |
| `obras` | `{id}` | Nome, morada (+ coordenadas via geocoding), estado, cor, fotos |
| `escalas` | `{YYYY-MM-DD}` | `equipas: [{ obraId, obraNome, obraMorada, colaboradorUids[] }]` — um documento por dia, apagado automaticamente depois de passar |
| `config` | `global` | `diasBloqueio`, `unlockedUsers`, `allowedEmails[]` |

Não há regras de segurança (`firestore.rules`) versionadas neste repositório — são geridas diretamente na consola Firebase.

---

## Autenticação e controlo de acesso

- Login único: **Google Sign-In** via Firebase Auth
- **Registo controlado**: no primeiro login, o email é verificado contra `config/global.allowedEmails`. Se não estiver na lista, a conta é imediatamente terminada (sign-out) e nunca chega a criar `users/{uid}`. Contas já existentes nunca são verificadas outra vez.
- **Admin**: acesso ao `/admin` é decidido por uma lista fixa de UIDs em `lib/admin-config.ts` (não pelo campo `role`) — para dar acesso de admin a alguém, o UID tem de ser adicionado ali e feito deploy.
- **Conta suspensa**: admin pode marcar um colaborador como inativo (`ativo: false`), o que bloqueia o acesso com um ecrã próprio.

---

## Variáveis de ambiente

Copiar para `.env.local` (dev) e para as *Environment Variables* do projeto no Vercel (produção):

```bash
# Firebase (ver .env.example)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Cloudinary (upload de fotos) — não está no .env.example mas é necessário
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
```

---

## Correr localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:3000`. Precisa das variáveis de ambiente acima definidas em `.env.local`.

Outros comandos:
```bash
npm run build   # build de produção
npm run start   # corre o build de produção localmente
npm run lint    # eslint
```

---

## Deploy

Automático via Vercel a cada push para `main` (ver `vercel.json` — região `cdg1`, Paris). Não há Firebase Hosting nem Cloud Functions — tudo corre como rotas/páginas Next.js normais no Vercel.

---

## Notas e limitações conhecidas

- Sem testes automatizados.
- Sem `firestore.rules` no repositório — regras geridas manualmente na consola.
- A verificação de emails autorizados no registo é só do lado da app (client-side); não há reforço ao nível das regras do Firestore.
- Taxa horária: cada `entry` grava a sua própria taxa no momento em que é criada (`resolveEntryTaxa`), para o histórico financeiro se manter correto mesmo que a taxa do colaborador mude mais tarde. Alterações retroativas a dias específicos são feitas manualmente pelo admin (`entry-rate-override.tsx`).

## Ideias para o futuro (ainda não implementadas)

- Sugestões pendentes entre colaboradores da mesma equipa (importar serviço de um colega automaticamente)
- Assistente de voz/texto para o admin consultar horas, extratos e obras via linguagem natural (API DeepSeek com function calling)
- Sistema de regras/permissões mais granular para admins parciais (ex: admin que só vê Obras e Escala, sem acesso a Financeiro)
