import { Loader2 } from "lucide-react";

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen = ({ message = "Carregando..." }: LoadingScreenProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">TV Doutor ADS</h2>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  );
};

