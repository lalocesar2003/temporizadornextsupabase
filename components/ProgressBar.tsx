interface ProgressBarProps {
  percentage: number;
}

export function ProgressBar({ percentage }: ProgressBarProps) {
  const safePercentage = Math.min(100, Math.max(0, percentage));

  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-700">
      <div
        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 ease-out"
        style={{ width: `${safePercentage}%` }}
      />
    </div>
  );
}
