/**
 * Componente de Header Padrão para Páginas
 * Mantém identidade visual consistente em todo o sistema
 */

import { LucideIcon } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: {
    label: string;
    variant?: "default" | "secondary" | "outline" | "destructive";
    color?: string;
  };
  actions?: ReactNode;
}

export function PageHeader({ 
  title, 
  subtitle, 
  icon: Icon, 
  badge,
  actions 
}: PageHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 md:p-8 rounded-b-3xl shadow-xl mb-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {Icon && (
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                <Icon className="h-8 w-8 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-white text-3xl md:text-4xl font-bold">
                {title}
              </h1>
              {subtitle && (
                <p className="text-white/90 text-sm md:text-base mt-1">
                  {subtitle}
                </p>
              )}
            </div>
            {badge && (
              <Badge 
                variant={badge.variant || "secondary"}
                className={`${badge.color || 'bg-white/20 text-white border-white/30'} backdrop-blur-sm px-4 py-1.5`}
              >
                {badge.label}
              </Badge>
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
}

/**
 * Classes CSS padrão para Cards
 */
export const cardStyles = {
  base: "bg-white border-0 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 rounded-2xl",
  content: "p-6",
  header: "pb-3",
};

/**
 * Classes CSS padrão para Botões de Ação
 */
export const buttonStyles = {
  primary: "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 rounded-2xl font-bold",
  secondary: "bg-white text-orange-600 border-2 border-orange-200 hover:bg-orange-50 hover:border-orange-300 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 rounded-2xl font-semibold",
};

/**
 * Classes CSS padrão para Inputs
 */
export const inputStyles = {
  base: "rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500",
};
