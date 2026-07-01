import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// GET all transactions
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    const formatted = data.map((t) => ({
      id: t.id,
      memberId: t.member_id,
      amount: t.amount,
      date: t.date,
      type: t.type,
      note: t.note,
      createdAt: Number(t.created_at),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create transaction
export async function POST(request) {
  try {
    const body = await request.json();
    const { id, memberId, amount, date, type, note, createdAt } = body;

    if (!id || !memberId || !amount || !date || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        id,
        member_id: memberId,
        amount,
        date,
        type,
        note: note || null,
        created_at: createdAt || Date.now(),
      })
      .select();

    if (error) throw error;
    return NextResponse.json(data[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
