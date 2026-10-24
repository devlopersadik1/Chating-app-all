import FloatingAssistant from "../components/FloatingAssistant";
import {
  ArrowUpRight, AudioLines, CheckCheck, ChevronRight, CircleHelp,
  LockKeyhole, MessageCircle, Mic, MoreHorizontal, Paperclip, Phone,
  Search, Send, ShieldCheck, Sparkles, Video, Zap
} from "lucide-react";

const chats = [
  { initials: "AM", name: "Ariana Morgan", message: "That new concept is perfect ✨", time: "Now", color: "lavender", unread: 2 },
  { initials: "DK", name: "Design circle", message: "Maya: shared a new file", time: "9:41", color: "mint", unread: 4 },
  { initials: "JL", name: "Jordan Lee", message: "Voice message · 0:18", time: "Yesterday", color: "amber", unread: 0 },
];

export default function HomePage() {
  return (
    <main className="site-shell">
      <nav className="topbar">
        <a className="brand" href="#" aria-label="Talviro home">
          <span className="brand-mark"><MessageCircle size={21} strokeWidth={2.5} /></span>
          <span>talviro<span className="brand-dot">.</span></span>
        </a>
        <div className="nav-links"><a href="#experience">Experience</a><a href="#privacy">Privacy</a><a href="#features">Features</a></div>
        <div className="nav-actions"><a className="nav-login" href="/login">Sign in</a><a className="nav-cta" href="/register">Get started <ArrowUpRight size={15}/></a></div>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="pulse" /> A more thoughtful way to connect</div>
          <h1>Conversations,<br/><span>closer than ever.</span></h1>
          <p className="hero-text">Your people, your moments, your space. A beautifully calm messaging experience designed to bring every conversation to life.</p>
          <div className="hero-actions"><a className="button-primary" href="#preview">Explore the experience <ChevronRight size={17}/></a><a className="button-quiet" href="#features">Discover features <ArrowUpRight size={15}/></a></div>
          <div className="trust-line"><span className="avatar-stack"><i>J</i><i>M</i><i>A</i><i>+</i></span><span>Made for the conversations that matter</span></div>
        </div>
        <div className="hero-visual" id="preview">
          <div className="glow glow-one"/><div className="glow glow-two"/>
          <div className="app-window">
            <aside className="app-rail"><div className="mini-brand"><MessageCircle size={18}/></div><div className="rail-icon active"><MessageCircle size={17}/></div><div className="rail-icon"><Phone size={17}/></div><div className="rail-icon"><Sparkles size={17}/></div><div className="rail-bottom"><div className="tiny-avatar">S</div></div></aside>
            <section className="chat-sidebar"><div className="sidebar-top"><div><b>Messages</b><span className="online-label">Your space, in sync</span></div><button className="icon-button" aria-label="More messages"><MoreHorizontal size={18}/></button></div><div className="search-box"><Search size={14}/><span>Search conversations</span><kbd>⌘ K</kbd></div><div className="filter-row"><span className="filter active-filter">All chats</span><span className="filter">Unread</span></div>
              {chats.map((chat) => <div className="chat-item" key={chat.name}><div className={`chat-avatar ${chat.color}`}>{chat.initials}<i/></div><div className="chat-meta"><div className="chat-title"><b>{chat.name}</b><time>{chat.time}</time></div><div className="chat-message">{chat.message}</div></div>{chat.unread > 0 && <span className="unread">{chat.unread}</span>}</div>)}
              <div className="sidebar-foot"><ShieldCheck size={14}/> Your conversations belong to you</div>
            </section>
            <section className="conversation"><header className="conversation-head"><div className="chat-avatar lavender small-avatar">AM<i/></div><div className="person-name"><b>Ariana Morgan</b><span><i className="green-dot"/> Active now</span></div><div className="call-actions"><button className="icon-button" aria-label="Voice call"><Phone size={16}/></button><button className="icon-button" aria-label="Video call"><Video size={17}/></button><button className="icon-button" aria-label="More options"><MoreHorizontal size={17}/></button></div></header>
              <div className="date-divider"><span>Today · 10:42 AM</span></div>
              <div className="message received"><span className="message-text">Hey! I sent over the new moodboard. What do you think? 🌿</span><small>10:42 <CheckCheck size={12}/></small></div>
              <div className="file-card"><div className="file-icon"><Sparkles size={19}/></div><div><b>Spring-moodboard.fig</b><span>Figma file · 8.4 MB</span></div><ArrowUpRight size={15}/></div>
              <div className="message sent"><span className="message-text">This is exactly the direction. Love how it feels ✨</span><small>10:43 <CheckCheck size={12}/></small></div>
              <div className="typing"><span/><span/><span/> Ariana is typing</div>
              <div className="composer"><Paperclip size={17}/><span>Write a message...</span><Mic size={17}/><button aria-label="Send message"><Send size={15}/></button></div>
            </section>
          </div>
          <div className="floating-note note-top"><span className="note-icon"><LockKeyhole size={15}/></span><div><b>Privacy comes first</b><small>Built with care</small></div><span className="note-check">✓</span></div>
          <div className="floating-note note-bottom"><span className="wave"><AudioLines size={21}/></span><div><b>Every voice, clearer</b><small>Calls that feel close</small></div><span className="wave-bars"><i/><i/><i/><i/><i/></span></div>
        </div>
        <div className="hero-orb orb-left"/><div className="hero-orb orb-right"/>
      </section>

      <section className="metrics" id="experience"><div><span className="metric-icon"><Zap size={16}/></span><b>Feels instant</b><small>A fluid, focused experience</small></div><div><span className="metric-icon mint-icon"><ShieldCheck size={16}/></span><b>Privacy minded</b><small>Your space, your controls</small></div><div><span className="metric-icon peach-icon"><AudioLines size={16}/></span><b>More ways to connect</b><small>Text, voice, video and more</small></div><div><span className="metric-icon blue-icon"><Sparkles size={16}/></span><b>Made to feel yours</b><small>A space that fits your style</small></div></section>

      <section className="features-section" id="features"><div className="section-heading"><div className="eyebrow">Thoughtfully connected</div><h2>Everything in its right place.</h2><p>Less clutter. More connection. A unified space for your daily conversations.</p></div><div className="feature-grid"><article className="feature-card feature-large"><span className="feature-symbol purple-symbol"><MessageCircle size={21}/></span><div className="feature-art chat-art"><span/><span/><span/></div><h3>Chats that flow naturally</h3><p>Private conversations, group spaces, media and voice messages in one considered interface.</p></article><article className="feature-card"><span className="feature-symbol mint-symbol"><Video size={21}/></span><div className="call-art"><div className="call-avatar">A</div><div className="call-bars"><i/><i/><i/><i/><i/><i/><i/></div><div className="call-controls"><Phone size={13}/><Video size={13}/><AudioLines size={13}/></div></div><h3>Feel closer, wherever you are</h3><p>Voice, video and group calling designed around the people you care about.</p></article><article className="feature-card" id="privacy"><span className="feature-symbol blue-symbol"><LockKeyhole size={21}/></span><div className="privacy-art"><ShieldCheck size={43}/><span>Privacy first</span><i/><i/><i/></div><h3>Your privacy, your say</h3><p>Clear controls for account access, blocked users and personal preferences.</p></article></div></section>

      <section className="closing"><div className="closing-icon"><CircleHelp size={21}/></div><div><h2>A calmer home for your conversations.</h2><p>Talviro is being built step by step, with thoughtful design and secure foundations.</p></div><a href="#top" className="button-primary">Back to top <ArrowUpRight size={16}/></a></section>
      <footer><a className="brand footer-brand" href="#"><span className="brand-mark"><MessageCircle size={17}/></span><span>talviro<span className="brand-dot">.</span></span></a><span>Thoughtfully made for meaningful connection.</span><span>© 2026 Talviro Chat · Preview build</span></footer>
    </main>
    <FloatingAssistant />
  );
}