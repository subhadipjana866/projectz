import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export default function Chat() {
  const { collaborationId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedChat, setSelectedChat] = useState(null);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch all accepted collaborations for sidebar
  useEffect(() => {
    if (user) fetchChats();
  }, [user]);

  // Auto-select chat from URL param
  useEffect(() => {
    if (collaborationId && chats.length > 0) {
      const chat = chats.find(c => c.id === collaborationId);
      if (chat) setSelectedChat(chat);
    }
  }, [collaborationId, chats]);

  // Fetch messages when a chat is selected
  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
      // Update URL
      if (window.location.pathname !== `/chat/${selectedChat.id}`) {
        navigate(`/chat/${selectedChat.id}`, { replace: true });
      }
    }
  }, [selectedChat?.id]);

  // Supabase Realtime subscription for live chat
  useEffect(() => {
    if (!selectedChat) return;

    const channel = supabase
      .channel(`chat-${selectedChat.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `collaboration_id=eq.${selectedChat.id}`,
        },
        async (payload) => {
          // Fetch the full message with sender info
          const newMsg = payload.new;
          if (newMsg.sender_id === user.id) return; // Already added optimistically

          try {
            const res = await fetch(`/api/collaborations/${selectedChat.id}/messages?userId=${user.id}`);
            const allMessages = await res.json();
            setMessages(allMessages);
          } catch (err) {
            // Fallback: just add the raw message
            setMessages(prev => [...prev, { ...newMsg, sender: { id: newMsg.sender_id } }]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChat?.id, user?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchChats = async () => {
    setLoadingChats(true);
    try {
      const res = await fetch(`/api/collaborations/chats?userId=${user.id}`);
      const data = await res.json();
      setChats(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching chats:', err);
    } finally {
      setLoadingChats(false);
    }
  };

  const fetchMessages = async (chatId) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/collaborations/${chatId}/messages?userId=${user.id}`);
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Optimistic update
    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      collaboration_id: selectedChat.id,
      sender_id: user.id,
      content: messageContent,
      created_at: new Date().toISOString(),
      sender: { id: user.id, display_name: 'You', avatar: null },
      _optimistic: true,
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const res = await fetch(`/api/collaborations/${selectedChat.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: user.id, content: messageContent }),
      });

      if (!res.ok) throw new Error('Failed to send');

      const sent = await res.json();
      // Replace optimistic with real message
      setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? sent : m));
    } catch (err) {
      console.error('Error sending message:', err);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      setNewMessage(messageContent);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const getOtherUser = (chat) => {
    if (chat.sender?.id === user.id) return chat.receiver;
    return chat.sender;
  };

  const getContextLabel = (chat) => {
    if (chat.project) return `📁 ${chat.project.project_name}`;
    if (chat.campaign) return `📄 ${chat.campaign.campaign_name}`;
    return '🤝 General';
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: 'short' });
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar - Chat List */}
      <div className="w-80 border-r border-white/10 flex flex-col bg-[rgba(255,255,255,0.02)]">
        <div className="p-5 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">Messages</h2>
          <p className="text-xs text-slate-500 mt-0.5">{chats.length} conversation{chats.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingChats ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : chats.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-slate-500 text-sm">No conversations yet</p>
              <p className="text-slate-600 text-xs mt-1">Accept a collaboration request to start chatting.</p>
            </div>
          ) : (
            chats.map(chat => {
              const other = getOtherUser(chat);
              const isSelected = selectedChat?.id === chat.id;

              return (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`flex items-center gap-3 px-5 py-4 cursor-pointer transition-all border-b border-white/5 ${isSelected
                    ? 'bg-[#1152d4]/20 border-l-2 border-l-[#1152d4]'
                    : 'hover:bg-white/5 border-l-2 border-l-transparent'
                    }`}
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shrink-0 border border-white/10">
                    {other?.avatar ? (
                      <img src={other.avatar} alt={other.display_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-sm font-bold">{other?.display_name?.[0]?.toUpperCase() || '?'}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                      {other?.display_name || 'Unknown'}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{getContextLabel(chat)}</p>
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0">{formatTime(chat.updated_at)}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {!selectedChat ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-slate-400 text-lg font-medium">Select a conversation</p>
              <p className="text-slate-500 text-sm mt-1">Choose a chat from the sidebar to start messaging.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center gap-4 bg-[rgba(255,255,255,0.02)]">
              {(() => {
                const other = getOtherUser(selectedChat);
                return (
                  <>
                    <div
                      className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shrink-0 cursor-pointer border border-white/10"
                      onClick={() => other && navigate(`/profile/${other.id}`)}
                    >
                      {other?.avatar ? (
                        <img src={other.avatar} alt={other.display_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white text-sm font-bold">{other?.display_name?.[0]?.toUpperCase() || '?'}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white cursor-pointer hover:text-blue-400 transition-colors" onClick={() => other && navigate(`/profile/${other.id}`)}>
                        {other?.display_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-500">{getContextLabel(selectedChat)}</p>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
              {loadingMessages ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-slate-500 text-sm">No messages yet. Say hello! 👋</p>
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isOwn = msg.sender_id === user.id;
                  const showAvatar = idx === 0 || messages[idx - 1]?.sender_id !== msg.sender_id;
                  const isLast = idx === messages.length - 1 || messages[idx + 1]?.sender_id !== msg.sender_id;

                  return (
                    <div key={msg.id} className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'} ${showAvatar ? 'mt-4' : 'mt-0.5'}`}>
                      {/* Avatar for other user */}
                      {!isOwn && (
                        <div className={`w-7 h-7 rounded-full overflow-hidden flex items-center justify-center shrink-0 ${showAvatar ? 'bg-gradient-to-br from-blue-600 to-purple-600 border border-white/10' : 'invisible'}`}>
                          {msg.sender?.avatar ? (
                            <img src={msg.sender.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white text-[10px] font-bold">{msg.sender?.display_name?.[0]?.toUpperCase() || '?'}</span>
                          )}
                        </div>
                      )}

                      <div className={`max-w-[65%] ${isOwn ? 'order-1' : ''}`}>
                        {showAvatar && !isOwn && (
                          <p className="text-[10px] text-slate-500 mb-1 ml-1 font-medium">{msg.sender?.display_name}</p>
                        )}
                        <div
                          className={`px-4 py-2.5 text-sm leading-relaxed ${isOwn
                            ? `bg-[#1152d4] text-white ${isLast ? 'rounded-2xl rounded-br-md' : 'rounded-2xl'}`
                            : `bg-white/[0.07] text-slate-200 border border-white/5 ${isLast ? 'rounded-2xl rounded-bl-md' : 'rounded-2xl'}`
                            } ${msg._optimistic ? 'opacity-70' : ''}`}
                        >
                          {msg.content}
                        </div>
                        {isLast && (
                          <p className={`text-[10px] text-slate-600 mt-1 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
                            {formatTime(msg.created_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="px-6 py-4 border-t border-white/10 bg-[rgba(255,255,255,0.02)]">
              <form onSubmit={sendMessage} className="flex gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="px-5 py-3 bg-[#1152d4] hover:bg-blue-700 text-white rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-blue-500/10"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
