import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Search, Download, Clock, User, Activity } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AuditReport } from "@/components/AuditReport";

interface AuditLog {
  id: string;
  user_email: string | null;
  action: string;
  module: string | null;
  details: any;
  created_at: string;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterModule, setFilterModule] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      toast.error("Erro ao carregar logs de auditoria");
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchSearch =
      !search ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      (log.user_email || "").toLowerCase().includes(search.toLowerCase());
    const matchModule = !filterModule || log.module === filterModule;
    return matchSearch && matchModule;
  });

  const modules = [...new Set(logs.map((l) => l.module).filter(Boolean))];

  const getActionColor = (action: string) => {
    if (action.includes("login") || action.includes("acesso")) return "bg-primary/10 text-primary";
    if (action.includes("create") || action.includes("insert") || action.includes("cadastr")) return "bg-green-500/10 text-green-700 dark:text-green-400";
    if (action.includes("update") || action.includes("edit") || action.includes("alter")) return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
    if (action.includes("delete") || action.includes("remov")) return "bg-destructive/10 text-destructive";
    return "bg-muted text-muted-foreground";
  };

  const exportLogs = () => {
    const csv = [
      "Data,Usuário,Ação,Módulo,Detalhes",
      ...filteredLogs.map((l) =>
        `"${format(new Date(l.created_at), "dd/MM/yyyy HH:mm:ss")}","${l.user_email || ""}","${l.action}","${l.module || ""}","${JSON.stringify(l.details || {})}"`
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    toast.success("Logs exportados com sucesso!");
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground mt-4">Carregando logs...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 pb-8">
        <div className="bg-gradient-dark rounded-lg p-6 text-primary-foreground shadow-strong">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8" />
            <div>
              <h2 className="text-3xl font-bold">Auditoria</h2>
              <p className="text-primary-foreground/70 mt-1">Logs de acesso e atividades do sistema</p>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <Activity className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold">{logs.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <User className="h-5 w-5 mx-auto text-accent mb-1" />
              <p className="text-2xl font-bold">{new Set(logs.map((l) => l.user_email)).size}</p>
              <p className="text-xs text-muted-foreground">Usuários</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <Clock className="h-5 w-5 mx-auto text-warning mb-1" />
              <p className="text-2xl font-bold">{modules.length}</p>
              <p className="text-xs text-muted-foreground">Módulos</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon" onClick={exportLogs}>
            <Download className="h-4 w-4" />
          </Button>
        </div>

        {modules.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            <Badge
              variant={!filterModule ? "default" : "outline"}
              className="cursor-pointer whitespace-nowrap"
              onClick={() => setFilterModule("")}
            >
              Todos
            </Badge>
            {modules.map((m) => (
              <Badge
                key={m}
                variant={filterModule === m ? "default" : "outline"}
                className="cursor-pointer whitespace-nowrap"
                onClick={() => setFilterModule(m || "")}
              >
                {m}
              </Badge>
            ))}
          </div>
        )}

        {/* Audit export section */}
        <AuditReport />

        {/* Logs list */}
        <div className="space-y-2">
          {filteredLogs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum log encontrado</p>
                <p className="text-xs text-muted-foreground mt-1">Os logs serão registrados automaticamente conforme o uso do sistema</p>
              </CardContent>
            </Card>
          ) : (
            filteredLogs.map((log) => (
              <Card key={log.id} className="hover:shadow-soft transition-shadow">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                        {log.module && (
                          <Badge variant="outline" className="text-xs">
                            {log.module}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {log.user_email || "Sistema"}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
