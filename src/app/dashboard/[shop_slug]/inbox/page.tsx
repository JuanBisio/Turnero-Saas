'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useParams } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { format, differenceInHours } from 'date-fns'
import { es } from 'date-fns/locale'
import { Send, Clock, User, Phone } from 'lucide-react'

// Types
type Contact = {
  id: string
  phone: string
  name: string
  last_message_at: string
  unread_count: number
}

type Message = {
  id: string
  direction: 'inbound' | 'outbound'
  content: string
  created_at: string
  status: string
}

export default function InboxPage() {
  const { shop_slug } = useParams()
  const supabase = createClientComponentClient()
  
  // State
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [shopId, setShopId] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 1. Fetch Shop ID
  useEffect(() => {
    async function getShopId() {
      const { data } = await supabase.from('shops').select('id').eq('slug', shop_slug).single()
      if (data) setShopId(data.id)
    }
    getShopId()
  }, [shop_slug])

  // 2. Load Contacts & Subscribe
  useEffect(() => {
    if (!shopId) return

    fetchContacts()

    const channel = supabase
      .channel('inbox_contacts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inbox_contacts', filter: `shop_id=eq.${shopId}` },
        (payload) => {
           fetchContacts() // Refresh list on change
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [shopId])

  async function fetchContacts() {
    const { data } = await supabase
      .from('inbox_contacts')
      .select('*')
      .eq('shop_id', shopId)
      .order('last_message_at', { ascending: false })
    
    if (data) setContacts(data)
    setIsLoading(false)
  }

  // 3. Load Messages & Subscribe to Selected Contact
  useEffect(() => {
    if (!selectedContact) {
      setMessages([])
      return
    }

    fetchMessages(selectedContact.id)

    const channel = supabase
      .channel(`inbox_messages:${selectedContact.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'inbox_messages', filter: `contact_id=eq.${selectedContact.id}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
          // Reset unread count locally if needed (optional)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedContact])

  async function fetchMessages(contactId: string) {
    const { data } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: true })
    
    if (data) setMessages(data)
    
    // Mark as read (reset unread_count)
    await supabase.from('inbox_contacts').update({ unread_count: 0 }).eq('id', contactId)
    // Update local list to clear badge
    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, unread_count: 0 } : c))
  }

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send Message Logic
  async function handleSendMessage(e?: React.FormEvent) {
    e?.preventDefault()
    if (!newMessage.trim() || !selectedContact) return

    const tempMsg: Message = {
      id: 'temp-' + Date.now(),
      direction: 'outbound',
      content: newMessage,
      created_at: new Date().toISOString(),
      status: 'sending'
    }

    setMessages(prev => [...prev, tempMsg])
    setNewMessage('')

    // Connect to n8n Outbound Webhook
    try {
      // PROD URL for 'bisiojuan.app.n8n.cloud' with path 'whatsapp-outbound'
      const N8N_WEBHOOK_URL = 'https://bisiojuan.app.n8n.cloud/webhook/whatsapp-outbound'

      await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: selectedContact.phone,
          message: newMessage,
          contact_id: selectedContact.id
        })
      })

      // We optmistically added the message to UI state above.
      // Final confirmation relies on Realtime subscription.
    } catch (err) {
       console.error('Error sending to n8n:', err)
       alert('Error de conexión con n8n')
    }
  }

  // 24h Rule Check
  const lastMsgTime = selectedContact ? new Date(selectedContact.last_message_at) : new Date()
  const hoursSinceLastMsg = differenceInHours(new Date(), lastMsgTime)
  const is24hWindowClosed = hoursSinceLastMsg >= 24

  return (
    <div className="flex h-[calc(100vh-100px)] rounded-3xl overflow-hidden glass-card-dark border border-white/10">
      
      {/* Sidebar: Contacts List */}
      <div className="w-1/3 border-r border-white/10 flex flex-col bg-black/20">
        <div className="p-4 border-b border-white/10">
          <h2 className="font-heading font-bold text-xl text-white">Mensajes</h2>
          <p className="text-xs text-slate-400">Tus conversaciones de WhatsApp</p>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {isLoading && <div className="p-4 text-center text-slate-500">Cargando...</div>}
          
          {!isLoading && contacts.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              <p>No hay mensajes aún.</p>
            </div>
          )}

          {contacts.map(contact => (
            <button
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              className={`w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors border-b border-white/5 text-left ${
                selectedContact?.id === contact.id ? 'bg-white/10 border-l-4 border-l-purple-500' : ''
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-purple-300 font-bold">
                {contact.name ? contact.name[0].toUpperCase() : <User size={18}/>}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-200 truncate">{contact.name || contact.phone}</span>
                  {contact.unread_count > 0 && (
                    <span className="bg-green-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {contact.unread_count}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 truncate">{contact.phone}</span>
                  <span className="text-[10px] text-slate-600">
                    {format(new Date(contact.last_message_at), 'HH:mm', { locale: es })}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-black/40">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                    <User size={20} className="text-slate-300" />
                 </div>
                 <div>
                    <h3 className="font-bold text-white">{selectedContact.name || 'Desconocido'}</h3>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Phone size={10} /> {selectedContact.phone}
                    </div>
                 </div>
              </div>
              {is24hWindowClosed && (
                 <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-500 text-xs">
                    <Clock size={12} />
                    <span>Ventana de 24h Cerrada</span>
                 </div>
              )}
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
               {messages.map((msg, idx) => {
                 const isMe = msg.direction === 'outbound'
                 return (
                   <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                     <div className={`
                        max-w-[70%] rounded-2xl p-3 text-sm
                        ${isMe 
                          ? 'bg-purple-600 text-white rounded-tr-none' 
                          : 'bg-zinc-800 text-slate-200 rounded-tl-none border border-white/10'}
                     `}>
                        <p>{msg.content}</p>
                        <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-purple-200' : 'text-zinc-500'}`}>
                           {format(new Date(msg.created_at), 'HH:mm', { locale: es })}
                           {isMe && <span className="ml-1 opacity-70">✓</span>}
                        </p>
                     </div>
                   </div>
                 )
               })}
               <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/10 bg-white/5">
               {is24hWindowClosed ? (
                 <div className="text-center">
                    <p className="text-xs text-slate-400 mb-2">
                       Pasaron más de 24hs desde el último mensaje del usuario. Solo puedes enviar plantillas.
                    </p>
                    <button className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm transition-colors border border-white/10">
                       Enviar Plantilla de Reactivación
                    </button>
                 </div>
               ) : (
                 <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Escribe un mensaje..."
                      className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                    />
                    <button 
                      type="submit" 
                      disabled={!newMessage.trim()}
                      className="p-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all"
                    >
                      <Send size={18} />
                    </button>
                 </form>
               )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
             <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl">💬</span>
             </div>
             <p>Selecciona una conversación para empezar</p>
          </div>
        )}
      </div>

    </div>
  )
}
