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
import { Trash2, UserPlus, Camera, History } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserHistory } from "@/components/users/UserHistory";
import { useRef, useEffect } from "react";
import { toast } from "sonner";
import { z } from "zod";

const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Administrador" },
  { value: "manager", label: "Gerente" },
  { value: "garcom", label: "Garçom" },
  { value: "barman", label: "Cozinha" },
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
  photo_url: string | null;
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

const AvatarCell = ({ user, onUploaded }: { user: ManagedUser; onUploaded: () => void }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [signed, setSigned] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user.photo_url) { setSigned(null); return; }
    supabase.storage.from("avatars").createSignedUrl(user.photo_url, 3600).then(({ data }) => {
      if (active) setSigned(data?.signedUrl ?? null);
    });
    return () => { active = false; };
  }, [user.photo_url]);

  const upload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error("Imagem muito grande (máx. 5MB)"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Envie um arquivo de imagem"); return; }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      await callFn({ action: "set_photo", user_id: user.id, photo_url: path });
      toast.success("Foto atualizada");
      onUploaded();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar foto");
    } finally {
      setUploading(false);
    }
  };

  return (
    <button
      type="button"
      className="relative shrink-0"
      onClick={() => inputRef.current?.click()}
      disabled={uploading}
      title="Alterar foto do colaborador"
    >
      <Avatar className="h-12 w-12 border border-border">
        {signed && <AvatarImage src={signed} alt={user.name ?? "Colaborador"} />}
        <AvatarFallback>{(user.name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1 text-primary-foreground">
        <Camera className="h-3 w-3" />
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
      />
    </button>
  );
};

export default function Users() {
  const { isAdmin, loading } = useUserRole();
  const queryClient = useQueryClient();
  const [historyUser, setHistoryUser] = useState<ManagedUser | null>(null);
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
              <div key={u.id} className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center">
                <AvatarCell user={u} onUploaded={invalidate} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold font-body text-foreground truncate">{u.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  {u.roles.length === 0 && <Badge variant="secondary" className="mt-1">sem função</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setHistoryUser(u)}>
                    <History className="h-4 w-4 mr-1.5" /> Histórico
                  </Button>
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

      <Dialog open={!!historyUser} onOpenChange={(o) => !o && setHistoryUser(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Histórico - {historyUser?.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-3">
            {historyUser && <UserHistory name={historyUser.name ?? ""} />}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
