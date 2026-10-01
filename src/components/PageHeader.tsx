import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, Settings } from "lucide-react";
import { useCredits } from "@/lib/creditsContext";

// The title block every dashboard screen opens with: heading, one line of
// context, then the credit balance and whatever actions the page offers.
// Shared so new screens inherit the look instead of re-deriving it.
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Hide the credits pill on pages where a balance is noise. */
  showCredits?: boolean;
}

const PageHeader = ({ title, subtitle, actions, showCredits = true }: PageHeaderProps) => {
  const navigate = useNavigate();
  const { credits } = useCredits();

  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {showCredits && (
          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-100 shadow-sm text-sm font-medium text-slate-700">
            <CreditCard className="h-4 w-4 text-cyan-500" />
            {credits.toLocaleString()} Credits
          </div>
        )}
        <button
          className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          aria-label="Settings"
          onClick={() => navigate("/dashboard/settings")}
        >
          <Settings className="h-4 w-4" />
        </button>
        {actions}
      </div>
    </div>
  );
};

export default PageHeader;
