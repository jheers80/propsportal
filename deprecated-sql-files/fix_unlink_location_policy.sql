-- Add DELETE policy for users to unlink their own locations
DROP POLICY IF EXISTS "Users can delete their own location assignments" ON public.user_locations;
CREATE POLICY "Users can delete their own location assignments" ON public.user_locations
  FOR DELETE USING (auth.uid() = user_id);