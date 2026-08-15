import { ChefHat } from "lucide-react";
import { StationBoard } from "@/components/StationBoard";

export default function Kitchen() {
  return <StationBoard station="cozinha" title="Painel da Cozinha" icon={<ChefHat className="h-6 w-6" />} />;
}
