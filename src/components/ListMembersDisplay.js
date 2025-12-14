'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '@/contexts/LanguageContext';
import { useNotification } from '@/contexts/NotificationContext';
import { ShoppingListService } from '@/lib/shoppingListService';

export default function ListMembersDisplay({ listId, currentUserId, onLeaveList }) {
  const t = useTranslations();
  const { showError, showSuccess } = useNotification();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [leavingList, setLeavingList] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  useEffect(() => {
    if (listId) {
      loadMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId]);

  const loadMembers = async () => {
    if (!listId) return;

    setLoading(true);
    try {
      const data = await ShoppingListService.getListMembers(listId);
      setMembers(data || []);
    } catch (error) {
      console.error('Error loading list members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveList = async () => {
    if (!listId || !currentUserId) return;

    setLeavingList(true);
    try {
      const result = await ShoppingListService.leaveList(listId, currentUserId);

      if (result.listDeleted) {
        showSuccess(t('share.leftAndDeleted'));
      } else {
        showSuccess(t('share.leftList'));
      }

      setIsOpen(false);
      setConfirmLeave(false);

      if (onLeaveList) {
        onLeaveList(result);
      }
    } catch (error) {
      console.error('Error leaving list:', error);
      showError(t('share.errorLeaving'));
    } finally {
      setLeavingList(false);
    }
  };

  const isShared = members.length > 1;
  const isOnlyMember = members.length === 1;

  // Get initials from email
  const getInitials = (email) => {
    if (!email) return '?';
    const parts = email.split('@')[0];
    return parts.substring(0, 2).toUpperCase();
  };

  // Generate a color based on email
  const getAvatarColor = (email) => {
    if (!email) return 'bg-slate-400';
    const colors = [
      'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
      'bg-cyan-500', 'bg-purple-500', 'bg-pink-500', 'bg-teal-500'
    ];
    const index = email.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (!isShared && !loading) {
    return null; // Don't show anything if list is not shared
  }

  return (
    <>
      {/* Compact member avatars display */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center -space-x-2 hover:opacity-80 transition-opacity"
        aria-label={t('share.viewMembers')}
      >
        {loading ? (
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
        ) : (
          <>
            {members.slice(0, 3).map((member, index) => (
              <div
                key={member.user_id}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white ring-2 ring-white dark:ring-slate-900 ${getAvatarColor(member.email)}`}
                style={{ zIndex: 3 - index }}
                title={member.email}
              >
                {getInitials(member.email)}
              </div>
            ))}
            {members.length > 3 && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 ring-2 ring-white dark:ring-slate-900"
              >
                +{members.length - 3}
              </div>
            )}
          </>
        )}
      </button>

      {/* Members modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                {t('share.members')}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setConfirmLeave(false);
                }}
                className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t('share.membersCount', { count: members.length })}
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {members.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium text-white ${getAvatarColor(member.email)}`}
                  >
                    {getInitials(member.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {member.email}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {member.user_id === currentUserId ? t('share.you') : t('share.member')}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Leave list section */}
            {isShared && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                {confirmLeave ? (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {t('share.confirmLeave')}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmLeave(false)}
                        disabled={leavingList}
                        className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={handleLeaveList}
                        disabled={leavingList}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-400 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {leavingList ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          t('share.leaveList')
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmLeave(true)}
                    className="w-full px-4 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    {t('share.leaveList')}
                  </button>
                )}
              </div>
            )}

            {isOnlyMember && (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                {t('share.onlyMemberHint')}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
