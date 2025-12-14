'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '@/contexts/LanguageContext';
import { useNotification } from '@/contexts/NotificationContext';
import { ShoppingListService } from '@/lib/shoppingListService';

export default function ShareListButton({ listId, userId, externalOpen = false, onExternalClose, showButton = true }) {
  const t = useTranslations();
  const { showSuccess, showError } = useNotification();
  const [internalOpen, setInternalOpen] = useState(false);

  // Use external control if provided, otherwise use internal state
  const isOpen = externalOpen || internalOpen;
  const setIsOpen = (value) => {
    setInternalOpen(value);
    if (!value && onExternalClose) {
      onExternalClose();
    }
  };
  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && listId) {
      loadExistingLink();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, listId]);

  const loadExistingLink = async () => {
    try {
      const existing = await ShoppingListService.getActiveShareLink(listId);
      setShareLink(existing);
    } catch (error) {
      console.error('Error loading existing share link:', error);
    }
  };

  const handleGenerateLink = async () => {
    if (!listId || !userId) return;

    setLoading(true);
    try {
      const link = await ShoppingListService.generateShareLink(listId, userId);
      setShareLink(link);
      showSuccess(t('share.linkGenerated'));
    } catch (error) {
      console.error('Error generating share link:', error);
      showError(t('share.errorGenerating'));
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeLink = async () => {
    if (!listId) return;

    setLoading(true);
    try {
      await ShoppingListService.revokeShareLink(listId);
      setShareLink(null);
      showSuccess(t('share.linkRevoked'));
    } catch (error) {
      console.error('Error revoking share link:', error);
      showError(t('share.errorRevoking'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink?.url) return;

    try {
      await navigator.clipboard.writeText(shareLink.url);
      setCopied(true);
      showSuccess(t('share.linkCopied'));
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying link:', error);
      showError(t('share.errorCopying'));
    }
  };

  const formatExpiry = (expiresAt) => {
    if (!expiresAt) return '';
    const date = new Date(expiresAt);
    const now = new Date();
    const diffMs = date - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return t('share.expired');
    if (diffDays === 1) return t('share.expiresIn1Day');
    return t('share.expiresInDays', { days: diffDays });
  };

  return (
    <>
      {showButton && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          aria-label={t('share.shareList')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span className="hidden sm:inline">{t('share.shareList')}</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                {t('share.title')}
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t('share.description')}
            </p>

            {shareLink ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <input
                    type="text"
                    readOnly
                    value={shareLink.url}
                    className="flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-300 outline-none truncate"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`p-2 rounded-lg transition-colors ${
                      copied
                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {copied ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatExpiry(shareLink.expiresAt)}
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleGenerateLink}
                    disabled={loading}
                    className="flex-1 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {t('share.regenerate')}
                  </button>
                  <button
                    type="button"
                    onClick={handleRevokeLink}
                    disabled={loading}
                    className="flex-1 px-4 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {t('share.revoke')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGenerateLink}
                disabled={loading}
                className="w-full px-4 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    {t('share.generateLink')}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
