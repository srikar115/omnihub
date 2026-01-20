'use client';

import { ChatView } from '@/components/chat';
import { useDashboard } from '../layout';

export default function ChatPage() {
  const { user, updateUserCredits, showAuthModal } = useDashboard();

  return (
    <div className="h-full">
      <ChatView
        user={user}
        updateUserCredits={updateUserCredits}
        showAuthModal={showAuthModal}
      />
    </div>
  );
}
