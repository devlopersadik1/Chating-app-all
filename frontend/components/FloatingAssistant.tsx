"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, Minimize2, Send, Sparkles, X } from "lucide-react";
type Item = { role: "user" | "assistant"; content: string };
const starters = ["How do I start a chat?", "How do I keep my account safe?", "What can Talviro do?"];
export default function FloatingAssistant() {
 const [open,setOpen]=useState(false),[draft,setDraft]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [items,setItems]=useState<Item[]>([{role:"assistant",content:"Hi! I’m Talviro AI. Ask me about using Talviro Chat, account settings, privacy, or troubleshooting."}]);
 const endRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth",block:"end"});},[items,open,busy]);
 async function send(text=draft){
  const content=text.trim(); if(!content||busy)return;
  const next=[...items,{role:"user" as const,content}]; setItems(next);setDraft("");setError("");setBusy(true);
  try {const response=await fetch("/api/assistant",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:next.slice(-12)})});const data=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(data.message||"The assistant is temporarily unavailable.");
   setItems(current=>[...current,{role:"assistant",content:String(data.reply||"I couldn't prepare a reply.")}]);
  } catch(err){setError(err instanceof Error?err.message:"Could not connect to Talviro AI.");}finally{setBusy(false);}
 }
 function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();void send();}
 return <div className="talviro-ai-root">
  {open&&<section className="talviro-ai-panel" aria-label="Talviro AI assistant">
   <header className="talviro-ai-head"><span className="talviro-ai-avatar"><Sparkles size={19}/></span><span className="talviro-ai-heading"><b>Talviro AI</b><small><i/> Assistant</small></span><button type="button" className="talviro-ai-head-button" aria-label="Minimize assistant" onClick={()=>setOpen(false)}><Minimize2 size={17}/></button><button type="button" className="talviro-ai-head-button" aria-label="Close assistant" onClick={()=>setOpen(false)}><X size={18}/></button></header>
   <div className="talviro-ai-messages" aria-live="polite"><div className="talviro-ai-intro"><span className="talviro-ai-spark"><Bot size={20}/></span><b>Your helpful sidekick</b><p>Ask a question or choose a suggestion to get started.</p></div>
   {items.map((item,index)=><div key={index} className={`talviro-ai-bubble ${item.role==="user"?"talviro-ai-user":"talviro-ai-reply"}`}>{item.content}</div>)}
   {busy&&<div className="talviro-ai-bubble talviro-ai-reply talviro-ai-thinking"><i/><i/><i/> Thinking…</div>}
   {error&&<div className="talviro-ai-error">{error} <button type="button" onClick={()=>void send(items[items.length-1]?.content||"")}>Retry</button></div>}
   {items.length===1&&<div className="talviro-ai-starters">{starters.map(s=><button key={s} type="button" onClick={()=>void send(s)}>{s}</button>)}</div>}<div ref={endRef}/></div>
   <form className="talviro-ai-composer" onSubmit={submit}><input value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Ask Talviro AI…" maxLength={2000} aria-label="Message Talviro AI"/><button type="submit" disabled={busy||!draft.trim()} aria-label="Send to AI"><Send size={17}/></button></form>
   <div className="talviro-ai-foot">AI can make mistakes. Don’t share passwords or private keys.</div>
  </section>}
  <button type="button" className={`talviro-ai-launcher ${open?"is-open":""}`} onClick={()=>setOpen(v=>!v)} aria-label={open?"Close Talviro AI":"Open Talviro AI"} aria-expanded={open}>{open?<X size={24}/>:<><Sparkles size={23}/><span className="talviro-ai-launcher-dot"/></>}</button>
 </div>;
}