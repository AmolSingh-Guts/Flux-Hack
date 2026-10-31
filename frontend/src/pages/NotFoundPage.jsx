import { Link } from 'react-router-dom';
import PageContainer from '../components/common/PageContainer.jsx';

export default function NotFoundPage() {
  return (
    <PageContainer className="flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
        404
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
        Page not found
      </h1>
      <p className="mt-4 max-w-md text-sm leading-6 text-slate-600">
        The page you requested does not exist in the Brightloop foundation.
      </p>
      <Link
        to="/"
        className="mt-7 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
      >
        Return to overview
      </Link>
    </PageContainer>
  );
}
