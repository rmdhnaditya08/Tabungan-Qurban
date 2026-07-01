import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// GET all confirmations
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('confirmations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // We need to fetch members to populate memberName if it's not stored
    // But since schema includes member_name in front-end, let's join or select.
    // Wait, in our schema we created confirmations with `proof_image`, let's map.
    const formatted = data.map((c) => ({
      id: c.id,
      memberId: c.member_id,
      amount: c.amount,
      date: c.date,
      note: c.note,
      proofImage: c.proof_image || undefined,
      status: c.status,
      createdAt: Number(c.created_at),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create or update confirmation
export async function POST(request) {
  try {
    const body = await request.json();
    const { id, memberId, amount, date, note, proofImage, status, createdAt } = body;

    if (!id || !memberId || !amount || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('confirmations')
      .upsert({
        id,
        member_id: memberId,
        amount,
        date,
        note: note || null,
        proof_image: proofImage || null,
        status: status || 'pending',
        created_at: createdAt || Date.now(),
      })
      .select();

    if (error) throw error;
    return NextResponse.json(data[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE confirmation
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing ID parameter' }, { status: 400 });
    }

    const { error } = await supabase
      .from('confirmations')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
