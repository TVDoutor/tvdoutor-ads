import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: ReactNode;
  badges?: Array<{ label: string; variant?: "default" | "secondary" | "success" }>;
}

export const PageHeader = ({ icon: Icon, title, description, actions, badges }: PageHeaderProps) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#f48220] via-[#ff9d4d] to-[#ffb87a] p-8 md:p-12 mb-8">
      <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#f48220]/95 via-[#ff9d4d]/85 to-transparent" />
      
      {/* Floating Orbs Animation */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#ff9d4d]/25 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#ffb87a]/25 rounded-full blur-3xl animate-pulse delay-1000" />
      
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30 shadow-2xl">
                <Icon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                  {title}
                </h1>
                <p className="text-white/90 text-lg font-medium mt-1">
                  {description}
                </p>
              </div>
            </div>
            {badges && badges.length > 0 && (
              <div className="flex items-center gap-2 pl-1">
                {badges.map((badge, index) => (
                  <Badge
                    key={index}
                    className={
                      badge.variant === "success"
                        ? "bg-green-500/20 text-white border-green-400/30 backdrop-blur-sm hover:bg-green-500/30 transition-all"
                        : "bg-white/20 text-white border-white/30 backdrop-blur-sm hover:bg-white/30 transition-all"
                    }
                  >
                    {badge.label}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          {actions && (
            <div className="flex gap-3">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

