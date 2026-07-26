import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { apiFetch } from '../../lib/api';
import { Avatar, Spinner } from '../../components/ui';

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
            const res = await apiFetch(`/api/collaborations/${selectedChat.id}/messages`);
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
      const res = await apiFetch(`/api/collaborations/chats`);
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
      const res = await apiFetch(`/api/collaborations/${chatId}/messages`);
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
      const res = await apiFetch(`/api/collaborations/${selectedChat.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: messageContent }),
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
    <div className="flex flex-1 h-[calc(100dvh-4rem)] lg:h-dvh overflow-hidden">
      {/* Sidebar - Chat List (full width on mobile, hidden once a chat is open) */}
      <div className={`${selectedChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 xl:w-96 border-r border-white/[0.07] flex-col bg-white/[0.015]`}>
        <div className="px-6 py-5 border-b border-white/[0.07] text-left">
          <p className="eyebrow mb-1">Conversations</p>
          <h2 className="text-xl font-bold text-white">Messages</h2>
          <p className="text-xs text-slate-500 mt-1">{chats.length} conversation{chats.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="stagger-children flex-1 overflow-y-auto py-2">
          {loadingChats ? (
            <div className="flex justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : chats.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-slate-400 text-sm font-medium">No conversations yet</p>
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
                  className={`flex items-center gap-3 mx-3 my-0.5 px-3 py-3.5 rounded-xl cursor-pointer transition-all ${isSelected
                    ? 'bg-gradient-to-r from-primary-600/20 to-transparent border border-primary-500/25'
                    : 'border border-transparent hover:bg-white/[0.04]'
                    }`}
                >
                  <Avatar src={other?.avatar} name={other?.display_name} className="w-10 h-10" />
                  <div className="flex-1 min-w-0 text-left">
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

      {/* Main Chat Area (full screen on mobile when a chat is selected) */}
      <div className={`${selectedChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
        {!selectedChat ? (
          <div className="flex-1 flex items-center justify-center relative">
            <div className="absolute inset-0 grid-bg opacity-50" aria-hidden="true" />
            <div className="relative text-center">
              <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
                <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-white text-lg font-semibold">Select a conversation</p>
              <p className="text-slate-500 text-sm mt-1">Choose a chat from the sidebar to start messaging.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-white/[0.07] flex items-center gap-4 bg-white/[0.015] backdrop-blur-sm">
              {(() => {
                const other = getOtherUser(selectedChat);
                return (
                  <>
                    <button
                      className="md:hidden p-1.5 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                      onClick={() => { setSelectedChat(null); navigate('/chat', { replace: true }); }}
                      aria-label="Back to conversations"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <Avatar
                      src={other?.avatar}
                      name={other?.display_name}
                      className="w-10 h-10"
                      onClick={() => other && navigate(`/profile/${other.id}`)}
                    />
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-white cursor-pointer hover:text-primary-300 transition-colors" onClick={() => other && navigate(`/profile/${other.id}`)}>
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
                  <Spinner className="h-8 w-8" />
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
                        showAvatar ? (
                          <Avatar src={msg.sender?.avatar} name={msg.sender?.display_name} className="w-7 h-7" textSize="text-[10px]" />
                        ) : (
                          <div className="w-7 h-7 shrink-0" />
                        )
                      )}

                      <div className={`max-w-[70%] sm:max-w-[60%] ${isOwn ? 'order-1' : ''}`}>
                        {showAvatar && !isOwn && (
                          <p className="text-[10px] text-slate-500 mb-1 ml-1 font-medium text-left">{msg.sender?.display_name}</p>
                        )}
                        <div
                          className={`px-4 py-2.5 text-sm leading-relaxed text-left ${isOwn
                            ? `bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-glow-primary ${isLast ? 'rounded-2xl rounded-br-md' : 'rounded-2xl'}`
                            : `bg-white/[0.06] text-slate-200 border border-white/[0.06] ${isLast ? 'rounded-2xl rounded-bl-md' : 'rounded-2xl'}`
                            } ${msg._optimistic ? 'opacity-70' : ''}`}
                        >
                          {msg.content}
                        </div>
                        {isLast && (
                          <p className={`text-[10px] text-slate-600 mt-1 ${isOwn ? 'text-right mr-1' : 'text-left ml-1'}`}>
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
            <div className="px-6 py-4 border-t border-white/[0.07] bg-white/[0.015]">
              <form onSubmit={sendMessage} className="flex gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message…"
                  className="field flex-1 !rounded-2xl px-5"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="btn-primary !rounded-2xl px-5 disabled:opacity-30"
                  aria-label="Send message"
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
