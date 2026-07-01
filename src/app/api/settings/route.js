import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { DEFAULT_SETTINGS } from '../../../utils';

// GET settings
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'config')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const settingsObj = data ? data.value : DEFAULT_SETTINGS;
    return NextResponse.json(settingsObj);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST update settings
export async function POST(request) {
  try {
    const body = await request.json();
    const { data, error } = await supabase
      .from('settings')
      .upsert({
        key: 'config',
        value: body,
      })
      .select();

    if (error) throw error;
    return NextResponse.json(data[0].value);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
