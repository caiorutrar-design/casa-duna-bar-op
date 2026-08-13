# Vendas: comanda redesenhada + alerta de "pedido pronto"

## Problemas atuais
- A comanda abre num diálogo com várias áreas empilhadas (input, lista, total, botões, cardápio) que competem por espaço; a lista de itens quase não rola e o cardápio embaixo ocupa altura fixa.
- Registrar item exige digitar o número do item, sem toque direto no cardápio.
- Cancelar um item antigo é difícil porque a lista não rola de forma independente.
- O garçom não sabe quando a cozinha marcou o pedido como pronto (hoje só a cozinha recebe alerta sonoro; o arquivo de som nem existe no projeto).

## O que será feito

### 1. Comanda redesenhada (mobile-first)
Layout em tela cheia no celular, com três zonas fixas e uma única área rolável:
```text
┌──────────────────────────────┐
│ Mesa 4 · 00:12:31   [fechar] │  cabeçalho fixo
├──────────────────────────────┤
│ [ Itens (3) ] [ Cardápio ]   │  abas
│                              │
│   área rolável (a única)     │
│                              │
├──────────────────────────────┤
│ Total R$ 48,00               │  rodapé fixo
│ [Enviar cozinha] [Fechar]    │
└──────────────────────────────┘
```
- Aba **Itens**: lista completa e rolável, item mais recente no topo. Cada linha mostra nome, quantidade, preço, status colorido e controles grandes de `−` / `+` para quantidade e botão de remover sempre acessível (independente da posição na lista). Remoção com confirmação rápida e desfazer via toast.
- Aba **Cardápio**: busca por nome/número, categorias com chips fixos, e cards tocáveis com nome, preço e descrição — um toque adiciona 1 unidade (toques repetidos incrementam). O campo numérico continua disponível para quem já usa o número do item (atalho rápido no topo).
- Status dos itens vira uma trilha visual (Pendente → Preparando → Pronto → Entregue) com cor e ícone; o garçom só vê a ação relevante ("Entregar" quando pronto), sem os botões de cozinha misturados.
- Total, contagem de itens e tempo decorrido sempre visíveis no rodapé/cabeçalho, com botões de ação de altura confortável para toque.
- Grid de mesas ganha estado visual mais claro (livre / ocupada com valor aberto e tempo).

### 2. Alerta de "pedido pronto" para o garçom
- Assinatura em tempo real nos `order_items` da mesa/comandas abertas: quando o status muda para `ready`, o garçom recebe:
  - toast destacado ("Mesa 4 — 2x Omelete pronto para entrega"),
  - **alerta sonoro** gerado no próprio app (WebAudio, sem depender de arquivo de áudio ausente) com repetição curta,
  - **notificação do sistema no celular** via Notifications API (com vibração quando suportada), funcionando mesmo com o app em segundo plano/tela bloqueada em navegadores compatíveis, já que o projeto é PWA.
- Pedido de permissão de notificação feito uma única vez, com botão discreto em Vendas ("Ativar alertas") e estado lembrado localmente; se negado, o alerta sonoro + toast continuam funcionando.
- Badge de "pronto para entregar" no card da mesa e contador no topo da tela de Vendas, para o garçom localizar rapidamente.
- Também será corrigido o som da Cozinha, que hoje aponta para um arquivo inexistente.

## Detalhes técnicos
- `src/pages/Sales.tsx` reorganizado; a comanda vira componentes menores: `OrderSheet`, `OrderItemRow`, `MenuPicker`.
- Novo hook `src/hooks/use-order-alerts.ts`: canal realtime em `order_items` filtrado pelas comandas abertas + fila de alertas.
- Novo utilitário `src/lib/notify.ts`: `playAlertSound()` (WebAudio oscillator, desbloqueado no primeiro toque do usuário), `requestNotificationPermission()`, `showSystemNotification()` com `navigator.vibrate`.
- Sem alterações de banco de dados: usa `order_items.status` e o realtime já habilitado.
- Nenhuma mudança nas regras de acesso ou nos fluxos de fechamento/pagamento.
