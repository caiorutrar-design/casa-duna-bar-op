import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { subDays, format } from "date-fns";

export function AuditReport() {
  const defaultStart = format(subDays(new Date(), 30), "yyyy-MM-dd");

  const exportToCSV = async () => {
    try {
      const { data: salesData } = await supabase
        .from("sales")
        .select("*, drinks(name)")
        .gte("created_at", `${defaultStart}T00:00:00`)
        .order("created_at", { ascending: false })
        .limit(500);

      const { data: stockData } = await supabase
        .from("ingredients")
        .select("*")
        .order("name");

      let csvContent = "RELATÓRIO DE AUDITORIA\n\n";
      
      csvContent += "VENDAS (últimos 30 dias)\n";
      csvContent += "Data,Drink,Bartender,Quantidade,Valor Total\n";
      
      salesData?.forEach(sale => {
        const date = new Date(sale.created_at).toLocaleString('pt-BR');
        csvContent += `${date},${sale.drinks?.name || 'N/A'},${sale.bartender_name},${sale.quantity},R$ ${sale.total_cost}\n`;
      });

      csvContent += "\n\nESTOQUE ATUAL\n";
      csvContent += "Ingrediente,Marca,Estoque Atual,Estoque Mínimo,Unidade,Custo/Unidade\n";
      
      stockData?.forEach(item => {
        csvContent += `${item.name},${item.brand || 'N/A'},${item.current_stock},${item.min_stock},${item.unit},R$ ${item.cost_per_unit}\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `relatorio-auditoria-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Relatório exportado com sucesso!");
    } catch (error) {
      console.error("Error exporting report:", error);
      toast.error("Erro ao exportar relatório");
    }
  };

  const exportToJSON = async () => {
    try {
      const { data: salesData } = await supabase
        .from("sales")
        .select("*, drinks(name)")
        .gte("created_at", `${defaultStart}T00:00:00`)
        .order("created_at", { ascending: false })
        .limit(500);

      const { data: stockData } = await supabase
        .from("ingredients")
        .select("*")
        .order("name");

      const { data: movementsData } = await supabase
        .from("stock_movements")
        .select("*, ingredients(name)")
        .order("created_at", { ascending: false })
        .limit(100);

      const reportData = {
        generated_at: new Date().toISOString(),
        period: `Últimos 30 dias (desde ${defaultStart})`,
        sales: salesData,
        stock: stockData,
        recent_movements: movementsData,
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `auditoria-completa-${new Date().toISOString().split('T')[0]}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Relatório JSON exportado com sucesso!");
    } catch (error) {
      console.error("Error exporting JSON:", error);
      toast.error("Erro ao exportar relatório");
    }
  };

  return (
    <Card className="shadow-accent">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Exportar Relatório de Auditoria</span>
          <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button onClick={exportToJSON} variant="outline" size="sm">
              <FileDown className="mr-2 h-4 w-4" />
              JSON
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Exporte relatórios dos últimos 30 dias de vendas e estoque para auditoria.
        </p>
      </CardContent>
    </Card>
  );
}
