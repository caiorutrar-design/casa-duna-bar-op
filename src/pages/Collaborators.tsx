import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useUserRole } from "@/hooks/use-user-role";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, User, Phone, Mail, Eye, EyeOff, Search, History, DollarSign } from "lucide-react";
import { maskCPF, maskPhone, maskPix, maskBankAccount, formatCPF, formatPhone, validateCPF } from "@/lib/masks";
import { CollaboratorHistory } from "@/components/collaborators/CollaboratorHistory";
import { CollaboratorPayments } from "@/components/collaborators/CollaboratorPayments";

const CONTRACT_LABELS: Record<string, string> = {
  clt: "CLT",
  pj: "PJ",
  freelancer: "Freelancer",
};

interface CollaboratorRow {
  id: string;
  full_name: string;
  phone: string | null;
  cpf: string | null;
  email: string | null;
  address: string | null;
  pix_key: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_agency: string | null;
  photo_url: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  category_id: string | null;
  admission_date: string | null;
  base_salary: number | null;
  contract_type: string | null;
  active: boolean;
  created_at: string;
  collaborator_categories?: { name: string } | null;
}

interface CategoryRow {
  id: string;
  name: string;
  is_default: boolean;
}

const emptyForm = {
  full_name: "",
  phone: "",
  cpf: "",
  email: "",
  address: "",
  pix_key: "",
  bank_name: "",
  bank_account: "",
  bank_agency: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  category_id: "",
  admission_date: "",
  base_salary: "",
  contract_type: "freelancer",
};

const Collaborators = () => {
  const { isManager, loading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showSensitive, setShowSensitive] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("list");
  const [selectedCollaborator, setSelectedCollaborator] = useState<CollaboratorRow | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["collaborator-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("collaborator_categories").select("*").order("name");
      if (error) throw error;
      return data as CategoryRow[];
    },
    enabled: isManager,
  });

  const { data: collaborators = [], isLoading } = useQuery({
    queryKey: ["collaborators"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collaborators")
        .select("*, collaborator_categories(name)")
        .order("full_name");
      if (error) throw error;
      return data as CollaboratorRow[];
    },
    enabled: isManager,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      if (values.cpf && !validateCPF(values.cpf)) {
        throw new Error("CPF inválido");
      }
      const payload = {
        full_name: values.full_name.trim(),
        phone: values.phone.replace(/\D/g, "") || null,
        cpf: values.cpf.replace(/\D/g, "") || null,
        email: values.email.trim() || null,
        address: values.address.trim() || null,
        pix_key: values.pix_key.trim() || null,
        bank_name: values.bank_name.trim() || null,
        bank_account: values.bank_account.trim() || null,
        bank_agency: values.bank_agency.trim() || null,
        emergency_contact_name: values.emergency_contact_name.trim() || null,
        emergency_contact_phone: values.emergency_contact_phone.replace(/\D/g, "") || null,
        category_id: values.category_id || null,
        admission_date: values.admission_date || null,
        base_salary: values.base_salary ? parseFloat(values.base_salary) : 0,
        contract_type: values.contract_type,
      };

      if (editingId) {
        const { error } = await supabase.from("collaborators").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("collaborators").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaborators"] });
      toast({ title: editingId ? "Colaborador atualizado!" : "Colaborador cadastrado!" });
      closeDialog();
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("collaborators").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaborators"] });
      toast({ title: "Colaborador excluído!" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openEdit = (c: CollaboratorRow) => {
    setEditingId(c.id);
    setForm({
      full_name: c.full_name,
      phone: c.phone ? formatPhone(c.phone) : "",
      cpf: c.cpf ? formatCPF(c.cpf) : "",
      email: c.email || "",
      address: c.address || "",
      pix_key: c.pix_key || "",
      bank_name: c.bank_name || "",
      bank_account: c.bank_account || "",
      bank_agency: c.bank_agency || "",
      emergency_contact_name: c.emergency_contact_name || "",
      emergency_contact_phone: c.emergency_contact_phone ? formatPhone(c.emergency_contact_phone) : "",
      category_id: c.category_id || "",
      admission_date: c.admission_date || "",
      base_salary: c.base_salary?.toString() || "",
      contract_type: c.contract_type || "freelancer",
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    saveMutation.mutate(form);
  };

  const filtered = collaborators.filter((c) =>
    c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.collaborator_categories?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (roleLoading) {
    return <Layout><div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div></Layout>;
  }

  if (!isManager) {
    return <Layout><div className="text-center py-20 text-muted-foreground">Acesso restrito a gerentes e administradores.</div></Layout>;
  }

  if (selectedCollaborator && selectedTab === "history") {
    return (
      <Layout>
        <CollaboratorHistory
          collaborator={selectedCollaborator}
          onBack={() => { setSelectedCollaborator(null); setSelectedTab("list"); }}
        />
      </Layout>
    );
  }

  if (selectedCollaborator && selectedTab === "payments") {
    return (
      <Layout>
        <CollaboratorPayments
          collaborator={selectedCollaborator}
          onBack={() => { setSelectedCollaborator(null); setSelectedTab("list"); }}
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-2xl font-bold text-foreground">Colaboradores</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setShowSensitive(!showSensitive)} title={showSensitive ? "Ocultar dados" : "Mostrar dados"}>
              {showSensitive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditingId(null); setForm(emptyForm); }}>
                  <Plus className="h-4 w-4 mr-2" /> Novo Colaborador
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Editar Colaborador" : "Cadastrar Colaborador"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome Completo *</Label>
                      <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} maxLength={100} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Categoria</Label>
                      <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>CPF</Label>
                      <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: formatCPF(e.target.value) })} placeholder="000.000.000-00" maxLength={14} />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} placeholder="(00) 00000-0000" maxLength={15} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={100} />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de Contrato</Label>
                      <Select value={form.contract_type} onValueChange={(v) => setForm({ ...form, contract_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(CONTRACT_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Endereço</Label>
                    <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} maxLength={300} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Chave PIX</Label>
                      <Input value={form.pix_key} onChange={(e) => setForm({ ...form, pix_key: e.target.value })} maxLength={100} />
                    </div>
                    <div className="space-y-2">
                      <Label>Banco</Label>
                      <Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} maxLength={50} />
                    </div>
                    <div className="space-y-2">
                      <Label>Agência</Label>
                      <Input value={form.bank_agency} onChange={(e) => setForm({ ...form, bank_agency: e.target.value })} maxLength={20} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Conta Bancária</Label>
                      <Input value={form.bank_account} onChange={(e) => setForm({ ...form, bank_account: e.target.value })} maxLength={20} />
                    </div>
                    <div className="space-y-2">
                      <Label>Data de Admissão</Label>
                      <Input type="date" value={form.admission_date} onChange={(e) => setForm({ ...form, admission_date: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Salário Base (R$)</Label>
                      <Input type="number" min={0} step="0.01" value={form.base_salary} onChange={(e) => setForm({ ...form, base_salary: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Contato de Emergência</Label>
                      <Input value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} placeholder="Nome" maxLength={100} />
                    </div>
                    <div className="space-y-2">
                      <Label>Tel. Emergência</Label>
                      <Input value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: formatPhone(e.target.value) })} placeholder="(00) 00000-0000" maxLength={15} />
                    </div>
                  </div>

                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline" type="button">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit" disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Nenhum colaborador encontrado.</CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((c) => (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {c.full_name}
                      </CardTitle>
                      <div className="flex gap-2 flex-wrap">
                        {c.collaborator_categories?.name && (
                          <Badge variant="outline">{c.collaborator_categories.name}</Badge>
                        )}
                        <Badge className={c.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {c.active ? "Ativo" : "Inativo"}
                        </Badge>
                        {c.contract_type && (
                          <Badge variant="secondary">{CONTRACT_LABELS[c.contract_type] || c.contract_type}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedCollaborator(c); setSelectedTab("history"); }} title="Histórico">
                        <History className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedCollaborator(c); setSelectedTab("payments"); }} title="Pagamentos">
                        <DollarSign className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir colaborador?</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação não pode ser desfeita. "{c.full_name}" será removido permanentemente.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(c.id)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {c.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{showSensitive ? formatPhone(c.phone) : maskPhone(c.phone)}</span>
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span>{c.email}</span>
                    </div>
                  )}
                  {c.cpf && (
                    <div className="text-muted-foreground text-xs">
                      CPF: {showSensitive ? formatCPF(c.cpf) : maskCPF(c.cpf)}
                    </div>
                  )}
                  {c.pix_key && (
                    <div className="text-muted-foreground text-xs">
                      PIX: {showSensitive ? c.pix_key : maskPix(c.pix_key)}
                    </div>
                  )}
                  {c.bank_account && (
                    <div className="text-muted-foreground text-xs">
                      Conta: {showSensitive ? `${c.bank_name || ""} Ag ${c.bank_agency || ""} CC ${c.bank_account}` : `${c.bank_name || "***"} ${maskBankAccount(c.bank_account)}`}
                    </div>
                  )}
                  {c.base_salary != null && c.base_salary > 0 && (
                    <div className="text-muted-foreground text-xs">
                      Salário: {showSensitive ? `R$ ${Number(c.base_salary).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "R$ *****"}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Collaborators;
