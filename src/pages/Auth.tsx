import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAuditAction } from "@/hooks/use-audit-log";
import { lovable } from "@/integrations/lovable/index";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bartenderName, setBartenderName] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) throw error;
    } catch (error: any) {
      console.error("Google login error:", error);
      toast.error("Erro ao fazer login com Google");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail.trim()) {
      toast.error("Digite seu email");
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      toast.success("Email de redefinição enviado! Verifique sua caixa de entrada.");
      setResetOpen(false);
      setResetEmail("");
    } catch (error: any) {
      toast.error("Erro ao enviar email de redefinição");
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (error) throw error;
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("bartender_name")
          .eq("user_id", data.user.id)
          .single();
        const name = profile?.bartender_name || email;
        localStorage.setItem("bartender_name", name);
        await logAuditAction("login", "auth", { method: "email" });
        toast.success(`Bem-vindo, ${name}!`);
        navigate("/");
      }
    } catch (error: any) {
      if (error.message?.includes("Invalid login credentials")) {
        toast.error("Email ou senha inválidos");
      } else if (error.message?.includes("Email not confirmed")) {
        toast.error("Verifique seu email para confirmar o cadastro");
      } else {
        toast.error("Erro ao fazer login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !bartenderName.trim()) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: { bartender_name: bartenderName.trim() },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      if (data.user) {
        toast.success("Cadastro realizado! Verifique seu email para confirmar.");
      }
    } catch (error: any) {
      if (error.message?.includes("already registered")) {
        toast.error("Este email já está cadastrado");
      } else {
        toast.error("Erro ao criar conta");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-strong">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Casa Duna</CardTitle>
          <CardDescription>Faça login para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <div className="space-y-4 mt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Entrar com Google
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">ou</span>
                  </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label htmlFor="login-email" className="text-sm font-medium text-foreground mb-2 block">Email</label>
                    <Input id="login-email" type="email" placeholder="Digite seu email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="login-password" className="text-sm font-medium text-foreground mb-2 block">Senha</label>
                    <Input id="login-password" type="password" placeholder="Digite sua senha" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Entrando..." : "Entrar"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => { setResetEmail(email); setResetOpen(true); }}
                    className="w-full text-sm text-primary hover:underline mt-2"
                  >
                    Esqueci minha senha
                  </button>
                </form>
              </div>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                <div>
                  <label htmlFor="signup-name" className="text-sm font-medium text-foreground mb-2 block">Nome</label>
                  <Input id="signup-name" type="text" placeholder="Digite seu nome" value={bartenderName} onChange={(e) => setBartenderName(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="signup-email" className="text-sm font-medium text-foreground mb-2 block">Email</label>
                  <Input id="signup-email" type="email" placeholder="Digite seu email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="signup-password" className="text-sm font-medium text-foreground mb-2 block">Senha</label>
                  <Input id="signup-password" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Cadastrando..." : "Criar Conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir Senha</DialogTitle>
            <DialogDescription>Digite seu email para receber um link de redefinição de senha.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input type="email" placeholder="Digite seu email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
            <Button onClick={handleResetPassword} className="w-full" disabled={resetLoading}>
              {resetLoading ? "Enviando..." : "Enviar Link"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
