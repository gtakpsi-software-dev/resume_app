export default function Spinner({ className = "" }) {
  return (
    <div className={`flex justify-center py-16 ${className}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-ink" />
    </div>
  );
}
