# Casa Duna - Sistema de Controle de Estoque

Sistema completo de controle de estoque e operação para o bar Casa Duna.

## 🚀 Tecnologias

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Lovable Cloud (PostgreSQL + Edge Functions)
- **PWA**: Aplicativo instalável para dispositivos móveis
- **UI**: Shadcn/ui components

## 📱 Funcionalidades

### 1. Autenticação
- Login com nome e PIN do bartender
- Credenciais padrão:
  - **Admin**: PIN `1234`
  - **Casa Duna**: PIN `0000`

### 2. Vendas Rápidas
- Grid visual de drinks
- Registro de venda com um toque
- Baixa automática de estoque
- Bloqueio de venda se ingrediente zerado
- Cálculo automático de custo

### 3. Controle de Estoque
- Lista de ingredientes com status visual:
  - 🟢 Verde: OK
  - 🟡 Amarelo: < 30% do mínimo
  - 🔴 Vermelho: < 10% do mínimo
- Alertas para estoque baixo

### 4. Entrada de Mercadoria
- Registro de entrada de ingredientes
- Atualização automática de estoque
- Histórico de movimentações

### 5. Relatórios
- Vendas do dia
- Custo total por drink
- Quantidade vendida por item

## 🗄️ Estrutura do Banco

- `ingredients` - Ingredientes e estoque
- `drinks` - Catálogo de drinks
- `recipes` - Receitas (ingredientes por drink)
- `sales` - Vendas realizadas
- `stock_movements` - Movimentações de estoque
- `bartenders` - Bartenders com PIN

## 📊 Funções do Backend

- `process_sale()` - Processa venda e baixa estoque automaticamente
- `update_ingredient_stock()` - Atualiza estoque em entradas

## 🔐 Segurança

- RLS (Row Level Security) habilitado
- Autenticação via PIN
- Políticas de acesso configuradas

## 🎨 Design

- Paleta âmbar/dourado inspirada em bar
- Interface touch-friendly
- Responsivo mobile-first
- PWA instalável

## 📱 Instalação como App

Acesse o sistema no navegador mobile e adicione à tela inicial:
- **iOS**: Compartilhar → Adicionar à Tela Inicial
- **Android**: Menu → Instalar App

## 🔄 Próximos Passos

1. Adicionar mais drinks e ingredientes via Cloud Dashboard
2. Configurar alertas push para estoque baixo
3. Exportar relatórios em CSV
4. Adicionar fotos aos drinks

---

**Desenvolvido com Lovable** 💛
