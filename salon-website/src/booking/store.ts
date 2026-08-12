import type { Block, Booking, Busy } from './types'

/**
 * Where bookings live.
 *
 * With Supabase credentials present, every visitor and the admin panel read
 * and write the same table, which is what makes availability mean anything.
 * Without them the store falls back to this browser's localStorage: useful
 * for trying the flow out, useless as a real book, because a booking made
 * on a customer's phone never reaches anyone else. The UI says so.
 */
export type StoreMode = 'shared' | 'local'

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const storeMode: StoreMode = URL && KEY ? 'shared' : 'local'

export interface BookingStore {
  /**
   * When a chair is occupied, and nothing else.
   *
   * This is what the public booking form runs on. It deliberately cannot
   * return names or phone numbers: anyone can read what this returns, so
   * it must not carry anything a customer would mind a stranger seeing.
   */
  listBusy(fromDate: string, toDate: string): Promise<Busy[]>

  /** Full customer details. Requires a signed-in barber. */
  listBookings(fromDate: string, toDate: string): Promise<Booking[]>
  listBlocks(fromDate: string, toDate: string): Promise<Block[]>
  createBooking(b: Omit<Booking, 'id' | 'createdAt' | 'cancelled'>): Promise<Booking>
  cancelBooking(id: string): Promise<void>
  createBlock(b: Omit<Block, 'id'>): Promise<Block>
  deleteBlock(id: string): Promise<void>

  /** Local mode checks a password in the bundle; shared mode uses real auth. */
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  hasSession(): Promise<boolean>
}

const newId = () =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)

/* ── localStorage ─────────────────────────────────────────────────── */

const BOOKINGS = 'gb_bookings'
const BLOCKS = 'gb_blocks'

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function write<T>(key: string, rows: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(rows))
  } catch {
    /* private mode, quota — nothing useful to do here */
  }
}

const LOCAL_PASSWORD = (import.meta.env.VITE_ADMIN_PASSWORD as string | undefined) || 'gentlemens'
const LOCAL_SESSION = 'gb_admin_ok'

const localStore: BookingStore = {
  async listBusy(from, to) {
    const [bookings, blocks] = await Promise.all([this.listBookings(from, to), this.listBlocks(from, to)])
    return [...bookings, ...blocks].map((b) => ({ date: b.date, time: b.time, duration: b.duration }))
  },
  async signIn(_email, password) {
    if (password !== LOCAL_PASSWORD) throw new Error('BAD_CREDENTIALS')
    sessionStorage.setItem(LOCAL_SESSION, '1')
  },
  async signOut() { sessionStorage.removeItem(LOCAL_SESSION) },
  async hasSession() { return sessionStorage.getItem(LOCAL_SESSION) === '1' },
  async listBookings(from, to) {
    return read<Booking>(BOOKINGS)
      .filter((b) => !b.cancelled && b.date >= from && b.date <= to)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  },
  async listBlocks(from, to) {
    return read<Block>(BLOCKS)
      .filter((b) => b.date >= from && b.date <= to)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  },
  async createBooking(input) {
    const all = read<Booking>(BOOKINGS)
    const booking: Booking = { ...input, id: newId(), createdAt: new Date().toISOString(), cancelled: false }
    all.push(booking)
    write(BOOKINGS, all)
    return booking
  },
  async cancelBooking(id) {
    write(BOOKINGS, read<Booking>(BOOKINGS).map((b) => (b.id === id ? { ...b, cancelled: true } : b)))
  },
  async createBlock(input) {
    const all = read<Block>(BLOCKS)
    const block: Block = { ...input, id: newId() }
    all.push(block)
    write(BLOCKS, all)
    return block
  },
  async deleteBlock(id) {
    write(BLOCKS, read<Block>(BLOCKS).filter((b) => b.id !== id))
  },
}

/* ── Supabase ─────────────────────────────────────────────────────── */

// Loaded on demand so sites that never configure it do not ship the client.
let clientPromise: Promise<any> | null = null
function client() {
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then((m) => m.createClient(URL!, KEY!))
  }
  return clientPromise
}

const fromRow = (r: any): Booking => ({
  id: r.id,
  date: r.date,
  time: r.time.slice(0, 5),
  serviceId: r.service_id,
  serviceName: r.service_name,
  price: r.price,
  duration: r.duration,
  name: r.name,
  phone: r.phone,
  email: r.email ?? '',
  note: r.note ?? '',
  createdAt: r.created_at,
  cancelled: r.cancelled,
})

const sharedStore: BookingStore = {
  // Reads a view that exposes only when the chair is taken. The bookings
  // table itself is closed to anonymous readers by row level security.
  async listBusy(from, to) {
    const sb = await client()
    const { data, error } = await sb
      .from('busy_slots').select('date,time,duration')
      .gte('date', from).lte('date', to)
    if (error) throw new Error(error.message)
    return (data ?? []).map((r: any) => ({ date: r.date, time: r.time.slice(0, 5), duration: r.duration }))
  },
  async signIn(email, password) {
    const sb = await client()
    const { error } = await sb.auth.signInWithPassword({ email, password })
    if (error) throw new Error('BAD_CREDENTIALS')
  },
  async signOut() {
    const sb = await client()
    await sb.auth.signOut()
  },
  async hasSession() {
    const sb = await client()
    const { data } = await sb.auth.getSession()
    return !!data.session
  },
  async listBookings(from, to) {
    const sb = await client()
    const { data, error } = await sb
      .from('bookings').select('*')
      .gte('date', from).lte('date', to).eq('cancelled', false)
      .order('date').order('time')
    if (error) throw new Error(error.message)
    return (data ?? []).map(fromRow)
  },
  async listBlocks(from, to) {
    const sb = await client()
    const { data, error } = await sb
      .from('blocks').select('*')
      .gte('date', from).lte('date', to)
      .order('date').order('time')
    if (error) throw new Error(error.message)
    return (data ?? []).map((r: any) => ({
      id: r.id, date: r.date, time: r.time.slice(0, 5), duration: r.duration, reason: r.reason ?? '',
    }))
  },
  async createBooking(input) {
    const sb = await client()
    // No .select() back: row level security denies anonymous reads of this
    // table, so asking for the inserted row would fail even though the
    // insert succeeded. The caller already knows what it sent.
    const { error } = await sb.from('bookings').insert({
      date: input.date, time: input.time,
      service_id: input.serviceId, service_name: input.serviceName,
      price: input.price, duration: input.duration,
      name: input.name, phone: input.phone, email: input.email, note: input.note,
    })
    // A unique index on (date, time) settles the race when two people take
    // the same start time: the loser is told to pick again.
    if (error) {
      if (error.code === '23505') throw new Error('SLOT_TAKEN')
      throw new Error(error.message)
    }
    return { ...input, id: newId(), createdAt: new Date().toISOString(), cancelled: false }
  },
  async cancelBooking(id) {
    const sb = await client()
    const { error } = await sb.from('bookings').update({ cancelled: true }).eq('id', id)
    if (error) throw new Error(error.message)
  },
  async createBlock(input) {
    const sb = await client()
    const { data, error } = await sb.from('blocks')
      .insert({ date: input.date, time: input.time, duration: input.duration, reason: input.reason })
      .select().single()
    if (error) throw new Error(error.message)
    return { id: data.id, date: data.date, time: data.time.slice(0, 5), duration: data.duration, reason: data.reason ?? '' }
  },
  async deleteBlock(id) {
    const sb = await client()
    const { error } = await sb.from('blocks').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },
}

export const store: BookingStore = storeMode === 'shared' ? sharedStore : localStore
