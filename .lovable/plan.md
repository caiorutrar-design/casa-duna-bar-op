

## Planejador Financeiro de Eventos — Plano de Implementação

### Resumo
Adicionar um painel financeiro completo a cada evento, com simulador interativo de break-even, cálculo automático de receitas/despesas/ROI, e gráfico comparativo usando Recharts.

---

### 1. Migração de Banco de Dados

**1a. Adicionar colunas na tabela `events`:**
```sql
ALTER TABLE public.events
  ADD COLUMN estimated_attendance integer DEFAULT 0,
  ADD COLUMN average_ticket_price numeric DEFAULT 0,
  ADD COLUMN average_bar_spend_per_person numeric DEFAULT 0,
  ADD COLUMN estimated_sponsor_revenue numeric DEFAULT 0,
  ADD COLUMN estimated_vip_revenue numeric DEFAULT 0,
  ADD COLUMN estimated_other_revenue numeric DEFAULT 0;
```

**1b. Criar tabela `event_expenses`:**
```sql
CREATE TABLE public.event_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  category text DEFAULT 'geral',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_expenses ENABLE ROW LEVEL SECURITY;

-- Same RLS as events table (manager/admin/usuario)
CREATE POLICY "Authorized can read event_expenses" ON public.event_expenses
  FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['manager','admin','usuario']::app_role[]));

CREATE POLICY "Authorized can insert event_expenses" ON public.event_expenses
  FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['manager','admin','usuario']::app_role[]));

CREATE POLICY "Authorized can update event_expenses" ON public.event_expenses
  FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['manager','admin','usuario']::app_role[]));

CREATE POLICY "Authorized can delete event_expenses" ON public.event_expenses
  FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['manager','admin','usuario']::app_role[]));
```

---

### 2. Novo Componente: `EventFinancialPlanner.tsx`

Criar `src/components/events/EventFinancialPlanner.tsx` que recebe um `event` como prop e contém:

- **Simulador interativo** (3 inputs editáveis):
  - Público esperado → salva em `estimated_attendance`
  - Preço médio ingresso → salva em `average_ticket_price`
  - Gasto médio bar/pessoa → salva em `average_bar_spend_per_person`
  - Receita patrocínio, VIP, outras → campos adicionais

- **Cards de métricas calculadas** (em tempo real conforme inputs mudam):
  - Receita de Ingressos = attendance × ticket_price
  - Receita de Bar = attendance × bar_spend
  - Receita Total = ingressos + bar + patrocínio + VIP + outras
  - Despesa Total = soma dos `event_expenses`
  - Lucro Estimado = receita_total - despesa_total
  - ROI (%) = (lucro / despesa) × 100
  - Break-even (ingressos) = (despesa - outras_receitas) / preço_médio_ingresso

- **Gráfico Recharts** (BarChart simples):
  - Barra "Receita Prevista" vs "Custo Total"

- **Tabela de despesas** com CRUD inline:
  - Listar despesas do evento
  - Adicionar nova despesa (descrição + valor + categoria)
  - Excluir despesa

- Campos financeiros são salvos no evento via mutation `UPDATE events` com debounce ou botão "Salvar simulação"

---

### 3. Modificar `Events.tsx`

- Adicionar estado `selectedEvent` para abrir detalhes financeiros de um evento específico
- Quando um evento é selecionado, mostrar **Tabs** com:
  - Tab "Detalhes" (card existente do evento)
  - Tab "Planejamento Financeiro" (novo componente `EventFinancialPlanner`)
- Atualizar `EventRow` interface com os novos campos
- O form de criação/edição **não precisa mudar** — os campos financeiros são gerenciados exclusivamente na aba financeira

---

### 4. Arquivos Envolvidos

| Ação | Arquivo |
|------|---------|
| Criar | `src/components/events/EventFinancialPlanner.tsx` |
| Editar | `src/pages/Events.tsx` (adicionar tabs + selectedEvent) |
| Migração | Colunas em `events` + nova tabela `event_expenses` |

---

### 5. Pontos Técnicos

- Recharts já é dependência do projeto (lazy loaded via chunk de Reports)
- Tabs UI já existe (`@radix-ui/react-tabs`)
- RLS de `event_expenses` segue o mesmo padrão de `events`
- Cálculos são feitos client-side em tempo real (sem RPC necessária)
- Nenhuma alteração em autenticação, vendas, DRE ou layout global

