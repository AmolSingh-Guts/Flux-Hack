export default function ErrorMessage({
  title = 'Something went wrong',
  message,
  onRetry,
}) {
  return (
    <div
      className="rounded-2xl border border-rose-200 bg-rose-50 p-4"
      role="alert"
    >
      <p className="text-sm font-semibold text-rose-900">{title}</p>
      {message ? (
        <p className="mt-1 text-sm leading-6 text-rose-700">{message}</p>
      ) : null}
      {onRetry ? (
        <button
          type="button"
          onClick={() => void onRetry()}
          className="mt-3 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
