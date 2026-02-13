import { BadgeAlert, Mail, Building2 } from "lucide-react";
import { InventoryPreview } from "./InventoryPreview";

interface Agency {
  name?: string | null;
  email?: string | null;
}

interface ProposalInfo {
  project_name?: string | null;
  client_name?: string | null;
  agency?: Agency | null;
  proposal_type?: string | null; // e.g., "Projeto Especial"
  status?: string | null;
}

interface ProjectInfoCardProps {
  proposal: ProposalInfo;
  filteredScreens: Array<any>;
  showAddress?: boolean;
  showScreenType?: boolean;
}

export function ProjectInfoCard({ proposal, filteredScreens, showAddress, showScreenType }: ProjectInfoCardProps) {
  const agencyName = proposal.agency?.name || "Agência não definida";
  const agencyEmail = proposal.agency?.email || "-";
  const type = proposal.proposal_type || "Projeto";
  const status = proposal.status || "-";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-orange-200 bg-white p-4 pdf-tight-card">
        <h3 className="text-slate-900 font-semibold text-lg mb-3 pdf-compact-title">Informações do Projeto</h3>
        <div className="grid grid-cols-2 gap-4 pdf-dense-text">
          <div>
            <div className="text-xs text-slate-600">Nome do Projeto</div>
            <div className="text-slate-900 font-semibold">{proposal.project_name || '-'}</div>
          </div>
          <div>
            <div className="text-xs text-slate-600">Cliente Final</div>
            <div className="text-slate-900 font-semibold">{proposal.client_name || '-'}</div>
          </div>
          <div>
            <div className="text-xs text-slate-600">Agência</div>
            <div className="flex items-center gap-2">
              <BadgeAlert className="h-4 w-4 text-orange-600" />
              <span className="text-slate-900 font-medium">{agencyName}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-600">Email da Agência</div>
            <div className="flex items-center gap-2 text-slate-900 font-medium">
              <Mail className="h-4 w-4 text-slate-600" />
              {agencyEmail}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-600">Tipo de Proposta</div>
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 text-orange-700 px-3 py-1 text-sm font-semibold">
              <Building2 className="h-4 w-4" />
              {type}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-600">Status Atual</div>
            <div className="text-slate-900 font-semibold">{status}</div>
          </div>
        </div>
      </div>

      {/* Prévia dos pontos escolhidos */}
      <InventoryPreview filteredScreens={filteredScreens} showAddress={showAddress} showScreenType={showScreenType} />
    </div>
  );
}
