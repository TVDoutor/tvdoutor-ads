import { supabase } from '@/integrations/supabase/client';

// Function to add a screen with admin privileges
export const addScreenAsAdmin = async (screenData: any) => {
  try {
    // First, verify the user has admin privileges
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check if user has admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('super_admin, role')
      .eq('id', user.id)
      .single();

    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'super_admin']);

    const isAdmin = profile?.super_admin || 
                   profile?.role === 'admin' || 
                   profile?.role === 'super_admin' ||
                   userRoles?.length > 0;

    if (!isAdmin) {
      throw new Error('Insufficient privileges');
    }

    // Use RPC function to bypass RLS
    const { data, error } = await supabase.rpc('add_screen_as_admin', {
      screen_data: screenData
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding screen as admin:', error);
    throw error;
  }
};

// Function to delete a screen with admin privileges
export const deleteScreenAsAdmin = async (screenId: number) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check admin privileges
    const { data: profile } = await supabase
      .from('profiles')
      .select('super_admin, role')
      .eq('id', user.id)
      .single();

    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'super_admin']);

    const isAdmin = profile?.super_admin || 
                   profile?.role === 'admin' || 
                   profile?.role === 'super_admin' ||
                   userRoles?.length > 0;

    if (!isAdmin) {
      throw new Error('Insufficient privileges');
    }

    // Use RPC function to bypass RLS
    const { data, error } = await supabase.rpc('delete_screen_as_admin', {
      screen_id: screenId
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error deleting screen as admin:', error);
    throw error;
  }
};
