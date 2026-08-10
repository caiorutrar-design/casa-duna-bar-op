import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { useUserRole, type AppRole } from "@/hooks/use-user-role";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton } from "@/components/PageSkeleton";
import { Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Administrador" },
  { value: "manager", label: "Gerente" },
  { value: "garcom", label: "Garçom" },
  { value: "barman", label: "Barman" },
  { value: "bartender", label: "Bartender" },
  { value: "usuario", label: "Usuário" },
];

const schema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(100, "Nome muito longo"),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres").max(72),
  role: z.enum(["admin", "manager", "garcom", "barman", "bartender", "usuario"]),
});

type ManagedUser = {
  id: string;
  email: string | null;
  name: string | null;
  created_at: string;
  roles: AppRole[];
};

const callFn = async (payload: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("manage-users", { body: payload });
  if (error) {
    const msg = (data as any)?.error || error.message;
    throw new Error(msg);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
};

export default function Users() {
  const { isAdmin, loading } = useUserRole();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "garcom" as AppRole });

  const { data, isLoading } = useQuery({
    queryKey: ["managed-users"],
    enabled: isAdmin,
    queryFn: async () => (await callFn({ action: "list" })) as { users: ManagedUser[] },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["managed-users"] });

  const createUser = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      return callFn({ action: "create", ...parsed.data });
    },
    onSuccess: () => {
      toast.success("Usuário cadastrado com sucesso");
      setForm({ name: "", email: "", password: "", role: "garcom" });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setRole = useMutation({
    mutationFn: (vars: { user_id: string; role: AppRole }) => callFn({ action: "set_role", ...vars }),
    onSuccess: () => { toast.success("Função atualizada"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeUser = useMutation({
    mutationFn: (user_id: string) => callFn({ action: "delete", user_id }),
    onSuccess: () => { toast.success("Usuário removido"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return <Layout><PageSkeleton /></Layout>;

  if (!isAdmin) {
    return (
      <Layout>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground font-body">
            Acesso restrito a administradores.
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Usuários</h1>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-display">
              <UserPlus className="h-5 w-5 text-primary" /> Cadastrar usuário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => { e.preventDefault(); createUser.mutate(); }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" value={form.name} maxLength={100}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={form.email} maxLength={255}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha provisória</Label>
                <Input id="password" type="password" value={form.password} maxLength={72}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Função</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as AppRole })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" className="w-full" disabled={createUser.isPending}>
                  {createUser.isPending ? "Cadastrando..." : "Cadastrar usuário"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-display">Usuários com acesso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading && <p className="text-sm text-muted-foreground font-body">Carregando...</p>}
            {data?.users?.map((u) => (
              <div key={u.id} className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold font-body text-foreground truncate">{u.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  {u.roles.length === 0 && <Badge variant="secondary" className="mt-1">sem função</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={u.roles[0] ?? ""}
                    onValueChange={(v) => setRole.mutate({ user_id: u.id, role: v as AppRole })}
                  >
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Definir função" /></SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(`Remover o acesso de ${u.name}?`)) removeUser.mutate(u.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {!isLoading && !data?.users?.length && (
              <p className="text-sm text-muted-foreground font-body">Nenhum usuário encontrado.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
