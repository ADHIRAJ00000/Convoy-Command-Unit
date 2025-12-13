// Real-Time Event Log Panel
// Scrollable feed showing all pilot vehicle events

import React, { useRef, useEffect } from 'react';
import { ScrollText, CheckCircle, AlertTriangle, Info, Flag } from 'lucide-react';

interface EventLogEntry {
  id: string;
  message: string;
  timestamp: string;
  type: string;
}

interface EventLogPanelProps {
  events: EventLogEntry[];
  maxHeight?: string;
}

export const EventLogPanel: React.FC<EventLogPanelProps> = ({
  events,
  maxHeight = '400px',
}) => {
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'HAZARD':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'CHECKPOINT':
        return <Flag className="w-4 h-4 text-green-400" />;
      case 'SYSTEM':
        return <Info className="w-4 h-4 text-blue-400" />;
      default:
        return <CheckCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'HAZARD':
        return 'bg-red-950/50 border-red-800';
      case 'CHECKPOINT':
        return 'bg-green-950/50 border-green-800';
      case 'SYSTEM':
        return 'bg-blue-950/50 border-blue-800';
      default:
        return 'bg-slate-800/50 border-slate-700';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800 px-4 py-3 border-b border-slate-700">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-blue-400" />
          LIVE EVENT LOG
        </h3>
      </div>

      {/* Event List */}
      <div
        className="overflow-y-auto p-4 space-y-2"
        style={{ maxHeight }}
      >
        {events.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No events logged yet</p>
          </div>
        ) : (
          <>
            {events.map((event) => (
              <div
                key={event.id}
                className={`flex items-start gap-3 p-3 rounded-lg border ${getEventColor(event.type)} transition-all animate-in slide-in-from-top`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white leading-relaxed">{event.message}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            <div ref={logEndRef} />
          </>
        )}
      </div>

      {/* Footer */}
      <div className="bg-slate-800 px-4 py-2 border-t border-slate-700 text-xs text-slate-500 flex items-center justify-between">
        <span>{events.length} events logged</span>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>Live Updates</span>
        </div>
      </div>
    </div>
  );
};
