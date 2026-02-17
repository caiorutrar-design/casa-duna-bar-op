import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/use-theme";
import { toast } from "sonner";
import { LogOut, Moon, Sun, Lock, Globe } from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [language, setLanguage] = useState<"pt" | "en">(
    () => (localStorage.getItem("app_language") as "pt" | "en") || "pt"
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("bartender_name");
    navigate("/auth");
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Senha alterada com sucesso!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error("Erro ao alterar senha");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLanguageChange = (lang: "pt" | "en") => {
    setLanguage(lang);
    localStorage.setItem("app_language", lang);
    toast.success(lang === "pt" ? "Idioma alterado para Português" : "Language changed to English");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Configurações</DialogTitle>
          <DialogDescription>Gerencie suas preferências</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Dark mode */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              <Label>Modo Noturno</Label>
            </div>
            <Switch checked={isDark} onCheckedChange={toggleTheme} />
          </div>

          <Separator />

          {/* Language */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <Label>Idioma</Label>
            </div>
            <div className="flex gap-2">
              <Button
                variant={language === "pt" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => handleLanguageChange("pt")}
              >
                Português
              </Button>
              <Button
                variant={language === "en" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => handleLanguageChange("en")}
              >
                English
              </Button>
            </div>
          </div>

          <Separator />

          {/* Change password */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <Label>Alterar Senha</Label>
            </div>
            <Input
              type="password"
              placeholder="Nova senha"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Confirmar nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <Button
              size="sm"
              className="w-full"
              onClick={handleChangePassword}
              disabled={changingPassword || !newPassword}
            >
              {changingPassword ? "Alterando..." : "Alterar Senha"}
            </Button>
          </div>

          <Separator />

          {/* Logout */}
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
