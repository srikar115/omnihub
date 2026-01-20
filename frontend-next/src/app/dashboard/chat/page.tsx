'use client';

import { ChatView } from '@/components/chat';
import { useDashboard } from '../layout';

export default function ChatPage() {
  const { user, updateUserCredits, showAuthModal } = useDashboard();

  return (
    <div className="flex-1 flex flex-col min-h-0 h-[calc(100vh-80px)]">
      <ChatView
        user={user}
        updateUserCredits={updateUserCredits}
        showAuthModal={showAuthModal}
      />
    </div>
  );
}
