import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// GET all members
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('*');

    if (error) throw error;

    // Convert array to dictionary structure as expected by front-end
    const membersDict = {};
    data.forEach((m) => {
      membersDict[m.id] = {
        name: m.name,
        phone: m.phone,
        pin: m.pin,
        animalId: m.animal_id,
        target: m.target,
        joinDate: m.join_date,
      };
    });

    return NextResponse.json(membersDict);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST (Upsert member)
export async function POST(request) {
  try {
    const body = await request.json();
    const { id, name, phone, pin, animalId, target, joinDate } = body;

    if (!id || !name || !phone || !pin) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('members')
      .upsert({
        id,
        name,
        phone,
        pin,
        animal_id: animalId || null,
        target: target || null,
        join_date: joinDate,
      })
      .select();

    if (error) throw error;
    return NextResponse.json(data[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE member
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing ID parameter' }, { status: 400 });
    }

    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
