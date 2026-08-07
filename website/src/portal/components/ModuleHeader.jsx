import React from 'react';
import { CloudOff, RefreshCw } from 'lucide-react';
import { Badge } from './ui';

/** Shared title block for every portal module. */
const ModuleHeader = ({ number, title, blurb, online, pending, action }) => (
  <div className="flex flex-wrap items-start justify-between gap-4">
    <div className="min-w-0">
      <div className="flex items-center gap-2.5 mb-1.5">
        {number && (
          <span className="text-[11px] font-bold uppercase tracking-widest text-primary-600 bg-primary-50 border border-primary-200 px-2 py-0.5 rounded-md">
            Module {number}
          </span>
        )}
        {online === false && (
          <Badge tone="warning" icon={CloudOff}>
            Offline
          </Badge>
        )}
        {pending > 0 && (
          <Badge tone="info" icon={RefreshCw}>
            {pending} queued
          </Badge>
        )}
      </div>
      <h1 className="text-2xl md:text-3xl font-display font-bold text-silver-900">{title}</h1>
      <p className="text-silver-500 mt-1.5 max-w-2xl">{blurb}</p>
    </div>
    {action}
  </div>
);

export default ModuleHeader;
