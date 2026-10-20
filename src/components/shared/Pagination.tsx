import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "./Button";

interface Props {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, total, onChange }: Props) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-4 border-t border-border px-5 py-3.5">
      <p className="text-xs text-text-dim">
        Page <span className="tabular font-medium text-text-muted">{page}</span> of{" "}
        <span className="tabular font-medium text-text-muted">{totalPages}</span>
        <span className="mx-2 text-border-strong">·</span>
        <span className="tabular font-medium text-text-muted">
          {total.toLocaleString("en-IN")}
        </span>{" "}
        records
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          icon={<ChevronLeft size={14} />}
        >
          Prev
        </Button>
        <Button
          size="sm"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          Next
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}
