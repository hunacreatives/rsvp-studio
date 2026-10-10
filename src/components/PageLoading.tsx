/** Shown in a layout's content area while a page's code downloads (the first time only). */
export default function PageLoading() {
  return <div className="min-h-[40vh]" aria-busy="true" />;
}
