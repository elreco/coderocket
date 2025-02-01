import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const formData = await req.json();

    // Add submission date and ensure email is included
    const submissionData = {
      ...formData,
      submission_date: new Date().toISOString(), // Add current date
      email: formData.email, // Ensure email is included
    };

    // Save form data to the database
    const { error: insertError } = await supabase
      .from('unsubscribe_surveys')
      .insert([submissionData]);

    if (insertError) {
      console.error('Insert Error:', insertError);
      return NextResponse.json(
        { error: 'Failed to save survey data' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Unsubscribe reason logged successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to log unsubscribe reason' },
      { status: 500 }
    );
  }
}