import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, AlertCircle } from "lucide-react";
import { pdfService } from "@/lib/pdf-service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PDFDownloadButtonProps {
  proposalId: number;
  customerName: string;
  variant?: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showIcon?: boolean;
  children?: React.ReactNode;
}

export const PDFDownloadButton = ({
  proposalId,
  customerName,
  variant = "outline",
  size = "sm",
  className,
  showIcon = true,
  children
}: PDFDownloadButtonProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setError(null);

    try {
      const filename = `proposta-${proposalId}-${customerName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      
      await pdfService.downloadProposalPDF(proposalId, filename);
      
      toast.success('PDF baixado com sucesso!', {
        description: `Proposta #${proposalId} salva como ${filename}`
      });
      
    } catch (error: any) {
      console.error('Erro ao baixar PDF:', error);
      
      const errorMessage = error.message || 'Erro desconhecido ao gerar PDF';
      setError(errorMessage);
      
      toast.error('Erro ao gerar PDF', {
        description: errorMessage,
        action: {
          label: 'Tentar novamente',
          onClick: () => handleDownload()
        }
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getButtonContent = () => {
    if (children) {
      return children;
    }

    if (isGenerating) {
      return (
        <>
          {showIcon && <FileText className="h-4 w-4 mr-2 animate-pulse" />}
          Gerando PDF...
        </>
      );
    }

    if (error) {
      return (
        <>
          {showIcon && <AlertCircle className="h-4 w-4 mr-2 text-destructive" />}
          Erro no PDF
        </>
      );
    }

    return (
      <>
        {showIcon && <Download className="h-4 w-4 mr-2" />}
        Baixar PDF
      </>
    );
  };

  return (
    <Button
      variant={error ? "destructive" : variant}
      size={size}
      className={cn(
        "transition-all duration-200",
        isGenerating && "cursor-wait opacity-75",
        error && "border-destructive/50",
        className
      )}
      onClick={handleDownload}
      disabled={isGenerating}
      title={
        isGenerating 
          ? 'Gerando PDF da proposta...' 
          : error 
          ? `Erro: ${error}` 
          : `Baixar PDF da proposta #${proposalId}`
      }
    >
      {getButtonContent()}
    </Button>
  );
};

