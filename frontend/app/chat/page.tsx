"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowLeft, LogOut, MessageCircle, Plus, Search, Send, ShieldCheck, Users } from "lucide-react";

type Person = { id: number; name: string; username: string; profile_photo?: string | null; is_online?: boolean };
type Conversation = {
  id: number; conversation_type: "direct" | "group"; title: string | null;
  last_message_body?: string | null; last_message_type?: string | null;
  last_message_at?: string | null; members: Person[];
};
type ChatMessage = { id: number; conversation_id: number; sender_user_id: number; sender_name: string; sender_username: string; message_type: string; body: string | null; created_at: string };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) { window.location.assign("/login"); throw new Error("Please sign in again."); }
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data as T;
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<Person[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadConversations = useCallback(async () => {
    const data = await api<{ conversations: Conversation[] }>("/api/chat/conversations");
    setConversations(data.conversations);
  }, []);

  const loadMessages = useCallback(async (conversation: Conversation) => {
    setLoadingMessages(true);
    try {
      const data = await api<{ messages: ChatMessage[] }>(`/api/chat/conversations/${conversation.id}/messages?limit=60`);
      setMessages(data.messages);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load messages"); }
    finally { setLoadingMessages(false); }
  }, []);

  useEffect(() => {
    api<{ user: { id: number } }>("/api/auth/me")
      .then(data => setCurrentUserId(data.user.id))
      .catch(err => setError(err instanceof Error ? err.message : "Could not verify session"));
    loadConversations().catch(err => setError(err instanceof Error ? err.message : "Could not load chats"));
  }, [loadConversations]);

  useEffect(() => {
    if (selected) loadMessages(selected);
    else setMessages([]);
  }, [selected?.id, loadMessages]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) { setUsers([]); setSearching(false); return; }
    let active = true;
    setSearching(true);
    const timer = window.setTimeout(() => {
      api<{ users: Person[] }>(`/api/chat/users?q=${encodeURIComponent(trimmed)}`)
        .then(data => { if (active) setUsers(data.users); })
        .catch(err => { if (active) setError(err instanceof Error ? err.message : "Search failed"); })
        .finally(() => { if (active) setSearching(false); });
    }, 300);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query]);

  async function startDirect(person: Person) {
    setBusy(true); setError("");
    try {
      const data = await api<{ conversation_id: number }>("/api/chat/conversations", {
        method: "POST", body: JSON.stringify({ conversation_type: "direct", member_ids: [person.id] }),
      });
      await loadConversations();
      const found = conversations.find(item => item.id === data.conversation_id);
      const conversation: Conversation = found || { id: data.conversation_id, conversation_type: "direct", title: null, members: [person] };
      setSelected(conversation); setQuery(""); setUsers([]);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not start chat"); }
    finally { setBusy(false); }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !draft.trim() || busy) return;
    const body = draft.trim();
    setBusy(true); setError("");
    try {
      await api(`/api/chat/conversations/${selected.id}/messages`, { method: "POST", body: JSON.stringify({ body }) });
      setDraft("");
      await loadMessages(selected);
      await loadConversations();
    } catch (err) { setError(err instanceof Error ? err.message : "Message could not be sent"); }
    finally { setBusy(false); }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/");
  }

  function conversationName(conversation: Conversation) {
    return conversation.conversation_type === "group" ? (conversation.title || "Group chat") : (conversation.members[0]?.name || conversation.members[0]?.username || "New conversation");
  }

  return (
    <main className="chat-page-shell">
      <header className="chat-page-top">
        <Link className="brand" href="/"><span className="brand-mark"><MessageCircle size={19}/></span><span>talviro<span className="brand-dot">.</span></span></Link>
        <div className="chat-top-actions"><span className="chat-beta"><i/> Chat beta</span><button onClick={logout} className="account-logout"><LogOut size={15}/> Sign out</button></div>
      </header>
      <section className="messenger-layout">
        <aside className="messenger-sidebar">
          <div className="messenger-heading"><div><div className="eyebrow">YOUR SPACE</div><h1>Messages</h1></div><span className="messenger-count">{conversations.length}</span></div>
          <label className="messenger-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find people by name or username" aria-label="Search people"/></label>
          {query.trim().length >= 2 ? <div className="search-results">
            <div className="result-caption">{searching ? "Searching…" : `People · ${users.length}`}</div>
            {users.map(person => <button key={person.id} className="person-result" onClick={() => startDirect(person)} disabled={busy}><span className="person-avatar">{person.name.slice(0,1).toUpperCase()}</span><span className="person-result-text"><b>{person.name}</b><small>@{person.username}</small></span><Plus size={16}/></button>)}
            {!searching && users.length === 0 && <p className="empty-note">No people found for that search.</p>}
          </div> : <div className="conversation-list">
            <div className="result-caption">RECENT CONVERSATIONS</div>
            {conversations.map(conversation => <button key={conversation.id} className={`conversation-row ${selected?.id === conversation.id ? "conversation-row-active" : ""}`} onClick={() => setSelected(conversation)}>
              <span className="person-avatar">{conversation.conversation_type === "group" ? <Users size={17}/> : conversationName(conversation).slice(0,1).toUpperCase()}</span>
              <span className="conversation-row-text"><b>{conversationName(conversation)}</b><small>{conversation.last_message_body || (conversation.conversation_type === "group" ? "Group conversation" : "Start a conversation")}</small></span>
            </button>)}
            {conversations.length === 0 && <div className="empty-chat"><MessageCircle size={24}/><b>Your chats start here</b><span>Search for someone above to send your first message.</span></div>}
          </div>}
          <div className="messenger-safe"><ShieldCheck size={15}/><span>Only conversation members can read messages.</span></div>
        </aside>
        <section className="messenger-conversation">
          {!selected ? <div className="chat-welcome"><div className="chat-welcome-icon"><MessageCircle size={27}/></div><h2>Your people, right here.</h2><p>Choose a conversation or search for a person to get started.</p></div> : <>
            <header className="messenger-conversation-head"><div className="person-avatar">{conversationName(selected).slice(0,1).toUpperCase()}</div><div><b>{conversationName(selected)}</b><small>{selected.conversation_type === "group" ? "Group conversation" : `@${selected.members[0]?.username || "member"}`}</small></div><button className="refresh-chat" onClick={() => { loadMessages(selected); loadConversations(); }}>Refresh</button></header>
            <div className="message-list" aria-live="polite">
              {loadingMessages && messages.length === 0 && <p className="empty-note">Loading messages…</p>}
              {!loadingMessages && messages.length === 0 && <div className="empty-chat message-empty"><MessageCircle size={23}/><b>Say hello 👋</b><span>Your conversation is ready.</span></div>}
              {messages.map(message => <div key={message.id} className={`chat-bubble-row ${message.sender_user_id === currentUserId ? "own-message" : ""}`}>
                <div className="chat-bubble"><small>{message.sender_name}</small><p>{message.body}</p><time>{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div>
              </div>)}
            </div>
            <form className="message-composer" onSubmit={sendMessage}><input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Write a message…" maxLength={4000} aria-label="Message text"/><button type="submit" disabled={busy || !draft.trim()} aria-label="Send message"><Send size={17}/></button></form>
          </>}
        </section>
      </section>
      {error && <div className="chat-error" role="alert"><span>{error}</span><button onClick={() => setError("")}>Dismiss</button></div>}
      <footer className="chat-page-footer"><Link href="/account"><ArrowLeft size={13}/> Account</Link><span>Talviro Chat · Early build</span></footer>
    </main>
  );
}