import { Martini } from "lucide-react";
import { StationBoard } from "@/components/StationBoard";

export default function Bar() {
  return <StationBoard station="bar" title="Painel do Bar" icon={<Martini className="h-6 w-6" />} />;
}
