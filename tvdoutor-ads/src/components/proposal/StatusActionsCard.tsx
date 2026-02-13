interface StatusActionsCardProps {
  currentStatus?: string | null;
  availableStatuses: string[];
  onChange: (next: string) => void;
}

export function StatusActionsCard({ currentStatus, availableStatuses, onChange }: StatusActionsCardProps) {
  return (
    <div className="rounded-xl border border-orange-200 bg-white p-4">
      <div className="text-slate-900 font-semibold mb-3">Ações de Status</div>
      <div className="flex flex-wrap gap-2">
        {availableStatuses.map((s) => (
          <button
            key={s}
            type="button"
            className={`px-3 py-2 rounded-lg border text-sm ${currentStatus === s ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-800 border-slate-300 hover:border-orange-400'}`}
            onClick={() => onChange(s)}
            aria-pressed={currentStatus === s}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

