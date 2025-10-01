/**
 * Scheduled Instance Generator
 * Runs daily to generate new instances for schedule-based recurring tasks
 * This would typically be deployed as a Supabase Edge Function or run via external cron job
 */

import { supabase } from '../lib/supabaseClient';
import { generateNextInstance } from './recurrenceEngine';

/**
 * Main function to generate scheduled instances
 * Should run daily (e.g., at midnight)
 */
export async function generateScheduledInstances() {
  try {
  // Starting scheduled instance generation

    // Step 1: Find all recurring tasks with repeat_from_completion = false
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('is_recurring', true)
      .eq('repeat_from_completion', false);

    if (tasksError) throw tasksError;

    // Step 2: For each task, check if new instance should be created
    for (const task of tasks) {
      // Get current pending instance
      const { data: currentInstance, error: instanceError } = await supabase
        .from('task_instances')
        .select('*')
        .eq('task_id', task.id)
        .eq('status', 'pending')
        .single();

      if (instanceError && instanceError.code !== 'PGRST116') {
        logger.error(`Error fetching instance for task ${task.id}:`, instanceError);
        continue;
      }

      // Determine if we need to generate next instance
      const shouldGenerate = shouldGenerateNextInstance(task, currentInstance);

      if (shouldGenerate) {
        const baseDate = currentInstance ?
          new Date(currentInstance.due_date) :
          new Date();

        const nextInstanceData = generateNextInstance(task, baseDate);

        // Replace old instance
        if (currentInstance) {
          await supabase
            .from('task_instances')
            .update({ status: 'replaced' })
            .eq('id', currentInstance.id);
        }

        // Create new instance
        const { error: createError } = await supabase
          .from('task_instances')
          .insert(nextInstanceData);

        if (createError) {
          logger.error(`Error creating instance for task ${task.id}:`, createError);
        } else {
          // created new instance for task
        }
      }
    }

  // scheduled instance generation completed
    return { success: true };
  } catch (error) {
    logger.error('Error in scheduled instance generation:', error);
    return { success: false, error };
  }
}

/**
 * Determines if a new instance should be generated
 * @param {Object} task - Task configuration
 * @param {Object} currentInstance - Current pending instance (or null)
 * @returns {boolean} Whether to generate new instance
 */
function shouldGenerateNextInstance(task, currentInstance) {
  if (!currentInstance) return true;

  const now = new Date();
  const dueDate = new Date(currentInstance.due_date);

  // Generate if current instance is past due
  return dueDate < now;
}