import { cn } from "@/lib/utils";
import { Calendar, Building2, CalendarDays, MessageCircle, Mail } from "lucide-react";

export type Integration = {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  status: "coming_soon";
};

export const integrations: Integration[] = [
  {
    id: "calendly",
    name: "Calendly",
    description: "Automatically book appointments when leads express interest during a call.",
    icon: Calendar,
    iconBg: "bg-gradient-to-br from-cyan-400 to-cyan-500",
    status: "coming_soon",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Sync contacts, call logs, and deal stages bi-directionally.",
    icon: Building2,
    iconBg: "bg-gradient-to-br from-orange-400 to-orange-500",
    status: "coming_soon",
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Schedule callbacks directly to your primary calendar.",
    icon: CalendarDays,
    iconBg: "bg-gradient-to-br from-blue-400 to-blue-500",
    status: "coming_soon",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    description: "Send automated follow-up messages after calls.",
    icon: MessageCircle,
    iconBg: "bg-gradient-to-br from-emerald-400 to-emerald-500",
    status: "coming_soon",
  },
  {
    id: "email-smtp",
    name: "Email SMTP",
    description: "Send call transcripts and summaries to your team or leads.",
    icon: Mail,
    iconBg: "bg-gradient-to-br from-violet-400 to-violet-500",
    status: "coming_soon",
  },
];

type IntegrationCardProps = {
  integration: Integration;
  className?: string;
};

export function IntegrationCard({ integration, className }: IntegrationCardProps) {
  const Icon = integration.icon;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl bg-white border border-slate-100 p-5 sm:p-6 shadow-soft min-h-[220px]",
        className
      )}
    >
      <span className="absolute top-4 right-4 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
        Coming Soon
      </span>

      <div
        className={cn(
          "h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-sm mb-4",
          integration.iconBg
        )}
      >
        <Icon className="h-6 w-6" />
      </div>

      <h3 className="text-base font-semibold text-slate-900">{integration.name}</h3>
      <p className="text-sm text-slate-500 mt-1 leading-relaxed flex-1">
        {integration.description}
      </p>

      <button
        type="button"
        disabled
        className="mt-5 w-full h-11 rounded-xl bg-slate-100 text-slate-400 text-sm font-semibold cursor-not-allowed disabled:opacity-100"
      >
        Connect
      </button>
    </div>
  );
}
