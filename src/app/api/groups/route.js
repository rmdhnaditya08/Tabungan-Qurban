import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// GET group overrides
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('group_overrides')
      .select('*');

    if (error) throw error;

    const groupOverridesDict = {};
    data.forEach((row) => {
      groupOverridesDict[row.animal_id] = {
        groups: row.groups,
        names: row.names,
      };
    });

    return NextResponse.json(groupOverridesDict);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST update/upsert group override
export async function POST(request) {
  try {
    const body = await request.json();
    const { animalId, groups, names } = body;

    if (!animalId) {
      return NextResponse.json({ error: 'Missing animalId parameter' }, { status: 400 });
    }

    if (groups === null) {
      // delete override (reset to auto)
      const { error } = await supabase
        .from('group_overrides')
        .delete()
        .eq('animal_id', animalId);

      if (error) throw error;
      return NextResponse.json({ deleted: true });
    }

    const { data, error } = await supabase
      .from('group_overrides')
      .upsert({
        animal_id: animalId,
        groups,
        names,
      })
      .select();

    if (error) throw error;
    return NextResponse.json(data[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
