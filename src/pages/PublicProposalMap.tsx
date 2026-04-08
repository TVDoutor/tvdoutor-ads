import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ProposalScreensMap } from "@/components/wizard/ProposalScreensMap";
import type { ProposalScreenMapPoint } from "@/components/wizard/ProposalScreensMap";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

type ApiResponse = {
  displayTitle: string;
  screens: ProposalScreenMapPoint[];
};

export default function PublicProposalMap() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [vh, setVh] = useState(
    typeof window !== "undefined" ? window.innerHeight : 600
  );

  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!token?.trim()) {
      setStatus("error");
      return;
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      setStatus("error");
      return;
    }

    let cancelled = false;
    const url = `${SUPABASE_URL}/functions/v1/public-proposal-map?token=${encodeURIComponent(token.trim())}`;

    fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json() as Promise<ApiResponse>;
      })
      .then((json) => {
        if (cancelled) return;
        setData(json);
        setStatus("ok");
        const t = json.displayTitle || "";
        document.title = `Locais Selecionados para a proposta - "${t}"`;
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const mapHeight = Math.max(240, vh - 88);
  const screenIds = useMemo(
    () => (data?.screens ?? []).map((s) => Number(s.id)).filter(Number.isFinite),
    [data]
  );

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-600">
        Carregando mapa…
      </div>
    );
  }

  if (status === "error" || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
        <p className="text-center text-slate-700 max-w-md">
          Link inválido ou proposta indisponível.
        </p>
      </div>
    );
  }

  const heading = `Locais Selecionados para a proposta - "${data.displayTitle}"`;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <h1 className="text-base sm:text-lg font-semibold text-slate-900 text-center leading-snug">
          {heading}
        </h1>
      </header>
      <main className="flex-1 min-h-0 p-3 sm:p-4">
        <ProposalScreensMap
          screens={data.screens}
          addedToProposalIds={screenIds}
          tempSelectedIds={[]}
          allSelectedStyle
          overviewMode
          height={mapHeight}
          className="!space-y-0 h-full"
        />
      </main>
    </div>
  );
}
