import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../auth/AuthContext';
import { groupedModulesForRole } from '../modules';
import { useCollection, useOnlineStatus, usePendingSync } from '../hooks';
import { flushQueue } from '../data/bcClient';
import { onSyncError } from '../data/db';
import { inboxFor, markAllRead, markRead } from '../data/activity';
import { siteConfig } from '../../data/content';
import { timeLabel } from './ui';

/* Declared at module scope: defining these inside PortalLayout would remount
   the whole sidebar — and drop its scroll position — on every render. */

const Nav = ({ groups, onNavigate }) => (
  <nav className="flex-1 overflow-y-auto custom-scroll px-3 py-4 space-y-5">
    {groups.map(({ group, items }) => (
      <div key={group}>
        <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-silver-400">
          {group}
        </p>
        <div className="space-y-0.5">
          {items.map((item) => {
            const Icon = Icons[item.icon] || Icons.Circle;
            return (
              <NavLink
                key={item.key}
                to={item.path}
                end={item.path === '/portal' || item.path === '/portal/my'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors group ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-silver-600 hover:bg-silver-100 hover:text-silver-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={18}
                      className={`mt-0.5 shrink-0 ${
                        isActive ? 'text-primary-600' : 'text-silver-400 group-hover:text-silver-600'
                      }`}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium leading-tight">{item.short}</span>
                      {item.number && (
                        <span className="block text-[11px] text-silver-400 mt-0.5 truncate">
                          Module {item.number}
                        </span>
                      )}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    ))}
  </nav>
);

const SidebarFooter = () => (
  <div className="p-3 border-t border-silver-200">
    <Link
      to="/"
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-silver-500 hover:bg-silver-100 hover:text-silver-800 transition-colors"
    >
      <Icons.ExternalLink size={16} />
      Back to silvergill.com
    </Link>
  </div>
);

const SEVERITY_STYLE = {
  critical: { icon: Icons.TriangleAlert, cls: 'text-red-600 bg-red-50 border-red-200' },
  warning: { icon: Icons.AlertCircle, cls: 'text-amber-600 bg-amber-50 border-amber-200' },
  info: { icon: Icons.Info, cls: 'text-primary-600 bg-primary-50 border-primary-200' },
};

const PortalLayout = () => {
  const { user, signOut, roleLabel, isCustomer, home } = useAuth();

  // A write that the server refused has already been rolled back in the store.
  // Saying so out loud is the whole point: the alternative is a row that looks
  // saved on screen and does not exist.
  useEffect(
    () =>
      onSyncError(({ action, message }) => {
        toast.error(action === 'load' ? 'Could not load some data' : 'That change was not saved', {
          description: message,
        });
      }),
    []
  );
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const pending = usePendingSync();
  const allNotifications = useCollection('notifications');

  const [mobileNav, setMobileNav] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [bell, setBell] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const groups = groupedModulesForRole(user?.role);
  const inbox = inboxFor(user, allNotifications);
  const unread = inbox.filter((n) => !n.read).length;

  // Both menus close from their own handlers (the drawer's onNavigate, the
  // dropdown's click-away), so there is no route-change effect to run here.

  const handleSync = async () => {
    if (syncing) return;
    if (!online) {
      toast.error('No connection', {
        description: 'Records stay queued and will post the moment you are back online.',
      });
      return;
    }
    setSyncing(true);
    const result = await flushQueue();
    setSyncing(false);

    if (result.attempted === 0) {
      toast.success('Everything is already in Business Central.');
    } else if (result.failed) {
      toast.warning(`${result.posted} posted, ${result.failed} failed`, {
        description: 'Failed items stay in the queue and will retry.',
      });
    } else {
      toast.success(`${result.posted} record${result.posted === 1 ? '' : 's'} posted to Business Central`);
    }
  };

  const openNotification = (notification) => {
    markRead(notification.id);
    setBell(false);
    if (notification.link) navigate(notification.link);
  };

  return (
    <div className="min-h-screen bg-silver-50 flex">
      {/* ===== Desktop sidebar ===== */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-white border-r border-silver-200 sticky top-0 h-screen">
        <div className="h-16 flex items-center px-5 border-b border-silver-200">
          <Link to={home} className="flex items-center gap-2.5">
            <img src={siteConfig.logo} alt={siteConfig.name} className="h-8 w-auto" />
            <span className="text-xs font-semibold uppercase tracking-widest text-silver-400 border-l border-silver-200 pl-2.5">
              {isCustomer ? 'Client' : 'Portal'}
            </span>
          </Link>
        </div>
        <Nav groups={groups} />
        <SidebarFooter />
      </aside>

      {/* ===== Mobile drawer ===== */}
      <AnimatePresence>
        {mobileNav && (
          <div className="lg:hidden fixed inset-0 z-[80] flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-silver-950/40 modal-backdrop"
              onClick={() => setMobileNav(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'tween', duration: 0.22 }}
              className="relative w-72 bg-white flex flex-col h-full shadow-2xl"
            >
              <div className="h-16 flex items-center justify-between px-5 border-b border-silver-200">
                <img src={siteConfig.logo} alt={siteConfig.name} className="h-8 w-auto" />
                <button
                  onClick={() => setMobileNav(false)}
                  className="p-1.5 text-silver-400 hover:text-silver-700"
                  aria-label="Close navigation"
                >
                  <Icons.X size={20} />
                </button>
              </div>
              <Nav groups={groups} onNavigate={() => setMobileNav(false)} />
              <SidebarFooter />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===== Main column ===== */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b border-silver-200 sticky top-0 z-40 flex items-center gap-2 sm:gap-3 px-4 md:px-6">
          <button
            onClick={() => setMobileNav(true)}
            className="lg:hidden p-2 -ml-2 text-silver-600 hover:text-primary-600 rounded-lg hover:bg-silver-100"
            aria-label="Open navigation"
          >
            <Icons.Menu size={20} />
          </button>

          <Link to={home} className="lg:hidden">
            <img src={siteConfig.logo} alt={siteConfig.name} className="h-7 w-auto" />
          </Link>

          <div className="flex-1" />

          {/* Connectivity — stated in words, never colour alone */}
          <span
            className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border ${
              online
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {online ? <Icons.Wifi size={13} /> : <Icons.WifiOff size={13} />}
            {online ? 'Online' : 'Offline'}
          </span>

          {/* Sync to Business Central — internal accounts only */}
          {!isCustomer && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-silver-200 text-silver-600 hover:border-primary-300 hover:text-primary-600 transition-colors disabled:opacity-60"
              title="Post queued records to Business Central"
            >
              <Icons.RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{syncing ? 'Syncing…' : 'Sync BC'}</span>
              {pending > 0 && (
                <span className="min-w-5 h-5 px-1.5 rounded-full bg-primary-600 text-white text-[11px] font-bold flex items-center justify-center tabular-nums">
                  {pending}
                </span>
              )}
            </button>
          )}

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setBell((v) => !v)}
              className="relative p-2 rounded-lg text-silver-500 hover:text-primary-600 hover:bg-silver-100 transition-colors"
              aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
            >
              <Icons.Bell size={18} />
              {unread > 0 && (
                <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {unread}
                </span>
              )}
            </button>

            <AnimatePresence>
              {bell && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setBell(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute right-0 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] bg-white rounded-xl border border-silver-200 shadow-xl z-20 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-silver-100 flex items-center justify-between">
                      <p className="text-sm font-semibold text-silver-900">Notifications</p>
                      {unread > 0 && (
                        <button
                          onClick={() => markAllRead(user, allNotifications)}
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto custom-scroll">
                      {inbox.length === 0 ? (
                        <p className="px-4 py-8 text-sm text-silver-400 text-center">Nothing to report.</p>
                      ) : (
                        inbox.map((n) => {
                          const style = SEVERITY_STYLE[n.severity] || SEVERITY_STYLE.info;
                          const SeverityIcon = style.icon;
                          return (
                            <button
                              key={n.id}
                              onClick={() => openNotification(n)}
                              className={`w-full text-left px-4 py-3 border-b border-silver-100 last:border-0 hover:bg-silver-50 transition-colors flex gap-3 ${
                                n.read ? 'opacity-60' : ''
                              }`}
                            >
                              <span className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${style.cls}`}>
                                <SeverityIcon size={14} />
                              </span>
                              <span className="min-w-0">
                                <span className="block text-sm font-medium text-silver-900">{n.title}</span>
                                <span className="block text-xs text-silver-500 mt-0.5">{n.body}</span>
                                <span className="block text-[11px] text-silver-400 mt-1">{timeLabel(n.at)}</span>
                              </span>
                              {!n.read && <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0 mt-1.5" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenu((v) => !v)}
              className="flex items-center gap-2.5 pl-2 pr-1 py-1 rounded-xl hover:bg-silver-100 transition-colors"
            >
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-primary-400 text-white text-xs font-bold flex items-center justify-center">
                {user?.name?.split(' ').map((p) => p[0]).slice(0, 2).join('')}
              </span>
              <span className="hidden md:block text-left">
                <span className="block text-sm font-medium text-silver-800 leading-tight">{user?.name}</span>
                <span className="block text-[11px] text-silver-400">{roleLabel}</span>
              </span>
              <Icons.ChevronDown size={15} className="text-silver-400" />
            </button>

            <AnimatePresence>
              {userMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-silver-200 shadow-xl z-20 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-silver-100">
                      <p className="text-sm font-medium text-silver-900">{user?.name}</p>
                      <p className="text-xs text-silver-500 mt-0.5 truncate">{user?.email}</p>
                      <p className="text-xs text-silver-400 mt-1.5">{user?.title}</p>
                      <span className="inline-flex mt-2.5 items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium bg-primary-50 text-primary-700 border border-primary-200">
                        <Icons.BadgeCheck size={11} />
                        {roleLabel}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setUserMenu(false);
                        signOut();
                        toast.success('Signed out');
                        navigate('/');
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-silver-600 hover:bg-silver-50 hover:text-red-600 transition-colors"
                    >
                      <Icons.LogOut size={15} />
                      Sign out
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Offline banner — the field app depends on this being unmissable */}
        {!online && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 md:px-6 py-2.5 flex items-center gap-2.5 text-sm text-amber-900">
            <Icons.CloudOff size={16} className="shrink-0" />
            <span>
              <span className="font-medium">Working offline.</span> Captures are saved on this device
              and queued for Business Central.
            </span>
          </div>
        )}

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PortalLayout;
