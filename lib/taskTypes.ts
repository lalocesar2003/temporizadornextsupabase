export type Task = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

export type Subtask = {
  id: string;
  task_id: string;
  title: string;
  weight: number;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export function calculateTaskProgress(subtasks: Subtask[]) {
  if (subtasks.length === 0) return 0;

  const totalWeight = subtasks.reduce((sum, subtask) => sum + subtask.weight, 0);
  if (totalWeight <= 0) return 0;

  const completedWeight = subtasks.reduce(
    (sum, subtask) => sum + (subtask.completed ? subtask.weight : 0),
    0
  );

  return (completedWeight / totalWeight) * 100;
}

function getDueDateValue(dueDate: string | null) {
  return dueDate ? new Date(`${dueDate}T00:00:00`).getTime() : Number.POSITIVE_INFINITY;
}

export function sortTasksByDeadline(tasks: Task[]) {
  return [...tasks].sort((a, b) => {
    const dueDateDiff = getDueDateValue(a.due_date) - getDueDateValue(b.due_date);
    if (dueDateDiff !== 0) return dueDateDiff;
    return a.position - b.position;
  });
}
