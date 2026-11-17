import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Bell, CheckCheck, Info } from 'lucide-react';
import { Loader } from '../components/ui/Loader';
import { formatDate } from '../utils/formatters';

export const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications/');
      const d = res.data?.data || res.data?.results || res.data || [];
      setNotifications(Array.isArray(d) ? d : []);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read/`);
      fetchNotifications();
    } catch {
      // fallback if endpoint differs
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read/');
      fetchNotifications();
    } catch {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-950 tracking-tight flex items-center gap-2">
            <Bell className="w-5 h-5 text-zinc-900" />
            <span>Notification Centre</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Real-time alerts for leave approvals, payroll runs, attendance, and system updates
          </p>
        </div>

        {notifications.length > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200   text-zinc-900  border border-zinc-300  rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark All Read</span>
          </button>
        )}
      </div>

      <div className="bg-white  rounded-xl border border-zinc-200  shadow-xs overflow-hidden">
        {loading ? (
          <Loader message="Loading notifications..." />
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-zinc-100  text-zinc-900  flex items-center justify-center mx-auto">
              <Bell className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-zinc-900 ">You&apos;re all caught up!</p>
            <p className="text-xs text-zinc-500 ">No unread notifications in your queue right now.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 ">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 flex items-start justify-between gap-4 ${n.is_read ? 'bg-white ' : 'bg-zinc-50/80 '}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg mt-0.5 ${n.is_read ? 'bg-zinc-100  text-zinc-400' : 'bg-zinc-200  text-zinc-900 '}`}>
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-950 ">{n.title || 'System Notification'}</p>
                    <p className="text-xs text-zinc-600  mt-0.5">{n.message || n.body}</p>
                    <p className="text-[11px] text-zinc-400 mt-1">{formatDate(n.created_at)}</p>
                  </div>
                </div>
                {!n.is_read && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="text-xs font-bold text-zinc-950  hover:underline flex-shrink-0 cursor-pointer"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

