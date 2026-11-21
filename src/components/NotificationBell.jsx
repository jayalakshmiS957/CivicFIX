import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { notificationsApi } from '../lib/api.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { formatDate } from '../lib/utils.js';
import { Bell, CheckCheck } from 'lucide-react';

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await notificationsApi.getAll();
      if (res.notifications) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-control text-[#5F6368] hover:text-[#202124] hover:bg-[#F8F9FA] transition-colors"
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#D93025] text-white text-[10px] font-medium flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#DADCE0] rounded-card shadow-card z-50 overflow-hidden animate-in fade-in">
          <div className="p-3 border-b border-[#DADCE0] flex items-center justify-between bg-[#F8F9FA]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#202124]">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[#E6F4EA] text-[#188038]">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-medium text-[#188038] hover:underline flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-[#DADCE0]">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#5F6368]">
                No notifications yet. You will be alerted when complaints you reported or supported change status.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 transition-colors hover:bg-[#F8F9FA] ${
                    !n.read ? 'bg-[#E6F4EA]/40' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to={`/issue/${n.issueId}`}
                      onClick={() => {
                        handleMarkAsRead(n.id, { stopPropagation: () => {} });
                        setIsOpen(false);
                      }}
                      className="flex-1 group"
                    >
                      <h4 className="text-xs font-medium text-[#202124] group-hover:text-[#188038] transition-colors">
                        {n.title}
                      </h4>
                      <p className="text-[11px] text-[#5F6368] mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <span className="text-[10px] text-[#5F6368] mt-1 block font-mono-numbers">
                        {formatDate(n.createdAt)}
                      </span>
                    </Link>

                    {!n.read && (
                      <button
                        onClick={(e) => handleMarkAsRead(n.id, e)}
                        className="text-[10px] text-[#5F6368] hover:text-[#202124] p-1"
                        title="Mark as read"
                      >
                        <span className="w-2 h-2 rounded-full bg-[#188038] block" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
