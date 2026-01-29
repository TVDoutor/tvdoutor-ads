# app.tvdoutor.com.br – GraphQL API (autenticação + organization/players)

Guia “cola e leva” para o dev, baseado na documentação em PDF.

---

## Autenticação

- **O que a doc diz:** “To communicate with the GraphQL server, you'll need an API access token.”
- **Onde criar:** Settings → API Access Tokens → “Add API Access Key”.
- **Tipos de chave:**
  - **Read-only:** não executa mutations.
  - **Read-Write:** executa mutations.
- **Endpoint (fixo):** `https://app.tvdoutor.com.br/graphql`

---

## Header e formato do token

- **Método:** `POST`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: token <API_ACCESS_TOKEN>`
- **Corpo:** JSON com a string `query` (e `variables` se houver).
- **Onde o token vai:** no header `Authorization`, formato **`token <token>`** (não `Bearer`). O Playground da API usa `token`.

---

## Payload da requisição GraphQL

- A chamada é **POST** com **JSON**.
- O JSON contém uma string `query`.
- A string `query` deve escapar quebras de linha **ou** usar aspas externas simples no corpo do POST para não quebrar o parse.

---

## Exemplo de query (organization / players)

Listar “últimos conectados” (`orderBy: { field: LAST_SEEN_AT }`), com `id`, `name`, `lastSeen`, `isConnected`:

```graphql
{
  organization {
    players(first: 10, orderBy: { field: LAST_SEEN_AT }) {
      nodes {
        id
        name
        lastSeen
        isConnected
      }
    }
  }
}
```

Campos úteis para “Última Conexão” e “Sincronia” (conforme reference de schema):

| Campo         | Tipo      | Descrição                                                                 |
|---------------|-----------|----------------------------------------------------------------------------|
| `lastSeen`    | DateTime  | Último contato do player com os servidores                                |
| `lastSync`    | DateTime  | Data/hora em que baixou todo o conteúdo e foi considerado “synced”        |
| `isConnected` | Boolean!  | Se está conectado atualmente                                              |
| `syncProgress`| Int!      | Progresso de sincronização (0–100)                                        |

---

## Permissões do token (crítico)

- Algumas conexões/objetos exigem token com **`content:read`**.
- Acesso a dados do player (ex.: grupos, screencaptures) exige **`player:read`**.
- **`organization { ... }`** requer autenticação via token **e** o token precisa ter escopos coerentes (no mínimo leitura).

**Se o token não tiver `content:read` e `player:read` (ou equivalentes), a API retorna:**

```
"Authentication is required to access organization field"
```

**Solução:** ao criar o API Access Token em Settings → API Access Tokens, garantir que ele tenha **content:read** e **player:read** (ou os escopos indicados na doc para organização/players).

---

## Uso na Edge Function `tvd-sync-players`

- **Secret Supabase:** `TVDOUTOR_GRAPHQL_TOKEN` = valor do API Access Token.
- **Autenticação:** a função envia `Authorization: token <token>` (como o Playground). Opcional: `TVDOUTOR_GRAPHQL_AUTH_SCHEME` = `bearer` ou `x-api-key` para outros formatos.
- **Query:** `organization.players` com `orderBy: { field: LAST_SEEN_AT }`, campos `id`, `name`, `lastSeen`, `lastSync`, `isConnected`, `syncProgress`, e paginação via `first` / `after` + `pageInfo` quando suportado.
